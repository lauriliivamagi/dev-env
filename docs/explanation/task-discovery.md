# Task Discovery

Tasks are automatically discovered from the `src/tasks/` directory. Drop a TypeScript file there, and it becomes runnable.

## How Discovery Works

The `discoverTasks()` function in `src/commands/run.ts`:

1. Reads all files in `src/tasks/`
2. Filters for `.ts` files (excluding `.test.ts`)
3. Dynamically imports each module
4. Looks for a `run` export (function)
5. Optionally looks for a `verify` export
6. Optionally looks for a `dependsOn` export (array of task names)
7. Sorts tasks topologically (respecting dependencies), with alphabetical tie-breaking

```typescript
for await (const entry of Deno.readDir(tasksDir)) {
  if (!entry.isFile || !entry.name.endsWith(".ts")) {
    continue;
  }

  const taskName = entry.name.replace(".ts", "");
  const modulePath = join(tasksDir, entry.name);
  const mod = await import(`file://${modulePath}`);

  if (typeof mod.run !== "function") {
    log.warn(`Task ${taskName} has no run() export, skipping`);
    continue;
  }

  const dependsOn = Array.isArray(mod.dependsOn) ? mod.dependsOn : [];

  tasks.push({
    name: taskName,
    run: mod.run,
    verify: typeof mod.verify === "function" ? mod.verify : undefined,
    dependsOn,
  });
}
```

## Naming Convention

The filename becomes the task name:

| File | Task Name |
|------|-----------|
| `src/tasks/rust.ts` | `rust` |
| `src/tasks/neovim.ts` | `neovim` |
| `src/tasks/docker.ts` | `docker` |

## Filtering

Run specific tasks by providing a filter:

```bash
# Run only tasks containing "neo"
deno task run neo

# Matches: neovim
# Does not match: rust, docker, etc.
```

The filter uses substring matching:

```typescript
if (filter && !taskName.includes(filter)) {
  log.info(`Filtered out: ${taskName}`);
  continue;
}
```

## Execution Order

Tasks are sorted topologically based on their dependencies:

1. Tasks with dependencies run after their dependencies complete
2. Tasks without dependencies (or with satisfied dependencies) run in alphabetical order
3. Circular dependencies are detected and cause an error

```typescript
// Example: secrets depends on sops
// src/tasks/secrets.ts
export const dependsOn = ["sops"];
```

When running a specific task, its dependencies are automatically included:

```bash
deno task run secrets  # Automatically runs: sops → secrets
```

This provides deterministic execution while respecting dependency constraints.

## Current Tasks

As of writing, the following tasks exist:

| Task | Purpose |
|------|---------|
| `dev` | Development tools |
| `docker` | Docker and container tools |
| `eleven-tools` | Various CLI utilities |
| `emoji` | Emoji picker setup |
| `gdb` | GDB debugger |
| `ghostty` | Ghostty terminal emulator |
| `i3` | i3 window manager |
| `keyboard` | Keyboard configuration |
| `libs` | System libraries and dependencies |
| `neovim` | Neovim editor |
| `node` | Node.js runtime |
| `odin` | Odin programming language |
| `opencode` | Opencode tools |
| `php` | PHP runtime |
| `rofi` | Rofi application launcher |
| `rust` | Rust toolchain |
| `tmux` | tmux terminal multiplexer |
| `zed` | Zed editor |
| `zsh` | Zsh shell |

## Why Auto-Discovery?

### No Registration

With frameworks that require registration:

```typescript
// Hypothetical registration-based approach
const tasks = [
  { name: "rust", handler: rustHandler },
  { name: "neovim", handler: neovimHandler },
  // Easy to forget to add new tasks
];
```

With discovery:

```bash
# Adding a new task is just creating a file
touch src/tasks/mytool.ts
```

### Convention Over Configuration

The discovery pattern follows a simple convention:
- File in `src/tasks/`
- Exports `run(ctx: TaskContext): Promise<void>`
- Optionally exports `verify(ctx: TaskContext): Promise<void>`
- Optionally exports `dependsOn: string[]` for task dependencies

No configuration files, no manifest updates, no imports to add.

### Easy to Browse

Want to see what gets installed? List the directory:

```bash
ls src/tasks/
```

Each file is self-contained and readable.

## Limitations

### No Parallel Execution

Tasks run sequentially. For most development environment setups, this is fine—parallel apt installs would conflict anyway.

### No Conditional Execution

Every matching task runs. There's no skip-if-already-installed logic at the discovery level (though individual tasks can check and early-return).
