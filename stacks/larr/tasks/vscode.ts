import { join } from "@std/path";
import { exists } from "@std/fs";
import {
  assert,
  fs,
  log,
  type TaskContext,
  verify as v,
} from "../../../src/lib/mod.ts";
import { apt, checkCommandOutput, run as shellRun, runOrFail } from "../../../src/lib/shell.ts";

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

const EXTENSIONS = [
  "42crunch.vscode-openapi",
  "akamud.vscode-theme-onedark",
  "alexkrechik.cucumberautocomplete",
  "anthropic.claude-code",
  "bierner.markdown-mermaid",
  "bpmn-io.vs-code-bpmn-io",
  "bpruitt-goddard.mermaid-markdown-syntax-highlighting",
  "bradlc.vscode-tailwindcss",
  "chrischinchilla.vscode-pandoc",
  "christian-kohler.path-intellisense",
  "cmoog.sqlnotebook",
  "compulim.vscode-clock",
  "continue.continue",
  "csholmq.excel-to-markdown-table",
  "damonsk.vscode-wardley-maps",
  "davidanson.vscode-markdownlint",
  "davidnussio.vscode-jq-playground",
  "davraamides.todotxt-mode",
  "dbaeumer.vscode-eslint",
  "dendron.dendron",
  "denoland.vscode-deno",
  "dkundel.vscode-new-file",
  "docker.docker",
  "eamodio.gitlens",
  "earshinov.filter-lines",
  "emeraldwalk.runonsave",
  "esbenp.prettier-vscode",
  "fallenmax.mithril-emmet",
  "felipecaputo.git-project-manager",
  "file-icons.file-icons",
  "formulahendry.code-runner",
  "gera2ld.markmap-vscode",
  "ggml-org.llama-vscode",
  "github.codespaces",
  "github.copilot",
  "github.copilot-chat",
  "github.vscode-github-actions",
  "github.vscode-pull-request-github",
  "hediet.vscode-drawio",
  "janisdd.vscode-edit-csv",
  "jq-syntax-highlighting.jq-syntax-highlighting",
  "leanprover.lean4",
  "lucien-martijn.parquet-visualizer",
  "marlinfirmware.auto-build",
  "marp-team.marp-vscode",
  "mermaidchart.vscode-mermaid-chart",
  "mhutchie.git-graph",
  "ms-azuretools.vscode-azureresourcegroups",
  "ms-azuretools.vscode-containers",
  "ms-azuretools.vscode-docker",
  "ms-dotnettools.vscode-dotnet-runtime",
  "ms-kubernetes-tools.vscode-kubernetes-tools",
  "ms-playwright.playwright",
  "ms-python.debugpy",
  "ms-python.python",
  "ms-python.vscode-pylance",
  "ms-python.vscode-python-envs",
  "ms-toolsai.jupyter",
  "ms-toolsai.jupyter-keymap",
  "ms-toolsai.jupyter-renderers",
  "ms-toolsai.vscode-jupyter-cell-tags",
  "ms-toolsai.vscode-jupyter-slideshow",
  "ms-vscode-remote.remote-containers",
  "ms-vscode-remote.remote-ssh",
  "ms-vscode-remote.remote-ssh-edit",
  "ms-vscode.cpptools",
  "ms-vscode.live-server",
  "ms-vscode.remote-explorer",
  "ms-windows-ai-studio.windows-ai-studio",
  "mtxr.sqltools",
  "mujichok.vscode-project-name-in-statusbar",
  "neo4j-extensions.neo4j-for-vscode",
  "openai.chatgpt",
  "orta.vscode-twoslash-queries",
  "oscarotero.vento-syntax",
  "pkief.material-icon-theme",
  "platformio.platformio-ide",
  "pomdtr.excalidraw-editor",
  "quicktype.quicktype",
  "qwtel.sqlite-viewer",
  "redhat.vscode-xml",
  "redhat.vscode-yaml",
  "rogalmic.bash-debug",
  "rowewilsonfrederiskholme.wikitext",
  "ryanluker.vscode-coverage-gutters",
  "ryu1kn.edit-with-shell",
  "ryu1kn.partial-diff",
  "shyykoserhiy.vscode-spotify",
  "snyk-security.snyk-vulnerability-scanner",
  "sst-dev.opencode",
  "statelyai.stately-vscode",
  "streetsidesoftware.code-spell-checker",
  "streetsidesoftware.code-spell-checker-cspell-bundled-dictionaries",
  "takumii.markdowntable",
  "tamasfe.even-better-toml",
  "team-sapling.sapling",
  "teamsdevapp.vscode-ai-foundry",
  "terrastruct.d2",
  "unifiedjs.vscode-mdx",
  "usernamehw.errorlens",
  "vitest.explorer",
  "vscodevim.vim",
  "yoavbls.pretty-ts-errors",
  "yy0931.vscode-sqlite3-editor",
  "yzhang.markdown-all-in-one",
  "zenghongtu.vscode-asciiflow2",
  "ziglang.vscode-zig",
];

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

  // Install extensions
  log.info(`Installing ${EXTENSIONS.length} VS Code extensions`);
  for (const ext of EXTENSIONS) {
    await shellRun(ctx, ["code-insiders", "--install-extension", ext]);
  }
  log.success("VS Code extensions installed");

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
