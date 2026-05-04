import assert from 'assert';
import { readConfig, writeConfig } from '../src/config.js';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { describe, it, afterEach } from 'node:test';

const configPath = path.join(os.homedir(), '.vscode-windows.json');

function cleanTestConfig() {
  if (fs.existsSync(configPath)) {
    fs.unlinkSync(configPath);
  }
}

describe('Config Module', () => {
  afterEach(cleanTestConfig);

  it('should return empty config if file does not exist', () => {
    cleanTestConfig();
    const config = readConfig();
    assert.deepStrictEqual(config, { mappings: {} });
  });

  it('should read existing config file', () => {
    const testConfig = {
      mappings: {
        '/path/to/project': 'My Project'
      }
    };
    fs.writeFileSync(configPath, JSON.stringify(testConfig, null, 2));
    const config = readConfig();
    assert.deepStrictEqual(config, testConfig);
  });

  it('should write config file', () => {
    const testConfig = {
      mappings: {
        '/another/path': 'Another Project'
      }
    };
    writeConfig(testConfig);
    const config = readConfig();
    assert.deepStrictEqual(config, testConfig);
  });
});
