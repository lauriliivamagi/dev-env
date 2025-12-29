import { type TaskContext, log, verify as v } from "../../../src/lib/mod.ts";
import { apt, runOrFail } from "../../../src/lib/shell.ts";

export async function run(ctx: TaskContext): Promise<void> {
  log.info("Installing Ruby for tmuxinator");
  await apt(ctx, ["ruby", "ruby-dev"]);

  log.info("Installing tmuxinator");
  await runOrFail(ctx, ["sudo", "gem", "install", "tmuxinator"]);
}

export async function verify(_ctx: TaskContext): Promise<void> {
  await v.assertCommand("tmuxinator", "version");
}
