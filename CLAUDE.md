# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## First-time Setup

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
Add `--diff` to show file changes before applying.

### Manual Docker Testing

Test tasks in an isolated Docker container:

```bash
make test-dry                      # Dry-run all tasks in Docker
make test TASK=zsh                 # Test a specific task in Docker
make test STACK=larr               # Test a different stack
make test-all STACK=larr           # Run all tasks (non-interactive)
make shell                         # Open interactive shell for debugging
make clean                         # Remove test Docker image
```

**Full integration test (non-TTY environments like Claude Code):**

The `make test-full` target requires a TTY. For non-interactive environments, use this command:

```bash
# For larr stack:
docker build -t dev-env-test -f Dockerfile.test . && docker run --rm \
    --privileged \
    -v /var/run/docker.sock:/var/run/docker.sock \
    -e HOME=/home/testuser \
    -e USER=testuser \
    -e XDG_CONFIG_HOME=/home/testuser/.config \
    -e DEV_ENV=/home/testuser/dev-env \
    -e REALISTIC_TEST=1 \
    dev-env-test \
    bash -c "cp test/secrets/*.enc.yaml stacks/larr/secrets/ && \
           sudo apt-get update -qq && \
           deno task sync -s larr && \
           zsh -i -l -c 'deno task run -s larr'"

# For primeagen stack:
docker build -t dev-env-test -f Dockerfile.test . && docker run --rm \
    --privileged \
    -v /var/run/docker.sock:/var/run/docker.sock \
    -e HOME=/home/testuser \
    -e USER=testuser \
    -e XDG_CONFIG_HOME=/home/testuser/.config \
    -e DEV_ENV=/home/testuser/dev-env \
    -e REALISTIC_TEST=1 \
    dev-env-test \
    bash -c "cp test/secrets/*.enc.yaml stacks/primeagen/secrets/ && \
           sudo apt-get update -qq && \
           deno task sync -s primeagen && \
           zsh -i -l -c 'deno task run -s primeagen'"
```

Key flags explained:

- `zsh -i -l`: Interactive login shell that sources `.zshrc`/`.zsh_profile` for proper PATH setup
- `REALISTIC_TEST=1`: Uses PATH from shell config instead of hardcoded paths
- `--privileged`: Required for Docker-in-Docker tasks
- Secrets are copied before running to enable SSH key and config decryption

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
export async function run(ctx: TaskContext): Promise<void>;
```

**`sync --stack <name>`** - Copies configuration files from `stacks/<name>/env/` to the user's home directory (`~/.config/`, `~/.local/`, dotfiles).

### Key Files

- `src/cli.ts` - CLI entry point, argument parsing
- `src/commands/run.ts` - Task discovery and execution
- `src/commands/sync.ts` - Configuration synchronization
- `src/lib/` - Shared utilities (shell, fs, logging, config, assert, verify, deps)
- `stacks/<name>/tasks/` - Stack-specific setup tasks (auto-discovered)
- `stacks/<name>/env/` - Stack-specific configuration files

### TaskContext

All operations receive a `TaskContext` with:

- `dryRun: boolean` - Check before making changes
- `diff: boolean` - Show diffs for file changes
- `home: string` - User's home directory
- `devEnv: string` - Path to this repository
- `configHome: string` - XDG config home (~/.config)
- `stack: string` - Active stack name
- `stackRoot: string` - Path to active stack directory
- `vars: Record<string, string>` - Stack variables (empty unless stack has `vars.ts`)

## Tiger Style Assertions

This codebase uses Tiger Style assertions (`src/lib/assert.ts`) - assertions that run in production as executable documentation of program invariants.

```typescript
import { assert, unreachable } from "../lib/mod.ts";

assert(value.length > 0, "value cannot be empty"); // Validates preconditions
unreachable("invalid state"); // Marks impossible code paths
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
  // Shell utilities: apt(), pnpm(), cargoInstall(), goInstall(), gitClone(), curlPipe()
  // File utilities: fs.copyFile(), fs.copyDir(), fs.mkdir(), fs.remove(), fs.writeFile()
  // All lib functions handle ctx.dryRun internally
}
```

The task will be automatically discovered and can be run with `deno task run -s <stack> mytask`.

### Task Dependencies

Declare dependencies using the `dependsOn` export:

```typescript
// stacks/primeagen/tasks/secrets.ts
export const dependsOn = ["sops"]; // This task requires sops to run first

export async function run(ctx: TaskContext): Promise<void> {
  // sops command is guaranteed to be available
}
```

When running a specific task, its dependencies are automatically included:

```bash
deno task run -s primeagen secrets  # Automatically runs: sops → secrets
```

Tasks are sorted topologically (dependencies first), with alphabetical ordering for independent tasks. Circular dependencies are detected and cause an error.

### Conditional Execution

Tasks can export a `shouldRun` function to skip execution when already satisfied:

```typescript
import { commandExists } from "../../../src/lib/shell.ts";

export async function shouldRun(ctx: TaskContext): Promise<boolean> {
  // Return false to skip this task
  return !await commandExists("mytool");
}
```

When `shouldRun` returns `false`, the task is skipped but `verify()` still runs to confirm it's truly satisfied.

### Changed Tracking

File operations return `{ changed: boolean }` to indicate if modifications occurred:

```typescript
const { changed } = await fs.writeFile(ctx, path, content);
if (changed) {
  log.info("File was updated");
}
```

Operations skip unchanged files automatically:

- `writeFile()` - skips if content identical
- `copyFile()` - skips if source/dest match
- `mkdir()` - skips if directory exists
- `remove()` - returns false if path didn't exist

### Diff Mode

Show file changes before applying with `--diff`:

```bash
deno task run -s larr --diff
deno task sync -s larr --diff
```

Displays removed lines in red, added lines in green.

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
