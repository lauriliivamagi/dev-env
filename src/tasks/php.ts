import { type TaskContext } from "../lib/mod.ts";
import { apt } from "../lib/shell.ts";

export async function run(ctx: TaskContext): Promise<void> {
  await apt(ctx, ["php", "php-cli", "php-common", "composer"]);
}
