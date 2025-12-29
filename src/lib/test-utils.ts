/**
 * Test utilities for running tasks in Docker containers.
 */

const IMAGE = "dev-env-test";
const DOCKERFILE = "Dockerfile.test";

export interface DockerRunOptions {
  privileged?: boolean;
  mountDockerSocket?: boolean;
  timeout?: number; // in milliseconds
}

export interface DockerRunResult {
  code: number;
  output: string;
}

let imageBuilt = false;

/**
 * Ensure the Docker test image is built.
 * Only builds once per test run.
 */
export async function ensureDockerImage(): Promise<void> {
  if (imageBuilt) {
    return;
  }

  console.log("Building Docker test image...");
  const cmd = new Deno.Command("docker", {
    args: ["build", "-t", IMAGE, "-f", DOCKERFILE, "."],
    stdout: "piped",
    stderr: "piped",
  });

  const { code, stderr } = await cmd.output();
  if (code !== 0) {
    const errorText = new TextDecoder().decode(stderr);
    throw new Error(`Failed to build Docker image: ${errorText}`);
  }

  imageBuilt = true;
  console.log("Docker test image built successfully");
}

/**
 * Run a task inside a Docker container.
 */
export async function runTaskInDocker(
  taskName: string,
  options: DockerRunOptions = {},
): Promise<DockerRunResult> {
  const args = ["run", "--rm"];

  // Environment variables
  args.push("-e", "HOME=/home/testuser");
  args.push("-e", "USER=testuser");
  args.push("-e", "XDG_CONFIG_HOME=/home/testuser/.config");
  args.push("-e", "DEV_ENV=/home/testuser/dev-env");

  // Privileged mode for docker task
  if (options.privileged) {
    args.push("--privileged");
  }

  // Mount Docker socket for docker-in-docker
  if (options.mountDockerSocket) {
    args.push("-v", "/var/run/docker.sock:/var/run/docker.sock");
  }

  args.push(IMAGE);

  // Run apt update then the task
  args.push("sh", "-c", `sudo apt-get update -qq && deno task run ${taskName}`);

  const cmd = new Deno.Command("docker", {
    args,
    stdout: "piped",
    stderr: "piped",
  });

  const abortController = new AbortController();
  const timeout = options.timeout ?? 300000; // 5 minutes default

  const timeoutId = setTimeout(() => {
    abortController.abort();
  }, timeout);

  try {
    const { code, stdout, stderr } = await cmd.output();
    clearTimeout(timeoutId);

    const output = new TextDecoder().decode(stdout) +
      new TextDecoder().decode(stderr);

    return { code, output };
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      return {
        code: 124, // timeout exit code
        output: `Task timed out after ${timeout}ms`,
      };
    }
    throw error;
  }
}

/**
 * Clean up Docker resources.
 */
export async function cleanupDocker(): Promise<void> {
  const cmd = new Deno.Command("docker", {
    args: ["rmi", IMAGE],
    stdout: "null",
    stderr: "null",
  });
  await cmd.output();
  imageBuilt = false;
}
