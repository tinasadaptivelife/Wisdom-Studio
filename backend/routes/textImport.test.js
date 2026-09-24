import { afterAll, afterEach, beforeAll, beforeEach, describe, it, expect, vi } from 'vitest';
import http from 'node:http';

vi.mock('../services/textImport/docxImport.js', () => ({
  extractDocxText: vi.fn(),
}));

const { extractDocxText } = await import('../services/textImport/docxImport.js');
const { app } = await import('../app.js');

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

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('POST /api/import/docx', () => {
  it('rejects a request with no base64 payload', async () => {
    const res = await fetch(`${baseUrl}/api/import/docx`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
    expect(extractDocxText).not.toHaveBeenCalled();
  });

  it('decodes the base64 payload and returns extracted text', async () => {
    extractDocxText.mockResolvedValueOnce('Once upon a time...');

    const base64 = Buffer.from('fake docx bytes').toString('base64');
    const res = await fetch(`${baseUrl}/api/import/docx`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ base64 }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.text).toBe('Once upon a time...');

    const passedBuffer = extractDocxText.mock.calls[0][0];
    expect(Buffer.isBuffer(passedBuffer)).toBe(true);
    expect(passedBuffer.toString()).toBe('fake docx bytes');
  });

  it('returns a clear 400 when the file cannot be parsed', async () => {
    extractDocxText.mockRejectedValueOnce(new Error("Couldn't read that .docx file."));

    const base64 = Buffer.from('garbage').toString('base64');
    const res = await fetch(`${baseUrl}/api/import/docx`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ base64 }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/couldn.t read that \.docx file/i);
  });
});
