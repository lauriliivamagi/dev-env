import { dirname } from "@std/path";
import { ensureDir } from "@std/fs";
import { type TaskContext } from "./config.ts";
import { assert } from "./assert.ts";
import * as log from "./log.ts";

export interface RunOptions {
  cwd?: string;
  env?: Record<string, string>;
  stdin?: "inherit" | "null";
  stdout?: "inherit" | "null" | "piped";
  stderr?: "inherit" | "null" | "piped";
  /** Indices of arguments to redact in error messages */
  redactArgs?: number[];
  /** Timeout in milliseconds */
  timeout?: number;
}

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

  const executable = cmd[0]!;
  log.cmd(cmd);

  if (ctx.dryRun) {
    log.dryRun(cmd.join(" "));
    return { code: 0 };
  }

  const abortController = opts.timeout ? new AbortController() : undefined;
  let timedOut = false;
  const timeoutId = opts.timeout
    ? setTimeout(() => {
        timedOut = true;
        abortController!.abort();
      }, opts.timeout)
    : undefined;

  try {
    const command = new Deno.Command(executable, {
      args: cmd.slice(1),
      cwd: opts.cwd,
      env: opts.env,
      stdin: opts.stdin ?? "inherit",
      stdout: opts.stdout ?? "inherit",
      stderr: opts.stderr ?? "inherit",
      signal: abortController?.signal,
    });

    const result = await command.output();

    // Check if we timed out (process killed with SIGTERM returns 143, not AbortError)
    if (timedOut) {
      return { code: 124 }; // Standard timeout exit code
    }

    return {
      code: result.code,
      stdout: opts.stdout === "piped"
        ? new TextDecoder().decode(result.stdout)
        : undefined,
      stderr: opts.stderr === "piped"
        ? new TextDecoder().decode(result.stderr)
        : undefined,
    };
  } catch (error) {
    // Handle AbortError in case Deno throws it in some versions
    if (timedOut || (error instanceof Error && error.name === "AbortError")) {
      return { code: 124 }; // Standard timeout exit code
    }
    throw error;
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

export async function runOrFail(
  ctx: TaskContext,
  cmd: string[],
  opts: RunOptions = {},
): Promise<void> {
  const result = await run(ctx, cmd, opts);
  if (result.code !== 0) {
    // Redact sensitive arguments in error messages to prevent credential leakage
    const displayCmd = opts.redactArgs
      ? cmd.map((arg, i) => (opts.redactArgs!.includes(i) ? "[REDACTED]" : arg))
      : cmd;
    throw new Error(
      `Command failed with code ${result.code}: ${displayCmd.join(" ")}`,
    );
  }
}

/**
 * Check command output for state inspection (version checks, existence checks, etc.).
 * This function explicitly bypasses dry-run mode because it's checking actual system state,
 * not performing modifications. Use this in shouldRun() functions to determine if a task
 * should execute.
 */
export async function checkCommandOutput(
  cmd: string[],
  opts: Omit<RunOptions, "stdin"> = {},
): Promise<{ code: number; stdout?: string; stderr?: string }> {
  assert(cmd.length > 0, "command array cannot be empty");
  assert(
    cmd.every((arg) => typeof arg === "string" && arg.length > 0),
    "all command arguments must be non-empty strings",
  );

  const executable = cmd[0]!;
  const command = new Deno.Command(executable, {
    args: cmd.slice(1),
    cwd: opts.cwd,
    env: opts.env,
    stdin: "null",
    stdout: opts.stdout ?? "piped",
    stderr: opts.stderr ?? "piped",
  });

  const result = await command.output();

  return {
    code: result.code,
    stdout: opts.stdout === "piped" || opts.stdout === undefined
      ? new TextDecoder().decode(result.stdout)
      : undefined,
    stderr: opts.stderr === "piped" || opts.stderr === undefined
      ? new TextDecoder().decode(result.stderr)
      : undefined,
  };
}

export async function apt(ctx: TaskContext, packages: string[]): Promise<void> {
  assert(packages.length > 0, "packages array cannot be empty");
  await runOrFail(ctx, [
    "sudo",
    "DEBIAN_FRONTEND=noninteractive",
    "apt",
    "install",
    "-y",
    ...packages,
  ]);
}

export async function aptUpdate(ctx: TaskContext): Promise<void> {
  await runOrFail(ctx, ["sudo", "apt", "update"]);
}

export async function gitClone(
  ctx: TaskContext,
  url: string,
  dest: string,
  opts: { branch?: string } = {},
): Promise<void> {
  assert(url.length > 0, "git clone url cannot be empty");
  assert(dest.length > 0, "git clone destination cannot be empty");

  const cmd = ["git", "clone"];
  if (opts.branch) {
    cmd.push("-b", opts.branch);
  }
  cmd.push(url, dest);
  await runOrFail(ctx, cmd);
}

/**
 * Idempotent git clone - pulls if repo exists, clones if not.
 * If destination exists but is not a git repo, removes it and clones fresh.
 * If a branch is specified, ensures that branch is checked out after both clone and pull.
 * Returns { cloned: true } if freshly cloned, { cloned: false } if pulled.
 */
export async function gitCloneOrPull(
  ctx: TaskContext,
  url: string,
  dest: string,
  opts: { branch?: string } = {},
): Promise<{ cloned: boolean }> {
  assert(url.length > 0, "git clone url cannot be empty");
  assert(dest.length > 0, "git clone destination cannot be empty");

  if (!ctx.dryRun) {
    try {
      const stat = await Deno.stat(dest);
      if (stat.isDirectory) {
        const gitDir = `${dest}/.git`;
        try {
          const gitStat = await Deno.stat(gitDir);
          if (gitStat.isDirectory) {
            // Repo exists - ensure correct branch and pull
            log.info(`Repository exists at ${dest}, updating...`);
            if (opts.branch) {
              await runOrFail(ctx, ["git", "-C", dest, "fetch"]);
              await runOrFail(ctx, ["git", "-C", dest, "checkout", opts.branch]);
            }
            await runOrFail(ctx, ["git", "-C", dest, "pull"]);
            return { cloned: false };
          }
        } catch {
          // .git doesn't exist - remove and clone fresh
          log.info(`${dest} exists but is not a git repo, removing...`);
        }
        // Remove directory (either not a git repo or .git check failed)
        await Deno.remove(dest, { recursive: true });
      }
    } catch {
      // Destination doesn't exist - proceed with clone
    }
  }

  await gitClone(ctx, url, dest, opts);
  return { cloned: true };
}

export async function gitFetch(ctx: TaskContext, cwd: string): Promise<void> {
  await runOrFail(ctx, ["git", "fetch"], { cwd });
}

export async function gitCheckout(
  ctx: TaskContext,
  branch: string,
  cwd: string,
): Promise<void> {
  await runOrFail(ctx, ["git", "checkout", branch], { cwd });
}

export async function curl(
  ctx: TaskContext,
  url: string,
  dest: string,
): Promise<void> {
  assert(url.length > 0, "curl url cannot be empty");
  assert(dest.length > 0, "curl destination cannot be empty");

  if (!ctx.dryRun) {
    await ensureDir(dirname(dest));
  }

  await runOrFail(ctx, ["curl", "-fsSL", "-o", dest, url]);
}

export interface CurlPipeOptions {
  /** Skip execution if this command already exists in PATH */
  skipIfCommand?: string;
}

export async function curlPipe(
  ctx: TaskContext,
  url: string,
  shell: string[] = ["sh"],
  opts: CurlPipeOptions = {},
): Promise<{ skipped: boolean }> {
  assert(url.length > 0, "curlPipe url cannot be empty");
  assert(shell.length > 0, "curlPipe shell array cannot be empty");
  assert(
    shell.every((arg) => typeof arg === "string" && arg.length > 0),
    "all shell arguments must be non-empty strings",
  );

  // Check if we should skip because command already exists
  // Check even in dry-run mode to accurately reflect what would happen
  if (opts.skipIfCommand) {
    // Use a non-dry-run context to actually check if command exists
    const checkCtx = { ...ctx, dryRun: false };
    const which = await run(checkCtx, ["which", opts.skipIfCommand], {
      stdout: "piped",
      stderr: "piped",
    });
    if (which.code === 0) {
      log.skip(`${opts.skipIfCommand} already installed`);
      return { skipped: true };
    }
  }

  const shellDisplay = shell.join(" ");
  log.cmd(["curl", "-fsSL", url, "|", shellDisplay]);

  if (ctx.dryRun) {
    log.dryRun(`curl -fsSL ${url} | ${shellDisplay}`);
    return { skipped: false };
  }

  const curl = new Deno.Command("curl", {
    args: ["-fsSL", url],
    stdout: "piped",
  });

  const curlProcess = curl.spawn();
  const curlOutput = await curlProcess.output();

  if (curlOutput.code !== 0) {
    throw new Error(`curl failed with code ${curlOutput.code}`);
  }

  assert(
    curlOutput.stdout.length > 0,
    `curl returned empty response from ${url}`,
  );

  const shellCmd = shell[0]!;
  const shellArgs = shell.slice(1);

  const sh = new Deno.Command(shellCmd, {
    args: shellArgs,
    stdin: "piped",
  });

  const shProcess = sh.spawn();
  const writer = shProcess.stdin.getWriter();
  await writer.write(curlOutput.stdout);
  await writer.close();

  const shOutput = await shProcess.output();
  if (shOutput.code !== 0) {
    throw new Error(`${shellDisplay} failed with code ${shOutput.code}`);
  }

  return { skipped: false };
}

export async function pnpm(ctx: TaskContext, args: string[]): Promise<void> {
  // Try to find pnpm - either in PATH or via Volta
  let pnpmCmd = "pnpm";
  if (!ctx.dryRun) {
    const which = await run(ctx, ["which", "pnpm"], { stdout: "piped", stderr: "piped" });
    if (which.code !== 0) {
      const voltaPnpm = `${ctx.home}/.volta/bin/pnpm`;
      try {
        await Deno.stat(voltaPnpm);
        pnpmCmd = voltaPnpm;
      } catch {
        log.warn("pnpm not installed, skipping");
        return;
      }
    }
  }

  // Set PNPM_HOME and PATH for global installs to work
  // In realistic test mode, use PATH as-is from shell config
  // In normal mode, extend PATH with pnpm home
  const pnpmHome = `${ctx.home}/.local/share/pnpm`;
  const currentPath = Deno.env.get("PATH") ?? "";
  const env: Record<string, string> = {
    PNPM_HOME: pnpmHome,
    PATH: Deno.env.get("REALISTIC_TEST") ? currentPath : `${pnpmHome}:${currentPath}`,
  };
  await runOrFail(ctx, [pnpmCmd, ...args], { env });
}

export async function cargoInstall(
  ctx: TaskContext,
  pkg: string,
  opts: { features?: string[] } = {},
): Promise<void> {
  assert(pkg.length > 0, "cargo package name cannot be empty");

  // Try to find cargo - either in PATH or in user's .cargo/bin
  let cargo = "cargo";
  if (!ctx.dryRun) {
    const which = await run(ctx, ["which", "cargo"], { stdout: "piped", stderr: "piped" });
    if (which.code !== 0) {
      const userCargo = `${ctx.home}/.cargo/bin/cargo`;
      try {
        await Deno.stat(userCargo);
        cargo = userCargo;
      } catch {
        log.warn(`Cargo not installed, skipping: ${pkg}`);
        return;
      }
    }
  }

  const cmd = [cargo, "install", pkg];
  if (opts.features?.length) {
    cmd.push("--features", opts.features.join(","));
  }
  await runOrFail(ctx, cmd);
}

export async function goInstall(ctx: TaskContext, pkg: string): Promise<void> {
  assert(pkg.length > 0, "go package name cannot be empty");

  if (!ctx.dryRun) {
    const which = await run(ctx, ["which", "go"], { stdout: "piped", stderr: "piped" });
    if (which.code !== 0) {
      log.warn(`Go not installed, skipping: ${pkg}`);
      return;
    }
  }

  await runOrFail(ctx, ["go", "install", pkg]);
}
