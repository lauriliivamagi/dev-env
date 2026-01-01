import { type TaskContext, verify as v } from "../../../src/lib/mod.ts";
import { apt, commandExists } from "../../../src/lib/shell.ts";

export async function shouldRun(_ctx: TaskContext): Promise<boolean> {
  return !(await commandExists("fzf"));
}

export async function run(ctx: TaskContext): Promise<void> {
  await apt(ctx, ["fzf"]);
}

export async function verify(_ctx: TaskContext): Promise<void> {
  await v.assertCommand("fzf", "--version");
}
