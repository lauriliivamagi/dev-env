import {
  type TaskContext,
  compareVersions,
  log,
  verify as v,
} from "../../../src/lib/mod.ts";
import { checkCommandOutput, curlPipe } from "../../../src/lib/shell.ts";
import { join } from "@std/path";

// uv: Python package/project manager and, via `uv tool`, the replacement for
// pipx (see uv-tools.ts). Installs a standalone binary into ~/.local/bin.
const UV_VERSION = "0.12.15";

export async function shouldRun(ctx: TaskContext): Promise<boolean> {
  const uvBin = join(ctx.home, ".local", "bin", "uv");
  try {
    await Deno.stat(uvBin);
  } catch {
    return true; // not installed
  }

  // Parse version: "uv 0.12.15" (older builds append a build hash/date)
  const result = await checkCommandOutput([uvBin, "--version"]);
  const installedVersion = result.stdout?.match(/^uv (\d+\.\d+\.\d+)/)?.[1];
  if (result.code !== 0 || !installedVersion) {
    return true; // couldn't determine version, run to be safe
  }

  if (compareVersions(installedVersion, UV_VERSION) >= 0) {
    return false; // installed version is equal or newer
  }

  log.info(`uv ${installedVersion} installed, upgrading to ${UV_VERSION}`);
  return true;
}

export async function run(ctx: TaskContext): Promise<void> {
  log.info(`Installing uv v${UV_VERSION}`);
  // Versioned installer URL pins the release; it overwrites ~/.local/bin/uv
  // in place, so the same call serves fresh installs and upgrades.
  // --no-modify-path: ~/.local/bin is already on PATH via env/.zshrc, and
  // sync owns that file anyway.
  await curlPipe(ctx, `https://astral.sh/uv/${UV_VERSION}/install.sh`, [
    "sh",
    "-s",
    "--",
    "--no-modify-path",
  ]);
  log.success("uv installed");
}

export async function verify(ctx: TaskContext): Promise<void> {
  await v.assertCommandWithPath(
    ctx.home,
    "uv",
    join(ctx.home, ".local", "bin", "uv"),
    "--version",
  );
}
