import { type TaskContext, log, verify as v } from "../../../src/lib/mod.ts";
import { curlPipe } from "../../../src/lib/shell.ts";

// Edge.js (edgejs.org, by Wasmer): a secure, Node.js-compatible JavaScript
// runtime that sandboxes via WebAssembly in `--safe` mode. Installs a
// standalone `edge` binary into ~/.edgejs/bin. EDGEJS_HOME + PATH are set in
// env/.zshrc (synced separately), so this task only installs the binary.
export const dependsOn = ["dev-utils"]; // curl

export async function shouldRun(ctx: TaskContext): Promise<boolean> {
  const edgeBin = `${ctx.home}/.edgejs/bin/edge`;
  try {
    await Deno.stat(edgeBin);
    return false; // already installed
  } catch {
    return true;
  }
}

export async function run(ctx: TaskContext): Promise<void> {
  log.info("Installing Edge.js runtime");
  await curlPipe(ctx, "https://edgejs.org/install", ["bash"]);
  log.success("Edge.js installed");
}

export async function verify(ctx: TaskContext): Promise<void> {
  await v.assertCommandWithPath(
    ctx.home,
    "edge",
    `${ctx.home}/.edgejs/bin/edge`,
    "--version",
  );
}
