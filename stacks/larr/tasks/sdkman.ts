import { join } from "@std/path";
import { type TaskContext, log, verify as v } from "../../../src/lib/mod.ts";
import { curlPipe, runOrFail } from "../../../src/lib/shell.ts";

// SDKMAN (sdkman.io): version manager for the JVM ecosystem (JDKs from any
// vendor, Maven, Gradle, Kotlin, ...), playing the same role Volta/pyenv do
// for Node/Python. Everything lives under ~/.sdkman; the shell hook that puts
// the selected candidates on PATH is sourced from env/.zshrc (synced
// separately), so the installer is told not to touch rc files.
//
// Versions are pinned like pyenv.ts pins Python. Java tracks the current LTS
// (Temurin builds, the vendor-neutral default SDKMAN itself picks).
export const dependsOn = ["dev-utils"]; // curl, unzip (zip comes with Ubuntu)

const JAVA_VERSION = "25.0.4-tem"; // Temurin 25 = latest LTS
const MAVEN_VERSION = "3.9.16";
const GRADLE_VERSION = "9.7.1";

const CANDIDATES: ReadonlyArray<[candidate: string, version: string]> = [
  ["java", JAVA_VERSION],
  ["maven", MAVEN_VERSION],
  ["gradle", GRADLE_VERSION],
];

function sdkmanDir(ctx: TaskContext): string {
  return join(ctx.home, ".sdkman");
}

export async function shouldRun(ctx: TaskContext): Promise<boolean> {
  // Only skip once every pinned candidate version is present.
  for (const [candidate, version] of CANDIDATES) {
    try {
      await Deno.stat(join(sdkmanDir(ctx), "candidates", candidate, version));
    } catch {
      return true;
    }
  }
  return false;
}

export async function run(ctx: TaskContext): Promise<void> {
  const dir = sdkmanDir(ctx);
  const init = join(dir, "bin", "sdkman-init.sh");

  // 1. Install SDKMAN itself. `rcupdate=false` stops the installer appending
  //    its init snippet to ~/.zshrc/~/.bashrc; env/.zshrc carries it instead.
  log.info("Installing SDKMAN");
  try {
    await Deno.stat(init);
    log.skip("SDKMAN already installed");
  } catch {
    await curlPipe(ctx, "https://get.sdkman.io?rcupdate=false", ["bash"]);
  }

  // 2. Install pinned candidates. `sdk` is a shell function, not a binary, so
  //    each call sources the init script in a fresh bash. The init sources
  //    ~/.sdkman/etc/config (which sets sdkman_auto_answer=false), so the
  //    override is applied per call, after init, to keep `sdk install`
  //    non-interactive (it otherwise asks "set as default?" when another
  //    version is already selected). `sdk default` makes the pinned version
  //    `current` explicitly, for re-runs on machines with an older one.
  for (const [candidate, version] of CANDIDATES) {
    log.info(`Installing ${candidate} ${version} via SDKMAN`);
    await runOrFail(ctx, [
      "bash",
      "-c",
      `source "${init}" && ` +
      `sdkman_auto_answer=true sdk install ${candidate} ${version} && ` +
      `sdkman_auto_answer=true sdk default ${candidate} ${version}`,
    ], { env: { SDKMAN_DIR: dir } });
  }

  log.success(
    `SDKMAN with Java ${JAVA_VERSION}, Maven ${MAVEN_VERSION}, Gradle ${GRADLE_VERSION} installed`,
  );
}

export async function verify(ctx: TaskContext): Promise<void> {
  const dir = sdkmanDir(ctx);
  await v.assertFile(join(dir, "bin", "sdkman-init.sh"));

  for (const [candidate, version] of CANDIDATES) {
    await v.assertDir(join(dir, "candidates", candidate, version));
  }

  // Candidate binaries live under candidates/<name>/current/bin, which is not
  // among the dirs assertCommandWithPath puts on PATH, so invoke by absolute
  // path. mvn/gradle need a JDK: JAVA_HOME is set via SDKMAN's own init.
  const javaBin = join(dir, "candidates", "java", "current", "bin", "java");
  await v.assertCommandWithPath(ctx.home, javaBin, javaBin, "-version");

  const init = join(dir, "bin", "sdkman-init.sh");
  for (const [candidate, bin] of [["maven", "mvn"], ["gradle", "gradle"]]) {
    const binPath = join(dir, "candidates", candidate!, "current", "bin", bin!);
    await v.assertFile(binPath);
    await v.assertCommand(
      "bash",
      "-c",
      `export SDKMAN_DIR="${dir}" && source "${init}" && ${bin} --version`,
    );
  }
}
