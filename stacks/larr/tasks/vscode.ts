import { join } from "@std/path";
import { exists } from "@std/fs";
import {
  assert,
  fs,
  log,
  type TaskContext,
  verify as v,
} from "../../../src/lib/mod.ts";
import { apt, checkCommandOutput, runOrFail } from "../../../src/lib/shell.ts";

// Launch Insiders through XWayland instead of native Wayland.
//
// Insiders 1.148 on GNOME Wayland (Intel Iris Xe, several machines) loses its
// window renderer to SIGBUS 2-5 s after start on roughly one launch in three:
// "The window terminated unexpectedly (reason: 'crashed', code: '135')". A
// clean profile with no extensions crashes the same way, and upstream ties
// code-135 startup crashes to the Wayland GPU path (microsoft/vscode#326174).
// argv.json cannot carry --ozone-platform, so per-user copies of the .desktop
// files add it; they shadow the deb's files by desktop ID, so dock pins and the
// vscode-insiders:// handler keep working. `code-insiders` run from a terminal
// is not covered when it starts the first instance. Retire this once a release
// starts reliably with --ozone-platform=wayland.
const OZONE_FLAG = "--ozone-platform=x11";
const BINARY = "/usr/share/code-insiders/code-insiders";
const DESKTOP_IDS = [
  "com.microsoft.VSCodeInsiders.desktop",
  "com.microsoft.VSCodeInsiders.UrlHandler.desktop",
];
const DESKTOP_HEADER =
  "# Written by dev-env (stacks/larr/tasks/vscode.ts) from /usr/share/applications; edits are overwritten.";

interface DesktopOverride {
  dest: string;
  content: string;
}

// Rewrites every Exec line that starts the binary to pass OZONE_FLAG.
export function withOzoneFlag(desktop: string): string {
  const out = desktop.split("\n").map((line) => {
    if (!line.startsWith(`Exec=${BINARY}`) || line.includes(OZONE_FLAG)) {
      return line;
    }
    return line.replace(`Exec=${BINARY}`, `Exec=${BINARY} ${OZONE_FLAG}`);
  }).join("\n");
  const execLines = out.split("\n").filter((l) => l.startsWith("Exec="));
  assert(execLines.length > 0, "desktop file has no Exec line");
  assert(
    execLines.every((l) => l.includes(OZONE_FLAG)),
    `Exec line does not start ${BINARY}: ${execLines.join(" | ")}`,
  );
  return `${DESKTOP_HEADER}\n${out}`;
}

// Overrides built from the deb's current files; empty before Insiders is
// installed (a dry run on a fresh machine).
async function desktopOverrides(ctx: TaskContext): Promise<DesktopOverride[]> {
  const dataHome = Deno.env.get("XDG_DATA_HOME") ||
    join(ctx.home, ".local", "share");
  const overrides: DesktopOverride[] = [];
  for (const id of DESKTOP_IDS) {
    const src = join("/usr/share/applications", id);
    if (!await exists(src)) continue;
    overrides.push({
      dest: join(dataHome, "applications", id),
      content: withOzoneFlag(await Deno.readTextFile(src)),
    });
  }
  return overrides;
}

async function overridesCurrent(ctx: TaskContext): Promise<boolean> {
  for (const o of await desktopOverrides(ctx)) {
    try {
      if (await Deno.readTextFile(o.dest) !== o.content) return false;
    } catch {
      return false;
    }
  }
  return true;
}

export async function shouldRun(ctx: TaskContext): Promise<boolean> {
  try {
    const result = await checkCommandOutput(["code-insiders", "--version"]);
    if (result.code !== 0) return true;
  } catch {
    return true; // Command not found
  }
  return !await overridesCurrent(ctx);
}

export async function run(ctx: TaskContext): Promise<void> {
  log.info("Installing VS Code Insiders");

  // Install dependencies (wget and gnupg needed for GPG key setup)
  await apt(ctx, ["apt-transport-https", "wget", "gnupg"]);

  // Check if VS Code repo already exists (deb822 format from previous install)
  let repoExists = false;
  try {
    await Deno.stat("/etc/apt/sources.list.d/vscode.sources");
    repoExists = true;
    log.info("VS Code repository already configured");
  } catch {
    // No existing repo, need to add it
  }

  if (!repoExists) {
    // Add Microsoft GPG key (use microsoft.gpg to match existing MS repos)
    log.info("Adding Microsoft GPG key");
    await runOrFail(ctx, [
      "bash",
      "-c",
      "wget -qO- https://packages.microsoft.com/keys/microsoft.asc | gpg --dearmor | sudo tee /usr/share/keyrings/microsoft.gpg > /dev/null",
    ]);

    // Add VS Code repository
    log.info("Adding VS Code repository");
    await runOrFail(ctx, [
      "bash",
      "-c",
      'echo "deb [arch=amd64 signed-by=/usr/share/keyrings/microsoft.gpg] https://packages.microsoft.com/repos/code stable main" | sudo tee /etc/apt/sources.list.d/vscode.list',
    ]);

    // Update apt after adding repo
    await runOrFail(ctx, ["sudo", "apt", "update"]);
  }

  await apt(ctx, ["code-insiders"]);

  log.success("VS Code Insiders installed");

  // Extensions are left to Settings Sync (GitHub account), which keeps a list
  // per profile and removes extensions that profile lacks; a list here fought it.

  const overrides = await desktopOverrides(ctx);
  if (overrides.length === 0) {
    log.warn("No Insiders .desktop files yet; skipping the launcher override");
    return;
  }
  for (const o of overrides) {
    const { changed } = await fs.writeFile(ctx, o.dest, o.content);
    if (changed) log.info(`Launcher now passes ${OZONE_FLAG}: ${o.dest}`);
  }
}

export async function verify(ctx: TaskContext): Promise<void> {
  await v.assertCommand("code-insiders", "--version");
  const overrides = await desktopOverrides(ctx);
  assert(overrides.length === DESKTOP_IDS.length, "Insiders .desktop files missing");
  assert(
    await overridesCurrent(ctx),
    `Launcher overrides missing or stale; rerun the vscode task`,
  );
}
