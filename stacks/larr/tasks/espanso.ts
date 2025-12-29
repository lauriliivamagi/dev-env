import { dirname, join } from "@std/path";
import { exists } from "@std/fs";
import { parse as parseYaml } from "@std/yaml";
import { type TaskContext, assert, fs, log, verify as v } from "../../../src/lib/mod.ts";
import { curl, run as shellRun, runOrFail } from "../../../src/lib/shell.ts";

const VERSION = "2.3.0";
const DEB_URL =
  `https://github.com/espanso/espanso/releases/download/v${VERSION}/espanso-debian-wayland-amd64.deb`;

export const dependsOn = ["sops"];

interface EspansoSecretsFile {
  espanso_config: Record<string, string>;
}

export async function run(ctx: TaskContext): Promise<void> {
  // Install espanso
  const debPath = join("/tmp", `espanso-${VERSION}.deb`);

  log.info(`Downloading espanso v${VERSION} for Wayland`);
  await curl(ctx, DEB_URL, debPath);

  log.info("Installing espanso .deb package");
  // dpkg may fail with dependency errors, apt install -f will fix them
  await shellRun(ctx, ["sudo", "dpkg", "-i", debPath]);
  await runOrFail(ctx, ["sudo", "apt", "install", "-f", "-y"]);

  // Install config from encrypted secrets
  await installConfig(ctx);
}

async function installConfig(ctx: TaskContext): Promise<void> {
  const secretsFile = join(ctx.stackRoot, "secrets", "espanso.enc.yaml");

  if (!await exists(secretsFile)) {
    log.info("No secrets/espanso.enc.yaml found - skipping config installation");
    return;
  }

  // Check if age key exists before attempting decryption
  const ageKeyFile = join(ctx.configHome, "sops", "age", "keys.txt");
  if (!await exists(ageKeyFile)) {
    log.warn(`Age key not found at ${ageKeyFile} - skipping config installation`);
    return;
  }

  const espansoDir = join(ctx.configHome, "espanso");

  log.info("Decrypting espanso config from secrets/espanso.enc.yaml");

  if (ctx.dryRun) {
    log.dryRun("sops -d secrets/espanso.enc.yaml");
    return;
  }

  // sops is installed to ~/.local/bin, add it to PATH
  const currentPath = Deno.env.get("PATH") ?? "";
  const extendedPath = `${ctx.home}/.local/bin:${currentPath}`;

  const result = await shellRun(ctx, ["sops", "-d", secretsFile], {
    stdout: "piped",
    stderr: "piped",
    env: { PATH: extendedPath },
  });

  if (result.code !== 0) {
    throw new Error(
      `Failed to decrypt espanso secrets: ${result.stderr ?? "unknown error"}`,
    );
  }

  assert(result.stdout !== undefined, "sops produced no output");

  const secrets = parseYaml(result.stdout) as EspansoSecretsFile;
  assert(secrets.espanso_config !== undefined, "secrets file missing espanso_config field");

  // Write each config file to ~/.config/espanso/
  for (const [filename, content] of Object.entries(secrets.espanso_config)) {
    const filePath = join(espansoDir, filename);
    const dir = dirname(filePath);

    await fs.mkdir(ctx, dir);
    await fs.writeFile(ctx, filePath, content);
    log.success(`Installed ${filename}`);
  }

  log.success("Espanso config installed");
}

export async function verify(_ctx: TaskContext): Promise<void> {
  // Espanso needs a display, just verify the binary exists
  await v.assertFile("/usr/bin/espanso");
}
