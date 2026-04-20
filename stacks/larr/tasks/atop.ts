import { type TaskContext, verify as v } from "../../../src/lib/mod.ts";
import { apt, checkCommandOutput, runOrFail } from "../../../src/lib/shell.ts";

// The atop deb package ships defaults in /etc/default/atop
// (LOGINTERVAL=300, LOGGENERATIONS=28, LOGPATH=/var/log/atop).
// We explicitly enable the units so the task is idempotent and survives
// the case where they were previously disabled by hand.
const UNITS = ["atopacct.service", "atop.service", "atop-rotate.timer"];

export async function run(ctx: TaskContext): Promise<void> {
  await apt(ctx, ["atop"]);
  await runOrFail(ctx, ["sudo", "systemctl", "enable", "--now", ...UNITS]);
}

export async function verify(_ctx: TaskContext): Promise<void> {
  await v.assertCommand("atop", "-V");
  await v.assertFile("/etc/default/atop");
  for (const unit of UNITS) {
    const enabled = await checkCommandOutput([
      "systemctl",
      "is-enabled",
      unit,
    ]);
    if (enabled.code !== 0) {
      throw new Error(`${unit} is not enabled: ${enabled.stdout?.trim()}`);
    }
    const active = await checkCommandOutput(["systemctl", "is-active", unit]);
    if (active.code !== 0) {
      throw new Error(`${unit} is not active: ${active.stdout?.trim()}`);
    }
  }
}
