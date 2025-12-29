import { type TaskContext } from "../../../src/lib/mod.ts";
import { apt, aptUpdate, goInstall } from "../../../src/lib/shell.ts";

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
    "tldr",
    "fonts-font-awesome",
  ]);

  await goInstall(ctx, "github.com/air-verse/air@latest");
}
