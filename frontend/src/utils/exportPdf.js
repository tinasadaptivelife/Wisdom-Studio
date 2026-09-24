import { PDFDocument } from 'pdf-lib';
import { PAGE_SIZES } from './pageSizes.js';

// Konva stages are captured at 96dpi screen pixels; PDF units are 72pt/inch.
const PX_TO_PT = 72 / 96;

export function pageSizePt(pageSizeKey) {
  const { width, height } = PAGE_SIZES[pageSizeKey];
  return { width: width * PX_TO_PT, height: height * PX_TO_PT };
}

function dataUrlToBytes(dataUrl) {
  const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

// Standard saddle-stitch booklet imposition order: pads to the next multiple
// of 4 (blank pages fill the remainder), then interleaves from the outside
// in — e.g. 8 pages print/fold as 8,1,2,7,6,3,4,5 (1-indexed).
export function bookletPageOrder(pageCount) {
  const padded = Math.ceil(pageCount / 4) * 4;
  const order = [];
  let low = 0;
  let high = padded - 1;
  while (low < high) {
    order.push(high, low, low + 1, high - 1);
    low += 2;
    high -= 2;
  }
  return order;
}

export async function buildPdfBytes(pageDataUrls, pageSizeKey, { booklet = false } = {}) {
  if (!pageDataUrls?.length) {
    throw new Error('At least one page image is required to build a PDF.');
  }

  const pdfDoc = await PDFDocument.create();
  const { width, height } = pageSizePt(pageSizeKey);
  const order = booklet ? bookletPageOrder(pageDataUrls.length) : pageDataUrls.map((_, i) => i);

  for (const index of order) {
    const page = pdfDoc.addPage([width, height]);
    if (index < pageDataUrls.length) {
      const image = await pdfDoc.embedPng(dataUrlToBytes(pageDataUrls[index]));
      page.drawImage(image, { x: 0, y: 0, width, height });
    }
    // else: index falls in the booklet padding — a blank page, nothing to draw.
  }

  return pdfDoc.save();
}

export function sanitizeFilename(name) {
  const cleaned = (name || '')
    .trim()
    .replace(/[^\w\- ]+/g, '')
    .trim()
    .replace(/\s+/g, '-');
  return cleaned || 'Untitled';
}
