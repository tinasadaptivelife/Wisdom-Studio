import { afterEach, describe, it, expect, vi } from 'vitest';
import { DEFAULT_BRAND, getBrands, getBrand, setBrands, refreshBrands } from './brands.js';
import { EXAMPLE_BRANDS } from '../frontend/src/test/exampleBrands.js';

afterEach(() => setBrands(null));

describe('setBrands / getBrands / getBrand', () => {
  it('uses the built-in brand until brands are set, and again for an empty list', () => {
    expect(getBrands()).toEqual([DEFAULT_BRAND]);
    setBrands(EXAMPLE_BRANDS);
    expect(getBrands().map((b) => b.key)).toEqual(['example', 'sample']);
    setBrands([]);
    expect(getBrands()).toEqual([DEFAULT_BRAND]);
  });

  it('looks a brand up by key, falling back to the first brand', () => {
    setBrands(EXAMPLE_BRANDS);
    expect(getBrand('sample').label).toBe('Sample Podcast');
    expect(getBrand('nope').key).toBe('example');
  });
});

describe('refreshBrands', () => {
  it('sets the brands the backend serves from its brand pack', async () => {
    const client = { getBrands: vi.fn(async () => ({ brands: EXAMPLE_BRANDS, fonts: [] })) };
    await refreshBrands(client);
    expect(getBrands().map((b) => b.key)).toEqual(['example', 'sample']);
  });

  it('goes back to the built-in brand when the backend has no brand pack', async () => {
    setBrands(EXAMPLE_BRANDS);
    await refreshBrands({ getBrands: async () => ({ brands: [], fonts: [] }) });
    expect(getBrands()).toEqual([DEFAULT_BRAND]);
  });

  it('keeps the brands it has, without throwing, when the backend cannot be reached', async () => {
    setBrands(EXAMPLE_BRANDS);
    await expect(refreshBrands({ getBrands: async () => { throw new Error('ECONNREFUSED'); } })).resolves.toBeUndefined();
    expect(getBrands().map((b) => b.key)).toEqual(['example', 'sample']);
  });
});
