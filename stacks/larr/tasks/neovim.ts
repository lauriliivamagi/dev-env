import { join } from "@std/path";
import {
  type TaskContext,
  assert,
  fs,
  verify as v,
} from "../../../src/lib/mod.ts";
import {
  apt,
  gitCheckout,
  gitClone,
  gitFetch,
  runOrFail,
} from "../../../src/lib/shell.ts";

function extractRepoName(url: string): string {
  const parts = url.split("/");
  const lastPart = parts[parts.length - 1];
  assert(lastPart !== undefined, `invalid git URL: ${url}`);
  return lastPart.replace(".git", "");
}

export async function run(ctx: TaskContext): Promise<void> {
  await apt(ctx, ["neovim", "lua5.1", "luarocks"]);

  const personalDir = join(ctx.home, "git");
  await fs.mkdir(ctx, personalDir);

  const repos = [
    { url: "https://github.com/lauriliivamagi/task.git", branch: "master" },
  ];

  for (const repo of repos) {
    const name = extractRepoName(repo.url);
    const dest = join(personalDir, name);

    await fs.remove(ctx, dest);
    await gitClone(ctx, repo.url, dest);

    if (repo.branch) {
      await gitFetch(ctx, dest);
      await gitCheckout(ctx, repo.branch, dest);
    }
  }

  await runOrFail(ctx, ["sudo", "luarocks", "install", "luacheck"]);
}

export async function verify(ctx: TaskContext): Promise<void> {
  await v.assertCommand("nvim", "--version");
  await v.assertDir(join(ctx.home, "git", "task"));
}
