import { describe, it, expect } from 'vitest';
import { TEMPLATES, getTemplate, PAGE_SIZES } from './templates.js';

const BRAND_HEXES = ['#f5f0e8', '#c2704f', '#8a9a7e'];

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
};

const SUFFIXES = ['', '-cream-sage', '-terracotta-sage', '-sage-terracotta', '-terracotta-cream', '-sage-cream'];

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
    for (const t of TEMPLATES) {
      const elements = t.buildPage('letter');
      const ids = elements.map((e) => e.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it('sizes elements to fit within the requested page', () => {
    const { width, height } = PAGE_SIZES.letter;
    for (const t of TEMPLATES) {
      for (const el of t.buildPage('letter')) {
        expect(el.x + el.width).toBeLessThanOrEqual(width + 1);
        expect(el.y + el.height).toBeLessThanOrEqual(height + 1);
      }
    }
  });

  it.each(Object.entries(BRANDED_KEYS))(
    'offers all 6 earth-tone %s variants, each with a locked brand background',
    (baseKey, elementNames) => {
      for (const suffix of SUFFIXES) {
        const key = `${baseKey}${suffix}`;
        const template = getTemplate(key);
        expect(template.key).toBe(key);
        const elements = template.buildPage('letter');
        expect(elements[0]).toMatchObject({ type: 'rect', name: 'Brand background', locked: true });
        for (const name of elementNames) {
          expect(elements.find((e) => e.name === name)).toBeTruthy();
        }
      }
    }
  );

  it('gives every branded type an accent-free set of exactly 3 background hues across its 6 variants', () => {
    for (const baseKey of Object.keys(BRANDED_KEYS)) {
      const backgrounds = SUFFIXES.map((suffix) => {
        const elements = getTemplate(`${baseKey}${suffix}`).buildPage('letter');
        return elements[0].fill.toLowerCase();
      });
      expect(new Set(backgrounds)).toEqual(new Set(BRAND_HEXES));
    }
  });

  it('keeps the coloring page surface neutral white behind the line art', () => {
    for (const suffix of SUFFIXES) {
      const elements = getTemplate(`coloring-page${suffix}`).buildPage('letter');
      const surface = elements.find((e) => e.name === 'Coloring surface');
      expect(surface).toMatchObject({ type: 'rect', fill: '#ffffff', locked: true });
    }
  });

  it('adds landscape and square page sizes for certificate and social-post', () => {
    expect(PAGE_SIZES['letter-landscape']).toMatchObject({ width: 1056, height: 816 });
    expect(PAGE_SIZES['social-square']).toMatchObject({ width: 1080, height: 1080 });
  });
});
