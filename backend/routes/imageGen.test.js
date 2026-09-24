import { afterAll, afterEach, beforeAll, beforeEach, describe, it, expect, vi } from 'vitest';
import http from 'node:http';

vi.mock('../services/imageGen/index.js', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    imageGenProvider: {
      submit: vi.fn(),
      estimateCost: vi.fn(),
      checkStatus: vi.fn(),
      fetchResult: vi.fn(),
      listModels: vi.fn(),
      submitAlchemy: vi.fn(),
      checkAlchemy: vi.fn(),
    },
  };
});

const { imageGenProvider } = await import('../services/imageGen/index.js');
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

describe('GET /api/image-gen/models', () => {
  it('returns a curated, NSFW-filtered model list with plain-language labels and a default', async () => {
    imageGenProvider.listModels.mockResolvedValueOnce([
      { name: 'stable_diffusion', count: 40 },
      { name: 'WAI-NSFW-illustrious-SDXL', count: 12 },
      { name: 'Deliberate', count: 8 },
      { name: 'SomeRandomCheckpoint', count: 5 },
    ]);

    const res = await fetch(`${baseUrl}/api/image-gen/models`);
    expect(res.status).toBe(200);
    const body = await res.json();

    const names = body.models.map((m) => m.name);
    expect(names).toEqual(['stable_diffusion', 'Deliberate']);
    expect(names.join()).not.toMatch(/nsfw/i);
    for (const m of body.models) expect(m.label.length).toBeGreaterThan(0);
    expect(body.default).toBe('Flux.1-Schnell fp8 (Compact)');
  });
});

describe('POST /api/image-gen/jobs', () => {
  it('rejects a request with no prompt', async () => {
    const res = await fetch(`${baseUrl}/api/image-gen/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'general' }),
    });
    expect(res.status).toBe(400);
  });

  it('submits a styled prompt at sensible dimensions and returns the job id', async () => {
    imageGenProvider.submit.mockResolvedValueOnce({ providerJobId: 'horde-job-1' });

    const res = await fetch(`${baseUrl}/api/image-gen/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: 'a fox in the forest',
        mode: 'storybook',
        targetWidth: 720,
        targetHeight: 320,
      }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.jobId).toBe('horde-job-1');
    expect(body.model).toBe('Flux.1-Schnell fp8 (Compact)');

    const submittedArgs = imageGenProvider.submit.mock.calls[0][0];
    expect(submittedArgs.prompt).toContain('a fox in the forest');
    expect(submittedArgs.prompt).toContain('storybook illustration');
    expect(submittedArgs.width % 64).toBe(0);
    expect(submittedArgs.height % 64).toBe(0);
    expect(submittedArgs.apiKey).toBe('test-key');
  });

  it('enables print quality: larger dimensions, independent of post-processing', async () => {
    imageGenProvider.submit.mockResolvedValueOnce({ providerJobId: 'horde-job-pq' });

    const res = await fetch(`${baseUrl}/api/image-gen/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: 'a friendly otter',
        mode: 'coloring-page',
        targetWidth: 816,
        targetHeight: 1056,
        printQuality: true,
      }),
    });
    expect(res.status).toBe(201);

    const submittedArgs = imageGenProvider.submit.mock.calls[0][0];
    expect(Math.max(submittedArgs.width, submittedArgs.height)).toBe(1024);
    // printQuality alone (no postProcessingMode) no longer implies an inline
    // upscale pass — those are now independent, explicit choices.
    expect(submittedArgs.postProcessing).toBeUndefined();
  });

  it('omits post-processing at standard quality', async () => {
    imageGenProvider.submit.mockResolvedValueOnce({ providerJobId: 'horde-job-sq' });

    await fetch(`${baseUrl}/api/image-gen/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'a friendly otter', mode: 'general' }),
    });

    const submittedArgs = imageGenProvider.submit.mock.calls[0][0];
    expect(submittedArgs.postProcessing).toBeUndefined();
    expect(Math.max(submittedArgs.width, submittedArgs.height)).toBeLessThanOrEqual(640);
  });

  it('applies the chosen upscaler inline when postProcessingMode is inline', async () => {
    imageGenProvider.submit.mockResolvedValueOnce({ providerJobId: 'horde-job-inline' });

    await fetch(`${baseUrl}/api/image-gen/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: 'a friendly otter',
        mode: 'general',
        postProcessingMode: 'inline',
        upscaler: 'RealESRGAN_x4plus',
      }),
    });

    const submittedArgs = imageGenProvider.submit.mock.calls[0][0];
    expect(submittedArgs.postProcessing).toEqual(['RealESRGAN_x4plus']);
  });

  it('omits inline post-processing when postProcessingMode is alchemy, so the original is returned', async () => {
    imageGenProvider.submit.mockResolvedValueOnce({ providerJobId: 'horde-job-alchemy' });

    await fetch(`${baseUrl}/api/image-gen/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: 'a friendly otter',
        mode: 'general',
        postProcessingMode: 'alchemy',
        upscaler: 'RealESRGAN_x4plus',
      }),
    });

    const submittedArgs = imageGenProvider.submit.mock.calls[0][0];
    expect(submittedArgs.postProcessing).toBeUndefined();
  });

  it('omits inline post-processing when postProcessingMode is none, even if printQuality is set', async () => {
    imageGenProvider.submit.mockResolvedValueOnce({ providerJobId: 'horde-job-none' });

    await fetch(`${baseUrl}/api/image-gen/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: 'a friendly otter',
        mode: 'general',
        postProcessingMode: 'none',
        printQuality: true,
      }),
    });

    const submittedArgs = imageGenProvider.submit.mock.calls[0][0];
    expect(submittedArgs.postProcessing).toBeUndefined();
    // printQuality (dimension boost) is still independent of post-processing mode.
    expect(Math.max(submittedArgs.width, submittedArgs.height)).toBe(1024);
  });

  it('respects an explicit model choice', async () => {
    imageGenProvider.submit.mockResolvedValueOnce({ providerJobId: 'horde-job-2' });
    const res = await fetch(`${baseUrl}/api/image-gen/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'a barn', mode: 'general', model: 'AlbedoBase XL' }),
    });
    const body = await res.json();
    expect(body.model).toBe('AlbedoBase XL');
    expect(imageGenProvider.submit.mock.calls[0][0].model).toBe('AlbedoBase XL');
  });

  it('normalizes a reference image to webp base64 and forwards img2img params', async () => {
    imageGenProvider.submit.mockResolvedValueOnce({ providerJobId: 'horde-job-i2i' });
    // 1x1 transparent PNG
    const png =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

    const res = await fetch(`${baseUrl}/api/image-gen/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: 'a barn',
        mode: 'general',
        referenceImage: png,
        denoisingStrength: 0.5,
        sourceProcessing: 'img2img',
      }),
    });
    expect(res.status).toBe(201);

    const submitted = imageGenProvider.submit.mock.calls[0][0];
    expect(typeof submitted.sourceImage).toBe('string');
    expect(submitted.sourceImage.length).toBeGreaterThan(0);
    expect(submitted.sourceImage.startsWith('data:')).toBe(false);
    expect(submitted.sourceProcessing).toBe('img2img');
    expect(submitted.denoisingStrength).toBe(0.5);
    expect(submitted.referenceImageRaw).toBeUndefined();
  });

  it('returns a clear 400 when AI_HORDE_API_KEY is not configured', async () => {
    const original = process.env.AI_HORDE_API_KEY;
    delete process.env.AI_HORDE_API_KEY;
    try {
      const res = await fetch(`${baseUrl}/api/image-gen/jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: 'a barn', mode: 'general' }),
      });
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toMatch(/AI_HORDE_API_KEY/);
    } finally {
      process.env.AI_HORDE_API_KEY = original;
    }
  });
});

describe('POST /api/image-gen/jobs/estimate', () => {
  it('rejects a request with no prompt', async () => {
    const res = await fetch(`${baseUrl}/api/image-gen/jobs/estimate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'general' }),
    });
    expect(res.status).toBe(400);
    expect(imageGenProvider.estimateCost).not.toHaveBeenCalled();
  });

  it('returns the kudos cost without submitting a job', async () => {
    imageGenProvider.estimateCost.mockResolvedValueOnce({ kudos: 12.5 });

    const res = await fetch(`${baseUrl}/api/image-gen/jobs/estimate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: 'a fox in the forest',
        mode: 'storybook',
        targetWidth: 720,
        targetHeight: 320,
      }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.kudos).toBe(12.5);
    expect(imageGenProvider.submit).not.toHaveBeenCalled();

    const estimateArgs = imageGenProvider.estimateCost.mock.calls[0][0];
    expect(estimateArgs.prompt).toContain('a fox in the forest');
    expect(estimateArgs.width % 64).toBe(0);
    expect(estimateArgs.height % 64).toBe(0);
    expect(estimateArgs.apiKey).toBe('test-key');
  });

  it('returns a clear 400 when AI_HORDE_API_KEY is not configured', async () => {
    const original = process.env.AI_HORDE_API_KEY;
    delete process.env.AI_HORDE_API_KEY;
    try {
      const res = await fetch(`${baseUrl}/api/image-gen/jobs/estimate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: 'a barn', mode: 'general' }),
      });
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toMatch(/AI_HORDE_API_KEY/);
    } finally {
      process.env.AI_HORDE_API_KEY = original;
    }
  });
});

describe('POST /api/image-gen/alchemy', () => {
  it('rejects a request with no sourceImageUrl', async () => {
    const res = await fetch(`${baseUrl}/api/image-gen/alchemy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ upscaler: 'RealESRGAN_x4plus' }),
    });
    expect(res.status).toBe(400);
    expect(imageGenProvider.submitAlchemy).not.toHaveBeenCalled();
  });

  it('rejects a request with no upscaler', async () => {
    const res = await fetch(`${baseUrl}/api/image-gen/alchemy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sourceImageUrl: 'https://r2.example/original.webp' }),
    });
    expect(res.status).toBe(400);
    expect(imageGenProvider.submitAlchemy).not.toHaveBeenCalled();
  });

  it('submits the source image and upscaler to the provider and returns the job id', async () => {
    imageGenProvider.submitAlchemy.mockResolvedValueOnce({ providerJobId: 'interrogate-job-1' });

    const res = await fetch(`${baseUrl}/api/image-gen/alchemy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sourceImageUrl: 'https://r2.example/original.webp',
        upscaler: 'RealESRGAN_x4plus',
      }),
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.jobId).toBe('interrogate-job-1');
    expect(imageGenProvider.submitAlchemy).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceImageUrl: 'https://r2.example/original.webp',
        upscaler: 'RealESRGAN_x4plus',
      })
    );
  });

  it('returns a clear 400 when AI_HORDE_API_KEY is not configured', async () => {
    const original = process.env.AI_HORDE_API_KEY;
    delete process.env.AI_HORDE_API_KEY;
    try {
      const res = await fetch(`${baseUrl}/api/image-gen/alchemy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceImageUrl: 'https://r2.example/original.webp', upscaler: 'RealESRGAN_x4plus' }),
      });
      expect(res.status).toBe(400);
      const bodyText = await res.json();
      expect(bodyText.error).toMatch(/AI_HORDE_API_KEY/);
    } finally {
      process.env.AI_HORDE_API_KEY = original;
    }
  });
});

describe('GET /api/image-gen/alchemy/:jobId', () => {
  it('reports not-done while still processing', async () => {
    imageGenProvider.checkAlchemy.mockResolvedValueOnce({ done: false, faulted: false, url: undefined });

    const res = await fetch(`${baseUrl}/api/image-gen/alchemy/interrogate-job-1`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ done: false, faulted: false, url: undefined });
  });

  it('returns the upscaled url once done', async () => {
    imageGenProvider.checkAlchemy.mockResolvedValueOnce({
      done: true,
      faulted: false,
      url: 'https://r2.example/upscaled.webp',
    });

    const res = await fetch(`${baseUrl}/api/image-gen/alchemy/interrogate-job-1`);
    const body = await res.json();
    expect(body.done).toBe(true);
    expect(body.url).toBe('https://r2.example/upscaled.webp');
  });

  it('reports a faulted alchemy job with a friendly message', async () => {
    imageGenProvider.checkAlchemy.mockResolvedValueOnce({ done: true, faulted: true, url: undefined });

    const res = await fetch(`${baseUrl}/api/image-gen/alchemy/interrogate-job-1`);
    const body = await res.json();
    expect(body.faulted).toBe(true);
    expect(body.message).toMatch(/failed/i);
  });
});

describe('GET /api/image-gen/jobs/:jobId', () => {
  it('reports progress while the job is still queued', async () => {
    imageGenProvider.checkStatus.mockResolvedValueOnce({
      done: false,
      faulted: false,
      waitTimeSeconds: 30,
      queuePosition: 2,
    });

    const res = await fetch(`${baseUrl}/api/image-gen/jobs/horde-job-1`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ done: false, faulted: false, waitTimeSeconds: 30, queuePosition: 2 });
    expect(imageGenProvider.fetchResult).not.toHaveBeenCalled();
  });

  it('reports a faulted job without calling fetchResult', async () => {
    imageGenProvider.checkStatus.mockResolvedValueOnce({
      done: true,
      faulted: true,
      waitTimeSeconds: 0,
      queuePosition: 0,
    });

    const res = await fetch(`${baseUrl}/api/image-gen/jobs/horde-job-1`);
    const body = await res.json();
    expect(body.done).toBe(true);
    expect(body.faulted).toBe(true);
    expect(body.message).toMatch(/failed/i);
    expect(imageGenProvider.fetchResult).not.toHaveBeenCalled();
  });

  it('fetches and returns images once the job is done', async () => {
    imageGenProvider.checkStatus.mockResolvedValueOnce({
      done: true,
      faulted: false,
      waitTimeSeconds: 0,
      queuePosition: 0,
    });
    imageGenProvider.fetchResult.mockResolvedValueOnce({
      images: [{ url: 'https://r2.example/image1.webp', seed: '42' }],
    });

    const res = await fetch(`${baseUrl}/api/image-gen/jobs/horde-job-1`);
    const body = await res.json();
    expect(body.done).toBe(true);
    expect(body.images).toEqual([{ url: 'https://r2.example/image1.webp', seed: '42' }]);
  });

  it('keeps the client polling when the job reports done but no generations are ready yet', async () => {
    imageGenProvider.checkStatus.mockResolvedValueOnce({
      done: true,
      faulted: false,
      waitTimeSeconds: 0,
      queuePosition: 0,
    });
    imageGenProvider.fetchResult.mockResolvedValueOnce({ images: [] });

    const res = await fetch(`${baseUrl}/api/image-gen/jobs/horde-job-1`);
    const body = await res.json();
    expect(body.done).toBe(false);
    expect(body.finalizing).toBe(true);
    expect(body.images).toEqual([]);
  });
});
