import fs from 'fs';
import path from 'path';
import os from 'os';

const configPath = path.join(os.homedir(), '.vscode-windows.json');

export function readConfig() {
  if (!fs.existsSync(configPath)) {
    return { mappings: {} };
  }

  try {
    const content = fs.readFileSync(configPath, 'utf-8');
    return JSON.parse(content);
  } catch (err) {
    console.warn(`Warning: could not read config at ${configPath}:`, err.message);
    return { mappings: {} };
  }
}

export function writeConfig(config) {
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

export function getConfigPath() {
  return configPath;
}
