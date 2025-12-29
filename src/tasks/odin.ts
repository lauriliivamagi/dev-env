import { log } from "../lib/mod.ts";

export function run(): void {
  log.info("Odin requires manual installation");
  console.log(`
--------------------------------------------------------

Install odin: https://github.com/odin-lang/Odin/releases

1. Download the latest release for Linux
2. tar -xvzf odin-*.tar.gz
3. Move the directory to ~/.local/odin
4. Add ~/.local/odin to your PATH

--------------------------------------------------------
`);
}
