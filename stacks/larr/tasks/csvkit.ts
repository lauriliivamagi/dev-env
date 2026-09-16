import {
  type TaskContext,
  compareVersions,
  fs,
  log,
  verify as v,
} from "../../../src/lib/mod.ts";
import { checkCommandOutput, runOrFail } from "../../../src/lib/shell.ts";
import { join } from "@std/path";

// csvkit: command-line CSV toolkit (csvcut, csvgrep, csvsql, csvlook, in2csv,
// ...). Installed as an isolated uv tool so it gets its own venv and Python,
// with its entry points linked into ~/.local/bin.
export const dependsOn = ["uv"];

const CSVKIT_VERSION = "2.2.0";

function uvBin(ctx: TaskContext): string {
  return join(ctx.home, ".local", "bin", "uv");
}

export async function shouldRun(ctx: TaskContext): Promise<boolean> {
  // Parse from `uv tool list`: "csvkit v2.2.0" heading followed by its scripts
  const result = await checkCommandOutput([uvBin(ctx), "tool", "list"]);
  const installedVersion = result.stdout?.match(/^csvkit v(\d+\.\d+\.\d+)/m)?.[1];
  if (result.code !== 0 || !installedVersion) {
    return true; // not installed via uv (or uv missing), run
  }

  if (compareVersions(installedVersion, CSVKIT_VERSION) >= 0) {
    return false; // installed version is equal or newer
  }

  log.info(`csvkit ${installedVersion} installed, upgrading to ${CSVKIT_VERSION}`);
  return true;
}

export async function run(ctx: TaskContext): Promise<void> {
  // Migrate from a pipx-managed csvkit if present. Both put csv* entry
  // points in ~/.local/bin and uv refuses to overwrite executables it
  // doesn't own. Rather than run pipx (whose own entry point may have a
  // stale interpreter after a pyenv upgrade), drop its venv directly and
  // let uv take over the entry points with --force.
  const pipxVenvs = [
    join(ctx.home, ".local", "pipx", "venvs", "csvkit"), // pipx < 1.5 default
    join(ctx.home, ".local", "share", "pipx", "venvs", "csvkit"), // XDG default
  ];
  let takeOver = false;
  for (const venv of pipxVenvs) {
    const { changed } = await fs.remove(ctx, venv);
    if (changed) {
      log.info("Removed pipx-managed csvkit venv (migrating to uv)");
      takeOver = true;
    }
  }

  log.info(`Installing csvkit v${CSVKIT_VERSION} via uv tool`);
  await runOrFail(ctx, [
    uvBin(ctx),
    "tool",
    "install",
    ...(takeOver ? ["--force"] : []),
    `csvkit==${CSVKIT_VERSION}`,
  ]);
  log.success("csvkit installed");
}

export async function verify(ctx: TaskContext): Promise<void> {
  await v.assertCommandWithPath(
    ctx.home,
    "csvcut",
    join(ctx.home, ".local", "bin", "csvcut"),
    "--version",
  );
}
