# Tiger Style Assertions

This codebase uses "Tiger Style" assertions—assertions that run in production as executable documentation of program invariants.

## What is Tiger Style?

Tiger Style comes from TigerBeetle, a database that uses assertions not as debugging aids to remove later, but as first-class correctness guarantees that remain in production code.

The philosophy: if a condition must be true for the program to work correctly, assert it. If the assertion fails, the program should crash rather than continue in an invalid state.

## The Assert Function

```typescript
// src/lib/assert.ts
export function assert(
  condition: unknown,
  message: string,
): asserts condition {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}
```

Note: no `if (process.env.NODE_ENV === 'production')` check. Assertions always run.

## The Unreachable Function

```typescript
export function unreachable(message?: string): never {
  throw new Error(
    message ? `Unreachable: ${message}` : "Unreachable code executed",
  );
}
```

Marks code paths that should never execute. If they do, something is fundamentally wrong.

## When to Use Assertions

### Preconditions

Validate function arguments at entry:

```typescript
export async function apt(ctx: TaskContext, packages: string[]): Promise<void> {
  assert(packages.length > 0, "packages array cannot be empty");
  // ...
}
```

### Postconditions

Verify results before returning:

```typescript
assert(
  curlOutput.stdout.length > 0,
  `curl returned empty response from ${url}`,
);
```

### Invariants

Document assumptions that must hold:

```typescript
const ctx: TaskContext = {
  dryRun: args.dryRun ?? false,
  devEnv,
  home,
  configHome,
};

assert(ctx.home.length > 0, "home must be non-empty");
assert(ctx.devEnv.length > 0, "devEnv must be non-empty");
assert(ctx.configHome.length > 0, "configHome must be non-empty");
```

### Impossible Code Paths

Use `unreachable()` for branches that shouldn't exist:

```typescript
switch (command) {
  case "run":
    await runTasks(ctx, filter);
    break;
  case "sync":
    await syncConfigs(ctx);
    break;
  default:
    unreachable(`Unknown command: ${command}`);
}
```

## Examples from This Codebase

### Shell Utilities (`src/lib/shell.ts`)

```typescript
export async function run(
  ctx: TaskContext,
  cmd: string[],
  opts: RunOptions = {},
): Promise<{ code: number; stdout?: string; stderr?: string }> {
  assert(cmd.length > 0, "command array cannot be empty");
  assert(
    cmd.every((arg) => typeof arg === "string" && arg.length > 0),
    "all command arguments must be non-empty strings",
  );
  // ...
}
```

These assertions catch:
- Empty command arrays (would fail cryptically later)
- Non-string arguments (type system allows, runtime would fail)
- Empty string arguments (often a mistake)

### File System Utilities (`src/lib/fs.ts`)

```typescript
const DANGEROUS_PATHS = ["/", "/home", "/usr", "/etc", "/var", "/tmp"];

function assertSafePath(path: string, operation: string): void {
  assert(path.length > 0, `${operation} path cannot be empty`);
  assert(
    !DANGEROUS_PATHS.includes(path),
    `${operation} on dangerous path "${path}" is not allowed`,
  );
}
```

Prevents catastrophic mistakes like `remove(ctx, "/")`.

### Configuration (`src/lib/config.ts`)

```typescript
export function expandPath(path: string, ctx: TaskContext): string {
  assert(path.length > 0, "path must be non-empty");

  const result = path
    .replace(/^~/, ctx.home)
    .replace(/\$HOME/g, ctx.home)
    // ...

  assert(
    !result.includes("$HOME") &&
      !result.includes("$DEV_ENV") &&
      !result.includes("$XDG_CONFIG_HOME"),
    `unexpanded variables in path: ${result}`,
  );

  return result;
}
```

Catches paths with unrecognized variables that would fail silently.

## Why Not Just Use TypeScript's Type System?

Types catch many errors at compile time. Assertions catch errors that types can't:

| Types | Assertions |
|-------|------------|
| Array of strings | Non-empty array of non-empty strings |
| String path | Path that doesn't target `/` |
| Function signature | Function preconditions |

Assertions are runtime documentation that the type system can't express.

## The Trade-off

Assertions add overhead and can crash production code. This is intentional:

- A crash with a clear message is better than silent corruption
- Catching invariant violations early prevents cascading failures
- The message tells you exactly what went wrong

For a development environment setup tool, crashing early is far better than partially configuring a system.
