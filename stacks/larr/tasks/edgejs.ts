import { type TaskContext, log, verify as v } from "../../../src/lib/mod.ts";
import { curlPipe } from "../../../src/lib/shell.ts";

// Edge.js (edgejs.org, by Wasmer): a secure, Node.js-compatible JavaScript
// runtime that sandboxes via WebAssembly in `--safe` mode. Installs a
// standalone `edge` binary into ~/.edgejs/bin. EDGEJS_HOME + PATH are set in
// env/.zshrc (synced separately), so this task only installs the binary.
//
// Edge.js has no versioned stable releases yet: wasmerio/edgejs publishes
// none, and the installer falls back to the rolling `0.0.0-v8-nightly` tag
// in wasmerio/edgejs-nightlies. `edge --version` only reports the Node
// compat level (e.g. v24.13.2-pre), which doesn't change between nightlies,
// so there is no version string to pin. What the installer does preserve is
// the build timestamp on bin/edge (unzip + rsync -a keep it), so the pin is
// the build date of the nightly this task was last validated against.
// Bump it to pull a newer nightly onto existing machines; once upgraded the
// binary is at least that new, so the check stays idempotent even after the
// rolling tag moves on again.
export const dependsOn = ["dev-utils"]; // curl, unzip, jq (installer parses GitHub release JSON)

const MIN_BUILD_DATE = "2026-09-02"; // nightly build e1b732c

export async function shouldRun(ctx: TaskContext): Promise<boolean> {
  const edgeBin = `${ctx.home}/.edgejs/bin/edge`;
  let stat: Deno.FileInfo;
  try {
    stat = await Deno.stat(edgeBin);
  } catch {
    return true; // not installed
  }

  const built = stat.mtime;
  if (!built) {
    return true; // no timestamp available, run to be safe
  }

  if (built >= new Date(MIN_BUILD_DATE)) {
    return false; // build is at least as new as the pin - skip
  }

  const builtDate = built.toISOString().slice(0, 10);
  log.info(
    `Edge.js build from ${builtDate} installed, upgrading to nightly >= ${MIN_BUILD_DATE}`,
  );
  return true;
}

export async function run(ctx: TaskContext): Promise<void> {
  log.info("Installing Edge.js runtime (latest nightly)");
  // The installer overwrites ~/.edgejs in place (rsync -a), so the same call
  // serves fresh installs and upgrades. Without a TTY it skips its "install
  // Wasmer?" prompt (wasmer.ts covers that) and leaves ~/.zshrc alone when
  // EDGEJS_HOME is already exported there.
  await curlPipe(ctx, "https://edgejs.org/install", ["bash"]);
  log.success("Edge.js installed");
}

export async function verify(ctx: TaskContext): Promise<void> {
  await v.assertCommandWithPath(
    ctx.home,
    "edge",
    `${ctx.home}/.edgejs/bin/edge`,
    "--version",
  );
}
