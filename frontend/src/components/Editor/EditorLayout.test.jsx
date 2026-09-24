import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import EditorLayout from './EditorLayout.jsx';
import { useDesignStore } from '../../store/useDesignStore.js';

// CanvasStage mounts a real Konva Stage, which needs canvas rendering jsdom
// doesn't provide. The autosave-gating behavior under test doesn't depend on
// anything CanvasStage renders, so it's stubbed out here.
vi.mock('./CanvasStage.jsx', () => ({ default: () => null }));

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) })
  );
  useDesignStore.getState().closeProject();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('EditorLayout autosave', () => {
  it('does not persist a brand-new, untouched project', async () => {
    useDesignStore.getState().newProjectFromTemplate('blank');
    render(<EditorLayout />);

    await vi.advanceTimersByTimeAsync(2000);

    expect(fetch).not.toHaveBeenCalled();
  });

  it('persists a brand-new project once the user makes a real edit', async () => {
    useDesignStore.getState().newProjectFromTemplate('blank');
    render(<EditorLayout />);
    await vi.advanceTimersByTimeAsync(2000);
    expect(fetch).not.toHaveBeenCalled();

    useDesignStore.getState().addElement('text');
    await vi.advanceTimersByTimeAsync(2000);

    expect(fetch).toHaveBeenCalledWith('/api/projects', expect.objectContaining({ method: 'POST' }));
  });

  it('autosaves an already-loaded project via PUT, not POST', async () => {
    useDesignStore.getState().loadProject({
      id: 'proj_existing',
      name: 'Existing Flyer',
      templateKey: 'blank',
      pageSize: 'letter',
      pages: [{ id: 'page_1', elements: [] }],
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });
    render(<EditorLayout />);

    useDesignStore.getState().addElement('rect');
    await vi.advanceTimersByTimeAsync(2000);

    expect(fetch).toHaveBeenCalledWith('/api/projects/proj_existing', expect.objectContaining({ method: 'PUT' }));
    const postCalls = fetch.mock.calls.filter(([, opts]) => opts?.method === 'POST');
    expect(postCalls).toHaveLength(0);
  });

  it('automatically retries after a failed save, without waiting for another edit', async () => {
    useDesignStore.getState().newProjectFromTemplate('blank');
    render(<EditorLayout />);
    useDesignStore.getState().addElement('text');

    fetch.mockRejectedValueOnce(new Error('network down'));
    await vi.advanceTimersByTimeAsync(2000);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(useDesignStore.getState().saveStatus).toBe('error');

    fetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) });
    await vi.advanceTimersByTimeAsync(6000);

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(useDesignStore.getState().saveStatus).toBe('saved');
  });
});
