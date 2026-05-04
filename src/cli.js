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
        console.log('\nUsage: vscode-windows switch <window-id>');
        process.exit(1);
      }
      await switchCommand(args[1]);
      break;
    case 'daemon':
      if (args.length < 2) {
        console.error('Error: daemon requires a subcommand');
        console.log('\nUsage: vscode-windows daemon <run|start|stop|status>');
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
  console.log(`vscode-windows - Manage and switch between VSCode windows

Usage:
  vscode-windows [command]

Commands:
  list                 List all open VSCode windows
  switch <id>          Switch to a specific VSCode window
  daemon start         Install and start the Terminal bridge daemon
  daemon stop          Stop and uninstall the daemon
  daemon status        Show whether the daemon is running
  daemon run           Run the daemon in the foreground (used by launchd)
  help                 Show this help message

Examples:
  vscode-windows list
  vscode-windows switch <project-name>
  vscode-windows daemon start
`);
}
