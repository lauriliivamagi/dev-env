import { type TaskContext, log, verify as v } from "../../../src/lib/mod.ts";
import { curlPipe, runOrFail } from "../../../src/lib/shell.ts";

export async function run(ctx: TaskContext): Promise<void> {
  log.info("Installing Volta");
  await curlPipe(ctx, "https://get.volta.sh", "bash");

  log.info("Installing Node.js LTS via Volta");
  await runOrFail(ctx, [`${ctx.home}/.volta/bin/volta`, "install", "node@lts"]);

  log.info("Installing pnpm via Volta");
  await runOrFail(ctx, [`${ctx.home}/.volta/bin/volta`, "install", "pnpm"]);

  log.info("Setting up pnpm global directory");
  const pnpmHome = `${ctx.home}/.local/share/pnpm`;
  const currentPath = Deno.env.get("PATH") ?? "";
  await runOrFail(ctx, [`${ctx.home}/.volta/bin/pnpm`, "setup"], {
    env: {
      PNPM_HOME: pnpmHome,
      PATH: `${pnpmHome}:${currentPath}`,
      SHELL: "/bin/bash",
    },
  });
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
