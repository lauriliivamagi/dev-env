import { type TaskContext, log, verify as v } from "../../../src/lib/mod.ts";
import { curlPipe } from "../../../src/lib/shell.ts";

export async function shouldRun(ctx: TaskContext): Promise<boolean> {
  const opencodeBin = `${ctx.home}/.opencode/bin/opencode`;
  try {
    await Deno.stat(opencodeBin);
    return false;
  } catch {
    return true;
  }
}

export async function run(ctx: TaskContext): Promise<void> {
  log.info("Installing opencode.ai CLI");
  await curlPipe(ctx, "https://opencode.ai/install", ["bash"]);
  log.success("opencode installed");
}

export async function verify(ctx: TaskContext): Promise<void> {
  await v.assertCommandWithPath(
    ctx.home,
    "opencode",
    `${ctx.home}/.opencode/bin/opencode`,
    "--version",
  );
}
