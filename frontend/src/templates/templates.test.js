import { describe, it, expect } from 'vitest';
import { TEMPLATES, ASSET_TYPES, getTemplate, getTemplatesForType, getAssetType } from './templates.js';
import { PAGE_SIZES } from '../utils/pageSizes.js';

const BRAND_HEXES = ['#f5f0e8', '#c2704f', '#8a9a7e'];

// One entry per earth-tone asset type, plus the element name(s)
// that must survive across all 6 color variants (anything downstream that
// keys off element names, like the import-flow's 'Details' lookup, depends
// on this staying stable regardless of which color variant is active).
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

  it('falls back to the first template for an unknown key', () => {
    expect(getTemplate('nonexistent')).toBe(TEMPLATES[0]);
  });
});

describe.each(BRANDED_TYPES)('$typeKey (earth-tone)', ({ typeKey, elementNames }) => {
  it('offers exactly 6 color variants, all typed correctly', () => {
    const variants = getTemplatesForType(typeKey);
    expect(variants).toHaveLength(6);
    expect(variants.every((v) => v.typeKey === typeKey)).toBe(true);
    expect(variants.map((v) => v.key)).toContain(typeKey);
  });

  it('gives each variant an accent drawn from the locked brand palette, with all 3 hues represented', () => {
    const variants = getTemplatesForType(typeKey);
    for (const v of variants) {
      expect(BRAND_HEXES).toContain(v.accent.toLowerCase());
    }
    expect(new Set(variants.map((v) => v.accent.toLowerCase()))).toEqual(new Set(BRAND_HEXES));
  });

  it('keeps every element name stable across all 6 variants', () => {
    for (const variant of getTemplatesForType(typeKey)) {
      const elements = variant.buildPage('letter');
      for (const name of elementNames) {
        expect(elements.find((el) => el.name === name)).toBeTruthy();
      }
    }
  });

  it('puts a locked brand background/border rectangle behind everything else', () => {
    for (const variant of getTemplatesForType(typeKey)) {
      const elements = variant.buildPage('letter');
      expect(elements[0]).toMatchObject({ type: 'rect', name: 'Brand background', locked: true });
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
  it('has no earth-tone color variants — stays a true blank start', () => {
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

  it('has one entry per distinct typeKey used by TEMPLATES', () => {
    const typeKeys = new Set(TEMPLATES.map((t) => t.typeKey));
    expect(new Set(ASSET_TYPES.map((t) => t.key))).toEqual(typeKeys);
  });
});
