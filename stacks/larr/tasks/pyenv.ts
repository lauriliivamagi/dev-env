import { join } from "@std/path";
import { type TaskContext, log, verify as v } from "../../../src/lib/mod.ts";
import { apt, gitCloneOrPull, runOrFail } from "../../../src/lib/shell.ts";

export const dependsOn = ["build-deps"]; // needs build-essential

const PYTHON_VERSION = "3.14.5";
const PYENV_REPO = "https://github.com/pyenv/pyenv.git";

export async function run(ctx: TaskContext): Promise<void> {
  // 1. Install build dependencies for compiling Python
  log.info("Installing Python build dependencies");
  await apt(ctx, [
    "libssl-dev",
    "zlib1g-dev",
    "libbz2-dev",
    "libreadline-dev",
    "libsqlite3-dev",
    "libncurses-dev", // wide-char headers; libncursesw5-dev was removed on newer Ubuntu
    "xz-utils",
    "tk-dev",
    "libxml2-dev",
    "libxmlsec1-dev",
    "libffi-dev",
    "liblzma-dev",
  ]);

  // 2. Install pyenv from git into ~/.pyenv.
  //    The apt-packaged pyenv bundles a frozen python-build whose build
  //    definitions lag months behind upstream, so it can't compile recent
  //    CPython releases. The git checkout ships a current python-build and
  //    self-updates on re-runs; the shell config already prefers this
  //    user-level pyenv ($PYENV_ROOT/bin) over any system one.
  const pyenvRoot = join(ctx.home, ".pyenv");
  log.info("Installing pyenv from git");
  await gitCloneOrPull(ctx, PYENV_REPO, pyenvRoot, { branch: "master" });

  // Run pyenv via its absolute path with PYENV_ROOT set, so the compile works
  // regardless of the caller's shell. In realistic test mode the shell config
  // already puts $PYENV_ROOT/bin on PATH (mirrors the volta task).
  const pyenvBin = join(pyenvRoot, "bin", "pyenv");
  const currentPath = Deno.env.get("PATH") ?? "";
  const env: Record<string, string> = {
    PYENV_ROOT: pyenvRoot,
    PATH: Deno.env.get("REALISTIC_TEST")
      ? currentPath
      : `${join(pyenvRoot, "bin")}:${currentPath}`,
  };

  // 3. Install pinned Python (-s skips if already built)
  log.info(`Installing Python ${PYTHON_VERSION} via pyenv`);
  await runOrFail(ctx, [pyenvBin, "install", "-s", PYTHON_VERSION], { env });

  // 4. Set as global default
  log.info(`Setting Python ${PYTHON_VERSION} as global default`);
  await runOrFail(ctx, [pyenvBin, "global", PYTHON_VERSION], { env });

  // 5. Rehash to create/update shims (needed for python command to work)
  await runOrFail(ctx, [pyenvBin, "rehash"], { env });

  log.success(`pyenv with Python ${PYTHON_VERSION} installed`);
}

export async function verify(ctx: TaskContext): Promise<void> {
  // Invoke pyenv by absolute path: the git checkout's bin/ isn't among the
  // standard bin dirs assertCommandWithPath puts on PATH, and an absolute
  // executable bypasses PATH resolution entirely.
  const pyenvBin = join(ctx.home, ".pyenv", "bin", "pyenv");
  await v.assertCommandWithPath(ctx.home, pyenvBin, pyenvBin, "--version");
  await v.assertDir(join(ctx.home, ".pyenv", "versions", PYTHON_VERSION));
  // Verify python works via pyenv exec (resolves the global version + shims)
  await v.assertCommandWithPath(
    ctx.home,
    pyenvBin,
    pyenvBin,
    "exec",
    "python",
    "--version",
  );
}
