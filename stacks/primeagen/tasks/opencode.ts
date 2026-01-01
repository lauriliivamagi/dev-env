import { type TaskContext, log, verify as v } from "../../../src/lib/mod.ts";
import { curlPipe } from "../../../src/lib/shell.ts";

/**
 * Check if OpenCode needs to be installed.
 * Returns true if task should run, false if user-local opencode exists.
 */
export async function shouldRun(ctx: TaskContext): Promise<boolean> {
  const opencodeBin = `${ctx.home}/.opencode/bin/opencode`;
  try {
    await Deno.stat(opencodeBin);
    return false; // opencode already installed at user-local path
  } catch {
    return true; // opencode not installed
  }
}

export async function run(ctx: TaskContext): Promise<void> {
  log.info("Installing OpenCode");
  await curlPipe(ctx, "https://opencode.ai/install", ["bash"]);
}

export async function verify(ctx: TaskContext): Promise<void> {
  await v.assertCommandWithPath(
    ctx.home,
    "opencode",
    `${ctx.home}/.opencode/bin/opencode`,
    "--version",
  );
}
