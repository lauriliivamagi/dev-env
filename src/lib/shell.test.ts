import { assertEquals, assertRejects } from "@std/assert";
import { exists } from "@std/fs";
import { join } from "@std/path";
import {
  apt,
  cargoInstall,
  curl,
  curlPipe,
  gitClone,
  goInstall,
  pnpm,
  run,
  runOrFail,
} from "./shell.ts";
import { createMockContext } from "./test-utils.ts";

// ============================================================================
// Input validation tests (assertions throw)
// ============================================================================

Deno.test("run - throws on empty command array", async () => {
  const ctx = createMockContext();
  await assertRejects(
    () => run(ctx, []),
    Error,
    "cannot be empty",
  );
});

Deno.test("run - throws on command with empty string argument", async () => {
  const ctx = createMockContext();
  await assertRejects(
    () => run(ctx, ["echo", ""]),
    Error,
    "non-empty strings",
  );
});

Deno.test("apt - throws on empty packages array", async () => {
  const ctx = createMockContext();
  await assertRejects(
    () => apt(ctx, []),
    Error,
    "cannot be empty",
  );
});

Deno.test("gitClone - throws on empty url", async () => {
  const ctx = createMockContext();
  await assertRejects(
    () => gitClone(ctx, "", "/tmp/dest"),
    Error,
    "cannot be empty",
  );
});

Deno.test("gitClone - throws on empty destination", async () => {
  const ctx = createMockContext();
  await assertRejects(
    () => gitClone(ctx, "https://example.com/repo.git", ""),
    Error,
    "cannot be empty",
  );
});

Deno.test("curl - throws on empty url", async () => {
  const ctx = createMockContext();
  await assertRejects(
    () => curl(ctx, "", "/tmp/dest"),
    Error,
    "cannot be empty",
  );
});

Deno.test("curl - throws on empty destination", async () => {
  const ctx = createMockContext();
  await assertRejects(
    () => curl(ctx, "https://example.com/file", ""),
    Error,
    "cannot be empty",
  );
});

Deno.test("curlPipe - throws on empty url", async () => {
  const ctx = createMockContext();
  await assertRejects(
    () => curlPipe(ctx, ""),
    Error,
    "cannot be empty",
  );
});

Deno.test("curlPipe - throws on empty shell array", async () => {
  const ctx = createMockContext();
  await assertRejects(
    () => curlPipe(ctx, "https://example.com/script.sh", []),
    Error,
    "cannot be empty",
  );
});

Deno.test("curlPipe - throws on shell with empty string argument", async () => {
  const ctx = createMockContext();
  await assertRejects(
    () => curlPipe(ctx, "https://example.com/script.sh", ["sh", ""]),
    Error,
    "non-empty strings",
  );
});

Deno.test("cargoInstall - throws on empty package name", async () => {
  const ctx = createMockContext();
  await assertRejects(
    () => cargoInstall(ctx, ""),
    Error,
    "cannot be empty",
  );
});

Deno.test("goInstall - throws on empty package name", async () => {
  const ctx = createMockContext();
  await assertRejects(
    () => goInstall(ctx, ""),
    Error,
    "cannot be empty",
  );
});

// ============================================================================
// Dry-run behavior tests
// ============================================================================

Deno.test("run - dry-run returns code 0 without executing", async () => {
  const ctx = createMockContext({ dryRun: true });
  // This would fail if actually executed, but dry-run should skip it
  const result = await run(ctx, ["false"]);
  assertEquals(result.code, 0);
});

Deno.test("runOrFail - dry-run does not throw", async () => {
  const ctx = createMockContext({ dryRun: true });
  // This would fail if actually executed
  await runOrFail(ctx, ["false"]);
});

Deno.test("apt - dry-run does not execute", async () => {
  const ctx = createMockContext({ dryRun: true });
  // Would fail without sudo if executed
  await apt(ctx, ["nonexistent-package"]);
});

Deno.test("gitClone - dry-run does not execute", async () => {
  const ctx = createMockContext({ dryRun: true });
  await gitClone(ctx, "https://invalid.example.com/repo.git", "/tmp/dest");
});

Deno.test("curl - dry-run does not create directories", async () => {
  const tmpDir = await Deno.makeTempDir();
  try {
    const ctx = createMockContext({ dryRun: true });
    const dest = join(tmpDir, "subdir", "file.txt");

    await curl(ctx, "https://example.com/file", dest);

    // Directory should NOT be created in dry-run
    assertEquals(await exists(join(tmpDir, "subdir")), false);
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("curlPipe - dry-run does not execute", async () => {
  const ctx = createMockContext({ dryRun: true });
  await curlPipe(ctx, "https://invalid.example.com/script.sh");
});

Deno.test("pnpm - dry-run does not execute", async () => {
  const ctx = createMockContext({ dryRun: true });
  await pnpm(ctx, ["install", "nonexistent-package"]);
});

Deno.test("cargoInstall - dry-run does not execute", async () => {
  const ctx = createMockContext({ dryRun: true });
  await cargoInstall(ctx, "nonexistent-package");
});

Deno.test("goInstall - dry-run does not execute", async () => {
  const ctx = createMockContext({ dryRun: true });
  await goInstall(ctx, "nonexistent.example.com/pkg@latest");
});

// ============================================================================
// Command execution tests (using real but safe commands)
// ============================================================================

Deno.test("run - executes command and returns exit code 0", async () => {
  const ctx = createMockContext({ dryRun: false });
  // 'true' always exits 0
  const result = await run(ctx, ["true"]);
  assertEquals(result.code, 0);
});

Deno.test("run - returns non-zero exit code", async () => {
  const ctx = createMockContext({ dryRun: false });
  // 'false' always exits 1
  const result = await run(ctx, ["false"]);
  assertEquals(result.code, 1);
});

Deno.test("run - captures stdout when piped", async () => {
  const ctx = createMockContext({ dryRun: false });
  const result = await run(ctx, ["echo", "hello"], { stdout: "piped" });
  assertEquals(result.code, 0);
  assertEquals(result.stdout?.trim(), "hello");
});

Deno.test("run - captures stderr when piped", async () => {
  const ctx = createMockContext({ dryRun: false });
  // Use sh -c to redirect to stderr
  const result = await run(ctx, ["sh", "-c", "echo error >&2"], {
    stderr: "piped",
  });
  assertEquals(result.code, 0);
  assertEquals(result.stderr?.trim(), "error");
});

Deno.test("run - respects cwd option", async () => {
  const tmpDir = await Deno.makeTempDir();
  try {
    const ctx = createMockContext({ dryRun: false });
    const result = await run(ctx, ["pwd"], { stdout: "piped", cwd: tmpDir });
    assertEquals(result.code, 0);
    assertEquals(result.stdout?.trim(), tmpDir);
  } finally {
    await Deno.remove(tmpDir);
  }
});

Deno.test("run - respects env option", async () => {
  const ctx = createMockContext({ dryRun: false });
  const result = await run(ctx, ["sh", "-c", "echo $TEST_VAR"], {
    stdout: "piped",
    env: { TEST_VAR: "test-value" },
  });
  assertEquals(result.code, 0);
  assertEquals(result.stdout?.trim(), "test-value");
});

Deno.test("runOrFail - throws on non-zero exit code", async () => {
  const ctx = createMockContext({ dryRun: false });
  await assertRejects(
    () => runOrFail(ctx, ["false"]),
    Error,
    "Command failed",
  );
});

Deno.test("runOrFail - does not throw on success", async () => {
  const ctx = createMockContext({ dryRun: false });
  await runOrFail(ctx, ["true"]);
});

// Note: gitClone, curl, curlPipe, apt, pnpm, cargoInstall, goInstall
// are not tested with actual execution as they require:
// - network access
// - specific tools installed
// - elevated permissions (apt)
// Integration tests in Docker cover these scenarios.
