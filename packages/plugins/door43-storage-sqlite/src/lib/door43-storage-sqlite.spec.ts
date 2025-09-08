import { door43StorageSqlite } from './door43-storage-sqlite.js';

describe('door43StorageSqlite', () => {
  it('should work', () => {
    expect(door43StorageSqlite()).toEqual('door43-storage-sqlite');
  });
});
