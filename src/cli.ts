import { parseArgs } from "@std/cli";
import { getContext, log } from "./lib/mod.ts";
import { runTasks } from "./commands/run.ts";
import { syncConfigs } from "./commands/sync.ts";

const args = parseArgs(Deno.args, {
  boolean: ["dry", "help"],
  alias: { d: "dry", h: "help" },
});

const command = args._[0] as string | undefined;
const filter = args._[1] as string | undefined;

function showHelp(): void {
  console.log(`
dev-env - Development environment manager

USAGE:
  deno task run [filter] [--dry]    Run setup tasks
  deno task sync [--dry]            Sync configs to home directory

OPTIONS:
  -d, --dry     Dry run mode (show what would be done)
  -h, --help    Show this help message

EXAMPLES:
  deno task run                 # Run all tasks
  deno task run neovim          # Run only tasks matching 'neovim'
  deno task run --dry           # Dry run all tasks
  deno task sync                # Sync configs
  deno task sync --dry          # Dry run sync
`);
}

if (args.help || !command) {
  showHelp();
  Deno.exit(0);
}

try {
  const ctx = getContext({ dryRun: args.dry });

  if (args.dry) {
    log.info("Dry run mode enabled");
  }

  switch (command) {
    case "run":
      await runTasks(ctx, filter);
      break;

    case "sync":
      await syncConfigs(ctx);
      break;

    default:
      log.error(`Unknown command: ${command}`);
      showHelp();
      Deno.exit(1);
  }
} catch (err) {
  log.error(String(err));
  Deno.exit(1);
}
