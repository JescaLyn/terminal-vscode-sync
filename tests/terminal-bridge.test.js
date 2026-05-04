import assert from 'assert';
import { describe, it } from 'node:test';
import { getActiveTerminalCwd } from '../src/terminal-bridge.js';

describe('getActiveTerminalCwd', () => {
  it('returns null when the CWD file does not exist', () => {
    const mockRead = () => { throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' }); };
    assert.strictEqual(getActiveTerminalCwd(mockRead), null);
  });

  it('returns null when the CWD file is empty', () => {
    const mockRead = () => '   \n';
    assert.strictEqual(getActiveTerminalCwd(mockRead), null);
  });

  it('returns the trimmed path when the file has content', () => {
    const mockRead = () => '/Users/alice/projects/my-app\n';
    assert.strictEqual(getActiveTerminalCwd(mockRead), '/Users/alice/projects/my-app');
  });

  it('returns the path without surrounding whitespace', () => {
    const mockRead = () => '  /Users/alice/projects/repo  ';
    assert.strictEqual(getActiveTerminalCwd(mockRead), '/Users/alice/projects/repo');
  });
});
