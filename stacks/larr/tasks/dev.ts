import { type TaskContext, verify as v } from "../../../src/lib/mod.ts";
import { apt, aptUpdate, goInstall, pnpm } from "../../../src/lib/shell.ts";

export const dependsOn = ["volta", "go"];

export async function run(ctx: TaskContext): Promise<void> {
  await aptUpdate(ctx);

  await apt(ctx, [
    "build-essential",
    "libasound2-dev",
    "git",
    "fzf",
    "curl",
    "wget",
    "gnupg",
    "unzip",
    "htop",
    "mc",
    "atop",
    "dc",
    "xclip",
    "jq",
    "fonts-font-awesome",
  ]);

  await pnpm(ctx, ["add", "-g", "tldr"]);
  await goInstall(ctx, "github.com/air-verse/air@latest");
}

export async function verify(_ctx: TaskContext): Promise<void> {
  await v.assertCommand("git", "--version");
  await v.assertCommand("curl", "--version");
  await v.assertCommand("wget", "--version");
  await v.assertCommand("gpg", "--version");
  await v.assertCommand("unzip", "-v");
  await v.assertCommand("htop", "--version");
  // mc --version returns exit code 1 in non-interactive environments
  await v.assertFile("/usr/bin/mc");
  await v.assertCommand("xclip", "-version");
  await v.assertCommand("jq", "--version");
}
