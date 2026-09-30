import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getBrandPack } from './brandPack.js';

const FONTS_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'fonts');

// The font that ships with the app (see assets/fonts/README.md). Keys are
// lower-case family names; `normal` and `bold` name the file for each style.
const BUNDLED = {
  'atkinson hyperlegible': {
    normal: path.join(FONTS_DIR, 'atkinson-hyperlegible-latin-400-normal.woff'),
    bold: path.join(FONTS_DIR, 'atkinson-hyperlegible-latin-700-normal.woff'),
  },
};

// First family of a CSS font stack, without quotes, lower-cased.
const firstFamily = (fontFamily) =>
  String(fontFamily ?? '')
    .split(',')[0]
    .replace(/["']/g, '')
    .trim()
    .toLowerCase();

// Fonts from the brand pack, keyed the same way. Read on each call so an edit
// to the pack shows up on the next export.
function packFamilies() {
  const { fontFiles } = getBrandPack();
  return Object.fromEntries(Object.entries(fontFiles).map(([family, files]) => [family.toLowerCase(), files]));
}

// Returns the path of the font file for a template's fontFamily/fontStyle, or
// null when there isn't one (the caller then falls back to Helvetica).
export function resolveFontFile(fontFamily, fontStyle = 'normal') {
  const key = firstFamily(fontFamily);
  const family = packFamilies()[key] ?? BUNDLED[key];
  if (!family) return null;
  return /bold/i.test(fontStyle) ? family.bold : family.normal;
}

export function loadFontBytes(file) {
  return readFileSync(file);
}
