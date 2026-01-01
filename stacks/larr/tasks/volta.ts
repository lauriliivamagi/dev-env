import { type TaskContext, log, verify as v } from "../../../src/lib/mod.ts";
import { curlPipe, runOrFail } from "../../../src/lib/shell.ts";

export async function shouldRun(ctx: TaskContext): Promise<boolean> {
  // Check if pnpm is installed via volta (means full setup is done)
  try {
    await Deno.stat(`${ctx.home}/.volta/tools/image/pnpm`);
    return false;
  } catch {
    return true;
  }
}

export async function run(ctx: TaskContext): Promise<void> {
  log.info("Installing Volta");
  await curlPipe(ctx, "https://get.volta.sh", ["bash"], { skipIfCommand: "volta" });

  log.info("Installing Node.js LTS via Volta");
  await runOrFail(ctx, [`${ctx.home}/.volta/bin/volta`, "install", "node@lts"]);

  log.info("Installing pnpm via Volta");
  await runOrFail(ctx, [`${ctx.home}/.volta/bin/volta`, "install", "pnpm"]);

  log.info("Setting up pnpm global directory");
  const pnpmHome = `${ctx.home}/.local/share/pnpm`;
  const currentPath = Deno.env.get("PATH") ?? "";
  // In realistic test mode, use PATH as-is from shell config
  // In normal mode, extend PATH with pnpm home
  const env: Record<string, string> = {
    PNPM_HOME: pnpmHome,
    SHELL: "/bin/bash",
    PATH: Deno.env.get("REALISTIC_TEST") ? currentPath : `${pnpmHome}:${currentPath}`,
  };
  await runOrFail(ctx, [`${ctx.home}/.volta/bin/pnpm`, "setup"], { env });

  log.info("Installing global npm packages");
  const pnpmCmd = `${ctx.home}/.volta/bin/pnpm`;
  await runOrFail(ctx, [pnpmCmd, "install", "-g", "srt"], { env });
  await runOrFail(ctx, [pnpmCmd, "install", "-g", "dendron"], { env });
  await runOrFail(ctx, [pnpmCmd, "install", "-g", "@marp-team/marp-cli"], { env });
  await runOrFail(ctx, [pnpmCmd, "install", "-g", "@mermaid-js/mermaid-cli"], { env });
}

export async function verify(ctx: TaskContext): Promise<void> {
  // Volta installs node/pnpm shims, check the tools directory for actual installations
  await v.assertDir(`${ctx.home}/.volta/tools/image/node`);
  await v.assertDir(`${ctx.home}/.volta/tools/image/pnpm`);
  await v.assertCommandWithPath(
    ctx.home,
    "volta",
    `${ctx.home}/.volta/bin/volta`,
    "--version",
  );
}
