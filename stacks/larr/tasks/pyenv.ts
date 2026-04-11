import { type TaskContext, log, verify as v } from "../../../src/lib/mod.ts";
import { apt, runOrFail } from "../../../src/lib/shell.ts";

export const dependsOn = ["build-deps"]; // needs build-essential

export async function run(ctx: TaskContext): Promise<void> {
  // 1. Install build dependencies for compiling Python
  log.info("Installing Python build dependencies");
  await apt(ctx, [
    "libssl-dev",
    "zlib1g-dev",
    "libbz2-dev",
    "libreadline-dev",
    "libsqlite3-dev",
    "libncursesw5-dev",
    "xz-utils",
    "tk-dev",
    "libxml2-dev",
    "libxmlsec1-dev",
    "libffi-dev",
    "liblzma-dev",
  ]);

  // 2. Install pyenv via apt
  log.info("Installing pyenv");
  await apt(ctx, ["pyenv"]);

  // 3. Install Python 3.13.2
  log.info("Installing Python 3.13.2 via pyenv");
  // apt installs pyenv to /usr/bin/pyenv, versions go to ~/.pyenv/versions/
  await runOrFail(ctx, ["pyenv", "install", "-s", "3.13.2"]); // -s skips if exists

  // 4. Set as global default
  log.info("Setting Python 3.13.2 as global default");
  await runOrFail(ctx, ["pyenv", "global", "3.13.2"]);

  // 5. Rehash to create/update shims (needed for python command to work)
  await runOrFail(ctx, ["pyenv", "rehash"]);

  log.success("pyenv with Python 3.13.2 installed");
}

export async function verify(ctx: TaskContext): Promise<void> {
  await v.assertCommand("pyenv", "--version");
  await v.assertDir(`${ctx.home}/.pyenv/versions/3.13.2`);
  // Verify python works via pyenv exec (doesn't require shims in PATH)
  await v.assertCommand("pyenv", "exec", "python", "--version");
}
