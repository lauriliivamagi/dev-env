import { assertEquals, assertRejects } from "@std/assert";
import { join } from "@std/path";
import { discoverTasks } from "./run.ts";

async function withTempDir(
  fn: (dir: string) => Promise<void>,
): Promise<void> {
  const dir = await Deno.makeTempDir({ prefix: "run_test_" });
  try {
    await fn(dir);
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
}

async function writeTask(
  dir: string,
  name: string,
  content: string,
): Promise<void> {
  await Deno.writeTextFile(join(dir, `${name}.ts`), content);
}

Deno.test("discoverTasks - discovers basic tasks", async () => {
  await withTempDir(async (dir) => {
    await writeTask(
      dir,
      "foo",
      `export async function run() { console.log("foo"); }`,
    );
    await writeTask(
      dir,
      "bar",
      `export async function run() { console.log("bar"); }`,
    );

    const tasks = await discoverTasks(dir);
    assertEquals(tasks.length, 2);

    const names = tasks.map((t) => t.name).sort();
    assertEquals(names, ["bar", "foo"]);
  });
});

Deno.test("discoverTasks - skips test files", async () => {
  await withTempDir(async (dir) => {
    await writeTask(
      dir,
      "real",
      `export async function run() {}`,
    );
    await writeTask(
      dir,
      "real.test",
      `export async function run() {}`,
    );

    const tasks = await discoverTasks(dir);
    assertEquals(tasks.length, 1);
    assertEquals(tasks[0]?.name, "real");
  });
});

Deno.test("discoverTasks - skips non-ts files", async () => {
  await withTempDir(async (dir) => {
    await writeTask(
      dir,
      "valid",
      `export async function run() {}`,
    );
    await Deno.writeTextFile(join(dir, "readme.md"), "# Not a task");
    await Deno.writeTextFile(join(dir, "config.json"), "{}");

    const tasks = await discoverTasks(dir);
    assertEquals(tasks.length, 1);
    assertEquals(tasks[0]?.name, "valid");
  });
});

Deno.test("discoverTasks - skips files without run export", async () => {
  await withTempDir(async (dir) => {
    await writeTask(
      dir,
      "valid",
      `export async function run() {}`,
    );
    await writeTask(
      dir,
      "norun",
      `export const foo = 42;`,
    );

    const tasks = await discoverTasks(dir);
    assertEquals(tasks.length, 1);
    assertEquals(tasks[0]?.name, "valid");
  });
});

Deno.test("discoverTasks - loads dependsOn array", async () => {
  await withTempDir(async (dir) => {
    await writeTask(
      dir,
      "base",
      `export async function run() {}`,
    );
    await writeTask(
      dir,
      "dependent",
      `export const dependsOn = ["base"]; export async function run() {}`,
    );

    const tasks = await discoverTasks(dir);
    const dependent = tasks.find((t) => t.name === "dependent");
    assertEquals(dependent?.dependsOn, ["base"]);

    const base = tasks.find((t) => t.name === "base");
    assertEquals(base?.dependsOn, []);
  });
});

Deno.test("discoverTasks - loads verify function", async () => {
  await withTempDir(async (dir) => {
    await writeTask(
      dir,
      "withverify",
      `export async function run() {}
       export async function verify() {}`,
    );
    await writeTask(
      dir,
      "noverify",
      `export async function run() {}`,
    );

    const tasks = await discoverTasks(dir);
    const withVerify = tasks.find((t) => t.name === "withverify");
    const noVerify = tasks.find((t) => t.name === "noverify");

    assertEquals(typeof withVerify?.verify, "function");
    assertEquals(noVerify?.verify, undefined);
  });
});

Deno.test("discoverTasks - returns empty array for empty directory", async () => {
  await withTempDir(async (dir) => {
    const tasks = await discoverTasks(dir);
    assertEquals(tasks.length, 0);
  });
});

Deno.test("discoverTasks - throws on empty path", async () => {
  await assertRejects(
    () => discoverTasks(""),
    Error,
    "tasksDir cannot be empty",
  );
});

Deno.test("discoverTasks - ignores subdirectories", async () => {
  await withTempDir(async (dir) => {
    await writeTask(dir, "valid", `export async function run() {}`);

    const subdir = join(dir, "subdir");
    await Deno.mkdir(subdir);
    await writeTask(subdir, "nested", `export async function run() {}`);

    const tasks = await discoverTasks(dir);
    assertEquals(tasks.length, 1);
    assertEquals(tasks[0]?.name, "valid");
  });
});
