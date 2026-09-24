import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import sharp from 'sharp';
import { PAGE_SIZES } from '../utils/pageSizes.js';

// Konva/CSS pixels (96dpi) -> PDF points (72dpi). Matches the frontend's
// exportPdf.js so server- and client-rendered PDFs agree on page size.
export function pxToPt(px) {
  return (px * 72) / 96;
}

export function computeLineX(lineWidthPt, boxXPt, boxWidthPt, align) {
  if (align === 'center') return boxXPt + (boxWidthPt - lineWidthPt) / 2;
  if (align === 'right') return boxXPt + boxWidthPt - lineWidthPt;
  return boxXPt;
}

// Top-left-origin (screen/Konva) y -> bottom-left-origin (PDF) y for the
// bottom edge of a box, given the box's height and the page height.
export function topLeftToPdfY(elementYpt, elementHeightPt, pageHeightPt) {
  return pageHeightPt - elementYpt - elementHeightPt;
}

// Greedy word-wrap: explicit newlines are respected first, then each line is
// broken on spaces to fit maxWidthPt. A single word wider than the box is
// kept whole on its own line rather than dropped or clipped.
export function wrapTextLines(text, font, fontSize, maxWidthPt) {
  const paragraphs = String(text).split('\n');
  const lines = [];
  for (const paragraph of paragraphs) {
    const words = paragraph.split(' ').filter((w) => w.length > 0);
    if (words.length === 0) {
      lines.push('');
      continue;
    }
    let current = words[0];
    for (const word of words.slice(1)) {
      const candidate = `${current} ${word}`;
      if (font.widthOfTextAtSize(candidate, fontSize) <= maxWidthPt) {
        current = candidate;
      } else {
        lines.push(current);
        current = word;
      }
    }
    lines.push(current);
  }
  return lines;
}

const hexToRgb = (hex) => {
  const clean = (hex || '#000000').replace('#', '');
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  const num = parseInt(full, 16) || 0;
  return rgb(((num >> 16) & 255) / 255, ((num >> 8) & 255) / 255, (num & 255) / 255);
};

async function defaultFetchImageBytes(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch image (${res.status})`);
  return Buffer.from(await res.arrayBuffer());
}

async function drawText(page, font, element, pageHeightPt) {
  const x = pxToPt(element.x);
  const boxWidth = pxToPt(element.width);
  const fontSize = pxToPt(element.fontSize || 16);
  const color = hexToRgb(element.fill);
  const lines = wrapTextLines(element.text || '', font, fontSize, boxWidth);
  const lineHeight = fontSize * 1.2;

  // Top-aligned within the box, matching the canvas Text node's default.
  let cursorYTop = element.y;
  for (const line of lines) {
    const lineWidth = font.widthOfTextAtSize(line, fontSize);
    const lineX = computeLineX(lineWidth, x, boxWidth, element.align);
    const baselineYpt = topLeftToPdfY(pxToPt(cursorYTop), fontSize, pageHeightPt) + fontSize * 0.2;
    if (cursorYTop <= element.y + element.height) {
      page.drawText(line, { x: lineX, y: baselineYpt, size: fontSize, font, color });
    }
    cursorYTop += lineHeight / (72 / 96);
  }
}

function drawRect(page, element, pageHeightPt) {
  page.drawRectangle({
    x: pxToPt(element.x),
    y: topLeftToPdfY(pxToPt(element.y), pxToPt(element.height), pageHeightPt),
    width: pxToPt(element.width),
    height: pxToPt(element.height),
    color: hexToRgb(element.fill),
    borderColor: hexToRgb(element.stroke),
    borderWidth: element.strokeWidth ? pxToPt(element.strokeWidth) : 0,
  });
}

function drawEllipse(page, element, pageHeightPt) {
  const xScale = pxToPt(element.width) / 2;
  const yScale = pxToPt(element.height) / 2;
  page.drawEllipse({
    x: pxToPt(element.x) + xScale,
    y: topLeftToPdfY(pxToPt(element.y), pxToPt(element.height), pageHeightPt) + yScale,
    xScale,
    yScale,
    color: hexToRgb(element.fill),
    borderColor: hexToRgb(element.stroke),
    borderWidth: element.strokeWidth ? pxToPt(element.strokeWidth) : 0,
  });
}

async function drawImage(pdfDoc, page, element, pageHeightPt, fetchImageBytes) {
  const rawBytes = await fetchImageBytes(element.src);
  const pngBytes = await sharp(rawBytes).png().toBuffer();
  const image = await pdfDoc.embedPng(pngBytes);
  page.drawImage(image, {
    x: pxToPt(element.x),
    y: topLeftToPdfY(pxToPt(element.y), pxToPt(element.height), pageHeightPt),
    width: pxToPt(element.width),
    height: pxToPt(element.height),
  });
}

export async function renderProjectToPdf(project, { fetchImageBytes = defaultFetchImageBytes } = {}) {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const { width: pageWidthPx, height: pageHeightPx } = PAGE_SIZES[project.pageSize];
  const pageWidthPt = pxToPt(pageWidthPx);
  const pageHeightPt = pxToPt(pageHeightPx);

  for (const projectPage of project.pages) {
    const page = pdfDoc.addPage([pageWidthPt, pageHeightPt]);
    for (const element of projectPage.elements) {
      if (element.visible === false) continue;
      try {
        if (element.type === 'text') {
          await drawText(page, font, element, pageHeightPt);
        } else if (element.type === 'rect') {
          drawRect(page, element, pageHeightPt);
        } else if (element.type === 'ellipse') {
          drawEllipse(page, element, pageHeightPt);
        } else if (element.type === 'image') {
          await drawImage(pdfDoc, page, element, pageHeightPt, fetchImageBytes);
        }
        // image-placeholder: intentionally left blank in the export — an
        // unfilled placeholder has nothing print-ready to show.
      } catch (err) {
        // A single bad image (network failure, corrupt data) shouldn't sink
        // the whole export — skip it and keep going.
        continue;
      }
    }
  }

  return pdfDoc.save();
}
