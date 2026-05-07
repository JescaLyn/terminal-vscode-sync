import fs from 'fs';
import path from 'path';
import os from 'os';
import { discoverVSCodeInstances } from './vscode-discovery.js';
import { focusWindow, returnFocusToTerminal } from './window-switcher.js';

export const CWD_FILE = path.join(os.homedir(), '.vscode-bridge-cwd');
const LOG_PATH = path.join(os.homedir(), 'Library/Logs/terminal-vscode-sync-daemon.log');

function log(message) {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] ${message}\n`;
  try {
    fs.appendFileSync(LOG_PATH, line);
  } catch (e) {
    process.stderr.write(`Failed to write log: ${e.message}\n`);
  }
}

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
  log('Bridge started');
  let lastCwd = null;

  _interval = setInterval(async () => {
    const cwd = getActiveTerminalCwd();
    if (cwd === lastCwd) return;
    lastCwd = cwd;
    if (!cwd) return;

    log(`CWD changed to: ${cwd}`);

    let instances;
    try {
      instances = await discoverVSCodeInstances();
    } catch (err) {
      log(`discoverVSCodeInstances failed: ${err.message}`);
      return;
    }

    log(`Found ${instances.length} VSCode instances`);

    const match = instances
      .filter(inst => cwd === inst.folderPath || cwd.startsWith(inst.folderPath + '/'))
      .sort((a, b) => b.folderPath.length - a.folderPath.length)[0];

    if (!match) {
      log(`No matching VSCode window for: ${cwd}`);
      return;
    }

    log(`Matched: ${match.folderPath}`);

    try {
      await focusWindow(match.folderPath);
      log(`Successfully focused window`);
    } catch (err) {
      log(`focusWindow failed: ${err.message}`);
      lastCwd = null;
      return;
    }

    try {
      await returnFocusToTerminal();
      log(`Returned focus to Terminal`);
    } catch (err) {
      log(`returnFocusToTerminal failed: ${err.message}`);
    }
  }, intervalMs);
}

export function stopBridge() {
  if (_interval) {
    clearInterval(_interval);
    _interval = null;
  }
}
