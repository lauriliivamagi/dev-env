import { ensureDir, exists } from "@std/fs";
import { dirname, join, resolve } from "@std/path";
import { red, green, dim } from "@std/fmt/colors";
import { type TaskContext } from "./config.ts";
import { assert } from "./assert.ts";
import * as log from "./log.ts";

/** Result of a file system operation */
export interface FsResult {
  changed: boolean;
}

/**
 * Simple line-by-line diff for showing file changes.
 * Shows removed lines (in old but not new) and added lines (in new but not old).
 */
function showDiff(path: string, oldContent: string, newContent: string): void {
  const oldLines = oldContent.split("\n");
  const newLines = newContent.split("\n");

  // Build sets for quick lookup
  const oldSet = new Set(oldLines);
  const newSet = new Set(newLines);

  const removed = oldLines.filter((line) => !newSet.has(line));
  const added = newLines.filter((line) => !oldSet.has(line));

  if (removed.length === 0 && added.length === 0) return;

  console.log(dim(`--- ${path}`));
  console.log(dim(`+++ ${path}`));

  for (const line of removed) {
    if (line.trim().length > 0) {
      console.log(red(`- ${line}`));
    }
  }
  for (const line of added) {
    if (line.trim().length > 0) {
      console.log(green(`+ ${line}`));
    }
  }
}

/**
 * Paths that should be blocked completely (exact match and all subdirectories).
 * These are system directories where writing/deleting could damage the system.
 */
const PREFIX_DANGEROUS_PATHS = [
  "/",
  "/bin",
  "/boot",
  "/etc",
  "/lib",
  "/lib64",
  "/opt",
  "/proc",
  "/root",
  "/sbin",
  "/sys",
  "/usr",
  "/var",
];

/**
 * Paths that should only be blocked as exact match.
 * Writing to subdirectories is allowed (e.g., /home/user/.config is ok, /home is not).
 */
const EXACT_DANGEROUS_PATHS = [
  "/home",
  "/tmp",
];

function assertSafePath(path: string, operation: string): void {
  assert(path.length > 0, `${operation} path cannot be empty`);

  // Normalize the path to resolve .. and relative paths
  const normalized = resolve(path);

  // Check prefix-dangerous paths (blocks entire subtree)
  const isPrefixDangerous = PREFIX_DANGEROUS_PATHS.some((dangerous) =>
    normalized === dangerous || normalized.startsWith(dangerous + "/")
  );

  // Check exact-dangerous paths (blocks only exact match)
  const isExactDangerous = EXACT_DANGEROUS_PATHS.includes(normalized);

  assert(
    !isPrefixDangerous && !isExactDangerous,
    `${operation} on dangerous path "${path}" is not allowed`,
  );
}

/**
 * Validates that a filename doesn't contain path separators or traversal sequences.
 * Use this when reading filenames from external sources (e.g., YAML files).
 */
export function assertSafeFilename(filename: string): void {
  assert(
    !filename.includes("/") &&
      !filename.includes("\\") &&
      !filename.includes(".."),
    `Invalid filename: ${filename} - cannot contain path separators or traversal`,
  );
}

/**
 * Recursively merge source directory into destination.
 * Only overwrites files that exist in source, preserves other files in dest.
 */
async function mergeDir(src: string, dest: string): Promise<void> {
  await ensureDir(dest);

  for await (const entry of Deno.readDir(src)) {
    // Validate filename to prevent path traversal via malicious directory entries
    assertSafeFilename(entry.name);

    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);

    if (entry.isDirectory) {
      await mergeDir(srcPath, destPath);
    } else {
      await Deno.copyFile(srcPath, destPath);
    }
  }
}

export async function copyFile(
  ctx: TaskContext,
  src: string,
  dest: string,
): Promise<FsResult> {
  assertSafePath(src, "copyFile source");
  assertSafePath(dest, "copyFile destination");

  // Check if destination exists and has same content
  let srcContent: string | null = null;
  let destContent: string | null = null;

  try {
    srcContent = await Deno.readTextFile(src);
    destContent = await Deno.readTextFile(dest);
    if (srcContent === destContent) {
      log.skip(`${dest} (unchanged)`);
      return { changed: false };
    }
  } catch {
    // Source or dest doesn't exist or isn't text - proceed with copy
  }

  log.info(`Copy ${src} -> ${dest}`);

  // Show diff if enabled and both files are text
  if (ctx.diff && srcContent !== null && destContent !== null) {
    showDiff(dest, destContent, srcContent);
  }

  if (ctx.dryRun) {
    log.dryRun(`cp ${src} -> ${dest}`);
    return { changed: true };
  }

  await ensureDir(dirname(dest));
  await Deno.copyFile(src, dest);
  return { changed: true };
}

export async function copyDir(
  ctx: TaskContext,
  src: string,
  dest: string,
): Promise<FsResult> {
  assertSafePath(src, "copyDir source");
  assertSafePath(dest, "copyDir destination");

  log.info(`Copy directory ${src} -> ${dest}`);

  if (ctx.dryRun) {
    log.dryRun(`merge ${src} -> ${dest}`);
    return { changed: true };
  }

  // Merge instead of replace - preserves existing files in dest
  await mergeDir(src, dest);
  return { changed: true };
}

export async function remove(
  ctx: TaskContext,
  path: string,
): Promise<FsResult> {
  assertSafePath(path, "remove");

  const pathExists = await exists(path);
  if (!pathExists) {
    return { changed: false };
  }

  log.info(`Remove ${path}`);

  if (ctx.dryRun) {
    log.dryRun(`rm -rf ${path}`);
    return { changed: true };
  }

  await Deno.remove(path, { recursive: true });
  return { changed: true };
}

export async function mkdir(ctx: TaskContext, path: string): Promise<FsResult> {
  assertSafePath(path, "mkdir");

  const pathExists = await exists(path);
  if (pathExists) {
    return { changed: false };
  }

  log.info(`Create directory ${path}`);

  if (ctx.dryRun) {
    log.dryRun(`mkdir -p ${path}`);
    return { changed: true };
  }

  await ensureDir(path);
  return { changed: true };
}

export async function writeFile(
  ctx: TaskContext,
  path: string,
  content: string,
  mode?: number,
): Promise<FsResult> {
  assertSafePath(path, "writeFile");

  // Check if file exists and has same content
  let oldContent: string | null = null;
  try {
    oldContent = await Deno.readTextFile(path);
    if (oldContent === content) {
      log.skip(`${path} (unchanged)`);
      return { changed: false };
    }
  } catch {
    // File doesn't exist
  }

  log.info(`Write ${path}`);

  // Show diff if enabled and file existed
  if (ctx.diff && oldContent !== null) {
    showDiff(path, oldContent, content);
  }

  if (ctx.dryRun) {
    log.dryRun(`write ${path}`);
    return { changed: true };
  }

  await ensureDir(dirname(path));
  await Deno.writeTextFile(path, content, { mode });
  return { changed: true };
}

export async function syncConfigDir(
  ctx: TaskContext,
  srcBase: string,
  destBase: string,
): Promise<FsResult> {
  assertSafePath(srcBase, "syncConfigDir source");
  assertSafePath(destBase, "syncConfigDir destination");

  log.info(`Syncing config from ${srcBase} to ${destBase}`);

  if (ctx.dryRun) {
    log.dryRun(`sync ${srcBase} -> ${destBase}`);
    return { changed: true };
  }

  let changed = false;
  for await (const entry of Deno.readDir(srcBase)) {
    if (entry.isDirectory) {
      const src = join(srcBase, entry.name);
      const dest = join(destBase, entry.name);

      // Merge instead of replace - preserves existing files in dest
      await mergeDir(src, dest);
      log.success(`Synced ${entry.name}`);
      changed = true;
    }
  }

  return { changed };
}
