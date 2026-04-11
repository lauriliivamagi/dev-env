# Shell Utilities

Reference for shell command utilities in `src/lib/shell.ts`.

## Core Functions

### run()

Execute a command and return the result.

```typescript
async function run(
  ctx: TaskContext,
  cmd: string[],
  opts?: RunOptions,
): Promise<{ code: number; stdout?: string; stderr?: string }>
```

**Parameters:**
- `ctx` — Task context (for dry run detection)
- `cmd` — Command and arguments as string array
- `opts` — Optional execution options

**Returns:** Object with exit code and optionally captured output.

**Example:**
```typescript
const result = await run(ctx, ["git", "status"]);
if (result.code !== 0) {
  console.log("Git status failed");
}
```

**With output capture:**
```typescript
const result = await run(ctx, ["rustc", "--version"], {
  stdout: "piped",
});
console.log(result.stdout); // "rustc 1.75.0 ..."
```

### RunOptions

```typescript
interface RunOptions {
  cwd?: string;           // Working directory
  env?: Record<string, string>;  // Environment variables
  stdin?: "inherit" | "null";
  stdout?: "inherit" | "null" | "piped";
  stderr?: "inherit" | "null" | "piped";
}
```

### runOrFail()

Execute a command and throw if it fails.

```typescript
async function runOrFail(
  ctx: TaskContext,
  cmd: string[],
  opts?: RunOptions,
): Promise<void>
```

**Throws:** `Error` if command exits with non-zero code.

**Example:**
```typescript
await runOrFail(ctx, ["make", "install"]);
// Throws if make fails
```

### checkCommandOutput()

Run a command and return its output. Bypasses dry-run mode (useful for `shouldRun` checks).

```typescript
async function checkCommandOutput(
  cmd: string[],
  opts?: RunOptions,
): Promise<{ code: number; stdout?: string; stderr?: string }>
```

**Example:**
```typescript
const result = await checkCommandOutput(["go", "version"], { stdout: "piped" });
if (result.code === 0) {
  console.log(result.stdout); // "go version go1.26.2 linux/amd64"
}
```

### commandExists()

Check if a command exists in PATH.

```typescript
async function commandExists(cmd: string): Promise<boolean>
```

**Example:**
```typescript
if (await commandExists("cargo")) {
  await cargoInstall(ctx, "ripgrep");
}
```

## Package Managers

### apt()

Install packages via apt.

```typescript
async function apt(ctx: TaskContext, packages: string[]): Promise<void>
```

**Example:**
```typescript
await apt(ctx, ["build-essential", "curl", "git"]);
// Runs: sudo apt install -y build-essential curl git
```

### aptUpdate()

Update apt package lists.

```typescript
async function aptUpdate(ctx: TaskContext): Promise<void>
```

**Example:**
```typescript
await aptUpdate(ctx);
// Runs: sudo apt update
```

### pnpm()

Run pnpm with arguments. Automatically sets up PNPM_HOME for global installs.

```typescript
async function pnpm(ctx: TaskContext, args: string[]): Promise<void>
```

**Behavior:**
1. Checks if `pnpm` is in PATH
2. If not found, checks `~/.volta/bin/pnpm` (Volta's location)
3. If pnpm is not available, logs a warning and returns without error
4. Sets PNPM_HOME and PATH for global package installation

**Example:**
```typescript
await pnpm(ctx, ["add", "-g", "typescript"]);
// Runs: pnpm add -g typescript

await pnpm(ctx, ["install"]);
// Runs: pnpm install (in project directory)
```

### cargoInstall()

Install a Rust package via cargo. Gracefully handles missing cargo installation.

```typescript
async function cargoInstall(
  ctx: TaskContext,
  pkg: string,
  opts?: { features?: string[] },
): Promise<void>
```

**Behavior:**
1. Checks if `cargo` is in PATH
2. If not found, checks `~/.cargo/bin/cargo` (rustup's default location)
3. If cargo is not available, logs a warning and returns without error
4. If cargo is found, runs the install command

**Example:**
```typescript
await cargoInstall(ctx, "ripgrep");
// Runs: cargo install ripgrep

await cargoInstall(ctx, "bat", { features: ["git", "regex"] });
// Runs: cargo install bat --features git,regex
```

**Note:** This allows tasks to optionally install cargo packages without failing if Rust isn't installed.

### goInstall()

Install a Go package. Gracefully handles missing Go installation.

```typescript
async function goInstall(ctx: TaskContext, pkg: string): Promise<void>
```

**Behavior:**
1. Checks if `go` is in PATH
2. If Go is not available, logs a warning and returns without error
3. If Go is found, runs the install command

**Example:**
```typescript
await goInstall(ctx, "github.com/jesseduffield/lazygit@latest");
// Runs: go install github.com/jesseduffield/lazygit@latest
```

**Note:** This allows tasks to optionally install Go packages without failing if Go isn't installed.

## Git Operations

### gitClone()

Clone a git repository.

```typescript
async function gitClone(
  ctx: TaskContext,
  url: string,
  dest: string,
  opts?: { branch?: string },
): Promise<void>
```

**Example:**
```typescript
await gitClone(
  ctx,
  "https://github.com/neovim/neovim",
  `${ctx.home}/repos/neovim`,
);

// With specific branch
await gitClone(
  ctx,
  "https://github.com/neovim/neovim",
  `${ctx.home}/repos/neovim`,
  { branch: "stable" },
);
```

### gitFetch()

Fetch updates in a repository.

```typescript
async function gitFetch(ctx: TaskContext, cwd: string): Promise<void>
```

**Example:**
```typescript
await gitFetch(ctx, `${ctx.home}/repos/neovim`);
```

### gitCheckout()

Checkout a branch or tag.

```typescript
async function gitCheckout(
  ctx: TaskContext,
  branch: string,
  cwd: string,
): Promise<void>
```

**Example:**
```typescript
await gitCheckout(ctx, "v0.9.5", `${ctx.home}/repos/neovim`);
```

### gitCloneOrPull()

Clone a repository, or pull if it already exists. Idempotent.

```typescript
async function gitCloneOrPull(
  ctx: TaskContext,
  url: string,
  dest: string,
  opts?: { branch?: string },
): Promise<{ cloned: boolean }>
```

**Returns:** `{ cloned: true }` if freshly cloned, `{ cloned: false }` if pulled.

**Example:**
```typescript
const { cloned } = await gitCloneOrPull(
  ctx,
  "https://github.com/neovim/neovim",
  `${ctx.home}/repos/neovim`,
  { branch: "stable" },
);
```

## Download Operations

### curl()

Download a file. Automatically creates parent directories if they don't exist.

```typescript
async function curl(
  ctx: TaskContext,
  url: string,
  dest: string,
): Promise<void>
```

**Example:**
```typescript
await curl(
  ctx,
  "https://example.com/installer.sh",
  "/tmp/installer.sh",
);
// Runs: curl -fsSL -o /tmp/installer.sh https://example.com/installer.sh

// Parent directory is created automatically
await curl(
  ctx,
  "https://example.com/binary",
  `${ctx.home}/.local/bin/mytool`,
);
// Creates ~/.local/bin/ if it doesn't exist, then downloads
```

### curlPipe()

Download and pipe to a shell. Supports compound shell commands with arguments.

```typescript
interface CurlPipeOptions {
  /** Skip execution if this command already exists in PATH */
  skipIfCommand?: string;
}

async function curlPipe(
  ctx: TaskContext,
  url: string,
  shell: string[] = ["sh"],
  opts: CurlPipeOptions = {},
): Promise<{ skipped: boolean }>
```

**Example:**
```typescript
// Install rustup (non-interactive mode)
await curlPipe(ctx, "https://sh.rustup.rs", ["sh", "-s", "--", "-y"]);
// Runs: curl -fsSL https://sh.rustup.rs | sh -s -- -y

// With bash
await curlPipe(ctx, "https://example.com/install.sh", ["bash"]);
// Runs: curl -fsSL https://example.com/install.sh | bash

// With sudo (for system-wide installation)
await curlPipe(ctx, "https://dotenvx.sh", ["sudo", "sh"]);
// Runs: curl -fsSL https://dotenvx.sh | sudo sh

// Skip if already installed
await curlPipe(ctx, "https://dotenvx.sh", ["sudo", "sh"], {
  skipIfCommand: "dotenvx",
});
// Returns { skipped: true } if dotenvx is already in PATH
```

**Returns:** `{ skipped: true }` if the command from `skipIfCommand` already exists in PATH, `{ skipped: false }` otherwise.

**Safety:** Asserts that curl returns non-empty content before piping.

## Dry Run Behavior

All functions respect `ctx.dryRun`:

```typescript
// When ctx.dryRun is true:
await apt(ctx, ["ripgrep"]);
// Output: [DRY] would run: sudo apt install -y ripgrep
// (No actual installation)

// When ctx.dryRun is false:
await apt(ctx, ["ripgrep"]);
// Actually installs ripgrep
```

## Assertions

All functions validate their inputs:

```typescript
await apt(ctx, []);
// Throws: Assertion failed: packages array cannot be empty

await gitClone(ctx, "", "/path");
// Throws: Assertion failed: git clone url cannot be empty

await run(ctx, []);
// Throws: Assertion failed: command array cannot be empty
```

## Common Patterns

### Build from Source

```typescript
const repoDir = `${ctx.home}/repos/neovim`;

await gitClone(ctx, "https://github.com/neovim/neovim", repoDir);
await runOrFail(ctx, ["make", "CMAKE_BUILD_TYPE=Release"], { cwd: repoDir });
await runOrFail(ctx, ["sudo", "make", "install"], { cwd: repoDir });
```

### Check if Installed

```typescript
const result = await run(ctx, ["which", "nvim"], { stdout: "piped" });
if (result.code === 0) {
  console.log("Neovim already installed");
  return;
}
```

### Run with Environment

```typescript
await runOrFail(ctx, ["npm", "install"], {
  cwd: projectDir,
  env: { NODE_ENV: "production" },
});
```
