import { type TaskContext, log, verify as v } from "../../../src/lib/mod.ts";
import { curlPipe } from "../../../src/lib/shell.ts";

// Wasmer (wasmer.io): WebAssembly runtime and package manager. Installs the
// `wasmer` binary into ~/.wasmer/bin. WASMER_DIR + PATH are set in env/.zshrc
// (synced separately, which also sources ~/.wasmer/wasmer.sh), so this task
// only installs the runtime.
export const dependsOn = ["dev-utils"]; // curl

export async function shouldRun(ctx: TaskContext): Promise<boolean> {
  const wasmerBin = `${ctx.home}/.wasmer/bin/wasmer`;
  try {
    await Deno.stat(wasmerBin);
    return false; // already installed
  } catch {
    return true;
  }
}

export async function run(ctx: TaskContext): Promise<void> {
  log.info("Installing Wasmer runtime");
  await curlPipe(ctx, "https://get.wasmer.io", ["sh"]);
  log.success("Wasmer installed");
}

export async function verify(ctx: TaskContext): Promise<void> {
  await v.assertCommandWithPath(
    ctx.home,
    "wasmer",
    `${ctx.home}/.wasmer/bin/wasmer`,
    "--version",
  );
}
