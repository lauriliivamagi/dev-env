import {
  type TaskContext,
  compareVersions,
  fs,
  log,
  verify as v,
} from "../../../src/lib/mod.ts";
import { checkCommandOutput, curl, runOrFail } from "../../../src/lib/shell.ts";
import { join } from "@std/path";

// zoxide: smarter cd (`z foo` jumps to the best-matching directory you've
// visited). Replaces fasd. Installed from the GitHub release tarball into
// ~/.local/bin because Ubuntu's apt package lags upstream by several
// releases; `zoxide init zsh` is wired up in env/.zshrc (synced separately).
export const dependsOn = ["dev-utils"]; // curl

const ZOXIDE_VERSION = "0.10.0";

export async function shouldRun(ctx: TaskContext): Promise<boolean> {
  const zoxideBin = join(ctx.home, ".local", "bin", "zoxide");
  try {
    await Deno.stat(zoxideBin);
  } catch {
    return true; // not installed
  }

  // Parse version: "zoxide 0.10.0"
  const result = await checkCommandOutput([zoxideBin, "--version"]);
  const installedVersion = result.stdout?.match(/zoxide (\d+\.\d+\.\d+)/)?.[1];
  if (result.code !== 0 || !installedVersion) {
    return true; // couldn't determine version, run to be safe
  }

  if (compareVersions(installedVersion, ZOXIDE_VERSION) >= 0) {
    return false; // installed version is equal or newer
  }

  log.info(`zoxide ${installedVersion} installed, upgrading to ${ZOXIDE_VERSION}`);
  return true;
}

export async function run(ctx: TaskContext): Promise<void> {
  const binDir = join(ctx.home, ".local", "bin");
  await fs.mkdir(ctx, binDir);

  log.info(`Installing zoxide v${ZOXIDE_VERSION}`);

  // musl build: statically linked, no glibc version coupling.
  const tarName = `zoxide-${ZOXIDE_VERSION}-x86_64-unknown-linux-musl.tar.gz`;
  const url =
    `https://github.com/ajeetdsouza/zoxide/releases/download/v${ZOXIDE_VERSION}/${tarName}`;
  const tarFile = "/tmp/zoxide.tar.gz";
  const extractDir = "/tmp/zoxide-extract";

  await curl(ctx, url, tarFile);
  await fs.mkdir(ctx, extractDir);
  // The archive is flat (binary + man/ + completions/ at the top level).
  await runOrFail(ctx, ["tar", "-xzf", tarFile, "-C", extractDir]);
  await runOrFail(ctx, ["cp", join(extractDir, "zoxide"), join(binDir, "zoxide")]);
  await runOrFail(ctx, ["chmod", "+x", join(binDir, "zoxide")]);

  await fs.remove(ctx, tarFile);
  await fs.remove(ctx, extractDir);

  log.success("zoxide installed");
}

export async function verify(ctx: TaskContext): Promise<void> {
  await v.assertCommandWithPath(
    ctx.home,
    "zoxide",
    join(ctx.home, ".local", "bin", "zoxide"),
    "--version",
  );
}
