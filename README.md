# Terminal VSCode Sync

Switch a Terminal tab — the matching VSCode window focuses automatically. No clicking.

**Stack:** macOS · Terminal.app · zsh · VSCode

---

## Quick Start

```bash
npm install -g .
tvs daemon start
```

Open each project folder in VSCode first, then start switching Terminal tabs. The matching window will focus within ~0.5 seconds.

> **Note:** The daemon switches between _existing_ VSCode windows — it does not open new ones.

## Quick Restart

**After shutdown/restart:** The daemon doesn't survive a reboot. Open any new Terminal tab after logging back in — the `~/.zshrc` hook restarts it automatically.

**After sleep/wake:** The daemon usually survives. If switching stops working, open a new terminal tab or run `tvs daemon start`.

---

## Requirements

- **macOS** — uses `osascript` (AppleScript) and System Events
- **Terminal.app** — relies on Terminal.app's AppleScript interface; not compatible with iTerm2
- **zsh** — shell hooks use zsh-specific syntax
- **Node.js 18+**
- **Accessibility permission** for Node.js: System Settings → Privacy & Security → Accessibility → add Node.js
- **Terminal.app automation permission**: granted automatically on first use (System Settings → Privacy & Security → Automation)

---

## Commands

```bash
tvs daemon start     # Install hooks in ~/.zshrc and start daemon
tvs daemon stop      # Stop daemon and remove hooks from ~/.zshrc
tvs daemon status    # Show daemon status, last known CWD, and recent logs
tvs list             # List all open VSCode windows
tvs switch <id>      # Manually focus a specific VSCode window
```

---

## How it works

1. **Shell hook** (installed in `~/.zshrc`): each Terminal tab runs a background loop that polls Terminal.app every 0.5s for the active tab's TTY. When the active tab changes, it finds the shell process on that TTY via `lsof` and writes its CWD to `~/.vscode-bridge-cwd`.

2. **Daemon**: a background Node.js process watches `~/.vscode-bridge-cwd`. On change, it reads VSCode's workspace storage metadata to discover open windows, matches the CWD using longest-prefix matching, focuses the matching window via `osascript` (AXRaise), then returns focus to Terminal.

3. **No spurious triggers**: the hook only writes when the active tab _changes_, not on every command or `cd`.

---

## Troubleshooting

**Windows not switching on tab change:**
- Verify daemon is running: `tvs daemon status`
- Check daemon logs: `tail -30 ~/Library/Logs/terminal-vscode-sync-daemon.log`
- Reload shell hooks in each Terminal tab: `exec zsh`

**VSCode window not raising / osascript error:**
- Grant Accessibility permission: System Settings → Privacy & Security → Accessibility → add Node.js (or the `node` binary in use)

**Terminal.app permission denied:**
- Grant in System Settings → Privacy & Security → Automation → Terminal.app

**After reinstalling or upgrading:**
- Run `tvs daemon start` again to update the hooks in `~/.zshrc` and restart the daemon.

---

## Limitations

- macOS only
- Terminal.app only (not iTerm2, Warp, etc.)
- zsh only

---

## Contributing / Development

See [docs/development.md](./docs/development.md).
