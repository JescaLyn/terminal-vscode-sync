# Development

## Running tests

```bash
npm test
```

Expected: 13 tests pass across 4 suites (Config, CWD, Discovery, Window Switcher).

## Project structure

```
src/
  cli.js               Entry point — routes subcommands
  daemon-command.js    Daemon lifecycle: start/stop/status; zshrc hook generation
  terminal-bridge.js   Core loop: watches ~/.vscode-bridge-cwd, discovers windows, focuses
  vscode-discovery.js  Reads VS Code workspace storage to enumerate open windows
  window-switcher.js   Focuses a VS Code window via osascript (AXRaise)
  list-command.js      `tvs list` output
  switch-command.js    `tvs switch <id>` manual focus
  config.js            Shared paths and constants
tests/
  *.test.js            Node built-in test runner
```

## Architecture notes

**Shell hook detection:** Each zsh session runs a background loop (started in `~/.zshrc`) that polls Terminal.app via `osascript` for the selected tab's TTY. When the active tab changes, it uses `lsof` to find the shell process on that TTY and reads its CWD. The loop is guarded by `_VSCODE_BRIDGE_PID=$$` so each shell instance runs exactly one loop, even after `exec zsh` or in environments that inherit exported variables.

**Daemon signaling:** The shell hook writes the CWD to `~/.vscode-bridge-cwd`. The daemon polls this file every 500ms and reacts to changes. File-based signaling is used instead of IPC to keep the shell hook simple and stateless.

**Window matching:** Longest-prefix match against VS Code workspace storage paths. A tab at `/projects/foo/src` matches a VS Code window opened at `/projects/foo` rather than one at `/projects`.

**Window focusing:** Uses `osascript` with `AXRaise` via System Events to raise the window. Requires Accessibility permission for the Node.js process running the daemon. After raising VS Code, the daemon reactivates Terminal.app (1-second delay) so focus returns to the terminal.

**Log file:** `~/Library/Logs/terminal-vscode-sync-daemon.log`
