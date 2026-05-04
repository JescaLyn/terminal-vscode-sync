import { execSync } from 'child_process';
import { discoverVSCodeInstances } from './vscode-discovery.js';
import { focusWindow } from './window-switcher.js';

let _interval = null;

export function getActiveTerminalCwd(_exec = execSync) {
  let tty;
  try {
    tty = _exec(
      'osascript -e \'tell application "Terminal" to get tty of selected tab of front window\'',
      { encoding: 'utf-8' }
    ).trim();
  } catch (err) {
    const stderr = err.stderr ?? '';
    if (stderr.includes('-1743')) {
      const e = new Error('Terminal.app automation permission not granted. Grant in System Settings → Privacy & Security → Automation.');
      e.code = 'TERMINAL_PERMISSION_DENIED';
      throw e;
    }
    return null;
  }

  if (!tty) return null;

  let psOutput;
  try {
    psOutput = _exec(`ps -t ${tty} -o pid= -o ppid= -o comm=`, { encoding: 'utf-8' }).trim();
  } catch {
    return null;
  }

  if (!psOutput) return null;

  const processes = psOutput
    .split('\n')
    .map(line => {
      const parts = line.trim().split(/\s+/);
      return { pid: parts[0], ppid: parts[1] };
    })
    .filter(p => p.pid && p.ppid);

  const pids = new Set(processes.map(p => p.pid));
  const shell = processes.find(p => !pids.has(p.ppid));
  if (!shell) return null;

  let lsofOutput;
  try {
    lsofOutput = _exec(`lsof -p ${shell.pid} -d cwd -Fn`, { encoding: 'utf-8' }).trim();
  } catch {
    return null;
  }

  const cwdLine = lsofOutput.split('\n').find(l => l.startsWith('n'));
  return cwdLine ? cwdLine.slice(1) : null;
}

export function startBridge(intervalMs = 500) {
  let lastCwd = null;
  let permissionPauseUntil = 0;

  _interval = setInterval(async () => {
    if (Date.now() < permissionPauseUntil) return;

    let cwd;
    try {
      cwd = getActiveTerminalCwd();
    } catch (err) {
      if (err.code === 'TERMINAL_PERMISSION_DENIED') {
        process.stderr.write(`${err.message}\n`);
        permissionPauseUntil = Date.now() + 30000;
        return;
      }
      process.stderr.write(`bridge tick error: ${err.message}\n`);
      return;
    }

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

    const match = instances.find(inst => inst.folderPath === cwd);
    if (!match) {
      process.stderr.write(`no VSCode workspace for ${cwd}\n`);
      return;
    }

    try {
      await focusWindow(match.folderPath);
    } catch (err) {
      process.stderr.write(`focusWindow failed: ${err.message}\n`);
      lastCwd = null; // retry next tick
    }
  }, intervalMs);
}

export function stopBridge() {
  if (_interval) {
    clearInterval(_interval);
    _interval = null;
  }
}
