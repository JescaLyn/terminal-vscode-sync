import { spawn } from 'child_process';
import path from 'path';
import os from 'os';

export async function focusWindow(folderPath) {
  if (os.platform() !== 'darwin') {
    throw new Error('Window switching currently only supports macOS');
  }

  const folderName = path.basename(folderPath).replace(/"/g, '\\"');
  const script = `tell application "System Events"
tell process "Code"
set allWindows to windows
set didFocus to false
repeat with w in allWindows
set winTitle to title of w
if winTitle contains "${folderName}" then
perform action "AXRaise" of w
set didFocus to true
exit repeat
end if
end repeat
if didFocus is false then
error "No VSCode window found with title containing: ${folderName}"
end if
end tell
end tell`;

  return new Promise((resolve, reject) => {
    const child = spawn('osascript', ['-e', script], { stdio: ['ignore', 'ignore', 'pipe'] });
    let stderr = '';
    child.stderr.on('data', (d) => { stderr += d; });
    child.on('close', (code) => {
      if (code !== 0) {
        const fullError = stderr.trim() || `(no stderr output)`;
        reject(new Error(`osascript exited with ${code}: ${fullError}\nScript:\n${script}`));
      } else resolve();
    });
    child.on('error', reject);
  });
}

export async function returnFocusToTerminal(delayMs = 1000) {
  if (os.platform() !== 'darwin') {
    throw new Error('Window switching currently only supports macOS');
  }

  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const child = spawn('open', ['-a', 'Terminal'], { stdio: 'ignore' });
      child.on('close', (code) => {
        if (code !== 0) reject(new Error(`open returned focus failed with exit ${code}`));
        else resolve();
      });
      child.on('error', reject);
    }, delayMs);
  });
}
