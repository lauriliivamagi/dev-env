import { join } from "@std/path";
import { exists } from "@std/fs";
import { type TaskContext, assert, log } from "../../../src/lib/mod.ts";
import { runOrFail } from "../../../src/lib/shell.ts";

const DVORAK_LAYOUT = `
<layout>
      <configItem>
        <name>real-prog-layout</name>
        <shortDescription>epd</shortDescription>
        <description>Prime English (US)</description>
      </configItem>
      <variantList>
	<variant>
	    <configItem>
		<name>real-prog-dvorak</name>
		<description>English (Real Programmers Dvorak)</description>
		<vendor>MichaelPaulson</vendor>
	    </configItem>
	</variant>
      </variantList>
</layout>
`;

const SYMBOLS_PATH = "/usr/share/X11/xkb/symbols/real-prog-dvorak";
const EVDEV_PATH = "/usr/share/X11/xkb/rules/evdev.xml";

export async function run(ctx: TaskContext): Promise<void> {
  const resourcePath = join(ctx.stackRoot, "resources", "real-prog-dvorak");

  // Check if resource file exists
  if (!await exists(resourcePath)) {
    log.warn("Skipping keyboard setup: resources/real-prog-dvorak not found");
    return;
  }

  // Copy keyboard layout symbols file
  if (!await exists(SYMBOLS_PATH)) {
    log.info("Copying real-prog-dvorak symbols");
    await runOrFail(ctx, ["sudo", "cp", resourcePath, SYMBOLS_PATH]);
  } else {
    log.info("real-prog-dvorak symbols already exists");
  }

  // Check if evdev.xml already has the layout
  if (ctx.dryRun) {
    log.dryRun("Would update evdev.xml with dvorak layout");
    return;
  }

  const evdevContent = await Deno.readTextFile(EVDEV_PATH);
  if (evdevContent.includes("real-prog-dvorak")) {
    log.info("evdev.xml already has real-prog-dvorak layout definition");
    return;
  }

  // Insert layout after <layoutList>
  const layoutListIndex = evdevContent.indexOf("<layoutList>");
  assert(
    layoutListIndex !== -1,
    "evdev.xml must contain <layoutList> element",
  );

  const insertPoint = evdevContent.indexOf(">", layoutListIndex) + 1;
  const newContent = evdevContent.slice(0, insertPoint) +
    DVORAK_LAYOUT +
    evdevContent.slice(insertPoint);

  // Write using sudo tee
  const cmd = new Deno.Command("sudo", {
    args: ["tee", EVDEV_PATH],
    stdin: "piped",
    stdout: "null",
  });
  const process = cmd.spawn();
  const writer = process.stdin.getWriter();
  await writer.write(new TextEncoder().encode(newContent));
  await writer.close();
  await process.output();

  log.warn("Don't forget to log out to let keyboard changes take effect");
}
