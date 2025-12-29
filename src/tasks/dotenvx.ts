import { type TaskContext, log, verify as v } from "../lib/mod.ts";
import { curlPipe } from "../lib/shell.ts";

export async function run(ctx: TaskContext): Promise<void> {
  log.info("Installing dotenvx");
  await curlPipe(ctx, "https://dotenvx.sh", "sudo sh");
}

export async function verify(_ctx: TaskContext): Promise<void> {
  await v.assertCommand("dotenvx", "--version");
}
