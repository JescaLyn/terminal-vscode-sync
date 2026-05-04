import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { startBridge } from './terminal-bridge.js';

const PLIST_LABEL = 'com.vscode-windows.daemon';
const PLIST_PATH = path.join(os.homedir(), 'Library/LaunchAgents', `${PLIST_LABEL}.plist`);
const LOG_PATH = path.join(os.homedir(), 'Library/Logs/vscode-windows-daemon.log');

function buildPlist(binPath) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${PLIST_LABEL}</string>
  <key>ProgramArguments</key>
  <array>
    <string>${binPath}</string>
    <string>daemon</string>
    <string>run</string>
  </array>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>StandardOutPath</key>
  <string>${LOG_PATH}</string>
  <key>StandardErrorPath</key>
  <string>${LOG_PATH}</string>
</dict>
</plist>`;
}

export async function daemonCommand(subcommand) {
  switch (subcommand) {
    case 'run':
      startBridge(500);
      process.stdin.resume(); // keep process alive
      break;

    case 'start': {
      const binPath = fs.realpathSync(process.argv[1]);
      fs.mkdirSync(path.dirname(PLIST_PATH), { recursive: true });
      fs.writeFileSync(PLIST_PATH, buildPlist(binPath));
      const uid = process.getuid();
      execSync(`launchctl bootstrap gui/${uid} "${PLIST_PATH}"`, { encoding: 'utf-8' });
      console.log('Daemon installed and started.');
      console.log('\nIf Terminal.app automation permission is needed, go to:');
      console.log('System Settings → Privacy & Security → Automation → your terminal → Terminal.app ✓');
      break;
    }

    case 'stop': {
      const uid = process.getuid();
      try {
        execSync(`launchctl bootout gui/${uid} ${PLIST_LABEL}`, { encoding: 'utf-8' });
      } catch {
        // may already be stopped; continue to remove plist
      }
      if (fs.existsSync(PLIST_PATH)) {
        fs.unlinkSync(PLIST_PATH);
      }
      console.log('Daemon stopped and uninstalled.');
      break;
    }

    case 'status': {
      const uid = process.getuid();
      try {
        const out = execSync(`launchctl print gui/${uid}/${PLIST_LABEL}`, { encoding: 'utf-8' });
        process.stdout.write(out);
        console.log('\nStatus: running');
      } catch {
        console.log('Status: stopped (not loaded)');
      }
      if (fs.existsSync(LOG_PATH)) {
        try {
          const logOut = execSync(`tail -20 "${LOG_PATH}"`, { encoding: 'utf-8' });
          console.log('\nRecent log output:');
          process.stdout.write(logOut);
        } catch {
          // no log content yet
        }
      }
      break;
    }

    default:
      console.error(`Unknown daemon subcommand: ${subcommand}`);
      console.log('Usage: vscode-windows daemon <run|start|stop|status>');
      process.exit(1);
  }
}
