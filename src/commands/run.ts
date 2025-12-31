import { join } from "@std/path";
import { type TaskContext, assert, log } from "../lib/mod.ts";
import { getDependencies, resolveDependencies, type TaskNode } from "../lib/deps.ts";

export interface Task {
  name: string;
  run: (ctx: TaskContext) => Promise<void>;
  verify?: (ctx: TaskContext) => Promise<void>;
  /** Optional pre-check to skip task if already satisfied */
  shouldRun?: (ctx: TaskContext) => Promise<boolean>;
  dependsOn: string[];
}

export async function discoverTasks(tasksDir: string): Promise<Task[]> {
  assert(tasksDir.length > 0, "tasksDir cannot be empty");

  const tasks: Task[] = [];

  for await (const entry of Deno.readDir(tasksDir)) {
    if (!entry.isFile || !entry.name.endsWith(".ts")) {
      continue;
    }

    // Skip test files
    if (entry.name.endsWith(".test.ts")) {
      continue;
    }

    const taskName = entry.name.replace(".ts", "");
    const modulePath = join(tasksDir, entry.name);
    const mod = await import(`file://${modulePath}`);

    if (typeof mod.run !== "function") {
      log.warn(`Task ${taskName} has no run() export, skipping`);
      continue;
    }

    // Load dependsOn array, default to empty
    const dependsOn = Array.isArray(mod.dependsOn) ? mod.dependsOn : [];

    tasks.push({
      name: taskName,
      run: mod.run,
      verify: typeof mod.verify === "function" ? mod.verify : undefined,
      shouldRun: typeof mod.shouldRun === "function" ? mod.shouldRun : undefined,
      dependsOn,
    });
  }

  return tasks;
}

export async function runTasks(ctx: TaskContext, filter?: string): Promise<void> {
  assert(ctx.stackRoot.length > 0, "ctx.stackRoot cannot be empty");

  const tasksDir = join(ctx.stackRoot, "tasks");

  // Discover all tasks (need full graph for dependency resolution)
  const allTasks = await discoverTasks(tasksDir);

  if (allTasks.length === 0) {
    log.warn("No tasks found");
    return;
  }

  // Build task nodes for dependency resolution
  const taskNodes: TaskNode[] = allTasks.map((t) => ({
    name: t.name,
    dependsOn: t.dependsOn,
  }));

  // Determine which tasks to run
  let tasksToRun: string[];

  if (filter) {
    // Find tasks matching the filter
    const matchingTasks = allTasks.filter((t) => t.name.includes(filter));

    if (matchingTasks.length === 0) {
      log.warn(`No tasks found matching '${filter}'`);
      return;
    }

    // Include their dependencies (transitive)
    const needed = new Set<string>();
    for (const task of matchingTasks) {
      const deps = getDependencies(task.name, taskNodes);
      for (const dep of deps) {
        needed.add(dep);
      }
    }

    // Resolve order for just the needed tasks
    const neededNodes = taskNodes.filter((t) => needed.has(t.name));
    tasksToRun = resolveDependencies(neededNodes);
  } else {
    // Running all tasks - resolve order for all
    tasksToRun = resolveDependencies(taskNodes);
  }

  const taskMap = new Map(allTasks.map((t) => [t.name, t]));
  const completed = new Set<string>();

  log.info(`Found ${tasksToRun.length} task(s) to run`);

  for (const name of tasksToRun) {
    if (completed.has(name)) continue;

    const task = taskMap.get(name);
    assert(task !== undefined, `Task '${name}' not found`);
    assert(typeof task.run === "function", `Task '${task.name}' has invalid run`);

    log.task(task.name);

    // Check if task should be skipped (already satisfied)
    if (task.shouldRun) {
      const should = await task.shouldRun(ctx);
      if (!should) {
        // Still run verify() to ensure task is actually satisfied
        if (!ctx.dryRun && task.verify) {
          log.info(`Verifying skipped task: ${task.name}`);
          await task.verify(ctx);
        }
        log.skip(`${task.name} (already satisfied)`);
        completed.add(name);
        continue;
      }
    }

    try {
      await task.run(ctx);

      if (!ctx.dryRun && task.verify) {
        log.info(`Verifying: ${task.name}`);
        await task.verify(ctx);
      }

      completed.add(name);
      log.success(`Completed: ${task.name}`);
    } catch (err) {
      // Don't log here - let CLI handle error display to avoid duplicate logging
      throw new Error(`Task '${task.name}' failed: ${err}`);
    }
  }
}
