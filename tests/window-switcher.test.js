import assert from 'assert';
import { focusWindow, returnFocusToTerminal } from '../src/window-switcher.js';
import os from 'os';
import { describe, it } from 'node:test';

describe('Window Switcher', () => {
  it('should export focusWindow as a function', () => {
    assert.strictEqual(typeof focusWindow, 'function');
  });

  it('should export returnFocusToTerminal as a function', () => {
    assert.strictEqual(typeof returnFocusToTerminal, 'function');
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

  it('returnFocusToTerminal should reject on non-darwin platforms', async () => {
    if (os.platform() === 'darwin') {
      // On macOS, returnFocusToTerminal calls the open command
      // Skip actual execution test; behavior tested manually
      return;
    }
    await assert.rejects(
      () => returnFocusToTerminal(),
      /only supports macOS/
    );
  });
});
