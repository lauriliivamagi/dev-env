# dev-env

A Deno-based development environment manager.

## The Problem

Setting up a new development machine is painful. You spend hours—sometimes days—installing tools, copying dotfiles, configuring editors, and chasing down missing dependencies. Even then, something's always slightly off. Your new machine never quite feels like your old one.

And when you need to set up a second machine? You do it all over again, forgetting half the steps.

## The Solution

Clone this repo. Run one command. Done. *(Ubuntu only)*

```bash
git clone <repo-url> ~/dev
cd ~/dev

# Install all tools
deno task run

# Sync all configs
deno task sync
```

Every tool installed. Every config in place. Every machine identical.

## What You Get

- **Reproducible environments** — Same setup on any machine, every time
- **Encrypted secrets** — API keys and SSH keys stored safely in git
- **Dry-run mode** — Preview changes before making them
- **Auto-discovery** — Drop a task file, it just works
- **Full ownership** — TypeScript you can read and modify, not magic you don't understand

## Quick Start

```bash
# Preview what will be installed (safe, makes no changes)
deno task run --dry

# Run specific tasks
deno task run rust node neovim

# Sync dotfiles and configs
deno task sync

# Test all tasks in Docker (for development)
make test-all
```

## Available Tasks

| Task | Description |
|------|-------------|
| `rust` | Rust toolchain via rustup |
| `node` | Node.js, npm, Deno, Bun |
| `neovim` | Neovim from source |
| `docker` | Docker and docker-compose |
| `zsh` | Zsh with plugins |
| `tmux` | Tmux with config |
| `sops` | SOPS + age for secrets |
| `dotenvx` | dotenvx for API tokens |
| `gitleaks` | Secret scanning |
| ... | [See all tasks](docs/reference/cli-commands.md) |

## Secrets Management

Secrets are encrypted and safe to commit:

```bash
# Install encryption tools
deno task run sops dotenvx gitleaks git-hooks

# API tokens (dotenvx)
cp .env.example .env
# Add your keys, then encrypt
dotenvx encrypt

# SSH keys (SOPS + age)
sops secrets/ssh.enc.yaml
deno task run secrets
```

See [Managing Secrets](docs/how-to/manage-secrets.md) for the complete guide.

## Documentation

Full documentation in [`docs/`](docs/index.md):

- **[Tutorials](docs/tutorials/)** — Getting started, first task, customizing configs
- **[How-to Guides](docs/how-to/)** — Add packages, manage secrets, test locally
- **[Reference](docs/reference/)** — CLI commands, utilities, interfaces
- **[Explanation](docs/explanation/)** — Design rationale, philosophy

## Philosophy

1. **Productivity over aesthetics** — Every decision optimizes for getting work done
2. **Ownership over complexity** — Code you understand beats tools you don't
3. **Reproducibility** — Clone and run, no day of patching holes
4. **Tool mastery compounds** — Understanding your tools pays dividends over a career

## License

MIT
