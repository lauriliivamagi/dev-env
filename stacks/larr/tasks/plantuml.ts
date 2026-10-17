import { join } from "@std/path";
import {
  compareVersions,
  fs,
  log,
  type TaskContext,
  verify as v,
} from "../../../src/lib/mod.ts";
import { checkCommandOutput, curl, runOrFail } from "../../../src/lib/shell.ts";

// PlantUML (plantuml.com): diagrams as text. Installs the full GPL jar from
// the GitHub release into ~/.local/share/plantuml (a stable path editor
// integrations can point at) plus a `plantuml` wrapper in ~/.local/bin.
// It runs on the SDKMAN JDK and lays out with Graphviz `dot` (dev-utils);
// the jar's -version output reports both.
export const dependsOn = ["sdkman", "dev-utils"]; // java; graphviz, curl, unzip

const PLANTUML_VERSION = "1.2026.9";

function jarPath(ctx: TaskContext): string {
  return join(ctx.home, ".local", "share", "plantuml", "plantuml.jar");
}

function wrapperPath(ctx: TaskContext): string {
  return join(ctx.home, ".local", "bin", "plantuml");
}

// The SDKMAN hook that puts java on PATH lives in env/.zshrc, so it is
// missing for non-interactive callers (editors, make, scripts). Fall back to
// SDKMAN's current JDK directly before trying PATH.
function wrapperScript(jar: string): string {
  return `#!/bin/sh
# Installed by dev-env (stacks/larr/tasks/plantuml.ts)
if [ -n "$JAVA_HOME" ] && [ -x "$JAVA_HOME/bin/java" ]; then
  java="$JAVA_HOME/bin/java"
elif [ -x "$HOME/.sdkman/candidates/java/current/bin/java" ]; then
  java="$HOME/.sdkman/candidates/java/current/bin/java"
else
  java=java
fi
exec "$java" -jar "${jar}" "$@"
`;
}

export async function shouldRun(ctx: TaskContext): Promise<boolean> {
  try {
    await Deno.stat(wrapperPath(ctx));
  } catch {
    return true; // wrapper missing
  }

  // Read the version from the jar manifest rather than `plantuml -version`,
  // so the check needs no JVM.
  const result = await checkCommandOutput([
    "unzip",
    "-p",
    jarPath(ctx),
    "META-INF/MANIFEST.MF",
  ]);
  if (result.code !== 0) return true; // jar missing or unreadable

  const installedVersion = result.stdout?.match(
    /^Implementation-Version:\s*(\S+)/m,
  )?.[1];
  if (!installedVersion) return true; // couldn't parse version, run to be safe

  if (compareVersions(installedVersion, PLANTUML_VERSION) >= 0) {
    return false; // installed version is equal or newer - skip
  }

  log.info(
    `PlantUML ${installedVersion} installed, upgrading to ${PLANTUML_VERSION}`,
  );
  return true;
}

export async function run(ctx: TaskContext): Promise<void> {
  const jar = jarPath(ctx);
  const wrapper = wrapperPath(ctx);

  log.info(`Installing PlantUML v${PLANTUML_VERSION}`);

  // Download beside the target and move into place, so an interrupted
  // download never leaves a truncated jar behind.
  const url =
    `https://github.com/plantuml/plantuml/releases/download/v${PLANTUML_VERSION}/plantuml-${PLANTUML_VERSION}.jar`;
  const partial = `${jar}.part`;
  await curl(ctx, url, partial);
  await runOrFail(ctx, ["mv", "-f", partial, jar]);

  await fs.writeFile(ctx, wrapper, wrapperScript(jar), 0o755);
  // writeFile's mode only applies on creation; make sure an existing
  // wrapper is executable too.
  await runOrFail(ctx, ["chmod", "+x", wrapper]);

  log.success(`PlantUML ${PLANTUML_VERSION} installed`);
}

export async function verify(ctx: TaskContext): Promise<void> {
  await v.assertFile(jarPath(ctx));
  // -version also checks that Graphviz is found and a test image renders.
  await v.assertCommandWithPath(
    ctx.home,
    "plantuml",
    wrapperPath(ctx),
    "-version",
  );
}
