import assert from 'assert';
import { describe, it } from 'node:test';
import { getActiveTerminalCwd } from '../src/terminal-bridge.js';

describe('getActiveTerminalCwd', () => {
  it('returns null when Terminal is not running (osascript exits with error)', () => {
    const mockExec = () => { throw new Error('exit code 1'); };
    const result = getActiveTerminalCwd(mockExec);
    assert.strictEqual(result, null);
  });

  it('throws TERMINAL_PERMISSION_DENIED when osascript exits with -1743', () => {
    const mockExec = () => {
      const err = new Error('not authorized');
      err.stderr = 'execution error: Not authorized to send Apple events (-1743)';
      throw err;
    };
    assert.throws(
      () => getActiveTerminalCwd(mockExec),
      (err) => {
        assert.strictEqual(err.code, 'TERMINAL_PERMISSION_DENIED');
        return true;
      }
    );
  });
});
