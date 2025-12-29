import { type TaskContext, fs, log, verify as v } from "../../../src/lib/mod.ts";
import { curl, runOrFail } from "../../../src/lib/shell.ts";
import { join } from "@std/path";

export async function run(ctx: TaskContext): Promise<void> {
  log.info("Installing cht.sh");

  const binDir = join(ctx.home, ".local", "bin");
  await fs.mkdir(ctx, binDir);

  const chtPath = join(binDir, "cht.sh");
  await curl(ctx, "https://cht.sh/:cht.sh", chtPath);
  await runOrFail(ctx, ["chmod", "+x", chtPath]);

  log.success("cht.sh installed");
}

export async function verify(ctx: TaskContext): Promise<void> {
  const binDir = join(ctx.home, ".local", "bin");
  await v.assertFile(join(binDir, "cht.sh"));
}
