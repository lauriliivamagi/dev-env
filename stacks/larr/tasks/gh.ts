import {
  type TaskContext,
  fs,
  log,
  verify as v,
} from "../../../src/lib/mod.ts";
import { curl, runOrFail } from "../../../src/lib/shell.ts";
import { join } from "@std/path";

const GH_VERSION = "2.83.2";

export async function shouldRun(ctx: TaskContext): Promise<boolean> {
  const ghBin = `${ctx.home}/.local/bin/gh`;
  try {
    await Deno.stat(ghBin);
    return false;
  } catch {
    return true;
  }
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
