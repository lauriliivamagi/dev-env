import { type TaskContext, log, verify as v } from "../../../src/lib/mod.ts";
import { apt, runOrFail } from "../../../src/lib/shell.ts";

export async function run(ctx: TaskContext): Promise<void> {
  log.info("Installing Docker CE");

  // Add Docker's official GPG key
  log.info("Adding Docker GPG key");
  await runOrFail(ctx, ["sudo", "apt", "update"]);
  await apt(ctx, ["ca-certificates", "curl"]);
  await runOrFail(ctx, ["sudo", "install", "-m", "0755", "-d", "/etc/apt/keyrings"]);
  await runOrFail(ctx, [
    "bash",
    "-c",
    "sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc && sudo chmod a+r /etc/apt/keyrings/docker.asc",
  ]);

  // Add Docker repository
  log.info("Adding Docker repository");
  await runOrFail(ctx, [
    "bash",
    "-c",
    'echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null',
  ]);

  // Update and install Docker packages
  await runOrFail(ctx, ["sudo", "apt", "update"]);
  await apt(ctx, [
    "docker-ce",
    "docker-ce-cli",
    "docker-ce-rootless-extras",
    "containerd.io",
    "docker-buildx-plugin",
    "docker-compose-plugin",
  ]);

  // Add current user to docker group
  log.info("Adding user to docker group");
  const user = Deno.env.get("USER") || "larr";
  await runOrFail(ctx, ["sudo", "usermod", "-aG", "docker", user]);

  log.success("Docker installed");
  log.warn("Log out and back in for docker group membership to take effect");
}

export async function verify(_ctx: TaskContext): Promise<void> {
  await v.assertCommand("docker", "--version");
  await v.assertCommand("docker", "compose", "version");
}
