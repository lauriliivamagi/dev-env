# CLI Commands

Reference for the dev-env command line interface.

## Usage

```bash
deno task <command> [filter] [options]
```

## Commands

### run

Execute setup tasks from `src/tasks/`.

```bash
# Run all tasks
deno task run

# Run tasks matching a filter
deno task run neovim    # Only tasks containing "neovim"
deno task run rust      # Only tasks containing "rust"

# Dry run (preview without executing)
deno task run --dry
deno task run -d

# Combined
deno task run neovim --dry
```

**Behavior:**
- Discovers all `.ts` files in `src/tasks/`
- Filters by substring match if filter provided
- Executes tasks in alphabetical order
- Runs verification after each task (unless dry run)
- Stops on first failure

### sync

Synchronize configuration files from `env/` to the home directory.

```bash
# Sync all configs
deno task sync

# Dry run
deno task sync --dry
deno task sync -d
```

**What gets synced:**
- `env/.config/*` → `~/.config/`
- `env/.local/*` → `~/.local/`
- `env/.zshrc` → `~/.zshrc`
- `env/.zsh_profile` → `~/.zsh_profile`
- `env/.xprofile` → `~/.xprofile`
- `env/.tmux-sessionizer` → `~/.tmux-sessionizer`

## Options

### -d, --dry

Enable dry run mode. Shows what would happen without making changes.

```bash
deno task run --dry
deno task run -d
deno task sync --dry
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
DEV_ENV=/path/to/larr-dev-env deno task run
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
deno task run

# Just install Rust toolchain
deno task run rust

# Preview what neovim task does
deno task run neovim --dry

# Update all configs without running tasks
deno task sync

# Check what sync would change
deno task sync --dry
```

## Deno Tasks

The CLI is exposed through `deno.json` tasks:

```json
{
  "tasks": {
    "run": "deno run -A src/cli.ts run",
    "sync": "deno run -A src/cli.ts sync",
    "check": "deno check src/**/*.ts",
    "lint": "deno lint",
    "compile": "deno compile -A -o dev-env src/cli.ts"
  }
}
```

### Additional Tasks

```bash
# Type check all files
deno task check

# Lint source code
deno task lint

# Compile to standalone binary
deno task compile
# Creates ./dev-env executable
```
