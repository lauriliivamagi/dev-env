import { type TaskContext, log, verify as v } from "../lib/mod.ts";
import { apt, aptUpdate, runOrFail } from "../lib/shell.ts";

export async function run(ctx: TaskContext): Promise<void> {
  log.info("Installing Docker prerequisites");
  await apt(ctx, [
    "ca-certificates",
    "curl",
    "gnupg",
    "lsb-release",
  ]);

  log.info("Adding Docker GPG key");
  await runOrFail(ctx, ["sudo", "mkdir", "-p", "/etc/apt/keyrings"]);
  await runOrFail(ctx, [
    "sh", "-c",
    "curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg",
  ]);

  log.info("Adding Docker repository");
  await runOrFail(ctx, [
    "sh", "-c",
    'echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null',
  ]);

  await aptUpdate(ctx);

  log.info("Installing Docker");
  await apt(ctx, [
    "docker-ce",
    "docker-ce-cli",
    "containerd.io",
    "docker-buildx-plugin",
    "docker-compose-plugin",
  ]);

  log.info("Adding user to docker group");
  await runOrFail(ctx, ["sudo", "groupadd", "-f", "docker"]);
  await runOrFail(ctx, ["sudo", "usermod", "-aG", "docker", Deno.env.get("USER")!]);

  log.warn("You may need to log out and back in for docker group changes to take effect");
}

export async function verify(_ctx: TaskContext): Promise<void> {
  await v.assertCommand("docker", "--version");
  await v.assertFile("/etc/apt/keyrings/docker.gpg");
}
