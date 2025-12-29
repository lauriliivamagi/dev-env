import { type TaskContext, log, verify as v } from "../lib/mod.ts";
import { apt, gitClone } from "../lib/shell.ts";

export async function run(ctx: TaskContext): Promise<void> {
  await apt(ctx, ["tmux"]);

  log.info("Installing TPM (Tmux Plugin Manager)");
  const tpmPath = `${ctx.home}/.tmux/plugins/tpm`;
  await gitClone(ctx, "https://github.com/tmux-plugins/tpm", tpmPath);
}

export async function verify(ctx: TaskContext): Promise<void> {
  await v.assertCommand("tmux", "-V");
  await v.assertDir(`${ctx.home}/.tmux/plugins/tpm`);
}
