import { type TaskContext, log } from "../../../src/lib/mod.ts";
import { runOrFail, run } from "../../../src/lib/shell.ts";

export async function run_(ctx: TaskContext): Promise<void> {
  log.info("Setting up Estonian keyboard layout");

  // Check if running in a graphical session
  const hasDisplay = Deno.env.get("DISPLAY") || Deno.env.get("WAYLAND_DISPLAY");

  if (!hasDisplay) {
    log.warn("No display detected, skipping keyboard setup");
    return;
  }

  // Try to detect desktop environment
  const desktopSession = Deno.env.get("XDG_CURRENT_DESKTOP") || "";

  if (desktopSession.toLowerCase().includes("gnome")) {
    // GNOME: use gsettings
    log.info("Configuring keyboard for GNOME");
    await runOrFail(ctx, [
      "gsettings",
      "set",
      "org.gnome.desktop.input-sources",
      "sources",
      "[('xkb', 'us'), ('xkb', 'ee')]",
    ]);
  } else {
    // Fallback: use setxkbmap for X11
    log.info("Configuring keyboard via setxkbmap");
    const result = await run(ctx, ["setxkbmap", "-layout", "us,ee", "-option", "grp:alt_shift_toggle"], {
      stdout: "null",
      stderr: "piped",
    });

    if (result.code !== 0) {
      log.warn("setxkbmap failed - you may need to configure keyboard manually");
      log.info("Run: setxkbmap -layout us,ee -option grp:alt_shift_toggle");
      return;
    }
  }

  log.success("Estonian keyboard layout configured");
  log.info("Use Alt+Shift to toggle between US and Estonian layouts");
}

// Export with correct name
export { run_ as run };
