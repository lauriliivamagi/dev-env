# How to Manage Secrets

Store and sync API tokens and SSH keys securely across machines.

## Overview

This project uses two tools for different secret types:

| Tool | Use Case | Files |
|------|----------|-------|
| **dotenvx** | API tokens, env vars | `.env` (encrypted) |
| **SOPS + age** | SSH keys, certs, binary files | `secrets/*.enc.yaml` |

Both tools encrypt secrets so they can be safely committed to git.

## Prerequisites

Install the encryption and protection tools:

```bash
deno task run -s primeagen sops dotenvx gitleaks git-hooks
```

This installs:
- **sops + age** — Encrypt SSH keys and binary secrets
- **dotenvx** — Encrypt API tokens in `.env` files
- **gitleaks** — Scan for secrets before commits
- **git-hooks** — Install the pre-commit hook

## Managing API Tokens (dotenvx)

### Initial Setup

1. **Copy the template:**
   ```bash
   cp .env.example .env
   ```

2. **Add your API keys:**
   ```bash
   # Edit .env with your actual keys
   OPENAI_API_KEY=sk-...
   ANTHROPIC_API_KEY=sk-ant-...
   ```

3. **Encrypt the file:**
   ```bash
   dotenvx encrypt
   ```

4. **Commit the encrypted file:**
   ```bash
   git add .env
   git commit -m "Add encrypted API tokens"
   ```

The `.env` file is now encrypted and safe to share.

### Adding a New Token

```bash
dotenvx set NEW_API_KEY "sk-new-key-value"
git add .env && git commit -m "Add NEW_API_KEY"
```

### Loading Tokens

Tokens are loaded automatically via `.zsh_profile` when dotenvx is installed. For manual loading:

```bash
# Run a command with secrets injected
dotenvx run -- deno task run

# Export to current shell
eval "$(dotenvx get --format shell)"
```

### Sharing the Private Key

The private key is stored in `.env.keys` (gitignored). Share it securely:

```bash
# Get the private key
cat .env.keys | grep DOTENV_PRIVATE_KEY
```

On a new machine:
```bash
echo 'DOTENV_PRIVATE_KEY="..."' > .env.keys
```

## Managing SSH Keys (SOPS + age)

### Initial Setup

1. **Generate an age keypair:**
   ```bash
   age-keygen -o ~/.config/sops/age/keys.txt
   ```

2. **Get your public key:**
   ```bash
   grep "public key" ~/.config/sops/age/keys.txt
   # Output: # public key: age1xxxxxxxxxx...
   ```

3. **Update `.sops.yaml`** with your public key:
   ```yaml
   creation_rules:
     - path_regex: secrets/.*\.enc\.yaml$
       age: >-
         age1your-public-key-here
   ```

4. **Create the secrets file:**
   ```bash
   cp stacks/primeagen/secrets/ssh.enc.yaml.example stacks/primeagen/secrets/ssh.enc.yaml
   ```

5. **Add your SSH keys** (edit the file):
   ```yaml
   ssh_keys:
     id_ed25519: |
       -----BEGIN OPENSSH PRIVATE KEY-----
       your-actual-key-content
       -----END OPENSSH PRIVATE KEY-----
     id_ed25519.pub: |
       ssh-ed25519 AAAA... user@host
   ```

6. **Encrypt the file:**
   ```bash
   sops -e -i stacks/primeagen/secrets/ssh.enc.yaml
   ```

7. **Commit the encrypted file:**
   ```bash
   git add stacks/primeagen/secrets/ssh.enc.yaml
   git commit -m "Add encrypted SSH keys"
   ```

### Installing SSH Keys

```bash
deno task run -s primeagen secrets
```

This decrypts the keys and installs them to `~/.ssh/` with correct permissions:
- Private keys: `600`
- Public keys: `644`

### Editing SSH Keys

```bash
# Opens decrypted in $EDITOR, re-encrypts on save
sops stacks/primeagen/secrets/ssh.enc.yaml

# Re-install after editing
deno task run -s primeagen secrets
```

### Adding a New SSH Key

Edit the encrypted file:

```bash
sops stacks/primeagen/secrets/ssh.enc.yaml
```

Add the new key:

```yaml
ssh_keys:
  id_ed25519: |
    ...existing key...
  id_github: |
    -----BEGIN OPENSSH PRIVATE KEY-----
    new-key-content
    -----END OPENSSH PRIVATE KEY-----
  id_github.pub: |
    ssh-ed25519 AAAA... github-key
```

Save and re-install:

```bash
deno task run -s primeagen secrets
```

### Sharing the age Private Key

The private key is at `~/.config/sops/age/keys.txt`. Share it securely (1Password, Signal, etc.).

On a new machine:
```bash
mkdir -p ~/.config/sops/age
# Paste the key to ~/.config/sops/age/keys.txt
```

## Setting Up a New Machine

```bash
# 1. Clone the repo
git clone <repo-url>
cd dev-env

# 2. Install tools
deno task run -s primeagen sops dotenvx

# 3. Set up age key (get from secure channel)
mkdir -p ~/.config/sops/age
echo "AGE-SECRET-KEY-1..." > ~/.config/sops/age/keys.txt

# 4. Set up dotenvx key (get from secure channel)
echo 'DOTENV_PRIVATE_KEY="..."' > .env.keys

# 5. Install SSH keys
deno task run -s primeagen secrets

# 6. Source your profile (or open new terminal)
source ~/.zsh_profile
```

## Security Notes

### What's Safe to Commit

| File | Safe? | Reason |
|------|-------|--------|
| `.env` | Yes | Encrypted by dotenvx |
| `secrets/*.enc.yaml` | Yes | Encrypted by SOPS |
| `.env.keys` | **No** | Contains decryption key |
| `secrets/*.yaml` (unencrypted) | **No** | Contains plaintext secrets |
| `~/.config/sops/age/keys.txt` | **No** | Contains age private key |

### Gitignore Protection

The `.gitignore` blocks unencrypted secrets:

```gitignore
.env.keys
secrets/*.yaml
!secrets/*.enc.yaml
!secrets/*.enc.yaml.example
```

### Gitleaks Pre-commit Protection

A pre-commit hook scans for secrets before each commit:

```bash
# Install gitleaks and the hook
deno task run -s primeagen gitleaks git-hooks
```

The hook runs `gitleaks protect --staged` to scan staged files. If secrets are detected:

```
$ git commit -m "Add feature"
[pre-commit] Scanning for secrets...

============================================
  COMMIT BLOCKED: Secrets detected!
============================================

Options:
  1. Remove the secret from the file
  2. Use dotenvx/SOPS to encrypt it
  3. Add to .gitleaks.toml allowlist (if false positive)
```

**Allowed files** (configured in `.gitleaks.toml`):
- `.env` — dotenvx encrypted
- `secrets/*.enc.yaml` — SOPS encrypted
- `*.example` — Template files with placeholders

**Bypassing the hook** (use sparingly):

```bash
git commit --no-verify -m "Emergency commit"
```

### Key Rotation

To rotate keys:

```bash
# Rotate dotenvx key
dotenvx rotate

# For SOPS/age, generate a new keypair and re-encrypt
age-keygen -o new-keys.txt
# Update .sops.yaml with new public key
sops updatekeys secrets/ssh.enc.yaml
```

## Troubleshooting

### "Failed to decrypt"

Check that your private key is in place:

```bash
# For dotenvx
cat .env.keys

# For SOPS/age
cat ~/.config/sops/age/keys.txt
```

### SSH Key Permission Errors

Re-run the secrets task:

```bash
deno task run -s primeagen secrets
```

Or fix manually:

```bash
chmod 700 ~/.ssh
chmod 600 ~/.ssh/id_*
chmod 644 ~/.ssh/*.pub
```

### dotenvx Not Loading

Ensure dotenvx is installed and in PATH:

```bash
which dotenvx
# Should show: ~/.local/bin/dotenvx or similar
```

Check that `.zsh_profile` has the loading snippet:

```bash
grep dotenvx ~/.zsh_profile
```
