import assert from 'assert';
import { discoverVSCodeInstances } from '../src/vscode-discovery.js';
import { describe, it } from 'node:test';

describe('VSCode Discovery', () => {
  it('should return an array of VSCode instances', async () => {
    const instances = await discoverVSCodeInstances();
    assert(Array.isArray(instances));
  });

  it('each instance should have id, windowTitle, and workspaceFolders', async () => {
    const instances = await discoverVSCodeInstances();
    for (const instance of instances) {
      assert.strictEqual(typeof instance.id, 'string');
      assert.strictEqual(typeof instance.windowTitle, 'string');
      assert(Array.isArray(instance.workspaceFolders));
    }
  });
});
