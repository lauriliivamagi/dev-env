import { join } from "@std/path";
import { exists } from "@std/fs";
import { type TaskContext, assert, fs, log } from "../lib/mod.ts";
import { runOrFail } from "../lib/shell.ts";

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
  const dotfiles = [
    ".zshrc",
    ".zsh_profile",
    ".xprofile",
    ".tmux-sessionizer",
    ".p10k.zsh",
  ];

  for (const dotfile of dotfiles) {
    const src = join(envDir, dotfile);
    const dest = join(ctx.home, dotfile);
    try {
      await fs.copyFile(ctx, src, dest);
    } catch (err) {
      if (err instanceof Deno.errors.NotFound) {
        log.warn(`Dotfile not found: ${dotfile}`);
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
