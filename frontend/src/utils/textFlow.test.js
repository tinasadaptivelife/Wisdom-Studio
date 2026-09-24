import { describe, it, expect } from 'vitest';
import { estimateCapacity, wrapParagraph, flowTextIntoPages } from './textFlow.js';

describe('estimateCapacity', () => {
  it('derives chars-per-line and lines-per-page from box dimensions and font size', () => {
    const capacity = estimateCapacity({
      width: 100,
      height: 130,
      fontSize: 10,
      avgCharWidthRatio: 0.5,
      lineHeightRatio: 1.3,
    });
    expect(capacity).toEqual({ charsPerLine: 20, linesPerPage: 10 });
  });

  it('never returns zero, even for a tiny box', () => {
    const capacity = estimateCapacity({ width: 1, height: 1, fontSize: 40 });
    expect(capacity.charsPerLine).toBeGreaterThanOrEqual(1);
    expect(capacity.linesPerPage).toBeGreaterThanOrEqual(1);
  });
});

describe('wrapParagraph', () => {
  it('greedily wraps words to fit the line width', () => {
    expect(wrapParagraph('the quick brown fox jumps', 10)).toEqual(['the quick', 'brown fox', 'jumps']);
  });

  it('hard-breaks a single word longer than the line width', () => {
    expect(wrapParagraph('supercalifragilisticexpialidocious', 10)).toEqual([
      'supercalif',
      'ragilistic',
      'expialidoc',
      'ious',
    ]);
  });

  it('returns a single blank line for empty/whitespace input', () => {
    expect(wrapParagraph('   ', 10)).toEqual(['']);
  });
});

describe('flowTextIntoPages', () => {
  it('returns a single page when the text fits within capacity', () => {
    const pages = flowTextIntoPages('Hello world', { charsPerLine: 20, linesPerPage: 5 });
    expect(pages).toEqual(['Hello world']);
  });

  it('splits long text across multiple pages once it exceeds capacity', () => {
    const pages = flowTextIntoPages('aa bb cc dd ee ff', { charsPerLine: 5, linesPerPage: 2 });
    expect(pages).toEqual(['aa bb\ncc dd', 'ee ff']);
  });

  it('preserves paragraph breaks (blank lines) within a page', () => {
    const pages = flowTextIntoPages('Para one.\n\nPara two.', { charsPerLine: 50, linesPerPage: 10 });
    expect(pages).toEqual(['Para one.\n\nPara two.']);
  });

  it('returns no pages for empty or whitespace-only text', () => {
    expect(flowTextIntoPages('   ', { charsPerLine: 20, linesPerPage: 5 })).toEqual([]);
    expect(flowTextIntoPages('', { charsPerLine: 20, linesPerPage: 5 })).toEqual([]);
  });
});
