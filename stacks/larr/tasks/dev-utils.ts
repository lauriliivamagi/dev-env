import { type TaskContext, verify as v } from "../../../src/lib/mod.ts";
import { apt } from "../../../src/lib/shell.ts";

export async function run(ctx: TaskContext): Promise<void> {
  await apt(ctx, [
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
    "yq",
    "fonts-font-awesome",
    "entr",
    "tree",
    "ncdu",
    "duf",
    "sqlite3",
    "pandoc",
    "graphviz",
    "git-lfs",
    "parallel",
  ]);
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
  // entr returns exit code 1 when showing usage
  await v.assertFile("/usr/bin/entr");
  await v.assertCommand("tree", "--version");
  await v.assertCommand("ncdu", "-v");
  await v.assertCommand("duf", "--version");
  await v.assertCommand("sqlite3", "--version");
  await v.assertCommand("pandoc", "--version");
  await v.assertCommand("dot", "-V"); // graphviz
  await v.assertCommand("git-lfs", "--version");
  await v.assertCommand("parallel", "--version");
}
