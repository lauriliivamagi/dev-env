# How to Add a Git Repository

Clone repositories to managed locations for building from source or keeping local copies.

## Quick Pattern

```typescript
import { type TaskContext } from "../lib/mod.ts";
import { gitClone } from "../lib/shell.ts";

export async function run(ctx: TaskContext): Promise<void> {
  await gitClone(
    ctx,
    "https://github.com/user/repo",
    `${ctx.home}/repos/repo`,
  );
}
```

## Step-by-Step

### 1. Choose a Location

Common patterns:
- `${ctx.home}/repos/` — General repositories
- `${ctx.home}/personal/` — Personal projects
- `${ctx.home}/.local/src/` — Source for local builds

### 2. Create the Task

```typescript
// src/tasks/myrepo.ts
import { type TaskContext } from "../lib/mod.ts";
import { gitClone } from "../lib/shell.ts";
import { mkdir } from "../lib/fs.ts";

export async function run(ctx: TaskContext): Promise<void> {
  const reposDir = `${ctx.home}/repos`;
  await mkdir(ctx, reposDir);

  await gitClone(
    ctx,
    "https://github.com/neovim/neovim",
    `${reposDir}/neovim`,
  );
}
```

### 3. Test with Dry Run

```bash
deno task run myrepo --dry
# Output: [DRY] would run: git clone https://github.com/neovim/neovim /home/user/repos/neovim
```

## Clone Specific Branch

```typescript
await gitClone(
  ctx,
  "https://github.com/neovim/neovim",
  `${ctx.home}/repos/neovim`,
  { branch: "stable" },
);
// Runs: git clone -b stable https://github.com/neovim/neovim /home/user/repos/neovim
```

## Build from Source

Common pattern: clone, build, install:

```typescript
import { type TaskContext, fs, verify as v } from "../lib/mod.ts";
import { gitClone, runOrFail } from "../lib/shell.ts";

export async function run(ctx: TaskContext): Promise<void> {
  const repoDir = `${ctx.home}/repos/neovim`;

  await gitClone(
    ctx,
    "https://github.com/neovim/neovim",
    repoDir,
    { branch: "stable" },
  );

  await runOrFail(
    ctx,
    ["make", "CMAKE_BUILD_TYPE=Release"],
    { cwd: repoDir },
  );

  await runOrFail(
    ctx,
    ["sudo", "make", "install"],
    { cwd: repoDir },
  );
}

export async function verify(ctx: TaskContext): Promise<void> {
  await v.assertCommand("nvim", "--version");
}
```

## Update Existing Clone

For repositories that already exist, fetch and checkout:

```typescript
import { exists } from "@std/fs";
import { gitClone, gitFetch, gitCheckout } from "../lib/shell.ts";

export async function run(ctx: TaskContext): Promise<void> {
  const repoDir = `${ctx.home}/repos/neovim`;

  if (await exists(repoDir)) {
    // Update existing
    await gitFetch(ctx, repoDir);
    await gitCheckout(ctx, "stable", repoDir);
  } else {
    // Fresh clone
    await gitClone(
      ctx,
      "https://github.com/neovim/neovim",
      repoDir,
      { branch: "stable" },
    );
  }
}
```

## Multiple Repositories

```typescript
const REPOS = [
  { url: "https://github.com/neovim/neovim", name: "neovim" },
  { url: "https://github.com/tmux/tmux", name: "tmux" },
  { url: "https://github.com/alacritty/alacritty", name: "alacritty" },
];

export async function run(ctx: TaskContext): Promise<void> {
  const reposDir = `${ctx.home}/repos`;
  await fs.mkdir(ctx, reposDir);

  for (const { url, name } of REPOS) {
    await gitClone(ctx, url, `${reposDir}/${name}`);
  }
}
```

## Clone to Specific Version/Tag

```typescript
export async function run(ctx: TaskContext): Promise<void> {
  const repoDir = `${ctx.home}/repos/neovim`;

  // Clone default branch first
  await gitClone(ctx, "https://github.com/neovim/neovim", repoDir);

  // Then checkout specific tag
  await gitCheckout(ctx, "v0.9.5", repoDir);
}
```

## Private Repositories

For private repos, ensure SSH is configured:

```typescript
await gitClone(
  ctx,
  "git@github.com:username/private-repo.git",
  `${ctx.home}/repos/private-repo`,
);
```

SSH keys must be set up separately (not automated in this tool).

## Complete Example: neovim.ts

```typescript
// src/tasks/neovim.ts
import { type TaskContext, fs, verify as v } from "../lib/mod.ts";
import { apt, gitClone, runOrFail } from "../lib/shell.ts";
import { exists } from "@std/fs";

export async function run(ctx: TaskContext): Promise<void> {
  // Build dependencies
  await apt(ctx, [
    "ninja-build",
    "gettext",
    "cmake",
    "unzip",
    "curl",
    "build-essential",
  ]);

  const repoDir = `${ctx.home}/repos/neovim`;

  // Clone or update
  if (await exists(repoDir)) {
    await runOrFail(ctx, ["git", "fetch", "--tags"], { cwd: repoDir });
    await runOrFail(ctx, ["git", "checkout", "stable"], { cwd: repoDir });
    await runOrFail(ctx, ["git", "pull"], { cwd: repoDir });
  } else {
    await fs.mkdir(ctx, `${ctx.home}/repos`);
    await gitClone(
      ctx,
      "https://github.com/neovim/neovim",
      repoDir,
      { branch: "stable" },
    );
  }

  // Build
  await runOrFail(
    ctx,
    ["make", "CMAKE_BUILD_TYPE=Release"],
    { cwd: repoDir },
  );

  // Install
  await runOrFail(
    ctx,
    ["sudo", "make", "install"],
    { cwd: repoDir },
  );
}

export async function verify(ctx: TaskContext): Promise<void> {
  await v.assertCommand("nvim", "--version");
  await v.assertDir(`${ctx.home}/repos/neovim`);
}
```

## Troubleshooting

### Clone Fails - Already Exists

`gitClone` fails if the directory exists. Check first:

```typescript
if (!(await exists(repoDir))) {
  await gitClone(ctx, url, repoDir);
}
```

### Authentication Failed

For HTTPS with private repos, configure git credential helper or use SSH.

### Submodules

If the repo has submodules:

```typescript
await gitClone(ctx, url, repoDir);
await runOrFail(ctx, ["git", "submodule", "update", "--init", "--recursive"], {
  cwd: repoDir,
});
```
