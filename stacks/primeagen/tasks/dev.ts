import { type TaskContext, verify as v } from "../../../src/lib/mod.ts";
import { apt, aptUpdate, goInstall, pnpm } from "../../../src/lib/shell.ts";

export const dependsOn = ["node"];

export async function run(ctx: TaskContext): Promise<void> {
  await aptUpdate(ctx);

  await apt(ctx, [
    "build-essential",
    "git",
    "curl",
    "wget",
    "fzf",
    "btop",
    "bc",
    "gimp",
    "fonts-font-awesome",
  ]);

  await pnpm(ctx, ["add", "-g", "tldr"]);
  await goInstall(ctx, "github.com/air-verse/air@latest");
}

export async function verify(ctx: TaskContext): Promise<void> {
  await v.assertCommand("git", "--version");
  await v.assertCommand("fzf", "--version");
  await v.assertCommandWithPath(
    ctx.home,
    "tldr",
    `${ctx.home}/.local/share/pnpm/tldr`,
    "--version",
  );
}
