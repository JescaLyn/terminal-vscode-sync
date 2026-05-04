import { execSync } from 'child_process';
import os from 'os';

export async function focusWindow(windowId) {
  if (os.platform() !== 'darwin') {
    throw new Error('Window switching currently only supports macOS');
  }

  try {
    // Use AppleScript to activate Code and bring window to front
    const script = `
      tell application "Code"
        activate
      end tell
    `;

    execSync(`osascript -e '${script}'`);
  } catch (err) {
    throw new Error(`Failed to focus window: ${err.message}`);
  }
}
