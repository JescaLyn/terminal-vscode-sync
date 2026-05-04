import fs from 'fs';
import path from 'path';
import os from 'os';
import { discoverVSCodeInstances } from './vscode-discovery.js';
import { focusWindow } from './window-switcher.js';

export const CWD_FILE = path.join(os.homedir(), '.vscode-bridge-cwd');

let _interval = null;

export function getActiveTerminalCwd(_readFile = (f) => fs.readFileSync(f, 'utf-8')) {
  try {
    const content = _readFile(CWD_FILE).trim();
    return content || null;
  } catch {
    return null;
  }
}

export function startBridge(intervalMs = 500) {
  let lastCwd = null;

  _interval = setInterval(async () => {
    const cwd = getActiveTerminalCwd();
    if (cwd === lastCwd) return;
    lastCwd = cwd;
    if (!cwd) return;

    let instances;
    try {
      instances = await discoverVSCodeInstances();
    } catch (err) {
      process.stderr.write(`discoverVSCodeInstances failed: ${err.message}\n`);
      return;
    }

    const match = instances
      .filter(inst => cwd === inst.folderPath || cwd.startsWith(inst.folderPath + '/'))
      .sort((a, b) => b.folderPath.length - a.folderPath.length)[0];

    if (!match) return;

    try {
      await focusWindow(match.folderPath);
    } catch (err) {
      process.stderr.write(`focusWindow failed: ${err.message}\n`);
      lastCwd = null;
    }
  }, intervalMs);
}

export function stopBridge() {
  if (_interval) {
    clearInterval(_interval);
    _interval = null;
  }
}
