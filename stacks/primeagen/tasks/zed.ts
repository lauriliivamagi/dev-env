import { type TaskContext, log, verify as v } from "../../../src/lib/mod.ts";
import { curl, runOrFail } from "../../../src/lib/shell.ts";
import { join } from "@std/path";

const ZED_VERSION = "0.217.3";

export async function run(ctx: TaskContext): Promise<void> {
  const binDir = `${ctx.home}/.local/bin`;
  const zedDir = `${ctx.home}/.local/zed.app`;

  // Download and extract Zed directly (installer script has issues in headless environments)
  log.info(`Installing Zed editor v${ZED_VERSION}`);
  const zedUrl =
    `https://github.com/zed-industries/zed/releases/download/v${ZED_VERSION}/zed-linux-x86_64.tar.gz`;
  const zedTar = "/tmp/zed.tar.gz";

  await curl(ctx, zedUrl, zedTar);
  await runOrFail(ctx, ["tar", "-xzf", zedTar, "-C", "/tmp"]);
  await runOrFail(ctx, ["rm", "-rf", zedDir]);
  await runOrFail(ctx, ["mv", "/tmp/zed.app", zedDir]);

  // Create symlink to binary
  const zedBin = join(binDir, "zed");
  await runOrFail(ctx, ["ln", "-sf", `${zedDir}/bin/zed`, zedBin]);
}

export async function verify(ctx: TaskContext): Promise<void> {
  await v.assertDir(`${ctx.home}/.local/zed.app`);
  await v.assertFile(`${ctx.home}/.local/bin/zed`);
}
