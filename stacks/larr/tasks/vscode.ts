import { type TaskContext, log, verify as v } from "../../../src/lib/mod.ts";
import { apt, runOrFail } from "../../../src/lib/shell.ts";

export async function run(ctx: TaskContext): Promise<void> {
  log.info("Installing VS Code Insiders");

  // Install dependencies
  await apt(ctx, ["apt-transport-https"]);

  // Add Microsoft GPG key
  log.info("Adding Microsoft GPG key");
  await runOrFail(ctx, [
    "bash",
    "-c",
    "wget -qO- https://packages.microsoft.com/keys/microsoft.asc | gpg --dearmor | sudo tee /usr/share/keyrings/packages.microsoft.gpg > /dev/null",
  ]);

  // Add VS Code repository
  log.info("Adding VS Code repository");
  await runOrFail(ctx, [
    "bash",
    "-c",
    'echo "deb [arch=amd64 signed-by=/usr/share/keyrings/packages.microsoft.gpg] https://packages.microsoft.com/repos/code stable main" | sudo tee /etc/apt/sources.list.d/vscode.list',
  ]);

  // Update and install
  await runOrFail(ctx, ["sudo", "apt", "update"]);
  await apt(ctx, ["code-insiders"]);

  log.success("VS Code Insiders installed");
}

export async function verify(_ctx: TaskContext): Promise<void> {
  await v.assertCommand("code-insiders", "--version");
}
