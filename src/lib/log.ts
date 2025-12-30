import { bold, cyan, dim, green, red, yellow } from "@std/fmt/colors";

/**
 * Log levels for filtering output.
 * Set via LOG_LEVEL environment variable.
 * Each level includes all higher priority levels.
 */
export type LogLevel = "debug" | "info" | "warn" | "error" | "silent";

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  silent: 4,
};

function getLogLevel(): LogLevel {
  const level = Deno.env.get("LOG_LEVEL")?.toLowerCase();
  if (level && level in LEVEL_PRIORITY) {
    return level as LogLevel;
  }
  return "info"; // Default
}

function shouldLog(level: LogLevel): boolean {
  const currentLevel = getLogLevel();
  return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[currentLevel];
}

export function debug(msg: string): void {
  if (shouldLog("debug")) {
    console.log(dim("DEBUG"), msg);
  }
}

export function info(msg: string): void {
  if (shouldLog("info")) {
    console.log(cyan("INFO"), msg);
  }
}

export function success(msg: string): void {
  if (shouldLog("info")) {
    console.log(green("OK"), msg);
  }
}

export function warn(msg: string): void {
  if (shouldLog("warn")) {
    console.log(yellow("WARN"), msg);
  }
}

export function error(msg: string): void {
  if (shouldLog("error")) {
    console.log(red("ERROR"), msg);
  }
}

export function dryRun(msg: string): void {
  if (shouldLog("debug")) {
    console.log(dim("[DRY_RUN]"), msg);
  }
}

export function task(name: string): void {
  if (shouldLog("info")) {
    console.log(bold(cyan(`\n=== ${name} ===`)));
  }
}

export function cmd(command: string[]): void {
  if (shouldLog("debug")) {
    console.log(dim("$"), command.join(" "));
  }
}
