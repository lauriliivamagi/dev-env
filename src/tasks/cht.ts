import { type TaskContext, log, verify as v } from "../lib/mod.ts";
import { curl, runOrFail } from "../lib/shell.ts";

export async function run(ctx: TaskContext): Promise<void> {
  const binPath = `${ctx.home}/.local/bin/cht.sh`;

  log.info("Installing cht.sh");
  await curl(ctx, "https://cht.sh/:cht.sh", binPath);
  await runOrFail(ctx, ["chmod", "+x", binPath]);
}

export async function verify(ctx: TaskContext): Promise<void> {
  // cht.sh requires network access to work, so we only verify it's in PATH
  await v.assertCommandWithPath(
    ctx.home,
    "cht.sh",
    `${ctx.home}/.local/bin/cht.sh`,
  );
}
