import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import ImageGenerationPanel from './ImageGenerationPanel.jsx';
import { useDesignStore } from '../../store/useDesignStore.js';

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({ ok: true, json: async () => ({ models: [], default: 'stable_diffusion' }) })
  );
  useDesignStore.getState().closeProject();
  useDesignStore.getState().newProjectFromTemplate('blank');
  useDesignStore.getState().addElement('image-placeholder');
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const currentElement = () => useDesignStore.getState().project.pages[0].elements[0];

describe('ImageGenerationPanel upscale controls', () => {
  it('defaults to no upscaling, with no upscaler picker or Alchemy button shown', () => {
    render(<ImageGenerationPanel element={currentElement()} />);
    expect(screen.getByLabelText(/upscale/i).value).toBe('none');
    expect(screen.queryByLabelText(/upscaler/i)).toBeNull();
    expect(screen.queryByRole('button', { name: /upscale via alchemy/i })).toBeNull();
  });

  it('reveals the upscaler picker once Inline or Alchemy mode is chosen', () => {
    render(<ImageGenerationPanel element={currentElement()} />);
    fireEvent.change(screen.getByLabelText(/upscale/i), { target: { value: 'inline' } });
    expect(screen.getByLabelText(/upscaler/i)).toBeTruthy();
  });

  it('submits postProcessingMode, upscaler, and the derived printQuality boost on Generate', async () => {
    render(<ImageGenerationPanel element={currentElement()} />);

    fireEvent.change(screen.getByLabelText(/prompt/i), { target: { value: 'a fox' } });
    fireEvent.change(screen.getByLabelText(/upscale/i), { target: { value: 'inline' } });
    fireEvent.change(screen.getByLabelText(/upscaler/i), { target: { value: 'RealESRGAN_x4plus' } });
    fireEvent.click(screen.getByRole('button', { name: /generate image/i }));

    const jobsCall = fetch.mock.calls.find(([url]) => url.includes('/jobs') && !url.includes('estimate'));
    expect(jobsCall).toBeTruthy();
    const body = JSON.parse(jobsCall[1].body);
    expect(body.postProcessingMode).toBe('inline');
    expect(body.upscaler).toBe('RealESRGAN_x4plus');
    expect(body.printQuality).toBe(true);
  });

  it('omits printQuality when upscale mode is none', async () => {
    render(<ImageGenerationPanel element={currentElement()} />);

    fireEvent.change(screen.getByLabelText(/prompt/i), { target: { value: 'a fox' } });
    fireEvent.click(screen.getByRole('button', { name: /generate image/i }));

    const jobsCall = fetch.mock.calls.find(([url]) => url.includes('/jobs') && !url.includes('estimate'));
    const body = JSON.parse(jobsCall[1].body);
    expect(body.postProcessingMode).toBe('none');
    expect(body.printQuality).toBe(false);
  });

  it('shows an "Upscale via Alchemy" button only for an already-generated image with Alchemy mode selected', () => {
    const imageElement = { ...currentElement(), type: 'image', src: 'https://r2.example/original.webp' };
    render(<ImageGenerationPanel element={imageElement} />);

    expect(screen.queryByRole('button', { name: /upscale via alchemy/i })).toBeNull();

    fireEvent.change(screen.getByLabelText(/upscale/i), { target: { value: 'alchemy' } });
    expect(screen.getByRole('button', { name: /upscale via alchemy/i })).toBeTruthy();
  });

  it('submits the source image and upscaler when Upscale via Alchemy is clicked', async () => {
    const imageElement = { ...currentElement(), type: 'image', src: 'https://r2.example/original.webp' };
    render(<ImageGenerationPanel element={imageElement} />);

    fireEvent.change(screen.getByLabelText(/upscale/i), { target: { value: 'alchemy' } });
    fireEvent.click(screen.getByRole('button', { name: /upscale via alchemy/i }));

    const alchemyCall = fetch.mock.calls.find(([url]) => url.includes('/alchemy'));
    expect(alchemyCall).toBeTruthy();
    const body = JSON.parse(alchemyCall[1].body);
    expect(body.sourceImageUrl).toBe('https://r2.example/original.webp');
    expect(body.upscaler).toBeTruthy();
  });

  it('shows a side-by-side preview with a swap button once the Alchemy result is ready, and swaps it in on click', () => {
    const imageElement = { ...currentElement(), type: 'image', src: 'https://r2.example/original.webp' };
    useDesignStore.setState((state) => ({
      alchemyUpscale: {
        ...state.alchemyUpscale,
        [imageElement.id]: { status: 'done', url: 'https://r2.example/upscaled.webp' },
      },
    }));

    render(<ImageGenerationPanel element={imageElement} />);
    expect(screen.getByRole('img', { name: /alchemy upscale preview/i }).src).toBe('https://r2.example/upscaled.webp');

    fireEvent.click(screen.getByRole('button', { name: /use this version/i }));

    const updated = useDesignStore.getState().project.pages[0].elements.find((el) => el.id === imageElement.id);
    expect(updated.src).toBe('https://r2.example/upscaled.webp');
    expect(useDesignStore.getState().alchemyUpscale[imageElement.id]).toBeUndefined();
  });
});
