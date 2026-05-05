# Terminal VSCode Sync

Auto-switch VSCode windows when you switch Terminal tabs. No clicking — just change tabs and the right window focuses automatically.

## Installation

```bash
npm install -g .
tvs daemon start
```

The daemon installs itself in your `~/.zshrc` and auto-starts on every new shell session.

## Setup

### Important: Open Projects in VSCode First

**The daemon switches between existing VSCode windows — it does not create new ones.** You must manually open each project folder in VSCode before the daemon can switch to it. Once open, switching Terminal tabs will automatically focus the matching VSCode window.

## Usage

Once installed and configured, the Terminal bridge daemon runs automatically. Switch Terminal tabs and the matching VSCode window focuses within ~0.5 seconds.

### Daemon commands

```bash
tvs daemon status    # Check daemon status and CWD
tvs daemon stop      # Stop daemon and remove hooks
tvs daemon start     # Start daemon
tvs list             # List all open VSCode windows
tvs switch <id>      # Manually switch to a window
```

## How it works

1. **Shell hook** — Every Terminal tab runs a background loop that:
   - Polls the active Terminal tab every 0.5s via `osascript`
   - Reads the parent shell's working directory via `lsof`
   - Writes the CWD to `~/.vscode-bridge-cwd` when the active tab changes

2. **Daemon** — Node.js daemon monitors `~/.vscode-bridge-cwd`:
   - Discovers open VSCode windows by reading their workspace storage
   - Matches CWD to VSCode windows using prefix matching (longest match wins, supports subdirectories)
   - Focuses the matching window via `osascript` (System Events, AXRaise)

3. **No spurious triggers** — Only switches when the Terminal tab actually changes, not on every command or `cd`.

## Requirements

- macOS (uses `osascript`, `lsof`, `open` command)
- zsh shell (uses zsh-specific syntax for background job management)
- Node.js 18+
- Accessibility permission for Node.js (required for `osascript` + `AXRaise` window focusing; grant in System Settings → Privacy & Security → Accessibility)
- Terminal.app automation permission (granted automatically on first use, or manually in System Settings → Privacy & Security → Automation)

## Troubleshooting

**Windows not switching on tab change:**
- Verify daemon is running: `pgrep -f "tvs.*daemon run"`
- Check daemon logs: `tail -20 ~/Library/Logs/terminal-vscode-sync-daemon.log`
- Reload shell hooks in your Terminal tabs: `unset _VSCODE_BRIDGE_LOADED && source ~/.zshrc`

**VSCode window not raising / osascript error:**
- Grant Accessibility permission: System Settings → Privacy & Security → Accessibility → add Node.js (or the terminal running the daemon)

**Terminal.app permission denied:**
- Grant permission in System Settings → Privacy & Security → Automation → Terminal.app

## Development

Run tests:

```bash
npm test
```

Expected: 11 tests pass (4 suites: Config, CWD, Discovery, Window Switcher)

See [CLAUDE.md](./CLAUDE.md) for architecture and design decisions.

## Status

Terminal bridge daemon implemented and working:
- ✅ Auto-switch on Terminal tab change
- ✅ Discover VSCode windows from workspace storage
- ✅ Match by working directory with prefix matching
- ✅ Focus windows without cycling through all of them
- ✅ No spurious triggers (only on actual tab switches)
- ✅ Full test coverage

## Known limitations

- macOS only (uses `osascript` and System Events)
- zsh only (shell hooks use zsh-specific syntax)
