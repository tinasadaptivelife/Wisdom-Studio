import { existsSync, readFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// A "brand pack" is a folder that lives outside this repo and holds a set of
// brands: their palettes, fonts, and optional image style. The app reads it at
// run time, so no brand data has to be committed here.
//
//   <pack>/brands.json     { brands: [...], fontFiles: { "Family": { normal, bold } } }
//   <pack>/fonts/*.woff    the font files named in fontFiles
//
// The format is documented in docs/brand-packs.md, with a sample pack in
// backend/test/fixtures/brand-pack.

const DEFAULT_PACK_DIR = path.join(os.homedir(), '.wisdom-studio', 'brands');

// Where to look for the pack: WISDOM_STUDIO_BRANDS_DIR if it is set (an empty
// value means "no pack"), otherwise ~/.wisdom-studio/brands.
export function brandPackDir() {
  const fromEnv = process.env.WISDOM_STUDIO_BRANDS_DIR;
  if (fromEnv === undefined) return DEFAULT_PACK_DIR;
  return fromEnv === '' ? null : fromEnv;
}

// Accessibility floor for every palette: a headline is at least 4.5:1 and body
// text at least 7:1 against the background. The border is decoration only.
const MIN_HEADLINE_CONTRAST = 4.5;
const MIN_BODY_CONTRAST = 7;

const HEX = /^#[0-9a-fA-F]{6}$/;
const KEY = /^[a-z][a-z0-9-]*$/;
const FONT_EXTENSIONS = /\.(woff2?|ttf|otf)$/i;
// A brand's image style is picked by the brand's key, so that key can't be one
// of the generic styles (services/imageGen/promptTemplates.js).
const GENERIC_STYLE_KEYS = ['general', 'storybook', 'flyer', 'coloring-page'];
const COLOR_FIELDS = ['background', 'border', 'headline', 'body'];

function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const lin = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

// WCAG 2.x contrast ratio between two #rrggbb colors.
export function contrastRatio(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const isText = (value) => typeof value === 'string' && value.trim() !== '';

function normalizePalette(brandKey, palette, where, problems) {
  if (!KEY.test(palette?.key ?? '')) problems.push(`${where}: palette "key" must be lower-case letters, digits and dashes`);
  if (!isText(palette?.label)) problems.push(`${where}: palette needs a "label"`);
  for (const field of COLOR_FIELDS) {
    if (!HEX.test(palette?.[field] ?? '')) problems.push(`${where}: "${field}" must be a 6-digit hex color like #1F3A5F`);
  }
  const colorsOk = COLOR_FIELDS.every((f) => HEX.test(palette?.[f] ?? ''));
  if (colorsOk) {
    const headline = contrastRatio(palette.headline, palette.background);
    const body = contrastRatio(palette.body, palette.background);
    if (headline < MIN_HEADLINE_CONTRAST) {
      problems.push(`${where}: headline is ${headline.toFixed(2)}:1 on the background, needs ${MIN_HEADLINE_CONTRAST}:1`);
    }
    if (body < MIN_BODY_CONTRAST) {
      problems.push(`${where}: body is ${body.toFixed(2)}:1 on the background, needs ${MIN_BODY_CONTRAST}:1`);
    }
  }
  // `suffix` is appended to a template's base key ('flyer' + '-navy-paper'). An
  // explicit suffix (even '') is kept so older saved designs still resolve.
  const suffix = typeof palette?.suffix === 'string' ? palette.suffix : `-${brandKey}-${palette?.key}`;
  return { ...palette, suffix };
}

function normalizeBrand(brand, index, problems) {
  const where = `brand ${index + 1}${isText(brand?.key) ? ` (${brand.key})` : ''}`;
  if (!KEY.test(brand?.key ?? '')) problems.push(`${where}: "key" must be lower-case letters, digits and dashes`);
  if (!isText(brand?.label)) problems.push(`${where}: needs a "label"`);
  if (!isText(brand?.fonts?.reading) || !isText(brand?.fonts?.display)) {
    problems.push(`${where}: "fonts" needs a "reading" and a "display" family`);
  }
  if (brand?.imageStyle !== undefined && (!isText(brand.imageStyle?.suffix) || !isText(brand.imageStyle?.negativePrompt))) {
    problems.push(`${where}: "imageStyle" needs a "suffix" and a "negativePrompt"`);
  }
  if (brand?.imageStyle !== undefined && GENERIC_STYLE_KEYS.includes(brand.key)) {
    problems.push(`${where}: "${brand.key}" is already a generic image style, so this brand needs another key`);
  }
  if (!Array.isArray(brand?.palettes) || brand.palettes.length === 0) {
    problems.push(`${where}: needs at least one palette`);
    return brand;
  }
  const palettes = brand.palettes.map((p, i) => normalizePalette(brand.key, p, `${where}, palette ${i + 1}`, problems));
  return { ...brand, shortLabel: isText(brand.shortLabel) ? brand.shortLabel : brand.label, palettes };
}

function resolveFontFiles(dir, fontFiles = {}, problems) {
  const resolved = {};
  for (const [family, files] of Object.entries(fontFiles)) {
    const check = (file) => {
      if (!isText(file) || file !== path.basename(file) || !FONT_EXTENSIONS.test(file)) {
        problems.push(`fontFiles "${family}": "${file}" must be a plain file name ending in .woff, .woff2, .ttf or .otf`);
        return null;
      }
      const full = path.join(dir, 'fonts', file);
      if (!existsSync(full)) {
        problems.push(`fontFiles "${family}": fonts/${file} does not exist`);
        return null;
      }
      return full;
    };
    const normal = check(files?.normal);
    const bold = files?.bold === undefined ? normal : check(files.bold);
    if (normal && bold) resolved[family] = { normal, bold };
  }
  return resolved;
}

// Reads and checks a brand pack. Throws one Error listing every problem found.
export function loadBrandPack(dir) {
  const file = path.join(dir, 'brands.json');
  if (!existsSync(file)) throw new Error(`No brands.json in ${dir}`);

  let json;
  try {
    json = JSON.parse(readFileSync(file, 'utf-8'));
  } catch {
    throw new Error(`${file} is not valid JSON`);
  }

  const problems = [];
  if (!Array.isArray(json?.brands) || json.brands.length === 0) {
    throw new Error(`${file} needs at least one brand`);
  }

  const brands = json.brands.map((b, i) => normalizeBrand(b, i, problems));

  const seenBrands = new Set();
  const seenKeys = new Map();
  for (const brand of brands) {
    if (seenBrands.has(brand.key)) problems.push(`duplicate brand key "${brand.key}"`);
    seenBrands.add(brand.key);
    for (const palette of brand.palettes ?? []) {
      const other = seenKeys.get(palette.suffix);
      if (other) problems.push(`${brand.key}/${palette.key} and ${other} have the same template suffix "${palette.suffix}"`);
      else seenKeys.set(palette.suffix, `${brand.key}/${palette.key}`);
    }
  }

  const fontFiles = resolveFontFiles(dir, json.fontFiles, problems);
  if (problems.length) throw new Error(`${file}:\n- ${problems.join('\n- ')}`);
  return { brands, fontFiles, dir };
}

// The pack the server is configured to use. Never throws: with no pack (or a
// folder that isn't there) it is empty, and a broken pack comes back empty with
// the reason in `error`, so the app keeps working with its built-in look.
export function getBrandPack() {
  const dir = brandPackDir();
  const empty = { brands: [], fontFiles: {}, dir: null };
  if (!dir || !existsSync(dir)) return empty;
  try {
    return loadBrandPack(dir);
  } catch (err) {
    return { ...empty, error: err.message };
  }
}
