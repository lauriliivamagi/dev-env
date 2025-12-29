# Verification Philosophy

Tasks can export an optional `verify()` function that runs after successful execution. This document explains why verification matters and how to use it effectively.

## The Problem: Silent Failures

Installation scripts often fail silently or partially:

- A download completes but the binary is corrupted
- A package installs but doesn't add itself to PATH
- A build succeeds but leaves files in the wrong location
- An install runs but requires a shell restart to work

Without verification, you discover these failures later—often at the worst time.

## The Solution: Explicit Verification

After a task's `run()` succeeds, the optional `verify()` function confirms the expected result:

```typescript
export async function verify(ctx: TaskContext): Promise<void> {
  await v.assertDir(`${ctx.home}/.cargo`);
  await v.assertDir(`${ctx.home}/.rustup`);
  await v.assertCommand("rustc", "--version");
  await v.assertCommand("cargo", "--version");
}
```

If any assertion fails, the task fails—even though `run()` succeeded.

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

Verification runs:
- After `run()` completes successfully
- Only when not in dry run mode
- Only if the task exports a `verify` function

## Verification Utilities

### assertCommand()

Confirms a command exists and runs successfully:

```typescript
await assertCommand("rustc", "--version");
```

This:
1. Checks that `rustc` is in PATH
2. Runs `rustc --version`
3. Verifies exit code is 0

### assertDir()

Confirms a directory exists:

```typescript
await assertDir(`${ctx.home}/.cargo`);
```

### assertFile()

Confirms a file exists:

```typescript
await assertFile(`${ctx.home}/.config/nvim/init.lua`);
```

### assertInGroup()

Confirms the user belongs to a group:

```typescript
await assertInGroup("docker");
```

Useful after tasks that add users to groups (which often require re-login).

## Real-World Example: Rust Task

```typescript
// src/tasks/rust.ts
export async function run(ctx: TaskContext): Promise<void> {
  await curlPipe(ctx, "https://sh.rustup.rs", "sh");
  await cargoInstall(ctx, "stylua");
}

export async function verify(ctx: TaskContext): Promise<void> {
  await v.assertDir(`${ctx.home}/.cargo`);
  await v.assertDir(`${ctx.home}/.rustup`);
  await v.assertCommand("rustc", "--version");
  await v.assertCommand("cargo", "--version");
}
```

The verification confirms:
1. Cargo and Rustup directories were created
2. `rustc` and `cargo` commands work

Note: `stylua` isn't verified. You might add `assertCommand("stylua", "--version")` if it's critical.

## What to Verify

### Always Verify

- **Commands that should be in PATH** — The main deliverable of most tasks
- **Directories that should exist** — Config dirs, install locations
- **Critical files** — Configs that the tool needs to function

### Consider Verifying

- **Group membership** — May require re-login to take effect
- **Symlinks** — Can be broken without error
- **Permissions** — Execute bits, ownership

### Skip Verification For

- **Transient state** — Running processes, temporary files
- **Optional components** — Nice-to-have features
- **Things checked elsewhere** — If task B depends on task A, B's run verifies A implicitly

## Verification vs. Idempotency

Verification tells you if the current state is correct. It doesn't guarantee the task can be re-run safely.

For idempotency, tasks should:
- Check before creating (use `exists()` before `mkdir()`)
- Use `-y` flags for non-interactive installs
- Handle "already installed" gracefully

Verification confirms the end state regardless of how many times the task ran.

## Testing with Verification

The verification functions work in integration tests:

```typescript
// In a test file
Deno.test("rust installs correctly", async () => {
  const ctx = getTestContext();
  await rustTask.run(ctx);
  await rustTask.verify(ctx);  // Throws if verification fails
});
```

This gives confidence that the task works in clean environments (Docker containers).

## Failure Behavior

When verification fails:

```
[TASK] rust
[CMD] curl -fsSL https://sh.rustup.rs | sh
[CMD] cargo install stylua
[INFO] Verifying: rust
[ERROR] Failed: rust - Command 'rustc' not found
```

The task is marked as failed. Subsequent tasks don't run. The error message indicates exactly what's missing.
