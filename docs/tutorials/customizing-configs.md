# Customizing Configs

This tutorial walks you through adding your own configuration files to be synced across machines.

## Prerequisites

- Completed [Getting Started](getting-started.md)
- A configuration file you want to manage

## What We'll Do

We'll add a custom `.gitconfig` file to the sync system, so it deploys to every machine where you run `deno task sync`.

## Step 1: Create the Config File

First, create or copy your gitconfig to the `env/` directory:

```bash
# Copy existing config
cp ~/.gitconfig env/.gitconfig

# Or create from scratch
cat > env/.gitconfig << 'EOF'
[user]
    name = Your Name
    email = your.email@example.com

[core]
    editor = nvim

[alias]
    st = status
    co = checkout
    br = branch
    ci = commit
    lg = log --oneline --graph --all

[init]
    defaultBranch = main

[pull]
    rebase = true
EOF
```

## Step 2: Add to Sync Command

Edit `src/commands/sync.ts` to include the new file:

```typescript
const dotfiles = [
  ".zshrc",
  ".zsh_profile",
  ".xprofile",
  ".tmux-sessionizer",
  ".gitconfig",  // Add this line
];
```

Find the `dotfiles` array in the file and add your new file.

## Step 3: Preview the Sync

```bash
deno task sync --dry
```

Look for your file in the output:

```
[TASK] Syncing dotfiles
[INFO] Copy env/.gitconfig -> ~/.gitconfig
[DRY] cp env/.gitconfig -> ~/.gitconfig
```

## Step 4: Run the Sync

```bash
deno task sync
```

## Step 5: Verify

```bash
cat ~/.gitconfig
git config --list
```

Your config is now deployed.

## Adding a .config Directory

For tools that use `~/.config/`, the process is even simpler.

### Example: Add Starship Prompt Config

#### Step 1: Create the Directory

```bash
mkdir -p env/.config/starship
```

#### Step 2: Add Your Config

```bash
cat > env/.config/starship/starship.toml << 'EOF'
# Minimal prompt
format = """
$directory\
$git_branch\
$git_status\
$character"""

[character]
success_symbol = "[➜](bold green)"
error_symbol = "[✗](bold red)"

[directory]
truncation_length = 3
truncate_to_repo = true

[git_branch]
symbol = " "
EOF
```

#### Step 3: Sync

```bash
deno task sync
```

That's it! The `.config/` directory is automatically synced. Any subdirectory you add to `env/.config/` will be copied to `~/.config/`.

## Adding .local Files

For files in `~/.local/`:

```bash
# Create structure
mkdir -p env/.local/share/applications

# Add a .desktop file
cat > env/.local/share/applications/my-app.desktop << 'EOF'
[Desktop Entry]
Name=My App
Exec=/usr/local/bin/my-app
Type=Application
EOF

# Sync
deno task sync
```

## Complete Example: Neovim Config

Let's add a complete Neovim configuration.

### Step 1: Create Directory Structure

```bash
mkdir -p env/.config/nvim/lua
```

### Step 2: Add init.lua

```bash
cat > env/.config/nvim/init.lua << 'EOF'
-- Basic settings
vim.opt.number = true
vim.opt.relativenumber = true
vim.opt.tabstop = 2
vim.opt.shiftwidth = 2
vim.opt.expandtab = true
vim.opt.smartindent = true

-- Leader key
vim.g.mapleader = " "

-- Key mappings
vim.keymap.set("n", "<leader>w", ":w<CR>")
vim.keymap.set("n", "<leader>q", ":q<CR>")

-- Load modules
require("config.options")
require("config.keymaps")
EOF
```

### Step 3: Add Modules

```bash
mkdir -p env/.config/nvim/lua/config

cat > env/.config/nvim/lua/config/options.lua << 'EOF'
-- Additional options
vim.opt.termguicolors = true
vim.opt.scrolloff = 8
vim.opt.signcolumn = "yes"
EOF

cat > env/.config/nvim/lua/config/keymaps.lua << 'EOF'
-- Additional keymaps
local keymap = vim.keymap.set

-- Window navigation
keymap("n", "<C-h>", "<C-w>h")
keymap("n", "<C-j>", "<C-w>j")
keymap("n", "<C-k>", "<C-w>k")
keymap("n", "<C-l>", "<C-w>l")
EOF
```

### Step 4: Sync and Test

```bash
deno task sync
nvim  # Test your config
```

## Workflow Best Practices

### Always Edit in env/

Never edit synced files directly in your home directory. They'll be overwritten on next sync.

```bash
# Wrong
vim ~/.config/nvim/init.lua

# Right
vim env/.config/nvim/init.lua
deno task sync
```

### Commit Your Changes

The whole point is reproducibility:

```bash
git add env/
git commit -m "Add starship config"
git push
```

### Test Before Committing

```bash
deno task sync --dry   # Preview
deno task sync         # Apply
# Test the tool works
git diff               # Review changes
git add env/
git commit -m "Update config"
```

## Handling Secrets

Don't commit secrets. Options:

### Option 1: Gitignore

```bash
echo "env/.config/mytool/secrets.json" >> .gitignore
```

### Option 2: Template Files

Create a template and ignore the real file:

```bash
# Committed template
cat > env/.config/mytool/config.template.json << 'EOF'
{
  "api_key": "YOUR_API_KEY_HERE"
}
EOF

# Gitignore the real file
echo "env/.config/mytool/config.json" >> .gitignore
```

### Option 3: Environment Variables

Configure tools to read from environment instead of files.

## Summary

| Config Type | Location | Sync Behavior |
|-------------|----------|---------------|
| Dotfiles (`.gitconfig`, `.zshrc`) | `env/.filename` | Must be added to `dotfiles` array |
| .config directories | `env/.config/toolname/` | Auto-synced (no code change) |
| .local files | `env/.local/...` | Auto-synced (no code change) |

## Next Steps

- Read [How to Add Configuration Sync](../how-to/add-config-sync.md) for more patterns
- Explore [env/ Directory Structure](../reference/env-directory.md) reference
- Learn about [Verification](../how-to/add-verification.md) to confirm syncs work
