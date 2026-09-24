import { afterEach, beforeEach, describe, it, expect } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { loadManifest } from './borderLibrary.js';

const border = (id, brands = []) => ({ id, name: id, file: `${id}.png`, tags: [], brands });

let dir;

beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), 'borders-'));
  writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify([border('shared')]));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe('loadManifest', () => {
  it('reads only the shared manifest when no local manifest exists', () => {
    expect(loadManifest(dir).map((b) => b.id)).toEqual(['shared']);
  });

  it('appends entries from an untracked manifest.local.json (private brand art)', () => {
    writeFileSync(
      path.join(dir, 'manifest.local.json'),
      JSON.stringify([border('private-brand', ['my-brand'])])
    );
    expect(loadManifest(dir).map((b) => b.id)).toEqual(['shared', 'private-brand']);
  });
});
