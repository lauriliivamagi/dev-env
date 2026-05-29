import { assert, type TaskContext, log, verify as v } from "../../../src/lib/mod.ts";
import {
  apt,
  checkCommandOutput,
  runOrFail,
} from "../../../src/lib/shell.ts";

// ZeroTier publishes a per-codename apt repo at download.zerotier.com/debian.
// It does NOT publish every Ubuntu codename (e.g. no oracular/questing as of
// 2026-05), so we fall back to the newest published codename that is the same
// or older than the host. We install the daemon only; join networks manually
// with `sudo zerotier-cli join <network-id>`.
const KEYRING = "/usr/share/keyrings/zerotier.gpg";
const REPO_LIST = "/etc/apt/sources.list.d/zerotier.list";
const SERVICE = "zerotier-one.service";
const KEY_URL =
  "https://raw.githubusercontent.com/zerotier/ZeroTierOne/master/doc/contact@zerotier.com.gpg";

// Ubuntu codenames in release order (oldest first).
const UBUNTU_CODENAMES = [
  "focal", // 20.04
  "jammy", // 22.04
  "noble", // 24.04
  "oracular", // 24.10
  "plucky", // 25.04
  "questing", // 25.10
];

export async function shouldRun(_ctx: TaskContext): Promise<boolean> {
  try {
    await Deno.stat("/usr/sbin/zerotier-one");
    return false; // already installed
  } catch {
    return true;
  }
}

async function hostCodename(): Promise<string> {
  const out = await checkCommandOutput([
    "bash",
    "-c",
    '. /etc/os-release && echo "$VERSION_CODENAME"',
  ]);
  return (out.stdout ?? "").trim();
}

async function zerotierPublishes(codename: string): Promise<boolean> {
  const url =
    `https://download.zerotier.com/debian/${codename}/dists/${codename}/Release`;
  try {
    const res = await fetch(url, { method: "HEAD" });
    await res.body?.cancel();
    return res.ok;
  } catch {
    return false;
  }
}

// Resolve the codename whose ZeroTier repo we should point at: the host's own
// if published, otherwise the newest published codename <= host.
async function resolveRepoCodename(): Promise<string> {
  const host = await hostCodename();
  assert(host.length > 0, "could not determine host Ubuntu codename");

  if (await zerotierPublishes(host)) return host;

  // Host unpublished: walk older codenames newest-first. If the host isn't in
  // our list (newer than we know about), consider every known codename.
  const hostIdx = UBUNTU_CODENAMES.indexOf(host);
  const ceiling = hostIdx === -1 ? UBUNTU_CODENAMES.length - 1 : hostIdx - 1;
  for (let i = ceiling; i >= 0; i--) {
    const c = UBUNTU_CODENAMES[i]!;
    if (await zerotierPublishes(c)) {
      log.warn(
        `ZeroTier has no apt repo for '${host}'; falling back to '${c}'`,
      );
      return c;
    }
  }
  throw new Error(
    `No ZeroTier apt repo for '${host}' or any older Ubuntu codename`,
  );
}

export async function run(ctx: TaskContext): Promise<void> {
  log.info("Installing ZeroTier One");

  // curl and gnupg (for `gpg --dearmor`) come from the dev-utils task.
  const codename = await resolveRepoCodename();

  // Add ZeroTier's official (ASCII-armored) GPG key, dearmored into a keyring.
  // pipefail ensures a curl/gpg failure aborts instead of writing a broken
  // keyring (tee, the last stage, would otherwise mask the error).
  log.info("Adding ZeroTier GPG key");
  await runOrFail(ctx, [
    "bash",
    "-c",
    `set -o pipefail; curl -fsSL '${KEY_URL}' | gpg --dearmor | sudo tee ${KEYRING} > /dev/null`,
  ]);

  log.info(`Adding ZeroTier repository (codename: ${codename})`);
  await runOrFail(ctx, [
    "bash",
    "-c",
    `echo "deb [signed-by=${KEYRING}] https://download.zerotier.com/debian/${codename} ${codename} main" | sudo tee ${REPO_LIST} > /dev/null`,
  ]);

  await runOrFail(ctx, ["sudo", "apt", "update"]);
  await apt(ctx, ["zerotier-one"]);

  // Enable and start the daemon.
  await runOrFail(ctx, ["sudo", "systemctl", "enable", "--now", SERVICE]);

  log.success("ZeroTier One installed");
  log.info("Join a network with: sudo zerotier-cli join <network-id>");
}

export async function verify(ctx: TaskContext): Promise<void> {
  await v.assertCommandWithPath(
    ctx.home,
    "/usr/sbin/zerotier-one",
    "/usr/sbin/zerotier-one",
    "-v",
  );

  const enabled = await checkCommandOutput([
    "systemctl",
    "is-enabled",
    SERVICE,
  ]);
  if (enabled.code !== 0) {
    throw new Error(`${SERVICE} is not enabled: ${enabled.stdout?.trim()}`);
  }
  const active = await checkCommandOutput(["systemctl", "is-active", SERVICE]);
  if (active.code !== 0) {
    throw new Error(`${SERVICE} is not active: ${active.stdout?.trim()}`);
  }
}
