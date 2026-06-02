import { type TaskContext, log, verify as v } from "../../../src/lib/mod.ts";
import { apt, commandExists, runOrFail } from "../../../src/lib/shell.ts";

// Infisical CLI: secrets manager for fetching/injecting secrets per project.
// Installed from Infisical's official apt repo. We add the key+repo manually
// (matching signal.ts/zerotier.ts) rather than piping the vendor's
// `setup.deb.sh` into `sudo bash`, so the steps stay explicit and auditable.
// This mirrors exactly what that setup script configures.
//
// The CLI is server-agnostic: it talks to Infisical Cloud by default, or to a
// self-hosted server. The active server is chosen at use-time, not here:
//   - INFISICAL_API_URL env var (the self-hosted default lives in env/.zshrc)
//   - per-project `.infisical.json` (created by `infisical init`)
//   - `infisical login --domain <url>` (login state in ~/.infisical/)
// so this task only installs the binary and stays connection-neutral.
const KEYRING = "/usr/share/keyrings/infisical-archive-keyring.gpg";
const REPO_LIST = "/etc/apt/sources.list.d/infisical.list";
const KEY_URL = "https://artifacts-cli.infisical.com/infisical.gpg";
const REPO_URL = "https://artifacts-cli.infisical.com/deb";

export async function shouldRun(_ctx: TaskContext): Promise<boolean> {
  return !(await commandExists("infisical"));
}

export async function run(ctx: TaskContext): Promise<void> {
  log.info("Installing Infisical CLI");

  // curl and gnupg (for `gpg --dearmor`) come from the dev-utils task.
  // Add Infisical's official (ASCII-armored) GPG key, dearmored into a keyring.
  // pipefail ensures a curl/gpg failure aborts instead of writing a broken
  // keyring (tee, the last stage, would otherwise mask the error).
  log.info("Adding Infisical GPG key");
  await runOrFail(ctx, [
    "bash",
    "-c",
    `set -o pipefail; curl -1sLf '${KEY_URL}' | gpg --dearmor | sudo tee ${KEYRING} > /dev/null`,
  ]);

  log.info("Adding Infisical repository");
  await runOrFail(ctx, [
    "bash",
    "-c",
    `echo "deb [arch=$(dpkg --print-architecture) signed-by=${KEYRING}] ${REPO_URL} stable main" | sudo tee ${REPO_LIST} > /dev/null`,
  ]);

  await runOrFail(ctx, ["sudo", "apt", "update"]);
  await apt(ctx, ["infisical"]);

  log.success("Infisical CLI installed");
  log.info(
    "Self-hosted default is INFISICAL_API_URL (set in env/.zshrc); " +
      "override per project with `infisical init` / `infisical login --domain`",
  );
}

export const dependsOn = ["dev-utils"];

export async function verify(_ctx: TaskContext): Promise<void> {
  await v.assertCommand("infisical", "--version");
}
