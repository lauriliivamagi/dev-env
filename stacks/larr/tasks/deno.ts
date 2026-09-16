import {
  type TaskContext,
  compareVersions,
  log,
  verify as v,
} from "../../../src/lib/mod.ts";
import { checkCommandOutput, curlPipe } from "../../../src/lib/shell.ts";

export const dependsOn = ["volta"];

const DENO_VERSION = "2.9.6";

/**
 * Check if Deno needs to be installed or upgraded.
 * Returns true if task should run, false if the user-local deno is at
 * DENO_VERSION or newer.
 * Note: We check the specific user-local path, not PATH, to avoid
 * skipping when a system deno exists (e.g., in Docker test environment).
 */
export async function shouldRun(ctx: TaskContext): Promise<boolean> {
  const denoBin = `${ctx.home}/.deno/bin/deno`;
  try {
    await Deno.stat(denoBin);
  } catch {
    return true; // deno not installed
  }

  // Parse version: "deno 2.9.6 (stable, release, x86_64-unknown-linux-gnu)"
  const result = await checkCommandOutput([denoBin, "--version"]);
  const installedVersion = result.stdout?.match(/^deno (\d+\.\d+\.\d+)/m)?.[1];
  if (result.code !== 0 || !installedVersion) {
    return true; // Couldn't determine version, run to be safe
  }

  if (compareVersions(installedVersion, DENO_VERSION) >= 0) {
    return false; // Installed version is equal or newer - skip
  }

  log.info(`Deno ${installedVersion} installed, upgrading to ${DENO_VERSION}`);
  return true;
}

export async function run(ctx: TaskContext): Promise<void> {
  log.info(`Installing Deno v${DENO_VERSION}`);
  // install.sh takes the version as its argument and overwrites an existing
  // ~/.deno/bin/deno in place, so the same call serves fresh installs and
  // upgrades. Shell-config editing is skipped since stdin/stdout aren't a
  // TTY here; PATH comes from env/.zshrc.
  await curlPipe(ctx, "https://deno.land/install.sh", ["sh", "-s", `v${DENO_VERSION}`]);
}

export async function verify(ctx: TaskContext): Promise<void> {
  await v.assertCommandWithPath(
    ctx.home,
    "deno",
    `${ctx.home}/.deno/bin/deno`,
    "--version",
  );
}
