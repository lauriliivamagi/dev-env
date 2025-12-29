# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## First-time Setup

```bash
# 1. Install Deno
curl -fsSL https://deno.land/install.sh | sh
export PATH="$HOME/.deno/bin:$PATH"

# 2. Clone repo
git clone https://github.com/lauriliivamagi/dev-env ~/dev-env
cd ~/dev-env

# 3. Run tasks for your stack
deno task run -s larr

# 4. Sync configs
deno task sync -s larr
```

For secrets setup (SSH keys, API tokens), see the [Secrets Management](#secrets-management) section below.

## Commands

```bash
deno task check                    # Type check all TypeScript files
deno task lint                     # Lint source code
deno task test                     # Run all unit tests
deno task test:task "pattern"      # Run tests matching pattern (e.g., deno task test:task copyFile)
deno task run -s <stack> [filter]  # Run setup tasks for a stack
deno task sync -s <stack>          # Sync configs from stack's env/ to home directory
deno task compile                  # Compile to standalone binary

# Convenience shortcuts for primeagen stack
deno task run:primeagen [filter]   # Run primeagen stack tasks
deno task sync:primeagen           # Sync primeagen stack configs
```

Add `--dry` or `-d` to `run`/`sync` for dry-run mode.

### Manual Docker Testing

Test tasks in an isolated Docker container:

```bash
make test-dry                      # Dry-run all tasks in Docker
make test TASK=zsh                 # Test a specific task in Docker
make test STACK=larr               # Test a different stack
make shell                         # Open interactive shell for debugging
make clean                         # Remove test Docker image
```

## Architecture

This is a Deno-based development environment manager organized around **stacks** - isolated sets of tasks and configurations.

### Stacks

A stack is a complete, isolated dev environment configuration. Each stack has its own:
- `tasks/` - Setup task modules
- `env/` - Configuration files to sync
- `secrets/` - Encrypted secrets (SSH keys, etc.)

```
stacks/
├── primeagen/           # ThePrimeagen-inspired stack
│   ├── tasks/
│   ├── env/
│   └── secrets/
└── larr/                # Your custom stack
    ├── tasks/
    ├── env/
    └── secrets/
```

Stacks are fully isolated - no sharing between them.

### Commands

**`run --stack <name>`** - Discovers and executes task modules from `stacks/<name>/tasks/`. Each task is a TypeScript file exporting:
```typescript
export async function run(ctx: TaskContext): Promise<void>
```

**`sync --stack <name>`** - Copies configuration files from `stacks/<name>/env/` to the user's home directory (`~/.config/`, `~/.local/`, dotfiles).

### Key Files
- `src/cli.ts` - CLI entry point, argument parsing
- `src/commands/run.ts` - Task discovery and execution
- `src/commands/sync.ts` - Configuration synchronization
- `src/lib/` - Shared utilities (shell, fs, logging, config, assert)
- `stacks/<name>/tasks/` - Stack-specific setup tasks (auto-discovered)
- `stacks/<name>/env/` - Stack-specific configuration files

### TaskContext
All operations receive a `TaskContext` with:
- `dryRun: boolean` - Check before making changes
- `home: string` - User's home directory
- `devEnv: string` - Path to this repository
- `configHome: string` - XDG config home (~/.config)
- `stack: string` - Active stack name
- `stackRoot: string` - Path to active stack directory

## Tiger Style Assertions

This codebase uses Tiger Style assertions (`src/lib/assert.ts`) - assertions that run in production as executable documentation of program invariants.

```typescript
import { assert, unreachable } from "../lib/mod.ts";

assert(value.length > 0, "value cannot be empty");  // Validates preconditions
unreachable("invalid state");                        // Marks impossible code paths
```

Use assertions for:
- **Preconditions**: Validate function arguments at entry
- **Postconditions**: Verify return values and state
- **Invariants**: Document assumptions that must hold
- **Impossible paths**: Use `unreachable()` for code that should never execute

## Adding a New Task

Create `stacks/<stack>/tasks/mytask.ts`:
```typescript
import { type TaskContext, assert, log } from "../../../src/lib/mod.ts";
import { apt, runOrFail } from "../../../src/lib/shell.ts";

export async function run(ctx: TaskContext): Promise<void> {
  // Shell utilities: apt(), pnpm(), cargoInstall(), gitClone(), curlPipe()
  // File utilities: fs.copyFile(), fs.copyDir(), fs.mkdir(), fs.remove(), fs.writeFile()
  // All lib functions handle ctx.dryRun internally
}
```

The task will be automatically discovered and can be run with `deno task run -s <stack> mytask`.

### Task Dependencies

Declare dependencies using the `dependsOn` export:
```typescript
// stacks/primeagen/tasks/secrets.ts
export const dependsOn = ["sops"];  // This task requires sops to run first

export async function run(ctx: TaskContext): Promise<void> {
  // sops command is guaranteed to be available
}
```

When running a specific task, its dependencies are automatically included:
```bash
deno task run -s primeagen secrets  # Automatically runs: sops → secrets
```

Tasks are sorted topologically (dependencies first), with alphabetical ordering for independent tasks. Circular dependencies are detected and cause an error.

## Creating a New Stack

```bash
mkdir -p stacks/mystack/{tasks,env,secrets}
```

Add tasks to `stacks/mystack/tasks/`, configs to `stacks/mystack/env/`, etc. Then run:
```bash
deno task run -s mystack
deno task sync -s mystack
```

## Secrets Management

This project uses two tools for secrets:
- **dotenvx** - API tokens (encrypted `.env` file)
- **SOPS + age** - SSH keys (encrypted YAML files)
- **gitleaks** - Pre-commit hook to prevent committing plaintext secrets

### Initial Setup (once per machine)

```bash
# 1. Install tools and pre-commit hook
deno task run -s primeagen sops dotenvx gitleaks git-hooks

# 2. Generate age keypair (first time only, share public key)
age-keygen -o ~/.config/sops/age/keys.txt

# 3. Update .sops.yaml with your public key
# Get your public key: grep "public key" ~/.config/sops/age/keys.txt

# 4. Create and encrypt your secrets
cp .env.example .env
# Edit .env with your API keys
dotenvx encrypt

cp stacks/primeagen/secrets/ssh.enc.yaml.example stacks/primeagen/secrets/ssh.enc.yaml
# Edit secrets file with your SSH keys
sops -e -i stacks/primeagen/secrets/ssh.enc.yaml

# 5. Install SSH keys
deno task run -s primeagen secrets
```

### Daily Workflow

API tokens are loaded automatically via `.zsh_profile` when dotenvx is installed.

To update secrets:
```bash
# Add new API token
dotenvx set NEW_API_KEY "value"

# Edit SSH keys
sops stacks/primeagen/secrets/ssh.enc.yaml  # Opens decrypted in $EDITOR
deno task run -s primeagen secrets           # Re-install keys
```

### Sharing Secrets

Share your age private key and dotenvx private key securely (1Password, Signal, etc.):
- Age key: `~/.config/sops/age/keys.txt`
- Dotenvx key: Value of `DOTENV_PRIVATE_KEY` from `.env.keys`

## Documentation

See `docs/` for detailed documentation:
- `docs/index.md` - Documentation overview
- `docs/how-to/manage-secrets.md` - Complete secrets management guide
- `docs/reference/` - API reference for utilities
