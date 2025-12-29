import { assertEquals } from "@std/assert";
import { ensureDockerImage, runTaskInDocker } from "../lib/test-utils.ts";

Deno.test({
  name: "rust task installs and verifies",
  async fn() {
    await ensureDockerImage();
    // Rust installation via curl-pipe takes longer
    const result = await runTaskInDocker("rust", { timeout: 600000 }); // 10 min
    assertEquals(result.code, 0, `Task failed:\n${result.output}`);
  },
  sanitizeResources: false,
  sanitizeOps: false,
});
