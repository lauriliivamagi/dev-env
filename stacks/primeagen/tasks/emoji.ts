import { type TaskContext, log, verify as v } from "../../../src/lib/mod.ts";
import { curl, runOrFail } from "../../../src/lib/shell.ts";

const EMOJI_VERSION = "1.0-beta.2";
const EMOJI_URL = `https://github.com/emojicode/emojicode/releases/download/v${EMOJI_VERSION}/Emojicode-${EMOJI_VERSION}-Linux-x86_64.tar.gz`;

export async function run(ctx: TaskContext): Promise<void> {
  const tmpDir = "/tmp/emojicode-install";
  const tarFile = `${tmpDir}/emojicode.tar.gz`;
  const extractDir = `${tmpDir}/Emojicode-${EMOJI_VERSION}-Linux-x86_64`;

  log.info("Downloading Emojicode");
  await runOrFail(ctx, ["mkdir", "-p", tmpDir]);
  await curl(ctx, EMOJI_URL, tarFile);

  log.info("Extracting Emojicode");
  await runOrFail(ctx, ["tar", "-xzf", tarFile, "-C", tmpDir]);

  log.info("Installing Emojicode");
  await runOrFail(ctx, ["sh", "-c", `cd ${extractDir} && ./install.sh`]);

  log.info("Cleaning up");
  await runOrFail(ctx, ["rm", "-rf", tmpDir]);
}

export async function verify(_ctx: TaskContext): Promise<void> {
  await v.assertCommand("emojicodec", "--version");
}
