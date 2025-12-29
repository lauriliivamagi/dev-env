# env/ Directory Structure

Reference for the configuration files in the `env/` directory and how they sync to the home directory.

## Overview

The `env/` directory contains configuration files that get synchronized to the user's home directory via `deno task sync`.

```
env/
├── .config/          # XDG config directory contents
│   ├── ghostty/      # Terminal emulator config
│   ├── i3/           # i3 window manager config
│   ├── nvim/         # Neovim configuration
│   ├── rofi/         # Application launcher config
│   └── ...
├── .local/           # XDG local directory contents
│   └── share/
│       └── rofi/
├── .zshrc            # Zsh configuration
├── .zsh_profile      # Zsh profile
├── .xprofile         # X11 session profile
├── .tmux-sessionizer # tmux sessionizer script
└── .profile          # Shell profile
```

## Sync Mapping

| Source | Destination |
|--------|-------------|
| `env/.config/*` | `~/.config/` (or `$XDG_CONFIG_HOME`) |
| `env/.local/*` | `~/.local/` |
| `env/.zshrc` | `~/.zshrc` |
| `env/.zsh_profile` | `~/.zsh_profile` |
| `env/.xprofile` | `~/.xprofile` |
| `env/.tmux-sessionizer` | `~/.tmux-sessionizer` |

## .config/ Directory

Contents of `env/.config/` are synced to `~/.config/` (or `$XDG_CONFIG_HOME`).

Each subdirectory is synced as a unit:
- Existing destination directory is removed
- Source directory is copied in its place

### Example Contents

```
.config/
├── ghostty/
│   └── config              # Ghostty terminal config
├── i3/
│   └── config              # i3 window manager config
├── nvim/
│   ├── init.lua            # Neovim entry point
│   └── lua/
│       └── ...             # Lua modules
├── rofi/
│   ├── config.rasi         # Rofi config
│   └── themes/
│       └── ...
├── tmux/
│   └── tmux.conf           # tmux configuration (includes TPM plugins)
├── tmuxinator/
│   └── dev.yml             # tmuxinator session templates
└── zed/
    └── settings.json       # Zed editor settings
```

## .local/ Directory

Contents of `env/.local/` sync to `~/.local/`.

```
.local/
├── scripts/                # Custom utility scripts
│   ├── cht                 # Quick cht.sh cheatsheet wrapper
│   ├── gw                  # Git worktree add helper
│   ├── gwl                 # Git worktree list with fzf
│   ├── tmux-sessionizer    # tmux session navigation
│   └── ...                 # Other utility scripts
└── share/
    └── rofi/
        └── themes/         # Rofi themes
```

### Scripts

The `env/.local/scripts/` directory contains utility scripts synced to `~/.local/scripts/`.

| Script | Purpose |
|--------|---------|
| `cht` | Quick wrapper for cht.sh cheatsheet lookups (`cht js/array`) |
| `gw` | Git worktree add helper - creates worktree for a branch |
| `gwl` | Git worktree list with fzf selection |
| `tmux-sessionizer` | Navigate tmux sessions with fzf |

Ensure `~/.local/scripts` is in your `$PATH`:
```bash
export PATH="$HOME/.local/scripts:$PATH"
```

## Dotfiles

Individual dotfiles in `env/` are copied to the home directory:

### .zshrc

Main Zsh configuration. Sourced for interactive shells.

**Plugins configured:**
- `git` — Git aliases and completion
- `asdf` — Version manager integration
- `zsh-autosuggestions` — Fish-like autosuggestions as you type
- `zsh-syntax-highlighting` — Syntax highlighting for commands

```bash
# Example contents
plugins=(git asdf zsh-autosuggestions zsh-syntax-highlighting)

export EDITOR=nvim
export PATH="$HOME/.local/bin:$PATH"

# Aliases
alias vim=nvim
alias ll='ls -la'

# Source profile
source ~/.zsh_profile
```

Note: The `zsh-autosuggestions` and `zsh-syntax-highlighting` plugins are installed by the `zsh` task to `~/.oh-my-zsh/custom/plugins/`.

**Shell integrations configured:**

| Tool | Keybindings | Description |
|------|-------------|-------------|
| fzf | `Ctrl-R` | Fuzzy search command history |
| fzf | `Ctrl-T` | Fuzzy find files |
| fzf | `Alt-C` | Fuzzy find and cd to directory |
| zoxide | `z <dir>` | Smart cd that learns your habits |
| zoxide | `zi <dir>` | Interactive directory selection |

Note: Install `zoxide` task for smart cd functionality.

### .zsh_profile

Zsh profile for environment setup.

```bash
# PATH additions
export PATH="$HOME/.cargo/bin:$PATH"
export PATH="$HOME/go/bin:$PATH"

# FZF configuration
export FZF_DEFAULT_COMMAND='rg --files'
```

### .xprofile

X11 session initialization. Runs when starting X.

```bash
# Keyboard settings
setxkbmap -option caps:escape

# Start compositor
picom &
```

### .tmux-sessionizer

Script for tmux session management.

```bash
#!/usr/bin/env bash
# tmux sessionizer script
# See docs/explanation/navigation.md
```

### .config/tmux/tmux.conf

Tmux configuration with TPM (Tmux Plugin Manager) integration.

**Plugins configured:**
- `tmux-plugins/tpm` — Plugin manager
- `tmux-plugins/tmux-resurrect` — Persist tmux sessions across restarts
- `tmux-plugins/tmux-continuum` — Automatic session saving

**Key bindings:**
- `Ctrl-a` — Prefix (remapped from `Ctrl-b`)
- `prefix + I` — Install TPM plugins (run after first sync)
- `prefix + C-f` — Open tmux-sessionizer
- `prefix + h/j/k/l` — Vim-like pane navigation

Note: TPM is installed by the `tmux` task to `~/.tmux/plugins/tpm`. After syncing, run `prefix + I` in tmux to install plugins.

### .config/tmuxinator/

Tmuxinator session templates for declarative tmux session management.

**Usage:**
```bash
tmuxinator start dev     # Start the 'dev' session from dev.yml
tmuxinator new project   # Create a new project template
tmuxinator list          # List all available projects
```

**Example template (dev.yml):**
```yaml
name: dev
root: ~/projects/myapp

windows:
  - editor:
      layout: main-vertical
      panes:
        - nvim
        - # shell for commands
  - server:
      panes:
        - npm run dev
  - git:
      panes:
        - git status
```

Note: Install the `tmuxinator` task for this functionality.

## Sync Command Behavior

The `sync` command (`src/commands/sync.ts`):

1. **Syncs .config directories:**
   ```typescript
   await fs.syncConfigDir(
     ctx,
     join(envDir, ".config"),
     ctx.configHome,
   );
   ```

2. **Syncs .local directories:**
   ```typescript
   await fs.syncConfigDir(
     ctx,
     join(envDir, ".local"),
     join(ctx.home, ".local"),
   );
   ```

3. **Copies dotfiles:**
   ```typescript
   const dotfiles = [
     ".zshrc",
     ".zsh_profile",
     ".xprofile",
     ".tmux-sessionizer",
   ];

   for (const dotfile of dotfiles) {
     await fs.copyFile(ctx, src, dest);
   }
   ```

4. **Syncs scripts:**
   ```typescript
   await fs.mkdir(ctx, join(ctx.home, ".local", "scripts"));
   // Copy scripts...
   ```

5. **Reloads window manager (if available):**
   ```typescript
   await runOrFail(ctx, ["hyprctl", "reload"]);
   ```

## Adding New Configs

### Add to .config/

1. Create directory in `env/.config/`:
   ```bash
   mkdir -p env/.config/newtool
   ```

2. Add configuration files:
   ```bash
   cp ~/.config/newtool/config.toml env/.config/newtool/
   ```

3. Run sync:
   ```bash
   deno task sync
   ```

The directory will be synced automatically—`syncConfigDir` iterates all subdirectories.

### Add a Dotfile

1. Add file to `env/`:
   ```bash
   cp ~/.mytoolrc env/.mytoolrc
   ```

2. Update sync command in `src/commands/sync.ts`:
   ```typescript
   const dotfiles = [
     ".zshrc",
     ".zsh_profile",
     ".xprofile",
     ".tmux-sessionizer",
     ".mytoolrc",  // Add new file
   ];
   ```

3. Run sync:
   ```bash
   deno task sync
   ```

## Dry Run Preview

Preview what would be synced:

```bash
deno task sync --dry
```

Output:
```
[TASK] Syncing .config
[DRY] sync env/.config -> ~/.config
[TASK] Syncing .local
[DRY] sync env/.local -> ~/.local
[TASK] Syncing dotfiles
[INFO] Copy env/.zshrc -> ~/.zshrc
[DRY] cp env/.zshrc -> ~/.zshrc
...
```

## Caveats

### Destructive Sync

`syncConfigDir` removes existing destination directories before copying. If you have local changes in `~/.config/nvim/`, they will be lost.

**Workflow:** Make changes in `env/`, then sync. Never edit synced files directly in `~/.config/`.

### Missing Files

If a dotfile doesn't exist in `env/`, sync logs a warning and continues:

```
[WARN] Dotfile not found: .mytoolrc
```

### Permissions

Synced files inherit default permissions. Scripts that need execute permission should be handled explicitly:

```typescript
await fs.copyFile(ctx, src, dest);
await runOrFail(ctx, ["chmod", "+x", dest]);
```
