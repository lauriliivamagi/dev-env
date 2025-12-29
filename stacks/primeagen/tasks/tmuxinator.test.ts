import { assertEquals } from "@std/assert";
import { ensureDockerImage, runTaskInDocker } from "../../../src/lib/test-utils.ts";

Deno.test({
  name: "tmuxinator task installs and verifies",
  async fn() {
    await ensureDockerImage();
    // Ruby + gem install takes a bit longer
    const result = await runTaskInDocker("tmuxinator", { timeout: 300000 });
    assertEquals(result.code, 0, `Task failed:\n${result.output}`);
  },
  sanitizeResources: false,
  sanitizeOps: false,
});
