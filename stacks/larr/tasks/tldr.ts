import { type TaskContext, verify as v } from "../../../src/lib/mod.ts";
import { pnpm } from "../../../src/lib/shell.ts";

export const dependsOn = ["volta"];

export async function run(ctx: TaskContext): Promise<void> {
  await pnpm(ctx, ["add", "-g", "tldr"]);
}

export async function verify(ctx: TaskContext): Promise<void> {
  await v.assertCommandWithPath(
    ctx.home,
    "tldr",
    `${ctx.home}/.local/share/pnpm/tldr`,
    "--version",
  );
}
