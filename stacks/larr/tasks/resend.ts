import { type TaskContext, log, verify as v } from "../../../src/lib/mod.ts";
import { curlPipe } from "../../../src/lib/shell.ts";

// Resend CLI (resend.com/docs/cli): send and manage emails from the terminal.
// Installs the `resend` binary into ~/.resend/bin (respects $RESEND_INSTALL).
// PATH is set in env/.zshrc (synced separately), so this task only installs
// the binary. Auth is per-machine via `resend login` / RESEND_API_KEY.
export const dependsOn = ["dev-utils"]; // curl

export async function shouldRun(ctx: TaskContext): Promise<boolean> {
  const resendBin = `${ctx.home}/.resend/bin/resend`;
  try {
    await Deno.stat(resendBin);
    return false; // already installed
  } catch {
    return true;
  }
}

export async function run(ctx: TaskContext): Promise<void> {
  log.info("Installing Resend CLI");
  await curlPipe(ctx, "https://resend.com/install.sh", ["bash"]);
  log.success("Resend CLI installed");
}

export async function verify(ctx: TaskContext): Promise<void> {
  await v.assertCommandWithPath(
    ctx.home,
    "resend",
    `${ctx.home}/.resend/bin/resend`,
    "--version",
  );
}
