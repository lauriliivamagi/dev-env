import { assert } from "./assert.ts";

/**
 * Verification utilities for asserting task installations succeeded.
 * These run after a task's run() function to confirm the expected
 * binaries, files, and directories exist.
 */

/**
 * Assert that a command exists and can be executed.
 * Runs the command with optional arguments and checks for exit code 0.
 */
export async function assertCommand(
  cmd: string,
  ...args: string[]
): Promise<void> {
  try {
    const command = new Deno.Command(cmd, {
      args,
      stdout: "null",
      stderr: "null",
    });
    const { code } = await command.output();
    assert(code === 0, `Command '${cmd}' exited with code ${code}`);
  } catch (err) {
    if (err instanceof Deno.errors.NotFound) {
      throw new Error(`Command '${cmd}' not found`);
    }
    throw err;
  }
}

/**
 * Assert that a directory exists at the given path.
 */
export async function assertDir(path: string): Promise<void> {
  assert(path.length > 0, "path cannot be empty");

  try {
    const stat = await Deno.stat(path);
    assert(stat.isDirectory, `'${path}' exists but is not a directory`);
  } catch (err) {
    if (err instanceof Deno.errors.NotFound) {
      throw new Error(`Directory '${path}' does not exist`);
    }
    throw err;
  }
}

/**
 * Assert that a file exists at the given path.
 */
export async function assertFile(path: string): Promise<void> {
  assert(path.length > 0, "path cannot be empty");

  try {
    const stat = await Deno.stat(path);
    assert(stat.isFile, `'${path}' exists but is not a file`);
  } catch (err) {
    if (err instanceof Deno.errors.NotFound) {
      throw new Error(`File '${path}' does not exist`);
    }
    throw err;
  }
}

/**
 * Assert that the current user is a member of the given group.
 */
export async function assertInGroup(group: string): Promise<void> {
  assert(group.length > 0, "group cannot be empty");

  const command = new Deno.Command("groups", { stdout: "piped" });
  const { stdout } = await command.output();
  const groups = new TextDecoder().decode(stdout);

  assert(
    groups.split(/\s+/).includes(group),
    `User is not a member of group '${group}'`,
  );
}

/**
 * Assert that a binary exists at the expected path AND is accessible via PATH.
 * This verifies both:
 * 1. The binary file exists at binPath
 * 2. The command can be executed with the expected PATH configuration
 *
 * Optionally runs the command with arguments to verify it executes successfully.
 *
 * Uses the expected binary directories in PATH for verification.
 */
export async function assertCommandWithPath(
  home: string,
  cmd: string,
  binPath: string,
  ...args: string[]
): Promise<void> {
  assert(home.length > 0, "home cannot be empty");
  assert(cmd.length > 0, "cmd cannot be empty");
  assert(binPath.length > 0, "binPath cannot be empty");

  // First, verify the binary file exists at the expected location
  await assertFile(binPath);

  // Build PATH with expected directories
  // In realistic test mode, use PATH as-is from shell config
  // In normal mode, extend PATH with all expected binary directories
  const currentPath = Deno.env.get("PATH") ?? "";
  let path: string;
  if (Deno.env.get("REALISTIC_TEST")) {
    path = currentPath;
  } else {
    const binDirs = [
      `${home}/.local/bin`,
      `${home}/.cargo/bin`,
      `${home}/.deno/bin`,
      `${home}/.bun/bin`,
      `${home}/.volta/bin`,
      `${home}/.pyenv/shims`,
      `${home}/.local/share/pnpm`,
      `${home}/.opencode/bin`,
      `${home}/go/bin`,
      "/usr/local/go/bin",
    ];
    path = [...binDirs, currentPath].join(":");
  }

  // Verify command is accessible and optionally runs successfully
  const cmdArgs = args.length > 0 ? args : [];
  try {
    const command = new Deno.Command(cmd, {
      args: cmdArgs,
      stdout: "null",
      stderr: "null",
      env: { ...Deno.env.toObject(), PATH: path },
    });
    const { code } = await command.output();
    assert(
      code === 0,
      `Command '${cmd}' exited with code ${code}`,
    );
  } catch (err) {
    if (err instanceof Deno.errors.NotFound) {
      throw new Error(
        `Command '${cmd}' not found in PATH (expected at ${binPath})`,
      );
    }
    throw err;
  }
}

/**
 * Assert that passwordless sudo is available.
 * Useful as a pre-flight check before tasks that require sudo.
 * Throws if sudo requires a password or is not available.
 */
export async function assertSudoAccess(): Promise<void> {
  try {
    const command = new Deno.Command("sudo", {
      args: ["-n", "true"],
      stdout: "null",
      stderr: "null",
    });
    const { code } = await command.output();
    assert(
      code === 0,
      "Passwordless sudo is not available. Configure sudo to not require a password or run manually.",
    );
  } catch (err) {
    if (err instanceof Deno.errors.NotFound) {
      throw new Error("sudo command not found");
    }
    throw err;
  }
}

/**
 * Run a check function and return true if all assertions pass, false otherwise.
 * Useful for reusing verify() functions as skip checks in shouldRun().
 *
 * @example
 * export async function shouldRun(ctx: TaskContext): Promise<boolean> {
 *   // If verify would pass, skip the task
 *   return !(await checkSatisfied(() => verify(ctx)));
 * }
 */
export async function checkSatisfied(
  check: () => Promise<void>,
): Promise<boolean> {
  try {
    await check();
    return true;
  } catch {
    return false;
  }
}
