# Your First Task

This tutorial walks you through creating a task from scratch. We'll create a task that installs `htop`, a popular system monitor.

## Prerequisites

- Completed [Getting Started](getting-started.md)
- Basic TypeScript knowledge

## Step 1: Create the Task File

Create a new file in `src/tasks/`:

```bash
touch src/tasks/htop.ts
```

## Step 2: Add the Basic Structure

Open `src/tasks/htop.ts` and add:

```typescript
import { type TaskContext } from "../lib/mod.ts";

export async function run(ctx: TaskContext): Promise<void> {
  // We'll add code here
}
```

This is the minimum structure:
- Import `TaskContext` for the context parameter
- Export an async `run` function

## Step 3: Add the Installation

Import the `apt` helper and use it:

```typescript
import { type TaskContext } from "../lib/mod.ts";
import { apt } from "../lib/shell.ts";

export async function run(ctx: TaskContext): Promise<void> {
  await apt(ctx, ["htop"]);
}
```

The `apt` function:
- Takes the context (for dry run detection)
- Takes an array of package names
- Runs `sudo apt install -y <packages>`

## Step 4: Test with Dry Run

See what the task would do:

```bash
deno task run htop --dry
```

Output:
```
[INFO] Dry run mode enabled
[TASK] htop
[CMD] sudo apt install -y htop
[DRY] would run: sudo apt install -y htop
[SUCCESS] Completed: htop
```

## Step 5: Run for Real

```bash
deno task run htop
```

Output:
```
[TASK] htop
[CMD] sudo apt install -y htop
Reading package lists...
Building dependency tree...
...
[SUCCESS] Completed: htop
```

## Step 6: Verify Manually

```bash
htop --version
# htop 3.x.x
```

Press `q` to exit if you launched htop.

## Step 7: Add Verification

Let's make the task verify itself. Update the file:

```typescript
import { type TaskContext, verify as v } from "../lib/mod.ts";
import { apt } from "../lib/shell.ts";

export async function run(ctx: TaskContext): Promise<void> {
  await apt(ctx, ["htop"]);
}

export async function verify(ctx: TaskContext): Promise<void> {
  await v.assertCommand("htop", "--version");
}
```

Now the task will automatically verify that `htop` is installed and working.

## Step 8: Test the Full Task

Run it again (apt is idempotent, so it's safe):

```bash
deno task run htop
```

Output:
```
[TASK] htop
[CMD] sudo apt install -y htop
htop is already the newest version...
[INFO] Verifying: htop
[SUCCESS] Completed: htop
```

Notice the verification step ran after installation.

## The Complete Task

Here's the final `src/tasks/htop.ts`:

```typescript
import { type TaskContext, verify as v } from "../lib/mod.ts";
import { apt } from "../lib/shell.ts";

export async function run(ctx: TaskContext): Promise<void> {
  await apt(ctx, ["htop"]);
}

export async function verify(ctx: TaskContext): Promise<void> {
  await v.assertCommand("htop", "--version");
}
```

## Going Further: Multiple Packages

Let's expand the task to install related monitoring tools:

```typescript
import { type TaskContext, verify as v } from "../lib/mod.ts";
import { apt } from "../lib/shell.ts";

export async function run(ctx: TaskContext): Promise<void> {
  await apt(ctx, [
    "htop",
    "btop",    // Another TUI monitor
    "iotop",   // I/O monitor
    "iftop",   // Network monitor
  ]);
}

export async function verify(ctx: TaskContext): Promise<void> {
  await v.assertCommand("htop", "--version");
  await v.assertCommand("btop", "--version");
  // iotop and iftop need sudo to run, so just verify files exist
}
```

## Going Further: Add a Cargo Tool

Let's add a Rust-based alternative. Since we need Rust installed first, we declare a dependency:

```typescript
import { type TaskContext, verify as v } from "../lib/mod.ts";
import { apt, cargoInstall } from "../lib/shell.ts";

// Declare that this task requires rust to be installed first
export const dependsOn = ["rust"];

export async function run(ctx: TaskContext): Promise<void> {
  // APT packages
  await apt(ctx, ["htop"]);

  // Rust alternative (rust task runs first due to dependsOn)
  await cargoInstall(ctx, "bottom");  // btm command
}

export async function verify(ctx: TaskContext): Promise<void> {
  await v.assertCommand("htop", "--version");
  await v.assertCommand("btm", "--version");
}
```

Now running `deno task run htop` will automatically run `rust` first if needed.

## Understanding What We Did

1. **Created a file** in `src/tasks/` — this auto-discovers the task
2. **Exported run()** — the main function that does the work
3. **Used apt()** — a helper that handles dry run and sudo
4. **Exported verify()** — optional function to confirm success
5. **Used assertCommand()** — verifies the tool is installed and works

## Key Concepts

### TaskContext

Every function receives `ctx` with:
- `ctx.dryRun` — if true, don't actually do anything
- `ctx.home` — user's home directory
- `ctx.configHome` — XDG config directory (~/.config)
- `ctx.devEnv` — path to this repository

### Dependencies

Export `dependsOn` to declare task dependencies:

```typescript
export const dependsOn = ["rust", "libs"];  // These run first
```

Dependencies are resolved automatically—running a task includes all its dependencies.

### Dry Run

All utilities respect `ctx.dryRun`. When true, they log what they would do instead of doing it.

### Verification

The `verify()` function runs after `run()` succeeds. If verification fails, the task fails—even though installation appeared to work.

## Next Steps

Now you can:
- Add more packages to your task
- Create tasks for other tools you use
- Learn about [config synchronization](customizing-configs.md)
- Read [How-to guides](../how-to/) for specific patterns
