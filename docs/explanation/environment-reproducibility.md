# Environment Reproducibility

The core goal of this project: clone the repository, run one command, and have an identical development environment on any machine.

## The Problem

Most developers have experienced the pain of setting up a new machine:

> "A day getting ready to go followed by another couple days patching the holes."

This waste compounds over time. Every machine migration, every fresh install, every new laptop becomes a multi-day exercise in archaeology—hunting down that one package you forgot, that config option you customized months ago, that shell alias you can't live without.

## The Solution

Environment reproducibility treats your development setup like code:

- **Version controlled** — Your environment lives in a git repository
- **Executable** — Running `deno task run` installs everything
- **Declarative** — Tasks describe what should exist, not how to click through installers
- **Idempotent** — Run it again safely; it won't break what's already working

## What "Environment" Means

The scope extends beyond just installing packages:

| Category | Examples |
|----------|----------|
| System packages | `build-essential`, `curl`, `git` |
| Language toolchains | Rust, Node.js, Go |
| CLI tools | `fzf`, `ripgrep`, `jq`, `stylua` |
| Applications | Neovim, tmux, Ghostty |
| Shell configuration | `.zshrc`, `.zsh_profile`, aliases |
| Editor configuration | Neovim plugins, LSP settings |
| Window manager | i3, Hyprland configs |
| Desktop integration | keybindings, rofi themes |

## Trade-offs

### What Works Well

- **Ubuntu/Debian systems** — The `apt()` helper handles most system packages
- **Language-specific tools** — Cargo, npm, Go install patterns are well-supported
- **Configuration files** — The `sync` command handles dotfile management
- **Developer tools** — Building from source (Neovim, tmux) is straightforward

### What Requires Care

- **Cross-distro support** — Tasks assume apt-based systems; other package managers need different helpers
- **Hardware differences** — Some configs (display settings, keymaps) may need machine-specific overrides
- **Proprietary software** — License-based tools often can't be fully automated
- **Secrets** — SSH keys, API tokens require manual setup or secure vaults

## The Compound Effect

The real value isn't any single machine setup—it's the confidence to experiment. When you know you can reproduce your environment:

- You try new tools without fear of breaking things
- You upgrade aggressively because rollback is a fresh run
- You share configurations with colleagues knowing they'll work
- You spend time improving your environment instead of rebuilding it

This is why environment reproducibility is the foundation, not a feature.
