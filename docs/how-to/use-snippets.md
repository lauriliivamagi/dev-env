# How to Use Snippets

Set up clipboard-based text expansion with fzf for quick insertion of frequently used text.

## Overview

The snippets feature provides:
- **Encrypted storage** — Personal info stored securely in SOPS-encrypted files
- **fzf picker** — Quick fuzzy search via keyboard shortcut (Ctrl+Insert)
- **Clipboard-based** — Works reliably on GNOME Wayland (copies to clipboard, paste with Ctrl+V)
- **Dynamic content** — Supports date/time stamps that evaluate at runtime

## Prerequisites

```bash
# Install dependencies (fzf, wl-clipboard, sops)
deno task run -s larr fzf sops
```

## Initial Setup

1. **Copy the template:**
   ```bash
   cp stacks/larr/secrets/wtype.enc.yaml.example stacks/larr/secrets/wtype.enc.yaml
   ```

2. **Edit with your values:**
   ```bash
   # Edit the unencrypted file
   nano stacks/larr/secrets/wtype.enc.yaml
   ```

   Example content:
   ```yaml
   snippets:
     name.txt: Your Name
     email.txt: your@email.com
     phone.txt: "+1234567890"
     date.txt: "$(date +%Y-%m-%d)"
     timestamp.txt: "$(date +%Y-%m-%dT%H:%M:%S)"
     signature.txt: |
       Kind regards,
       Your Name
       Your Title
   ```

3. **Encrypt the file:**
   ```bash
   sops -e -i stacks/larr/secrets/wtype.enc.yaml
   ```

4. **Install snippets and keyboard shortcut:**
   ```bash
   deno task run -s larr wtype
   ```

## Usage

1. Press **Ctrl+Insert** — Opens fzf picker in a terminal
2. Type to filter, select with Enter
3. Press **Ctrl+V** — Paste the snippet

A notification confirms when the snippet is copied to clipboard.

## Managing Snippets

### Adding a New Snippet

```bash
# Edit the encrypted file
sops stacks/larr/secrets/wtype.enc.yaml
```

Add your new snippet:
```yaml
snippets:
  name.txt: Your Name
  email.txt: your@email.com
  new-snippet.txt: Your new snippet text    # ← Add here
```

Save and re-install:
```bash
deno task run -s larr wtype
```

### Removing a Snippet

1. Edit and remove the key from `wtype.enc.yaml`
2. Run `deno task run -s larr wtype`

The corresponding `.txt` file is automatically deleted.

### Editing a Snippet

```bash
sops stacks/larr/secrets/wtype.enc.yaml   # Edit values
deno task run -s larr wtype               # Re-install
```

## Dynamic Snippets

Use shell command substitution for dynamic content:

| Snippet | Format | Example Output |
|---------|--------|----------------|
| ISO date | `$(date +%Y-%m-%d)` | 2026-01-01 |
| ISO timestamp | `$(date +%Y-%m-%dT%H:%M:%S)` | 2026-01-01T14:30:45 |
| Timestamp with TZ | `$(date +%Y-%m-%dT%H:%M:%S%z)` | 2026-01-01T14:30:45+0200 |
| Week number | `$(date +%Y-W%V)` | 2026-W01 |
| RFC 3339 | `$(date --rfc-3339=seconds)` | 2026-01-01 14:30:45+02:00 |

## How It Works

1. **Secrets file** (`wtype.enc.yaml`) stores snippet text encrypted with SOPS
2. **Task** (`wtype.ts`) decrypts and writes `.txt` files to `~/.local/bin/snippets/`
3. **Picker script** (`picker.sh`) uses fzf to list snippets and wl-copy for clipboard
4. **Keyboard shortcut** (Ctrl+Insert) launches picker in ghostty terminal

Files:
```
~/.local/bin/snippets/
├── picker.sh          # fzf picker script
├── name.txt           # Snippet content
├── email.txt
├── date.txt           # Dynamic: $(date +%Y-%m-%d)
└── ...
```

## Customizing the Keyboard Shortcut

The default is **Ctrl+Insert**. To change it:

```bash
# View current binding
gsettings get "org.gnome.settings-daemon.plugins.media-keys.custom-keybinding:/org/gnome/settings-daemon/plugins/media-keys/custom-keybindings/snippet-picker/" binding

# Change binding (example: Ctrl+Shift+S)
gsettings set "org.gnome.settings-daemon.plugins.media-keys.custom-keybinding:/org/gnome/settings-daemon/plugins/media-keys/custom-keybindings/snippet-picker/" binding "<Control><Shift>s"
```

## Troubleshooting

### Shortcut Doesn't Work

Check that the shortcut is registered:
```bash
gsettings get org.gnome.settings-daemon.plugins.media-keys custom-keybindings
# Should include: .../snippet-picker/
```

### fzf Doesn't Show Snippets

Verify snippets are installed:
```bash
ls ~/.local/bin/snippets/*.txt
```

If empty, re-run:
```bash
deno task run -s larr wtype
```

### Clipboard Not Working

Test wl-copy directly:
```bash
echo "test" | wl-copy
# Then Ctrl+V to paste
```

If it fails, ensure wl-clipboard is installed:
```bash
sudo apt install wl-clipboard
```

### Dynamic Dates Not Expanding

The `$(...)` syntax is evaluated when copying. Check the picker script:
```bash
cat ~/.local/bin/snippets/picker.sh
```

The `eval` line should handle command substitution.
