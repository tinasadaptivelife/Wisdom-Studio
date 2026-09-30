import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { contrastRatio, loadBrandPack, getBrandPack, brandPackDir } from './brandPack.js';

const FIXTURE = path.resolve('test/fixtures/brand-pack');

const tmpDirs = [];
function packWith(json, { fonts = [] } = {}) {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'brand-pack-test-'));
  tmpDirs.push(dir);
  writeFileSync(path.join(dir, 'brands.json'), typeof json === 'string' ? json : JSON.stringify(json));
  if (fonts.length) {
    mkdirSync(path.join(dir, 'fonts'));
    for (const f of fonts) writeFileSync(path.join(dir, 'fonts', f), 'not really a font');
  }
  return dir;
}
const validBrand = (over = {}) => ({
  key: 'acme',
  label: 'Acme',
  fonts: { reading: 'Atkinson Hyperlegible', display: 'Atkinson Hyperlegible' },
  palettes: [{ key: 'plain', label: 'Plain', background: '#FFFFFF', border: '#000000', headline: '#000000', body: '#000000' }],
  ...over,
});

afterEach(() => {
  for (const d of tmpDirs.splice(0)) rmSync(d, { recursive: true, force: true });
  process.env.WISDOM_STUDIO_BRANDS_DIR = '';
});

describe('contrastRatio', () => {
  it('is 21 for black on white and 1 for identical colors', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 1);
    expect(contrastRatio('#777777', '#777777')).toBeCloseTo(1, 5);
  });
});

describe('loadBrandPack', () => {
  it('loads the brands of a valid pack, filling in each palette suffix', () => {
    const pack = loadBrandPack(FIXTURE);
    expect(pack.brands.map((b) => b.key)).toEqual(['example', 'sample']);
    const example = pack.brands[0];
    expect(example.label).toBe('Example Studio');
    expect(example.footerText).toBe('example.test');
    // An explicit suffix (even an empty one) is kept; otherwise it is derived.
    expect(example.palettes.map((p) => p.suffix)).toEqual(['', '-example-navy-paper']);
    expect(pack.brands[1].palettes[0].suffix).toBe('-sample-night-gold');
  });

  it('defaults shortLabel to the label', () => {
    const dir = packWith({ brands: [validBrand()] });
    expect(loadBrandPack(dir).brands[0].shortLabel).toBe('Acme');
  });

  it('resolves font files to absolute paths inside the pack’s fonts folder', () => {
    const pack = loadBrandPack(FIXTURE);
    expect(pack.fontFiles['Example Display'].normal).toBe(path.join(FIXTURE, 'fonts', 'example-display-400.woff'));
    expect(pack.fontFiles['Example Display'].bold).toBe(path.join(FIXTURE, 'fonts', 'example-display-700.woff'));
  });

  it('uses the normal file for bold when a family has one weight', () => {
    const dir = packWith(
      { brands: [validBrand()], fontFiles: { Solo: { normal: 'solo.woff' } } },
      { fonts: ['solo.woff'] }
    );
    const { Solo } = loadBrandPack(dir).fontFiles;
    expect(Solo.bold).toBe(Solo.normal);
  });

  it('rejects a missing brands.json with a message naming the folder', () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'brand-pack-test-'));
    tmpDirs.push(dir);
    expect(() => loadBrandPack(dir)).toThrow(/brands\.json/);
  });

  it('rejects invalid JSON', () => {
    expect(() => loadBrandPack(packWith('{ nope'))).toThrow(/not valid JSON/);
  });

  it.each([
    ['no brands', { brands: [] }, /at least one brand/],
    ['a bad brand key', { brands: [validBrand({ key: 'Bad Key' })] }, /key/],
    ['duplicate brand keys', { brands: [validBrand(), validBrand()] }, /duplicate brand key/i],
    ['a missing label', { brands: [validBrand({ label: '' })] }, /label/],
    ['missing fonts', { brands: [validBrand({ fonts: undefined })] }, /fonts/],
    ['no palettes', { brands: [validBrand({ palettes: [] })] }, /palette/],
  ])('rejects %s', (_name, json, message) => {
    expect(() => loadBrandPack(packWith(json))).toThrow(message);
  });

  it('rejects a color that is not a 6-digit hex', () => {
    const palettes = [{ key: 'p', label: 'P', background: 'white', border: '#000000', headline: '#000000', body: '#000000' }];
    expect(() => loadBrandPack(packWith({ brands: [validBrand({ palettes })] }))).toThrow(/background.*hex/i);
  });

  it('enforces the accessibility floor: headline 4.5:1 and body 7:1 against the background', () => {
    const low = (over) => ({ key: 'p', label: 'P', background: '#FFFFFF', border: '#000000', headline: '#000000', body: '#000000', ...over });
    expect(() => loadBrandPack(packWith({ brands: [validBrand({ palettes: [low({ headline: '#AAAAAA' })] })] }))).toThrow(
      /headline.*4\.5:1/i
    );
    // #767676 on white is 4.5:1: fine for a headline, not enough for body text.
    expect(() => loadBrandPack(packWith({ brands: [validBrand({ palettes: [low({ headline: '#767676' })] })] }))).not.toThrow();
    expect(() => loadBrandPack(packWith({ brands: [validBrand({ palettes: [low({ body: '#767676' })] })] }))).toThrow(/body.*7:1/i);
  });

  it('rejects two palettes that would produce the same template key', () => {
    const p = { label: 'P', background: '#FFFFFF', border: '#000000', headline: '#000000', body: '#000000', suffix: '' };
    const palettes = [{ key: 'a', ...p }, { key: 'b', ...p }];
    expect(() => loadBrandPack(packWith({ brands: [validBrand({ palettes })] }))).toThrow(/same template suffix/i);
  });

  it('rejects an imageStyle without a suffix and negativePrompt', () => {
    expect(() => loadBrandPack(packWith({ brands: [validBrand({ imageStyle: { suffix: 'x' } })] }))).toThrow(/imageStyle/);
  });

  it('rejects an imageStyle on a brand whose key is one of the generic style names', () => {
    const imageStyle = { suffix: ', painted', negativePrompt: 'blurry' };
    expect(() => loadBrandPack(packWith({ brands: [validBrand({ key: 'flyer', imageStyle })] }))).toThrow(/generic image style/i);
  });

  it('rejects font files that are missing or try to leave the fonts folder', () => {
    expect(() => loadBrandPack(packWith({ brands: [validBrand()], fontFiles: { F: { normal: 'missing.woff' } } }))).toThrow(/missing\.woff/);
    expect(() =>
      loadBrandPack(packWith({ brands: [validBrand()], fontFiles: { F: { normal: '../brands.json' } } }))
    ).toThrow(/plain file name/i);
  });

  it('reports every problem at once', () => {
    let message = '';
    try {
      loadBrandPack(packWith({ brands: [validBrand({ label: '' }), validBrand({ key: 'Other Key' })] }));
    } catch (err) {
      message = err.message;
    }
    expect(message).toMatch(/label/);
    expect(message).toMatch(/key/);
  });
});

describe('brandPackDir', () => {
  it('uses WISDOM_STUDIO_BRANDS_DIR when set', () => {
    process.env.WISDOM_STUDIO_BRANDS_DIR = '/somewhere/else';
    expect(brandPackDir()).toBe('/somewhere/else');
  });

  it('treats an empty WISDOM_STUDIO_BRANDS_DIR as "no brand pack"', () => {
    process.env.WISDOM_STUDIO_BRANDS_DIR = '';
    expect(brandPackDir()).toBeNull();
  });

  it('falls back to ~/.wisdom-studio/brands when it is not set at all', () => {
    delete process.env.WISDOM_STUDIO_BRANDS_DIR;
    expect(brandPackDir()).toBe(path.join(os.homedir(), '.wisdom-studio', 'brands'));
  });
});

describe('getBrandPack', () => {
  it('is empty, without an error, when no pack is configured', () => {
    process.env.WISDOM_STUDIO_BRANDS_DIR = '';
    expect(getBrandPack()).toEqual({ brands: [], fontFiles: {}, dir: null });
  });

  it('is empty, without an error, when the configured folder does not exist', () => {
    process.env.WISDOM_STUDIO_BRANDS_DIR = path.join(os.tmpdir(), 'no-such-brand-pack-folder');
    expect(getBrandPack().brands).toEqual([]);
    expect(getBrandPack().error).toBeUndefined();
  });

  it('returns the pack from the configured folder', () => {
    process.env.WISDOM_STUDIO_BRANDS_DIR = FIXTURE;
    const pack = getBrandPack();
    expect(pack.brands.map((b) => b.key)).toEqual(['example', 'sample']);
    expect(pack.dir).toBe(FIXTURE);
  });

  it('never throws: a broken pack comes back empty with the reason in `error`', () => {
    process.env.WISDOM_STUDIO_BRANDS_DIR = packWith('{ nope');
    const pack = getBrandPack();
    expect(pack.brands).toEqual([]);
    expect(pack.error).toMatch(/not valid JSON/);
  });
});
