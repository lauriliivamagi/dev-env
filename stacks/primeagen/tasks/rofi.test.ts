import { assertEquals } from "@std/assert";
import { ensureDockerImage, runTaskInDocker } from "../../../src/lib/test-utils.ts";

Deno.test({
  name: "rofi task installs and verifies",
  async fn() {
    await ensureDockerImage();
    const result = await runTaskInDocker("rofi");
    assertEquals(result.code, 0, `Task failed:\n${result.output}`);
  },
  sanitizeResources: false,
  sanitizeOps: false,
});
