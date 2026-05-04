import { execSync } from 'child_process';
import os from 'os';

const CODE_CLI = '/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code';

export async function focusWindow(folderPath) {
  if (os.platform() !== 'darwin') {
    throw new Error('Window switching currently only supports macOS');
  }

  try {
    // 'code <path>' focuses the existing window for that folder, or opens a new one
    execSync(CODE_CLI, [folderPath], { encoding: 'utf-8' });
  } catch (err) {
    throw new Error(`Failed to focus window: ${err.message}`);
  }
}
