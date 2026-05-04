import { execSync } from 'child_process';

export function getActiveTerminalCwd(_exec = execSync) {
  let tty;
  try {
    tty = _exec(
      'osascript -e \'tell application "Terminal" to get tty of selected tab of front window\'',
      { encoding: 'utf-8' }
    ).trim();
  } catch (err) {
    const stderr = err.stderr ?? '';
    if (stderr.includes('-1743')) {
      const e = new Error('Terminal.app automation permission not granted. Grant in System Settings → Privacy & Security → Automation.');
      e.code = 'TERMINAL_PERMISSION_DENIED';
      throw e;
    }
    return null; // Terminal not running, no windows, etc.
  }

  if (!tty) return null;

  return null; // full implementation in Task 2
}

// Starts a daemon loop that bridges Terminal tab switching to VSCode window focus.
// Implemented in Task 3.
export function startBridge(intervalMs = 500) {}

// Stops the bridge daemon loop.
// Implemented in Task 3.
export function stopBridge() {}
