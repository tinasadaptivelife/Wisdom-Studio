import { afterAll, afterEach, beforeAll, describe, it, expect } from 'vitest';
import http from 'node:http';
import path from 'node:path';
import { app } from '../app.js';

const FIXTURE_PACK = path.resolve('test/fixtures/brand-pack');

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

afterEach(() => {
  process.env.WISDOM_STUDIO_BRANDS_DIR = '';
});

describe('GET /api/brands', () => {
  it('has no brands when there is no brand pack, so clients use their built-in look', async () => {
    const res = await fetch(`${baseUrl}/api/brands`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ brands: [], fonts: [] });
  });

  it('serves the brands of the pack, with a url for each font file', async () => {
    process.env.WISDOM_STUDIO_BRANDS_DIR = FIXTURE_PACK;
    const body = await (await fetch(`${baseUrl}/api/brands`)).json();

    expect(body.brands.map((b) => b.key)).toEqual(['example', 'sample']);
    expect(body.brands[0].palettes[1]).toMatchObject({ key: 'navy-paper', suffix: '-example-navy-paper', background: '#1F3A5F' });
    expect(body.fonts).toEqual([
      { family: 'Example Display', weight: 400, url: '/api/brands/fonts/example-display-400.woff' },
      { family: 'Example Display', weight: 700, url: '/api/brands/fonts/example-display-700.woff' },
    ]);
  });

  it('lists a font once, at weight 400, when a family has a single file', async () => {
    // Atkinson is bundled, so use the fixture but check the dedupe rule directly
    // through a family whose bold file equals its normal file.
    const { fontFaces } = await import('./brands.js');
    expect(
      fontFaces({ Solo: { normal: '/x/fonts/solo.woff', bold: '/x/fonts/solo.woff' } })
    ).toEqual([{ family: 'Solo', weight: 400, url: '/api/brands/fonts/solo.woff' }]);
  });

  it('reports why a broken pack was ignored, and still answers', async () => {
    process.env.WISDOM_STUDIO_BRANDS_DIR = path.resolve('test/fixtures/borders'); // has a manifest.json, not brands.json
    const res = await fetch(`${baseUrl}/api/brands`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.brands).toEqual([]);
    expect(body.error).toMatch(/brands\.json/);
  });
});

describe('GET /api/brands/fonts/:file', () => {
  it('serves a font file named in the pack', async () => {
    process.env.WISDOM_STUDIO_BRANDS_DIR = FIXTURE_PACK;
    const res = await fetch(`${baseUrl}/api/brands/fonts/example-display-400.woff`);
    expect(res.status).toBe(200);
    expect((await res.arrayBuffer()).byteLength).toBeGreaterThan(5000);
  });

  it('404s for a file the pack does not list, including path tricks', async () => {
    process.env.WISDOM_STUDIO_BRANDS_DIR = FIXTURE_PACK;
    expect((await fetch(`${baseUrl}/api/brands/fonts/nope.woff`)).status).toBe(404);
    expect((await fetch(`${baseUrl}/api/brands/fonts/..%2Fbrands.json`)).status).toBe(404);
  });

  it('404s when there is no pack', async () => {
    expect((await fetch(`${baseUrl}/api/brands/fonts/example-display-400.woff`)).status).toBe(404);
  });
});
