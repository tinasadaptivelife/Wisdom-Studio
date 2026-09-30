import { describe, it, expect, afterEach } from 'vitest';
import path from 'node:path';
import { resolveFontFile, loadFontBytes } from './pdfFonts.js';

const FIXTURE_PACK = path.resolve('test/fixtures/brand-pack');
const name = (file) => path.basename(file);

afterEach(() => {
  process.env.WISDOM_STUDIO_BRANDS_DIR = '';
});

describe('resolveFontFile', () => {
  it('picks the regular and bold Atkinson Hyperlegible files that ship with the app', () => {
    expect(name(resolveFontFile('Atkinson Hyperlegible, sans-serif'))).toBe('atkinson-hyperlegible-latin-400-normal.woff');
    expect(name(resolveFontFile('Atkinson Hyperlegible, sans-serif', 'bold'))).toBe('atkinson-hyperlegible-latin-700-normal.woff');
  });

  it('reads the first family from a CSS font stack, ignoring quotes and case', () => {
    expect(name(resolveFontFile('"ATKINSON hyperlegible", Georgia, serif', 'bold'))).toBe('atkinson-hyperlegible-latin-700-normal.woff');
    expect(name(resolveFontFile("'atkinson hyperlegible'"))).toBe('atkinson-hyperlegible-latin-400-normal.woff');
  });

  it('returns null for a family it has no file for, so the caller can fall back to Helvetica', () => {
    expect(resolveFontFile('Poppins, Arial, sans-serif')).toBeNull();
    expect(resolveFontFile('')).toBeNull();
    expect(resolveFontFile(undefined)).toBeNull();
  });

  it('has no file for a brand font when there is no brand pack', () => {
    expect(resolveFontFile('Example Display, serif')).toBeNull();
  });

  it('finds the fonts of the brand pack, regular and bold', () => {
    process.env.WISDOM_STUDIO_BRANDS_DIR = FIXTURE_PACK;
    expect(resolveFontFile('Example Display, serif')).toBe(path.join(FIXTURE_PACK, 'fonts', 'example-display-400.woff'));
    expect(resolveFontFile('"Example Display", serif', 'bold')).toBe(path.join(FIXTURE_PACK, 'fonts', 'example-display-700.woff'));
  });

  it('still finds Atkinson Hyperlegible when a brand pack is in use', () => {
    process.env.WISDOM_STUDIO_BRANDS_DIR = FIXTURE_PACK;
    expect(name(resolveFontFile('Atkinson Hyperlegible'))).toBe('atkinson-hyperlegible-latin-400-normal.woff');
  });
});

describe('loadFontBytes', () => {
  it('reads every font file it can resolve from disk', () => {
    process.env.WISDOM_STUDIO_BRANDS_DIR = FIXTURE_PACK;
    for (const family of ['Atkinson Hyperlegible', 'Example Display']) {
      for (const style of ['normal', 'bold']) {
        const bytes = loadFontBytes(resolveFontFile(family, style));
        expect(bytes.length).toBeGreaterThan(5000);
      }
    }
  });
});
