import { type TaskContext, fs, log, verify as v } from "../../../src/lib/mod.ts";
import { checkCommandOutput, curl, runOrFail } from "../../../src/lib/shell.ts";
import { join } from "@std/path";

const GO_VERSION = "1.26.2";

/**
 * Compare two semver version strings.
 * Returns: -1 if a < b, 0 if a === b, 1 if a > b
 */
function compareVersions(a: string, b: string): number {
  const partsA = a.split(".").map(Number);
  const partsB = b.split(".").map(Number);
  for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
    const numA = partsA[i] ?? 0;
    const numB = partsB[i] ?? 0;
    if (numA < numB) return -1;
    if (numA > numB) return 1;
  }
  return 0;
}

/**
 * Check if Go needs to be installed or upgraded.
 * Returns true if task should run, false if current version matches.
 */
export async function shouldRun(_ctx: TaskContext): Promise<boolean> {
  const goBin = "/usr/local/go/bin/go";
  try {
    await Deno.stat(goBin);
  } catch {
    return true; // Go not installed
  }

  // Check installed version using checkCommandOutput (explicitly bypasses dry-run for state checks)
  const result = await checkCommandOutput([goBin, "version"]);
  if (result.code !== 0) return true;

  // Parse version: "go version go1.23.4 linux/amd64"
  const match = result.stdout?.match(/go(\d+\.\d+\.\d+)/);
  const installedVersion = match?.[1];

  if (!installedVersion) {
    return true; // Couldn't parse version, run to be safe
  }

  const cmp = compareVersions(installedVersion, GO_VERSION);

  if (cmp >= 0) {
    // Installed version is equal or newer - skip
    return false;
  }

  // Installed version is older - upgrade
  log.info(`Go ${installedVersion} installed, upgrading to ${GO_VERSION}`);
  return true;
}

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
