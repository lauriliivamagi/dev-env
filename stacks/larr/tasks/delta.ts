import {
  type TaskContext,
  fs,
  log,
  verify as v,
} from "../../../src/lib/mod.ts";
import { curl, runOrFail } from "../../../src/lib/shell.ts";
import { join } from "@std/path";

const DELTA_VERSION = "0.18.2";

export async function run(ctx: TaskContext): Promise<void> {
  const binDir = `${ctx.home}/.local/bin`;
  await fs.mkdir(ctx, binDir);

  log.info(`Installing delta v${DELTA_VERSION}`);

  const url = `https://github.com/dandavison/delta/releases/download/${DELTA_VERSION}/delta-${DELTA_VERSION}-x86_64-unknown-linux-gnu.tar.gz`;
  const tarFile = "/tmp/delta.tar.gz";

  await curl(ctx, url, tarFile);
  await runOrFail(ctx, ["tar", "-xzf", tarFile, "-C", "/tmp"]);
  await runOrFail(ctx, [
    "cp",
    `/tmp/delta-${DELTA_VERSION}-x86_64-unknown-linux-gnu/delta`,
    join(binDir, "delta"),
  ]);
  await runOrFail(ctx, ["chmod", "+x", join(binDir, "delta")]);

  log.success("delta installed");
}

export async function verify(ctx: TaskContext): Promise<void> {
  await v.assertCommandWithPath(
    ctx.home,
    "delta",
    `${ctx.home}/.local/bin/delta`,
    "--version"
  );
}
