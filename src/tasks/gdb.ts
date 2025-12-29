import { type TaskContext, log, verify as v } from "../lib/mod.ts";
import { apt, curlPipe } from "../lib/shell.ts";

export async function run(ctx: TaskContext): Promise<void> {
  // GEF requires python3
  await apt(ctx, ["gdb", "python3"]);

  log.info("Installing GEF (GDB Enhanced Features)");
  await curlPipe(
    ctx,
    "https://gef.blah.cat/sh",
    "bash",
  );
}

export async function verify(_ctx: TaskContext): Promise<void> {
  await v.assertCommand("gdb", "--version");
}
