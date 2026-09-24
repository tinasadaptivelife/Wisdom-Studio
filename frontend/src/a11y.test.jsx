import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { axe } from 'jest-axe';
import Home from './components/Home/Home.jsx';
import EditorLayout from './components/Editor/EditorLayout.jsx';
import { useDesignStore } from './store/useDesignStore.js';

// CanvasStage mounts a real Konva Stage, which needs canvas rendering jsdom
// doesn't provide — same stub used in EditorLayout.test.jsx.
vi.mock('./components/Editor/CanvasStage.jsx', () => ({ default: () => null }));

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({ ok: true, json: async () => ({ models: [], default: 'stable_diffusion' }) })
  );
  useDesignStore.getState().closeProject();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('WCAG 2.1 AA baseline (axe)', () => {
  it('Home has no detectable accessibility violations', async () => {
    const { container } = render(<Home />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('the storybook editor has no detectable accessibility violations', async () => {
    useDesignStore.getState().newProjectFromTemplate('storybook');
    const { container } = render(<EditorLayout />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
