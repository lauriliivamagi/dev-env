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
// Tools are forced onto a pinned uv-managed Python build (--python +
// --python-preference only-managed) rather than whatever `python3` is on
// PATH. pipx venvs were bound to a pyenv or apt interpreter, so a pyenv
// version bump or an Ubuntu release upgrade left them with a dead
// interpreter; uv-managed builds live under ~/.local/share/uv/python and are
// touched by neither. uv downloads the pinned build on first use.
//
// Pinned like go-tools/volta lists: bump a tool version or PYTHON_VERSION
// here to upgrade existing machines. A tool with `from` instead of `version`
// is installed from that source (git) and only checked for presence (its
// interpreter is still checked).
export const dependsOn = ["uv"];

/** Interpreter every tool venv is built on; bump to move all tools at once. */
const PYTHON_VERSION = "3.14.7";

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

interface Installed {
  version: string;
  python: string;
}

/**
 * Installed tools per `uv tool list --show-python`, whose entries look like
 * "csvkit v2.2.0 [CPython 3.14.7]" followed by indented "- csvcut" lines.
 */
async function installedTools(ctx: TaskContext): Promise<Map<string, Installed>> {
  const result = await checkCommandOutput([uvBin(ctx), "tool", "list", "--show-python"]);
  const installed = new Map<string, Installed>();
  if (result.code !== 0) return installed;
  for (
    const m of (result.stdout ?? "").matchAll(/^(\S+) v(\S+) \[CPython (\d+\.\d+\.\d+)\]/gm)
  ) {
    installed.set(m[1]!, { version: m[2]!, python: m[3]! });
  }
  return installed;
}

/**
 * Why a tool needs (re)installing, or null if it is current: missing, tool
 * version older than the pin, or venv on an older interpreter than pinned.
 */
function installReason(tool: UvTool, installed: Map<string, Installed>): string | null {
  const have = installed.get(tool.name);
  if (!have) return "not installed";
  if (tool.version && compareVersions(have.version, tool.version) < 0) {
    return `${have.version} -> ${tool.version}`;
  }
  if (compareVersions(have.python, PYTHON_VERSION) < 0) {
    return `Python ${have.python} -> ${PYTHON_VERSION}`;
  }
  return null;
}

export async function shouldRun(ctx: TaskContext): Promise<boolean> {
  const installed = await installedTools(ctx);
  return TOOLS.some((tool) => installReason(tool, installed) !== null);
}

export async function run(ctx: TaskContext): Promise<void> {
  const installed = await installedTools(ctx);

  for (const tool of TOOLS) {
    assert(
      (tool.version === undefined) !== (tool.from === undefined),
      `${tool.name}: exactly one of version/from must be set`,
    );
    const reason = installReason(tool, installed);
    if (reason === null) continue;

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

    const spec = tool.version ? `${tool.name}==${tool.version}` : `${tool.name} @ ${tool.from}`;
    log.info(`Installing ${tool.name} (${reason})`);
    // --reinstall: an existing venv is rebuilt even when only the interpreter
    // changed, which uv would otherwise report as already installed.
    await runOrFail(ctx, [
      uvBin(ctx),
      "tool",
      "install",
      "--python",
      PYTHON_VERSION,
      "--python-preference",
      "only-managed",
      ...(installed.has(tool.name) ? ["--reinstall"] : []),
      ...(takeOver ? ["--force"] : []),
      spec,
    ]);
  }

  log.success("uv tools installed");
}

export async function verify(ctx: TaskContext): Promise<void> {
  const installed = await installedTools(ctx);
  for (const tool of TOOLS) {
    const have = installed.get(tool.name);
    assert(have !== undefined, `${tool.name} is not listed by uv tool list`);
    assert(
      compareVersions(have.python, PYTHON_VERSION) >= 0,
      `${tool.name} runs on Python ${have.python}, expected >= ${PYTHON_VERSION}`,
    );
    await v.assertFile(join(ctx.home, ".local", "bin", tool.bin));
  }
}
