import { join } from "@std/path";
import { exists } from "@std/fs";
import {
  assert,
  fs,
  log,
  type TaskContext,
  verify as v,
} from "../../../src/lib/mod.ts";
import { checkCommandOutput, runOrFail } from "../../../src/lib/shell.ts";

// Guards the user fontconfig cache against a bundled, newer fontconfig.
//
// Chrome 154 bundles fontconfig with cache format 12. When it writes a cache
// into ~/.cache/fontconfig it also replaces the host's *.cache-9 file for that
// font directory with a symlink to its *.cache-12 file. The host fontconfig
// (2.15) accepts the newer version, misreads the layout, and GTK/Qt apps on it
// segfault in FcCharSetHasChar — QGIS 3.44 died at startup. Chrome rewrites a
// cache on first start and whenever a font directory changes, so a one-off
// rebuild does not hold.
//
// A user path unit watches the cache directory; its service deletes *.cache-N
// symlinks and reruns fc-cache. Chrome's *.cache-12 files stay beside the
// host's *.cache-9 files, which Chrome then leaves alone. A Chrome-only
// FONTCONFIG_FILE was tried first and dropped: apps Chrome starts (a download
// opened in QGIS) inherit it and read Chrome's symlinked cache. Retire this
// task once Chrome stops planting symlinks or the host fontconfig reaches
// format 12.
const UNIT = "fontconfig-guard";
const HEADER =
  "# Written by dev-env (stacks/larr/tasks/fontconfig-guard.ts); edits are overwritten.";

function paths(ctx: TaskContext) {
  const cacheHome = Deno.env.get("XDG_CACHE_HOME") || join(ctx.home, ".cache");
  const unitDir = join(ctx.configHome, "systemd", "user");
  return {
    cacheHome,
    sharedCache: join(cacheHome, "fontconfig"),
    pathUnit: join(unitDir, `${UNIT}.path`),
    serviceUnit: join(unitDir, `${UNIT}.service`),
  };
}

function pathUnit(sharedCache: string): string {
  return `${HEADER}
[Unit]
Description=Watch the user fontconfig cache for version symlinks

[Path]
PathChanged=${sharedCache}

[Install]
WantedBy=default.target
`;
}

function serviceUnit(cacheHome: string, sharedCache: string): string {
  // Both paths land unquoted in the unit and in sh -c.
  for (const p of [cacheHome, sharedCache]) {
    assert(/^[\w./-]+$/.test(p), `path needs quoting in a unit file: ${p}`);
  }
  // $$ is a literal $ for systemd; the sleep lets the writer finish its burst
  // (Chrome writes ~600 cache entries in under a second).
  return `${HEADER}
[Unit]
Description=Remove version symlinks from the user fontconfig cache

[Service]
Type=oneshot
Environment=XDG_CACHE_HOME=${cacheHome}
ExecStartPre=/bin/sleep 3
ExecStart=/bin/sh -c 'n=$$(find ${sharedCache} -maxdepth 1 -type l -name "*.cache-*" -print -delete | wc -l); if [ "$$n" -gt 0 ]; then fc-cache; fi; echo "swept $$n symlinks"'
`;
}

// Chrome's signature in the shared cache: *.cache-N symlinks. The host's
// fontconfig writes only regular files there.
async function cacheSymlinks(dir: string): Promise<string[]> {
  if (!await exists(dir)) return [];
  const links: string[] = [];
  for await (const entry of Deno.readDir(dir)) {
    if (entry.isSymlink && /\.cache-\d+$/.test(entry.name)) {
      links.push(entry.name);
    }
  }
  return links;
}

export async function run(ctx: TaskContext): Promise<void> {
  log.info("Guarding the user fontconfig cache");
  const p = paths(ctx);

  await fs.writeFile(ctx, p.pathUnit, pathUnit(p.sharedCache));
  await fs.writeFile(
    ctx,
    p.serviceUnit,
    serviceUnit(p.cacheHome, p.sharedCache),
  );
  await runOrFail(ctx, ["systemctl", "--user", "daemon-reload"]);
  await runOrFail(ctx, [
    "systemctl",
    "--user",
    "enable",
    "--now",
    `${UNIT}.path`,
  ]);

  // The watcher only reacts to changes; repair a cache clobbered before it ran.
  const links = await cacheSymlinks(p.sharedCache);
  if (links.length > 0) {
    log.warn(`${p.sharedCache} holds ${links.length} version symlinks; sweeping`);
    for (const name of links) {
      await fs.remove(ctx, join(p.sharedCache, name));
    }
    await runOrFail(ctx, ["fc-cache"]);
  }

  log.success(`${UNIT}.path is watching ${p.sharedCache}`);
}

export async function verify(ctx: TaskContext): Promise<void> {
  const p = paths(ctx);

  await v.assertFile(p.pathUnit);
  await v.assertFile(p.serviceUnit);
  for (const check of ["is-enabled", "is-active"]) {
    const result = await checkCommandOutput([
      "systemctl",
      "--user",
      check,
      `${UNIT}.path`,
    ]);
    if (result.code !== 0) {
      throw new Error(`${UNIT}.path ${check}: ${result.stdout?.trim()}`);
    }
  }

  const links = await cacheSymlinks(p.sharedCache);
  assert(
    links.length === 0,
    `${p.sharedCache} still holds ${links.length} version symlinks`,
  );
}
