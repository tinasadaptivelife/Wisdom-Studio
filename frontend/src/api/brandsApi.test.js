import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { loadBrands, installBrandFonts } from './brandsApi.js';
import { getBrands, setBrands, DEFAULT_BRAND } from '../templates/brands.js';
import { EXAMPLE_BRANDS } from '../test/exampleBrands.js';

const jsonResponse = (body, ok = true) => ({ ok, status: ok ? 200 : 500, json: async () => body });

// jsdom has no FontFaceSet, so give the document a stand-in that records what is added.
const addedFaces = [];
beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn());
  addedFaces.length = 0;
  Object.defineProperty(document, 'fonts', { value: { add: (face) => addedFaces.push(face) }, configurable: true });
});

afterEach(() => {
  setBrands(null);
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('loadBrands', () => {
  it('sets the brands the server sends', async () => {
    fetch.mockResolvedValueOnce(jsonResponse({ brands: EXAMPLE_BRANDS, fonts: [] }));
    await loadBrands();
    expect(fetch).toHaveBeenCalledWith('/api/brands');
    expect(getBrands().map((b) => b.key)).toEqual(['example', 'sample']);
  });

  it('keeps the built-in brand when the server has no brand pack', async () => {
    fetch.mockResolvedValueOnce(jsonResponse({ brands: [], fonts: [] }));
    await loadBrands();
    expect(getBrands()).toEqual([DEFAULT_BRAND]);
  });

  it('keeps the built-in brand, without throwing, when the server is down or errors', async () => {
    fetch.mockRejectedValueOnce(new Error('connection refused'));
    await expect(loadBrands()).resolves.toBeUndefined();
    expect(getBrands()).toEqual([DEFAULT_BRAND]);

    fetch.mockResolvedValueOnce(jsonResponse({ error: 'boom' }, false));
    await expect(loadBrands()).resolves.toBeUndefined();
    expect(getBrands()).toEqual([DEFAULT_BRAND]);
  });

  it('does not ask a server in the preview build, which has none', async () => {
    vi.stubEnv('VITE_PREVIEW', '1');
    await loadBrands();
    expect(fetch).not.toHaveBeenCalled();
    expect(getBrands()).toEqual([DEFAULT_BRAND]);
  });

  it('installs the brand fonts before it sets the brands, so canvas text draws in them', async () => {
    const order = [];
    class FakeFontFace {
      constructor(family, source, descriptors) {
        this.family = family;
        this.source = source;
        this.descriptors = descriptors;
      }
      async load() {
        order.push(`load ${this.family} ${this.descriptors.weight}`);
        return this;
      }
    }
    vi.stubGlobal('FontFace', FakeFontFace);
    fetch.mockResolvedValueOnce(
      jsonResponse({
        brands: EXAMPLE_BRANDS,
        fonts: [
          { family: 'Example Display', weight: 400, url: '/api/brands/fonts/a.woff' },
          { family: 'Example Display', weight: 700, url: '/api/brands/fonts/b.woff' },
        ],
      })
    );
    await loadBrands();
    expect(order).toEqual(['load Example Display 400', 'load Example Display 700']);
    expect(addedFaces.map((f) => f.source)).toEqual(['url(/api/brands/fonts/a.woff)', 'url(/api/brands/fonts/b.woff)']);
    expect(getBrands()).toBe(EXAMPLE_BRANDS);
  });
});

describe('installBrandFonts', () => {
  it('does nothing where the browser has no FontFace (or a font fails to load)', async () => {
    vi.stubGlobal('FontFace', undefined);
    await expect(installBrandFonts([{ family: 'X', weight: 400, url: '/x.woff' }])).resolves.toBeUndefined();

    class BrokenFontFace {
      async load() {
        throw new Error('404');
      }
    }
    vi.stubGlobal('FontFace', BrokenFontFace);
    await expect(installBrandFonts([{ family: 'X', weight: 400, url: '/x.woff' }])).resolves.toBeUndefined();
  });
});
