import { assertEquals, assertRejects } from "@std/assert";
import { exists } from "@std/fs";
import { join } from "@std/path";
import {
  copyDir,
  copyFile,
  mkdir,
  remove,
  syncConfigDir,
  writeFile,
} from "./fs.ts";
import { createMockContext } from "./test-utils.ts";

// ============================================================================
// Safety validation tests (DANGEROUS_PATHS)
// ============================================================================

Deno.test("copyFile - throws on dangerous source path /", async () => {
  const ctx = createMockContext();
  await assertRejects(
    () => copyFile(ctx, "/", "/tmp/dest"),
    Error,
    "dangerous path",
  );
});

Deno.test("copyFile - throws on dangerous source path /home", async () => {
  const ctx = createMockContext();
  await assertRejects(
    () => copyFile(ctx, "/home", "/tmp/dest"),
    Error,
    "dangerous path",
  );
});

Deno.test("copyFile - throws on dangerous dest path", async () => {
  const ctx = createMockContext();
  await assertRejects(
    () => copyFile(ctx, "/tmp/src", "/etc"),
    Error,
    "dangerous path",
  );
});

Deno.test("copyDir - throws on dangerous paths", async () => {
  const ctx = createMockContext();
  await assertRejects(
    () => copyDir(ctx, "/", "/tmp/dest"),
    Error,
    "dangerous path",
  );
  await assertRejects(
    () => copyDir(ctx, "/tmp/src", "/var"),
    Error,
    "dangerous path",
  );
});

Deno.test("remove - throws on dangerous paths", async () => {
  const ctx = createMockContext();
  await assertRejects(() => remove(ctx, "/"), Error, "dangerous path");
  await assertRejects(() => remove(ctx, "/home"), Error, "dangerous path");
  await assertRejects(() => remove(ctx, "/usr"), Error, "dangerous path");
});

Deno.test("mkdir - throws on dangerous paths", async () => {
  const ctx = createMockContext();
  await assertRejects(() => mkdir(ctx, "/"), Error, "dangerous path");
  await assertRejects(() => mkdir(ctx, "/tmp"), Error, "dangerous path");
});

Deno.test("writeFile - throws on dangerous paths", async () => {
  const ctx = createMockContext();
  await assertRejects(
    () => writeFile(ctx, "/etc", "content"),
    Error,
    "dangerous path",
  );
});

Deno.test("syncConfigDir - throws on dangerous paths", async () => {
  const ctx = createMockContext();
  await assertRejects(
    () => syncConfigDir(ctx, "/", "/tmp/dest"),
    Error,
    "dangerous path",
  );
  await assertRejects(
    () => syncConfigDir(ctx, "/tmp/src", "/home"),
    Error,
    "dangerous path",
  );
});

Deno.test("copyFile - throws on empty path", async () => {
  const ctx = createMockContext();
  await assertRejects(
    () => copyFile(ctx, "", "/tmp/dest"),
    Error,
    "cannot be empty",
  );
  await assertRejects(
    () => copyFile(ctx, "/tmp/src", ""),
    Error,
    "cannot be empty",
  );
});

// ============================================================================
// Dry-run behavior tests
// ============================================================================

Deno.test("copyFile - dry-run does not copy", async () => {
  const tmpDir = await Deno.makeTempDir();
  try {
    const ctx = createMockContext({ dryRun: true });
    const src = join(tmpDir, "source.txt");
    const dest = join(tmpDir, "dest.txt");
    await Deno.writeTextFile(src, "content");

    await copyFile(ctx, src, dest);

    assertEquals(await exists(dest), false);
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("copyDir - dry-run does not copy", async () => {
  const tmpDir = await Deno.makeTempDir();
  try {
    const ctx = createMockContext({ dryRun: true });
    const srcDir = join(tmpDir, "srcdir");
    const destDir = join(tmpDir, "destdir");
    await Deno.mkdir(srcDir);
    await Deno.writeTextFile(join(srcDir, "file.txt"), "content");

    await copyDir(ctx, srcDir, destDir);

    assertEquals(await exists(destDir), false);
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("remove - dry-run does not delete", async () => {
  const tmpDir = await Deno.makeTempDir();
  try {
    const ctx = createMockContext({ dryRun: true });
    const file = join(tmpDir, "file.txt");
    await Deno.writeTextFile(file, "content");

    await remove(ctx, file);

    assertEquals(await exists(file), true);
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("mkdir - dry-run does not create directory", async () => {
  const tmpDir = await Deno.makeTempDir();
  try {
    const ctx = createMockContext({ dryRun: true });
    const newDir = join(tmpDir, "newdir");

    await mkdir(ctx, newDir);

    assertEquals(await exists(newDir), false);
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("writeFile - dry-run does not write", async () => {
  const tmpDir = await Deno.makeTempDir();
  try {
    const ctx = createMockContext({ dryRun: true });
    const file = join(tmpDir, "file.txt");

    await writeFile(ctx, file, "content");

    assertEquals(await exists(file), false);
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("syncConfigDir - dry-run does not sync", async () => {
  const tmpDir = await Deno.makeTempDir();
  try {
    const ctx = createMockContext({ dryRun: true });
    const srcBase = join(tmpDir, "src");
    const destBase = join(tmpDir, "dest");
    await Deno.mkdir(srcBase);
    await Deno.mkdir(join(srcBase, "subdir"));
    await Deno.writeTextFile(join(srcBase, "subdir", "file.txt"), "content");

    await syncConfigDir(ctx, srcBase, destBase);

    assertEquals(await exists(destBase), false);
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});

// ============================================================================
// Actual operations tests
// ============================================================================

Deno.test("copyFile - copies file to destination", async () => {
  const tmpDir = await Deno.makeTempDir();
  try {
    const ctx = createMockContext({ dryRun: false });
    const src = join(tmpDir, "source.txt");
    const dest = join(tmpDir, "dest.txt");
    await Deno.writeTextFile(src, "hello world");

    await copyFile(ctx, src, dest);

    assertEquals(await exists(dest), true);
    assertEquals(await Deno.readTextFile(dest), "hello world");
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("copyFile - creates destination directory if needed", async () => {
  const tmpDir = await Deno.makeTempDir();
  try {
    const ctx = createMockContext({ dryRun: false });
    const src = join(tmpDir, "source.txt");
    const dest = join(tmpDir, "nested", "dir", "dest.txt");
    await Deno.writeTextFile(src, "content");

    await copyFile(ctx, src, dest);

    assertEquals(await exists(dest), true);
    assertEquals(await Deno.readTextFile(dest), "content");
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("copyDir - copies entire directory", async () => {
  const tmpDir = await Deno.makeTempDir();
  try {
    const ctx = createMockContext({ dryRun: false });
    const srcDir = join(tmpDir, "srcdir");
    const destDir = join(tmpDir, "destdir");
    await Deno.mkdir(srcDir);
    await Deno.writeTextFile(join(srcDir, "file1.txt"), "content1");
    await Deno.mkdir(join(srcDir, "subdir"));
    await Deno.writeTextFile(join(srcDir, "subdir", "file2.txt"), "content2");

    await copyDir(ctx, srcDir, destDir);

    assertEquals(await exists(destDir), true);
    assertEquals(await Deno.readTextFile(join(destDir, "file1.txt")), "content1");
    assertEquals(
      await Deno.readTextFile(join(destDir, "subdir", "file2.txt")),
      "content2",
    );
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("copyDir - merges into existing destination", async () => {
  const tmpDir = await Deno.makeTempDir();
  try {
    const ctx = createMockContext({ dryRun: false });
    const srcDir = join(tmpDir, "srcdir");
    const destDir = join(tmpDir, "destdir");

    // Create source with new content
    await Deno.mkdir(srcDir);
    await Deno.writeTextFile(join(srcDir, "new.txt"), "new content");
    await Deno.writeTextFile(join(srcDir, "shared.txt"), "updated content");

    // Create dest with existing content
    await Deno.mkdir(destDir);
    await Deno.writeTextFile(join(destDir, "existing.txt"), "existing content");
    await Deno.writeTextFile(join(destDir, "shared.txt"), "old content");

    await copyDir(ctx, srcDir, destDir);

    // New files are added
    assertEquals(await exists(join(destDir, "new.txt")), true);
    // Existing files are preserved
    assertEquals(await exists(join(destDir, "existing.txt")), true);
    // Shared files are overwritten with source content
    assertEquals(
      await Deno.readTextFile(join(destDir, "shared.txt")),
      "updated content",
    );
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("remove - removes file", async () => {
  const tmpDir = await Deno.makeTempDir();
  try {
    const ctx = createMockContext({ dryRun: false });
    const file = join(tmpDir, "file.txt");
    await Deno.writeTextFile(file, "content");

    await remove(ctx, file);

    assertEquals(await exists(file), false);
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("remove - removes directory recursively", async () => {
  const tmpDir = await Deno.makeTempDir();
  try {
    const ctx = createMockContext({ dryRun: false });
    const dir = join(tmpDir, "dir");
    await Deno.mkdir(join(dir, "subdir"), { recursive: true });
    await Deno.writeTextFile(join(dir, "subdir", "file.txt"), "content");

    await remove(ctx, dir);

    assertEquals(await exists(dir), false);
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("remove - no-op if path doesn't exist", async () => {
  const tmpDir = await Deno.makeTempDir();
  try {
    const ctx = createMockContext({ dryRun: false });
    const nonExistent = join(tmpDir, "nonexistent");

    // Should not throw
    await remove(ctx, nonExistent);
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("mkdir - creates directory", async () => {
  const tmpDir = await Deno.makeTempDir();
  try {
    const ctx = createMockContext({ dryRun: false });
    const newDir = join(tmpDir, "newdir");

    await mkdir(ctx, newDir);

    assertEquals(await exists(newDir), true);
    const stat = await Deno.stat(newDir);
    assertEquals(stat.isDirectory, true);
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("mkdir - creates nested directories", async () => {
  const tmpDir = await Deno.makeTempDir();
  try {
    const ctx = createMockContext({ dryRun: false });
    const nestedDir = join(tmpDir, "a", "b", "c");

    await mkdir(ctx, nestedDir);

    assertEquals(await exists(nestedDir), true);
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("writeFile - writes content to file", async () => {
  const tmpDir = await Deno.makeTempDir();
  try {
    const ctx = createMockContext({ dryRun: false });
    const file = join(tmpDir, "file.txt");

    await writeFile(ctx, file, "hello world");

    assertEquals(await Deno.readTextFile(file), "hello world");
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("writeFile - creates parent directories", async () => {
  const tmpDir = await Deno.makeTempDir();
  try {
    const ctx = createMockContext({ dryRun: false });
    const file = join(tmpDir, "nested", "dir", "file.txt");

    await writeFile(ctx, file, "content");

    assertEquals(await Deno.readTextFile(file), "content");
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("writeFile - sets file mode when provided", async () => {
  const tmpDir = await Deno.makeTempDir();
  try {
    const ctx = createMockContext({ dryRun: false });
    const file = join(tmpDir, "script.sh");

    await writeFile(ctx, file, "#!/bin/bash\necho hello", 0o755);

    const stat = await Deno.stat(file);
    // Check executable bit is set (mode & 0o111)
    assertEquals((stat.mode! & 0o111) !== 0, true);
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("syncConfigDir - syncs all subdirectories", async () => {
  const tmpDir = await Deno.makeTempDir();
  try {
    const ctx = createMockContext({ dryRun: false });
    const srcBase = join(tmpDir, "src");
    const destBase = join(tmpDir, "dest");

    // Create source structure
    await Deno.mkdir(join(srcBase, "nvim"), { recursive: true });
    await Deno.writeTextFile(join(srcBase, "nvim", "init.lua"), "-- nvim config");
    await Deno.mkdir(join(srcBase, "tmux"), { recursive: true });
    await Deno.writeTextFile(join(srcBase, "tmux", "tmux.conf"), "# tmux config");

    await Deno.mkdir(destBase);

    await syncConfigDir(ctx, srcBase, destBase);

    assertEquals(await exists(join(destBase, "nvim", "init.lua")), true);
    assertEquals(await exists(join(destBase, "tmux", "tmux.conf")), true);
    assertEquals(
      await Deno.readTextFile(join(destBase, "nvim", "init.lua")),
      "-- nvim config",
    );
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});
