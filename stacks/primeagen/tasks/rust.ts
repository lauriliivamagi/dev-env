import { type TaskContext, verify as v } from "../../../src/lib/mod.ts";
import { cargoInstall, curlPipe } from "../../../src/lib/shell.ts";

// Cargo install needs a C linker (build-essential from libs)
export const dependsOn = ["libs"];

export async function run(ctx: TaskContext): Promise<void> {
  await curlPipe(ctx, "https://sh.rustup.rs", ["sh", "-s", "--", "-y"]);

  await cargoInstall(ctx, "stylua");
}

export async function verify(ctx: TaskContext): Promise<void> {
  await v.assertDir(`${ctx.home}/.cargo`);
  await v.assertDir(`${ctx.home}/.rustup`);
  await v.assertCommandWithPath(
    ctx.home,
    "rustc",
    `${ctx.home}/.cargo/bin/rustc`,
    "--version",
  );
  await v.assertCommandWithPath(
    ctx.home,
    "cargo",
    `${ctx.home}/.cargo/bin/cargo`,
    "--version",
  );
}
