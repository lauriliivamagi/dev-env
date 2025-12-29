import { type TaskContext, verify as v } from "../../../src/lib/mod.ts";
import { apt } from "../../../src/lib/shell.ts";

export async function run(ctx: TaskContext): Promise<void> {
  // fd is packaged as fd-find on Debian/Ubuntu
  await apt(ctx, ["fd-find"]);
}

export async function verify(_ctx: TaskContext): Promise<void> {
  // The binary is named 'fdfind' on Debian/Ubuntu to avoid conflict with fdclone
  await v.assertCommand("fdfind", "--version");
}
