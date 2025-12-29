import { assert } from "./assert.ts";

export interface TaskContext {
  dryRun: boolean;
  devEnv: string;
  home: string;
  configHome: string;
}

export function getContext(args: { dryRun?: boolean } = {}): TaskContext {
  const home = Deno.env.get("HOME");
  if (!home) {
    throw new Error("HOME environment variable is required");
  }

  const devEnv = Deno.env.get("DEV_ENV") || Deno.cwd();
  const configHome = Deno.env.get("XDG_CONFIG_HOME") || `${home}/.config`;

  const ctx: TaskContext = {
    dryRun: args.dryRun ?? false,
    devEnv,
    home,
    configHome,
  };

  assert(ctx.home.length > 0, "home must be non-empty");
  assert(ctx.devEnv.length > 0, "devEnv must be non-empty");
  assert(ctx.configHome.length > 0, "configHome must be non-empty");

  return ctx;
}

export function expandPath(path: string, ctx: TaskContext): string {
  assert(path.length > 0, "path must be non-empty");

  const result = path
    .replace(/^~/, ctx.home)
    .replace(/\$HOME/g, ctx.home)
    .replace(/\$DEV_ENV/g, ctx.devEnv)
    .replace(/\$XDG_CONFIG_HOME/g, ctx.configHome);

  assert(
    !result.includes("$HOME") &&
      !result.includes("$DEV_ENV") &&
      !result.includes("$XDG_CONFIG_HOME"),
    `unexpanded variables in path: ${result}`,
  );

  return result;
}
