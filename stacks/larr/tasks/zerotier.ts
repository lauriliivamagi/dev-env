import { type TaskContext, log, verify as v } from "../../../src/lib/mod.ts";
import { apt, checkCommandOutput, runOrFail } from "../../../src/lib/shell.ts";

// ZeroTier publishes a per-codename apt repo at download.zerotier.com/debian.
// We install the daemon only; join networks manually with
// `sudo zerotier-cli join <network-id>`.
const KEYRING = "/usr/share/keyrings/zerotier.gpg";
const REPO_LIST = "/etc/apt/sources.list.d/zerotier.list";
const SERVICE = "zerotier-one.service";

export async function shouldRun(_ctx: TaskContext): Promise<boolean> {
  try {
    await Deno.stat("/usr/sbin/zerotier-one");
    return false; // already installed
  } catch {
    return true;
  }
}

export async function run(ctx: TaskContext): Promise<void> {
  log.info("Installing ZeroTier One");

  // Add ZeroTier's official (ASCII-armored) GPG key, dearmored into a keyring.
  log.info("Adding ZeroTier GPG key");
  await runOrFail(ctx, [
    "bash",
    "-c",
    `curl -fsSL 'https://raw.githubusercontent.com/zerotier/ZeroTierOne/master/doc/contact@zerotier.com.gpg' | gpg --dearmor | sudo tee ${KEYRING} > /dev/null`,
  ]);

  // Add ZeroTier repository (path and dist are the Ubuntu codename).
  log.info("Adding ZeroTier repository");
  await runOrFail(ctx, [
    "bash",
    "-c",
    `CODENAME="$(. /etc/os-release && echo "$VERSION_CODENAME")" && echo "deb [signed-by=${KEYRING}] https://download.zerotier.com/debian/$CODENAME $CODENAME main" | sudo tee ${REPO_LIST} > /dev/null`,
  ]);

  // Update and install.
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
