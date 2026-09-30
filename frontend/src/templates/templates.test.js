import { afterAll, beforeAll, describe, it, expect } from 'vitest';
import { getTemplates, ASSET_TYPES, getTemplate, getTemplatesForType, getAssetType } from './templates.js';
import { DEFAULT_BRAND, getBrand, setBrands } from './brands.js';
import { EXAMPLE_BRANDS } from '../test/exampleBrands.js';
import { PAGE_SIZES } from '../utils/pageSizes.js';

// The templates are built from whatever brands are set (the server sends the
// brands of the brand pack at startup; see brands.js). These tests use two
// invented example brands, plus a section for the built-in brand.
const BRANDS = EXAMPLE_BRANDS;
const VARIANT_COUNT = BRANDS.reduce((n, b) => n + b.palettes.length, 0);

beforeAll(() => setBrands(BRANDS));
afterAll(() => setBrands(null));

// One entry per branded asset type, plus the element name(s) that must
// survive across every brand and palette (anything downstream that keys off
// element names, like the import-flow's 'Details' lookup, depends on this
// staying stable regardless of which variant is active).
const BRANDED_TYPES = [
  { typeKey: 'coloring-page', elementNames: ['Line art image', 'Title'] },
  { typeKey: 'flyer', elementNames: ['Headline', 'Flyer image', 'Details'] },
  { typeKey: 'storybook', elementNames: ['Story illustration', 'Story text'] },
  { typeKey: 'quote-card', elementNames: ['Complementary image', 'Quote', 'Attribution'] },
  { typeKey: 'document', elementNames: ['Title', 'Body text'] },
  { typeKey: 'newsletter', elementNames: ['Masthead', 'Lead image', 'Lead story', 'Body text'] },
  { typeKey: 'workbook', elementNames: ['Title', 'Instructions', 'Response area'] },
  { typeKey: 'certificate', elementNames: ['Certificate title', 'Recipient name', 'Achievement text'] },
  { typeKey: 'social-post', elementNames: ['Post image', 'Headline', 'Caption'] },
  { typeKey: 'invitation', elementNames: ['Invitation image', 'Event name', 'Details', 'RSVP'] },
  { typeKey: 'brochure', elementNames: ['Headline', 'Brochure image', 'Body text', 'Contact info'] },
  { typeKey: 'clip-card', elementNames: ['Art', 'Scrim', 'Kicker', 'Headline', 'Body', 'Footer'] },
];

describe('getTemplate (backward compatibility)', () => {
  it('resolves every legacy template key that existing saved projects may reference', () => {
    // 'script-sheet' was retired (replaced by 'newsletter') — old saved
    // projects referencing it now intentionally fall back to blank.
    const legacyKeys = ['blank', 'coloring-page', 'flyer', 'storybook', 'quote-card'];
    for (const key of legacyKeys) {
      expect(getTemplate(key).key).toBe(key);
    }
  });

  it('gives the first palette of the first brand the bare type key, and every other palette its own suffix', () => {
    expect(getTemplate('flyer')).toMatchObject({ key: 'flyer', brand: 'example', paletteKey: 'paper-navy' });
    expect(getTemplate('flyer-example-navy-paper')).toMatchObject({ brand: 'example', paletteKey: 'navy-paper' });
    expect(getTemplate('flyer-sample-night-gold')).toMatchObject({ brand: 'sample', paletteKey: 'night-gold' });
  });

  it('falls back to the first template for an unknown key', () => {
    expect(getTemplate('nonexistent')).toBe(getTemplates()[0]);
  });
});

describe.each(BRANDED_TYPES)('$typeKey (branded)', ({ typeKey, elementNames }) => {
  it('offers every palette of every brand, all typed correctly', () => {
    const variants = getTemplatesForType(typeKey);
    expect(variants).toHaveLength(VARIANT_COUNT);
    expect(variants.every((v) => v.typeKey === typeKey)).toBe(true);
    expect(variants.map((v) => v.key)).toContain(typeKey);
    expect(new Set(variants.map((v) => v.key)).size).toBe(VARIANT_COUNT);
  });

  it('can filter the variants by brand', () => {
    for (const brand of BRANDS) {
      const variants = getTemplatesForType(typeKey, brand.key);
      expect(variants).toHaveLength(brand.palettes.length);
      expect(variants.every((v) => v.brand === brand.key)).toBe(true);
      expect(variants.every((v) => v.brandLabel === brand.label)).toBe(true);
    }
  });

  it("uses each variant's own background as its accent", () => {
    for (const v of getTemplatesForType(typeKey)) {
      const rect = v.buildPage('letter')[0];
      expect(v.accent.toLowerCase()).toBe(rect.fill.toLowerCase());
    }
  });

  it('keeps every element name stable across all variants', () => {
    for (const variant of getTemplatesForType(typeKey)) {
      const elements = variant.buildPage('letter');
      for (const name of elementNames) {
        expect(elements.find((el) => el.name === name)).toBeTruthy();
      }
    }
  });

  it('puts a locked brand background/border rectangle behind everything else, in the palette colors', () => {
    for (const brand of BRANDS) {
      const variants = getTemplatesForType(typeKey, brand.key);
      variants.forEach((variant, i) => {
        const palette = brand.palettes[i];
        const elements = variant.buildPage('letter');
        expect(elements[0]).toMatchObject({
          type: 'rect',
          name: 'Brand background',
          locked: true,
          fill: palette.background,
          stroke: palette.border,
        });
      });
    }
  });
});

describe('brand fonts and text sizes', () => {
  const allBranded = () => getTemplates().filter((t) => t.brand);

  it('gives each brand a reading font and a display font', () => {
    for (const brand of BRANDS) {
      expect(brand.fonts.reading).toBe('Atkinson Hyperlegible');
      expect(brand.fonts.display).toBeTruthy();
    }
    expect(getBrand('example').fonts.display).toBe('Example Display');
  });

  it('follows a display font with its generic family, and the reading font with sans-serif', () => {
    const flyer = (brandKey) => getTemplatesForType('flyer', brandKey)[0].buildPage('letter');
    expect(flyer('example').find((e) => e.name === 'Headline').fontFamily).toBe('Example Display, serif');
    expect(flyer('example').find((e) => e.name === 'Details').fontFamily).toBe('Atkinson Hyperlegible, sans-serif');
    // No display font of its own: the headline is Atkinson Hyperlegible, in bold.
    expect(flyer('sample').find((e) => e.name === 'Headline')).toMatchObject({ fontFamily: 'Atkinson Hyperlegible, sans-serif', fontStyle: 'bold' });
  });

  // Display fonts are for names and titles only. Essential information
  // (details, dates, contact lines, URLs, credits) always uses the reading font.
  const DISPLAY_NAMES = ['Headline', 'Title', 'Masthead', 'Certificate title', 'Recipient name', 'Event name', 'Quote'];

  it('uses the brand display font only for 32px+ titles and headlines, and the reading font for everything else', () => {
    for (const t of allBranded()) {
      const brand = getBrand(t.brand);
      for (const el of t.buildPage('letter').filter((e) => e.type === 'text')) {
        const family = el.fontFamily.split(',')[0].trim();
        const expected = el.fontSize >= 32 && DISPLAY_NAMES.includes(el.name) ? brand.fonts.display : brand.fonts.reading;
        expect(family, `${t.key} / ${el.name} (${el.fontSize}px)`).toBe(expected);
      }
    }
  });

  it('keeps the clip card’s body and footer (a URL, a show name) in the reading font even though they are large', () => {
    for (const variant of getTemplatesForType('clip-card')) {
      const els = variant.buildPage('story');
      for (const name of ['Kicker', 'Body', 'Footer']) {
        const el = els.find((e) => e.name === name);
        expect(el.fontFamily.startsWith('Atkinson Hyperlegible'), `${variant.key} / ${name}`).toBe(true);
      }
    }
  });

  it('never sets text below 16px, on any page size', () => {
    for (const t of allBranded()) {
      for (const pageSize of Object.keys(PAGE_SIZES)) {
        for (const el of t.buildPage(pageSize).filter((e) => e.type === 'text')) {
          expect(el.fontSize, `${t.key} / ${el.name} on ${pageSize}`).toBeGreaterThanOrEqual(16);
        }
      }
    }
  });

  it('fits every branded template inside every page size', () => {
    for (const t of allBranded()) {
      for (const [pageSize, { width, height }] of Object.entries(PAGE_SIZES)) {
        for (const el of t.buildPage(pageSize)) {
          expect(el.x + el.width, `${t.key} / ${el.name} on ${pageSize}`).toBeLessThanOrEqual(width + 1);
          expect(el.y + el.height, `${t.key} / ${el.name} on ${pageSize}`).toBeLessThanOrEqual(height + 1);
        }
      }
    }
  });
});

describe('clip-card (9:16 title, quote and end cards for clips)', () => {
  it('is its own asset type that opens on the story page size', () => {
    expect(getAssetType('clip-card')).toMatchObject({ key: 'clip-card', defaultPageSize: 'story' });
    expect(PAGE_SIZES.story).toMatchObject({ width: 1080, height: 1920 });
    expect(PAGE_SIZES['youtube-thumbnail']).toMatchObject({ width: 1280, height: 720 });
  });

  it('keeps the bottom fifth of the story page clear for the clip captions', () => {
    const { height } = PAGE_SIZES.story;
    for (const variant of getTemplatesForType('clip-card')) {
      for (const el of variant.buildPage('story').filter((e) => !['Brand background', 'Art'].includes(e.name))) {
        expect(el.y + el.height, `${variant.key} / ${el.name}`).toBeLessThanOrEqual(height * 0.8);
      }
    }
  });

  it('has a full-page Art layer under a translucent Scrim in the palette background, both under the text', () => {
    for (const variant of getTemplatesForType('clip-card')) {
      const els = variant.buildPage('story');
      expect(els.map((e) => e.name).slice(0, 3)).toEqual(['Brand background', 'Art', 'Scrim']);
      const [bg, art, scrim] = els;
      // Inset by half the 24px border stroke, so the brand border stays visible around the art.
      expect(art.placeholderStyle).toBe('outline'); // no grey fill hiding the brand colors while empty
      expect(art).toMatchObject({ type: 'image-placeholder', x: 12, y: 12, width: 1056, height: 1896 });
      expect(scrim).toMatchObject({ type: 'rect', fill: bg.fill, locked: true });
      expect(scrim.opacity).toBeGreaterThan(0.5);
      expect(scrim.opacity).toBeLessThan(1);
      // The scrim covers every text block, so text stays readable over any art.
      for (const t of els.filter((e) => e.type === 'text')) {
        expect(t.x).toBeGreaterThanOrEqual(scrim.x);
        expect(t.x + t.width).toBeLessThanOrEqual(scrim.x + scrim.width);
        expect(t.y).toBeGreaterThanOrEqual(scrim.y);
        expect(t.y + t.height).toBeLessThanOrEqual(scrim.y + scrim.height);
      }
    }
  });

  it('puts the brand’s own footer text on the card, and a placeholder for a brand without one', () => {
    const footer = (brandKey) => getTemplatesForType('clip-card', brandKey)[0].buildPage('story').find((e) => e.name === 'Footer').text;
    expect(footer('example')).toBe('example.test');
    expect(footer('sample')).toBe('yourname.example.com');
  });

  it('sets the headline big enough to read on a phone', () => {
    for (const variant of getTemplatesForType('clip-card')) {
      const headline = variant.buildPage('story').find((e) => e.name === 'Headline');
      expect(headline.fontSize).toBeGreaterThanOrEqual(72);
    }
  });
});

describe('coloring-page', () => {
  it('keeps the coloring surface itself neutral white behind the line art, even though the page border is branded', () => {
    for (const variant of getTemplatesForType('coloring-page')) {
      const elements = variant.buildPage('letter');
      const surface = elements.find((el) => el.name === 'Coloring surface');
      expect(surface).toMatchObject({ type: 'rect', fill: '#ffffff', locked: true });
    }
  });
});

describe('blank canvas (unbranded, single variant)', () => {
  it('has no brand color variants — stays a true blank start', () => {
    expect(getTemplatesForType('blank')).toHaveLength(1);
    expect(getTemplatesForType('blank')[0].key).toBe('blank');
    expect(getTemplatesForType('blank')[0].buildPage('letter')).toEqual([]);
  });
});

describe('page sizes', () => {
  it('adds landscape and square presets for certificate and social-post', () => {
    expect(PAGE_SIZES['letter-landscape']).toMatchObject({ width: 1056, height: 816 });
    expect(PAGE_SIZES['social-square']).toMatchObject({ width: 1080, height: 1080 });
  });

  it('gives certificate and social-post a matching defaultPageSize on their asset type', () => {
    expect(getAssetType('certificate').defaultPageSize).toBe('letter-landscape');
    expect(getAssetType('social-post').defaultPageSize).toBe('social-square');
  });
});

describe('getAssetType', () => {
  it('looks up an asset type by key', () => {
    expect(getAssetType('flyer').title).toMatch(/flyer/i);
  });

  it('falls back to the first asset type for an unknown key', () => {
    expect(getAssetType('nonexistent')).toBe(ASSET_TYPES[0]);
  });

  it('has one entry per distinct typeKey used by the templates', () => {
    const typeKeys = new Set(getTemplates().map((t) => t.typeKey));
    expect(new Set(ASSET_TYPES.map((t) => t.key))).toEqual(typeKeys);
  });
});

describe('the built-in brand (no brand pack)', () => {
  beforeAll(() => setBrands(null));
  afterAll(() => setBrands(BRANDS));

  it('offers 6 palettes for every branded type, with the original six template keys', () => {
    for (const suffix of ['', '-cream-sage', '-terracotta-sage', '-sage-terracotta', '-terracotta-cream', '-sage-cream']) {
      expect(getTemplate(`flyer${suffix}`).key).toBe(`flyer${suffix}`);
    }
    for (const type of ASSET_TYPES.filter((t) => t.key !== 'blank')) {
      expect(getTemplatesForType(type.key), type.key).toHaveLength(DEFAULT_BRAND.palettes.length);
    }
  });

  it('builds every template inside every page size with no text under 16px', () => {
    for (const t of getTemplates().filter((x) => x.brand)) {
      for (const [pageSize, { width, height }] of Object.entries(PAGE_SIZES)) {
        for (const el of t.buildPage(pageSize)) {
          expect(el.x + el.width, `${t.key} / ${el.name}`).toBeLessThanOrEqual(width + 1);
          expect(el.y + el.height, `${t.key} / ${el.name}`).toBeLessThanOrEqual(height + 1);
          if (el.type === 'text') expect(el.fontSize).toBeGreaterThanOrEqual(16);
        }
      }
    }
  });
});
