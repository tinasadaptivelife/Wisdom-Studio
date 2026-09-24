import { Router } from 'express';
import express from 'express';
import { listBorders, getBorder, BORDERS_DIR } from '../services/borderLibrary.js';

const router = Router();

router.get('/', (req, res) => {
  const { tag, brand } = req.query;
  res.json({ borders: listBorders({ tag, brand }) });
});

router.get('/:id', (req, res) => {
  const border = getBorder(req.params.id);
  if (!border) return res.status(404).json({ error: 'Border not found' });
  res.json(border);
});

router.use('/assets', express.static(BORDERS_DIR));

export default router;
