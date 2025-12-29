import { type TaskContext, fs, log, verify as v } from "../../../src/lib/mod.ts";
import { apt, gitClone, runOrFail } from "../../../src/lib/shell.ts";

export async function run(ctx: TaskContext): Promise<void> {
  await apt(ctx, ["zsh"]);

  log.info("Setting zsh as default shell");
  const zshPath = await getZshPath(ctx);
  if (zshPath) {
    await runOrFail(ctx, ["sudo", "chsh", "-s", zshPath, Deno.env.get("USER")!]);
  }

  // Create .zsh directory structure
  const zshDir = `${ctx.home}/.zsh`;
  await fs.mkdir(ctx, `${zshDir}/plugins`);
  await fs.mkdir(ctx, `${zshDir}/themes`);

  log.info("Installing Powerlevel10k theme");
  await gitClone(
    ctx,
    "https://github.com/romkatv/powerlevel10k",
    `${zshDir}/themes/powerlevel10k`,
  );

  log.info("Installing zsh plugins");
  await gitClone(
    ctx,
    "https://github.com/zsh-users/zsh-syntax-highlighting",
    `${zshDir}/plugins/zsh-syntax-highlighting`,
  );

  await gitClone(
    ctx,
    "https://github.com/lukechilds/zsh-better-npm-completion",
    `${zshDir}/plugins/zsh-better-npm-completion`,
  );

  log.success("zsh and plugins installed");
}

export async function verify(ctx: TaskContext): Promise<void> {
  await v.assertCommand("zsh", "--version");
  await v.assertDir(`${ctx.home}/.zsh/themes/powerlevel10k`);
  await v.assertDir(`${ctx.home}/.zsh/plugins/zsh-syntax-highlighting`);
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
