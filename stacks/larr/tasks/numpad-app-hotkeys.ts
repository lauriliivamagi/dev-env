import { assert, log, type TaskContext } from "../../../src/lib/mod.ts";
import { checkCommandOutput, runOrFail } from "../../../src/lib/shell.ts";

// Makes Super+numpad digits switch to dock apps, like Super+top-row digits.
//
// With NumLock on, the numpad sends KP_1..KP_0, not 1..0, so it never matches
// Ubuntu Dock's <Super>1 shortcuts. Ubuntu's Tiling Assistant extension
// claims <Super>KP_1..KP_9 for window snapping (quarters, halves, maximize),
// so we drop those bindings and add <Super>KP_N next to <Super>N in the dock.
// Super+Left/Right/Up keep snapping windows.

const DOCK_SCHEMA = "org.gnome.shell.extensions.dash-to-dock";
const TILING_SCHEMA = "org.gnome.shell.extensions.tiling-assistant";
const NUMPAD_SUPER = /^<Super>KP_[0-9]$/;

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

async function hasSchema(schema: string): Promise<boolean> {
  const schemas = (await read(["gsettings", "list-schemas"])).split("\n");
  return schemas.includes(schema);
}

// Dock slot N (1..10) -> the bindings it should have. Slot 10 is the 0 key.
function wantedDockBindings(slot: number): string[] {
  assert(slot >= 1 && slot <= 10, `Dock slot out of range: ${slot}`);
  const digit = slot % 10;
  return [`<Super>${digit}`, `<Super>KP_${digit}`];
}

async function dockBindings(slot: number): Promise<string[]> {
  return parseStringList(
    await read(["gsettings", "get", DOCK_SCHEMA, `app-hotkey-${slot}`]),
  );
}

async function dockIsSet(): Promise<boolean> {
  for (let slot = 1; slot <= 10; slot++) {
    const have = await dockBindings(slot);
    if (!wantedDockBindings(slot).every((b) => have.includes(b))) return false;
  }
  return true;
}

// Tiling Assistant keys that still hold a <Super>KP_<digit> binding,
// mapped to their current bindings.
async function tilingNumpadKeys(): Promise<Map<string, string[]>> {
  const found = new Map<string, string[]>();
  if (!await hasSchema(TILING_SCHEMA)) return found;

  const out = await read(["gsettings", "list-recursively", TILING_SCHEMA]);
  for (const line of out.split("\n")) {
    // "<schema> <key> <value>"
    const m = line.match(/^\S+ (\S+) (.*)$/);
    if (m === null) continue;
    const [, key, value] = m;
    if (!value!.startsWith("[") && !value!.startsWith("@as")) continue;
    const bindings = parseStringList(value!);
    if (bindings.some((b) => NUMPAD_SUPER.test(b))) found.set(key!, bindings);
  }
  return found;
}

export async function shouldRun(_ctx: TaskContext): Promise<boolean> {
  if (!isGnomeSession()) {
    log.warn("Not in a GNOME graphical session, skipping numpad app hotkeys");
    return false;
  }
  if (!await hasSchema(DOCK_SCHEMA)) {
    log.warn(`${DOCK_SCHEMA} schema not found (no Ubuntu Dock), skipping`);
    return false;
  }
  return !(await dockIsSet() && (await tilingNumpadKeys()).size === 0);
}

export async function run(ctx: TaskContext): Promise<void> {
  assert(isGnomeSession(), "numpad-app-hotkeys requires a GNOME graphical session");
  assert(await hasSchema(DOCK_SCHEMA), `${DOCK_SCHEMA} schema not found`);
  log.info("Binding Super+numpad digits to dock apps");

  // Free the numpad keys first so the dock bindings don't conflict.
  for (const [key, bindings] of await tilingNumpadKeys()) {
    const kept = bindings.filter((b) => !NUMPAD_SUPER.test(b));
    await runOrFail(ctx, [
      "gsettings",
      "set",
      TILING_SCHEMA,
      key,
      formatStringList(kept),
    ]);
  }

  for (let slot = 1; slot <= 10; slot++) {
    const have = await dockBindings(slot);
    const wanted = wantedDockBindings(slot);
    if (wanted.every((b) => have.includes(b))) continue;
    const merged = [...wanted, ...have.filter((b) => !wanted.includes(b))];
    await runOrFail(ctx, [
      "gsettings",
      "set",
      DOCK_SCHEMA,
      `app-hotkey-${slot}`,
      formatStringList(merged),
    ]);
  }

  log.success("Super+numpad digits switch to dock apps");
}

export async function verify(_ctx: TaskContext): Promise<void> {
  if (!isGnomeSession() || !await hasSchema(DOCK_SCHEMA)) return;

  assert(await dockIsSet(), "Dock app-hotkey-N is missing <Super>N or <Super>KP_N");
  const leftover = [...(await tilingNumpadKeys()).keys()];
  assert(
    leftover.length === 0,
    `Tiling Assistant still binds Super+numpad: ${leftover.join(", ")}`,
  );
}
