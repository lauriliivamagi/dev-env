import {
  type TaskContext,
  compareVersions,
  fs,
  log,
  verify as v,
} from "../../../src/lib/mod.ts";
import { checkCommandOutput, curl, runOrFail } from "../../../src/lib/shell.ts";
import { join } from "@std/path";

const LAZYGIT_VERSION = "0.62.1";

/**
 * Check if lazygit needs to be installed or upgraded.
 * Returns true if task should run, false if current version matches.
 */
export async function shouldRun(ctx: TaskContext): Promise<boolean> {
  const lazygitBin = `${ctx.home}/.local/bin/lazygit`;
  try {
    await Deno.stat(lazygitBin);
  } catch {
    return true; // lazygit not installed
  }

  // Check installed version using checkCommandOutput (explicitly bypasses dry-run for state checks)
  const result = await checkCommandOutput([lazygitBin, "--version"]);
  if (result.code !== 0) return true;

  // Parse version: "commit=..., build date=..., version=0.57.0"
  const match = result.stdout?.match(/version=(\d+\.\d+\.\d+)/);
  const installedVersion = match?.[1];

  if (!installedVersion) {
    return true; // Couldn't parse version, run to be safe
  }

  const cmp = compareVersions(installedVersion, LAZYGIT_VERSION);

  if (cmp >= 0) {
    // Installed version is equal or newer - skip
    return false;
  }

  // Installed version is older - upgrade
  log.info(`lazygit ${installedVersion} installed, upgrading to ${LAZYGIT_VERSION}`);
  return true;
}

export async function run(ctx: TaskContext): Promise<void> {
  const binDir = `${ctx.home}/.local/bin`;
  await fs.mkdir(ctx, binDir);

  log.info(`Installing lazygit v${LAZYGIT_VERSION}`);

  const url = `https://github.com/jesseduffield/lazygit/releases/download/v${LAZYGIT_VERSION}/lazygit_${LAZYGIT_VERSION}_Linux_x86_64.tar.gz`;
  const tarFile = "/tmp/lazygit.tar.gz";

  await curl(ctx, url, tarFile);
  await runOrFail(ctx, ["tar", "-xzf", tarFile, "-C", "/tmp"]);
  await runOrFail(ctx, ["cp", "/tmp/lazygit", join(binDir, "lazygit")]);
  await runOrFail(ctx, ["chmod", "+x", join(binDir, "lazygit")]);

  log.success("lazygit installed");
}

export async function verify(ctx: TaskContext): Promise<void> {
  await v.assertCommandWithPath(
    ctx.home,
    "lazygit",
    `${ctx.home}/.local/bin/lazygit`,
    "--version"
  );
}
