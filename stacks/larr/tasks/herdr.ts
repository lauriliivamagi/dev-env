import { type TaskContext, log, verify as v } from "../../../src/lib/mod.ts";
import { curlPipe } from "../../../src/lib/shell.ts";

export async function shouldRun(ctx: TaskContext): Promise<boolean> {
  const herdrBin = `${ctx.home}/.local/bin/herdr`;
  try {
    await Deno.stat(herdrBin);
    return false; // herdr already installed
  } catch {
    return true; // herdr not installed
  }
}

export async function run(ctx: TaskContext): Promise<void> {
  log.info("Installing herdr (terminal-native agent runtime)");
  await curlPipe(ctx, "https://herdr.dev/install.sh", ["sh"]);
  log.success("herdr installed");
}

export async function verify(ctx: TaskContext): Promise<void> {
  await v.assertCommandWithPath(
    ctx.home,
    "herdr",
    `${ctx.home}/.local/bin/herdr`,
    "--version",
  );
}
