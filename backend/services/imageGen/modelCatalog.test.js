import { describe, it, expect } from 'vitest';
import { curateModels, isBlockedModelName } from './modelCatalog.js';

const live = (names) => names.map((name, i) => ({ name, count: 10 - i }));

describe('isBlockedModelName', () => {
  it('blocks NSFW and adult-content model names', () => {
    for (const name of [
      'WAI-NSFW-illustrious-SDXL',
      'Hentai Diffusion',
      'Grapefruit Hentai',
      'Babes',
      'URPM',
      'AbyssOrangeMix-AfterDark',
      'Yiffy',
      'BigASP',
    ]) {
      expect(isBlockedModelName(name), name).toBe(true);
    }
  });

  it('allows ordinary model names', () => {
    for (const name of ['stable_diffusion', 'Deliberate', 'AlbedoBase XL (SDXL)', 'Dreamshaper']) {
      expect(isBlockedModelName(name), name).toBe(false);
    }
  });
});

describe('curateModels', () => {
  it('returns only allowlisted models that are actually available, with plain-language labels', () => {
    const result = curateModels(
      live(['stable_diffusion', 'WAI-NSFW-illustrious-SDXL', 'Deliberate', 'SomeRandomModel', 'Dreamshaper'])
    );

    const names = result.map((m) => m.name);
    expect(names).toContain('stable_diffusion');
    expect(names).toContain('Deliberate');
    expect(names).not.toContain('WAI-NSFW-illustrious-SDXL');
    expect(names).not.toContain('SomeRandomModel');

    for (const m of result) {
      expect(typeof m.label).toBe('string');
      expect(m.label.length).toBeGreaterThan(0);
      // Plain language: labels never expose raw checkpoint jargon like "SDXL" or underscores.
      expect(m.label).not.toMatch(/_|SDXL|checkpoint/i);
      expect(typeof m.count).toBe('number');
    }
  });

  it('drops curated models that have no live workers', () => {
    const result = curateModels(live(['stable_diffusion']));
    expect(result.map((m) => m.name)).toEqual(['stable_diffusion']);
  });

  it('keeps curated ordering stable regardless of live worker counts', () => {
    const a = curateModels(live(['Deliberate', 'stable_diffusion']));
    const b = curateModels(live(['stable_diffusion', 'Deliberate']));
    expect(a.map((m) => m.name)).toEqual(b.map((m) => m.name));
  });
});
