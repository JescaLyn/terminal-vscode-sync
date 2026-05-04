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

  it('returns the correct CWD when full chain succeeds', () => {
    const mockExec = (cmd) => {
      if (cmd.includes('osascript')) return 'ttys003\n';
      if (cmd.includes('ps -t')) return '  1234  1100 -zsh\n  5678  1234 vim\n';
      if (cmd.includes('lsof')) return 'p1234\nn/Users/alice/projects/my-app\n';
      return '';
    };
    const result = getActiveTerminalCwd(mockExec);
    assert.strictEqual(result, '/Users/alice/projects/my-app');
  });

  it('returns the shell CWD (not subprocess CWD) when multiple processes on TTY', () => {
    const mockExec = (cmd) => {
      if (cmd.includes('osascript')) return 'ttys003\n';
      // PID 100 (shell, ppid 50 not on TTY), PID 200 (vim, ppid 100 on TTY)
      if (cmd.includes('ps -t')) return '  100   50 -bash\n  200  100 vim\n';
      if (cmd.includes('lsof -p 100')) return 'p100\nn/Users/alice/projects/repo\n';
      return '';
    };
    const result = getActiveTerminalCwd(mockExec);
    assert.strictEqual(result, '/Users/alice/projects/repo');
  });
});
