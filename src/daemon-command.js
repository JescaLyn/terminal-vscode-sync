import { execSync, spawnSync, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { startBridge } from './terminal-bridge.js';

const LOG_PATH = path.join(os.homedir(), 'Library/Logs/terminal-vscode-sync-daemon.log');
const ZSHRC_PATH = path.join(os.homedir(), '.zshrc');
const PGREP_PATTERN = 'terminal-vscode-sync.*daemon run';

const HOOK_MARKER = 'vscode-windows-daemon-hook';
const HOOK_START = `# ${HOOK_MARKER}-start`;
const HOOK_END = `# ${HOOK_MARKER}-end`;

// Legacy CWD-reporting shell hook — no longer installed (Node now polls Terminal directly).
// Kept here only to remove old installations from ~/.zshrc.
const LEGACY_CWD_HOOK_START = '# vscode-windows-cwd-hook-start';
const LEGACY_CWD_HOOK_END = '# vscode-windows-cwd-hook-end';
const LEGACY_CWD_FILE = path.join(os.homedir(), '.vscode-bridge-cwd');

function buildHook(nodePath, scriptPath) {
  return `${HOOK_START}
if ! pgrep -qf "${PGREP_PATTERN}" 2>/dev/null; then
  nohup "${nodePath}" "${scriptPath}" daemon run >> "${LOG_PATH}" 2>&1 &!
fi
${HOOK_END}`;
}

function readZshrc() {
  if (!fs.existsSync(ZSHRC_PATH)) return '';
  return fs.readFileSync(ZSHRC_PATH, 'utf-8');
}

function hookIsInstalled(content) {
  return content.includes(HOOK_START);
}

function legacyCwdHookIsInstalled(content) {
  return content.includes(LEGACY_CWD_HOOK_START);
}

function removeBlock(content, start, end) {
  const re = new RegExp(`\\n?${start}[\\s\\S]*?${end}\\n?`, 'g');
  return content.replace(re, '\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n';
}

function isDaemonRunning() {
  const result = spawnSync('pgrep', ['-qf', PGREP_PATTERN], { encoding: 'utf-8' });
  return result.status === 0;
}

function removeLegacyArtifacts() {
  let removed = false;
  let existing = readZshrc();
  if (legacyCwdHookIsInstalled(existing)) {
    existing = removeBlock(existing, LEGACY_CWD_HOOK_START, LEGACY_CWD_HOOK_END);
    fs.writeFileSync(ZSHRC_PATH, existing);
    console.log('Removed legacy CWD shell hook from ~/.zshrc.');
    removed = true;
  }
  if (fs.existsSync(LEGACY_CWD_FILE)) {
    try {
      fs.unlinkSync(LEGACY_CWD_FILE);
      console.log(`Removed legacy CWD file: ${LEGACY_CWD_FILE}`);
      removed = true;
    } catch { /* ignore */ }
  }
  return removed;
}

export async function daemonCommand(subcommand) {
  switch (subcommand) {
    case 'run':
      startBridge(500);
      setInterval(() => {}, 1 << 30);
      break;

    case 'start': {
      const nodePath = process.execPath;
      const scriptPath = fs.realpathSync(process.argv[1]);

      removeLegacyArtifacts();

      let existing = readZshrc();
      if (hookIsInstalled(existing)) existing = removeBlock(existing, HOOK_START, HOOK_END);
      existing = existing.trimEnd() + '\n\n' + buildHook(nodePath, scriptPath) + '\n';
      fs.writeFileSync(ZSHRC_PATH, existing);
      console.log('Installed daemon auto-start hook in ~/.zshrc.');

      // Restart the daemon so the new code is loaded.
      if (isDaemonRunning()) {
        try {
          execSync(`pkill -f "${PGREP_PATTERN}"`, { encoding: 'utf-8' });
          await new Promise(r => setTimeout(r, 300));
        } catch { /* not running */ }
      }

      fs.mkdirSync(path.dirname(LOG_PATH), { recursive: true });
      const child = spawn('sh', [
        '-c',
        `nohup "${nodePath}" "${scriptPath}" daemon run >> "${LOG_PATH}" 2>&1 &`,
      ], { detached: true, stdio: 'ignore' });
      child.unref();
      await new Promise(r => setTimeout(r, 500));
      console.log(isDaemonRunning() ? 'Daemon started.' : 'Daemon started (verifying in log).');

      console.log(`\nAuto-starts on every new terminal session via ~/.zshrc.`);
      console.log(`Log: ${LOG_PATH}`);
      break;
    }

    case 'stop': {
      try {
        execSync(`pkill -f "${PGREP_PATTERN}"`, { encoding: 'utf-8' });
        console.log('Daemon stopped.');
      } catch {
        console.log('Daemon was not running.');
      }

      let existing = readZshrc();
      if (hookIsInstalled(existing)) {
        existing = removeBlock(existing, HOOK_START, HOOK_END);
        console.log('Removed daemon hook from ~/.zshrc.');
      }
      if (legacyCwdHookIsInstalled(existing)) {
        existing = removeBlock(existing, LEGACY_CWD_HOOK_START, LEGACY_CWD_HOOK_END);
        console.log('Removed legacy CWD hook from ~/.zshrc.');
      }
      fs.writeFileSync(ZSHRC_PATH, existing);
      if (fs.existsSync(LEGACY_CWD_FILE)) {
        try { fs.unlinkSync(LEGACY_CWD_FILE); } catch { /* ignore */ }
      }
      break;
    }

    case 'status': {
      if (isDaemonRunning()) {
        try {
          const pid = execSync(`pgrep -f "${PGREP_PATTERN}"`, { encoding: 'utf-8' }).trim();
          console.log(`Status: running (PID ${pid})`);
        } catch {
          console.log('Status: running (PID unavailable)');
        }
      } else {
        console.log('Status: stopped');
      }

      const existing = readZshrc();
      console.log(`Auto-start hook: ${hookIsInstalled(existing) ? 'installed' : 'not installed'}`);
      if (legacyCwdHookIsInstalled(existing)) {
        console.log('Legacy CWD hook: present (run `tvs daemon start` to remove)');
      }

      if (fs.existsSync(LOG_PATH)) {
        try {
          const logOut = execSync(`tail -20 "${LOG_PATH}"`, { encoding: 'utf-8' });
          console.log('\nRecent log output:');
          process.stdout.write(logOut);
        } catch { /* no log content yet */ }
      }
      break;
    }

    default:
      console.error(`Unknown daemon subcommand: ${subcommand}`);
      console.log('Usage: terminal-vscode-sync daemon <run|start|stop|status>');
      process.exit(1);
  }
}
