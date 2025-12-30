# Getting Started

This tutorial walks you through your first run of the development environment manager.

## Quick Start

Prerequisites (install if not present):
```bash
# System packages
sudo apt install -y curl git unzip

# Deno runtime
curl -fsSL https://deno.land/install.sh | sh
export PATH="$HOME/.deno/bin:$PATH"
```

```bash
# 1. Clone repo
git clone https://github.com/lauriliivamagi/dev-env ~/git/dev-env
cd ~/git/dev-env

# 2. Run tasks for your stack
deno task run -s larr

# 3. Sync configs
deno task sync -s larr
```

For secrets setup (SSH keys, API tokens), see the [Secrets Management](../../CLAUDE.md#secrets-management) section.

---

*The rest of this tutorial explains each step in detail.*

## Prerequisites

- Ubuntu or Debian-based Linux system
- System packages: `curl`, `git`, `unzip`
- Deno runtime

Install prerequisites:
```bash
# System packages
sudo apt install -y curl git unzip

# Deno runtime
curl -fsSL https://deno.land/install.sh | sh
export PATH="$HOME/.deno/bin:$PATH"
```

Verify Deno works:
```bash
deno --version
# deno 2.x.x
```

## Step 1: Clone the Repository

```bash
git clone https://github.com/lauriliivamagi/dev-env ~/git/dev-env
cd ~/git/dev-env
```

## Step 2: Explore What's Available

This project uses **stacks** — isolated sets of tasks and configs. See what stacks exist:

```bash
ls stacks/
```

You'll see directories like:
```
primeagen/    # ThePrimeagen-inspired setup
```

Each stack has its own tasks:

```bash
ls stacks/primeagen/tasks/
```

```
dev.ts      ghostty.ts  libs.ts     node.ts     rust.ts     zsh.ts
docker.ts   i3.ts       neovim.ts   rofi.ts     tmux.ts     ...
```

Each file is a task that installs or configures something.

## Step 3: Preview with Dry Run

Before making changes, preview what would happen:

```bash
deno task run -s primeagen --dry
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

## Step 4: Run a Single Task

Start with something simple. The `libs` task installs basic system packages:

```bash
deno task run -s primeagen libs
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

## Step 5: Verify It Worked

The verification ran automatically. You can also check manually:

```bash
rg --version
fzf --version
```

## Step 6: Run All Tasks

When you're ready to set up your full environment:

```bash
deno task run -s primeagen
```

This runs all tasks in dependency order. It may take a while depending on what's being installed.

## Step 7: Sync Your Configs

After tasks install tools, sync your configuration files:

```bash
deno task sync -s primeagen --dry    # Preview first
deno task sync -s primeagen          # Apply
```

This copies dotfiles and configs from `stacks/primeagen/env/` to your home directory.

## What Just Happened?

You've:

1. **Run tasks** that installed system packages, language toolchains, and tools
2. **Verified** each installation succeeded
3. **Synced configs** from the repository to your home directory

Your development environment is now reproducible. On a new machine:

```bash
git clone <repo>
cd dev-env
deno task run -s primeagen
deno task sync -s primeagen
```

## Next Steps

- **Customize**: Edit files in `stacks/primeagen/env/` and run `deno task sync -s primeagen`
- **Add tasks**: Create new files in `stacks/primeagen/tasks/` for your tools
- **Create your own stack**: `mkdir -p stacks/mystack/{tasks,env,secrets}`
- **Understand**: Read the [Explanation docs](../explanation/) for design rationale

## Quick Reference

```bash
# Run all tasks for a stack
deno task run -s primeagen

# Run specific task
deno task run -s primeagen neovim

# Preview changes
deno task run -s primeagen --dry

# Sync configs
deno task sync -s primeagen

# Preview sync
deno task sync -s primeagen --dry

# Convenience shortcuts (if configured)
deno task run:primeagen
deno task sync:primeagen

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
