# Dry Run Design

Dry run mode lets you preview what would happen without making changes. This design document explains how it works throughout the system.

## The Principle

Every operation that modifies state must check `ctx.dryRun` and log what it would do instead of doing it.

```typescript
if (ctx.dryRun) {
  log.dryRun(`would do X`);
  return;
}
// Actually do X
```

This pattern appears in every shell command, file operation, and sync function.

## Enabling Dry Run

```bash
# With --dry or -d flag
deno task run --dry
deno task run -d
deno task sync --dry
```

The flag propagates through the entire execution:

```typescript
// src/cli.ts
const ctx = getContext({ dryRun: args.dry });

if (args.dry) {
  log.info("Dry run mode enabled");
}
```

## Context Propagation

`TaskContext` carries the dry run flag:

```typescript
export interface TaskContext {
  dryRun: boolean;
  devEnv: string;
  home: string;
  configHome: string;
}
```

Every function receives `ctx` as its first parameter, ensuring dry run awareness:

```typescript
export async function apt(ctx: TaskContext, packages: string[]): Promise<void> {
  // ctx.dryRun is available
}
```

## Implementation in Shell Utilities

### run()

```typescript
export async function run(
  ctx: TaskContext,
  cmd: string[],
  opts: RunOptions = {},
): Promise<{ code: number; stdout?: string; stderr?: string }> {
  log.cmd(cmd);

  if (ctx.dryRun) {
    log.dryRun(cmd.join(" "));
    return { code: 0 };
  }

  // Actually execute the command
  const command = new Deno.Command(executable, { ... });
  const result = await command.output();
  return { code: result.code, ... };
}
```

Key design choice: dry run returns `{ code: 0 }` to simulate success.

### curlPipe()

```typescript
export async function curlPipe(
  ctx: TaskContext,
  url: string,
  shell: string = "sh",
): Promise<void> {
  log.cmd(["curl", "-fsSL", url, "|", shell]);

  if (ctx.dryRun) {
    log.dryRun(`curl -fsSL ${url} | ${shell}`);
    return;
  }

  // Actually fetch and pipe
}
```

## Implementation in File Utilities

### copyFile()

```typescript
export async function copyFile(
  ctx: TaskContext,
  src: string,
  dest: string,
): Promise<void> {
  assertSafePath(src, "copyFile source");
  assertSafePath(dest, "copyFile destination");

  log.info(`Copy ${src} -> ${dest}`);

  if (ctx.dryRun) {
    log.dryRun(`cp ${src} -> ${dest}`);
    return;
  }

  await ensureDir(dirname(dest));
  await Deno.copyFile(src, dest);
}
```

### remove()

```typescript
export async function remove(
  ctx: TaskContext,
  path: string,
): Promise<void> {
  assertSafePath(path, "remove");

  log.info(`Remove ${path}`);

  if (ctx.dryRun) {
    log.dryRun(`rm -rf ${path}`);
    return;
  }

  if (await exists(path)) {
    await Deno.remove(path, { recursive: true });
  }
}
```

## Verification Behavior

Verification skips during dry run:

```typescript
if (!ctx.dryRun && task.verify) {
  log.info(`Verifying: ${task.name}`);
  await task.verify(ctx);
}
```

This makes sense: if nothing was installed, verification would fail.

## What Dry Run Shows

A typical dry run output:

```
[INFO] Dry run mode enabled
[INFO] Found 3 task(s) to run
[TASK] libs
[CMD] sudo apt update
[DRY] would run: sudo apt update
[CMD] sudo apt install -y build-essential curl git
[DRY] would run: sudo apt install -y build-essential curl git
[SUCCESS] Completed: libs
[TASK] rust
[CMD] curl -fsSL https://sh.rustup.rs | sh
[DRY] would run: curl -fsSL https://sh.rustup.rs | sh
[CMD] cargo install stylua
[DRY] would run: cargo install stylua
[SUCCESS] Completed: rust
```

## Use Cases

### Preview Before Running

See exactly what will happen before committing:

```bash
deno task run --dry
# Review output
deno task run  # If satisfied
```

### Debugging Tasks

When a task fails, dry run shows the command sequence without side effects:

```bash
deno task run mytask --dry
# See what commands would run
```

### Documentation

Dry run output serves as documentation of what each task does.

## Limitations

### Can't Simulate Conditionals

If a task checks whether something exists before acting:

```typescript
if (await exists(path)) {
  await remove(ctx, path);
}
```

Dry run can't know if the path exists in the future state. It shows the current state.

### No Rollback Preview

Dry run shows what would happen going forward. It doesn't show how to undo.

### External Commands

Some external tools don't support dry run:

```bash
# apt has -s for simulation
apt install -s package

# But not all tools do
```

The dry run implementation prevents the command from running, but can't show what the command itself would do internally.
