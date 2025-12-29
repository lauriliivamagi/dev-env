# Getting Started

This tutorial walks you through your first run of the development environment manager.

## Prerequisites

- Ubuntu or Debian-based Linux system
- sudo access
- Deno installed (or we'll install it)

## Step 1: Install Deno

If you don't have Deno installed:

```bash
curl -fsSL https://deno.land/install.sh | sh
```

Add Deno to your PATH:

```bash
export PATH="$HOME/.deno/bin:$PATH"
```

Verify it works:

```bash
deno --version
# deno 1.x.x
```

## Step 2: Clone the Repository

```bash
git clone https://github.com/yourusername/dev-env.git
cd dev-env
```

## Step 3: Explore What's Available

See what tasks exist:

```bash
ls src/tasks/
```

You'll see files like:
```
dev.ts      ghostty.ts  libs.ts     node.ts     rust.ts     zsh.ts
docker.ts   i3.ts       neovim.ts   rofi.ts     tmux.ts     ...
```

Each file is a task that installs or configures something.

## Step 4: Preview with Dry Run

Before making changes, preview what would happen:

```bash
deno task run --dry
```

This shows every command that would run without executing them:

```
[INFO] Dry run mode enabled
[INFO] Found 15 task(s) to run
[TASK] dev
[CMD] sudo apt install -y build-essential ...
[DRY] would run: sudo apt install -y build-essential ...
[SUCCESS] Completed: dev
[TASK] docker
...
```

## Step 5: Run a Single Task

Start with something simple. The `libs` task installs basic system packages:

```bash
deno task run libs
```

You'll see output like:

```
[TASK] libs
[CMD] sudo apt update
...
[CMD] sudo apt install -y build-essential curl git ripgrep fd-find fzf
...
[INFO] Verifying: libs
[SUCCESS] Completed: libs
```

## Step 6: Verify It Worked

The verification ran automatically. You can also check manually:

```bash
rg --version
fzf --version
```

## Step 7: Run All Tasks

When you're ready to set up your full environment:

```bash
deno task run
```

This runs all tasks alphabetically. It may take a while depending on what's being installed.

## Step 8: Sync Your Configs

After tasks install tools, sync your configuration files:

```bash
deno task sync --dry    # Preview first
deno task sync          # Apply
```

This copies dotfiles and configs from `env/` to your home directory.

## What Just Happened?

You've:

1. **Run tasks** that installed system packages, language toolchains, and tools
2. **Verified** each installation succeeded
3. **Synced configs** from the repository to your home directory

Your development environment is now reproducible. On a new machine:

```bash
git clone <repo>
cd dev-env
deno task run
deno task sync
```

## Next Steps

- **Customize**: Edit files in `env/` and run `deno task sync`
- **Add tasks**: Create new files in `src/tasks/` for your tools
- **Understand**: Read the [Explanation docs](../explanation/) for design rationale

## Quick Reference

```bash
# Run all tasks
deno task run

# Run specific task
deno task run neovim

# Preview changes
deno task run --dry

# Sync configs
deno task sync

# Preview sync
deno task sync --dry

# Type check
deno task check

# Lint
deno task lint
```

## Troubleshooting

### "Permission denied"

Most tasks use sudo. Make sure you have sudo access:

```bash
sudo echo "test"
```

### "Command not found: deno"

Add Deno to your PATH:

```bash
export PATH="$HOME/.deno/bin:$PATH"
```

Add this to your `.bashrc` or `.zshrc` for persistence.

### Task Fails

Run with verbose output to see what went wrong:

```bash
deno task run mytask
```

Check the error message. Common issues:
- Package not found in apt
- Missing dependencies
- Network issues

### Verification Fails

The tool installed but verification failed:
- Check if command name differs from package name
- Verify PATH includes installation directory
- Try opening a new terminal
