import path from 'node:path';
import { describe, it, expect, afterEach } from 'vitest';
import { StandardFonts, PDFDocument, PDFName, PDFDict } from 'pdf-lib';
import sharp from 'sharp';
import {
  pxToPt,
  wrapTextLines,
  computeLineX,
  topLeftToPdfY,
  renderProjectToPdf,
} from './pdfExport.js';

describe('pxToPt', () => {
  it('converts 96dpi screen pixels to 72pt PDF units', () => {
    expect(pxToPt(96)).toBe(72);
    expect(pxToPt(816)).toBe(612);
  });
});

describe('computeLineX', () => {
  it('left-aligns at the box start', () => {
    expect(computeLineX(50, 100, 300, 'left')).toBe(100);
  });

  it('centers within the box', () => {
    expect(computeLineX(100, 100, 300, 'center')).toBe(200);
  });

  it('right-aligns to the box end', () => {
    expect(computeLineX(50, 100, 300, 'right')).toBe(350);
  });
});

describe('topLeftToPdfY', () => {
  it('flips a top-left-origin y into PDF bottom-left-origin y', () => {
    // A box at y=0 with height=100 on an 800pt-tall page sits at the very
    // top on screen, so its PDF-space bottom edge is at 800-0-100=700.
    expect(topLeftToPdfY(0, 100, 800)).toBe(700);
  });

  it('places a box flush with the page bottom correctly', () => {
    expect(topLeftToPdfY(700, 100, 800)).toBe(0);
  });
});

describe('wrapTextLines', () => {
  const font = { widthOfTextAtSize: (text, size) => text.length * size * 0.5 };

  it('respects explicit newlines', () => {
    const lines = wrapTextLines('Hello\nWorld', font, 10, 1000);
    expect(lines).toEqual(['Hello', 'World']);
  });

  it('wraps long lines to fit the given width', () => {
    // Each char ~5pt wide at size 10; width 40 fits ~8 chars.
    const lines = wrapTextLines('one two three four', font, 10, 40);
    expect(lines.length).toBeGreaterThan(1);
    for (const line of lines) {
      expect(font.widthOfTextAtSize(line, 10)).toBeLessThanOrEqual(40 + 1e-6);
    }
    expect(lines.join(' ')).toBe('one two three four');
  });

  it('never drops words, even a single word wider than the box', () => {
    const lines = wrapTextLines('supercalifragilisticexpialidocious short', font, 10, 40);
    expect(lines.join(' ')).toContain('supercalifragilisticexpialidocious');
    expect(lines.join(' ')).toContain('short');
  });
});

describe('renderProjectToPdf', () => {
  const baseProject = (elements) => ({
    pageSize: 'letter',
    pages: [{ id: 'page_1', elements }],
  });

  it('renders text, rectangle, and ellipse elements into a valid, correctly-sized PDF', async () => {
    const project = baseProject([
      { id: 'el1', type: 'text', x: 48, y: 48, width: 400, height: 60, rotation: 0, text: 'Hello world', fontSize: 24, fill: '#1d3557', align: 'left', visible: true },
      { id: 'el2', type: 'rect', x: 48, y: 120, width: 200, height: 100, rotation: 0, fill: '#f4a259', stroke: '#c97a2e', strokeWidth: 2, visible: true },
      { id: 'el3', type: 'ellipse', x: 300, y: 120, width: 100, height: 100, rotation: 0, fill: '#8ecae6', stroke: '#1d3557', strokeWidth: 1, visible: true },
    ]);

    const bytes = await renderProjectToPdf(project);
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBe(1);
    expect(doc.getPage(0).getWidth()).toBe(612);
    expect(doc.getPage(0).getHeight()).toBe(792);
  });

  it('skips hidden elements', async () => {
    const project = baseProject([
      { id: 'el1', type: 'text', x: 48, y: 48, width: 400, height: 60, rotation: 0, text: 'hidden', fontSize: 24, fill: '#000', align: 'left', visible: false },
    ]);
    const bytes = await renderProjectToPdf(project);
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBe(1);
  });

  it('renders multiple pages, one per project page', async () => {
    const project = {
      pageSize: 'a4',
      pages: [{ id: 'p1', elements: [] }, { id: 'p2', elements: [] }],
    };
    const bytes = await renderProjectToPdf(project);
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBe(2);
  });

  it('embeds a real generated image, converting webp to PNG via sharp', async () => {
    const webpBytes = await sharp({
      create: { width: 20, height: 20, channels: 3, background: { r: 100, g: 150, b: 200 } },
    })
      .webp()
      .toBuffer();

    const project = baseProject([
      { id: 'el1', type: 'image', x: 48, y: 48, width: 200, height: 200, rotation: 0, src: 'https://example.com/fake.webp', visible: true },
    ]);

    const bytes = await renderProjectToPdf(project, {
      fetchImageBytes: async () => webpBytes,
    });
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBe(1);
  });

  it('keeps exporting even if one image fails to fetch or embed', async () => {
    const project = baseProject([
      { id: 'el1', type: 'image', x: 48, y: 48, width: 200, height: 200, rotation: 0, src: 'https://example.com/broken.webp', visible: true },
      { id: 'el2', type: 'text', x: 48, y: 300, width: 400, height: 60, rotation: 0, text: 'still here', fontSize: 20, fill: '#000', align: 'left', visible: true },
    ]);

    const bytes = await renderProjectToPdf(project, {
      fetchImageBytes: async () => {
        throw new Error('network down');
      },
    });
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBe(1);
  });
});

// Names of every font embedded in a PDF (BaseFont of each /Font dictionary).
async function embeddedFontNames(bytes) {
  const doc = await PDFDocument.load(bytes);
  const names = [];
  for (const [, obj] of doc.context.enumerateIndirectObjects()) {
    const base = obj?.get?.(PDFName.of('BaseFont'));
    if (base) names.push(base.toString());
  }
  return names;
}

describe('renderProjectToPdf brand fonts', () => {
  afterEach(() => {
    process.env.WISDOM_STUDIO_BRANDS_DIR = '';
  });


  const textProject = (fontFamily, text = 'The river remembers.', extra = {}) => ({
    pageSize: 'letter',
    pages: [
      {
        id: 'p1',
        elements: [
          { id: 'e1', type: 'text', x: 40, y: 40, width: 600, height: 80, fontSize: 40, fontFamily, fill: '#111111', text, align: 'left', ...extra },
        ],
      },
    ],
  });

  it('embeds Atkinson Hyperlegible when a text element asks for it', async () => {
    const names = await embeddedFontNames(await renderProjectToPdf(textProject('Atkinson Hyperlegible, sans-serif')));
    expect(names.some((n) => /Atkinson/i.test(n))).toBe(true);
    expect(names.some((n) => /Helvetica/i.test(n))).toBe(false);
  });

  it('embeds a brand pack font when the pack has one, and Helvetica when it does not', async () => {
    const title = textProject('Example Display, serif', 'Title', { fontStyle: 'bold' });
    // The fixture pack's "Example Display" files are copies of Atkinson
    // Hyperlegible, so the embedded name shows they were used.
    process.env.WISDOM_STUDIO_BRANDS_DIR = path.resolve('test/fixtures/brand-pack');
    const withPack = await embeddedFontNames(await renderProjectToPdf(title));
    expect(withPack.some((n) => /Atkinson.*Bold/i.test(n))).toBe(true);
    expect(withPack.some((n) => /Helvetica/i.test(n))).toBe(false);

    process.env.WISDOM_STUDIO_BRANDS_DIR = '';
    const withoutPack = await embeddedFontNames(await renderProjectToPdf(title));
    expect(withoutPack.some((n) => /Helvetica/i.test(n))).toBe(true);
  });

  it('falls back to Helvetica for a family it has no file for', async () => {
    const names = await embeddedFontNames(await renderProjectToPdf(textProject('Poppins, Arial, sans-serif')));
    expect(names.some((n) => /Helvetica/i.test(n))).toBe(true);
  });

  it('sets accented letters, em dashes and curly quotes without failing', async () => {
    const bytes = await renderProjectToPdf(textProject('Atkinson Hyperlegible', '“Rían” — dez’s café'));
    expect(bytes.length).toBeGreaterThan(1000);
  });

  it('draws two elements in different families in one document', async () => {
    const project = textProject('Atkinson Hyperlegible');
    project.pages[0].elements.push({ id: 'e2', type: 'text', x: 40, y: 200, width: 600, height: 80, fontSize: 40, fontFamily: 'Poppins', fill: '#111111', text: 'Title', align: 'left' });
    const names = await embeddedFontNames(await renderProjectToPdf(project));
    expect(names.some((n) => /Atkinson/i.test(n))).toBe(true);
    expect(names.some((n) => /Helvetica/i.test(n))).toBe(true);
  });
});

describe('renderProjectToPdf rectangle opacity', () => {
  const rectProject = (opacity) => ({
    pageSize: 'letter',
    pages: [
      {
        id: 'p1',
        elements: [
          { id: 'r1', type: 'rect', x: 0, y: 0, width: 400, height: 400, fill: '#111111', stroke: '#999999', strokeWidth: 0, ...(opacity == null ? {} : { opacity }) },
        ],
      },
    ],
  });

  // Fill opacities (/ca) in the page's graphics states (its ExtGState resources).
  async function fillOpacities(bytes) {
    const doc = await PDFDocument.load(bytes);
    const states = doc.getPage(0).node.Resources()?.lookup(PDFName.of('ExtGState'), PDFDict);
    if (!states) return [];
    return states.entries().map(([, ref]) => Number(doc.context.lookup(ref, PDFDict).get(PDFName.of('ca'))?.toString()));
  }

  it('draws a translucent rectangle when the element has an opacity below 1', async () => {
    expect(await fillOpacities(await renderProjectToPdf(rectProject(0.5)))).toContain(0.5);
  });

  it('draws an ordinary rectangle, with no transparency, when there is no opacity', async () => {
    expect(await fillOpacities(await renderProjectToPdf(rectProject()))).toEqual([]);
  });
});
