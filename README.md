# Terminal VSCode Sync

Auto-switch VSCode windows when you switch Terminal tabs. No clicking — just change tabs and the right window focuses automatically.

## Installation

```bash
npm install -g .
terminal-vscode-sync daemon start
```

The daemon installs itself in your `~/.zshrc` and auto-starts on every new shell session.

## Setup

### VSCode Setting

Add this setting to your VSCode `settings.json` to prevent opening new workspace windows:

```json
"window.openFoldersInNewWindow": "off"
```

This ensures the daemon focuses existing windows instead of creating new ones.

### Important: Open Projects in VSCode First

**The daemon switches between existing VSCode windows — it does not create new ones.** You must manually open each project folder in VSCode before the daemon can switch to it. Once open, switching Terminal tabs will automatically focus the matching VSCode window.

## Usage

Once installed and configured, the Terminal bridge daemon runs automatically. Switch Terminal tabs and the matching VSCode window focuses within ~0.5 seconds.

### Daemon commands

```bash
terminal-vscode-sync daemon status    # Check daemon status and CWD
terminal-vscode-sync daemon stop      # Stop daemon and remove hooks
terminal-vscode-sync daemon start     # Start daemon
terminal-vscode-sync list             # List all open VSCode windows
terminal-vscode-sync switch <id>      # Manually switch to a window
```

## How it works

1. **Shell hook** — Every Terminal tab runs a background loop that:
   - Polls the active Terminal tab every 0.5s via `osascript`
   - Reads the parent shell's working directory via `lsof`
   - Writes the CWD to `~/.vscode-bridge-cwd` when the active tab changes

2. **Daemon** — Node.js daemon monitors `~/.vscode-bridge-cwd`:
   - Discovers open VSCode windows by reading their workspace storage
   - Matches CWD to VSCode windows using prefix matching (longest match wins, supports subdirectories)
   - Focuses the matching window via `open -a "Visual Studio Code" <folder>`

3. **No spurious triggers** — Only switches when the Terminal tab actually changes, not on every command or `cd`.

## Requirements

- macOS (uses `osascript`, `lsof`, `open` command)
- zsh shell (uses zsh-specific syntax for background job management)
- Node.js 18+
- VSCode setting: `window.openFoldersInNewWindow: "off"`
- Terminal.app automation permission (granted automatically on first use, or manually in System Settings → Privacy & Security → Automation)

## Troubleshooting

**New VSCode windows keep opening:**
- Verify you set `window.openFoldersInNewWindow: "off"` in VSCode settings
- Check daemon is running: `terminal-vscode-sync daemon status`

**Windows not switching on tab change:**
- Verify daemon is running: `pgrep -f "terminal-vscode-sync.*daemon run"`
- Check daemon logs: `tail -20 ~/Library/Logs/terminal-vscode-sync-daemon.log`
- Reload shell hooks in your Terminal tabs: `unset _VSCODE_BRIDGE_LOADED && source ~/.zshrc`

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

- macOS only (uses `osascript` and Launch Services)
- zsh only (shell hooks use zsh-specific syntax)
- Requires VSCode setting to prevent new workspace windows
