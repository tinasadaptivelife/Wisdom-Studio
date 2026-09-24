import { describe, it, expect } from 'vitest';
import { buildPrompt, dimensionsForAspectRatio, DEFAULT_MODEL, STYLE_MODES } from './promptTemplates.js';

describe('buildPrompt', () => {
  it('passes general-mode prompts through with only generic negative terms', () => {
    const { prompt, negativePrompt } = buildPrompt({ mode: 'general', userPrompt: 'a red barn' });
    expect(prompt).toBe('a red barn');
    expect(negativePrompt).toMatch(/blurry/);
  });

  it('appends storybook illustration styling', () => {
    const { prompt } = buildPrompt({ mode: 'storybook', userPrompt: 'a fox in the forest' });
    expect(prompt).toContain('a fox in the forest');
    expect(prompt).toContain('storybook illustration');
  });

  it('appends flyer graphic styling', () => {
    const { prompt } = buildPrompt({ mode: 'flyer', userPrompt: 'community garden' });
    expect(prompt).toContain('community garden');
    expect(prompt.toLowerCase()).toContain('flyer');
  });

  it('appends coloring-page line-art styling and excludes color in the negative prompt', () => {
    const { prompt, negativePrompt } = buildPrompt({ mode: 'coloring-page', userPrompt: 'a friendly otter' });
    expect(prompt).toContain('a friendly otter');
    expect(prompt).toContain('line art');
    expect(prompt).toContain('no color');
    expect(negativePrompt).toMatch(/color/);
  });

  it('falls back to general mode for an unknown mode', () => {
    const { prompt } = buildPrompt({ mode: 'not-a-real-mode', userPrompt: 'a red barn' });
    expect(prompt).toBe('a red barn');
  });

  it('rejects an empty user prompt', () => {
    expect(() => buildPrompt({ mode: 'general', userPrompt: '  ' })).toThrow(/prompt/i);
  });

  it('exposes the list of style modes for the frontend to render as a picker', () => {
    expect(STYLE_MODES.map((m) => m.key)).toEqual(
      expect.arrayContaining(['general', 'storybook', 'flyer', 'coloring-page'])
    );
  });
});

describe('dimensionsForAspectRatio', () => {
  it('returns a 64-aligned square for a 1:1 element', () => {
    const { width, height } = dimensionsForAspectRatio(300, 300);
    expect(width % 64).toBe(0);
    expect(height % 64).toBe(0);
    expect(width).toBe(height);
  });

  it('keeps the wider dimension larger for a landscape element', () => {
    const { width, height } = dimensionsForAspectRatio(720, 320);
    expect(width).toBeGreaterThan(height);
    expect(width % 64).toBe(0);
    expect(height % 64).toBe(0);
  });

  it('clamps standard-quality dimensions within a reasonable generation range', () => {
    const tiny = dimensionsForAspectRatio(20, 20);
    expect(tiny.width).toBeGreaterThanOrEqual(384);
    const huge = dimensionsForAspectRatio(4000, 4000);
    // Standard tier stays under AI Horde's 665x665 upfront-kudos threshold
    // so it works even on keys with no kudos balance.
    expect(huge.width).toBeLessThanOrEqual(640);
  });

  it('print quality raises the cap to 1024 while staying 64-aligned', () => {
    const { width, height } = dimensionsForAspectRatio(4000, 4000, { print: true });
    expect(width).toBe(1024);
    expect(height).toBe(1024);

    const landscape = dimensionsForAspectRatio(720, 320, { print: true });
    expect(landscape.width).toBe(1024);
    expect(landscape.width % 64).toBe(0);
    expect(landscape.height % 64).toBe(0);
    expect(landscape.height).toBeLessThan(landscape.width);
  });
});

describe('DEFAULT_MODEL', () => {
  it('is a non-empty sensible default', () => {
    expect(typeof DEFAULT_MODEL).toBe('string');
    expect(DEFAULT_MODEL.length).toBeGreaterThan(0);
  });
});
