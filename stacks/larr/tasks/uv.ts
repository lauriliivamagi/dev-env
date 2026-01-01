import { type TaskContext, log, verify as v } from "../../../src/lib/mod.ts";
import { curlPipe } from "../../../src/lib/shell.ts";

export async function shouldRun(ctx: TaskContext): Promise<boolean> {
  const uvBin = `${ctx.home}/.local/bin/uv`;
  try {
    await Deno.stat(uvBin);
    return false;
  } catch {
    return true;
  }
}

export async function run(ctx: TaskContext): Promise<void> {
  log.info("Installing uv (Python package manager)");
  await curlPipe(ctx, "https://astral.sh/uv/install.sh", ["sh"]);
  log.success("uv installed");
}

export async function verify(ctx: TaskContext): Promise<void> {
  await v.assertCommandWithPath(
    ctx.home,
    "uv",
    `${ctx.home}/.local/bin/uv`,
    "--version",
  );
}
