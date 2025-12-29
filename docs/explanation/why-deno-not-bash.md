# Why Deno, Not Bash

This project uses Deno and TypeScript instead of bash scripts. This document explains the reasoning and trade-offs.

## The Ownership Philosophy

A central principle from ThePrimeagen's Dev Productivity course:

> "I prefer a single script that I control + some basic convention. Convention over configuration is a mantra I support."

This applies regardless of language. The question isn't "bash vs Deno" but "do you own it?"

### Why Not Ansible?

Ansible is excellent IT automation software. Many developers use it for personal machine setup. But:

| Ansible | Custom Script |
|---------|---------------|
| Good documentation | You wrote it, you know it |
| Multi-machine support | Often not needed for personal use |
| YAML everywhere | Code in a language you choose |
| Learning curve | Direct shell commands |
| Can be slow | As fast as your code |

The trade-off: Ansible handles edge cases you haven't thought of. Custom scripts do exactly what you wrote—no more, no less.

### Why Bash Falls Short

Bash works. Many developers use it successfully. But for a project of this size:

```bash
# Bash: string-typed, easy to make mistakes
if [ "$DRY_RUN" = "true" ]; then
  echo "Would run: apt install $packages"
else
  apt install $packages
fi
```

```typescript
// TypeScript: typed, assertions, clear structure
if (ctx.dryRun) {
  log.dryRun(`apt install ${packages.join(" ")}`);
  return;
}
await runOrFail(ctx, ["apt", "install", "-y", ...packages]);
```

The TypeScript version catches typos at compile time, provides autocomplete, and makes the dry-run pattern consistent.

## Why Deno Specifically

### No Build Step

```bash
# Run directly from source
deno task run

# Or compile to standalone binary
deno task compile
```

No `npm install`, no `node_modules`, no bundler configuration.

### Built-in TypeScript

TypeScript works out of the box. No tsconfig tweaking, no transpilation step.

### Standard Library

Deno's standard library (`@std/fs`, `@std/path`, `@std/cli`) covers common needs without npm dependencies.

### Permissions Model

Deno asks before accessing files, network, or environment. This aligns with the cautious approach needed for system configuration scripts.

## Specific Benefits in This Project

### Type Safety for Context

```typescript
export interface TaskContext {
  dryRun: boolean;
  devEnv: string;
  home: string;
  configHome: string;
}
```

Every task receives a typed context. No string typos, no forgotten variables.

### Tiger Style Assertions

```typescript
assert(packages.length > 0, "packages array cannot be empty");
```

Assertions run in production, catching bugs early rather than failing silently.

### Testable Shell Commands

```typescript
// The run() function is mockable
const result = await run(ctx, ["rustc", "--version"]);
```

Integration tests run tasks in Docker containers, verifying they actually work.

### Consistent Logging

```typescript
log.cmd(["apt", "install", "ripgrep"]);
log.dryRun("would install ripgrep");
log.success("ripgrep installed");
```

Structured logging makes it clear what happened and what would have happened.

## Trade-offs

### You Must Know TypeScript/Deno

Bash is more universal. Every Unix system has it. Deno requires installation.

### Less Copy-Paste from Tutorials

Most "how to install X" tutorials provide bash commands. You'll translate them to Deno API calls.

### Debugging is Different

Bash's `-x` flag shows every command. Deno requires explicit logging.

## The Bottom Line

This project exists because the author finds Deno "easier to maintain and more enjoyable" than bash. Your mileage may vary.

The principles matter more than the language:
- Own your environment
- Understand what runs
- Make it reproducible

Whether that's bash, Go, Lua, Python, or Deno is a matter of preference.
