import assert from 'assert';
import { focusWindow } from '../src/window-switcher.js';
import os from 'os';
import { describe, it } from 'node:test';

describe('Window Switcher', () => {
  it('should export focusWindow as a function', () => {
    assert.strictEqual(typeof focusWindow, 'function');
  });

  it('should throw on non-darwin platforms', async () => {
    if (os.platform() === 'darwin') {
      // On macOS, focusWindow calls the open command which requires real paths
      // Skip actual execution test; behavior tested manually
      return;
    }
    await assert.rejects(
      () => focusWindow('/some/path'),
      /only supports macOS/
    );
  });
});
