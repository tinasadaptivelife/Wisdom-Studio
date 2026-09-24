import { describe, it, expect } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { buildPdfBytes, bookletPageOrder, pageSizePt, sanitizeFilename } from './exportPdf.js';

// A valid, minimal 1x1 transparent PNG.
const TINY_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

describe('pageSizePt', () => {
  it('converts the 96dpi US Letter page size to 72pt PDF units', () => {
    expect(pageSizePt('letter')).toEqual({ width: 612, height: 792 });
  });

  it('converts A4 to 72pt PDF units', () => {
    const { width, height } = pageSizePt('a4');
    expect(width).toBeCloseTo(595.5, 1);
    expect(height).toBeCloseTo(842.25, 1);
  });
});

describe('buildPdfBytes', () => {
  it('produces a real, loadable PDF with one page per input image at the correct size', async () => {
    const bytes = await buildPdfBytes([TINY_PNG, TINY_PNG, TINY_PNG], 'letter');
    const doc = await PDFDocument.load(bytes);

    expect(doc.getPageCount()).toBe(3);
    const page = doc.getPage(0);
    expect(page.getWidth()).toBe(612);
    expect(page.getHeight()).toBe(792);
  });

  it('sizes pages for A4 when requested', async () => {
    const bytes = await buildPdfBytes([TINY_PNG], 'a4');
    const doc = await PDFDocument.load(bytes);
    const page = doc.getPage(0);
    expect(page.getWidth()).toBeCloseTo(595.5, 1);
  });

  it('rejects an empty page list rather than producing a blank PDF', async () => {
    await expect(buildPdfBytes([], 'letter')).rejects.toThrow(/page/i);
  });
});

describe('bookletPageOrder', () => {
  it('returns the standard saddle-stitch order for an exact multiple of 4', () => {
    expect(bookletPageOrder(4)).toEqual([3, 0, 1, 2]);
    expect(bookletPageOrder(8)).toEqual([7, 0, 1, 6, 5, 2, 3, 4]);
  });

  it('pads up to the next multiple of 4 before ordering', () => {
    expect(bookletPageOrder(6)).toEqual([7, 0, 1, 6, 5, 2, 3, 4]);
  });

  it('handles a larger page count', () => {
    expect(bookletPageOrder(10)).toEqual([11, 0, 1, 10, 9, 2, 3, 8, 7, 4, 5, 6]);
  });
});

describe('buildPdfBytes with booklet ordering', () => {
  it('pads the output to a multiple of 4 pages with blanks, reordered for folding', async () => {
    const bytes = await buildPdfBytes([TINY_PNG, TINY_PNG, TINY_PNG], 'letter', { booklet: true });
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBe(4);
  });

  it('produces normal sequential order when booklet is not requested', async () => {
    const bytes = await buildPdfBytes([TINY_PNG, TINY_PNG, TINY_PNG], 'letter');
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBe(3);
  });
});

describe('sanitizeFilename', () => {
  it('turns a project name into a safe, hyphenated filename stem', () => {
    expect(sanitizeFilename('My Summer Flyer!')).toBe('My-Summer-Flyer');
  });

  it('falls back to Untitled for empty or fully-unsafe input', () => {
    expect(sanitizeFilename('')).toBe('Untitled');
    expect(sanitizeFilename('???')).toBe('Untitled');
  });
});
