import { type TaskContext, log, verify as v } from "../../../src/lib/mod.ts";
import { curlPipe } from "../../../src/lib/shell.ts";

export async function shouldRun(ctx: TaskContext): Promise<boolean> {
  const claudeBin = `${ctx.home}/.local/bin/claude`;
  try {
    await Deno.stat(claudeBin);
    return false; // Claude Code already installed
  } catch {
    return true; // Claude Code not installed
  }
}

export async function run(ctx: TaskContext): Promise<void> {
  log.info("Installing Claude Code CLI");
  await curlPipe(ctx, "https://claude.ai/install.sh", ["bash"]);
  log.success("Claude Code installed");
}

export async function verify(ctx: TaskContext): Promise<void> {
  await v.assertCommandWithPath(
    ctx.home,
    "claude",
    `${ctx.home}/.local/bin/claude`,
    "--version",
  );
}
