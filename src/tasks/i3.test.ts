import { assertEquals } from "@std/assert";
import { ensureDockerImage, runTaskInDocker } from "../lib/test-utils.ts";

Deno.test({
  name: "i3 task installs and verifies",
  async fn() {
    await ensureDockerImage();
    const result = await runTaskInDocker("i3");
    assertEquals(result.code, 0, `Task failed:\n${result.output}`);
  },
  sanitizeResources: false,
  sanitizeOps: false,
});
