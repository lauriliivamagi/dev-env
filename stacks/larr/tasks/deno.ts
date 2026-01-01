import { type TaskContext, log, verify as v } from "../../../src/lib/mod.ts";
import { curlPipe } from "../../../src/lib/shell.ts";

export const dependsOn = ["volta"];

/**
 * Check if Deno needs to be installed.
 * Returns true if task should run, false if user-local deno exists.
 * Note: We check the specific user-local path, not PATH, to avoid
 * skipping when a system deno exists (e.g., in Docker test environment).
 */
export async function shouldRun(ctx: TaskContext): Promise<boolean> {
  const denoBin = `${ctx.home}/.deno/bin/deno`;
  try {
    await Deno.stat(denoBin);
    return false; // deno already installed at user-local path
  } catch {
    return true; // deno not installed
  }
}

export async function run(ctx: TaskContext): Promise<void> {
  log.info("Installing Deno");
  await curlPipe(ctx, "https://deno.land/install.sh", ["sh"]);
}

export async function verify(ctx: TaskContext): Promise<void> {
  await v.assertCommandWithPath(
    ctx.home,
    "deno",
    `${ctx.home}/.deno/bin/deno`,
    "--version"
  );
}
