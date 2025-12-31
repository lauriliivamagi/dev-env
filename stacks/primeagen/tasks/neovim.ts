import { join } from "@std/path";
import { type TaskContext, assert, fs, verify as v } from "../../../src/lib/mod.ts";
import { apt, gitCloneOrPull, runOrFail } from "../../../src/lib/shell.ts";

function extractRepoName(url: string): string {
  const parts = url.split("/");
  const lastPart = parts[parts.length - 1];
  assert(lastPart !== undefined, `invalid git URL: ${url}`);
  return lastPart.replace(".git", "");
}

export async function run(ctx: TaskContext): Promise<void> {
  await apt(ctx, ["neovim", "lua5.1", "luarocks"]);

  const personalDir = join(ctx.home, "personal");
  await fs.mkdir(ctx, personalDir);

  const repos = [
    { url: "https://github.com/ThePrimeagen/harpoon.git", branch: "harpoon2" },
    { url: "https://github.com/ThePrimeagen/vim-apm.git" },
    { url: "https://github.com/ThePrimeagen/vim-with-me.git" },
    { url: "https://github.com/ThePrimeagen/vim-arcade.git" },
    { url: "https://github.com/ThePrimeagen/caleb.git" },
    { url: "https://github.com/nvim-lua/plenary.nvim.git" },
  ];

  for (const repo of repos) {
    const name = extractRepoName(repo.url);
    const dest = join(personalDir, name);

    // gitCloneOrPull handles branch checkout on both clone and pull
    await gitCloneOrPull(ctx, repo.url, dest, { branch: repo.branch });
  }

  await runOrFail(ctx, ["sudo", "luarocks", "install", "luacheck"]);
}

export async function verify(ctx: TaskContext): Promise<void> {
  await v.assertCommand("nvim", "--version");
  await v.assertDir(join(ctx.home, "personal", "harpoon"));
}
