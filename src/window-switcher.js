import { spawn } from 'child_process';
import os from 'os';

export async function focusWindow(folderPath) {
  if (os.platform() !== 'darwin') {
    throw new Error('Window switching currently only supports macOS');
  }

  return new Promise((resolve, reject) => {
    const child = spawn('open', ['-a', 'Visual Studio Code', folderPath], { stdio: 'ignore' });
    child.on('close', (code) => {
      if (code !== 0) reject(new Error(`open exited with ${code}`));
      else resolve();
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
