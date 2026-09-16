import {
  type TaskContext,
  assert,
  compareVersions,
  log,
  verify as v,
} from "../../../src/lib/mod.ts";
import { cargoInstall, checkCommandOutput } from "../../../src/lib/shell.ts";
import { join } from "@std/path";

// kdotool: xdotool-like window manipulation for KDE Plasma (search, focus,
// move, resize windows) over KWin's scripting D-Bus interface. Pure-Rust
// crate, so `cargo install` needs nothing beyond the rust task.
//
// The desktop shortcut that invokes it (Ctrl+PrtSc) is user-private desktop
// configuration and is deliberately not managed by this repo; this task only
// provides the binary.
//
// Since 0.3.0 kdotool checks for a Plasma 6 session before doing anything,
// `--version` included, and exits 1 otherwise. The version check and verify
// below fake that via KDE_SESSION_VERSION so the task works from any desktop
// (and from the Docker test); it only affects the version probe, not use.
export const dependsOn = ["rust"];

const KDOTOOL_VERSION = "0.3.0";
const PROBE_ENV = { KDE_SESSION_VERSION: "6" };

export async function shouldRun(ctx: TaskContext): Promise<boolean> {
  const kdotoolBin = join(ctx.home, ".cargo", "bin", "kdotool");
  try {
    await Deno.stat(kdotoolBin);
  } catch {
    return true; // not installed
  }

  // Parse version: "kdotool v0.3.0"
  const result = await checkCommandOutput([kdotoolBin, "--version"], { env: PROBE_ENV });
  const installedVersion = result.stdout?.match(/kdotool v?(\d+\.\d+\.\d+)/)?.[1];
  if (result.code !== 0 || !installedVersion) {
    return true; // couldn't determine version, run to be safe
  }

  if (compareVersions(installedVersion, KDOTOOL_VERSION) >= 0) {
    return false; // installed version is equal or newer
  }

  log.info(`kdotool ${installedVersion} installed, upgrading to ${KDOTOOL_VERSION}`);
  return true;
}

export async function run(ctx: TaskContext): Promise<void> {
  log.info(`Installing kdotool v${KDOTOOL_VERSION} via cargo`);
  await cargoInstall(ctx, "kdotool", { version: KDOTOOL_VERSION });
  log.success("kdotool installed");
}

export async function verify(ctx: TaskContext): Promise<void> {
  const kdotoolBin = join(ctx.home, ".cargo", "bin", "kdotool");
  await v.assertFile(kdotoolBin);
  const result = await checkCommandOutput([kdotoolBin, "--version"], { env: PROBE_ENV });
  assert(
    result.code === 0 && /kdotool v?\d+\.\d+\.\d+/.test(result.stdout ?? ""),
    `kdotool --version failed (exit ${result.code}): ${result.stderr ?? ""}`,
  );
}
