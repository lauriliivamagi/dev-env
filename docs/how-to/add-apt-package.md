# How to Add an APT Package

Install system packages via apt in a new or existing task.

## Quick Pattern

```typescript
import { type TaskContext } from "../lib/mod.ts";
import { apt } from "../lib/shell.ts";

export async function run(ctx: TaskContext): Promise<void> {
  await apt(ctx, ["package-name"]);
}
```

## Step-by-Step

### 1. Create a Task File (or use existing)

```bash
# New task
touch src/tasks/mytool.ts

# Or add to existing task like src/tasks/libs.ts
```

### 2. Add the Import

```typescript
import { type TaskContext } from "../lib/mod.ts";
import { apt } from "../lib/shell.ts";
```

### 3. Use apt() in run()

```typescript
export async function run(ctx: TaskContext): Promise<void> {
  await apt(ctx, ["ripgrep"]);
}
```

### 4. Test with Dry Run

```bash
deno task run mytool --dry
# Output: [DRY] would run: sudo apt install -y ripgrep
```

### 5. Run for Real

```bash
deno task run mytool
```

## Multiple Packages

Install several packages at once:

```typescript
export async function run(ctx: TaskContext): Promise<void> {
  await apt(ctx, [
    "build-essential",
    "curl",
    "git",
    "ripgrep",
    "fd-find",
  ]);
}
```

## With apt update

Update package lists first:

```typescript
import { apt, aptUpdate } from "../lib/shell.ts";

export async function run(ctx: TaskContext): Promise<void> {
  await aptUpdate(ctx);
  await apt(ctx, ["latest-package"]);
}
```

## With Verification

Confirm the package installed correctly:

```typescript
import { type TaskContext, verify as v } from "../lib/mod.ts";
import { apt } from "../lib/shell.ts";

export async function run(ctx: TaskContext): Promise<void> {
  await apt(ctx, ["ripgrep"]);
}

export async function verify(ctx: TaskContext): Promise<void> {
  await v.assertCommand("rg", "--version");
}
```

Note: The package name (`ripgrep`) and command name (`rg`) often differ.

## Complete Example: libs.ts

```typescript
// src/tasks/libs.ts
import { type TaskContext, verify as v } from "../lib/mod.ts";
import { apt, aptUpdate } from "../lib/shell.ts";

export async function run(ctx: TaskContext): Promise<void> {
  await aptUpdate(ctx);

  await apt(ctx, [
    // Build tools
    "build-essential",
    "cmake",
    "ninja-build",

    // Version control
    "git",

    // Search and navigation
    "ripgrep",
    "fd-find",
    "fzf",

    // Utilities
    "curl",
    "wget",
    "jq",
    "htop",
  ]);
}

export async function verify(ctx: TaskContext): Promise<void> {
  await v.assertCommand("git", "--version");
  await v.assertCommand("rg", "--version");
  await v.assertCommand("fzf", "--version");
  await v.assertCommand("jq", "--version");
}
```

## Common Gotchas

### Package Name vs Command Name

| Package | Command |
|---------|---------|
| `ripgrep` | `rg` |
| `fd-find` | `fdfind` (or `fd` via alias) |
| `neovim` | `nvim` |
| `nodejs` | `node` |

### Needs sudo

The `apt()` function automatically uses `sudo`:

```typescript
// This runs: sudo apt install -y package
await apt(ctx, ["package"]);
```

### Dependencies

If your package needs libraries, install them in the same task or a prerequisite task:

```typescript
export async function run(ctx: TaskContext): Promise<void> {
  // Dependencies first
  await apt(ctx, ["libssl-dev", "libcurl4-openssl-dev"]);

  // Then the main tool
  await apt(ctx, ["main-package"]);
}
```

## Adding to Existing Tasks

Common pattern: add packages to `libs.ts`:

```typescript
// In src/tasks/libs.ts, add to the package list:
await apt(ctx, [
  // ... existing packages ...
  "new-package",  // Add here
]);
```

Then update verification if the package provides a command:

```typescript
export async function verify(ctx: TaskContext): Promise<void> {
  // ... existing verifications ...
  await v.assertCommand("new-command", "--version");
}
```
