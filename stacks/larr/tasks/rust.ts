import { type TaskContext, log, verify as v } from "../../../src/lib/mod.ts";
import { curlPipe } from "../../../src/lib/shell.ts";

// Cargo install needs a C linker (build-essential from dev)
export const dependsOn = ["dev"];

export async function run(ctx: TaskContext): Promise<void> {
  log.info("Installing Rust via rustup");
  await curlPipe(ctx, "https://sh.rustup.rs", ["sh", "-s", "--", "-y"]);
  log.success("Rust installed");
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
