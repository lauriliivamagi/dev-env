import { join } from "@std/path";
import { exists } from "@std/fs";
import { assert, log, type TaskContext } from "../../../src/lib/mod.ts";
import { runOrFail } from "../../../src/lib/shell.ts";

// Lets VS Code Insiders' Chromium sandbox create user namespaces.
//
// Ubuntu 24.04+ sets kernel.apparmor_restrict_unprivileged_userns=1, so only
// processes under an AppArmor profile that grants `userns` may create one. The
// apparmor package grants it to stable VS Code (/etc/apparmor.d/code) but has
// no profile for /usr/share/code-insiders. Insiders 1.140 shipped chrome-sandbox
// setuid root, which Chromium falls back to; 1.141.0 ships it 0755, so the
// fallback aborts with "The SUID sandbox helper binary was found, but is not
// configured correctly" and no window opens. The kernel log shows
// `DENIED capable sys_admin profile="unprivileged_userns" comm="code-insiders"`.
//
// The profile copies Ubuntu's `code` profile: unconfined plus `userns`. No
// package owns the file, so Insiders upgrades leave it alone, whereas a chmod
// 4755 on chrome-sandbox is undone by every upgrade. Retire this task once
// `dpkg -S /etc/apparmor.d/code-insiders` names a package, or once the deb
// ships chrome-sandbox setuid again.
export const dependsOn = ["vscode"];

const PROFILE = "code-insiders";
const PROFILE_PATH = `/etc/apparmor.d/${PROFILE}`;
const RESTRICT_SYSCTL =
  "/proc/sys/kernel/apparmor_restrict_unprivileged_userns";
const LOADED_PROFILES = "/sys/kernel/security/apparmor/policy/profiles";

const CONTENT =
  `# Written by dev-env (stacks/larr/tasks/code-insiders-apparmor.ts); edits are overwritten.
# Mirrors Ubuntu's /etc/apparmor.d/code for stable VS Code. This profile
# allows everything and only exists to give the application a name instead
# of having the label "unconfined".

abi <abi/4.0>,
include <tunables/global>

profile ${PROFILE} /usr/share/code-insiders{/bin,}/code-insiders flags=(unconfined) {
  userns,
  @{exec_path} mr,

  # Site-specific additions and overrides. See local/README for details.
  include if exists <local/${PROFILE}>
}
`;

// The restriction is on and AppArmor is mediating. A container reads the
// host's sysctl but has no securityfs, so the Docker tests skip this task.
async function restricted(): Promise<boolean> {
  try {
    const value = await Deno.readTextFile(RESTRICT_SYSCTL);
    return value.trim() === "1" && await exists(LOADED_PROFILES);
  } catch {
    return false; // Kernel without Ubuntu's userns restriction
  }
}

async function installed(): Promise<boolean> {
  try {
    return await Deno.readTextFile(PROFILE_PATH) === CONTENT;
  } catch {
    return false;
  }
}

// /sys/kernel/security/apparmor/profiles is root-only, but each loaded
// profile's directory under policy/profiles has a world-readable name file.
async function loaded(): Promise<boolean> {
  for await (const entry of Deno.readDir(LOADED_PROFILES)) {
    try {
      const name = await Deno.readTextFile(
        join(LOADED_PROFILES, entry.name, "name"),
      );
      if (name.trim() === PROFILE) return true;
    } catch {
      // Profile replaced while listing
    }
  }
  return false;
}

export async function shouldRun(_ctx: TaskContext): Promise<boolean> {
  if (!await restricted()) return false;
  return !(await installed() && await loaded());
}

export async function run(ctx: TaskContext): Promise<void> {
  log.info(`Installing AppArmor profile ${PROFILE_PATH}`);

  if (!await installed()) {
    const tmp = await Deno.makeTempFile({ prefix: `${PROFILE}-apparmor-` });
    try {
      await Deno.writeTextFile(tmp, CONTENT);
      await runOrFail(ctx, [
        "sudo",
        "install",
        "-m",
        "0644",
        tmp,
        PROFILE_PATH,
      ]);
    } finally {
      await Deno.remove(tmp);
    }
  }
  await runOrFail(ctx, ["sudo", "apparmor_parser", "-r", PROFILE_PATH]);

  log.success(`AppArmor profile ${PROFILE} loaded`);
}

export async function verify(_ctx: TaskContext): Promise<void> {
  if (!await restricted()) return;

  assert(await installed(), `${PROFILE_PATH} is missing or differs`);
  assert(await loaded(), `AppArmor profile ${PROFILE} is not loaded`);
}
