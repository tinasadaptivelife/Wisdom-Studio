import { afterAll, beforeAll, describe, it, expect } from 'vitest';
import { getTemplates, getTemplate, resolveTemplateKey, PAGE_SIZES } from './templates.js';
import { DEFAULT_BRAND, setBrands } from './brands.js';
import { DEFAULT_BRAND as FRONTEND_DEFAULT_BRAND } from '../frontend/src/templates/brands.js';
import { EXAMPLE_BRANDS } from '../frontend/src/test/exampleBrands.js';
import { PAGE_SIZES as FRONTEND_PAGE_SIZES } from '../frontend/src/utils/pageSizes.js';
import { PAGE_SIZES as BACKEND_PAGE_SIZES } from '../backend/utils/pageSizes.js';

const BRANDED_KEYS = {
  'coloring-page': ['Line art image', 'Title'],
  flyer: ['Headline', 'Flyer image', 'Details'],
  storybook: ['Story illustration', 'Story text'],
  'quote-card': ['Complementary image', 'Quote', 'Attribution'],
  document: ['Title', 'Body text'],
  newsletter: ['Masthead', 'Lead image', 'Lead story', 'Body text'],
  workbook: ['Title', 'Instructions', 'Response area'],
  certificate: ['Certificate title', 'Recipient name', 'Achievement text'],
  'social-post': ['Post image', 'Headline', 'Caption'],
  invitation: ['Invitation image', 'Event name', 'Details', 'RSVP'],
  brochure: ['Headline', 'Brochure image', 'Body text', 'Contact info'],
  'clip-card': ['Art', 'Scrim', 'Kicker', 'Headline', 'Body', 'Footer'],
};

const DEFAULT_SUFFIXES = ['', '-cream-sage', '-terracotta-sage', '-sage-terracotta', '-terracotta-cream', '-sage-cream'];

// The templates are built from whatever brands are set (from the server's brand
// pack; see brands.js). These tests use two invented example brands.
const BRANDS = EXAMPLE_BRANDS;
const VARIANT_COUNT = BRANDS.reduce((n, b) => n + b.palettes.length, 0);

beforeAll(() => setBrands(BRANDS));
afterAll(() => setBrands(null));

describe('the built-in brand', () => {
  it('is identical to the frontend copy (the two are duplicated on purpose, so they must not drift)', () => {
    expect(DEFAULT_BRAND).toEqual(FRONTEND_DEFAULT_BRAND);
  });

  it('is used when no brands are set, with the original six template keys', () => {
    setBrands(null);
    for (const baseKey of Object.keys(BRANDED_KEYS)) {
      for (const suffix of DEFAULT_SUFFIXES) {
        expect(getTemplate(`${baseKey}${suffix}`).key).toBe(`${baseKey}${suffix}`);
      }
    }
    expect(getTemplates()).toHaveLength(1 + 12 * 6);
    setBrands(BRANDS);
  });
});

describe('TEMPLATES', () => {
  it('includes the quote-card template with a brand background and a complementary-image placeholder', () => {
    const quoteCard = getTemplate('quote-card');
    expect(quoteCard).toBeTruthy();
    const elements = quoteCard.buildPage('letter');
    const types = elements.map((e) => e.type);
    expect(types).toEqual(['rect', 'image-placeholder', 'text', 'text']);
    expect(elements[1].name).toBe('Complementary image');
    expect(elements[2].name).toBe('Quote');
    expect(elements[3].name).toBe('Attribution');
  });

  it('falls back to the blank template for an unknown key', () => {
    const t = getTemplate('not-a-real-template');
    expect(t.key).toBe('blank');
    expect(t.buildPage('letter')).toEqual([]);
  });

  it('every template produces elements with unique ids', () => {
    for (const t of getTemplates()) {
      const elements = t.buildPage('letter');
      const ids = elements.map((e) => e.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it('sizes elements to fit within the requested page', () => {
    const { width, height } = PAGE_SIZES.letter;
    for (const t of getTemplates()) {
      for (const el of t.buildPage('letter')) {
        expect(el.x + el.width).toBeLessThanOrEqual(width + 1);
        expect(el.y + el.height).toBeLessThanOrEqual(height + 1);
      }
    }
  });

  it('has 12 branded types x every palette plus the blank canvas, with unique keys', () => {
    expect(getTemplates()).toHaveLength(1 + 12 * VARIANT_COUNT);
    expect(new Set(getTemplates().map((t) => t.key)).size).toBe(getTemplates().length);
  });

  it('tags each branded template with its type, brand and palette', () => {
    const t = getTemplate('flyer-sample-night-gold');
    expect(t).toMatchObject({ typeKey: 'flyer', brand: 'sample', paletteKey: 'night-gold' });
  });

  it.each(Object.entries(BRANDED_KEYS))(
    'offers every %s variant for every brand, each with a locked background in the palette colors',
    (baseKey, elementNames) => {
      for (const brand of BRANDS) {
        for (const palette of brand.palettes) {
          const key = `${baseKey}${palette.suffix}`;
          const template = getTemplate(key);
          expect(template.key).toBe(key);
          const elements = template.buildPage('letter');
          expect(elements[0]).toMatchObject({
            type: 'rect',
            name: 'Brand background',
            locked: true,
            fill: palette.background,
            stroke: palette.border,
          });
          for (const name of elementNames) {
            expect(elements.find((e) => e.name === name)).toBeTruthy();
          }
        }
      }
    }
  );

  it('keeps the coloring page surface neutral white behind the line art', () => {
    for (const brand of BRANDS) {
      for (const palette of brand.palettes) {
        const elements = getTemplate(`coloring-page${palette.suffix}`).buildPage('letter');
        const surface = elements.find((e) => e.name === 'Coloring surface');
        expect(surface).toMatchObject({ type: 'rect', fill: '#ffffff', locked: true });
      }
    }
  });

  it('adds landscape and square page sizes for certificate and social-post', () => {
    expect(PAGE_SIZES['letter-landscape']).toMatchObject({ width: 1056, height: 816 });
    expect(PAGE_SIZES['social-square']).toMatchObject({ width: 1080, height: 1080 });
  });
});

describe('page sizes', () => {
  it('are identical in the frontend, the backend and this server (they are duplicated on purpose)', () => {
    expect(PAGE_SIZES).toEqual(FRONTEND_PAGE_SIZES);
    expect(PAGE_SIZES).toEqual(BACKEND_PAGE_SIZES);
  });

  it('include the 9:16 story size and the YouTube thumbnail', () => {
    expect(PAGE_SIZES.story).toMatchObject({ width: 1080, height: 1920 });
    expect(PAGE_SIZES['youtube-thumbnail']).toMatchObject({ width: 1280, height: 720 });
  });
});

describe('brand fonts, text sizes and the clip card', () => {
  const branded = () => getTemplates().filter((t) => t.brand);

  const DISPLAY_NAMES = ['Headline', 'Title', 'Masthead', 'Certificate title', 'Recipient name', 'Event name', 'Quote'];

  it('uses the brand display font only for 32px+ titles and headlines, and Atkinson Hyperlegible for everything else', () => {
    for (const t of branded()) {
      const brand = BRANDS.find((b) => b.key === t.brand);
      for (const el of t.buildPage('letter').filter((e) => e.type === 'text')) {
        const expected = el.fontSize >= 32 && DISPLAY_NAMES.includes(el.name) ? brand.fonts.display : brand.fonts.reading;
        expect(el.fontFamily.split(',')[0].trim(), `${t.key} / ${el.name}`).toBe(expected);
      }
    }
  });

  it('never sets text below 16px and fits every page size', () => {
    for (const t of branded()) {
      for (const [pageSize, { width, height }] of Object.entries(PAGE_SIZES)) {
        for (const el of t.buildPage(pageSize)) {
          expect(el.x + el.width, `${t.key}/${el.name}/${pageSize}`).toBeLessThanOrEqual(width + 1);
          expect(el.y + el.height, `${t.key}/${el.name}/${pageSize}`).toBeLessThanOrEqual(height + 1);
          if (el.type === 'text') expect(el.fontSize).toBeGreaterThanOrEqual(16);
        }
      }
    }
  });

  it('keeps the bottom fifth of a story-size clip card clear for captions, with a phone-sized headline', () => {
    const { height } = PAGE_SIZES.story;
    for (const t of getTemplates().filter((x) => x.typeKey === 'clip-card')) {
      const elements = t.buildPage('story');
      for (const el of elements.filter((e) => !['Brand background', 'Art'].includes(e.name))) {
        expect(el.y + el.height, t.key).toBeLessThanOrEqual(height * 0.8);
      }
      expect(elements.find((e) => e.name === 'Headline').fontSize).toBeGreaterThanOrEqual(72);
      const scrim = elements.find((e) => e.name === 'Scrim');
      expect(scrim).toMatchObject({ type: 'rect', locked: true });
      expect(scrim.opacity).toBeGreaterThan(0.5);
      expect(scrim.opacity).toBeLessThan(1);
    }
  });
});

describe('resolveTemplateKey', () => {
  it('returns the key unchanged when no brand is given (backward compatible)', () => {
    expect(resolveTemplateKey('quote-card')).toBe('quote-card');
    expect(resolveTemplateKey('flyer-cream-sage')).toBe('flyer-cream-sage');
  });

  it('uses the brand’s first palette when only a brand is given', () => {
    expect(resolveTemplateKey('quote-card', 'sample')).toBe('quote-card-sample-night-gold');
    expect(resolveTemplateKey('quote-card', 'example')).toBe('quote-card');
  });

  it('honors an explicit palette', () => {
    expect(resolveTemplateKey('flyer', 'sample', 'night-mist')).toBe('flyer-sample-night-mist');
    expect(resolveTemplateKey('flyer', 'example', 'navy-paper')).toBe('flyer-example-navy-paper');
  });

  it('gives a clear, actionable error for an unknown brand, listing the valid ones', () => {
    expect(() => resolveTemplateKey('flyer', 'nope')).toThrow(/example, sample/);
  });

  it('gives a clear, actionable error for an unknown palette, listing the valid ones', () => {
    expect(() => resolveTemplateKey('flyer', 'sample', 'nope')).toThrow(/night-gold/);
  });

  it('rejects a brand for the blank canvas, which has no brand variants', () => {
    expect(() => resolveTemplateKey('blank', 'sample')).toThrow(/blank/i);
  });
});
