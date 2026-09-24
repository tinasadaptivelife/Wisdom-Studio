import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Shared border/frame image library — any digital asset type (quote cards,
// workbooks, coloring pages, flyers, ...) pulls from this single registry
// rather than keeping its own copies. See backend/assets/borders/manifest.json.
// WISDOM_STUDIO_BORDERS_DIR overrides it (tests point it at fixtures).
export const BORDERS_DIR = process.env.WISDOM_STUDIO_BORDERS_DIR
  ? path.resolve(process.env.WISDOM_STUDIO_BORDERS_DIR)
  : path.join(__dirname, '..', 'assets', 'borders');

function readJson(file) {
  return JSON.parse(readFileSync(file, 'utf-8'));
}

// manifest.json holds the borders that ship with the repo. Private brand art
// is listed in an untracked manifest.local.json next
// to it, with its image files gitignored, so it works locally but is never
// published.
export function loadManifest(dir = BORDERS_DIR) {
  const localFile = path.join(dir, 'manifest.local.json');
  const local = existsSync(localFile) ? readJson(localFile) : [];
  return [...readJson(path.join(dir, 'manifest.json')), ...local];
}

function withUrl(border) {
  return { ...border, url: `/api/borders/assets/${border.file}` };
}

export function listBorders({ tag, brand } = {}) {
  return loadManifest()
    .filter((b) => !tag || b.tags.includes(tag))
    .filter((b) => !brand || b.brands.includes(brand))
    .map(withUrl);
}

export function getBorder(id) {
  return listBorders().find((b) => b.id === id) ?? null;
}
