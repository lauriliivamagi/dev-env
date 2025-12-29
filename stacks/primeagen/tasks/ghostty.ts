import { log } from "../../../src/lib/mod.ts";

export function run(): void {
  log.info("Ghostty installation on Ubuntu");
  console.log(`
--------------------------------------------------------

Ghostty requires manual installation on Ubuntu.

Option 1: Build from source
  https://ghostty.org/docs/install/build

Option 2: Use the unofficial PPA (if available)
  sudo add-apt-repository ppa:ghostty/ppa
  sudo apt update
  sudo apt install ghostty

--------------------------------------------------------
`);
}
