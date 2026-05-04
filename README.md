# VSCode Window Manager

CLI tool to quickly list and switch between open VSCode windows on macOS.

## Installation

```bash
npm install -g .
```

After installation, the `vscode-windows` command will be available in your terminal.

## Usage

### Display help and available commands

```bash
vscode-windows
```

Output:
```
vscode-windows - Manage and switch between VSCode windows

Usage:
  vscode-windows [command]

Commands:
  list       List all open VSCode windows
  switch     Switch to a specific VSCode window
  help       Show this help message

Examples:
  vscode-windows list
  vscode-windows switch <project-name>
```

### List all open VSCode windows

```bash
vscode-windows list
```

Output (when windows are open):
```
Open VSCode Windows:

ID                  | Title
--------------------|---------------------------------
vscode-0            | my-project
vscode-1            | another-project
vscode-2            | docs
```

Output (when no windows are open):
```
No open VSCode windows found
```

### Switch to a window

```bash
vscode-windows switch vscode-0
```

This brings the specified VSCode window to the foreground on macOS.

If the window ID is invalid:
```bash
vscode-windows switch invalid-id
```

Output:
```
Error: Window ID "invalid-id" not found

Available windows:
  vscode-0 - my-project
  vscode-1 - another-project
```

## How it works

The tool discovers open VSCode windows by:
1. Querying the macOS system using AppleScript via `osascript`
2. Parsing VSCode window titles to extract project names
3. Assigning each window a unique ID for quick reference

When you run `vscode-windows switch <id>`, it uses AppleScript to focus the target window, bringing it to the foreground.

## Configuration (Future)

Future versions will support `~/.vscode-windows.json` for custom project-to-name mappings and cross-platform support.

## Development

Run the test suite:

```bash
npm test
```

Expected output: All 6 tests pass
- 3 config module tests
- 2 VSCode discovery tests  
- 1 window switcher test

See [CLAUDE.md](./CLAUDE.md) for architecture, design decisions, and development notes.

## Status

MVP complete. Core features implemented:
- ✅ Discover open VSCode windows
- ✅ List windows with IDs and titles
- ✅ Switch to windows by ID
- ✅ Error handling for invalid IDs
- ✅ Full test coverage

Next steps (future):
- Terminal bridge integration
- Electron/GUI wrapper
- Cross-platform support (Linux, Windows)
- Workspace config file support
