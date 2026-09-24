import { Router } from 'express';
import { db } from '../db.js';
import { renderProjectToPdf } from '../services/pdfExport.js';

const router = Router();

const rowToSummary = (row) => {
  const data = JSON.parse(row.data);
  return {
    id: row.id,
    name: row.name,
    pageSize: row.page_size,
    templateKey: row.template_key,
    pageCount: data.pages?.length ?? 1,
    ...(data.thumbnail ? { thumbnail: data.thumbnail } : {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

const rowToProject = (row) => ({
  ...JSON.parse(row.data),
  id: row.id,
  name: row.name,
  pageSize: row.page_size,
  templateKey: row.template_key,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM projects ORDER BY updated_at DESC').all();
  res.json(rows.map(rowToSummary));
});

router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Project not found' });
  res.json(rowToProject(row));
});

router.post('/', (req, res) => {
  const project = req.body;
  if (!project?.id || !project?.name || !project?.pageSize || !Array.isArray(project?.pages)) {
    return res.status(400).json({ error: 'Invalid project payload' });
  }
  const now = new Date().toISOString();
  const createdAt = project.createdAt || now;
  const updatedAt = project.updatedAt || now;
  db.prepare(
    `INSERT INTO projects (id, name, page_size, template_key, data, created_at, updated_at)
     VALUES (@id, @name, @pageSize, @templateKey, @data, @createdAt, @updatedAt)
     ON CONFLICT(id) DO UPDATE SET
       name = excluded.name,
       page_size = excluded.page_size,
       template_key = excluded.template_key,
       data = excluded.data,
       updated_at = excluded.updated_at`
  ).run({
    id: project.id,
    name: project.name,
    pageSize: project.pageSize,
    templateKey: project.templateKey || null,
    data: JSON.stringify(project),
    createdAt,
    updatedAt,
  });
  const row = db.prepare('SELECT * FROM projects WHERE id = ?').get(project.id);
  res.status(201).json(rowToProject(row));
});

router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Project not found' });
  const project = { ...req.body, id: req.params.id };
  const updatedAt = new Date().toISOString();
  db.prepare(
    `UPDATE projects SET name = ?, page_size = ?, template_key = ?, data = ?, updated_at = ? WHERE id = ?`
  ).run(project.name, project.pageSize, project.templateKey || null, JSON.stringify(project), updatedAt, req.params.id);
  const row = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  res.json(rowToProject(row));
});

router.get('/:id/pdf', async (req, res, next) => {
  try {
    const row = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Project not found' });
    const project = rowToProject(row);
    const bytes = await renderProjectToPdf(project);
    res.setHeader('Content-Type', 'application/pdf');
    // HTTP header values must be Latin-1-safe; project names can contain
    // arbitrary Unicode (em dashes, accents, emoji), so the plain filename
    // param is ASCII-sanitized and the real name travels via the RFC 5987
    // filename* param, which every modern browser honors.
    const rawName = project.name || 'project';
    const asciiName = rawName.replace(/[^\x20-\x7E]/g, '_');
    const encodedName = encodeURIComponent(rawName);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${asciiName}.pdf"; filename*=UTF-8''${encodedName}.pdf`
    );
    res.send(Buffer.from(bytes));
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', (req, res) => {
  const info = db.prepare('DELETE FROM projects WHERE id = ?').run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: 'Project not found' });
  res.status(204).end();
});

export default router;
