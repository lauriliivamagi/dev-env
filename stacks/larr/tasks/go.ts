import { type TaskContext, fs, log, verify as v } from "../../../src/lib/mod.ts";
import { curl, runOrFail } from "../../../src/lib/shell.ts";
import { join } from "@std/path";

const GO_VERSION = "1.23.4";

export async function run(ctx: TaskContext): Promise<void> {
  log.info(`Installing Go v${GO_VERSION}`);

  const goInstallDir = "/usr/local/go";
  const goTar = "/tmp/go.tar.gz";

  // Download Go
  const goUrl = `https://go.dev/dl/go${GO_VERSION}.linux-amd64.tar.gz`;
  await curl(ctx, goUrl, goTar);

  // Remove existing installation and extract
  await runOrFail(ctx, ["sudo", "rm", "-rf", goInstallDir]);
  await runOrFail(ctx, ["sudo", "tar", "-C", "/usr/local", "-xzf", goTar]);

  // Cleanup
  await fs.remove(ctx, goTar);

  // Create GOPATH directory
  const goPath = join(ctx.home, "go");
  await fs.mkdir(ctx, goPath);
  await fs.mkdir(ctx, join(goPath, "bin"));

  // Add Go to PATH for current process so dependent tasks can use it
  // Skip in realistic test mode - PATH should come from shell config
  if (!Deno.env.get("REALISTIC_TEST")) {
    const currentPath = Deno.env.get("PATH") || "";
    const goBinPath = "/usr/local/go/bin";
    const goPathBin = join(ctx.home, "go", "bin");
    if (!currentPath.includes(goBinPath)) {
      Deno.env.set("PATH", `${goBinPath}:${goPathBin}:${currentPath}`);
    }
  }

  log.success("Go installed");
}

export async function verify(ctx: TaskContext): Promise<void> {
  await v.assertCommandWithPath(ctx.home, "go", "/usr/local/go/bin/go", "version");
}
