import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { discoverVSCodeInstances } from './vscode-discovery.js';
import { focusWindow, returnFocusToTerminal } from './window-switcher.js';

const execFileP = promisify(execFile);
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

async function isTerminalRunning(_exec) {
  try {
    await _exec('pgrep', ['-x', 'Terminal']);
    return true;
  } catch {
    return false;
  }
}

export async function getActiveTerminalTty(_exec = execFileP) {
  if (!await isTerminalRunning(_exec)) return null;
  try {
    const { stdout } = await _exec('osascript', [
      '-e', 'tell application "Terminal" to get tty of selected tab of front window',
    ]);
    const tty = stdout.trim();
    return tty.startsWith('/dev/') ? tty : null;
  } catch (err) {
    log(`getActiveTerminalTty failed: ${err.message}`);
    return null;
  }
}

export async function getCwdForTty(tty, _exec = execFileP) {
  if (!tty) return null;
  let pids;
  try {
    const { stdout } = await _exec('lsof', ['-t', tty]);
    pids = stdout.trim().split('\n').filter(Boolean).map(Number);
  } catch {
    return null;
  }
  if (pids.length === 0) return null;

  const shellPids = [];
  for (const pid of pids) {
    try {
      const { stdout } = await _exec('ps', ['-o', 'comm=', '-p', String(pid)]);
      const cmd = stdout.trim().replace(/^-/, ''); // strip login-shell marker
      if (/(?:^|\/)(zsh|bash|fish|sh)$/.test(cmd)) shellPids.push(pid);
    } catch { /* skip */ }
  }
  if (shellPids.length === 0) return null;
  const shellPid = shellPids.sort((a, b) => b - a)[0];

  try {
    const { stdout } = await _exec('lsof', ['-a', '-p', String(shellPid), '-d', 'cwd', '-F', 'n']);
    const cwdLine = stdout.split('\n').find(l => l.startsWith('n'));
    return cwdLine ? cwdLine.slice(1) : null;
  } catch {
    return null;
  }
}

export function startBridge(intervalMs = 500) {
  log('Bridge started');
  let lastTty = null;
  let lastCwd = null;
  let busy = false;

  _interval = setInterval(async () => {
    if (busy) return;
    busy = true;
    try {
      const tty = await getActiveTerminalTty();
      if (!tty) return;
      lastTty = tty;

      const cwd = await getCwdForTty(tty);
      if (!cwd || cwd === lastCwd) return;
      lastCwd = cwd;

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
    } finally {
      busy = false;
    }
  }, intervalMs);
}

export function stopBridge() {
  if (_interval) {
    clearInterval(_interval);
    _interval = null;
  }
}
