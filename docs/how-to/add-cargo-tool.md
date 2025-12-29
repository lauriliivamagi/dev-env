# How to Add a Cargo Tool

Install Rust-based CLI tools via cargo.

## Prerequisites

The Rust task (`src/tasks/rust.ts`) must run first to install the Rust toolchain. Since tasks run alphabetically, most tasks run after `rust`.

## Quick Pattern

```typescript
import { type TaskContext } from "../lib/mod.ts";
import { cargoInstall } from "../lib/shell.ts";

export async function run(ctx: TaskContext): Promise<void> {
  await cargoInstall(ctx, "tool-name");
}
```

## Step-by-Step

### 1. Find the Package Name

Search crates.io or use the tool's documentation:

```bash
# The cargo install command in docs tells you the package name
cargo install ripgrep  # package name is "ripgrep"
cargo install bat      # package name is "bat"
```

### 2. Create or Edit Task

```bash
# New task for a single tool
touch src/tasks/mytool.ts

# Or add to existing task (like rust.ts or a tools task)
```

### 3. Add cargoInstall()

```typescript
import { type TaskContext } from "../lib/mod.ts";
import { cargoInstall } from "../lib/shell.ts";

export async function run(ctx: TaskContext): Promise<void> {
  await cargoInstall(ctx, "ripgrep");
}
```

### 4. Test with Dry Run

```bash
deno task run mytool --dry
# Output: [DRY] would run: cargo install ripgrep
```

## With Features

Some crates have optional features:

```typescript
await cargoInstall(ctx, "bat", { features: ["git", "regex"] });
// Runs: cargo install bat --features git,regex
```

## Multiple Tools

Install several tools in sequence:

```typescript
export async function run(ctx: TaskContext): Promise<void> {
  await cargoInstall(ctx, "ripgrep");
  await cargoInstall(ctx, "fd-find");
  await cargoInstall(ctx, "bat");
  await cargoInstall(ctx, "eza");
  await cargoInstall(ctx, "stylua");
}
```

## With Verification

```typescript
import { type TaskContext, verify as v } from "../lib/mod.ts";
import { cargoInstall } from "../lib/shell.ts";

export async function run(ctx: TaskContext): Promise<void> {
  await cargoInstall(ctx, "stylua");
}

export async function verify(ctx: TaskContext): Promise<void> {
  await v.assertCommand("stylua", "--version");
}
```

## Complete Example: rust.ts

```typescript
// src/tasks/rust.ts
import { type TaskContext, verify as v } from "../lib/mod.ts";
import { cargoInstall, curlPipe } from "../lib/shell.ts";

export async function run(ctx: TaskContext): Promise<void> {
  // Install Rust via rustup
  await curlPipe(ctx, "https://sh.rustup.rs", "sh");

  // Install Rust-based tools
  await cargoInstall(ctx, "stylua");
}

export async function verify(ctx: TaskContext): Promise<void> {
  await v.assertDir(`${ctx.home}/.cargo`);
  await v.assertDir(`${ctx.home}/.rustup`);
  await v.assertCommand("rustc", "--version");
  await v.assertCommand("cargo", "--version");
}
```

## Common Tools

| Package | Command | Purpose |
|---------|---------|---------|
| `ripgrep` | `rg` | Fast grep |
| `fd-find` | `fd` | Fast find |
| `bat` | `bat` | Better cat |
| `eza` | `eza` | Better ls |
| `stylua` | `stylua` | Lua formatter |
| `tokei` | `tokei` | Code statistics |
| `hyperfine` | `hyperfine` | Benchmarking |
| `just` | `just` | Command runner |
| `zoxide` | `zoxide` | Smart cd |

## Troubleshooting

### PATH Not Set

Cargo installs to `~/.cargo/bin/`. Ensure it's in PATH:

```bash
# In your .zshrc or .bash_profile
export PATH="$HOME/.cargo/bin:$PATH"
```

### Needs Build Dependencies

Some crates need system libraries:

```typescript
import { apt, cargoInstall } from "../lib/shell.ts";

export async function run(ctx: TaskContext): Promise<void> {
  // Install build dependencies first
  await apt(ctx, ["libssl-dev", "pkg-config"]);

  // Then install the crate
  await cargoInstall(ctx, "cargo-audit");
}
```

### Already Installed

`cargo install` is mostly idempotent—it skips if the same version is installed. To force reinstall:

```typescript
// Use runOrFail directly with --force
import { runOrFail } from "../lib/shell.ts";

await runOrFail(ctx, ["cargo", "install", "--force", "tool-name"]);
```

## Organizing Multiple Tools

For many cargo tools, consider a dedicated task:

```typescript
// src/tasks/cli-tools.ts
import { type TaskContext, verify as v } from "../lib/mod.ts";
import { cargoInstall } from "../lib/shell.ts";

const TOOLS = [
  "ripgrep",
  "fd-find",
  "bat",
  "eza",
  "tokei",
  "hyperfine",
];

export async function run(ctx: TaskContext): Promise<void> {
  for (const tool of TOOLS) {
    await cargoInstall(ctx, tool);
  }
}

export async function verify(ctx: TaskContext): Promise<void> {
  await v.assertCommand("rg", "--version");
  await v.assertCommand("fd", "--version");
  await v.assertCommand("bat", "--version");
}
```
