import { type TaskContext, log, verify as v } from "../lib/mod.ts";
import { apt, curlPipe, gitClone, runOrFail } from "../lib/shell.ts";

export async function run(ctx: TaskContext): Promise<void> {
  await apt(ctx, ["zsh"]);

  log.info("Installing oh-my-zsh");
  await curlPipe(
    ctx,
    "https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh",
    "sh",
  );

  log.info("Setting zsh as default shell");
  const zshPath = await getZshPath(ctx);
  if (zshPath) {
    await runOrFail(ctx, ["sudo", "chsh", "-s", zshPath, Deno.env.get("USER")!]);
  }

  log.info("Installing zsh plugins");
  const customPlugins = `${ctx.home}/.oh-my-zsh/custom/plugins`;

  await gitClone(
    ctx,
    "https://github.com/zsh-users/zsh-autosuggestions",
    `${customPlugins}/zsh-autosuggestions`,
  );

  await gitClone(
    ctx,
    "https://github.com/zsh-users/zsh-syntax-highlighting",
    `${customPlugins}/zsh-syntax-highlighting`,
  );
}

export async function verify(ctx: TaskContext): Promise<void> {
  await v.assertCommand("zsh", "--version");
  await v.assertDir(`${ctx.home}/.oh-my-zsh`);
  await v.assertDir(`${ctx.home}/.oh-my-zsh/custom/plugins/zsh-autosuggestions`);
  await v.assertDir(`${ctx.home}/.oh-my-zsh/custom/plugins/zsh-syntax-highlighting`);
}

async function getZshPath(ctx: TaskContext): Promise<string | null> {
  if (ctx.dryRun) {
    return "/usr/bin/zsh";
  }

  const cmd = new Deno.Command("which", { args: ["zsh"], stdout: "piped" });
  const output = await cmd.output();
  if (output.code !== 0) {
    return null;
  }
  return new TextDecoder().decode(output.stdout).trim();
}
