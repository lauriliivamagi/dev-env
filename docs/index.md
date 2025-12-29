# larr-dev-env Documentation

A Deno-based development environment manager. Clone the repo, run one command, and have an identical environment on any machine.

## Quick Start

```bash
# Run all setup tasks
deno task run

# Sync configuration files to home directory
deno task sync

# Dry run (preview changes without executing)
deno task run --dry
deno task sync --dry
```

## Documentation

This documentation follows the [Divio documentation framework](https://documentation.divio.com/), organized into four categories based on different user needs.

### [Explanation](explanation/)

*Understanding-oriented* — Background, context, and design rationale.

- [Environment Reproducibility](explanation/environment-reproducibility.md) — The core goal: identical environments anywhere
- [Why Deno, Not Bash](explanation/why-deno-not-bash.md) — Migration rationale and ownership philosophy
- [Tiger Style Assertions](explanation/tiger-style.md) — Assertions as executable documentation
- [Task Discovery](explanation/task-discovery.md) — Auto-discovery: drop a file, it runs
- [Dry Run Design](explanation/dry-run-design.md) — Safe exploration through `ctx.dryRun`
- [Verification Philosophy](explanation/verification-philosophy.md) — Catching installation drift

### [Reference](reference/)

*Information-oriented* — Technical descriptions for lookup.

- [CLI Commands](reference/cli-commands.md) — `run`, `sync`, flags, environment variables
- [Task Interface](reference/task-interface.md) — `Task`, `TaskContext`, `run()`, `verify()`, `dependsOn`
- [Shell Utilities](reference/shell-utilities.md) — `apt()`, `gitClone()`, `cargoInstall()`, etc.
- [File System Utilities](reference/fs-utilities.md) — `copyFile()`, `mkdir()`, `writeFile()`, dangerous path protection
- [Verification Utilities](reference/verify-utilities.md) — `assertCommand()`, `assertDir()`, `assertFile()`
- [env/ Directory Structure](reference/env-directory.md) — Configuration files and sync mapping

### [How-to Guides](how-to/)

*Task-oriented* — Practical recipes for specific goals.

- [Add an APT Package](how-to/add-apt-package.md) — Install system packages
- [Add a Cargo Tool](how-to/add-cargo-tool.md) — Install Rust-based CLI tools
- [Add a Git Repository](how-to/add-git-repo.md) — Clone repos to managed locations
- [Add Configuration Sync](how-to/add-config-sync.md) — Sync dotfiles and configs
- [Manage Secrets](how-to/manage-secrets.md) — Store API tokens and SSH keys securely
- [Test Tasks Locally](how-to/test-task-locally.md) — Dry run and Docker testing
- [Add Verification](how-to/add-verification.md) — Confirm installations succeeded

### [Tutorials](tutorials/)

*Learning-oriented* — Hands-on lessons for getting started.

- [Getting Started](tutorials/getting-started.md) — First-run experience
- [Your First Task](tutorials/first-task.md) — Create a task from scratch
- [Customizing Configs](tutorials/customizing-configs.md) — Add and sync your dotfiles

## Project Structure

```
src/
  cli.ts              # CLI entry point
  commands/
    run.ts            # Task discovery and execution
    sync.ts           # Configuration synchronization
  lib/
    assert.ts         # Tiger Style assertions
    config.ts         # TaskContext and environment
    deps.ts           # Task dependency resolution
    fs.ts             # File system utilities
    shell.ts          # Shell command utilities
    verify.ts         # Verification utilities
  tasks/              # Setup tasks (auto-discovered)
    volta.ts          # Installs Volta, Node LTS, pnpm
    node.ts           # Installs Deno and Bun
    rust.ts           # Installs Rust toolchain
    neovim.ts         # Builds Neovim from source
    sops.ts           # Installs SOPS + age for secrets
    dotenvx.ts        # Installs dotenvx for API tokens
    secrets.ts        # Decrypts and installs SSH keys
    ...

env/                  # Configuration files to sync
  .config/            # -> ~/.config
  .local/             # -> ~/.local
  .zshrc              # -> ~/.zshrc
  ...

secrets/              # Encrypted secrets (SOPS + age)
  ssh.enc.yaml        # SSH keys (encrypted)

.env                  # API tokens (encrypted with dotenvx)
.sops.yaml            # SOPS configuration
```

## Philosophy

This project embodies several principles from ThePrimeagen's Dev Productivity course:

1. **Productivity as the only goal** — No "ricing" for aesthetics; every decision optimizes for getting work done faster
2. **Ownership over complexity** — A custom Deno script you understand beats Ansible/Nix you don't
3. **Reproducibility** — Clone and run, identical environment, no day of patching holes
4. **Tool mastery compounds** — Understanding what tools can do pays dividends over a 20-year career
5. **Joy of improvement** — Making your environment better keeps you engaged as a developer
