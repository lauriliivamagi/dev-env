import { assertRejects } from "@std/assert";
import { join } from "@std/path";
import {
  assertCommand,
  assertCommandWithPath,
  assertDir,
  assertFile,
} from "./verify.ts";

// ============================================================================
// assertCommand tests
// ============================================================================

Deno.test("assertCommand - passes for existing command 'true'", async () => {
  // 'true' is a standard Unix command that always exits 0
  await assertCommand("true");
});

Deno.test("assertCommand - throws for non-existent command", async () => {
  await assertRejects(
    () => assertCommand("nonexistent-command-xyz123"),
    Error,
    "not found",
  );
});

Deno.test("assertCommand - throws when command exits non-zero", async () => {
  // 'false' is a standard Unix command that always exits 1
  await assertRejects(
    () => assertCommand("false"),
    Error,
    "exited with code",
  );
});

Deno.test("assertCommand - passes arguments to command", async () => {
  // Use 'test' command with -d flag to check if /tmp is a directory
  await assertCommand("test", "-d", "/tmp");
});

// ============================================================================
// assertDir tests
// ============================================================================

Deno.test("assertDir - passes for existing directory", async () => {
  const tmpDir = await Deno.makeTempDir();
  try {
    await assertDir(tmpDir);
  } finally {
    await Deno.remove(tmpDir);
  }
});

Deno.test("assertDir - throws for non-existent path", async () => {
  await assertRejects(
    () => assertDir("/nonexistent/path/xyz123"),
    Error,
    "does not exist",
  );
});

Deno.test("assertDir - throws when path is a file not directory", async () => {
  const tmpDir = await Deno.makeTempDir();
  try {
    const file = join(tmpDir, "file.txt");
    await Deno.writeTextFile(file, "content");

    await assertRejects(
      () => assertDir(file),
      Error,
      "not a directory",
    );
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("assertDir - throws on empty path", async () => {
  await assertRejects(
    () => assertDir(""),
    Error,
    "cannot be empty",
  );
});

// ============================================================================
// assertFile tests
// ============================================================================

Deno.test("assertFile - passes for existing file", async () => {
  const tmpDir = await Deno.makeTempDir();
  try {
    const file = join(tmpDir, "file.txt");
    await Deno.writeTextFile(file, "content");

    await assertFile(file);
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("assertFile - throws for non-existent path", async () => {
  await assertRejects(
    () => assertFile("/nonexistent/file.txt"),
    Error,
    "does not exist",
  );
});

Deno.test("assertFile - throws when path is directory not file", async () => {
  const tmpDir = await Deno.makeTempDir();
  try {
    await assertRejects(
      () => assertFile(tmpDir),
      Error,
      "not a file",
    );
  } finally {
    await Deno.remove(tmpDir);
  }
});

Deno.test("assertFile - throws on empty path", async () => {
  await assertRejects(
    () => assertFile(""),
    Error,
    "cannot be empty",
  );
});

// ============================================================================
// assertCommandWithPath tests
// ============================================================================

Deno.test("assertCommandWithPath - passes when binary exists and runs", async () => {
  const tmpDir = await Deno.makeTempDir();
  try {
    // Create a mock home directory structure
    const home = tmpDir;
    const localBin = join(home, ".local", "bin");
    await Deno.mkdir(localBin, { recursive: true });

    // Create a simple executable script
    const binPath = join(localBin, "my-cmd");
    await Deno.writeTextFile(binPath, "#!/bin/sh\nexit 0");
    await Deno.chmod(binPath, 0o755);

    await assertCommandWithPath(home, "my-cmd", binPath);
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("assertCommandWithPath - throws when binary file missing", async () => {
  const tmpDir = await Deno.makeTempDir();
  try {
    const nonExistentBin = join(tmpDir, "nonexistent");

    await assertRejects(
      () => assertCommandWithPath(tmpDir, "cmd", nonExistentBin),
      Error,
      "does not exist",
    );
  } finally {
    await Deno.remove(tmpDir);
  }
});

Deno.test("assertCommandWithPath - throws on empty home", async () => {
  await assertRejects(
    () => assertCommandWithPath("", "cmd", "/bin/true"),
    Error,
    "cannot be empty",
  );
});

Deno.test("assertCommandWithPath - throws on empty cmd", async () => {
  await assertRejects(
    () => assertCommandWithPath("/home/user", "", "/bin/true"),
    Error,
    "cannot be empty",
  );
});

Deno.test("assertCommandWithPath - throws on empty binPath", async () => {
  await assertRejects(
    () => assertCommandWithPath("/home/user", "cmd", ""),
    Error,
    "cannot be empty",
  );
});
