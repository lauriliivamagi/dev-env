import { type TaskContext, log, verify as v } from "../lib/mod.ts";
import { apt } from "../lib/shell.ts";

export async function run(ctx: TaskContext): Promise<void> {
  log.info("Installing zoxide (smarter cd)");
  await apt(ctx, ["zoxide"]);
}

export async function verify(_ctx: TaskContext): Promise<void> {
  await v.assertCommand("zoxide", "--version");
}
