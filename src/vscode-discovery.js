import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

const WORKSPACE_STORAGE = path.join(
  os.homedir(),
  'Library/Application Support/Code/User/workspaceStorage'
);

export async function discoverVSCodeInstances() {
  if (os.platform() !== 'darwin') {
    console.warn('VSCode discovery currently only supports macOS');
    return [];
  }

  const pid = getVSCodePid();
  if (!pid) return [];

  const storageIds = getOpenWorkspaceStorageIds(pid);
  const instances = [];

  for (const id of storageIds) {
    const folderUri = readWorkspaceFolder(id);
    if (!folderUri) continue;

    const folderPath = decodeURIComponent(folderUri.replace('file://', ''));
    const title = path.basename(folderPath);

    instances.push({
      id: `vscode-${instances.length}`,
      windowTitle: title,
      folderPath,
      workspaceFolders: [folderPath],
    });
  }

  return instances;
}

function getVSCodePid() {
  try {
    return execSync('pgrep -f "MacOS/Code$"', { encoding: 'utf-8' }).trim();
  } catch {
    return '';
  }
}

function getOpenWorkspaceStorageIds(pid) {
  try {
    const output = execSync(`lsof -p ${pid}`, { encoding: 'utf-8', shell: true, stdio: ['pipe', 'pipe', 'ignore'] });
    const seen = new Set();
    const ids = [];

    for (const line of output.split('\n')) {
      const match = line.match(/workspaceStorage\/([^/]+)\/state\.vscdb$/);
      if (match && !seen.has(match[1])) {
        seen.add(match[1]);
        ids.push(match[1]);
      }
    }

    return ids;
  } catch {
    return [];
  }
}

function readWorkspaceFolder(storageId) {
  const workspaceJson = path.join(WORKSPACE_STORAGE, storageId, 'workspace.json');
  if (!fs.existsSync(workspaceJson)) return null;

  try {
    const data = JSON.parse(fs.readFileSync(workspaceJson, 'utf-8'));
    return data.folder || null;
  } catch {
    return null;
  }
}
