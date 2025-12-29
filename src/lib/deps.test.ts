import { assertEquals, assertThrows } from "@std/assert";
import { getDependencies, resolveDependencies } from "./deps.ts";

Deno.test("resolveDependencies - simple chain", () => {
  const tasks = [
    { name: "c", dependsOn: ["b"] },
    { name: "b", dependsOn: ["a"] },
    { name: "a", dependsOn: [] },
  ];
  assertEquals(resolveDependencies(tasks), ["a", "b", "c"]);
});

Deno.test("resolveDependencies - alphabetical for independent tasks", () => {
  const tasks = [
    { name: "zsh", dependsOn: [] },
    { name: "apt", dependsOn: [] },
    { name: "dev", dependsOn: [] },
  ];
  assertEquals(resolveDependencies(tasks), ["apt", "dev", "zsh"]);
});

Deno.test("resolveDependencies - mixed deps and independent", () => {
  const tasks = [
    { name: "secrets", dependsOn: ["sops"] },
    { name: "sops", dependsOn: [] },
    { name: "dev", dependsOn: [] },
    { name: "zsh", dependsOn: [] },
  ];
  const result = resolveDependencies(tasks);
  // dev and sops and zsh are independent, should be alphabetical
  // secrets depends on sops, must come after
  assertEquals(result.indexOf("sops") < result.indexOf("secrets"), true);
  assertEquals(result.indexOf("dev") < result.indexOf("secrets"), true);
});

Deno.test("resolveDependencies - detects cycles", () => {
  const tasks = [
    { name: "a", dependsOn: ["b"] },
    { name: "b", dependsOn: ["a"] },
  ];
  assertThrows(() => resolveDependencies(tasks), Error, "Circular dependency");
});

Deno.test("resolveDependencies - detects complex cycles", () => {
  const tasks = [
    { name: "a", dependsOn: ["c"] },
    { name: "b", dependsOn: ["a"] },
    { name: "c", dependsOn: ["b"] },
  ];
  assertThrows(() => resolveDependencies(tasks), Error, "Circular dependency");
});

Deno.test("resolveDependencies - unknown dependency", () => {
  const tasks = [{ name: "a", dependsOn: ["unknown"] }];
  assertThrows(() => resolveDependencies(tasks), Error, "unknown task");
});

Deno.test("resolveDependencies - empty list", () => {
  assertEquals(resolveDependencies([]), []);
});

Deno.test("resolveDependencies - single task no deps", () => {
  const tasks = [{ name: "solo", dependsOn: [] }];
  assertEquals(resolveDependencies(tasks), ["solo"]);
});

Deno.test("resolveDependencies - diamond dependency", () => {
  // d depends on b and c, both depend on a
  const tasks = [
    { name: "d", dependsOn: ["b", "c"] },
    { name: "c", dependsOn: ["a"] },
    { name: "b", dependsOn: ["a"] },
    { name: "a", dependsOn: [] },
  ];
  const result = resolveDependencies(tasks);
  assertEquals(result[0], "a"); // a must be first
  assertEquals(result[3], "d"); // d must be last
  // b and c can be in either order, but both before d
  assertEquals(result.indexOf("b") < result.indexOf("d"), true);
  assertEquals(result.indexOf("c") < result.indexOf("d"), true);
});

Deno.test("getDependencies - transitive", () => {
  const tasks = [
    { name: "c", dependsOn: ["b"] },
    { name: "b", dependsOn: ["a"] },
    { name: "a", dependsOn: [] },
  ];
  assertEquals(getDependencies("c", tasks), ["a", "b", "c"]);
});

Deno.test("getDependencies - single task no deps", () => {
  const tasks = [{ name: "solo", dependsOn: [] }];
  assertEquals(getDependencies("solo", tasks), ["solo"]);
});

Deno.test("getDependencies - unknown task returns empty", () => {
  const tasks = [{ name: "a", dependsOn: [] }];
  assertEquals(getDependencies("unknown", tasks), []);
});

Deno.test("getDependencies - diamond dependency", () => {
  const tasks = [
    { name: "d", dependsOn: ["b", "c"] },
    { name: "c", dependsOn: ["a"] },
    { name: "b", dependsOn: ["a"] },
    { name: "a", dependsOn: [] },
  ];
  const deps = getDependencies("d", tasks);
  assertEquals(deps.includes("a"), true);
  assertEquals(deps.includes("b"), true);
  assertEquals(deps.includes("c"), true);
  assertEquals(deps.includes("d"), true);
  assertEquals(deps.length, 4);
  // d should be last
  assertEquals(deps[deps.length - 1], "d");
});
