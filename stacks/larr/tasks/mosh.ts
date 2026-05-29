import { join } from "@std/path";
import { type TaskContext, log, verify as v } from "../../../src/lib/mod.ts";
import {
  apt,
  commandExists,
  gitCloneOrPull,
  runOrFail,
} from "../../../src/lib/shell.ts";

const REPO = "https://github.com/mobile-shell/mosh";

// Build deps mirror debian/control's Build-Depends, plus the autotools
// toolchain (autogen.sh runs `autoreconf -fi`). libio-socket-ip-perl is a
// runtime dependency of the `mosh` Perl client wrapper.
const BUILD_DEPS = [
  "git",
  "build-essential",
  "autoconf",
  "automake",
  "libtool",
  "pkg-config",
  "protobuf-compiler",
  "libprotobuf-dev",
  "libutempter-dev",
  "zlib1g-dev",
  "libncurses-dev",
  "libssl-dev",
  "libio-socket-ip-perl",
];

export async function shouldRun(_ctx: TaskContext): Promise<boolean> {
  // Skip if mosh-server is already installed (from source or a package).
  return !(await commandExists("mosh-server"));
}

export async function run(ctx: TaskContext): Promise<void> {
  log.info("Installing mosh build dependencies");
  await apt(ctx, BUILD_DEPS);

  const buildDir = join(ctx.home, "git", "mosh");
  await gitCloneOrPull(ctx, REPO, buildDir, { branch: "master" });

  log.info("Building mosh from source");
  await runOrFail(ctx, ["./autogen.sh"], { cwd: buildDir });
  await runOrFail(ctx, ["./configure"], { cwd: buildDir });
  await runOrFail(ctx, ["make"], { cwd: buildDir });
  await runOrFail(ctx, ["sudo", "make", "install"], { cwd: buildDir });

  log.success("mosh installed from source to /usr/local/bin");
}

export async function verify(_ctx: TaskContext): Promise<void> {
  await v.assertCommand("mosh", "--version");
  await v.assertFile("/usr/local/bin/mosh-server");
}
