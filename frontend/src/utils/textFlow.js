// Estimates how much text fits in a box using average-character-width and
// line-height heuristics. Konva Text re-wraps by actual pixel width on the
// canvas, so an imprecise estimate here only shifts page breaks slightly —
// it never breaks layout.
export function estimateCapacity({ width, height, fontSize, avgCharWidthRatio = 0.55, lineHeightRatio = 1.3 }) {
  const charWidth = fontSize * avgCharWidthRatio;
  const lineHeight = fontSize * lineHeightRatio;
  return {
    charsPerLine: Math.max(1, Math.floor(width / charWidth)),
    linesPerPage: Math.max(1, Math.floor(height / lineHeight)),
  };
}

export function wrapParagraph(paragraph, charsPerLine) {
  const words = paragraph.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [''];

  const lines = [];
  let line = '';
  for (const word of words) {
    if (word.length > charsPerLine) {
      if (line) {
        lines.push(line);
        line = '';
      }
      let remaining = word;
      while (remaining.length > charsPerLine) {
        lines.push(remaining.slice(0, charsPerLine));
        remaining = remaining.slice(charsPerLine);
      }
      line = remaining;
      continue;
    }
    const candidate = line ? `${line} ${word}` : word;
    if (candidate.length > charsPerLine) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export function flowTextIntoPages(text, { charsPerLine, linesPerPage }) {
  if (!text || !text.trim()) return [];

  const paragraphs = text.split(/\n\s*\n/);
  const pages = [];
  let currentLines = [];

  const flush = () => {
    pages.push(currentLines.join('\n'));
    currentLines = [];
  };

  paragraphs.forEach((paragraph, i) => {
    for (const line of wrapParagraph(paragraph, charsPerLine)) {
      if (currentLines.length >= linesPerPage) flush();
      currentLines.push(line);
    }
    if (i < paragraphs.length - 1) {
      if (currentLines.length >= linesPerPage) flush();
      currentLines.push('');
    }
  });

  if (currentLines.length) flush();
  return pages;
}
