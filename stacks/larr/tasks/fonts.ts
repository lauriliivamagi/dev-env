import { type TaskContext, fs, log } from "../../../src/lib/mod.ts";
import { apt, curl, runOrFail } from "../../../src/lib/shell.ts";
import { join } from "@std/path";
import { exists } from "@std/fs";

interface FontSource {
  name: string;
  url: string;
  ttfPath: string; // path inside zip where TTF files are located
}

const FONT_SOURCES: FontSource[] = [
  {
    name: "FiraCode",
    url: "https://github.com/tonsky/FiraCode/releases/download/6.2/Fira_Code_v6.2.zip",
    ttfPath: "ttf",
  },
  {
    name: "Hack",
    url: "https://github.com/source-foundry/Hack/releases/download/v3.003/Hack-v3.003-ttf.zip",
    ttfPath: "",
  },
  {
    name: "Roboto",
    // googlefonts/roboto was archived; the live font lives in roboto-3-classic.
    // The zip nests variants (android/chromeos/hinted/unhinted/web); scope to
    // the hinted set (variable font + static weights) so copyTtfFiles doesn't
    // also descend into the zip's __MACOSX/ AppleDouble junk at the root.
    url: "https://github.com/googlefonts/roboto-3-classic/releases/download/v3.015/Roboto_v3.015.zip",
    ttfPath: "hinted",
  },
  {
    name: "Meslo",
    url: "https://github.com/ryanoasis/nerd-fonts/releases/download/v3.4.0/Meslo.zip",
    ttfPath: "",
  },
];

export async function shouldRun(ctx: TaskContext): Promise<boolean> {
  const fontsDir = join(ctx.home, ".local", "share", "fonts");
  // Check if all font families are installed
  for (const font of FONT_SOURCES) {
    if (!await exists(join(fontsDir, font.name))) {
      return true;
    }
  }
  return false;
}

export async function run(ctx: TaskContext): Promise<void> {
  log.info("Installing fonts");

  // Install fontconfig and unzip
  await apt(ctx, ["fontconfig", "unzip"]);

  const fontsDir = join(ctx.home, ".local", "share", "fonts");
  await fs.mkdir(ctx, fontsDir);

  // Create temp directory for downloads
  const tempDir = await Deno.makeTempDir({ prefix: "fonts-" });

  try {
    let installedCount = 0;

    for (const font of FONT_SOURCES) {
      log.info(`Downloading ${font.name} fonts`);

      const zipPath = join(tempDir, `${font.name}.zip`);
      const extractDir = join(tempDir, font.name);

      // Download zip
      await curl(ctx, font.url, zipPath);

      if (ctx.dryRun) {
        continue;
      }

      // Extract zip
      await fs.mkdir(ctx, extractDir);
      await runOrFail(ctx, ["unzip", "-q", zipPath, "-d", extractDir]);

      // Find TTF files
      const ttfDir = font.ttfPath ? join(extractDir, font.ttfPath) : extractDir;
      const destDir = join(fontsDir, font.name);
      await fs.mkdir(ctx, destDir);

      // Copy TTF files recursively (some zips have nested structure)
      installedCount += await copyTtfFiles(ctx, ttfDir, destDir);
    }

    // Rebuild font cache
    log.info("Rebuilding font cache");
    await runOrFail(ctx, ["fc-cache", "-f", "-v"]);

    if (installedCount > 0) {
      log.success(`${installedCount} font files installed`);
    }
  } finally {
    // Cleanup temp directory
    if (!ctx.dryRun) {
      await Deno.remove(tempDir, { recursive: true });
    }
  }
}

async function copyTtfFiles(
  ctx: TaskContext,
  srcDir: string,
  destDir: string,
): Promise<number> {
  let count = 0;

  for await (const entry of Deno.readDir(srcDir)) {
    // Skip macOS AppleDouble resource forks (._Foo.ttf) found in some zips.
    if (entry.name.startsWith("._")) continue;

    const srcPath = join(srcDir, entry.name);

    if (entry.isDirectory) {
      // Recurse into subdirectories
      count += await copyTtfFiles(ctx, srcPath, destDir);
    } else if (entry.isFile && entry.name.endsWith(".ttf")) {
      const destPath = join(destDir, entry.name);
      await fs.copyFile(ctx, srcPath, destPath);
      count++;
    }
  }

  return count;
}

export async function verify(ctx: TaskContext): Promise<void> {
  const fontsDir = join(ctx.home, ".local", "share", "fonts");

  if (!await exists(fontsDir)) {
    throw new Error("Fonts directory was not created");
  }

  // Verify at least one font family was installed
  for (const font of FONT_SOURCES) {
    const fontDir = join(fontsDir, font.name);
    if (await exists(fontDir)) {
      return; // At least one font exists
    }
  }

  throw new Error("No font families were installed");
}
