import { type TaskContext, log, verify as v } from "../../../src/lib/mod.ts";
import { apt, runOrFail } from "../../../src/lib/shell.ts";

export async function run(ctx: TaskContext): Promise<void> {
  log.info("Installing Signal Desktop");

  // Add Signal's official GPG key
  log.info("Adding Signal GPG key");
  await runOrFail(ctx, [
    "bash",
    "-c",
    "wget -qO- https://updates.signal.org/desktop/apt/keys.asc | gpg --dearmor | sudo tee /usr/share/keyrings/signal-desktop-keyring.gpg > /dev/null",
  ]);

  // Add Signal repository
  log.info("Adding Signal repository");
  await runOrFail(ctx, [
    "bash",
    "-c",
    'echo "deb [arch=amd64 signed-by=/usr/share/keyrings/signal-desktop-keyring.gpg] https://updates.signal.org/desktop/apt xenial main" | sudo tee /etc/apt/sources.list.d/signal-xenial.list',
  ]);

  // Update and install
  await runOrFail(ctx, ["sudo", "apt", "update"]);
  await apt(ctx, ["signal-desktop"]);

  log.success("Signal Desktop installed");
}

export async function verify(_ctx: TaskContext): Promise<void> {
  // Signal is a GUI app, just verify the binary exists
  await v.assertFile("/opt/Signal/signal-desktop");
}
