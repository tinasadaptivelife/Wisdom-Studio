import { afterAll, beforeAll, describe, it, expect } from 'vitest';
import express from 'express';
import http from 'node:http';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { mountFrontend } from './staticFrontend.js';

// A fake "built frontend" in a temp folder, so these tests never depend on
// whether frontend/dist has been built on this machine.
let dir;
let server;
let baseUrl;

const listen = async (app) => {
  const s = http.createServer(app);
  await new Promise((resolve) => s.listen(0, resolve));
  return { server: s, url: `http://localhost:${s.address().port}` };
};

beforeAll(async () => {
  dir = mkdtempSync(path.join(os.tmpdir(), 'wisdom-dist-'));
  mkdirSync(path.join(dir, 'assets'));
  writeFileSync(path.join(dir, 'index.html'), '<!doctype html><title>Wisdom Studio</title><div id="root">app-shell</div>');
  writeFileSync(path.join(dir, 'assets', 'app.js'), 'console.log("hi")');

  const app = express();
  app.get('/api/health', (req, res) => res.json({ ok: true }));
  const mounted = mountFrontend(app, dir);
  expect(mounted).toBe(true);
  ({ server, url: baseUrl } = await listen(app));
});

afterAll(async () => {
  await new Promise((resolve) => server.close(resolve));
  rmSync(dir, { recursive: true, force: true });
});

describe('mountFrontend', () => {
  it('serves the built app at /', async () => {
    const res = await fetch(`${baseUrl}/`);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toMatch(/text\/html/);
    expect(await res.text()).toContain('app-shell');
  });

  it('serves built assets with their own content type', async () => {
    const res = await fetch(`${baseUrl}/assets/app.js`);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toMatch(/javascript/);
  });

  it('falls back to the app shell for client-side routes', async () => {
    const res = await fetch(`${baseUrl}/some/client/route`);
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('app-shell');
  });

  it('leaves real API routes alone', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    expect(await res.json()).toEqual({ ok: true });
  });

  it('answers unknown API paths with a JSON 404, never the app shell', async () => {
    const res = await fetch(`${baseUrl}/api/does-not-exist`);
    expect(res.status).toBe(404);
    expect(res.headers.get('content-type')).toMatch(/json/);
    expect(await res.json()).toEqual({ error: 'Not found' });
  });

  it('does nothing, and reports false, when the app has not been built', () => {
    const app = express();
    expect(mountFrontend(app, path.join(dir, 'missing'))).toBe(false);
  });
});
