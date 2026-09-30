import express from 'express';
import cors from 'cors';
import projectsRouter from './routes/projects.js';
import imageGenRouter from './routes/imageGen.js';
import textImportRouter from './routes/textImport.js';
import bordersRouter from './routes/borders.js';
import brandsRouter from './routes/brands.js';
import './db.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mountFrontend } from './staticFrontend.js';

export const app = express();

app.use(cors());
app.use(express.json({ limit: '5mb' }));

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/projects', projectsRouter);
app.use('/api/image-gen', imageGenRouter);
app.use('/api/import', textImportRouter);
app.use('/api/borders', bordersRouter);
app.use('/api/brands', brandsRouter);

// If the frontend has been built (npm run build in frontend/), serve it from
// here too. WISDOM_STUDIO_STATIC_DIR overrides where to look.
mountFrontend(
  app,
  process.env.WISDOM_STUDIO_STATIC_DIR
    ? path.resolve(process.env.WISDOM_STUDIO_STATIC_DIR)
    : path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'frontend', 'dist')
);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});
