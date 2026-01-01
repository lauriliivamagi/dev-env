import { assertEquals, assertRejects } from "@std/assert";
import { getContext, expandPath } from "./config.ts";
import { createMockContext } from "./test-utils.ts";

// ============================================================================
// getContext tests
// ============================================================================

Deno.test("getContext - requires HOME environment variable", async () => {
  const originalHome = Deno.env.get("HOME");
  try {
    Deno.env.delete("HOME");
    await assertRejects(
      () => getContext({ stack: "test" }),
      Error,
      "HOME environment variable is required",
    );
  } finally {
    if (originalHome) {
      Deno.env.set("HOME", originalHome);
    }
  }
});

Deno.test("getContext - requires stack name", async () => {
  await assertRejects(
    () => getContext({}),
    Error,
    "Stack name is required",
  );
});

Deno.test("getContext - sets dryRun and diff defaults to false", async () => {
  const ctx = await getContext({ stack: "larr" });
  assertEquals(ctx.dryRun, false);
  assertEquals(ctx.diff, false);
});

Deno.test("getContext - respects dryRun and diff flags", async () => {
  const ctx = await getContext({ stack: "larr", dryRun: true, diff: true });
  assertEquals(ctx.dryRun, true);
  assertEquals(ctx.diff, true);
});

Deno.test("getContext - returns empty vars for stack without vars.ts", async () => {
  const ctx = await getContext({ stack: "larr" });
  assertEquals(typeof ctx.vars, "object");
  assertEquals(Object.keys(ctx.vars).length, 0);
});

// ============================================================================
// expandPath tests
// ============================================================================

Deno.test("expandPath - expands $HOME", () => {
  const ctx = createMockContext();
  const result = expandPath("$HOME/.config", ctx);
  assertEquals(result, "/tmp/test-home/.config");
});

Deno.test("expandPath - expands ~ at start", () => {
  const ctx = createMockContext();
  const result = expandPath("~/.config", ctx);
  assertEquals(result, "/tmp/test-home/.config");
});

Deno.test("expandPath - expands $DEV_ENV", () => {
  const ctx = createMockContext();
  const result = expandPath("$DEV_ENV/stacks", ctx);
  assertEquals(result, "/tmp/test-dev-env/stacks");
});

Deno.test("expandPath - expands $XDG_CONFIG_HOME", () => {
  const ctx = createMockContext();
  const result = expandPath("$XDG_CONFIG_HOME/nvim", ctx);
  assertEquals(result, "/tmp/test-home/.config/nvim");
});

Deno.test("expandPath - expands $STACK_ROOT", () => {
  const ctx = createMockContext();
  const result = expandPath("$STACK_ROOT/tasks", ctx);
  assertEquals(result, "/tmp/test-dev-env/stacks/test/tasks");
});

Deno.test("expandPath - expands multiple variables", () => {
  const ctx = createMockContext();
  const result = expandPath("$HOME/.local/share", ctx);
  assertEquals(result, "/tmp/test-home/.local/share");
});

// ============================================================================
// TaskContext structure tests
// ============================================================================

Deno.test("createMockContext - includes all required fields", () => {
  const ctx = createMockContext();
  assertEquals(ctx.dryRun, true);
  assertEquals(ctx.diff, false);
  assertEquals(ctx.home, "/tmp/test-home");
  assertEquals(ctx.devEnv, "/tmp/test-dev-env");
  assertEquals(ctx.configHome, "/tmp/test-home/.config");
  assertEquals(ctx.stack, "test");
  assertEquals(ctx.stackRoot, "/tmp/test-dev-env/stacks/test");
  assertEquals(typeof ctx.vars, "object");
});

Deno.test("createMockContext - allows overriding fields", () => {
  const ctx = createMockContext({
    dryRun: false,
    diff: true,
    stack: "custom",
    vars: { key: "value" },
  });
  assertEquals(ctx.dryRun, false);
  assertEquals(ctx.diff, true);
  assertEquals(ctx.stack, "custom");
  assertEquals(ctx.vars.key, "value");
});
