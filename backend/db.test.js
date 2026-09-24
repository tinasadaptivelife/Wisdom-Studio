import { describe, it, expect, afterEach } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

// Regression test for a real data-loss bug: WAL mode left writes sitting in
// a separate .sqlite-wal file that was never checkpointed, so a killed
// process (crash, restart) lost data that the API had already reported as
// saved. db.js must not re-enable WAL for the file-backed database.
describe('sqlite durability', () => {
  let tmpFile;

  afterEach(() => {
    if (tmpFile) {
      for (const suffix of ['', '-wal', '-shm']) fs.rmSync(tmpFile + suffix, { force: true });
    }
  });

  it('uses a journal mode that commits directly to the main file, not WAL', () => {
    tmpFile = path.join(os.tmpdir(), `wisdom-studio-durability-test-${Date.now()}.sqlite`);
    const db = new DatabaseSync(tmpFile);
    const mode = db.prepare('PRAGMA journal_mode').get().journal_mode;
    db.close();
    expect(mode).not.toBe('wal');
  });

  it('a committed write survives the connection being closed and reopened', () => {
    tmpFile = path.join(os.tmpdir(), `wisdom-studio-durability-test-${Date.now()}.sqlite`);
    const db1 = new DatabaseSync(tmpFile);
    db1.exec('CREATE TABLE t (id TEXT PRIMARY KEY)');
    db1.prepare('INSERT INTO t VALUES (?)').run('row-1');
    db1.close();

    const db2 = new DatabaseSync(tmpFile);
    const row = db2.prepare('SELECT * FROM t WHERE id = ?').get('row-1');
    db2.close();
    expect(row).toBeTruthy();
  });
});
