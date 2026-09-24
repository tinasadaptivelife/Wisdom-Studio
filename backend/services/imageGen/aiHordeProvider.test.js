import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { aiHordeProvider } from './aiHordeProvider.js';

const jsonResponse = (body, ok = true, status = ok ? 200 : 500) => ({
  ok,
  status,
  json: async () => body,
});

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('aiHordeProvider.submit', () => {
  it('posts to /generate/async with the api key header and returns the provider job id', async () => {
    fetch.mockResolvedValueOnce(jsonResponse({ id: 'horde-job-1' }));

    const result = await aiHordeProvider.submit({
      apiKey: 'test-key',
      prompt: 'a red barn, storybook illustration',
      negativePrompt: '',
      model: 'stable_diffusion',
      width: 512,
      height: 512,
    });

    expect(result).toEqual({ providerJobId: 'horde-job-1' });

    const [url, options] = fetch.mock.calls[0];
    expect(url).toContain('/generate/async');
    expect(options.method).toBe('POST');
    expect(options.headers.apikey).toBe('test-key');
    const body = JSON.parse(options.body);
    expect(body.prompt).toBe('a red barn, storybook illustration');
    expect(body.params.width).toBe(512);
    expect(body.params.height).toBe(512);
    expect(body.models).toEqual(['stable_diffusion']);
    expect(body.r2).toBe(true);
    // AI Horde quality guidance: ancestral sampler + karras scheduling at ~28
    // steps, share with LAION (cheaper kudos), downgrade instead of erroring.
    expect(body.params.sampler_name).toBe('k_euler_a');
    expect(body.params.karras).toBe(true);
    expect(body.params.steps).toBe(28);
    expect(body.shared).toBe(true);
    expect(body.allow_downgrade).toBe(true);
    expect(body.params.post_processing).toBeUndefined();
    // Worker-side NSFW filtering must always be explicitly disabled, not left
    // to the API's implicit default.
    expect(body.nsfw).toBe(false);
  });

  it('passes post-processing through to params when requested', async () => {
    fetch.mockResolvedValueOnce(jsonResponse({ id: 'horde-job-pp' }));

    await aiHordeProvider.submit({
      apiKey: 'test-key',
      prompt: 'a red barn',
      model: 'stable_diffusion',
      width: 1024,
      height: 1024,
      postProcessing: ['RealESRGAN_x2plus'],
    });

    const body = JSON.parse(fetch.mock.calls[0][1].body);
    expect(body.params.post_processing).toEqual(['RealESRGAN_x2plus']);
  });

  it('folds the negative prompt into the prompt with a ### separator (AI Horde has no negative_prompt field)', async () => {
    fetch.mockResolvedValueOnce(jsonResponse({ id: 'horde-job-neg' }));

    await aiHordeProvider.submit({
      apiKey: 'test-key',
      prompt: 'a red barn',
      negativePrompt: 'blurry, watermark',
      model: 'stable_diffusion',
      width: 512,
      height: 512,
    });

    const body = JSON.parse(fetch.mock.calls[0][1].body);
    expect(body.prompt).toBe('a red barn ### blurry, watermark');
    expect(body.negative_prompt).toBeUndefined();
  });

  it('uses a Flux-appropriate sampler/step/cfg profile for Flux models', async () => {
    fetch.mockResolvedValueOnce(jsonResponse({ id: 'horde-job-flux' }));

    await aiHordeProvider.submit({
      apiKey: 'test-key',
      prompt: 'a red barn',
      model: 'Flux.1-Schnell fp8 (Compact)',
      width: 1024,
      height: 768,
    });

    const body = JSON.parse(fetch.mock.calls[0][1].body);
    expect(body.params.steps).toBe(6);
    expect(body.params.cfg_scale).toBe(1);
    expect(body.params.sampler_name).toBe('k_euler');
    expect(body.params.karras).toBe(false);
  });

  it('passes an img2img source image, processing mode and denoising strength through', async () => {
    fetch.mockResolvedValueOnce(jsonResponse({ id: 'horde-job-i2i' }));

    await aiHordeProvider.submit({
      apiKey: 'test-key',
      prompt: 'a red barn',
      model: 'stable_diffusion',
      width: 512,
      height: 512,
      sourceImage: 'BASE64WEBP',
      sourceProcessing: 'img2img',
      denoisingStrength: 0.55,
      n: 3,
    });

    const body = JSON.parse(fetch.mock.calls[0][1].body);
    expect(body.source_image).toBe('BASE64WEBP');
    expect(body.source_processing).toBe('img2img');
    expect(body.params.denoising_strength).toBe(0.55);
    expect(body.params.n).toBe(3);
  });

  it('throws a descriptive error when AI Horde rejects the submission', async () => {
    fetch.mockResolvedValueOnce(jsonResponse({ message: 'Invalid API Key' }, false, 401));

    await expect(
      aiHordeProvider.submit({ apiKey: 'bad-key', prompt: 'x', width: 512, height: 512 })
    ).rejects.toThrow(/Invalid API Key/);
  });
});

describe('aiHordeProvider.estimateCost', () => {
  it('posts a dry_run request and returns the kudos cost without queuing a job', async () => {
    fetch.mockResolvedValueOnce(jsonResponse({ kudos: 12.5 }));

    const result = await aiHordeProvider.estimateCost({
      apiKey: 'test-key',
      prompt: 'a red barn, storybook illustration',
      negativePrompt: '',
      model: 'stable_diffusion',
      width: 512,
      height: 512,
    });

    expect(result).toEqual({ kudos: 12.5 });

    const [url, options] = fetch.mock.calls[0];
    expect(url).toContain('/generate/async');
    const body = JSON.parse(options.body);
    expect(body.dry_run).toBe(true);
    expect(body.nsfw).toBe(false);
    expect(body.models).toEqual(['stable_diffusion']);
    expect(body.params.width).toBe(512);
    expect(body.params.height).toBe(512);
  });
});

describe('aiHordeProvider.checkStatus', () => {
  it('reports an in-progress job with queue position and wait time', async () => {
    fetch.mockResolvedValueOnce(
      jsonResponse({ done: false, faulted: false, wait_time: 45, queue_position: 3, is_possible: true })
    );

    const status = await aiHordeProvider.checkStatus({ apiKey: 'k', providerJobId: 'horde-job-1' });
    expect(status).toEqual({
      done: false,
      faulted: false,
      waitTimeSeconds: 45,
      queuePosition: 3,
    });
  });

  it('reports a faulted job', async () => {
    fetch.mockResolvedValueOnce(jsonResponse({ done: true, faulted: true, wait_time: 0, queue_position: 0 }));

    const status = await aiHordeProvider.checkStatus({ apiKey: 'k', providerJobId: 'horde-job-1' });
    expect(status.done).toBe(true);
    expect(status.faulted).toBe(true);
  });
});

describe('aiHordeProvider.fetchResult', () => {
  it('returns image URLs from the finished generation', async () => {
    fetch.mockResolvedValueOnce(
      jsonResponse({
        done: true,
        faulted: false,
        generations: [{ img: 'https://r2.example/image1.webp', seed: '1234' }],
      })
    );

    const result = await aiHordeProvider.fetchResult({ apiKey: 'k', providerJobId: 'horde-job-1' });
    expect(result.images).toEqual([{ url: 'https://r2.example/image1.webp', seed: '1234' }]);
  });
});

describe('aiHordeProvider.submitAlchemy', () => {
  it('posts to /interrogate/async with the source image and requested upscaler form', async () => {
    fetch.mockResolvedValueOnce(jsonResponse({ id: 'interrogate-job-1' }));

    const result = await aiHordeProvider.submitAlchemy({
      apiKey: 'test-key',
      sourceImageUrl: 'https://r2.example/original.webp',
      upscaler: 'RealESRGAN_x4plus',
    });

    expect(result).toEqual({ providerJobId: 'interrogate-job-1' });

    const [url, options] = fetch.mock.calls[0];
    expect(url).toContain('/interrogate/async');
    expect(options.method).toBe('POST');
    expect(options.headers.apikey).toBe('test-key');
    const body = JSON.parse(options.body);
    expect(body.source_image).toBe('https://r2.example/original.webp');
    expect(body.forms).toEqual([{ name: 'RealESRGAN_x4plus' }]);
  });

  it('throws a descriptive error when AI Horde rejects the request', async () => {
    fetch.mockResolvedValueOnce(jsonResponse({ message: 'Invalid API Key' }, false, 401));

    await expect(
      aiHordeProvider.submitAlchemy({ apiKey: 'bad-key', sourceImageUrl: 'https://x/y.webp', upscaler: 'RealESRGAN_x4plus' })
    ).rejects.toThrow(/Invalid API Key/);
  });
});

describe('aiHordeProvider.checkAlchemy', () => {
  it('reports not-done while the interrogation is still processing', async () => {
    fetch.mockResolvedValueOnce(jsonResponse({ state: 'processing', forms: [{ form: 'RealESRGAN_x4plus', state: 'processing' }] }));

    const status = await aiHordeProvider.checkAlchemy({ apiKey: 'k', providerJobId: 'interrogate-job-1' });
    expect(status).toEqual({ done: false, faulted: false, url: undefined });
  });

  it('extracts the upscaled image url once done, regardless of the exact result key', async () => {
    fetch.mockResolvedValueOnce(
      jsonResponse({
        state: 'done',
        forms: [
          {
            form: 'RealESRGAN_x4plus',
            state: 'done',
            result: { RealESRGAN_x4plus: 'https://r2.example/upscaled.webp' },
          },
        ],
      })
    );

    const status = await aiHordeProvider.checkAlchemy({ apiKey: 'k', providerJobId: 'interrogate-job-1' });
    expect(status).toEqual({ done: true, faulted: false, url: 'https://r2.example/upscaled.webp' });
  });

  it('reports a faulted interrogation as done (finished, unsuccessfully) — same convention as checkStatus', async () => {
    fetch.mockResolvedValueOnce(jsonResponse({ state: 'faulted', forms: [] }));

    const status = await aiHordeProvider.checkAlchemy({ apiKey: 'k', providerJobId: 'interrogate-job-1' });
    expect(status.done).toBe(true);
    expect(status.faulted).toBe(true);
  });
});

describe('aiHordeProvider.listModels', () => {
  it('returns image models sorted by worker count descending', async () => {
    fetch.mockResolvedValueOnce(
      jsonResponse([
        { name: 'AlbedoBase XL', count: 2, type: 'image' },
        { name: 'stable_diffusion', count: 40, type: 'image' },
        { name: 'some-text-model', count: 99, type: 'text' },
      ])
    );

    const models = await aiHordeProvider.listModels({ apiKey: 'k' });
    expect(models).toEqual([
      { name: 'stable_diffusion', count: 40 },
      { name: 'AlbedoBase XL', count: 2 },
    ]);
  });
});
