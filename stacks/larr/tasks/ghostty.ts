import { type TaskContext, log, verify as v } from "../../../src/lib/mod.ts";
import { curlPipe } from "../../../src/lib/shell.ts";

// Uses mkasberg/ghostty-ubuntu DEB package
// https://github.com/mkasberg/ghostty-ubuntu

export async function run(ctx: TaskContext): Promise<void> {
  log.info("Installing Ghostty via mkasberg/ghostty-ubuntu");
  await curlPipe(
    ctx,
    "https://raw.githubusercontent.com/mkasberg/ghostty-ubuntu/HEAD/install.sh",
    ["sudo", "bash"],
  );
}

export async function verify(_ctx: TaskContext): Promise<void> {
  await v.assertCommand("ghostty", "--version");
}
