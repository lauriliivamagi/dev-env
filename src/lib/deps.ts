import { assert } from "./assert.ts";

export interface TaskNode {
  name: string;
  dependsOn: string[];
}

/**
 * Topologically sort tasks based on dependencies.
 * Uses Kahn's algorithm for cycle detection.
 * Tasks without dependencies maintain alphabetical order among themselves.
 */
export function resolveDependencies(tasks: TaskNode[]): string[] {
  // Build adjacency list and in-degree map
  const graph = new Map<string, string[]>();
  const inDegree = new Map<string, number>();

  for (const task of tasks) {
    graph.set(task.name, []);
    inDegree.set(task.name, 0);
  }

  for (const task of tasks) {
    for (const dep of task.dependsOn) {
      assert(graph.has(dep), `Task '${task.name}' depends on unknown task '${dep}'`);
      graph.get(dep)!.push(task.name);
      inDegree.set(task.name, inDegree.get(task.name)! + 1);
    }
  }

  // Kahn's algorithm with alphabetical tie-breaking
  const queue: string[] = [];
  for (const [name, degree] of inDegree) {
    if (degree === 0) queue.push(name);
  }
  queue.sort(); // Alphabetical for tasks with no deps

  const result: string[] = [];
  while (queue.length > 0) {
    const current = queue.shift()!;
    result.push(current);

    const nextBatch: string[] = [];
    for (const neighbor of graph.get(current)!) {
      inDegree.set(neighbor, inDegree.get(neighbor)! - 1);
      if (inDegree.get(neighbor) === 0) {
        nextBatch.push(neighbor);
      }
    }
    nextBatch.sort(); // Alphabetical tie-breaking
    queue.push(...nextBatch);
  }

  // Cycle detection
  if (result.length !== tasks.length) {
    const remaining = tasks.filter((t) => !result.includes(t.name)).map((t) => t.name);
    throw new Error(`Circular dependency detected involving: ${remaining.join(", ")}`);
  }

  return result;
}

/**
 * Get all dependencies for a specific task (transitive closure).
 * Returns dependencies in topological order, with the task itself at the end.
 */
export function getDependencies(taskName: string, tasks: TaskNode[]): string[] {
  const taskMap = new Map(tasks.map((t) => [t.name, t]));
  const visited = new Set<string>();
  const result: string[] = [];

  function visit(name: string) {
    if (visited.has(name)) return;
    visited.add(name);

    const task = taskMap.get(name);
    if (!task) return;

    for (const dep of task.dependsOn) {
      visit(dep);
    }
    result.push(name);
  }

  visit(taskName);
  return result;
}
