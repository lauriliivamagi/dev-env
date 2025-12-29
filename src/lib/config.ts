import { join } from "@std/path";
import { assert } from "./assert.ts";

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

  const devEnv = Deno.env.get("DEV_ENV") || Deno.cwd();
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

  const result = path
    .replace(/^~/, ctx.home)
    .replace(/\$HOME/g, ctx.home)
    .replace(/\$DEV_ENV/g, ctx.devEnv)
    .replace(/\$XDG_CONFIG_HOME/g, ctx.configHome)
    .replace(/\$STACK_ROOT/g, ctx.stackRoot);

  assert(
    !result.includes("$HOME") &&
      !result.includes("$DEV_ENV") &&
      !result.includes("$XDG_CONFIG_HOME") &&
      !result.includes("$STACK_ROOT"),
    `unexpanded variables in path: ${result}`,
  );

  return result;
}
