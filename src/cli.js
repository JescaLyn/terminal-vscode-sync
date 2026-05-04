export async function handleCommand(args) {
  if (args.length === 0) {
    showHelp();
    return;
  }

  const command = args[0];

  switch (command) {
    case 'list':
      console.log('list command not yet implemented');
      break;
    case 'switch':
      console.log('switch command not yet implemented');
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
  list       List all open VSCode windows
  switch     Switch to a specific VSCode window
  help       Show this help message

Examples:
  vscode-windows list
  vscode-windows switch <project-name>
`);
}
