# Terminal VSCode Sync

## Problem

Switching between multiple VSCode windows across projects requires context-switching and manual window management. This tool automates it: switch a Terminal tab and the matching VSCode window focuses automatically within ~0.5 seconds.

## Approach

Build a lightweight daemon that:
1. **Monitors Terminal tab switches** — shell hook detects when the active Terminal tab changes
2. **Discovers VSCode windows** — reads VSCode workspace storage metadata (no permissions needed)
3. **Matches by working directory** — uses longest-prefix matching to find the VSCode window with the current directory
4. **Focuses the window** — uses `open -a` to bring the matching window to foreground
5. **Returns focus to Terminal** — reactivates Terminal so you can continue working

**Architecture:** macOS-only daemon with zsh shell hooks. No Accessibility/Automation permissions required for core functionality (Terminal.app permission is requested on first use, similar to other automation tools).

## Key Decisions

1. **Daemon architecture** — background Node.js process monitors and reacts to CWD changes
2. **Shell hook detection** — zsh background loop polls Terminal tab via osascript, avoids SIGWINCH unreliability
3. **File-based signaling** — `~/.vscode-bridge-cwd` file passes CWD from shell to daemon, avoids IPC complexity
4. **Workspace storage introspection** — reads VSCode's internal workspace metadata, no CLI overhead
5. **Launch Services focusing** — uses `open -a` to avoid Electron window cycling; requires VSCode setting `window.openFoldersInNewWindow: "off"`
6. **Return focus to Terminal** — automatically reactivates Terminal after VSCode focus so user can continue in Terminal

## Session Status (Latest)

### Completed:
- ✅ Project renamed from `vscode-window-management` to `terminal-vscode-sync`
- ✅ All references updated (package.json, bin command, daemon pattern, log paths, help text)
- ✅ Terminal reactivation feature: 1-second delay after VSCode focus before returning to Terminal
- ✅ Hook marker migration logic added (cleans up old markers when upgrading)
- ✅ Code review completed, all stale references fixed
- ✅ README updated with critical prerequisite: "projects must be open in VSCode beforehand"
- ✅ All 11 tests passing
- ✅ Project moved to `/terminal-vscode-sync`
- ✅ Ready for public release

### Architecture is stable:
- Daemon runs as background Node.js process
- zsh shell hooks detect tab switches via osascript polling
- CWD passed via file (`~/.vscode-bridge-cwd`), not IPC
- Window discovery reads VSCode workspace storage
- Focusing uses `open -a` (no cycling, no new windows with setting off)

### No known bugs or TODOs
