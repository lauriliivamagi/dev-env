import { type TaskContext, verify as v } from "../lib/mod.ts";
import { apt } from "../lib/shell.ts";

export async function run(ctx: TaskContext): Promise<void> {
  await apt(ctx, ["i3", "i3status", "i3lock"]);
}

export async function verify(_ctx: TaskContext): Promise<void> {
  await v.assertCommand("i3", "--version");
  await v.assertCommand("i3status", "--version");
  await v.assertCommand("i3lock", "--version");
}
