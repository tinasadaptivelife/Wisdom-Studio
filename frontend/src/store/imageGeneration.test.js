import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';

vi.mock('../api/imageGenApi.js', () => ({
  imageGenApi: {
    submitJob: vi.fn(),
    estimateCost: vi.fn(),
    getJobStatus: vi.fn(),
    listModels: vi.fn(),
    submitAlchemy: vi.fn(),
    getAlchemyStatus: vi.fn(),
  },
}));

const { imageGenApi } = await import('../api/imageGenApi.js');
const { useDesignStore, IMAGE_GEN_POLL_INTERVAL_MS } = await import('./useDesignStore.js');

const getState = () => useDesignStore.getState();

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  getState().closeProject();
  getState().newProjectFromTemplate('blank');
  getState().addElement('image-placeholder');
});

afterEach(() => {
  vi.useRealTimers();
});

const currentElement = () => getState().project.pages[0].elements[0];

describe('generateImageForElement', () => {
  it('submits, polls through queued/processing, and applies the finished image', async () => {
    imageGenApi.submitJob.mockResolvedValueOnce({ jobId: 'job-1', model: 'stable_diffusion' });
    imageGenApi.getJobStatus
      .mockResolvedValueOnce({ done: false, faulted: false, waitTimeSeconds: 20, queuePosition: 3 })
      .mockResolvedValueOnce({ done: false, faulted: false, waitTimeSeconds: 5, queuePosition: 0 })
      .mockResolvedValueOnce({ done: true, faulted: false, images: [{ url: 'https://r2.example/img.webp' }] });

    const id = currentElement().id;
    const promise = getState().generateImageForElement(id, { prompt: 'a fox', mode: 'storybook' });

    // First status check happens after the poll interval.
    await vi.advanceTimersByTimeAsync(0);
    expect(getState().imageGeneration[id].status).toBe('submitting');

    await vi.advanceTimersByTimeAsync(IMAGE_GEN_POLL_INTERVAL_MS);
    expect(getState().imageGeneration[id].status).toBe('polling');
    expect(getState().imageGeneration[id].queuePosition).toBe(3);

    await vi.advanceTimersByTimeAsync(IMAGE_GEN_POLL_INTERVAL_MS);
    expect(getState().imageGeneration[id].queuePosition).toBe(0);

    await vi.advanceTimersByTimeAsync(IMAGE_GEN_POLL_INTERVAL_MS);
    await promise;
    await vi.advanceTimersByTimeAsync(100);

    expect(getState().imageGeneration[id]).toBeUndefined();
    const el = currentElement();
    expect(el.type).toBe('image');
    expect(el.src).toBe('https://r2.example/img.webp');
    expect(el.prompt).toBe('a fox');
    expect(getState().announce).toMatch(/image added to page 1/i);
  });

  it('sets an error status when the job faults, without changing the element type', async () => {
    imageGenApi.submitJob.mockResolvedValueOnce({ jobId: 'job-2', model: 'stable_diffusion' });
    imageGenApi.getJobStatus.mockResolvedValueOnce({ done: true, faulted: true, message: 'Generation failed.' });

    const id = currentElement().id;
    const promise = getState().generateImageForElement(id, { prompt: 'a fox', mode: 'general' });
    await vi.advanceTimersByTimeAsync(IMAGE_GEN_POLL_INTERVAL_MS);
    await promise;

    expect(getState().imageGeneration[id].status).toBe('error');
    expect(getState().imageGeneration[id].message).toMatch(/failed/i);
    expect(currentElement().type).toBe('image-placeholder');
  });

  it('forwards the print-quality choice to the backend', async () => {
    imageGenApi.submitJob.mockResolvedValueOnce({ jobId: 'job-pq', model: 'stable_diffusion' });
    imageGenApi.getJobStatus.mockResolvedValueOnce({ done: true, faulted: false, images: [{ url: 'https://x/i.webp' }] });

    const id = currentElement().id;
    const promise = getState().generateImageForElement(id, { prompt: 'a fox', mode: 'general', printQuality: true });
    await vi.advanceTimersByTimeAsync(IMAGE_GEN_POLL_INTERVAL_MS);
    await promise;

    expect(imageGenApi.submitJob.mock.calls[0][0].printQuality).toBe(true);
  });

  it('forwards the upscale mode and upscaler choice to the backend', async () => {
    imageGenApi.submitJob.mockResolvedValueOnce({ jobId: 'job-inline', model: 'stable_diffusion' });
    imageGenApi.getJobStatus.mockResolvedValueOnce({ done: true, faulted: false, images: [{ url: 'https://x/i.webp' }] });

    const id = currentElement().id;
    const promise = getState().generateImageForElement(id, {
      prompt: 'a fox',
      mode: 'general',
      postProcessingMode: 'inline',
      upscaler: 'RealESRGAN_x4plus',
    });
    await vi.advanceTimersByTimeAsync(IMAGE_GEN_POLL_INTERVAL_MS);
    await promise;

    const submitted = imageGenApi.submitJob.mock.calls[0][0];
    expect(submitted.postProcessingMode).toBe('inline');
    expect(submitted.upscaler).toBe('RealESRGAN_x4plus');
  });

  it('sets an error status when submitting the job itself fails', async () => {
    imageGenApi.submitJob.mockRejectedValueOnce(new Error('AI_HORDE_API_KEY is not configured.'));

    const id = currentElement().id;
    await getState().generateImageForElement(id, { prompt: 'a fox', mode: 'general' });

    expect(getState().imageGeneration[id].status).toBe('error');
    expect(getState().imageGeneration[id].message).toMatch(/AI_HORDE_API_KEY/);
  });

  it('stops polling and clears status once the element is deleted mid-generation', async () => {
    imageGenApi.submitJob.mockResolvedValueOnce({ jobId: 'job-3', model: 'stable_diffusion' });
    imageGenApi.getJobStatus.mockResolvedValue({ done: false, faulted: false, waitTimeSeconds: 20, queuePosition: 3 });

    const id = currentElement().id;
    getState().generateImageForElement(id, { prompt: 'a fox', mode: 'general' });
    await vi.advanceTimersByTimeAsync(0);

    getState().deleteElement(id);
    expect(getState().imageGeneration[id]).toBeUndefined();

    const callsBefore = imageGenApi.getJobStatus.mock.calls.length;
    await vi.advanceTimersByTimeAsync(IMAGE_GEN_POLL_INTERVAL_MS * 3);
    expect(imageGenApi.getJobStatus.mock.calls.length).toBe(callsBefore);
  });
});

describe('estimateImageCost', () => {
  it('fetches a dry-run kudos estimate without submitting a job', async () => {
    imageGenApi.estimateCost.mockResolvedValueOnce({ kudos: 12.5 });

    const id = currentElement().id;
    await getState().estimateImageCost(id, { prompt: 'a fox', mode: 'storybook' });

    expect(getState().imageCostEstimate[id]).toEqual({ status: 'ready', kudos: 12.5 });
    expect(imageGenApi.submitJob).not.toHaveBeenCalled();
  });

  it('sets a loading status while the estimate is in flight', async () => {
    let resolveEstimate;
    imageGenApi.estimateCost.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveEstimate = resolve;
      })
    );

    const id = currentElement().id;
    const promise = getState().estimateImageCost(id, { prompt: 'a fox', mode: 'general' });
    expect(getState().imageCostEstimate[id].status).toBe('loading');

    resolveEstimate({ kudos: 5 });
    await promise;
    expect(getState().imageCostEstimate[id].status).toBe('ready');
  });

  it('sets an error status when the estimate request fails', async () => {
    imageGenApi.estimateCost.mockRejectedValueOnce(new Error('AI_HORDE_API_KEY is not configured.'));

    const id = currentElement().id;
    await getState().estimateImageCost(id, { prompt: 'a fox', mode: 'general' });

    expect(getState().imageCostEstimate[id].status).toBe('error');
    expect(getState().imageCostEstimate[id].message).toMatch(/AI_HORDE_API_KEY/);
  });

  it('clears the cost estimate once the element is deleted', async () => {
    imageGenApi.estimateCost.mockResolvedValueOnce({ kudos: 12.5 });

    const id = currentElement().id;
    await getState().estimateImageCost(id, { prompt: 'a fox', mode: 'general' });
    expect(getState().imageCostEstimate[id]).toBeDefined();

    getState().deleteElement(id);
    expect(getState().imageCostEstimate[id]).toBeUndefined();
  });
});

describe('upscaleImageViaAlchemy', () => {
  const givenAGeneratedImage = () => {
    const id = currentElement().id;
    getState().updateElement(id, { type: 'image', src: 'https://r2.example/original.webp' }, { pushHistory: false });
    return id;
  };

  it('submits the element’s current src and polls through to a finished upscaled url', async () => {
    const id = givenAGeneratedImage();
    imageGenApi.submitAlchemy.mockResolvedValueOnce({ jobId: 'interrogate-1' });
    imageGenApi.getAlchemyStatus
      .mockResolvedValueOnce({ done: false, faulted: false })
      .mockResolvedValueOnce({ done: true, faulted: false, url: 'https://r2.example/upscaled.webp' });

    const promise = getState().upscaleImageViaAlchemy(id, { upscaler: 'RealESRGAN_x4plus' });
    await vi.advanceTimersByTimeAsync(0);
    expect(getState().alchemyUpscale[id].status).toBe('submitting');

    await vi.advanceTimersByTimeAsync(IMAGE_GEN_POLL_INTERVAL_MS);
    expect(getState().alchemyUpscale[id].status).toBe('polling');

    await vi.advanceTimersByTimeAsync(IMAGE_GEN_POLL_INTERVAL_MS);
    await promise;

    expect(getState().alchemyUpscale[id]).toEqual({ status: 'done', url: 'https://r2.example/upscaled.webp' });
    expect(imageGenApi.submitAlchemy).toHaveBeenCalledWith({
      sourceImageUrl: 'https://r2.example/original.webp',
      upscaler: 'RealESRGAN_x4plus',
    });
    // The original stays on the canvas — this only stores the result for comparison.
    expect(currentElement().src).toBe('https://r2.example/original.webp');
  });

  it('sets an error status when the alchemy job faults', async () => {
    const id = givenAGeneratedImage();
    imageGenApi.submitAlchemy.mockResolvedValueOnce({ jobId: 'interrogate-2' });
    imageGenApi.getAlchemyStatus.mockResolvedValueOnce({ done: true, faulted: true, message: 'Alchemy failed.' });

    const promise = getState().upscaleImageViaAlchemy(id, { upscaler: 'RealESRGAN_x4plus' });
    await vi.advanceTimersByTimeAsync(IMAGE_GEN_POLL_INTERVAL_MS);
    await promise;

    expect(getState().alchemyUpscale[id].status).toBe('error');
    expect(getState().alchemyUpscale[id].message).toMatch(/failed/i);
  });

  it('sets an error status when submitting itself fails', async () => {
    const id = givenAGeneratedImage();
    imageGenApi.submitAlchemy.mockRejectedValueOnce(new Error('AI_HORDE_API_KEY is not configured.'));

    await getState().upscaleImageViaAlchemy(id, { upscaler: 'RealESRGAN_x4plus' });

    expect(getState().alchemyUpscale[id].status).toBe('error');
    expect(getState().alchemyUpscale[id].message).toMatch(/AI_HORDE_API_KEY/);
  });
});

describe('useAlchemyResult', () => {
  it('swaps the element’s src to the stored alchemy result and clears the pending state', () => {
    const id = currentElement().id;
    getState().updateElement(id, { type: 'image', src: 'https://r2.example/original.webp' }, { pushHistory: false });
    useDesignStore.setState((state) => ({
      alchemyUpscale: { ...state.alchemyUpscale, [id]: { status: 'done', url: 'https://r2.example/upscaled.webp' } },
    }));

    getState().useAlchemyResult(id);

    expect(currentElement().src).toBe('https://r2.example/upscaled.webp');
    expect(getState().alchemyUpscale[id]).toBeUndefined();
  });
});
