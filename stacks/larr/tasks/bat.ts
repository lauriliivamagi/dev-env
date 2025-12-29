import { type TaskContext, verify as v } from "../../../src/lib/mod.ts";
import { apt } from "../../../src/lib/shell.ts";

export async function run(ctx: TaskContext): Promise<void> {
  await apt(ctx, ["bat"]);
}

export async function verify(_ctx: TaskContext): Promise<void> {
  // The binary is named 'batcat' on Debian/Ubuntu to avoid conflict with another package
  await v.assertCommand("batcat", "--version");
}
