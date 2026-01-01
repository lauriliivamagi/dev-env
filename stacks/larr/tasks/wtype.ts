import { join } from "@std/path";
import { exists } from "@std/fs";
import { parse as parseYaml } from "@std/yaml";
import { type TaskContext, assert, fs, log, verify as v } from "../../../src/lib/mod.ts";
import { apt, commandExists, run as shellRun } from "../../../src/lib/shell.ts";

export const dependsOn = ["sops", "fzf"];

interface SnippetsSecretsFile {
  snippets: Record<string, string>;
}

export async function run(ctx: TaskContext): Promise<void> {
  // Install wl-clipboard for Wayland clipboard access (if not present)
  if (!(await commandExists("wl-copy"))) {
    log.info("Installing wl-clipboard for snippet copying");
    await apt(ctx, ["wl-clipboard"]);
  }

  // Create snippets directory
  const snippetsDir = join(ctx.home, ".local", "bin", "snippets");
  await fs.mkdir(ctx, snippetsDir);

  // Install snippets from encrypted secrets
  await installSnippets(ctx, snippetsDir);

  // Install snippet picker (fzf-based selector)
  await installSnippetPicker(ctx, snippetsDir);

  // Configure GNOME keyboard shortcut
  await configureKeyboardShortcut(ctx, snippetsDir);
}

async function installSnippets(ctx: TaskContext, snippetsDir: string): Promise<void> {
  const secretsFile = join(ctx.stackRoot, "secrets", "wtype.enc.yaml");

  if (!await exists(secretsFile)) {
    log.info("No secrets/wtype.enc.yaml found - skipping snippet installation");
    log.info("Copy wtype.enc.yaml.example to wtype.enc.yaml and encrypt with sops");
    return;
  }

  // Check if age key exists before attempting decryption
  const ageKeyFile = join(ctx.configHome, "sops", "age", "keys.txt");
  if (!await exists(ageKeyFile)) {
    log.warn(`Age key not found at ${ageKeyFile} - skipping snippet installation`);
    return;
  }

  log.info("Decrypting snippets from secrets/wtype.enc.yaml");

  if (ctx.dryRun) {
    log.dryRun("sops -d secrets/wtype.enc.yaml");
    return;
  }

  // sops is installed to ~/.local/bin
  const currentPath = Deno.env.get("PATH") ?? "";
  const env: Record<string, string> = {
    PATH: Deno.env.get("REALISTIC_TEST") ? currentPath : `${ctx.home}/.local/bin:${currentPath}`,
  };

  const result = await shellRun(ctx, ["sops", "-d", secretsFile], {
    stdout: "piped",
    stderr: "piped",
    env,
  });

  if (result.code !== 0) {
    throw new Error(
      `Failed to decrypt snippets (exit code ${result.code}). Check age key and SOPS config.`,
    );
  }

  assert(result.stdout !== undefined, "sops produced no output");

  const secrets = parseYaml(result.stdout) as SnippetsSecretsFile;

  // Support both old (wtype_snippets) and new (snippets) format
  const snippetsData = secrets.snippets ??
    (secrets as unknown as { wtype_snippets: Record<string, string> }).wtype_snippets;

  assert(snippetsData !== undefined, "secrets file missing snippets field");

  // Build set of expected snippet filenames
  const expectedFiles = new Set<string>();

  // Write each snippet as a .txt file (plain text content)
  for (const [filename, content] of Object.entries(snippetsData)) {
    // Convert .sh to .txt and extract the text content
    const txtFilename = filename.replace(/\.sh$/, ".txt");
    expectedFiles.add(txtFilename);
    const txtContent = extractSnippetText(content);
    const filePath = join(snippetsDir, txtFilename);
    await fs.writeFile(ctx, filePath, txtContent);
    log.success(`Installed ${txtFilename}`);
  }

  // Remove stale snippets that are no longer in secrets
  await removeStaleSnippets(ctx, snippetsDir, expectedFiles);

  log.success("Snippets installed to ~/.local/bin/snippets/");
}

function extractSnippetText(script: string): string {
  // Extract text content from wtype/ydotool shell scripts
  // Matches: wtype "text" or ydotool type "text"
  const lines = script.split("\n");
  const textParts: string[] = [];

  for (const line of lines) {
    // Match wtype "text" or ydotool type "text"
    const match = line.match(/(?:wtype|ydotool type)\s+"([^"]+)"/);
    if (match && match[1]) {
      textParts.push(match[1]);
    }
    // Match wtype -k Return (newline)
    if (line.match(/(?:wtype|ydotool)\s+(?:-k\s+)?(?:key\s+)?Return/)) {
      textParts.push("\n");
    }
  }

  // If no matches found, return the original content (might be plain text)
  if (textParts.length === 0) {
    return script;
  }

  return textParts.join("");
}

async function removeStaleSnippets(
  ctx: TaskContext,
  snippetsDir: string,
  expectedFiles: Set<string>,
): Promise<void> {
  if (ctx.dryRun) {
    log.dryRun("Check for stale snippets to remove");
    return;
  }

  try {
    for await (const entry of Deno.readDir(snippetsDir)) {
      // Only check .txt files, skip picker.sh and other files
      if (!entry.isFile || !entry.name.endsWith(".txt")) {
        continue;
      }

      if (!expectedFiles.has(entry.name)) {
        const filePath = join(snippetsDir, entry.name);
        await fs.remove(ctx, filePath);
        log.info(`Removed stale snippet: ${entry.name}`);
      }
    }
  } catch {
    // Directory might not exist yet, that's fine
  }
}

async function installSnippetPicker(ctx: TaskContext, snippetsDir: string): Promise<void> {
  const pickerScript = `#!/bin/bash
# Snippet picker - uses fzf, copies to clipboard
# Bound to Ctrl+Insert (launches in ghostty)
# After selecting, paste with Ctrl+V

SNIPPETS_DIR="${snippetsDir}"

# List snippets, let user pick with fzf
selected=$(ls -1 "$SNIPPETS_DIR"/*.txt 2>/dev/null | \\
  xargs -I{} basename {} .txt | \\
  fzf --prompt="Snippet: " --reverse --border)

# Copy snippet content to clipboard
if [[ -n "$selected" ]]; then
  content=$(cat "$SNIPPETS_DIR/$selected.txt")
  # Evaluate any \\$(...) commands in the content, preserve newlines
  eval "printf '%s' \\"$content\\"" | wl-copy
  notify-send -t 2000 "Snippet copied" "$selected → clipboard (Ctrl+V to paste)"
fi
`;

  const pickerPath = join(snippetsDir, "picker.sh");
  await fs.writeFile(ctx, pickerPath, pickerScript, 0o755);
  log.success("Installed picker.sh (fzf snippet selector)");
}

async function detectTerminalCommand(ctx: TaskContext, snippetsDir: string): Promise<string> {
  const pickerPath = `${snippetsDir}/picker.sh`;

  // Check for terminal emulators in order of preference
  const terminals = [
    { cmd: "ghostty", args: `-e ${pickerPath}` },
    { cmd: "kitty", args: `--hold ${pickerPath}` },
    { cmd: "alacritty", args: `-e ${pickerPath}` },
    { cmd: "gnome-terminal", args: `-- ${pickerPath}` },
  ];

  for (const term of terminals) {
    const result = await shellRun(ctx, ["which", term.cmd], {
      stdout: "piped",
      stderr: "piped",
    });
    if (result.code === 0) {
      return `${term.cmd} ${term.args}`;
    }
  }

  // Fallback to direct execution
  log.warn("No terminal emulator found - shortcut may not work correctly");
  return pickerPath;
}

async function configureKeyboardShortcut(ctx: TaskContext, snippetsDir: string): Promise<void> {
  const shortcutPath = "/org/gnome/settings-daemon/plugins/media-keys/custom-keybindings/snippet-picker/";
  const schema = "org.gnome.settings-daemon.plugins.media-keys";
  const bindingSchema = "org.gnome.settings-daemon.plugins.media-keys.custom-keybinding";

  // Check if gsettings is available (not in Docker/headless)
  const gsettingsCheck = await shellRun(ctx, ["which", "gsettings"], {
    stdout: "piped",
    stderr: "piped",
  });

  if (gsettingsCheck.code !== 0) {
    log.info("gsettings not available - skipping keyboard shortcut configuration");
    return;
  }

  log.info("Configuring GNOME keyboard shortcut for snippet picker");

  if (ctx.dryRun) {
    log.dryRun(`gsettings set ${bindingSchema}:${shortcutPath} name 'Snippet Picker'`);
    log.dryRun(`gsettings set ${bindingSchema}:${shortcutPath} command '<terminal> -e ${snippetsDir}/picker.sh'`);
    log.dryRun(`gsettings set ${bindingSchema}:${shortcutPath} binding '<Control>Insert'`);
    return;
  }

  // Get current custom keybindings list
  const currentBindings = await shellRun(ctx, [
    "gsettings",
    "get",
    schema,
    "custom-keybindings",
  ], { stdout: "piped", stderr: "piped" });

  if (currentBindings.code !== 0) {
    log.warn("Failed to get current keybindings - GNOME settings may not be available");
    return;
  }

  // Parse current bindings and add ours if not present
  const bindingsStr = currentBindings.stdout?.trim() ?? "@as []";
  const hasBinding = bindingsStr.includes("snippet-picker");

  if (!hasBinding) {
    // Add our binding to the list
    let newBindings: string;
    if (bindingsStr === "@as []") {
      newBindings = `['${shortcutPath}']`;
    } else {
      // Remove trailing ] and add our path
      newBindings = bindingsStr.slice(0, -1) + `, '${shortcutPath}']`;
    }

    await shellRun(ctx, [
      "gsettings",
      "set",
      schema,
      "custom-keybindings",
      newBindings,
    ], { stdout: "piped", stderr: "piped" });
  }

  // Detect terminal emulator for launching fzf
  const terminalCommand = await detectTerminalCommand(ctx, snippetsDir);

  // Configure the shortcut
  await shellRun(ctx, [
    "gsettings",
    "set",
    `${bindingSchema}:${shortcutPath}`,
    "name",
    "Snippet Picker",
  ], { stdout: "piped", stderr: "piped" });

  await shellRun(ctx, [
    "gsettings",
    "set",
    `${bindingSchema}:${shortcutPath}`,
    "command",
    terminalCommand,
  ], { stdout: "piped", stderr: "piped" });

  await shellRun(ctx, [
    "gsettings",
    "set",
    `${bindingSchema}:${shortcutPath}`,
    "binding",
    "<Control>Insert",
  ], { stdout: "piped", stderr: "piped" });

  log.success("Configured Ctrl+Insert keyboard shortcut for snippet picker");
}

export async function verify(_ctx: TaskContext): Promise<void> {
  await v.assertFile("/usr/bin/wl-copy");
  await v.assertFile("/usr/bin/fzf");
}
