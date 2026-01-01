import { type TaskContext, log, verify as v } from "../../../src/lib/mod.ts";
import { apt, checkCommandOutput, run as shellRun, runOrFail } from "../../../src/lib/shell.ts";

export async function shouldRun(_ctx: TaskContext): Promise<boolean> {
  try {
    const result = await checkCommandOutput(["code-insiders", "--version"]);
    return result.code !== 0;
  } catch {
    return true; // Command not found
  }
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
}

export async function verify(_ctx: TaskContext): Promise<void> {
  await v.assertCommand("code-insiders", "--version");
}
