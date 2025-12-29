# How to Add Verification

Add verification to tasks to confirm installations succeeded.

## Quick Pattern

```typescript
import { type TaskContext, verify as v } from "../lib/mod.ts";

export async function verify(ctx: TaskContext): Promise<void> {
  await v.assertCommand("mytool", "--version");
}
```

## Why Verify?

Installation can fail silently:
- Download succeeds but binary is corrupted
- Package installs but command isn't in PATH
- Build completes but files land in wrong location

Verification catches these issues immediately.

## Available Assertions

### assertCommand()

Verify a command exists and runs successfully:

```typescript
await v.assertCommand("rustc", "--version");
// Runs: rustc --version
// Throws if: command not found OR exit code != 0
```

With multiple arguments:

```typescript
await v.assertCommand("nvim", "--headless", "+q");
await v.assertCommand("docker", "compose", "version");
```

### assertDir()

Verify a directory exists:

```typescript
await v.assertDir(`${ctx.home}/.cargo`);
await v.assertDir(`${ctx.configHome}/nvim`);
```

### assertFile()

Verify a file exists:

```typescript
await v.assertFile(`${ctx.home}/.zshrc`);
await v.assertFile(`${ctx.configHome}/nvim/init.lua`);
```

### assertInGroup()

Verify user is in a group:

```typescript
await v.assertInGroup("docker");
```

Note: Group membership often requires logout/login to take effect.

## Step-by-Step

### 1. Identify What to Verify

After your task runs, what should exist?

| Task installs | Verify |
|---------------|--------|
| CLI tool | `assertCommand("tool", "--version")` |
| Directory | `assertDir(path)` |
| Config file | `assertFile(path)` |
| Group membership | `assertInGroup("group")` |

### 2. Add verify Export

```typescript
// src/tasks/mytool.ts
import { type TaskContext, verify as v } from "../lib/mod.ts";
import { apt } from "../lib/shell.ts";

export async function run(ctx: TaskContext): Promise<void> {
  await apt(ctx, ["mytool"]);
}

// Add this function
export async function verify(ctx: TaskContext): Promise<void> {
  await v.assertCommand("mytool", "--version");
}
```

### 3. Test

```bash
# Dry run shows verification would be skipped
deno task run mytool --dry

# Real run executes verification
deno task run mytool
```

## Complete Examples

### Rust Toolchain

```typescript
export async function verify(ctx: TaskContext): Promise<void> {
  // Installation directories
  await v.assertDir(`${ctx.home}/.cargo`);
  await v.assertDir(`${ctx.home}/.rustup`);

  // Core commands
  await v.assertCommand("rustc", "--version");
  await v.assertCommand("cargo", "--version");
  await v.assertCommand("rustup", "--version");
}
```

### Docker

```typescript
export async function verify(ctx: TaskContext): Promise<void> {
  await v.assertCommand("docker", "--version");
  await v.assertCommand("docker", "compose", "version");
  // Note: assertInGroup("docker") may fail until re-login
}
```

### Neovim with Config

```typescript
export async function verify(ctx: TaskContext): Promise<void> {
  // Binary works
  await v.assertCommand("nvim", "--version");

  // Config exists
  await v.assertDir(`${ctx.configHome}/nvim`);
  await v.assertFile(`${ctx.configHome}/nvim/init.lua`);
}
```

### Node.js

```typescript
export async function verify(ctx: TaskContext): Promise<void> {
  await v.assertCommand("node", "--version");
  await v.assertCommand("npm", "--version");
  await v.assertCommand("npx", "--version");
}
```

## Patterns

### Multiple Commands

```typescript
const commands = ["rg", "fd", "bat", "eza"];

export async function verify(ctx: TaskContext): Promise<void> {
  for (const cmd of commands) {
    await v.assertCommand(cmd, "--version");
  }
}
```

### Conditional Verification

```typescript
import { exists } from "@std/fs";

export async function verify(ctx: TaskContext): Promise<void> {
  // Always verify core command
  await v.assertCommand("mytool", "--version");

  // Optionally verify plugin if config requests it
  const pluginConfig = `${ctx.configHome}/mytool/plugins.json`;
  if (await exists(pluginConfig)) {
    await v.assertCommand("mytool-plugin", "--version");
  }
}
```

### Using TaskContext

```typescript
export async function verify(ctx: TaskContext): Promise<void> {
  // Use ctx for paths
  await v.assertDir(`${ctx.home}/.local/bin`);
  await v.assertFile(`${ctx.configHome}/mytool/config.toml`);
  await v.assertDir(`${ctx.devEnv}/env/.config/mytool`);
}
```

## Common Gotchas

### Package Name vs Command Name

| Package | Command |
|---------|---------|
| `ripgrep` | `rg` |
| `fd-find` | `fd` |
| `neovim` | `nvim` |

Always verify the actual command, not the package name.

### Commands Requiring Subcommand

Some tools need a subcommand to exit 0:

```typescript
// This might fail (no subcommand)
await v.assertCommand("docker");

// This works
await v.assertCommand("docker", "--version");
await v.assertCommand("docker", "info");
```

### PATH Issues

If the command isn't in PATH yet:

```typescript
// Verify the binary directly
await v.assertFile(`${ctx.home}/.cargo/bin/cargo`);

// Or run with full path
await v.assertCommand(`${ctx.home}/.cargo/bin/cargo`, "--version");
```

### Group Membership Delay

```typescript
// This may fail immediately after adding to group
await v.assertInGroup("docker");

// Consider skipping or warning instead
try {
  await v.assertInGroup("docker");
} catch {
  log.warn("Re-login required for docker group membership");
}
```

## When Verification Runs

```typescript
// From src/commands/run.ts
await task.run(ctx);

if (!ctx.dryRun && task.verify) {
  log.info(`Verifying: ${task.name}`);
  await task.verify(ctx);
}

log.success(`Completed: ${task.name}`);
```

- Runs after `run()` succeeds
- Skipped in dry run mode
- Task fails if verification throws
