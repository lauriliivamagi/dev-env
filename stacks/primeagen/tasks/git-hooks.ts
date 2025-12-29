import { type TaskContext, fs, log, verify as v } from "../../../src/lib/mod.ts";
import { join } from "@std/path";
import { exists } from "@std/fs";

export async function run(ctx: TaskContext): Promise<void> {
  const hooksSource = join(ctx.devEnv, "env", ".git-hooks");
  const hooksDest = join(ctx.devEnv, ".git", "hooks");

  // Check if source hooks exist
  if (!await exists(hooksSource)) {
    log.info("No hooks found in env/.git-hooks/, skipping");
    return;
  }

  log.info("Installing git hooks");

  // Copy each hook from source to destination
  for await (const entry of Deno.readDir(hooksSource)) {
    if (!entry.isFile) continue;

    const src = join(hooksSource, entry.name);
    const dest = join(hooksDest, entry.name);

    log.info(`Installing hook: ${entry.name}`);
    await fs.copyFile(ctx, src, dest);

    // Make executable
    if (!ctx.dryRun) {
      await Deno.chmod(dest, 0o755);
    }
  }

  log.success("Git hooks installed");
}

export async function verify(ctx: TaskContext): Promise<void> {
  const preCommitHook = join(ctx.devEnv, ".git", "hooks", "pre-commit");
  await v.assertFile(preCommitHook);
}
