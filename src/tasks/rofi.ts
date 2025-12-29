import { type TaskContext, verify as v } from "../lib/mod.ts";
import { apt } from "../lib/shell.ts";

export async function run(ctx: TaskContext): Promise<void> {
  await apt(ctx, ["rofi"]);
}

export async function verify(_ctx: TaskContext): Promise<void> {
  await v.assertCommand("rofi", "-version");
}
