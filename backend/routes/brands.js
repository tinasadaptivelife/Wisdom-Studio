import { Router } from 'express';
import path from 'node:path';
import { getBrandPack } from '../services/brandPack.js';

const router = Router();

// One @font-face entry per distinct file: a family with a single file (or one
// file for both weights) is listed once, at weight 400.
export function fontFaces(fontFiles) {
  const faces = [];
  for (const [family, { normal, bold }] of Object.entries(fontFiles)) {
    faces.push({ family, weight: 400, url: `/api/brands/fonts/${path.basename(normal)}` });
    if (bold !== normal) faces.push({ family, weight: 700, url: `/api/brands/fonts/${path.basename(bold)}` });
  }
  return faces;
}

// The brands the app can design in. With no brand pack this is empty and the
// clients fall back to their built-in look; a pack that couldn't be read is
// reported in `error` so it isn't silently ignored.
router.get('/', (req, res) => {
  const { brands, fontFiles, error } = getBrandPack();
  if (error) console.warn(`Brand pack ignored: ${error}`);
  res.json({ brands, fonts: fontFaces(fontFiles), ...(error ? { error } : {}) });
});

// Only files the pack lists are served, never an arbitrary path.
router.get('/fonts/:file', (req, res) => {
  const { fontFiles } = getBrandPack();
  const file = Object.values(fontFiles)
    .flatMap(({ normal, bold }) => [normal, bold])
    .find((f) => path.basename(f) === req.params.file);
  if (!file) return res.status(404).json({ error: 'Font not found' });
  res.sendFile(file);
});

export default router;
