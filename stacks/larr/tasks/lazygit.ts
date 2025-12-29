import { type TaskContext, fs, log, verify as v } from "../../../src/lib/mod.ts";
import { curl, runOrFail } from "../../../src/lib/shell.ts";
import { join } from "@std/path";

const LAZYGIT_VERSION = "0.44.1";

export async function run(ctx: TaskContext): Promise<void> {
  const binDir = `${ctx.home}/.local/bin`;
  await fs.mkdir(ctx, binDir);

  log.info(`Installing lazygit v${LAZYGIT_VERSION}`);

  const url =
    `https://github.com/jesseduffield/lazygit/releases/download/v${LAZYGIT_VERSION}/lazygit_${LAZYGIT_VERSION}_Linux_x86_64.tar.gz`;
  const tarFile = "/tmp/lazygit.tar.gz";

  await curl(ctx, url, tarFile);
  await runOrFail(ctx, ["tar", "-xzf", tarFile, "-C", "/tmp"]);
  await runOrFail(ctx, ["cp", "/tmp/lazygit", join(binDir, "lazygit")]);
  await runOrFail(ctx, ["chmod", "+x", join(binDir, "lazygit")]);

  log.success("lazygit installed");
}

export async function verify(ctx: TaskContext): Promise<void> {
  await v.assertCommandWithPath(
    ctx.home,
    "lazygit",
    `${ctx.home}/.local/bin/lazygit`,
    "--version",
  );
}
