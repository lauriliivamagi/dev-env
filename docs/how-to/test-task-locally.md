# How to Test Tasks Locally

Test tasks before running them on your system using dry run mode and Docker containers.

## Dry Run Mode

### Basic Usage

Preview what a task would do without making changes:

```bash
deno task run mytask --dry
```

### What Dry Run Shows

```
[INFO] Dry run mode enabled
[TASK] mytask
[CMD] sudo apt install -y ripgrep
[DRY] would run: sudo apt install -y ripgrep
[CMD] cargo install stylua
[DRY] would run: cargo install stylua
[SUCCESS] Completed: mytask
```

### Dry Run Limitations

Dry run can't:
- Show conditional behavior that depends on file existence
- Predict what external commands output
- Verify that commands would succeed

Use Docker for more thorough testing.

## Docker Testing

### Prerequisites

Docker must be installed and running:

```bash
docker --version
```

### Using Make Commands (Recommended)

The project includes a Makefile with convenient Docker test commands:

```bash
# Run all tasks in Docker (full integration test)
make test-all

# Test a specific task
make test TASK=zsh

# Dry-run all tasks
make test-dry

# Test sync command
make test-sync

# Open interactive shell for debugging
make shell

# Clean up test image
make clean
```

### Manual Docker Testing

Build and run manually if needed:

```bash
# Build test image
docker build -f Dockerfile.test -t dev-env-test .

# Run tests
docker run --rm dev-env-test deno test
```

### Interactive Testing

Test tasks in a clean container:

```bash
# Start interactive container
docker run -it --rm \
  -v $(pwd):/app \
  -w /app \
  ubuntu:25.10 \
  /bin/bash

# Inside container:
apt update && apt install -y curl unzip
curl -fsSL https://deno.land/install.sh | sh
export PATH="$HOME/.deno/bin:$PATH"

# Run a task
deno task run libs
```

### Test a Single Task

```bash
# In container
deno task run mytask
```

### Clean Container Each Time

Using `--rm` ensures each test starts fresh:

```bash
docker run -it --rm -v $(pwd):/app -w /app ubuntu:25.10 bash
```

## Testing Workflow

### 1. Write the Task

```typescript
// src/tasks/mytool.ts
import { type TaskContext, verify as v } from "../lib/mod.ts";
import { apt } from "../lib/shell.ts";

export async function run(ctx: TaskContext): Promise<void> {
  await apt(ctx, ["mytool"]);
}

export async function verify(ctx: TaskContext): Promise<void> {
  await v.assertCommand("mytool", "--version");
}
```

### 2. Dry Run First

```bash
deno task run mytool --dry
```

Check the output makes sense.

### 3. Test in Docker

```bash
docker run -it --rm \
  -v $(pwd):/app \
  -w /app \
  ubuntu:25.10 \
  bash -c "apt update && apt install -y curl unzip && \
    curl -fsSL https://deno.land/install.sh | sh && \
    export PATH=\$HOME/.deno/bin:\$PATH && \
    deno task run mytool"
```

### 4. Run on Your System

```bash
deno task run mytool
```

## Writing Integration Tests

### Test File Structure

```typescript
// src/tasks/mytool.test.ts
import { assertEquals } from "@std/assert";
import { getTestContext } from "../lib/test-utils.ts";
import { run, verify } from "./mytool.ts";

Deno.test("mytool installs correctly", async () => {
  const ctx = getTestContext();
  await run(ctx);
  await verify(ctx);
});
```

### Run Tests

```bash
deno test
```

### Test with Docker

Tests run in Docker for isolation:

```bash
docker build -f Dockerfile.test -t test .
docker run --rm test deno test
```

## Debugging Failed Tasks

### Check Command Output

Modify the task temporarily to capture output:

```typescript
const result = await run(ctx, ["command", "arg"], {
  stdout: "piped",
  stderr: "piped",
});
console.log("stdout:", result.stdout);
console.log("stderr:", result.stderr);
console.log("code:", result.code);
```

### Add Logging

```typescript
import * as log from "../lib/log.ts";

export async function run(ctx: TaskContext): Promise<void> {
  log.info("Starting mytool installation");
  await apt(ctx, ["mytool"]);
  log.info("apt install completed");

  log.info("Running post-install setup");
  // ...
}
```

### Run Manually

Execute the same commands manually to see what fails:

```bash
# In Docker container or your system
sudo apt install -y mytool
mytool --version
```

## Common Issues

### Task Passes Dry Run but Fails for Real

Dry run doesn't actually execute commands. Common causes:
- Package doesn't exist in apt
- Build dependencies missing
- Permission issues

### Works Locally but Fails in Docker

- Different Ubuntu version
- Missing base packages
- Different PATH or environment

### Verification Fails

The `verify()` function runs after install. If it fails:
- Check if the command name differs from package name
- Verify PATH includes installation directory
- Some tools need shell restart

## Quick Reference

```bash
# Preview task
deno task run mytask --dry

# Test all tasks in Docker
make test-all

# Test specific task in Docker
make test TASK=mytask

# Interactive container for debugging
make shell

# Run tests
deno test

# Run specific test
deno test src/tasks/mytool.test.ts

# Type check
deno task check

# Lint
deno task lint
```
