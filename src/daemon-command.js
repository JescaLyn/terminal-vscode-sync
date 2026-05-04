import { execSync, spawnSync, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { startBridge, CWD_FILE } from './terminal-bridge.js';

const LOG_PATH = path.join(os.homedir(), 'Library/Logs/vscode-windows-daemon.log');
const ZSHRC_PATH = path.join(os.homedir(), '.zshrc');
const PGREP_PATTERN = 'vscode-window-management.*daemon run';

// Daemon auto-start hook
const HOOK_MARKER = 'vscode-windows-daemon-hook';
const HOOK_START = `# ${HOOK_MARKER}-start`;
const HOOK_END = `# ${HOOK_MARKER}-end`;

// Shell CWD reporting hooks (writes CWD to file on cd, prompt, and tab switch)
const CWD_HOOK_MARKER = 'vscode-windows-cwd-hook';
const CWD_HOOK_START = `# ${CWD_HOOK_MARKER}-start`;
const CWD_HOOK_END = `# ${CWD_HOOK_MARKER}-end`;

function buildHook(nodePath, scriptPath) {
  return `${HOOK_START}
if ! pgrep -qf "${PGREP_PATTERN}" 2>/dev/null; then
  nohup "${nodePath}" "${scriptPath}" daemon run >> "${LOG_PATH}" 2>&1 &
fi
${HOOK_END}`;
}

function buildCwdHook() {
  const activeFile = CWD_FILE + '.active';
  return `${CWD_HOOK_START}
if [[ -z $_VSCODE_BRIDGE_LOADED ]]; then
  export _VSCODE_BRIDGE_LOADED=1
  _vscode_bridge_ppid=$$
  {
    my_tty=$TTY
    ppid=$_vscode_bridge_ppid
    while sleep 0.5; do
      kill -0 $ppid 2>/dev/null || exit 0
      active=$(osascript -e 'tell application "Terminal" to get tty of selected tab of front window' 2>/dev/null)
      [[ -z $active ]] && continue
      if [[ $active == $my_tty ]]; then
        prev=$(cat "${activeFile}" 2>/dev/null)
        if [[ $prev != $my_tty ]]; then
          parent_cwd=$(lsof -a -p $ppid -d cwd -F n 2>/dev/null | awk '/^n/{print substr($0,2); exit}')
          [[ -n $parent_cwd ]] && print -r -- "$parent_cwd" > "${CWD_FILE}"
          print -r -- "$my_tty" > "${activeFile}"
        fi
      fi
    done
  } &!
fi
${CWD_HOOK_END}`;
}

function readZshrc() {
  if (!fs.existsSync(ZSHRC_PATH)) return '';
  return fs.readFileSync(ZSHRC_PATH, 'utf-8');
}

function hookIsInstalled(content) {
  return content.includes(HOOK_START);
}

function cwdHookIsInstalled(content) {
  return content.includes(CWD_HOOK_START);
}

function removeBlock(content, start, end) {
  const re = new RegExp(`\\n?${start}[\\s\\S]*?${end}\\n?`, 'g');
  return content.replace(re, '\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n';
}

function isDaemonRunning() {
  const result = spawnSync('pgrep', ['-qf', PGREP_PATTERN], { encoding: 'utf-8' });
  return result.status === 0;
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

      let existing = readZshrc();

      // Always replace hooks to ensure they're current
      if (hookIsInstalled(existing)) existing = removeBlock(existing, HOOK_START, HOOK_END);
      if (cwdHookIsInstalled(existing)) existing = removeBlock(existing, CWD_HOOK_START, CWD_HOOK_END);
      existing = existing.trimEnd() + '\n\n' + buildHook(nodePath, scriptPath) + '\n';
      existing = existing.trimEnd() + '\n\n' + buildCwdHook() + '\n';
      fs.writeFileSync(ZSHRC_PATH, existing);
      console.log('Installed hooks in ~/.zshrc.');

      if (isDaemonRunning()) {
        console.log('Daemon is already running.');
      } else {
        fs.mkdirSync(path.dirname(LOG_PATH), { recursive: true });
        const child = spawn('sh', [
          '-c',
          `nohup "${nodePath}" "${scriptPath}" daemon run >> "${LOG_PATH}" 2>&1 &`,
        ], { detached: true, stdio: 'ignore' });
        child.unref();
        await new Promise(r => setTimeout(r, 500));
        console.log(isDaemonRunning() ? 'Daemon started.' : 'Daemon started (verifying in log).');
      }

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
      if (cwdHookIsInstalled(existing)) {
        existing = removeBlock(existing, CWD_HOOK_START, CWD_HOOK_END);
        console.log('Removed CWD hook from ~/.zshrc.');
      }
      fs.writeFileSync(ZSHRC_PATH, existing);
      break;
    }

    case 'status': {
      if (isDaemonRunning()) {
        const pid = execSync(`pgrep -f "${PGREP_PATTERN}"`, { encoding: 'utf-8' }).trim();
        console.log(`Status: running (PID ${pid})`);
      } else {
        console.log('Status: stopped');
      }

      const existing = readZshrc();
      console.log(`Auto-start hook: ${hookIsInstalled(existing) ? 'installed' : 'not installed'}`);
      console.log(`CWD hook: ${cwdHookIsInstalled(existing) ? 'installed' : 'not installed'}`);

      if (fs.existsSync(CWD_FILE)) {
        try {
          const cwd = fs.readFileSync(CWD_FILE, 'utf-8').trim();
          if (cwd) console.log(`Last reported CWD: ${cwd}`);
        } catch { /* no cwd file yet */ }
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
      console.log('Usage: vscode-windows daemon <run|start|stop|status>');
      process.exit(1);
  }
}
