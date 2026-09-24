import { describe, it, expect } from 'vitest';
import { extractSelection } from './textSelection.js';

describe('extractSelection', () => {
  it('returns the trimmed substring for a normal selection', () => {
    expect(extractSelection('Once upon a time, a fox found a book.', 0, 16)).toBe('Once upon a time');
  });

  it('trims surrounding whitespace from the selection', () => {
    expect(extractSelection('a fox   found   a book', 1, 13)).toBe('fox   found');
  });

  it('returns an empty string for a collapsed (zero-length) selection', () => {
    expect(extractSelection('some text', 4, 4)).toBe('');
  });

  it('returns an empty string for a whitespace-only selection', () => {
    expect(extractSelection('fox   found', 3, 6)).toBe('');
  });

  it('returns an empty string when start is after end', () => {
    expect(extractSelection('some text', 5, 2)).toBe('');
  });
});
