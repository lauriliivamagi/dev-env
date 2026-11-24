import { assert, log, type TaskContext } from "../../../src/lib/mod.ts";
import { checkCommandOutput, runOrFail } from "../../../src/lib/shell.ts";

// Makes the numpad always type digits and turns Caps Lock into a no-op.
//
// numpad:mac changes the xkb KEYPAD key type so it ignores NumLock and Shift
// and always picks the digit level (KP_0..KP_9, KP_Decimal), as on macOS.
// The NumLock key still toggles its LED, but no longer changes the numpad.
// This also keeps Super+numpad (numpad-app-hotkeys) sending KP_N.
//
// caps:none maps the Caps Lock key to VoidSymbol, so pressing it does nothing.
//
// Other xkb options are kept, except ones in the caps: and numpad: groups,
// which would conflict with these.

const SCHEMA = "org.gnome.desktop.input-sources";
const KEY = "xkb-options";
const WANTED = ["numpad:mac", "caps:none"];
const REPLACED_GROUPS = ["numpad:", "caps:"];

function isGnomeSession(): boolean {
  const hasDisplay = Deno.env.get("DISPLAY") || Deno.env.get("WAYLAND_DISPLAY");
  const desktop = (Deno.env.get("XDG_CURRENT_DESKTOP") ?? "").toLowerCase();
  return !!hasDisplay && desktop.includes("gnome");
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

function formatStringList(items: string[]): string {
  return `[${items.map((s) => `'${s}'`).join(", ")}]`;
}

async function xkbOptions(): Promise<string[]> {
  return parseStringList(await read(["gsettings", "get", SCHEMA, KEY]));
}

function wantedOptions(have: string[]): string[] {
  const kept = have.filter((o) =>
    !REPLACED_GROUPS.some((group) => o.startsWith(group))
  );
  return [...kept, ...WANTED];
}

function isSet(have: string[]): boolean {
  const conflicting = have.filter((o) =>
    REPLACED_GROUPS.some((group) => o.startsWith(group)) && !WANTED.includes(o)
  );
  return WANTED.every((o) => have.includes(o)) && conflicting.length === 0;
}

export async function shouldRun(_ctx: TaskContext): Promise<boolean> {
  if (!isGnomeSession()) {
    log.warn("Not in a GNOME graphical session, skipping lock keys setup");
    return false;
  }
  return !isSet(await xkbOptions());
}

export async function run(ctx: TaskContext): Promise<void> {
  assert(isGnomeSession(), "lock-keys requires a GNOME graphical session");
  log.info("Setting numpad to always type digits and disabling Caps Lock");

  const options = wantedOptions(await xkbOptions());
  assert(isSet(options), "Computed xkb options do not satisfy the wanted set");
  await runOrFail(ctx, [
    "gsettings",
    "set",
    SCHEMA,
    KEY,
    formatStringList(options),
  ]);

  log.success("Numpad always types digits, Caps Lock does nothing");
}

export async function verify(_ctx: TaskContext): Promise<void> {
  if (!isGnomeSession()) return;

  const have = await xkbOptions();
  assert(
    isSet(have),
    `${SCHEMA} ${KEY} should hold ${WANTED.join(", ")} and no other ` +
      `${REPLACED_GROUPS.join("/")} options, but is ${formatStringList(have)}`,
  );
}
