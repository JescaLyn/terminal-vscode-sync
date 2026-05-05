import { listWindows } from './list-command.js';
import { switchCommand } from './switch-command.js';
import { daemonCommand } from './daemon-command.js';

export async function handleCommand(args) {
  if (args.length === 0) {
    showHelp();
    return;
  }

  const command = args[0];

  switch (command) {
    case 'list':
      await listWindows();
      break;
    case 'switch':
      if (args.length < 2) {
        console.error('Error: switch requires a window ID');
        console.log('\nUsage: tvs switch <id>');
        process.exit(1);
      }
      await switchCommand(args[1]);
      break;
    case 'daemon':
      if (args.length < 2) {
        console.error('Error: daemon requires a subcommand');
        console.log('\nUsage: tvs daemon <run|start|stop|status>');
        process.exit(1);
      }
      await daemonCommand(args[1]);
      break;
    default:
      console.log(`Unknown command: ${command}`);
      showHelp();
  }
}

function showHelp() {
  console.log(`tvs - Auto-switch VSCode windows when you switch Terminal tabs

Usage:
  tvs [command]

Commands:
  list                 List all open VSCode windows
  switch <id>          Switch to a specific VSCode window
  daemon start         Install and start the Terminal bridge daemon
  daemon stop          Stop and uninstall the daemon
  daemon status        Show whether the daemon is running
  daemon run           Run the daemon in the foreground (internal use only)
  help                 Show this help message

Examples:
  tvs list
  tvs daemon start
`);
}
