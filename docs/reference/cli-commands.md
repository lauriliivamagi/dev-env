# CLI Commands

Reference for the dev-env command line interface.

## Usage

```bash
deno task <command> --stack <name> [filter] [options]
```

## Commands

### run

Execute setup tasks from a stack's `tasks/` directory.

```bash
# Run all tasks for a stack
deno task run -s primeagen
deno task run --stack primeagen

# Run tasks matching a filter
deno task run -s primeagen neovim    # Only tasks containing "neovim"
deno task run -s primeagen rust      # Only tasks containing "rust"

# Dry run (preview without executing)
deno task run -s primeagen --dry
deno task run -s primeagen -d

# Combined
deno task run -s primeagen neovim --dry

# Convenience shortcuts (if configured)
deno task run:primeagen
deno task run:primeagen neovim --dry
```

**Behavior:**
- Discovers all `.ts` files in `stacks/<name>/tasks/`
- Filters by substring match if filter provided
- Resolves dependencies (topological sort)
- Executes tasks in dependency order, then alphabetically
- Runs verification after each task (unless dry run)
- Stops on first failure

### sync

Synchronize configuration files from a stack's `env/` to the home directory.

```bash
# Sync all configs for a stack
deno task sync -s primeagen
deno task sync --stack primeagen

# Dry run
deno task sync -s primeagen --dry
deno task sync -s primeagen -d

# Convenience shortcuts (if configured)
deno task sync:primeagen
```

**What gets synced:**
- `stacks/<name>/env/.config/*` → `~/.config/`
- `stacks/<name>/env/.local/*` → `~/.local/`
- `stacks/<name>/env/.zshrc` → `~/.zshrc`
- `stacks/<name>/env/.zsh_profile` → `~/.zsh_profile`
- `stacks/<name>/env/.xprofile` → `~/.xprofile`
- `stacks/<name>/env/.tmux-sessionizer` → `~/.tmux-sessionizer`

## Options

### -s, --stack

**Required.** Specify which stack to use.

```bash
deno task run -s primeagen
deno task run --stack larr
deno task sync -s primeagen
```

### -d, --dry

Enable dry run mode. Shows what would happen without making changes.

```bash
deno task run -s primeagen --dry
deno task run -s primeagen -d
deno task sync -s primeagen --dry
```

**Output in dry run:**
```
[DRY] would run: apt install ripgrep
[DRY] cp ~/.config/nvim -> ~/.config/nvim
```

### -h, --help

Show help message.

```bash
deno task run --help
deno task run -h
```

## Environment Variables

### HOME

**Required.** User's home directory.

```bash
# Usually set automatically
echo $HOME
/home/username
```

### DEV_ENV

Path to the dev-env repository. Defaults to current working directory.

```bash
# Override to run from different location
DEV_ENV=/path/to/dev-env deno task run
```

### XDG_CONFIG_HOME

XDG configuration directory. Defaults to `$HOME/.config`.

```bash
# Override for non-standard config location
XDG_CONFIG_HOME=/custom/config deno task sync
```

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | Error (command failed, unknown command, missing HOME) |

## Examples

```bash
# Full setup on new machine
deno task run -s primeagen

# Just install Rust toolchain
deno task run -s primeagen rust

# Preview what neovim task does
deno task run -s primeagen neovim --dry

# Update all configs without running tasks
deno task sync -s primeagen

# Check what sync would change
deno task sync -s primeagen --dry

# Run a different stack
deno task run -s larr
deno task sync -s larr
```

## Deno Tasks

The CLI is exposed through `deno.json` tasks:

```json
{
  "tasks": {
    "run": "deno run --allow-all src/cli.ts run",
    "sync": "deno run --allow-all src/cli.ts sync",
    "run:primeagen": "deno run --allow-all src/cli.ts run --stack primeagen",
    "sync:primeagen": "deno run --allow-all src/cli.ts sync --stack primeagen",
    "compile": "deno compile --allow-all -o dev-env src/cli.ts",
    "check": "deno check src/**/*.ts stacks/**/*.ts",
    "lint": "deno lint src/ stacks/",
    "test": "deno test --allow-all src/",
    "test:task": "deno test --allow-all --filter"
  }
}
```

### Additional Tasks

```bash
# Type check all files
deno task check

# Lint source code
deno task lint

# Run all unit tests
deno task test

# Run tests matching a pattern
deno task test:task "copyFile"     # Tests containing "copyFile"
deno task test:task "shell"        # Tests containing "shell"

# Compile to standalone binary
deno task compile
# Creates ./dev-env executable
```

### Adding Convenience Tasks for New Stacks

Add shortcuts for your custom stacks in `deno.json`:

```json
{
  "tasks": {
    "run:mystack": "deno run -A src/cli.ts run --stack mystack",
    "sync:mystack": "deno run -A src/cli.ts sync --stack mystack"
  }
}
```
