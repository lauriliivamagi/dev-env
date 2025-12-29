import { type TaskContext, verify as v } from "../../../src/lib/mod.ts";
import { apt, pnpm } from "../../../src/lib/shell.ts";

export const dependsOn = ["node"];

export async function run(ctx: TaskContext): Promise<void> {
  await apt(ctx, [
    "build-essential", // C compiler, linker, make (needed for cargo install, etc.)
    "git",
    "ripgrep",
    "pavucontrol",
    "xclip",
    "jq",
    "shutter",
  ]);

  await pnpm(ctx, ["add", "-g", "tldr"]);
}

export async function verify(_ctx: TaskContext): Promise<void> {
  await v.assertCommand("git", "--version");
  await v.assertCommand("rg", "--version");
  await v.assertCommand("xclip", "-version");
  await v.assertCommand("jq", "--version");
}
