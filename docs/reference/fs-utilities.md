# File System Utilities

Reference for file system operations in `src/lib/fs.ts`.

## Overview

| Function | Purpose |
|----------|---------|
| `copyFile()` | Copy a single file |
| `copyDir()` | Copy a directory recursively |
| `remove()` | Remove a file or directory |
| `mkdir()` | Create a directory (and parents) |
| `writeFile()` | Write content to a file with optional permissions |
| `syncConfigDir()` | Synchronize directories |

## Safety Features

### Dangerous Path Protection

All operations block these paths:

```typescript
const DANGEROUS_PATHS = ["/", "/home", "/usr", "/etc", "/var", "/tmp"];
```

Attempting to operate on these paths throws an error:

```typescript
await remove(ctx, "/");
// Throws: Assertion failed: remove on dangerous path "/" is not allowed
```

### Path Validation

Empty paths are rejected:

```typescript
await copyFile(ctx, "", "/dest");
// Throws: Assertion failed: copyFile source path cannot be empty
```

## File Operations

### copyFile()

Copy a single file.

```typescript
async function copyFile(
  ctx: TaskContext,
  src: string,
  dest: string,
): Promise<void>
```

**Behavior:**
- Creates destination directory if needed
- Overwrites existing file
- Respects dry run mode

**Example:**
```typescript
await copyFile(
  ctx,
  `${ctx.devEnv}/env/.zshrc`,
  `${ctx.home}/.zshrc`,
);
```

### copyDir()

Copy a directory recursively.

```typescript
async function copyDir(
  ctx: TaskContext,
  src: string,
  dest: string,
): Promise<void>
```

**Behavior:**
- Removes destination if it exists
- Copies entire directory tree
- Respects dry run mode

**Example:**
```typescript
await copyDir(
  ctx,
  `${ctx.devEnv}/env/.config/nvim`,
  `${ctx.configHome}/nvim`,
);
```

### remove()

Remove a file or directory.

```typescript
async function remove(ctx: TaskContext, path: string): Promise<void>
```

**Behavior:**
- Recursive removal for directories
- No error if path doesn't exist
- Respects dry run mode

**Example:**
```typescript
await remove(ctx, `${ctx.home}/.cache/old-tool`);
```

### mkdir()

Create a directory (and parents).

```typescript
async function mkdir(ctx: TaskContext, path: string): Promise<void>
```

**Behavior:**
- Creates parent directories as needed
- No error if directory exists
- Respects dry run mode

**Example:**
```typescript
await mkdir(ctx, `${ctx.home}/.local/bin`);
```

### writeFile()

Write content to a file with optional permissions.

```typescript
async function writeFile(
  ctx: TaskContext,
  path: string,
  content: string,
  mode?: number,
): Promise<void>
```

**Parameters:**
- `ctx` — Task context
- `path` — Destination file path
- `content` — File content to write
- `mode` — Optional Unix permissions (e.g., `0o600` for private files)

**Behavior:**
- Creates parent directories as needed
- Overwrites existing file
- Sets permissions if `mode` provided
- Respects dry run mode

**Example:**
```typescript
// Write a config file
await writeFile(
  ctx,
  `${ctx.configHome}/mytool/config.toml`,
  configContent,
);

// Write a private key with restricted permissions
await writeFile(
  ctx,
  `${ctx.home}/.ssh/id_ed25519`,
  privateKeyContent,
  0o600,
);

// Write a public key with standard permissions
await writeFile(
  ctx,
  `${ctx.home}/.ssh/id_ed25519.pub`,
  publicKeyContent,
  0o644,
);
```

## Sync Operations

### syncConfigDir()

Synchronize a source directory to a destination.

```typescript
async function syncConfigDir(
  ctx: TaskContext,
  srcBase: string,
  destBase: string,
): Promise<void>
```

**Behavior:**
- Iterates over subdirectories in source
- For each subdirectory:
  - Removes matching destination if exists
  - Copies subdirectory to destination
- Respects dry run mode

**Example:**
```typescript
// Sync ~/.config directories
await syncConfigDir(
  ctx,
  `${ctx.devEnv}/env/.config`,  // Source: env/.config/
  ctx.configHome,                // Dest: ~/.config/
);

// Result: Each folder in env/.config/ is copied to ~/.config/
// env/.config/nvim/    -> ~/.config/nvim/
// env/.config/ghostty/ -> ~/.config/ghostty/
// etc.
```

## Dry Run Behavior

All functions log what they would do in dry run mode:

```typescript
// ctx.dryRun = true
await copyFile(ctx, src, dest);
// Output:
// [INFO] Copy /path/to/src -> /path/to/dest
// [DRY] cp /path/to/src -> /path/to/dest

await remove(ctx, path);
// Output:
// [INFO] Remove /path/to/file
// [DRY] rm -rf /path/to/file

await mkdir(ctx, path);
// Output:
// [INFO] Create directory /path/to/dir
// [DRY] mkdir -p /path/to/dir
```

## Common Patterns

### Copy Config with Directory Creation

```typescript
const configDir = `${ctx.configHome}/mytool`;
await mkdir(ctx, configDir);
await copyFile(
  ctx,
  `${ctx.devEnv}/env/.config/mytool/config.toml`,
  `${configDir}/config.toml`,
);
```

### Clean and Reinstall

```typescript
const installDir = `${ctx.home}/.local/share/mytool`;
await remove(ctx, installDir);
await copyDir(ctx, `${ctx.devEnv}/vendor/mytool`, installDir);
```

### Sync Dotfiles

```typescript
const dotfiles = [".zshrc", ".zsh_profile", ".tmux.conf"];

for (const file of dotfiles) {
  const src = `${ctx.devEnv}/env/${file}`;
  const dest = `${ctx.home}/${file}`;

  try {
    await copyFile(ctx, src, dest);
  } catch (err) {
    if (err instanceof Deno.errors.NotFound) {
      log.warn(`Dotfile not found: ${file}`);
    } else {
      throw err;
    }
  }
}
```

## Error Handling

### File Not Found

```typescript
try {
  await copyFile(ctx, "/nonexistent", dest);
} catch (err) {
  if (err instanceof Deno.errors.NotFound) {
    // Handle missing source
  }
}
```

### Permission Denied

```typescript
try {
  await copyFile(ctx, src, "/root/protected");
} catch (err) {
  if (err instanceof Deno.errors.PermissionDenied) {
    // Handle permission error
  }
}
```

## Dependencies

The fs utilities use Deno's standard library:

```typescript
import { copy, ensureDir, exists } from "@std/fs";
import { dirname, join } from "@std/path";
```

These are re-exported through `src/lib/mod.ts` as the `fs` namespace:

```typescript
import { fs } from "../lib/mod.ts";

await fs.copyFile(ctx, src, dest);
await fs.mkdir(ctx, dir);
```
