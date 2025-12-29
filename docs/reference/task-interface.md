# Task Interface

Reference for the Task interface and TaskContext.

## Task Interface

```typescript
// From src/commands/run.ts
export interface Task {
  name: string;
  run: (ctx: TaskContext) => Promise<void>;
  verify?: (ctx: TaskContext) => Promise<void>;
  dependsOn: string[];
}
```

### Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `name` | `string` | Yes | Task name (derived from filename) |
| `run` | `(ctx: TaskContext) => Promise<void>` | Yes | Main execution function |
| `verify` | `(ctx: TaskContext) => Promise<void>` | No | Post-execution verification |
| `dependsOn` | `string[]` | No | Tasks that must run before this one |

## TaskContext

```typescript
// From src/lib/config.ts
export interface TaskContext {
  dryRun: boolean;
  devEnv: string;
  home: string;
  configHome: string;
  stack: string;
  stackRoot: string;
}
```

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `dryRun` | `boolean` | If true, operations should log but not execute |
| `devEnv` | `string` | Absolute path to dev-env repository |
| `home` | `string` | User's home directory (`$HOME`) |
| `configHome` | `string` | XDG config directory (`$XDG_CONFIG_HOME` or `~/.config`) |
| `stack` | `string` | Active stack name (e.g., "primeagen", "larr") |
| `stackRoot` | `string` | Absolute path to active stack directory |

### Getting Context

```typescript
import { getContext } from "./lib/mod.ts";

const ctx = getContext({ dryRun: false, stack: "primeagen" });
// ctx.home = "/home/username"
// ctx.devEnv = "/path/to/dev-env"
// ctx.configHome = "/home/username/.config"
// ctx.stack = "primeagen"
// ctx.stackRoot = "/path/to/dev-env/stacks/primeagen"
```

## Task File Structure

A task file in `stacks/<stack>/tasks/` must export a `run` function:

```typescript
// stacks/primeagen/tasks/example.ts
import { type TaskContext } from "../../../src/lib/mod.ts";

export async function run(ctx: TaskContext): Promise<void> {
  // Task implementation
}
```

### With Verification

```typescript
// stacks/primeagen/tasks/example.ts
import { type TaskContext, verify as v } from "../../../src/lib/mod.ts";

export async function run(ctx: TaskContext): Promise<void> {
  // Task implementation
}

export async function verify(ctx: TaskContext): Promise<void> {
  await v.assertCommand("example", "--version");
}
```

### With Dependencies

Declare dependencies using the `dependsOn` export:

```typescript
// stacks/primeagen/tasks/secrets.ts
import { type TaskContext } from "../../../src/lib/mod.ts";

// Declare that this task depends on the sops task
export const dependsOn = ["sops"];

export async function run(ctx: TaskContext): Promise<void> {
  // This task uses sops command, which is installed by the sops task
  // The sops task will automatically run first
}
```

**Dependency Resolution:**

- Tasks are sorted using topological sort (Kahn's algorithm)
- Tasks without dependencies maintain alphabetical order among themselves
- Circular dependencies are detected and cause an error
- Unknown dependencies (referencing non-existent tasks) cause an error

**Smart Auto-Run:**

When running a specific task, its dependencies are automatically included:

```bash
# Running just 'secrets' will automatically run 'sops' first
deno task run -s primeagen secrets
# Output:
# === sops ===
# Installing age...
# Installing sops...
# === secrets ===
# Decrypting SSH keys...
```

## Complete Example

```typescript
// stacks/primeagen/tasks/rust.ts
import { type TaskContext, verify as v } from "../../../src/lib/mod.ts";
import { cargoInstall, curlPipe } from "../../../src/lib/shell.ts";

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

## Using TaskContext

### Check Dry Run

```typescript
export async function run(ctx: TaskContext): Promise<void> {
  if (ctx.dryRun) {
    console.log("Would install packages");
    return;
  }
  // Actually install
}
```

Note: Built-in utilities like `apt()` and `runOrFail()` handle dry run automatically.

### Build Paths

```typescript
export async function run(ctx: TaskContext): Promise<void> {
  const configDir = `${ctx.configHome}/mytool`;
  const binDir = `${ctx.home}/.local/bin`;
  const srcDir = `${ctx.stackRoot}/env/.config/mytool`;

  await fs.copyDir(ctx, srcDir, configDir);
}
```

### Expand Paths

```typescript
import { expandPath } from "../../../src/lib/config.ts";

const path = expandPath("~/.config/nvim", ctx);
// Returns: "/home/username/.config/nvim"

const path2 = expandPath("$DEV_ENV/env", ctx);
// Returns: "/path/to/dev-env/env"

const path3 = expandPath("$STACK_ROOT/secrets", ctx);
// Returns: "/path/to/dev-env/stacks/primeagen/secrets"
```

## Task Discovery

Tasks are discovered by scanning `stacks/<stack>/tasks/`:

1. File must end with `.ts` (not `.test.ts`)
2. File must export `run` function
3. Task name = filename without `.ts` extension

```typescript
// From src/commands/run.ts
export async function discoverTasks(
  tasksDir: string,
): Promise<Task[]> {
  // ...
  for await (const entry of Deno.readDir(tasksDir)) {
    if (!entry.isFile || !entry.name.endsWith(".ts")) {
      continue;
    }

    const taskName = entry.name.replace(".ts", "");
    const mod = await import(`file://${modulePath}`);

    if (typeof mod.run !== "function") {
      log.warn(`Task ${taskName} has no run() export, skipping`);
      continue;
    }

    tasks.push({
      name: taskName,
      run: mod.run,
      verify: typeof mod.verify === "function" ? mod.verify : undefined,
      dependsOn: Array.isArray(mod.dependsOn) ? mod.dependsOn : [],
    });
  }
  // ...
}
```

## Execution Flow

1. `discoverTasks()` finds all tasks and loads their `dependsOn` exports
2. If a filter is specified, find matching tasks and their transitive dependencies
3. Tasks are sorted using topological sort (respects dependencies)
4. Tasks without dependencies maintain alphabetical order among themselves
5. For each task in order:
   - Log task name
   - Call `task.run(ctx)`
   - If not dry run and verify exists, call `task.verify(ctx)`
   - Log success
6. If any step throws, stop execution

```typescript
// Resolve dependencies and get execution order
const tasksToRun = resolveDependencies(taskNodes);

for (const name of tasksToRun) {
  const task = taskMap.get(name)!;
  log.task(task.name);
  try {
    await task.run(ctx);

    if (!ctx.dryRun && task.verify) {
      log.info(`Verifying: ${task.name}`);
      await task.verify(ctx);
    }

    log.success(`Completed: ${task.name}`);
  } catch (err) {
    log.error(`Failed: ${task.name} - ${err}`);
    throw err;
  }
}
```
