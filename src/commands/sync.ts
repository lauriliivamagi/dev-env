import { join } from "@std/path";
import { exists } from "@std/fs";
import { type TaskContext, assert, fs, log } from "../lib/mod.ts";
import { runOrFail } from "../lib/shell.ts";

/**
 * Create a backup of a file before overwriting.
 * Only creates backup if SYNC_BACKUP=1 is set.
 */
async function maybeBackup(ctx: TaskContext, path: string): Promise<void> {
  if (Deno.env.get("SYNC_BACKUP") !== "1") return;
  if (ctx.dryRun) return;

  try {
    await Deno.stat(path);
    const backupPath = `${path}.bak`;
    await Deno.copyFile(path, backupPath);
    log.debug(`Backed up ${path} -> ${backupPath}`);
  } catch (err) {
    if (!(err instanceof Deno.errors.NotFound)) {
      throw err;
    }
  }
}

interface DotEntry {
  name: string;
  isDirectory: boolean;
}

/**
 * Discover dotfiles and dot-directories in the env directory.
 * A dotfile/dotdir is any entry starting with . that is not .config or .local.
 */
async function discoverDotEntries(envDir: string): Promise<DotEntry[]> {
  const entries: DotEntry[] = [];

  try {
    for await (const entry of Deno.readDir(envDir)) {
      if (
        entry.name.startsWith(".") &&
        entry.name !== ".config" &&
        entry.name !== ".local"
      ) {
        entries.push({ name: entry.name, isDirectory: entry.isDirectory });
      }
    }
  } catch (err) {
    if (!(err instanceof Deno.errors.NotFound)) {
      throw err;
    }
  }

  return entries.sort((a, b) => a.name.localeCompare(b.name));
}

export async function syncConfigs(ctx: TaskContext): Promise<void> {
  assert(ctx.stackRoot.length > 0, "ctx.stackRoot cannot be empty");
  assert(ctx.home.length > 0, "ctx.home cannot be empty");
  assert(ctx.configHome.length > 0, "ctx.configHome cannot be empty");

  const envDir = join(ctx.stackRoot, "env");

  log.task("Syncing .config");
  await fs.syncConfigDir(
    ctx,
    join(envDir, ".config"),
    ctx.configHome,
  );

  log.task("Syncing .local");
  await fs.syncConfigDir(
    ctx,
    join(envDir, ".local"),
    join(ctx.home, ".local"),
  );

  log.task("Syncing dotfiles");
  // Dynamically discover dotfiles and dot-directories
  const dotEntries = await discoverDotEntries(envDir);
  const names = dotEntries.map((e) => e.name);
  log.info(`Found ${dotEntries.length} dotfile(s): ${names.join(", ")}`);

  for (const entry of dotEntries) {
    const src = join(envDir, entry.name);
    const dest = join(ctx.home, entry.name);
    try {
      if (entry.isDirectory) {
        await fs.copyDir(ctx, src, dest);
      } else {
        await maybeBackup(ctx, dest);
        await fs.copyFile(ctx, src, dest);
      }
    } catch (err) {
      if (err instanceof Deno.errors.NotFound) {
        log.warn(`Dotfile not found: ${entry.name}`);
      } else {
        throw err;
      }
    }
  }

  // Build daydream if it exists (shared tool at repo root)
  const daydreamDir = join(ctx.devEnv, "daydream");
  if (await exists(daydreamDir)) {
    log.task("Building daydream");
    await runOrFail(ctx, ["./build"], { cwd: daydreamDir });

    await fs.mkdir(ctx, join(ctx.home, ".local", "bin"));
    await fs.copyFile(
      ctx,
      join(daydreamDir, "opencode-client"),
      join(ctx.home, ".local", "bin", "opencode-client"),
    );
    await fs.copyFile(
      ctx,
      join(daydreamDir, "opencode-server"),
      join(ctx.home, ".local", "bin", "opencode-server"),
    );
  }

  // Reload Hyprland if available
  log.task("Reloading window manager");
  try {
    await runOrFail(ctx, ["hyprctl", "reload"]);
  } catch {
    log.warn("hyprctl not available (not running Hyprland?)");
  }

  log.success("Config sync complete");
}
