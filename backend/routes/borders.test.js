import { afterAll, beforeAll, describe, it, expect } from 'vitest';
import http from 'node:http';
import { app } from '../app.js';

// vitest.config.js points WISDOM_STUDIO_BORDERS_DIR at test/fixtures/borders,
// so these tests never depend on whatever artwork is in assets/borders.
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

describe('GET /api/borders', () => {
  it('lists the border templates with a servable url', async () => {
    const res = await fetch(`${baseUrl}/api/borders`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.borders.map((b) => b.id)).toEqual(['sample-gothic', 'sample-cozy', 'sample-branded']);

    const cozy = body.borders.find((b) => b.id === 'sample-cozy');
    expect(cozy).toMatchObject({
      name: 'Sample Cozy',
      tags: expect.arrayContaining(['cozy', 'craft']),
      brands: [],
    });
    expect(cozy.url).toBe('/api/borders/assets/sample-cozy.jpg');
  });

  it('filters by tag', async () => {
    const res = await fetch(`${baseUrl}/api/borders?tag=gothic`);
    const body = await res.json();
    expect(body.borders.map((b) => b.id)).toEqual(['sample-gothic']);
  });

  it('filters by brand', async () => {
    const res = await fetch(`${baseUrl}/api/borders?brand=sample-brand`);
    const body = await res.json();
    expect(body.borders.map((b) => b.id)).toEqual(['sample-branded']);
  });
});

describe('GET /api/borders/:id', () => {
  it('returns a single border by id', async () => {
    const res = await fetch(`${baseUrl}/api/borders/sample-cozy`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.name).toBe('Sample Cozy');
  });

  it('404s for an unknown id', async () => {
    const res = await fetch(`${baseUrl}/api/borders/not-a-real-border`);
    expect(res.status).toBe(404);
  });
});

describe('GET /api/borders/assets/:file', () => {
  it('serves the actual image file', async () => {
    const res = await fetch(`${baseUrl}/api/borders/assets/sample-gothic.jpg`);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('image/jpeg');
  });
});
