import { type TaskContext, log, verify as v } from "../../../src/lib/mod.ts";
import { curlPipe } from "../../../src/lib/shell.ts";

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
