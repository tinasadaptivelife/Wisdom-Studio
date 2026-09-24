import express from 'express';
import cors from 'cors';
import projectsRouter from './routes/projects.js';
import imageGenRouter from './routes/imageGen.js';
import textImportRouter from './routes/textImport.js';
import bordersRouter from './routes/borders.js';
import './db.js';

export const app = express();

app.use(cors());
app.use(express.json({ limit: '5mb' }));

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/projects', projectsRouter);
app.use('/api/image-gen', imageGenRouter);
app.use('/api/import', textImportRouter);
app.use('/api/borders', bordersRouter);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});
