import { type TaskContext } from "../../../src/lib/mod.ts";
import { apt } from "../../../src/lib/shell.ts";

export async function run(ctx: TaskContext): Promise<void> {
  await apt(ctx, ["php", "php-cli", "php-common", "composer"]);
}
