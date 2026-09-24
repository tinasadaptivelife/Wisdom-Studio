import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import {
  createProject,
  setText,
  generateImage,
  exportPdf,
  createQuoteCard,
  deriveImagePromptFromQuote,
  listBorderTemplates,
  addBorderFrame,
} from './tools.js';

const fakeProject = (overrides = {}) => ({
  id: 'proj_abc',
  name: 'Quote card',
  pageSize: 'letter',
  templateKey: 'quote-card',
  pages: [
    {
      id: 'page_1',
      elements: [
        { id: 'el1', type: 'image-placeholder', name: 'Complementary image', x: 56, y: 56, width: 704, height: 528, visible: true },
        { id: 'el2', type: 'text', name: 'Quote', text: 'placeholder', x: 56, y: 616, width: 704, height: 232, visible: true },
        { id: 'el3', type: 'text', name: 'Attribution', text: 'placeholder', x: 56, y: 860, width: 704, height: 40, visible: true },
      ],
    },
  ],
  ...overrides,
});

let client;

// A finished generation's URL is downloaded and inlined as a data URI so the
// saved project doesn't depend on the short-lived AI Horde link. Stub that
// download by default; individual tests can override.
const stubImageDownload = (bytes = Buffer.from('fake-webp-bytes'), contentType = 'image/webp') =>
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({
      ok: true,
      arrayBuffer: async () => bytes,
      headers: { get: () => contentType },
    }))
  );

beforeEach(() => {
  vi.useFakeTimers();
  stubImageDownload();
  client = {
    baseUrl: 'http://localhost:4000',
    createProject: vi.fn(async (p) => p),
    getProject: vi.fn(async () => fakeProject()),
    updateProject: vi.fn(async (id, p) => p),
    submitImageJob: vi.fn(),
    getImageJobStatus: vi.fn(),
    getProjectPdfBytes: vi.fn(async () => Buffer.from('%PDF-fake')),
    listBorders: vi.fn(),
    getBorder: vi.fn(),
  };
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('createProject', () => {
  it('builds a project from the requested template and persists it', async () => {
    const project = await createProject(client, { templateKey: 'quote-card', name: 'My Card' });
    expect(client.createProject).toHaveBeenCalledTimes(1);
    const payload = client.createProject.mock.calls[0][0];
    expect(payload.name).toBe('My Card');
    expect(payload.pages[0].elements.map((e) => e.name)).toEqual([
      'Brand background',
      'Complementary image',
      'Quote',
      'Attribution',
    ]);
    expect(project).toBe(payload);
  });
});

describe('setText', () => {
  it('updates the named element and saves the project', async () => {
    await setText(client, { projectId: 'proj_abc', elementName: 'Quote', text: 'Be yourself.' });
    expect(client.updateProject).toHaveBeenCalledTimes(1);
    const [id, saved] = client.updateProject.mock.calls[0];
    expect(id).toBe('proj_abc');
    expect(saved.pages[0].elements.find((e) => e.name === 'Quote').text).toBe('Be yourself.');
  });

  it('throws a clear, actionable error when the element name does not exist', async () => {
    await expect(setText(client, { projectId: 'proj_abc', elementName: 'Nope', text: 'x' })).rejects.toThrow(
      /No element named "Nope".*Quote/s
    );
  });
});

describe('generateImage', () => {
  it('submits a job, polls until done, and embeds the finished image as a self-contained data URI', async () => {
    client.submitImageJob.mockResolvedValueOnce({ jobId: 'job1', model: 'stable_diffusion' });
    client.getImageJobStatus
      .mockResolvedValueOnce({ done: false, queuePosition: 2 })
      .mockResolvedValueOnce({ done: true, faulted: false, images: [{ url: 'https://x/img.webp' }] });

    const promise = generateImage(client, {
      projectId: 'proj_abc',
      elementName: 'Complementary image',
      prompt: 'a fox in a garden',
    });
    await vi.runAllTimersAsync();
    await promise;

    const [, saved] = client.updateProject.mock.calls[0];
    const el = saved.pages[0].elements.find((e) => e.name === 'Complementary image');
    expect(el.type).toBe('image');
    expect(el.src).toMatch(/^data:image\/webp;base64,/);
    expect(fetch).toHaveBeenCalledWith('https://x/img.webp');
  });

  it('falls back to the remote URL if the finished image cannot be downloaded', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 502 })));
    client.submitImageJob.mockResolvedValueOnce({ jobId: 'job1', model: 'stable_diffusion' });
    client.getImageJobStatus.mockResolvedValueOnce({
      done: true,
      faulted: false,
      images: [{ url: 'https://x/img.webp' }],
    });

    const promise = generateImage(client, {
      projectId: 'proj_abc',
      elementName: 'Complementary image',
      prompt: 'a fox in a garden',
    });
    await vi.runAllTimersAsync();
    await promise;

    const [, saved] = client.updateProject.mock.calls[0];
    const el = saved.pages[0].elements.find((e) => e.name === 'Complementary image');
    expect(el.src).toBe('https://x/img.webp');
  });

  it('passes a reference image through and converts referenceStrength to a denoising strength', async () => {
    client.submitImageJob.mockResolvedValueOnce({ jobId: 'job1', model: 'stable_diffusion' });
    client.getImageJobStatus.mockResolvedValueOnce({
      done: true,
      faulted: false,
      images: [{ url: 'https://x/img.webp' }],
    });

    const promise = generateImage(client, {
      projectId: 'proj_abc',
      elementName: 'Complementary image',
      prompt: 'a fox in a garden',
      referenceImage: 'https://ref.example/pose.png',
      referenceStrength: 0.8,
    });
    await vi.runAllTimersAsync();
    await promise;

    const submitted = client.submitImageJob.mock.calls[0][0];
    expect(submitted.referenceImage).toBe('https://ref.example/pose.png');
    // 1 - 0.8 = 0.2 (stay fairly close to the reference)
    expect(submitted.denoisingStrength).toBeCloseTo(0.2);
  });

  it('requests an inline upscale pass when printQuality is true, matching the old combined behavior', async () => {
    client.submitImageJob.mockResolvedValueOnce({ jobId: 'job1', model: 'stable_diffusion' });
    client.getImageJobStatus.mockResolvedValueOnce({ done: true, faulted: false, images: [{ url: 'https://x/img.webp' }] });

    const promise = generateImage(client, {
      projectId: 'proj_abc',
      elementName: 'Complementary image',
      prompt: 'a fox in a garden',
      printQuality: true,
    });
    await vi.runAllTimersAsync();
    await promise;

    const submitted = client.submitImageJob.mock.calls[0][0];
    expect(submitted.printQuality).toBe(true);
    expect(submitted.postProcessingMode).toBe('inline');
    expect(submitted.upscaler).toBe('RealESRGAN_x2plus');
  });

  it('does not request an upscale pass when printQuality is false', async () => {
    client.submitImageJob.mockResolvedValueOnce({ jobId: 'job1', model: 'stable_diffusion' });
    client.getImageJobStatus.mockResolvedValueOnce({ done: true, faulted: false, images: [{ url: 'https://x/img.webp' }] });

    const promise = generateImage(client, {
      projectId: 'proj_abc',
      elementName: 'Complementary image',
      prompt: 'a fox in a garden',
    });
    await vi.runAllTimersAsync();
    await promise;

    const submitted = client.submitImageJob.mock.calls[0][0];
    expect(submitted.postProcessingMode).toBeUndefined();
    expect(submitted.upscaler).toBeUndefined();
  });

  it('raises a clear error when the AI Horde job faults', async () => {
    client.submitImageJob.mockResolvedValueOnce({ jobId: 'job1', model: 'stable_diffusion' });
    client.getImageJobStatus.mockResolvedValueOnce({ done: true, faulted: true, message: 'worker crashed' });

    const promise = generateImage(client, {
      projectId: 'proj_abc',
      elementName: 'Complementary image',
      prompt: 'x',
    });
    const assertion = expect(promise).rejects.toThrow(/worker crashed/);
    await vi.runAllTimersAsync();
    await assertion;
  });

  it('times out rather than polling forever', async () => {
    client.submitImageJob.mockResolvedValueOnce({ jobId: 'job1', model: 'stable_diffusion' });
    client.getImageJobStatus.mockResolvedValue({ done: false, queuePosition: 500 });

    const promise = generateImage(client, {
      projectId: 'proj_abc',
      elementName: 'Complementary image',
      prompt: 'x',
      timeoutMs: 5000,
    });
    const assertion = expect(promise).rejects.toThrow(/timed out/i);
    await vi.runAllTimersAsync();
    await assertion;
  });
});

describe('exportPdf', () => {
  it('writes the PDF bytes to a file and reports where', async () => {
    const writeFile = vi.fn(async () => {});
    const result = await exportPdf(client, { projectId: 'proj_abc', outputPath: '/tmp/out.pdf', writeFile });
    expect(writeFile).toHaveBeenCalledWith('/tmp/out.pdf', expect.any(Buffer));
    expect(result.path).toBe('/tmp/out.pdf');
    expect(result.pageCount).toBe(1);
  });
});

describe('deriveImagePromptFromQuote', () => {
  it('produces a non-empty prompt referencing the quote', () => {
    const prompt = deriveImagePromptFromQuote('The only way out is through.');
    expect(prompt.length).toBeGreaterThan(10);
    expect(prompt).toContain('The only way out is through.');
  });
});

describe('listBorderTemplates', () => {
  it('passes tag/brand filters through to the client and returns its result', async () => {
    client.listBorders.mockResolvedValueOnce({ borders: [{ id: 'sample-gothic' }] });
    const result = await listBorderTemplates(client, { tag: 'cute' });
    expect(client.listBorders).toHaveBeenCalledWith({ tag: 'cute', brand: undefined });
    expect(result).toEqual({ borders: [{ id: 'sample-gothic' }] });
  });
});

describe('addBorderFrame', () => {
  it('inserts the border scaled to fit the page without distorting its aspect ratio, centered and locked', async () => {
    client.getBorder.mockResolvedValueOnce({
      id: 'sample-cozy',
      name: 'Sample Cozy',
      url: '/api/borders/assets/sample-cozy.jpg',
      width: 672,
      height: 480,
    });

    await addBorderFrame(client, { projectId: 'proj_abc', borderId: 'sample-cozy' });

    expect(client.getBorder).toHaveBeenCalledWith('sample-cozy');
    const [, saved] = client.updateProject.mock.calls[0];
    const [first, ...rest] = saved.pages[0].elements;
    // Letter page is 816x1056 (portrait); the border is 672x480 (landscape,
    // 7:5) — fit to the page's width and center vertically rather than
    // stretching to the full 816x1056, which would visibly distort the art.
    expect(first).toMatchObject({
      type: 'image',
      name: 'Border frame',
      x: 0,
      y: 237,
      width: 816,
      height: 583,
      src: 'http://localhost:4000/api/borders/assets/sample-cozy.jpg',
      locked: true,
    });
    expect(rest.map((e) => e.name)).toEqual(['Complementary image', 'Quote', 'Attribution']);
  });

  it('throws a clear error when the border id does not exist', async () => {
    client.getBorder.mockResolvedValueOnce(null);
    await expect(addBorderFrame(client, { projectId: 'proj_abc', borderId: 'nope' })).rejects.toThrow(
      /No border found.*nope/s
    );
    expect(client.updateProject).not.toHaveBeenCalled();
  });
});

describe('createQuoteCard (composite tool)', () => {
  it('creates the project, sets quote and attribution, generates the image, and exports a PDF in one call', async () => {
    client.submitImageJob.mockResolvedValueOnce({ jobId: 'job1', model: 'stable_diffusion' });
    client.getImageJobStatus.mockResolvedValueOnce({ done: true, faulted: false, images: [{ url: 'https://x/img.webp' }] });
    const writeFile = vi.fn(async () => {});

    const promise = createQuoteCard(client, {
      quote: 'Be yourself; everyone else is taken.',
      author: 'Oscar Wilde',
      outputPath: '/tmp/quote.pdf',
      writeFile,
    });
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(client.createProject).toHaveBeenCalledTimes(1);
    // Two saves: one for quote+attribution text, one for the generated image.
    expect(client.updateProject.mock.calls.length).toBeGreaterThanOrEqual(2);
    expect(writeFile).toHaveBeenCalledWith('/tmp/quote.pdf', expect.any(Buffer));
    expect(result.path).toBe('/tmp/quote.pdf');
    expect(result.projectId).toBeTruthy();
  });

  it('rejects an empty quote before doing any work', async () => {
    await expect(createQuoteCard(client, { quote: '   ' })).rejects.toThrow(/quote/i);
    expect(client.createProject).not.toHaveBeenCalled();
  });
});
