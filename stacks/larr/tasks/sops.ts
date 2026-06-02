import {
  type TaskContext,
  compareVersions,
  fs,
  log,
  verify as v,
} from "../../../src/lib/mod.ts";
import { checkCommandOutput, curl, runOrFail } from "../../../src/lib/shell.ts";
import { join } from "@std/path";

const AGE_VERSION = "1.3.1";
const SOPS_VERSION = "3.13.1";

/**
 * Check if sops needs to be installed or upgraded. Gated on the sops version
 * (the one that moves); age is rarely updated and travels with this task.
 * Returns true if task should run, false if the installed version is current.
 */
export async function shouldRun(ctx: TaskContext): Promise<boolean> {
  const sopsBin = `${ctx.home}/.local/bin/sops`;
  try {
    await Deno.stat(sopsBin);
  } catch {
    return true; // sops not installed
  }

  const result = await checkCommandOutput([sopsBin, "--version"]);
  if (result.code !== 0) return true;

  // Parse version: "sops 3.13.1 (latest)"
  const match = result.stdout?.match(/(\d+\.\d+\.\d+)/);
  const installedVersion = match?.[1];
  if (!installedVersion) return true; // couldn't parse, run to be safe

  if (compareVersions(installedVersion, SOPS_VERSION) >= 0) {
    return false; // installed version is equal or newer
  }

  log.info(`sops ${installedVersion} installed, upgrading to ${SOPS_VERSION}`);
  return true;
}

export async function run(ctx: TaskContext): Promise<void> {
  const binDir = `${ctx.home}/.local/bin`;
  await fs.mkdir(ctx, binDir);

  // Install age
  log.info(`Installing age v${AGE_VERSION}`);
  const ageUrl =
    `https://github.com/FiloSottile/age/releases/download/v${AGE_VERSION}/age-v${AGE_VERSION}-linux-amd64.tar.gz`;
  const ageTar = "/tmp/age.tar.gz";
  await curl(ctx, ageUrl, ageTar);
  await runOrFail(ctx, ["tar", "-xzf", ageTar, "-C", "/tmp"]);
  await runOrFail(ctx, [
    "cp",
    `/tmp/age/age`,
    join(binDir, "age"),
  ]);
  await runOrFail(ctx, [
    "cp",
    `/tmp/age/age-keygen`,
    join(binDir, "age-keygen"),
  ]);
  await runOrFail(ctx, ["chmod", "+x", join(binDir, "age")]);
  await runOrFail(ctx, ["chmod", "+x", join(binDir, "age-keygen")]);

  // Install sops
  log.info(`Installing sops v${SOPS_VERSION}`);
  const sopsUrl =
    `https://github.com/getsops/sops/releases/download/v${SOPS_VERSION}/sops-v${SOPS_VERSION}.linux.amd64`;
  const sopsBin = join(binDir, "sops");
  await curl(ctx, sopsUrl, sopsBin);
  await runOrFail(ctx, ["chmod", "+x", sopsBin]);

  // Create sops age key directory
  log.info("Creating SOPS age key directory");
  const sopsAgeDir = `${ctx.home}/.config/sops/age`;
  await fs.mkdir(ctx, sopsAgeDir);
}

export async function verify(ctx: TaskContext): Promise<void> {
  const binDir = `${ctx.home}/.local/bin`;
  await v.assertDir(`${ctx.home}/.config/sops/age`);
  await v.assertCommandWithPath(
    ctx.home,
    "age",
    `${binDir}/age`,
    "--version",
  );
  await v.assertCommandWithPath(
    ctx.home,
    "age-keygen",
    `${binDir}/age-keygen`,
    "--version",
  );
  await v.assertCommandWithPath(
    ctx.home,
    "sops",
    `${binDir}/sops`,
    "--version",
  );
}
