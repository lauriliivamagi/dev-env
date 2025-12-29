import { assertEquals } from "@std/assert";
import { ensureDockerImage, runTaskInDocker } from "../lib/test-utils.ts";

Deno.test({
  name: "node task installs and verifies",
  async fn() {
    await ensureDockerImage();
    // Node installation includes npm, n, deno, and bun - takes longer
    const result = await runTaskInDocker("node", { timeout: 600000 }); // 10 min
    assertEquals(result.code, 0, `Task failed:\n${result.output}`);
  },
  sanitizeResources: false,
  sanitizeOps: false,
});
