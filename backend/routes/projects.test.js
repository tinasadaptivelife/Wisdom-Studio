import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import http from 'node:http';
import { app } from '../app.js';

let server;
let baseUrl;

beforeAll(async () => {
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  baseUrl = `http://localhost:${server.address().port}`;
});

afterAll(async () => {
  await new Promise((resolve) => server.close(resolve));
});

const sampleProject = (overrides = {}) => ({
  id: `proj_test_${Math.random().toString(36).slice(2)}`,
  name: 'Test Flyer',
  pageSize: 'letter',
  templateKey: 'flyer',
  pages: [{ id: 'page_1', elements: [] }],
  ...overrides,
});

describe('/api/projects', () => {
  it('rejects a project payload missing required fields', async () => {
    const res = await fetch(`${baseUrl}/api/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Missing pages and id' }),
    });
    expect(res.status).toBe(400);
  });

  it('creates a project and returns it with timestamps', async () => {
    const payload = sampleProject();
    const res = await fetch(`${baseUrl}/api/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.id).toBe(payload.id);
    expect(body.name).toBe('Test Flyer');
    expect(body.pages).toHaveLength(1);
    expect(body.createdAt).toBeTruthy();
    expect(body.updatedAt).toBeTruthy();
  });

  it('lists created projects as summaries with a page count', async () => {
    const payload = sampleProject({ pages: [{ id: 'a', elements: [] }, { id: 'b', elements: [] }] });
    await fetch(`${baseUrl}/api/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const res = await fetch(`${baseUrl}/api/projects`);
    expect(res.status).toBe(200);
    const list = await res.json();
    const found = list.find((p) => p.id === payload.id);
    expect(found).toBeTruthy();
    expect(found.pageCount).toBe(2);
    expect(found).not.toHaveProperty('pages');
  });

  it('surfaces a stored thumbnail in the list summary, when present', async () => {
    const withThumb = sampleProject({ thumbnail: 'data:image/jpeg;base64,AAAA' });
    await fetch(`${baseUrl}/api/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(withThumb),
    });

    const res = await fetch(`${baseUrl}/api/projects`);
    const list = await res.json();
    const found = list.find((p) => p.id === withThumb.id);
    expect(found.thumbnail).toBe('data:image/jpeg;base64,AAAA');
  });

  it('omits thumbnail from the summary when the project has none', async () => {
    const payload = sampleProject();
    await fetch(`${baseUrl}/api/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const res = await fetch(`${baseUrl}/api/projects`);
    const list = await res.json();
    const found = list.find((p) => p.id === payload.id);
    expect(found.thumbnail).toBeUndefined();
  });

  it('returns 404 for a project that does not exist', async () => {
    const res = await fetch(`${baseUrl}/api/projects/does-not-exist`);
    expect(res.status).toBe(404);
  });

  it('fetches a single project with full page data', async () => {
    const payload = sampleProject();
    await fetch(`${baseUrl}/api/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const res = await fetch(`${baseUrl}/api/projects/${payload.id}`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.pages[0].id).toBe('page_1');
  });

  it('updates an existing project', async () => {
    const payload = sampleProject();
    await fetch(`${baseUrl}/api/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const res = await fetch(`${baseUrl}/api/projects/${payload.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, name: 'Renamed Flyer' }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.name).toBe('Renamed Flyer');

    const getRes = await fetch(`${baseUrl}/api/projects/${payload.id}`);
    const getBody = await getRes.json();
    expect(getBody.name).toBe('Renamed Flyer');
  });

  it('returns 404 when updating a project that does not exist', async () => {
    const res = await fetch(`${baseUrl}/api/projects/does-not-exist`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sampleProject()),
    });
    expect(res.status).toBe(404);
  });

  it('deletes a project', async () => {
    const payload = sampleProject();
    await fetch(`${baseUrl}/api/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const del = await fetch(`${baseUrl}/api/projects/${payload.id}`, { method: 'DELETE' });
    expect(del.status).toBe(204);

    const getRes = await fetch(`${baseUrl}/api/projects/${payload.id}`);
    expect(getRes.status).toBe(404);
  });

  it('exports a saved project to a real PDF', async () => {
    const payload = sampleProject({
      pages: [
        {
          id: 'page_1',
          elements: [
            {
              id: 'el1',
              type: 'text',
              x: 48,
              y: 48,
              width: 400,
              height: 60,
              rotation: 0,
              text: 'Hello PDF',
              fontSize: 24,
              fill: '#1d3557',
              align: 'left',
              visible: true,
            },
          ],
        },
      ],
    });
    await fetch(`${baseUrl}/api/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const res = await fetch(`${baseUrl}/api/projects/${payload.id}/pdf`);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('application/pdf');
    const bytes = new Uint8Array(await res.arrayBuffer());
    // A real PDF starts with the "%PDF-" magic bytes.
    expect(String.fromCharCode(...bytes.slice(0, 5))).toBe('%PDF-');
  });

  it('returns 404 exporting a project that does not exist', async () => {
    const res = await fetch(`${baseUrl}/api/projects/does-not-exist/pdf`);
    expect(res.status).toBe(404);
  });

  it('exports a project whose name has non-ASCII characters (em dash, accents)', async () => {
    const payload = sampleProject({ name: 'Quote card — café résumé' });
    await fetch(`${baseUrl}/api/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const res = await fetch(`${baseUrl}/api/projects/${payload.id}/pdf`);
    expect(res.status).toBe(200);
    const bytes = new Uint8Array(await res.arrayBuffer());
    expect(String.fromCharCode(...bytes.slice(0, 5))).toBe('%PDF-');
  });
});
