import { type TaskContext, verify as v } from "../../../src/lib/mod.ts";
import { goInstall } from "../../../src/lib/shell.ts";

export const dependsOn = ["go"];

export async function shouldRun(ctx: TaskContext): Promise<boolean> {
  const gobin = `${ctx.home}/go/bin`;
  try {
    await Deno.stat(`${gobin}/air`);
    await Deno.stat(`${gobin}/d2`);
    return false;
  } catch {
    return true;
  }
}

export async function run(ctx: TaskContext): Promise<void> {
  await goInstall(ctx, "github.com/air-verse/air@latest");
  await goInstall(ctx, "oss.terrastruct.com/d2@latest");
}

export async function verify(_ctx: TaskContext): Promise<void> {
  await v.assertCommand("air", "-v");
  await v.assertCommand("d2", "--version");
}
