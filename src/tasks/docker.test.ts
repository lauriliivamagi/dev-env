import { assertEquals } from "@std/assert";
import { ensureDockerImage, runTaskInDocker } from "../lib/test-utils.ts";

Deno.test({
  name: "docker task installs and verifies",
  async fn() {
    await ensureDockerImage();
    // Docker task requires privileged mode and socket mount
    const result = await runTaskInDocker("docker", {
      privileged: true,
      mountDockerSocket: true,
      timeout: 600000, // 10 min
    });
    assertEquals(result.code, 0, `Task failed:\n${result.output}`);
  },
  sanitizeResources: false,
  sanitizeOps: false,
});
