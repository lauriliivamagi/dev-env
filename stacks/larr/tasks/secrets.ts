import { type TaskContext, assert, fs, log, verify as v } from "../../../src/lib/mod.ts";
import { run as shellRun } from "../../../src/lib/shell.ts";
import { join } from "@std/path";
import { exists } from "@std/fs";
import { parse as parseYaml } from "@std/yaml";

// Declare dependency on sops task (installs sops and age)
export const dependsOn = ["sops"];

interface SshSecretsFile {
  ssh_keys: Record<string, string>;
}

export async function run(ctx: TaskContext): Promise<void> {
  const secretsFile = join(ctx.stackRoot, "secrets", "ssh.enc.yaml");

  // Check if secrets file exists
  if (!await exists(secretsFile)) {
    log.info("No secrets/ssh.enc.yaml found - skipping SSH key installation");
    log.info("Create secrets/ssh.enc.yaml and encrypt with sops to install SSH keys");
    return;
  }

  // Check if age key exists before attempting decryption
  const ageKeyFile = join(ctx.configHome, "sops", "age", "keys.txt");
  if (!await exists(ageKeyFile)) {
    log.warn(`Age key not found at ${ageKeyFile} - skipping SSH key installation`);
    return;
  }

  // Create ~/.ssh directory with proper permissions
  const sshDir = `${ctx.home}/.ssh`;
  await fs.mkdir(ctx, sshDir);
  if (!ctx.dryRun) {
    await Deno.chmod(sshDir, 0o700);
  }

  // Decrypt secrets file using sops
  log.info("Decrypting SSH keys from secrets/ssh.enc.yaml");

  if (ctx.dryRun) {
    log.dryRun("sops -d secrets/ssh.enc.yaml");
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
      `Failed to decrypt secrets (exit code ${result.code}). Check age key and SOPS config.`,
    );
  }

  assert(result.stdout !== undefined, "sops produced no output");

  // Parse YAML
  const secrets = parseYaml(result.stdout) as SshSecretsFile;
  assert(secrets.ssh_keys !== undefined, "secrets file missing ssh_keys field");

  // Write each key to ~/.ssh/
  for (const [filename, content] of Object.entries(secrets.ssh_keys)) {
    const keyPath = join(sshDir, filename);
    log.info(`Installing SSH key: ${filename}`);

    // Private keys get 600, public keys get 644
    const isPrivateKey = !filename.endsWith(".pub");
    const mode = isPrivateKey ? 0o600 : 0o644;

    await fs.writeFile(ctx, keyPath, content, mode);
    log.success(`Installed ${filename}`);
  }

  log.success("All SSH keys installed");
}

export async function verify(ctx: TaskContext): Promise<void> {
  // Only verify ~/.ssh exists if secrets file was present
  const secretsFile = join(ctx.stackRoot, "secrets", "ssh.enc.yaml");
  if (await exists(secretsFile)) {
    await v.assertDir(`${ctx.home}/.ssh`);
  }
}
