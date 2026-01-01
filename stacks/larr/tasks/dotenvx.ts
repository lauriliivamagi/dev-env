import { type TaskContext, log, verify as v } from "../../../src/lib/mod.ts";
import { checkCommandOutput, curlPipe } from "../../../src/lib/shell.ts";

export async function shouldRun(_ctx: TaskContext): Promise<boolean> {
  try {
    const result = await checkCommandOutput(["dotenvx", "--version"]);
    return result.code !== 0;
  } catch {
    return true; // Command not found
  }
}

export async function run(ctx: TaskContext): Promise<void> {
  log.info("Installing dotenvx");
  await curlPipe(ctx, "https://dotenvx.sh", ["sudo", "sh"]);
}

export async function verify(_ctx: TaskContext): Promise<void> {
  await v.assertCommand("dotenvx", "--version");
}
