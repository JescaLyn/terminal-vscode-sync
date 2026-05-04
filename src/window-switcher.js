import { spawn } from 'child_process';
import fs from 'fs';
import os from 'os';

const CANDIDATE_CLI_PATHS = [
  '/usr/local/bin/code',
  '/usr/bin/code',
  `${os.homedir()}/bin/code`,
  '/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code',
];

function findCodeCli() {
  for (const p of CANDIDATE_CLI_PATHS) {
    try {
      fs.accessSync(p, fs.constants.X_OK);
      return p;
    } catch { /* not found or not executable */ }
  }
  return null;
}

const CODE_CLI = findCodeCli();

export async function focusWindow(folderPath, { codeCli = CODE_CLI } = {}) {
  if (os.platform() !== 'darwin') {
    throw new Error('Window switching currently only supports macOS');
  }

  if (!codeCli) {
    throw new Error('VSCode "code" CLI not found. Ensure VSCode is installed at a standard location.');
  }

  return new Promise((resolve, reject) => {
    const child = spawn(codeCli, [folderPath], { stdio: 'ignore' });
    child.on('close', (code) => {
      if (code !== 0) reject(new Error(`code exited with ${code}`));
      else resolve();
    });
    child.on('error', reject);
  });
}
