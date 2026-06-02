import {
  type TaskContext,
  compareVersions,
  fs,
  log,
  verify as v,
} from "../../../src/lib/mod.ts";
import { checkCommandOutput, curl, runOrFail } from "../../../src/lib/shell.ts";
import { join } from "@std/path";

const GH_VERSION = "2.93.0";

/**
 * Check if gh needs to be installed or upgraded.
 * Returns true if task should run, false if the installed version is current.
 */
export async function shouldRun(ctx: TaskContext): Promise<boolean> {
  const ghBin = `${ctx.home}/.local/bin/gh`;
  try {
    await Deno.stat(ghBin);
  } catch {
    return true; // gh not installed
  }

  const result = await checkCommandOutput([ghBin, "--version"]);
  if (result.code !== 0) return true;

  // Parse version: "gh version 2.93.0 (2026-05-27)"
  const match = result.stdout?.match(/gh version (\d+\.\d+\.\d+)/);
  const installedVersion = match?.[1];
  if (!installedVersion) return true; // couldn't parse, run to be safe

  if (compareVersions(installedVersion, GH_VERSION) >= 0) {
    return false; // installed version is equal or newer
  }

  log.info(`gh ${installedVersion} installed, upgrading to ${GH_VERSION}`);
  return true;
}

export async function run(ctx: TaskContext): Promise<void> {
  const binDir = `${ctx.home}/.local/bin`;
  await fs.mkdir(ctx, binDir);

  log.info(`Installing gh v${GH_VERSION}`);

  const url = `https://github.com/cli/cli/releases/download/v${GH_VERSION}/gh_${GH_VERSION}_linux_amd64.tar.gz`;
  const tarFile = "/tmp/gh.tar.gz";

  await curl(ctx, url, tarFile);
  await runOrFail(ctx, ["tar", "-xzf", tarFile, "-C", "/tmp"]);
  await runOrFail(ctx, [
    "cp",
    `/tmp/gh_${GH_VERSION}_linux_amd64/bin/gh`,
    join(binDir, "gh"),
  ]);
  await runOrFail(ctx, ["chmod", "+x", join(binDir, "gh")]);

  log.success("gh installed");
}

export async function verify(ctx: TaskContext): Promise<void> {
  await v.assertCommandWithPath(
    ctx.home,
    "gh",
    `${ctx.home}/.local/bin/gh`,
    "--version",
  );
}
