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

  const command = new Deno.Command(executable, {
    args: cmd.slice(1),
    cwd: opts.cwd,
    env: opts.env,
    stdin: opts.stdin ?? "inherit",
    stdout: opts.stdout ?? "inherit",
    stderr: opts.stderr ?? "inherit",
  });

  const result = await command.output();

  return {
    code: result.code,
    stdout: opts.stdout === "piped"
      ? new TextDecoder().decode(result.stdout)
      : undefined,
    stderr: opts.stderr === "piped"
      ? new TextDecoder().decode(result.stderr)
      : undefined,
  };
}

export async function runOrFail(
  ctx: TaskContext,
  cmd: string[],
  opts: RunOptions = {},
): Promise<void> {
  const result = await run(ctx, cmd, opts);
  if (result.code !== 0) {
    throw new Error(`Command failed with code ${result.code}: ${cmd.join(" ")}`);
  }
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

export async function curlPipe(
  ctx: TaskContext,
  url: string,
  shell: string[] = ["sh"],
): Promise<void> {
  assert(url.length > 0, "curlPipe url cannot be empty");
  assert(shell.length > 0, "curlPipe shell array cannot be empty");
  assert(
    shell.every((arg) => typeof arg === "string" && arg.length > 0),
    "all shell arguments must be non-empty strings",
  );

  const shellDisplay = shell.join(" ");
  log.cmd(["curl", "-fsSL", url, "|", shellDisplay]);

  if (ctx.dryRun) {
    log.dryRun(`curl -fsSL ${url} | ${shellDisplay}`);
    return;
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
