import { type TaskContext, fs, log, verify as v } from "../lib/mod.ts";
import { curl, runOrFail } from "../lib/shell.ts";
import { join } from "@std/path";

const AGE_VERSION = "1.3.1";
const SOPS_VERSION = "3.11.0";

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
