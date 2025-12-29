import { type TaskContext, fs, log } from "../../../src/lib/mod.ts";
import { apt, runOrFail } from "../../../src/lib/shell.ts";
import { join } from "@std/path";
import { exists } from "@std/fs";

const FONT_SOURCES = [
  { name: "FiraCode", path: ".fonts/FiraCode_1.205/ttf" },
  { name: "Roboto", path: ".fonts/roboto" },
  { name: "RobotoTTF", path: ".fonts/RobotoTTF" },
  { name: "Hack", path: ".fonts/Hack-v2_020-ttf" },
];

export async function run(ctx: TaskContext): Promise<void> {
  log.info("Installing fonts");

  // Install fontconfig for fc-cache command
  await apt(ctx, ["fontconfig"]);

  const fontsDir = join(ctx.home, ".local", "share", "fonts");
  await fs.mkdir(ctx, fontsDir);

  let installedCount = 0;
  for (const font of FONT_SOURCES) {
    const srcDir = join(ctx.home, font.path);

    if (!await exists(srcDir)) {
      log.warn(`Skipping ${font.name}: ${srcDir} not found`);
      continue;
    }

    log.info(`Installing ${font.name} fonts`);
    const destDir = join(fontsDir, font.name);
    await fs.mkdir(ctx, destDir);

    // Copy all .ttf files from source
    for await (const entry of Deno.readDir(srcDir)) {
      if (entry.isFile && entry.name.endsWith(".ttf")) {
        const src = join(srcDir, entry.name);
        const dest = join(destDir, entry.name);
        await fs.copyFile(ctx, src, dest);
        installedCount++;
      }
    }
  }

  // Rebuild font cache
  log.info("Rebuilding font cache");
  await runOrFail(ctx, ["fc-cache", "-f", "-v"]);

  if (installedCount > 0) {
    log.success(`${installedCount} font files installed`);
  } else {
    log.warn("No font source directories found - nothing installed");
  }
}

export async function verify(ctx: TaskContext): Promise<void> {
  const fontsDir = join(ctx.home, ".local", "share", "fonts");

  // Just verify the fonts directory was created
  if (!await exists(fontsDir)) {
    throw new Error("Fonts directory was not created");
  }
}
