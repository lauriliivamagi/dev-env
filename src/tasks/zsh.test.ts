import { assertEquals } from "@std/assert";
import { ensureDockerImage, runTaskInDocker } from "../lib/test-utils.ts";

Deno.test({
  name: "zsh task installs and verifies",
  async fn() {
    await ensureDockerImage();
    // zsh with oh-my-zsh takes a bit longer
    const result = await runTaskInDocker("zsh", { timeout: 300000 }); // 5 min
    assertEquals(result.code, 0, `Task failed:\n${result.output}`);
  },
  sanitizeResources: false,
  sanitizeOps: false,
});
