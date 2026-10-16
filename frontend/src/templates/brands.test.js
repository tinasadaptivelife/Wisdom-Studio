import { afterEach, describe, it, expect } from 'vitest';
import { DEFAULT_BRAND, getBrands, getBrand, setBrands } from './brands.js';
import { EXAMPLE_BRANDS } from '../test/exampleBrands.js';

const luminance = (hex) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const l = c.map((x) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
  return 0.2126 * l[0] + 0.7152 * l[1] + 0.0722 * l[2];
};
const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

afterEach(() => setBrands(null));

describe('the built-in brand (used when there is no brand pack)', () => {
  it('is the only brand until brands are set', () => {
    expect(getBrands()).toEqual([DEFAULT_BRAND]);
  });

  it('has 6 palettes with unique keys and template suffixes, and the original six suffixes', () => {
    expect(DEFAULT_BRAND.palettes).toHaveLength(6);
    expect(DEFAULT_BRAND.palettes.map((p) => p.suffix)).toEqual([
      '',
      '-cream-sage',
      '-terracotta-sage',
      '-sage-terracotta',
      '-terracotta-cream',
      '-sage-cream',
    ]);
    expect(new Set(DEFAULT_BRAND.palettes.map((p) => p.key)).size).toBe(6);
  });

  it('meets the accessibility floor: headline 4.5:1 and body 7:1 on the background', () => {
    for (const p of DEFAULT_BRAND.palettes) {
      expect(contrast(p.headline, p.background), `${p.key} headline`).toBeGreaterThanOrEqual(4.5);
      expect(contrast(p.body, p.background), `${p.key} body`).toBeGreaterThanOrEqual(7);
    }
  });

  it('reads in Atkinson Hyperlegible', () => {
    expect(DEFAULT_BRAND.fonts.reading).toBe('Atkinson Hyperlegible');
  });
});

describe('setBrands / getBrands / getBrand', () => {
  it('replaces the built-in brand with the brands it is given', () => {
    setBrands(EXAMPLE_BRANDS);
    expect(getBrands().map((b) => b.key)).toEqual(['example', 'sample']);
  });

  it('goes back to the built-in brand for an empty or missing list', () => {
    setBrands(EXAMPLE_BRANDS);
    setBrands([]);
    expect(getBrands()).toEqual([DEFAULT_BRAND]);
    setBrands(EXAMPLE_BRANDS);
    setBrands(undefined);
    expect(getBrands()).toEqual([DEFAULT_BRAND]);
  });

  it('looks a brand up by key, falling back to the first brand', () => {
    setBrands(EXAMPLE_BRANDS);
    expect(getBrand('sample').label).toBe('Sample Podcast');
    expect(getBrand('nope').key).toBe('example');
  });
});
