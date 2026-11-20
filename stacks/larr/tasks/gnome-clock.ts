import { join } from "@std/path";
import { assert, log, type TaskContext } from "../../../src/lib/mod.ts";
import { checkCommandOutput, runOrFail } from "../../../src/lib/shell.ts";

// Shows an ISO 8601 datetime in the GNOME top-bar clock.
//
// GNOME's built-in clock takes its format from the locale and has no setting
// for a custom one, so we install the "Panel Date Format" extension, which
// replaces the clock text with a GLib.DateTime format string.
// https://extensions.gnome.org/extension/1462/panel-date-format/
// https://github.com/KEIII/gnome-shell-panel-date-format
//
// On Wayland, GNOME Shell only discovers newly installed extensions at login,
// so after the first install the clock changes on the next login.

const EXT_UUID = "panel-date-format@keiii.github.com";
const CLOCK_FORMAT = "%Y-%m-%dT%H:%M:%S";
const FORMAT_KEY = "/org/gnome/shell/extensions/panel-date-format/format";

function isGnomeSession(): boolean {
  const hasDisplay = Deno.env.get("DISPLAY") || Deno.env.get("WAYLAND_DISPLAY");
  const desktop = (Deno.env.get("XDG_CURRENT_DESKTOP") ?? "").toLowerCase();
  return !!hasDisplay && desktop.includes("gnome");
}

function extensionDir(ctx: TaskContext): string {
  return join(ctx.home, ".local/share/gnome-shell/extensions", EXT_UUID);
}

// Read-only state checks (bypass dry-run so shouldRun/verify see reality).

async function read(cmd: string[]): Promise<string> {
  const result = await checkCommandOutput(cmd);
  assert(result.code === 0, `Command failed: ${cmd.join(" ")}`);
  return (result.stdout ?? "").trim();
}

// Parse a GVariant string array as printed by gsettings: "['a', 'b']" or "@as []".
function parseStringList(gvariant: string): string[] {
  return [...gvariant.matchAll(/'([^']*)'/g)].map((m) => m[1]!);
}

async function enabledExtensions(): Promise<string[]> {
  return parseStringList(
    await read(["gsettings", "get", "org.gnome.shell", "enabled-extensions"]),
  );
}

async function isInstalled(ctx: TaskContext): Promise<boolean> {
  try {
    const stat = await Deno.stat(join(extensionDir(ctx), "metadata.json"));
    return stat.isFile;
  } catch {
    return false;
  }
}

async function isEnabled(): Promise<boolean> {
  return (await enabledExtensions()).includes(EXT_UUID);
}

async function hasFormat(): Promise<boolean> {
  return (await read(["dconf", "read", FORMAT_KEY])) === `'${CLOCK_FORMAT}'`;
}

async function showsSeconds(): Promise<boolean> {
  // The extension redraws on the built-in clock's tick, which is once a
  // minute unless clock-show-seconds is on.
  return (await read([
    "gsettings",
    "get",
    "org.gnome.desktop.interface",
    "clock-show-seconds",
  ])) === "true";
}

async function gnomeShellMajorVersion(): Promise<string> {
  // "GNOME Shell 50.1" -> "50"
  const out = await read(["gnome-shell", "--version"]);
  const m = out.match(/(\d+)(?:\.\d+)*/);
  assert(m !== null, `Could not parse GNOME Shell version from: ${out}`);
  return m[1]!;
}

export async function shouldRun(ctx: TaskContext): Promise<boolean> {
  if (!isGnomeSession()) {
    log.warn("Not in a GNOME graphical session, skipping clock setup");
    return false;
  }
  return !(
    await isInstalled(ctx) &&
    await isEnabled() &&
    await hasFormat() &&
    await showsSeconds()
  );
}

export async function run(ctx: TaskContext): Promise<void> {
  assert(isGnomeSession(), "gnome-clock requires a GNOME graphical session");
  log.info(`Setting GNOME top-bar clock to ISO format (${CLOCK_FORMAT})`);

  if (!await isInstalled(ctx)) {
    const shellVersion = await gnomeShellMajorVersion();
    const url = "https://extensions.gnome.org/download-extension/" +
      `${EXT_UUID}.shell-extension.zip?shell_version=${shellVersion}`;
    const zipPath = join("/tmp", `${EXT_UUID}.zip`);

    await runOrFail(ctx, ["curl", "-fsSL", "-o", zipPath, url]);
    await runOrFail(ctx, ["gnome-extensions", "install", "--force", zipPath]);
    if (!ctx.dryRun) {
      await Deno.remove(zipPath).catch(() => {});
      log.info("Extension installed; log out and back in for it to load");
    }
  }

  // Add to enabled-extensions directly rather than `gnome-extensions enable`,
  // which fails until GNOME Shell has loaded the extension (next login on
  // Wayland). GNOME Shell enables it from this list once it sees it.
  const enabled = await enabledExtensions();
  if (!enabled.includes(EXT_UUID)) {
    const list = [...enabled, EXT_UUID].map((uuid) => `'${uuid}'`).join(", ");
    await runOrFail(ctx, [
      "gsettings",
      "set",
      "org.gnome.shell",
      "enabled-extensions",
      `[${list}]`,
    ]);
  }

  // dconf write needs no schema, so this works before the extension's schema
  // is loaded by GNOME Shell.
  await runOrFail(ctx, ["dconf", "write", FORMAT_KEY, `'${CLOCK_FORMAT}'`]);

  await runOrFail(ctx, [
    "gsettings",
    "set",
    "org.gnome.desktop.interface",
    "clock-show-seconds",
    "true",
  ]);

  log.success("GNOME clock configured");
}

export async function verify(ctx: TaskContext): Promise<void> {
  if (!isGnomeSession()) return;

  assert(await isInstalled(ctx), `Extension ${EXT_UUID} is not installed`);
  assert(await isEnabled(), `Extension ${EXT_UUID} is not in enabled-extensions`);
  assert(await hasFormat(), `Clock format is not set to ${CLOCK_FORMAT}`);
  assert(await showsSeconds(), "clock-show-seconds is not enabled");
}
