import { join } from "@std/path";
import {
  assert,
  log,
  type TaskContext,
  verify as v,
} from "../../../src/lib/mod.ts";
import { apt, checkCommandOutput, runOrFail } from "../../../src/lib/shell.ts";

// Installs a pinned Ghostty release from mkasberg/ghostty-ubuntu DEB packages.
// https://github.com/mkasberg/ghostty-ubuntu
//
// We pin the upstream Ghostty version rather than tracking the latest release
// (what the upstream install.sh does), so the dev-env installs reproducibly and
// upgrades are an explicit, reviewable bump of GHOSTTY_VERSION. The packaging
// revision (the trailing -ppaN of the release tag) is resolved to the newest
// available for this version, so packaging-only fixes are picked up for free.
const GHOSTTY_VERSION = "1.3.1";
const RELEASES_API =
  "https://api.github.com/repos/mkasberg/ghostty-ubuntu/releases?per_page=100";

interface GhAsset {
  name: string;
  browser_download_url: string;
}
interface GhRelease {
  tag_name: string;
  assets: GhAsset[];
}

// Parse the `X.Y.Z` from `ghostty --version` output (first line: "Ghostty 1.3.1").
// Returns null when ghostty is absent or the version can't be determined.
async function installedVersion(): Promise<string | null> {
  try {
    const result = await checkCommandOutput(["ghostty", "--version"]);
    if (result.code !== 0) return null;
    const m = (result.stdout ?? "").match(/(\d+\.\d+\.\d+)/);
    return m ? m[1]! : null;
  } catch {
    return null; // command not found
  }
}

// Minimal /etc/os-release parser (KEY=value, optionally quoted).
async function osRelease(): Promise<Record<string, string>> {
  const text = await Deno.readTextFile("/etc/os-release");
  const vars: Record<string, string> = {};
  for (const line of text.split("\n")) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m) vars[m[1]!] = m[2]!.replace(/^["'](.*)["']$/, "$1");
  }
  return vars;
}

// The DEB assets are named ghostty_<ver>_<arch>_<release>.deb where <release> is
// an Ubuntu version id (24.04, 25.10, 26.04) or a Debian codename (trixie,
// forky). Build the candidate suffixes this host could match, most-specific
// first. Ubuntu hosts match on VERSION_ID; Debian hosts on VERSION_CODENAME.
async function hostSuffixes(): Promise<string[]> {
  const archOut = await checkCommandOutput(["dpkg", "--print-architecture"]);
  const arch = (archOut.stdout ?? "").trim();
  assert(arch.length > 0, "could not determine dpkg architecture");

  const os = await osRelease();
  const ids = [
    os.VERSION_ID,
    os.UBUNTU_VERSION_ID,
    os.VERSION_CODENAME,
    os.UBUNTU_CODENAME,
  ].filter((id): id is string => !!id && id.length > 0);

  return [...new Set(ids)].map((id) => `${arch}_${id}`);
}

// Resolve the download URL for the pinned version's DEB matching this host.
async function resolveDebUrl(version: string): Promise<string> {
  const res = await fetch(RELEASES_API, {
    headers: { Accept: "application/vnd.github+json" },
  });
  if (!res.ok) {
    throw new Error(
      `GitHub releases API returned ${res.status} ${res.statusText}`,
    );
  }
  const releases = (await res.json()) as GhRelease[];

  // Releases come newest-first; pick the newest tag for this version, e.g.
  // "1.3.1-0-ppa2" for version "1.3.1".
  const release = releases.find(
    (r) => r.tag_name === version || r.tag_name.startsWith(`${version}-`),
  );
  if (!release) {
    throw new Error(`No mkasberg/ghostty-ubuntu release found for ${version}`);
  }

  const suffixes = await hostSuffixes();
  for (const suffix of suffixes) {
    const asset = release.assets.find((a) => a.name.endsWith(`_${suffix}.deb`));
    if (asset) return asset.browser_download_url;
  }
  throw new Error(
    `ghostty-ubuntu ${release.tag_name} has no .deb for this host ` +
      `(tried: ${suffixes.join(", ")}). See ` +
      `https://github.com/mkasberg/ghostty-ubuntu for manual installation.`,
  );
}

export async function shouldRun(_ctx: TaskContext): Promise<boolean> {
  // Run when not already on the pinned version (handles both fresh installs and
  // upgrades from an older Ghostty).
  return (await installedVersion()) !== GHOSTTY_VERSION;
}

export async function run(ctx: TaskContext): Promise<void> {
  log.info(`Installing Ghostty ${GHOSTTY_VERSION} via mkasberg/ghostty-ubuntu`);

  const url = await resolveDebUrl(GHOSTTY_VERSION);
  const debPath = join("/tmp", url.split("/").pop()!);

  await runOrFail(ctx, ["curl", "-fsSL", "-o", debPath, url]);
  // `apt install <path.deb>` installs the local package and resolves its deps.
  await apt(ctx, [debPath]);
  if (!ctx.dryRun) await Deno.remove(debPath).catch(() => {});

  log.success(`Ghostty ${GHOSTTY_VERSION} installed`);
}

export async function verify(_ctx: TaskContext): Promise<void> {
  await v.assertCommand("ghostty", "--version");
  const installed = await installedVersion();
  assert(
    installed === GHOSTTY_VERSION,
    `Expected Ghostty ${GHOSTTY_VERSION}, found ${installed ?? "none"}`,
  );
}
