import { type TaskContext, fs, log, verify as v } from "../../../src/lib/mod.ts";
import { curl, runOrFail } from "../../../src/lib/shell.ts";
import { join } from "@std/path";

const GITLEAKS_VERSION = "8.30.0";

export async function shouldRun(ctx: TaskContext): Promise<boolean> {
  const gitleaksBin = `${ctx.home}/.local/bin/gitleaks`;
  try {
    await Deno.stat(gitleaksBin);
    return false;
  } catch {
    return true;
  }
}

export async function run(ctx: TaskContext): Promise<void> {
  const binDir = `${ctx.home}/.local/bin`;
  await fs.mkdir(ctx, binDir);

  log.info(`Installing gitleaks v${GITLEAKS_VERSION}`);

  const url =
    `https://github.com/gitleaks/gitleaks/releases/download/v${GITLEAKS_VERSION}/gitleaks_${GITLEAKS_VERSION}_linux_x64.tar.gz`;
  const tarFile = "/tmp/gitleaks.tar.gz";

  await curl(ctx, url, tarFile);
  await runOrFail(ctx, ["tar", "-xzf", tarFile, "-C", "/tmp"]);
  await runOrFail(ctx, ["cp", "/tmp/gitleaks", join(binDir, "gitleaks")]);
  await runOrFail(ctx, ["chmod", "+x", join(binDir, "gitleaks")]);

  log.success("gitleaks installed");
}

export async function verify(ctx: TaskContext): Promise<void> {
  await v.assertCommandWithPath(
    ctx.home,
    "gitleaks",
    `${ctx.home}/.local/bin/gitleaks`,
    "version",
  );
}
