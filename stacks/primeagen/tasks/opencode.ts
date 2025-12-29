import { type TaskContext, log } from "../../../src/lib/mod.ts";
import { curlPipe } from "../../../src/lib/shell.ts";

export async function run(ctx: TaskContext): Promise<void> {
  log.info("Installing OpenCode");
  await curlPipe(ctx, "https://opencode.ai/install", "bash");
}
