# VSCode Window Management

## Problem

Managing multiple VSCode windows across projects is tedious — no built-in switcher exists, and losing track of which window belongs to which project wastes context-switching time. This tool provides a simple UI to list, organize, and quickly switch between open VSCode windows. Bonus: if we can hook into Terminal tab switching, opening a Terminal tab in a specific project automatically switches the VSCode window to that project's workspace.

## Approach

Build a lightweight desktop/CLI application that:
1. **Discovers open VSCode instances** — query VSCode's workspace storage database (no permissions needed) by using `lsof` to find active workspace directories
2. **Provides a switcher UI** — macOS CLI tool that lists open windows and switches between them
3. **Switches windows** — use VSCode's `code <path>` CLI to focus a window by folder path
4. **Optional Terminal bridge** — intercept Terminal tab changes and trigger window switch if tab name matches a known project

**Advantage of this approach:** No macOS Accessibility/Automation permissions required. Works by reading VSCode's internal workspace metadata and invoking the VSCode CLI, which is reliable and cross-platform-friendly.

**Tradeoff:** MVP uses CLI (fastest validation). Terminal bridge deferred. Electron UI deferred unless CLI proves insufficient.

## Open Questions

- How are VSCode workspaces identified? (folder path, workspace file, window title, remote-ssh host?)
- Should this run as a daemon or on-demand?
- Where should window/workspace mappings live? (JSON config file, VSCode settings, external registry?)
- Terminal tab matching strategy — by project folder name, by custom tags, or regex pattern?
- Platform priority — macOS first, or cross-platform from the start?

## Key Decisions

1. **Start with Node.js + CLI** — aligns with VSCode's native stack, fast iteration, easy distribution as VSCode extension or standalone tool
2. **Use workspace storage introspection** — read VSCode's internal workspace metadata from `~/Library/Application Support/Code/User/workspaceStorage` via `lsof`, avoiding permission prompts entirely
3. **Local config file** — store workspace-to-project mappings in `.vscode-windows.json` in home directory; human-editable, portable (future enhancement)
4. **Defer Electron UI** — validate CLI works first, then wrap in tray/menu if needed

## First Step

Create a minimal Node.js CLI that:
- Discovers open VSCode instances by reading workspace storage metadata (no permissions needed)
- Lists available windows with folder paths via `vscode-windows list`
- Switches windows by folder path via `vscode-windows switch <folder-name>`
- Provides error messages for invalid window IDs

MVP validates that discovery and switching work end-to-end. Terminal integration and GUI wrapper deferred.
