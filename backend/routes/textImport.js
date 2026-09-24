import { Router } from 'express';
import { extractDocxText } from '../services/textImport/docxImport.js';

const router = Router();

router.post('/docx', async (req, res, next) => {
  try {
    const { base64 } = req.body || {};
    if (!base64) {
      return res.status(400).json({ error: 'A base64-encoded .docx file is required.' });
    }

    const buffer = Buffer.from(base64, 'base64');
    const text = await extractDocxText(buffer);
    res.json({ text });
  } catch (err) {
    if (err.message?.includes('.docx')) return res.status(400).json({ error: err.message });
    next(err);
  }
});

export default router;
