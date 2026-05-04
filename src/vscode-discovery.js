import { execSync } from 'child_process';
import os from 'os';

export async function discoverVSCodeInstances() {
  if (os.platform() !== 'darwin') {
    console.warn('VSCode discovery currently only supports macOS');
    return [];
  }

  try {
    // Use AppleScript to list all VSCode windows
    const script = `
      tell application "System Events"
        set vscodeWindows to {}
        tell process "Code"
          set windowCount to count of windows
          repeat with i from 1 to windowCount
            set windowTitle to name of window i
            set end of vscodeWindows to windowTitle
          end repeat
        end tell
        return vscodeWindows as string
      end tell
    `;

    const result = execSync(`osascript -e '${script}'`, { encoding: 'utf-8' });
    const titles = result.trim().split(', ').filter(t => t.length > 0);

    // Create a simple instance per window with title as both id and name
    return titles.map((title, index) => ({
      id: `vscode-${index}`,
      windowTitle: title,
      workspaceFolders: []
    }));
  } catch (err) {
    // VSCode not running or AppleScript failed
    return [];
  }
}
