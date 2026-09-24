import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { useDesignStore } from './useDesignStore.js';

const getState = () => useDesignStore.getState();

beforeEach(() => {
  vi.useFakeTimers();
  getState().closeProject();
  getState().newProjectFromTemplate('blank');
});

afterEach(() => {
  vi.useRealTimers();
});

describe('canvas action announcements', () => {
  it('announces when a text box is added', async () => {
    getState().addElement('text');
    await vi.advanceTimersByTimeAsync(100);
    expect(getState().announce).toMatch(/text box added/i);
  });

  it('announces when a rectangle is added', async () => {
    getState().addElement('rect');
    await vi.advanceTimersByTimeAsync(100);
    expect(getState().announce).toMatch(/rectangle added/i);
  });

  it('announces when a page is added, naming the new page number', async () => {
    getState().addPage();
    await vi.advanceTimersByTimeAsync(100);
    expect(getState().announce).toMatch(/page 2 added/i);
  });

  it('announces when a page is deleted', async () => {
    getState().addPage();
    await vi.advanceTimersByTimeAsync(100);
    getState().deletePage(0);
    await vi.advanceTimersByTimeAsync(100);
    expect(getState().announce).toMatch(/page deleted/i);
  });

  it('announces the deleted element by name', async () => {
    getState().addElement('text');
    await vi.advanceTimersByTimeAsync(100);
    const id = getState().project.pages[0].elements[0].id;
    getState().deleteElement(id);
    await vi.advanceTimersByTimeAsync(100);
    expect(getState().announce).toMatch(/text deleted/i);
  });

  it('clears the announcement synchronously before setting the new one', () => {
    getState().addElement('text');
    expect(getState().announce).toBe('');
  });
});
