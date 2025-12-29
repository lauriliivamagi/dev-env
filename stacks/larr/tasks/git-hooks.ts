import { type TaskContext, fs, log, verify as v } from "../../../src/lib/mod.ts";
import { join } from "@std/path";
import { exists } from "@std/fs";

export async function run(ctx: TaskContext): Promise<void> {
  const hooksSource = join(ctx.stackRoot, "env", ".git_template", "hooks");
  const hooksDest = `${ctx.home}/.git_template/hooks`;

  // Check if source hooks exist
  if (!await exists(hooksSource)) {
    log.info("No hooks found in env/.git_template/hooks/, skipping");
    return;
  }

  // Create git template hooks directory
  await fs.mkdir(ctx, hooksDest);

  log.info("Installing git template hooks");

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

  log.success("Git template hooks installed to ~/.git_template/hooks/");
  log.info("Note: Set init.templateDir in .gitconfig to use these hooks for new repos");
}

export async function verify(ctx: TaskContext): Promise<void> {
  const hooksSource = join(ctx.stackRoot, "env", ".git_template", "hooks");
  if (await exists(hooksSource)) {
    await v.assertDir(`${ctx.home}/.git_template/hooks`);
  }
}
