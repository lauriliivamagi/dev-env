# Task Discovery

Tasks are automatically discovered from each stack's `tasks/` directory. Drop a TypeScript file there, and it becomes runnable.

## How Discovery Works

The `discoverTasks()` function in `src/commands/run.ts`:

1. Reads all files in `stacks/<stack>/tasks/`
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
| `stacks/primeagen/tasks/rust.ts` | `rust` |
| `stacks/primeagen/tasks/neovim.ts` | `neovim` |
| `stacks/primeagen/tasks/docker.ts` | `docker` |

## Filtering

Run specific tasks by providing a filter:

```bash
# Run only tasks containing "neo"
deno task run -s primeagen neo

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
// stacks/primeagen/tasks/secrets.ts
export const dependsOn = ["sops"];
```

When running a specific task, its dependencies are automatically included:

```bash
deno task run -s primeagen secrets  # Automatically runs: sops → secrets
```

This provides deterministic execution while respecting dependency constraints.

## Current Tasks

### primeagen stack (29 tasks)

| Task | Purpose |
|------|---------|
| `cht` | cht.sh CLI cheat sheets |
| `dev` | Development tools (build-essential, etc.) |
| `docker` | Docker and docker-compose |
| `dotenvx` | Environment variable encryption |
| `eleven-tools` | Various CLI utilities |
| `emoji` | Emoji picker setup |
| `gdb` | GDB debugger |
| `ghostty` | Ghostty terminal emulator |
| `git-hooks` | Pre-commit hooks |
| `gitleaks` | Secret scanning |
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
| `secrets` | SSH key installation (depends on sops) |
| `sops` | SOPS + age encryption |
| `tmux` | tmux terminal multiplexer |
| `tmuxinator` | Tmux session manager |
| `volta` | JavaScript toolchain manager |
| `zed` | Zed editor |
| `zig` | Zig programming language |
| `zoxide` | Smart directory navigation |
| `zsh` | Zsh shell with plugins |

### larr stack (32 tasks)

| Task | Purpose |
|------|---------|
| `bat` | Better cat with syntax highlighting |
| `chtsh` | cht.sh CLI cheat sheets |
| `claude` | Claude AI integration |
| `delta` | Git diff viewer |
| `deno` | Deno runtime (depends on volta) |
| `dev` | Development tools (build-essential, etc.) |
| `docker` | Docker and docker-compose |
| `dotenvx` | Environment variable encryption |
| `espanso` | Text expansion |
| `fd` | Fast find alternative |
| `fonts` | Font installation |
| `fzf` | Fuzzy finder |
| `gh` | GitHub CLI |
| `ghostty` | Ghostty terminal emulator |
| `git-hooks` | Pre-commit hooks |
| `gitleaks` | Secret scanning |
| `go` | Go programming language |
| `keyboard` | Keyboard configuration |
| `lazygit` | Git TUI |
| `neovim` | Neovim editor |
| `opencode` | Opencode tools |
| `ripgrep` | Fast grep alternative |
| `rust` | Rust toolchain |
| `secrets` | SSH key installation (depends on sops) |
| `signal` | Signal messenger |
| `sops` | SOPS + age encryption |
| `tmux` | tmux terminal multiplexer |
| `uv` | Python package manager |
| `volta` | JavaScript toolchain manager |
| `vscode` | VS Code Insiders |
| `zig` | Zig programming language |
| `zsh` | Zsh shell with Powerlevel10k |

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
touch stacks/primeagen/tasks/mytool.ts
```

### Convention Over Configuration

The discovery pattern follows a simple convention:
- File in `stacks/<stack>/tasks/`
- Exports `run(ctx: TaskContext): Promise<void>`
- Optionally exports `verify(ctx: TaskContext): Promise<void>`
- Optionally exports `dependsOn: string[]` for task dependencies

No configuration files, no manifest updates, no imports to add.

### Easy to Browse

Want to see what gets installed? List the directory:

```bash
ls stacks/primeagen/tasks/
```

Each file is self-contained and readable.

## Limitations

### No Parallel Execution

Tasks run sequentially. For most development environment setups, this is fine—parallel apt installs would conflict anyway.

### No Conditional Execution

Every matching task runs. There's no skip-if-already-installed logic at the discovery level (though individual tasks can check and early-return).
