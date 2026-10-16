import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { localProjectsApi, STORAGE_KEY } from './localProjectsApi.js';

const project = (overrides = {}) => ({
  id: 'proj_1',
  name: 'My design',
  pageSize: 'letter',
  templateKey: 'quote-card',
  pages: [{ id: 'page_1', elements: [] }],
  ...overrides,
});

// Recent Node versions ship their own experimental global `localStorage` that
// hides the test environment's, so give these tests a plain in-memory one.
const makeStorage = () => {
  const data = new Map();
  return {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => void data.set(k, String(v)),
    removeItem: (k) => void data.delete(k),
  };
};

beforeEach(() => {
  vi.stubGlobal('localStorage', makeStorage());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('localProjectsApi (browser-only stand-in for the projects server)', () => {
  it('starts with no projects', async () => {
    expect(await localProjectsApi.list()).toEqual([]);
  });

  it('creates a project and gives it timestamps', async () => {
    const created = await localProjectsApi.create(project());
    expect(created).toMatchObject({ id: 'proj_1', name: 'My design' });
    expect(created.createdAt).toBeTruthy();
    expect(created.updatedAt).toBeTruthy();
  });

  it('gets a saved project back, with all its pages', async () => {
    await localProjectsApi.create(project());
    const got = await localProjectsApi.get('proj_1');
    expect(got.pages).toHaveLength(1);
  });

  it('lists summaries (not full pages), newest first, with a page count and thumbnail', async () => {
    await localProjectsApi.create(project({ id: 'a', name: 'Old', updatedAt: '2026-01-01T00:00:00.000Z', thumbnail: 'data:image/png;base64,AAA' }));
    await localProjectsApi.create(project({ id: 'b', name: 'New', updatedAt: '2026-06-01T00:00:00.000Z' }));
    const list = await localProjectsApi.list();
    expect(list.map((p) => p.id)).toEqual(['b', 'a']);
    expect(list[1]).toMatchObject({ pageCount: 1, thumbnail: 'data:image/png;base64,AAA' });
    expect(list[0]).not.toHaveProperty('pages');
  });

  it('keeps projects across page reloads (they live in browser storage)', async () => {
    await localProjectsApi.create(project());
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY))).toHaveLength(1);
  });

  it('updates a project, refreshing updatedAt and keeping the id', async () => {
    const created = await localProjectsApi.create(project({ updatedAt: '2026-01-01T00:00:00.000Z' }));
    const updated = await localProjectsApi.update('proj_1', { ...created, name: 'Renamed', id: 'ignored' });
    expect(updated.id).toBe('proj_1');
    expect(updated.name).toBe('Renamed');
    expect(updated.updatedAt > '2026-01-01T00:00:00.000Z').toBe(true);
    expect((await localProjectsApi.list())).toHaveLength(1);
  });

  it('saves again over the same id instead of duplicating', async () => {
    await localProjectsApi.create(project());
    await localProjectsApi.create(project({ name: 'Second save' }));
    const list = await localProjectsApi.list();
    expect(list).toHaveLength(1);
    expect(list[0].name).toBe('Second save');
  });

  it('removes a project and resolves with null', async () => {
    await localProjectsApi.create(project());
    expect(await localProjectsApi.remove('proj_1')).toBeNull();
    expect(await localProjectsApi.list()).toEqual([]);
  });

  it('gives the same clear errors as the server for missing or invalid projects', async () => {
    await expect(localProjectsApi.get('nope')).rejects.toThrow('Project not found');
    await expect(localProjectsApi.update('nope', project())).rejects.toThrow('Project not found');
    await expect(localProjectsApi.remove('nope')).rejects.toThrow('Project not found');
    await expect(localProjectsApi.create({ id: 'x' })).rejects.toThrow('Invalid project payload');
  });

  it('explains what happened when browser storage is full', async () => {
    vi.stubGlobal('localStorage', {
      ...makeStorage(),
      setItem: () => {
        throw new DOMException('quota', 'QuotaExceededError');
      },
    });
    await expect(localProjectsApi.create(project())).rejects.toThrow(/storage is full/i);
  });
});
