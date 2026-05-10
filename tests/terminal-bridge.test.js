import assert from 'assert';
import { describe, it } from 'node:test';
import { getActiveTerminalTty, getCwdForTty } from '../src/terminal-bridge.js';

function mockExec(responses) {
  return async (cmd, args) => {
    const key = [cmd, ...(args || [])].join(' ');
    for (const [pattern, resp] of responses) {
      if (typeof pattern === 'string' ? key.includes(pattern) : pattern.test(key)) {
        if (resp instanceof Error) throw resp;
        return { stdout: resp, stderr: '' };
      }
    }
    throw new Error(`No mock for: ${key}`);
  };
}

describe('getActiveTerminalTty', () => {
  it('returns null if Terminal is not running', async () => {
    const exec = mockExec([['pgrep -x Terminal', new Error('not running')]]);
    assert.strictEqual(await getActiveTerminalTty(exec), null);
  });

  it('returns the tty path when Terminal is running and reports a valid tty', async () => {
    const exec = mockExec([
      ['pgrep -x Terminal', '12345\n'],
      ['osascript', '/dev/ttys003\n'],
    ]);
    assert.strictEqual(await getActiveTerminalTty(exec), '/dev/ttys003');
  });

  it('returns null when osascript output is not a tty path', async () => {
    const exec = mockExec([
      ['pgrep -x Terminal', '12345\n'],
      ['osascript', 'something else\n'],
    ]);
    assert.strictEqual(await getActiveTerminalTty(exec), null);
  });

  it('returns null when osascript errors', async () => {
    const exec = mockExec([
      ['pgrep -x Terminal', '12345\n'],
      ['osascript', new Error('AppleScript failed')],
    ]);
    assert.strictEqual(await getActiveTerminalTty(exec), null);
  });
});

describe('getCwdForTty', () => {
  it('returns null for a falsy tty', async () => {
    assert.strictEqual(await getCwdForTty(null), null);
    assert.strictEqual(await getCwdForTty(''), null);
  });

  it('extracts the cwd of the highest-PID shell attached to the tty', async () => {
    const exec = mockExec([
      ['lsof -t /dev/ttys003', '101\n202\n303\n'],
      ['ps -o comm= -p 101', '/bin/zsh\n'],
      ['ps -o comm= -p 202', '/usr/bin/login\n'],
      ['ps -o comm= -p 303', '-zsh\n'],
      [/lsof -a -p 303 -d cwd/, 'p303\nn/Users/alice/projects/repo\n'],
    ]);
    assert.strictEqual(await getCwdForTty('/dev/ttys003', exec), '/Users/alice/projects/repo');
  });

  it('returns null when no shells are attached to the tty', async () => {
    const exec = mockExec([
      ['lsof -t /dev/ttys003', '101\n'],
      ['ps -o comm= -p 101', '/usr/bin/login\n'],
    ]);
    assert.strictEqual(await getCwdForTty('/dev/ttys003', exec), null);
  });

  it('returns null when lsof for the tty fails', async () => {
    const exec = mockExec([
      ['lsof -t /dev/ttys003', new Error('lsof failed')],
    ]);
    assert.strictEqual(await getCwdForTty('/dev/ttys003', exec), null);
  });
});

// Regression: getCwdForTty must be called even when the tty has not changed,
// so that a same-tab `cd` (new cwd, same tty) still triggers a VSCode focus.
describe('getCwdForTty — same-tty different-cwd', () => {
  it('returns the new cwd on a second call with the same tty', async () => {
    const exec = mockExec([
      ['lsof -t /dev/ttys003', '303\n'],
      ['ps -o comm= -p 303', 'zsh\n'],
      [/lsof -a -p 303 -d cwd/, 'p303\nn/Users/alice/projects/new-repo\n'],
    ]);
    assert.strictEqual(await getCwdForTty('/dev/ttys003', exec), '/Users/alice/projects/new-repo');
  });
});
