# Terminal Bridge Design

## Goal

When the user switches tabs in macOS Terminal.app, automatically focus the VSCode window whose workspace matches the new tab's current working directory.

## Background

Terminal.app emits no events for tab switches. The only reliable mechanism is polling Terminal.app via AppleScript every 500ms to detect the active tab's TTY, resolve that TTY to a CWD via `lsof`, and switch VSCode if the CWD maps to a known open workspace. This requires a one-time Automation permission grant for Terminal.app (System Settings → Privacy & Security → Automation).

## Architecture

Three new components added to the existing project:

### `src/terminal-bridge.js`
Core polling logic. Exports:
- `getActiveTerminalCwd()` — runs AppleScript to get the TTY of the selected tab in Terminal.app's front window, then uses `lsof` to find the foreground process on that TTY and returns its CWD. Returns `null` if Terminal is not running, has no open windows, or the CWD can't be resolved. Does not require Terminal to be the frontmost app — polls regardless of which app is in focus, so a tab switch that brings Terminal to front is detected within 500ms.
- `startBridge(intervalMs)` — starts a `setInterval` loop. `lastCwd` is initialized to `null`, so the first tick always triggers a switch if a matching workspace is found. Each tick calls `getActiveTerminalCwd()`, compares to `lastCwd`, and if changed, calls `discoverVSCodeInstances()` to find a matching open workspace. If a match is found, calls `focusWindow(folderPath)`. `discoverVSCodeInstances()` is called on each changed tick (not cached) — running one extra `lsof` at 500ms intervals is negligible. Logs all skips and errors to stderr.
- `stopBridge()` — clears the interval.

### `src/daemon-command.js`
CLI handler for `vscode-windows daemon <subcommand>`. Subcommands:
- `run` — calls `startBridge(500)` and keeps the process alive. This is what launchd invokes.
- `start` — writes the launchd plist to `~/Library/LaunchAgents/com.vscode-windows.daemon.plist` and runs `launchctl bootstrap gui/<uid> <plist-path>`. Prints confirmation and the permission grant instructions.
- `stop` — runs `launchctl bootout gui/<uid> com.vscode-windows.daemon` and removes the plist file.
- `status` — checks if the launchd job is loaded via `launchctl print gui/<uid>/com.vscode-windows.daemon`. Prints running/stopped and tails the last 20 lines of `~/Library/Logs/vscode-windows-daemon.log`.

### launchd plist (generated at install time)
Written to `~/Library/LaunchAgents/com.vscode-windows.daemon.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.vscode-windows.daemon</string>
  <key>ProgramArguments</key>
  <array>
    <string>/path/to/vscode-windows</string>
    <string>daemon</string>
    <string>run</string>
  </array>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>StandardOutPath</key>
  <string>/Users/<user>/Library/Logs/vscode-windows-daemon.log</string>
  <key>StandardErrorPath</key>
  <string>/Users/<user>/Library/Logs/vscode-windows-daemon.log</string>
</dict>
</plist>
```

`RunAtLoad: true` starts it immediately on install. `KeepAlive: true` restarts it if it crashes and on login.

## Data Flow

```
[500ms tick]
    → osascript: get tty of selected tab of front window of app "Terminal"
    → if Terminal not running/frontmost: skip
    → ps -t <tty> -o pid= : get foreground PID on that TTY
    → lsof -p <pid> -d cwd -Fn: get CWD of that process
    → compare to lastCwd
    → if unchanged: skip
    → discoverVSCodeInstances(): get list of open VSCode workspaces
    → find instance where folderPath === cwd
    → if no match: log "no VSCode workspace for <cwd>", skip
    → focusWindow(folderPath)
    → update lastCwd
```

## CWD Resolution Detail

Terminal.app's `tty` property gives a device name like `ttys003`. The foreground process on that TTY is the one the user is interacting with — typically the shell itself when at a prompt, or a running command. We want the shell's CWD, not a subprocess like `vim` or `npm`. To get this:

1. `ps -t ttys003 -o pid= -o ppid= -o comm=` to list all processes on that TTY
2. Find the shell process (the one whose parent is not also on the TTY — i.e., the session leader). In practice this is the process with the lowest PID among those on the TTY.
3. Use `lsof -p <pid> -d cwd -Fn` to get its CWD.

This correctly handles the case where the user has `vim` or `node` running — it uses the shell's CWD, not the subprocess's.

## Error Handling

- Terminal not running or no open windows: `getActiveTerminalCwd()` returns `null`, tick skips silently.
- Automation permission not granted: `osascript` exits with error `-1743`. Daemon logs: `"Terminal.app automation permission not granted. Grant in System Settings → Privacy & Security → Automation."` and pauses polling for 30s before retrying.
- CWD doesn't match any open VSCode workspace: logged at debug level, no VSCode action taken.
- `focusWindow` fails: logged with error detail, lastCwd is NOT updated so the next tick retries.
- Any unhandled error in tick: caught, logged, tick continues.

## CLI Integration

`src/cli.js` gains a `daemon` branch that imports and calls `src/daemon-command.js`. The help text gains:

```
  daemon start         Install and start the Terminal bridge daemon
  daemon stop          Stop and uninstall the daemon
  daemon status        Show whether the daemon is running
  daemon run           Run the daemon in the foreground (used by launchd)
```

## Tests

`tests/terminal-bridge.test.js` tests `getActiveTerminalCwd()` with mocked `execSync`:
- Returns `null` when `osascript` exits with code 1 (Terminal not running)
- Returns `null` when `osascript` exits with `-1743` error
- Returns correct CWD when full chain succeeds
- Returns shell CWD (not subprocess CWD) when multiple processes are on the TTY

`daemon-command.js` is not unit tested — install/unload behavior requires the real launchd environment and is verified manually.

## Manual Verification Steps

After `npm install -g . && vscode-windows daemon start`:

1. Grant Automation permission when macOS prompts (or manually in System Settings → Privacy & Security → Automation → your terminal app → Terminal.app ✓)
2. Open two Terminal tabs, each cd'd into a different project that has a VSCode window open
3. Switch between tabs — VSCode should switch within ~500ms
4. `vscode-windows daemon status` shows running and recent log output
5. `vscode-windows daemon stop` stops it; tab switching no longer triggers VSCode

## Constraints

- macOS only (Terminal.app is macOS-specific)
- Requires one-time Automation permission for Terminal.app
- Requires the VSCode CLI (`code`) to be installed at the standard path
- `KeepAlive` in launchd means the daemon restarts automatically; `vscode-windows daemon stop` must be used to permanently stop it
