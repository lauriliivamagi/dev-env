import { type TaskContext, log, verify as v } from "../../../src/lib/mod.ts";
import { curl, runOrFail } from "../../../src/lib/shell.ts";
import { join } from "@std/path";

export async function run(ctx: TaskContext): Promise<void> {
  const binDir = `${ctx.home}/.local/bin`;
  const zedDir = `${ctx.home}/.local/zed.app`;

  // Download and extract Zed directly (installer script has issues in headless environments)
  log.info("Installing Zed editor (latest stable)");
  const zedUrl =
    "https://cloud.zed.dev/releases/stable/latest/download?asset=zed&arch=x86_64&os=linux&source=dev-env";
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
