import { door43Cli } from './door43-cli.js';

describe('door43Cli', () => {
  it('should work', () => {
    expect(door43Cli()).toEqual('door43-cli');
  });
});
