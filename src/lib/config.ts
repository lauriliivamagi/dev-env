import { dirname, join } from "@std/path";
import { assert } from "./assert.ts";

/**
 * Find the repository root by looking for deno.json or .git directory.
 * Starts from cwd and walks up the directory tree.
 */
function findRepoRoot(): string | null {
  let current = Deno.cwd();

  while (current !== "/") {
    try {
      // Check for deno.json (most specific to this project)
      Deno.statSync(join(current, "deno.json"));
      return current;
    } catch {
      // Not found, try .git
      try {
        Deno.statSync(join(current, ".git"));
        return current;
      } catch {
        // Not found, go up
        current = dirname(current);
      }
    }
  }

  return null;
}

export interface TaskContext {
  dryRun: boolean;
  devEnv: string;
  home: string;
  configHome: string;
  stack: string;
  stackRoot: string;
}

export function getContext(
  args: { dryRun?: boolean; stack?: string } = {},
): TaskContext {
  const home = Deno.env.get("HOME");
  if (!home) {
    throw new Error("HOME environment variable is required");
  }

  const stack = args.stack;
  if (!stack) {
    throw new Error("Stack name is required. Use --stack <name>");
  }

  // Prefer DEV_ENV env var, then try to find repo root, fallback to cwd
  const devEnv = Deno.env.get("DEV_ENV") || findRepoRoot() || Deno.cwd();
  const configHome = Deno.env.get("XDG_CONFIG_HOME") || `${home}/.config`;
  const stackRoot = join(devEnv, "stacks", stack);

  const ctx: TaskContext = {
    dryRun: args.dryRun ?? false,
    devEnv,
    home,
    configHome,
    stack,
    stackRoot,
  };

  assert(ctx.home.length > 0, "home must be non-empty");
  assert(ctx.devEnv.length > 0, "devEnv must be non-empty");
  assert(ctx.configHome.length > 0, "configHome must be non-empty");
  assert(ctx.stack.length > 0, "stack must be non-empty");
  assert(ctx.stackRoot.length > 0, "stackRoot must be non-empty");

  return ctx;
}

export function expandPath(path: string, ctx: TaskContext): string {
  assert(path.length > 0, "path must be non-empty");

  // Define substitutions - order matters for ~ which only matches at start
  const substitutions: Record<string, string> = {
    "$HOME": ctx.home,
    "$DEV_ENV": ctx.devEnv,
    "$XDG_CONFIG_HOME": ctx.configHome,
    "$STACK_ROOT": ctx.stackRoot,
  };

  // Handle ~ at start first (can't be in the substitutions map)
  let result = path.replace(/^~/, ctx.home);

  // Single-pass replacement to avoid re-expansion if ctx values contain $
  // Build regex matching all substitution keys
  const pattern = new RegExp(
    Object.keys(substitutions)
      .map((k) => k.replace(/\$/g, "\\$"))
      .join("|"),
    "g",
  );

  result = result.replace(pattern, (match) => substitutions[match] ?? match);

  assert(
    !result.includes("$HOME") &&
      !result.includes("$DEV_ENV") &&
      !result.includes("$XDG_CONFIG_HOME") &&
      !result.includes("$STACK_ROOT"),
    `unexpanded variables in path: ${result}`,
  );

  return result;
}

/**
 * Get a required environment variable, throwing if not set.
 * Use this instead of Deno.env.get() with non-null assertions.
 */
export function requireEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) {
    throw new Error(`Required environment variable ${name} is not set`);
  }
  return value;
}
