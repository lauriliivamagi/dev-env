import { copy, ensureDir, exists } from "@std/fs";
import { dirname, join } from "@std/path";
import { type TaskContext } from "./config.ts";
import { assert } from "./assert.ts";
import * as log from "./log.ts";

const DANGEROUS_PATHS = [
  "/",
  "/bin",
  "/boot",
  "/etc",
  "/home",
  "/lib",
  "/lib64",
  "/opt",
  "/proc",
  "/root",
  "/sbin",
  "/sys",
  "/tmp",
  "/usr",
  "/var",
];

function assertSafePath(path: string, operation: string): void {
  assert(path.length > 0, `${operation} path cannot be empty`);
  assert(
    !DANGEROUS_PATHS.includes(path),
    `${operation} on dangerous path "${path}" is not allowed`,
  );
}

export async function copyFile(
  ctx: TaskContext,
  src: string,
  dest: string,
): Promise<void> {
  assertSafePath(src, "copyFile source");
  assertSafePath(dest, "copyFile destination");

  log.info(`Copy ${src} -> ${dest}`);

  if (ctx.dryRun) {
    log.dryRun(`cp ${src} -> ${dest}`);
    return;
  }

  await ensureDir(dirname(dest));
  await Deno.copyFile(src, dest);
}

export async function copyDir(
  ctx: TaskContext,
  src: string,
  dest: string,
): Promise<void> {
  assertSafePath(src, "copyDir source");
  assertSafePath(dest, "copyDir destination");

  log.info(`Copy directory ${src} -> ${dest}`);

  if (ctx.dryRun) {
    log.dryRun(`cp -r ${src} -> ${dest}`);
    return;
  }

  // Remove destination first to ensure clean copy (dest = exact mirror of src)
  // Skip exists() check - just try to remove and handle NotFound
  try {
    await Deno.remove(dest, { recursive: true });
  } catch (err) {
    if (!(err instanceof Deno.errors.NotFound)) {
      throw err;
    }
  }

  await copy(src, dest, { overwrite: true });
}

export async function remove(
  ctx: TaskContext,
  path: string,
): Promise<void> {
  assertSafePath(path, "remove");

  log.info(`Remove ${path}`);

  if (ctx.dryRun) {
    log.dryRun(`rm -rf ${path}`);
    return;
  }

  if (await exists(path)) {
    await Deno.remove(path, { recursive: true });
  }
}

export async function mkdir(ctx: TaskContext, path: string): Promise<void> {
  assertSafePath(path, "mkdir");

  log.info(`Create directory ${path}`);

  if (ctx.dryRun) {
    log.dryRun(`mkdir -p ${path}`);
    return;
  }

  await ensureDir(path);
}

export async function writeFile(
  ctx: TaskContext,
  path: string,
  content: string,
  mode?: number,
): Promise<void> {
  assertSafePath(path, "writeFile");

  log.info(`Write ${path}`);

  if (ctx.dryRun) {
    log.dryRun(`write ${path}`);
    return;
  }

  await ensureDir(dirname(path));
  await Deno.writeTextFile(path, content, { mode });
}

export async function syncConfigDir(
  ctx: TaskContext,
  srcBase: string,
  destBase: string,
): Promise<void> {
  assertSafePath(srcBase, "syncConfigDir source");
  assertSafePath(destBase, "syncConfigDir destination");

  log.info(`Syncing config from ${srcBase} to ${destBase}`);

  if (ctx.dryRun) {
    log.dryRun(`sync ${srcBase} -> ${destBase}`);
    return;
  }

  for await (const entry of Deno.readDir(srcBase)) {
    if (entry.isDirectory) {
      const src = join(srcBase, entry.name);
      const dest = join(destBase, entry.name);

      if (await exists(dest)) {
        await Deno.remove(dest, { recursive: true });
      }

      await copy(src, dest, { overwrite: true });
      log.success(`Synced ${entry.name}`);
    }
  }
}
