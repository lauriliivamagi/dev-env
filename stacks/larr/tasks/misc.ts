import { type TaskContext, log, verify as v } from "../../../src/lib/mod.ts";
import { apt, curl, runOrFail } from "../../../src/lib/shell.ts";

export async function run(ctx: TaskContext): Promise<void> {
  // ========================================
  // Packages from standard Ubuntu 25.10 repos
  // ========================================
  await apt(ctx, [
    // CLI tools
    "eza",
    "lf",
    "cmake",
    "ffmpeg",
    "lm-sensors",
    "fastfetch", // neofetch replacement (neofetch is deprecated)
    "nmap",
    "p7zip-full",
    "pass",
    "pdfgrep",

    // Desktop apps from standard repos
    "obs-studio",
    "sqlitebrowser",

    // SDR tools
    "gnuradio",
    "hackrf",
  ]);

  // ========================================
  // Packages requiring external repositories
  // ========================================

  // --- Google Chrome ---
  log.info("Adding Google Chrome repository");
  await runOrFail(ctx, [
    "bash",
    "-c",
    "wget -qO- https://dl.google.com/linux/linux_signing_key.pub | gpg --dearmor | sudo tee /usr/share/keyrings/google-chrome.gpg > /dev/null",
  ]);
  await runOrFail(ctx, [
    "bash",
    "-c",
    'echo "deb [arch=amd64 signed-by=/usr/share/keyrings/google-chrome.gpg] http://dl.google.com/linux/chrome/deb/ stable main" | sudo tee /etc/apt/sources.list.d/google-chrome.list',
  ]);

  // --- Spotify ---
  log.info("Adding Spotify repository");
  await runOrFail(ctx, [
    "bash",
    "-c",
    "curl -sS https://download.spotify.com/debian/pubkey_C85668DF69375001.gpg | sudo gpg --dearmor -o /usr/share/keyrings/spotify.gpg",
  ]);
  await runOrFail(ctx, [
    "bash",
    "-c",
    'echo "deb [signed-by=/usr/share/keyrings/spotify.gpg] http://repository.spotify.com stable non-free" | sudo tee /etc/apt/sources.list.d/spotify.list',
  ]);

  // --- ZeroTier (via install script - no Ubuntu 25.10 repo yet) ---
  log.info("Installing ZeroTier via install script");
  await runOrFail(ctx, [
    "bash",
    "-c",
    "curl -fsSL https://install.zerotier.com | sudo bash",
  ]);

  // --- DBeaver CE ---
  log.info("Adding DBeaver repository");
  await runOrFail(ctx, [
    "bash",
    "-c",
    "curl -fsSL https://dbeaver.io/debs/dbeaver.gpg.key | sudo gpg --dearmor -o /usr/share/keyrings/dbeaver.gpg",
  ]);
  await runOrFail(ctx, [
    "bash",
    "-c",
    'echo "deb [signed-by=/usr/share/keyrings/dbeaver.gpg] https://dbeaver.io/debs/dbeaver-ce /" | sudo tee /etc/apt/sources.list.d/dbeaver.list',
  ]);

  // --- Grafana (for logcli) ---
  log.info("Adding Grafana repository");
  await runOrFail(ctx, ["sudo", "mkdir", "-p", "/etc/apt/keyrings"]);
  await runOrFail(ctx, [
    "bash",
    "-c",
    "wget -qO- https://apt.grafana.com/gpg.key | gpg --dearmor | sudo tee /etc/apt/keyrings/grafana.gpg > /dev/null",
  ]);
  await runOrFail(ctx, [
    "bash",
    "-c",
    'echo "deb [signed-by=/etc/apt/keyrings/grafana.gpg] https://apt.grafana.com stable main" | sudo tee /etc/apt/sources.list.d/grafana.list',
  ]);

  // --- Bitwarden (via .deb download, no official repo) ---
  log.info("Installing Bitwarden via .deb");
  const bitwardenDeb = "/tmp/bitwarden.deb";
  await curl(
    ctx,
    "https://vault.bitwarden.com/download/?app=desktop&platform=linux&variant=deb",
    bitwardenDeb,
  );
  await runOrFail(ctx, ["sudo", "dpkg", "-i", bitwardenDeb]);
  await runOrFail(ctx, ["sudo", "apt", "install", "-f", "-y"]); // fix dependencies

  // Update and install packages from external repos
  await runOrFail(ctx, ["sudo", "apt", "update"]);
  await apt(ctx, [
    "google-chrome-stable",
    "spotify-client",
    "dbeaver-ce",
    "logcli",
  ]);

  log.success("Misc packages installed");
}

export async function verify(_ctx: TaskContext): Promise<void> {
  // CLI tools from standard repos
  await v.assertCommand("eza", "--version");
  await v.assertCommand("lf", "-version");
  await v.assertCommand("cmake", "--version");
  await v.assertCommand("ffmpeg", "-version");
  await v.assertCommand("sensors", "--version");
  await v.assertCommand("fastfetch", "--version");
  await v.assertCommand("nmap", "--version");
  await v.assertCommand("pass", "--version");
  await v.assertCommand("pdfgrep", "--version");

  // GUI apps from standard repos
  await v.assertFile("/usr/bin/obs");
  await v.assertFile("/usr/bin/sqlitebrowser");

  // SDR tools
  await v.assertFile("/usr/bin/gnuradio-companion");
  await v.assertFile("/usr/bin/hackrf_info"); // returns error without hardware

  // External repo packages
  await v.assertFile("/usr/bin/google-chrome-stable");
  await v.assertFile("/usr/bin/spotify");
  await v.assertFile("/usr/sbin/zerotier-cli");
  await v.assertFile("/usr/bin/dbeaver");
  await v.assertCommand("logcli", "--version");
  await v.assertFile("/usr/bin/bitwarden");
}
