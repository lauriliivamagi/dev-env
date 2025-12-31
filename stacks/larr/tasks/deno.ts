import { type TaskContext, log, verify as v } from "../../../src/lib/mod.ts";
import { curlPipe } from "../../../src/lib/shell.ts";

export const dependsOn = ["volta"];

export async function run(ctx: TaskContext): Promise<void> {
  log.info("Installing Deno");
  await curlPipe(ctx, "https://deno.land/install.sh", ["sh"], { skipIfCommand: "deno" });
}

export async function verify(ctx: TaskContext): Promise<void> {
  await v.assertCommandWithPath(
    ctx.home,
    "deno",
    `${ctx.home}/.deno/bin/deno`,
    "--version"
  );
}
