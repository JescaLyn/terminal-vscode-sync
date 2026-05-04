import { spawnSync } from 'child_process';
import os from 'os';

const CODE_CLI = '/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code';

export async function focusWindow(folderPath) {
  if (os.platform() !== 'darwin') {
    throw new Error('Window switching currently only supports macOS');
  }

  const result = spawnSync(CODE_CLI, [folderPath]);
  if (result.error) {
    throw new Error(`Failed to focus window: ${result.error.message}`);
  }
}
