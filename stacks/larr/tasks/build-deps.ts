import { type TaskContext } from "../../../src/lib/mod.ts";
import { apt, aptUpdate } from "../../../src/lib/shell.ts";

export async function run(ctx: TaskContext): Promise<void> {
  await aptUpdate(ctx);

  await apt(ctx, [
    "build-essential",
    "libasound2-dev",
  ]);
}
