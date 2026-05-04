import assert from 'assert';
import { focusWindow } from '../src/window-switcher.js';
import os from 'os';
import { describe, it } from 'node:test';

describe('Window Switcher', () => {
  it('should not throw on focusWindow call', async () => {
    if (os.platform() !== 'darwin') {
      this.skip();
    }
    // This test just verifies the function doesn't crash
    // Actual focus behavior is manual testing
    await focusWindow('nonexistent-window');
  });
});
