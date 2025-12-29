# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
deno task check          # Type check all TypeScript files
deno task lint           # Lint source code
deno task test           # Run all tests
deno task test:task      # Run specific task tests (e.g., deno task test:task rust)
deno task run [filter]   # Run setup tasks (optional filter by name)
deno task sync           # Sync configs from env/ to home directory
deno task compile        # Compile to standalone binary
```

Add `--dry` or `-d` to `run`/`sync` for dry-run mode.

### Docker Testing

```bash
make test-all            # Run all tasks in Docker (full integration test)
make test TASK=zsh       # Test a specific task in Docker
make test-dry            # Dry-run all tasks in Docker
make shell               # Open interactive shell for debugging
make clean               # Remove test Docker image
```

## Architecture

This is a Deno-based development environment manager with two main commands:

**`run`** - Discovers and executes task modules from `src/tasks/`. Each task is a TypeScript file exporting:
```typescript
export async function run(ctx: TaskContext): Promise<void>
```

**`sync`** - Copies configuration files from `env/` to the user's home directory (`~/.config/`, `~/.local/`, dotfiles).

### Key Files
- `src/cli.ts` - CLI entry point, argument parsing
- `src/commands/run.ts` - Task discovery and execution
- `src/commands/sync.ts` - Configuration synchronization
- `src/lib/` - Shared utilities (shell, fs, logging, config, assert)
- `src/tasks/` - Individual setup tasks (auto-discovered)
- `env/` - Configuration files to sync to home

### TaskContext
All operations receive a `TaskContext` with:
- `dryRun: boolean` - Check before making changes
- `home: string` - User's home directory
- `devEnv: string` - Path to this repository
- `configHome: string` - XDG config home (~/.config)

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

Create `src/tasks/mytask.ts`:
```typescript
import { type TaskContext, assert, log } from "../lib/mod.ts";
import { apt, runOrFail } from "../lib/shell.ts";

export async function run(ctx: TaskContext): Promise<void> {
  // Shell utilities: apt(), pnpm(), cargoInstall(), gitClone(), curlPipe()
  // File utilities: fs.copyFile(), fs.copyDir(), fs.mkdir(), fs.remove(), fs.writeFile()
  // All lib functions handle ctx.dryRun internally
}
```

The task will be automatically discovered and can be run with `deno task run mytask`.

### Task Dependencies

Declare dependencies using the `dependsOn` export:
```typescript
// src/tasks/secrets.ts
export const dependsOn = ["sops"];  // This task requires sops to run first

export async function run(ctx: TaskContext): Promise<void> {
  // sops command is guaranteed to be available
}
```

When running a specific task, its dependencies are automatically included:
```bash
deno task run secrets  # Automatically runs: sops → secrets
```

Tasks are sorted topologically (dependencies first), with alphabetical ordering for independent tasks. Circular dependencies are detected and cause an error.

## Secrets Management

This project uses two tools for secrets:
- **dotenvx** - API tokens (encrypted `.env` file)
- **SOPS + age** - SSH keys (encrypted YAML files)
- **gitleaks** - Pre-commit hook to prevent committing plaintext secrets

### Initial Setup (once per machine)

```bash
# 1. Install tools and pre-commit hook
deno task run sops dotenvx gitleaks git-hooks

# 2. Generate age keypair (first time only, share public key)
age-keygen -o ~/.config/sops/age/keys.txt

# 3. Update .sops.yaml with your public key
# Get your public key: grep "public key" ~/.config/sops/age/keys.txt

# 4. Create and encrypt your secrets
cp .env.example .env
# Edit .env with your API keys
dotenvx encrypt

cp secrets/ssh.enc.yaml.example secrets/ssh.enc.yaml
# Edit secrets/ssh.enc.yaml with your SSH keys
sops -e -i secrets/ssh.enc.yaml

# 5. Install SSH keys
deno task run secrets
```

### Daily Workflow

API tokens are loaded automatically via `.zsh_profile` when dotenvx is installed.

To update secrets:
```bash
# Add new API token
dotenvx set NEW_API_KEY "value"

# Edit SSH keys
sops secrets/ssh.enc.yaml  # Opens decrypted in $EDITOR
deno task run secrets       # Re-install keys
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
