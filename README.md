# dev-env

A Deno-based development environment manager.

## The Problem

Setting up a new development machine is painful. You spend hours—sometimes days—installing tools, copying dotfiles, configuring editors, and chasing down missing dependencies. Even then, something's always slightly off. Your new machine never quite feels like your old one.

And when you need to set up a second machine? You do it all over again, forgetting half the steps.

## The Solution

Clone this repo. Run one command. Done. *(Ubuntu only)*

```bash
git clone <repo-url> ~/dev-env
cd ~/dev-env

# Install all tools for your stack
deno task run -s larr     # or: deno task run -s primeagen

# Sync all configs
deno task sync -s larr    # or: deno task sync -s primeagen
```

Every tool installed. Every config in place. Every machine identical.

**Available stacks:**
- `larr` - Modern development stack (32 tasks)
- `primeagen` - ThePrimeagen-inspired stack (29 tasks)

## What You Get

- **Reproducible environments** — Same setup on any machine, every time
- **Encrypted secrets** — API keys and SSH keys stored safely in git
- **Dry-run mode** — Preview changes before making them
- **Auto-discovery** — Drop a task file, it just works
- **Full ownership** — TypeScript you can read and modify, not magic you don't understand

## Quick Start

```bash
# Preview what will be installed (safe, makes no changes)
deno task run -s larr --dry

# Run specific tasks
deno task run -s larr rust neovim docker

# Sync dotfiles and configs
deno task sync -s larr

# Test a task in Docker (for development)
make test STACK=larr TASK=zsh
```

## Available Tasks

Tasks common to both stacks:

| Task | Description |
|------|-------------|
| `rust` | Rust toolchain via rustup |
| `docker` | Docker and docker-compose |
| `neovim` | Neovim editor |
| `zsh` | Zsh with plugins |
| `tmux` | Tmux terminal multiplexer |
| `volta` | JavaScript toolchain manager |
| `sops` | SOPS + age for secrets |
| `dotenvx` | dotenvx for API tokens |
| `gitleaks` | Secret scanning |
| `ghostty` | Ghostty terminal emulator |

See [task-discovery.md](docs/explanation/task-discovery.md) for complete task lists.

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
