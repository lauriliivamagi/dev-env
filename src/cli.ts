import { parseArgs } from "@std/cli";
import { getContext, log } from "./lib/mod.ts";
import { runTasks } from "./commands/run.ts";
import { syncConfigs } from "./commands/sync.ts";

const args = parseArgs(Deno.args, {
  boolean: ["dry", "help"],
  string: ["stack"],
  alias: { d: "dry", h: "help", s: "stack" },
});

const command = args._[0] as string | undefined;
const filter = args._[1] as string | undefined;

function showHelp(): void {
  console.log(`
dev-env - Development environment manager

USAGE:
  deno task run --stack <name> [filter] [--dry]    Run setup tasks
  deno task sync --stack <name> [--dry]            Sync configs to home directory

OPTIONS:
  -s, --stack   Stack name (required)
  -d, --dry     Dry run mode (show what would be done)
  -h, --help    Show this help message

EXAMPLES:
  deno task run -s primeagen              # Run all tasks in primeagen stack
  deno task run -s primeagen neovim       # Run only tasks matching 'neovim'
  deno task run -s primeagen --dry        # Dry run all tasks
  deno task sync -s primeagen             # Sync configs
  deno task sync -s primeagen --dry       # Dry run sync
`);
}

if (args.help || !command) {
  showHelp();
  Deno.exit(0);
}

try {
  const ctx = getContext({ dryRun: args.dry, stack: args.stack });

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
