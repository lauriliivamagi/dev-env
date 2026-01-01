import { type TaskContext, fs, log, verify as v } from "../../../src/lib/mod.ts";
import { apt, curl, runOrFail } from "../../../src/lib/shell.ts";
import { join } from "@std/path";

const ZIG_VERSION = "0.13.0";

/**
 * Check if Zig needs to be installed.
 */
export async function shouldRun(ctx: TaskContext): Promise<boolean> {
  const zigBin = join(ctx.home, ".local", "bin", "zig");
  try {
    await Deno.stat(zigBin);
    return false;
  } catch {
    return true;
  }
}

export async function run(ctx: TaskContext): Promise<void> {
  const binDir = join(ctx.home, ".local", "bin");
  const zigInstallDir = join(ctx.home, ".local", "zig");
  await fs.mkdir(ctx, binDir);

  // xz-utils needed to extract .tar.xz
  await apt(ctx, ["xz-utils"]);

  log.info(`Installing Zig v${ZIG_VERSION}`);
  const zigUrl =
    `https://ziglang.org/download/${ZIG_VERSION}/zig-linux-x86_64-${ZIG_VERSION}.tar.xz`;
  const zigTar = "/tmp/zig.tar.xz";
  const zigExtractDir = `/tmp/zig-linux-x86_64-${ZIG_VERSION}`;
  await curl(ctx, zigUrl, zigTar);
  await runOrFail(ctx, ["tar", "-xf", zigTar, "-C", "/tmp"]);

  // Install to ~/.local/zig (zig needs lib dir relative to binary)
  await fs.remove(ctx, zigInstallDir);
  await runOrFail(ctx, ["mv", zigExtractDir, zigInstallDir]);

  // Symlink binary to ~/.local/bin
  const zigBinLink = join(binDir, "zig");
  await fs.remove(ctx, zigBinLink);
  await runOrFail(ctx, ["ln", "-s", join(zigInstallDir, "zig"), zigBinLink]);

  // Cleanup
  await fs.remove(ctx, zigTar);
}

export async function verify(ctx: TaskContext): Promise<void> {
  const binDir = join(ctx.home, ".local", "bin");
  await v.assertCommandWithPath(
    ctx.home,
    "zig",
    join(binDir, "zig"),
    "version",
  );
}
