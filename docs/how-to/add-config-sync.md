# How to Add Configuration Sync

Add dotfiles and configuration directories to be synced by `deno task sync`.

## Quick Patterns

### Add a .config Directory

1. Create directory in `env/.config/`:
   ```bash
   mkdir -p env/.config/mytool
   ```

2. Add your config files:
   ```bash
   cp -r ~/.config/mytool/* env/.config/mytool/
   ```

3. Run sync:
   ```bash
   deno task sync
   ```

The directory syncs automatically—no code changes needed.

### Add a Dotfile

1. Copy file to `env/`:
   ```bash
   cp ~/.mytoolrc env/.mytoolrc
   ```

2. Add to sync list in `src/commands/sync.ts`:
   ```typescript
   const dotfiles = [
     ".zshrc",
     ".zsh_profile",
     ".xprofile",
     ".tmux-sessionizer",
     ".mytoolrc",  // Add this line
   ];
   ```

3. Run sync:
   ```bash
   deno task sync
   ```

## How Sync Works

### .config Directories

The `syncConfigDir()` function handles all subdirectories automatically:

```typescript
// From src/commands/sync.ts
await fs.syncConfigDir(
  ctx,
  join(envDir, ".config"),
  ctx.configHome,
);
```

This iterates over `env/.config/*` and copies each subdirectory to `~/.config/`.

**Example:**
```
env/.config/nvim/     → ~/.config/nvim/
env/.config/ghostty/  → ~/.config/ghostty/
env/.config/i3/       → ~/.config/i3/
```

### Individual Dotfiles

Dotfiles are explicitly listed and copied one by one:

```typescript
const dotfiles = [
  ".zshrc",
  ".zsh_profile",
  ".xprofile",
  ".tmux-sessionizer",
];

for (const dotfile of dotfiles) {
  const src = join(envDir, dotfile);
  const dest = join(ctx.home, dotfile);
  await fs.copyFile(ctx, src, dest);
}
```

## Step-by-Step: Add a Tool Config

### 1. Create the Source Directory

```bash
mkdir -p env/.config/alacritty
```

### 2. Add Configuration Files

```bash
# Copy existing config
cp ~/.config/alacritty/alacritty.toml env/.config/alacritty/

# Or create from scratch
cat > env/.config/alacritty/alacritty.toml << 'EOF'
[font]
size = 12.0

[font.normal]
family = "JetBrains Mono"
EOF
```

### 3. Preview the Sync

```bash
deno task sync --dry
```

### 4. Run the Sync

```bash
deno task sync
```

## Step-by-Step: Add a Dotfile

### 1. Add File to env/

```bash
cp ~/.gitconfig env/.gitconfig
```

### 2. Edit src/commands/sync.ts

```typescript
const dotfiles = [
  ".zshrc",
  ".zsh_profile",
  ".xprofile",
  ".tmux-sessionizer",
  ".gitconfig",  // Add new file
];
```

### 3. Sync

```bash
deno task sync
```

## Adding .local Files

For files in `~/.local/`:

```bash
mkdir -p env/.local/share/applications
cp ~/.local/share/applications/custom.desktop env/.local/share/applications/
```

These sync automatically via:

```typescript
await fs.syncConfigDir(
  ctx,
  join(envDir, ".local"),
  join(ctx.home, ".local"),
);
```

## Adding Scripts

For executable scripts that need special handling:

```typescript
// In src/commands/sync.ts
const scripts = [
  { src: "scripts/myscript", dest: ".local/bin/myscript" },
];

for (const { src, dest } of scripts) {
  const srcPath = join(ctx.devEnv, src);
  const destPath = join(ctx.home, dest);
  await fs.copyFile(ctx, srcPath, destPath);
  // Make executable if needed
  await runOrFail(ctx, ["chmod", "+x", destPath]);
}
```

## Complete Example: Adding tmux Config

### 1. Create Directory Structure

```bash
mkdir -p env/.config/tmux
```

### 2. Add Configuration

```bash
cat > env/.config/tmux/tmux.conf << 'EOF'
# Set prefix to Ctrl-a
unbind C-b
set-option -g prefix C-a
bind-key C-a send-prefix

# Split with | and -
bind | split-window -h
bind - split-window -v

# Vi keys
setw -g mode-keys vi

# Colors
set -g default-terminal "tmux-256color"
EOF
```

### 3. Verify with Dry Run

```bash
deno task sync --dry
# [INFO] Syncing config from /path/to/env/.config to ~/.config
# [SUCCESS] Synced tmux
```

### 4. Apply

```bash
deno task sync
tmux source-file ~/.config/tmux/tmux.conf
```

## Best Practices

### Keep env/ in Version Control

The whole point is reproducibility. Commit your changes:

```bash
git add env/.config/mytool/
git commit -m "Add mytool configuration"
```

### Don't Edit Synced Files Directly

Changes to `~/.config/mytool/` will be overwritten on next sync. Always edit in `env/`:

```bash
# Wrong
vim ~/.config/nvim/init.lua

# Right
vim env/.config/nvim/init.lua
deno task sync
```

### Handle Secrets Separately

Don't put secrets in env/:

```bash
# .gitignore
env/.config/mytool/secrets.json
```

Or use a separate secrets management approach.

### Test Before Committing

```bash
deno task sync --dry  # Preview
deno task sync        # Apply
# Test that the tool works
git add env/
git commit -m "Update configs"
```
