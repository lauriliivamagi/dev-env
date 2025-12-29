# Verification Utilities

Reference for verification functions in `src/lib/verify.ts`.

## Purpose

Verification utilities confirm that task installations succeeded. They run after `run()` completes and throw if expectations aren't met.

## Functions

### assertCommand()

Assert that a command exists and runs successfully.

```typescript
async function assertCommand(cmd: string, ...args: string[]): Promise<void>
```

**Behavior:**
1. Attempts to run the command with given arguments
2. Checks that exit code is 0
3. Throws if command not found or returns non-zero

**Example:**
```typescript
await assertCommand("rustc", "--version");
// Runs: rustc --version
// Throws if rustc not in PATH or exits non-zero

await assertCommand("nvim", "--headless", "+q");
// Runs: nvim --headless +q
```

**Error messages:**
```
Command 'rustc' not found
Command 'rustc' exited with code 1
```

### assertDir()

Assert that a directory exists.

```typescript
async function assertDir(path: string): Promise<void>
```

**Example:**
```typescript
await assertDir(`${ctx.home}/.cargo`);
await assertDir(`${ctx.configHome}/nvim`);
```

**Error messages:**
```
Directory '/home/user/.cargo' does not exist
'/home/user/.cargo' exists but is not a directory
```

### assertFile()

Assert that a file exists.

```typescript
async function assertFile(path: string): Promise<void>
```

**Example:**
```typescript
await assertFile(`${ctx.home}/.zshrc`);
await assertFile(`${ctx.configHome}/nvim/init.lua`);
```

**Error messages:**
```
File '/home/user/.zshrc' does not exist
'/home/user/.zshrc' exists but is not a file
```

### assertInGroup()

Assert that the current user is a member of a group.

```typescript
async function assertInGroup(group: string): Promise<void>
```

**Example:**
```typescript
await assertInGroup("docker");
await assertInGroup("video");
```

**Note:** Group membership often requires logout/login to take effect. This assertion may fail immediately after adding a user to a group.

**Error messages:**
```
User is not a member of group 'docker'
```

## Usage in Tasks

Import verification utilities and use in `verify()` function:

```typescript
import { type TaskContext, verify as v } from "../lib/mod.ts";

export async function run(ctx: TaskContext): Promise<void> {
  // ... installation code
}

export async function verify(ctx: TaskContext): Promise<void> {
  await v.assertCommand("rustc", "--version");
  await v.assertDir(`${ctx.home}/.cargo`);
  await v.assertFile(`${ctx.home}/.cargo/bin/cargo`);
}
```

## Complete Example

```typescript
// src/tasks/docker.ts
import { type TaskContext, verify as v } from "../lib/mod.ts";
import { apt, curlPipe, runOrFail } from "../lib/shell.ts";

export async function run(ctx: TaskContext): Promise<void> {
  // Install Docker
  await curlPipe(ctx, "https://get.docker.com");

  // Add user to docker group
  await runOrFail(ctx, ["sudo", "usermod", "-aG", "docker", Deno.env.get("USER")!]);
}

export async function verify(ctx: TaskContext): Promise<void> {
  await v.assertCommand("docker", "--version");
  await v.assertCommand("docker", "compose", "version");
  // Note: assertInGroup("docker") may fail until re-login
}
```

## Verification Timing

Verification runs:
- After `run()` succeeds
- Only when not in dry run mode
- Before logging success

```typescript
// From src/commands/run.ts
await task.run(ctx);

if (!ctx.dryRun && task.verify) {
  log.info(`Verifying: ${task.name}`);
  await task.verify(ctx);
}

log.success(`Completed: ${task.name}`);
```

## Common Patterns

### Verify Multiple Commands

```typescript
export async function verify(ctx: TaskContext): Promise<void> {
  const tools = ["rustc", "cargo", "rustup", "rustfmt", "clippy"];

  for (const tool of tools) {
    await v.assertCommand(tool, "--version");
  }
}
```

### Verify Directory Structure

```typescript
export async function verify(ctx: TaskContext): Promise<void> {
  await v.assertDir(`${ctx.configHome}/nvim`);
  await v.assertDir(`${ctx.configHome}/nvim/lua`);
  await v.assertFile(`${ctx.configHome}/nvim/init.lua`);
}
```

### Verify Installation Locations

```typescript
export async function verify(ctx: TaskContext): Promise<void> {
  // Verify rustup-managed installation
  await v.assertDir(`${ctx.home}/.rustup`);
  await v.assertDir(`${ctx.home}/.cargo`);
  await v.assertFile(`${ctx.home}/.cargo/bin/rustc`);
  await v.assertFile(`${ctx.home}/.cargo/bin/cargo`);
}
```

## assertCommand vs assertFile

Use `assertCommand` when:
- The tool is installed system-wide (e.g., via apt)
- The tool is in the default PATH after installation
- You want to verify the tool actually runs

Use `assertFile` when:
- The tool is installed to a user directory (e.g., `~/.local/bin`, `~/.cargo/bin`, `~/.deno/bin`)
- The PATH may not include the installation directory in the current shell session
- You're verifying that a binary was downloaded/built correctly

**Example:**
```typescript
export async function verify(ctx: TaskContext): Promise<void> {
  // apt-installed tools - use assertCommand
  await v.assertCommand("node", "--version");
  await v.assertCommand("zsh", "--version");

  // User-directory installations - use assertFile
  await v.assertFile(`${ctx.home}/.deno/bin/deno`);
  await v.assertFile(`${ctx.home}/.bun/bin/bun`);
  await v.assertFile(`${ctx.home}/.local/bin/gitleaks`);
  await v.assertFile(`${ctx.home}/.cargo/bin/rustc`);
}
```

**Note:** User-directory binaries may not be in PATH immediately after installation. Using `assertFile` avoids false failures in Docker or fresh shell sessions.

## Input Validation

All functions validate their inputs:

```typescript
await assertDir("");
// Throws: Assertion failed: path cannot be empty

await assertCommand("");
// Proceeds to run empty command, which fails
```

## Stdout/Stderr Handling

`assertCommand` suppresses output:

```typescript
const command = new Deno.Command(cmd, {
  args,
  stdout: "null",
  stderr: "null",
});
```

The command runs silently—only the exit code matters.
