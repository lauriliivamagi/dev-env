import {
  type TaskContext,
  assert,
  compareVersions,
  fs,
  log,
  verify as v,
} from "../../../src/lib/mod.ts";
import { checkCommandOutput, runOrFail } from "../../../src/lib/shell.ts";
import { join } from "@std/path";

// Python CLI tools installed as isolated `uv tool`s (uv's pipx equivalent).
// Each tool gets its own venv under ~/.local/share/uv/tools and its entry
// points linked into ~/.local/bin.
//
// Tools are forced onto uv-managed Python builds (--python-preference
// only-managed) rather than whatever `python3` is on PATH. pipx venvs were
// bound to a pyenv or apt interpreter, so a pyenv version bump or an Ubuntu
// release upgrade left them with a dead interpreter; uv-managed builds live
// under ~/.local/share/uv/python and are touched by neither.
//
// Pinned like go-tools/volta lists: bump a version here to upgrade existing
// machines. A tool with `from` instead of `version` is installed from that
// source (git) and only checked for presence.
export const dependsOn = ["uv"];

interface UvTool {
  /** PyPI / uv tool name (as shown by `uv tool list`) */
  name: string;
  /** Pinned PyPI version; omit for `from` installs */
  version?: string;
  /** Non-PyPI source, e.g. a git URL, for tools without a release */
  from?: string;
  /** One entry point the tool links into ~/.local/bin, used to verify */
  bin: string;
  /** pipx venv directory name when it differs from `name` */
  pipxVenv?: string;
}

const TOOLS: UvTool[] = [
  { name: "csvkit", version: "2.2.0", bin: "csvcut" },
];

function uvBin(ctx: TaskContext): string {
  return join(ctx.home, ".local", "bin", "uv");
}

/**
 * Installed tool versions per `uv tool list`, whose entries look like
 * "csvkit v2.2.0" followed by indented "- csvcut" lines.
 */
async function installedTools(ctx: TaskContext): Promise<Map<string, string>> {
  const result = await checkCommandOutput([uvBin(ctx), "tool", "list"]);
  const installed = new Map<string, string>();
  if (result.code !== 0) return installed;
  for (const m of (result.stdout ?? "").matchAll(/^(\S+) v(\S+)/gm)) {
    installed.set(m[1]!, m[2]!);
  }
  return installed;
}

/** Whether a tool is missing, or (when pinned) older than the pin. */
function needsInstall(tool: UvTool, installed: Map<string, string>): boolean {
  const have = installed.get(tool.name);
  if (!have) return true;
  if (!tool.version) return false; // unpinned: presence is enough
  return compareVersions(have, tool.version) < 0;
}

export async function shouldRun(ctx: TaskContext): Promise<boolean> {
  const installed = await installedTools(ctx);
  return TOOLS.some((tool) => needsInstall(tool, installed));
}

export async function run(ctx: TaskContext): Promise<void> {
  const installed = await installedTools(ctx);

  for (const tool of TOOLS) {
    assert(
      (tool.version === undefined) !== (tool.from === undefined),
      `${tool.name}: exactly one of version/from must be set`,
    );
    if (!needsInstall(tool, installed)) continue;

    // Migrate from a pipx-managed install if present. Both link entry points
    // into ~/.local/bin and uv refuses to overwrite executables it doesn't
    // own, so drop pipx's venv and let uv take the entry points over with
    // --force. (pipx itself isn't invoked: its own launcher is exactly the
    // kind of interpreter-bound script this task exists to get rid of.)
    const venvName = tool.pipxVenv ?? tool.name;
    let takeOver = false;
    for (
      const venv of [
        join(ctx.home, ".local", "pipx", "venvs", venvName), // pipx < 1.5 default
        join(ctx.home, ".local", "share", "pipx", "venvs", venvName), // XDG default
      ]
    ) {
      const { changed } = await fs.remove(ctx, venv);
      if (changed) {
        log.info(`Removed pipx-managed ${tool.name} venv (migrating to uv)`);
        takeOver = true;
      }
    }

    const have = installed.get(tool.name);
    const spec = tool.version ? `${tool.name}==${tool.version}` : `${tool.name} @ ${tool.from}`;
    log.info(
      have
        ? `Upgrading ${tool.name} ${have} -> ${tool.version ?? tool.from}`
        : `Installing ${tool.name} ${tool.version ?? `from ${tool.from}`}`,
    );
    await runOrFail(ctx, [
      uvBin(ctx),
      "tool",
      "install",
      "--python-preference",
      "only-managed",
      ...(takeOver ? ["--force"] : []),
      spec,
    ]);
  }

  log.success("uv tools installed");
}

export async function verify(ctx: TaskContext): Promise<void> {
  const installed = await installedTools(ctx);
  for (const tool of TOOLS) {
    assert(installed.has(tool.name), `${tool.name} is not listed by uv tool list`);
    await v.assertFile(join(ctx.home, ".local", "bin", tool.bin));
  }
}
