import { type TaskContext, log, verify as v } from "../../../src/lib/mod.ts";
import { apt, aptUpdate, curl, runOrFail } from "../../../src/lib/shell.ts";

const CUDA_PIN_URL =
  "https://developer.download.nvidia.com/compute/cuda/repos/ubuntu2404/x86_64/cuda-ubuntu2404.pin";
const CUDA_DEB_URL =
  "https://developer.download.nvidia.com/compute/cuda/13.1.0/local_installers/cuda-repo-ubuntu2404-13-1-local_13.1.0-590.44.01-1_amd64.deb";

export async function shouldRun(_ctx: TaskContext): Promise<boolean> {
  try {
    await Deno.stat("/usr/local/cuda-13.1/bin/nvcc");
    return false;
  } catch {
    return true;
  }
}

export async function run(ctx: TaskContext): Promise<void> {
  const pinPath = "/tmp/cuda-ubuntu2404.pin";
  const debPath = "/tmp/cuda-repo.deb";

  // 1. Download and install pin file
  log.info("Downloading CUDA apt pin file...");
  await curl(ctx, CUDA_PIN_URL, pinPath);
  await runOrFail(ctx, [
    "sudo",
    "mv",
    pinPath,
    "/etc/apt/preferences.d/cuda-repository-pin-600",
  ]);

  // 2. Download CUDA local repo .deb (~3.8 GB)
  log.info("Downloading CUDA repository package (~3.8 GB)...");
  await curl(ctx, CUDA_DEB_URL, debPath);

  // 3. Install .deb to register local repository
  log.info("Installing CUDA repository...");
  await runOrFail(ctx, ["sudo", "dpkg", "-i", debPath]);

  // 4. Copy GPG keyring
  await runOrFail(ctx, [
    "bash",
    "-c",
    "sudo cp /var/cuda-repo-ubuntu2404-13-1-local/cuda-*-keyring.gpg /usr/share/keyrings/",
  ]);

  // 5. apt update & install cuda-toolkit
  await aptUpdate(ctx);
  await apt(ctx, ["cuda-toolkit-13-1"]);

  log.success("CUDA Toolkit 13.1 installed");
}

export async function verify(_ctx: TaskContext): Promise<void> {
  await v.assertDir("/usr/local/cuda-13.1");
  await v.assertFile("/usr/local/cuda-13.1/bin/nvcc");
}
