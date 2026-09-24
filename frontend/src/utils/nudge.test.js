import { describe, it, expect } from 'vitest';
import { nudgeDelta } from './nudge.js';

describe('nudgeDelta', () => {
  it('moves 1px per arrow key press by default', () => {
    expect(nudgeDelta('ArrowUp', false)).toEqual({ dx: 0, dy: -1 });
    expect(nudgeDelta('ArrowDown', false)).toEqual({ dx: 0, dy: 1 });
    expect(nudgeDelta('ArrowLeft', false)).toEqual({ dx: -1, dy: 0 });
    expect(nudgeDelta('ArrowRight', false)).toEqual({ dx: 1, dy: 0 });
  });

  it('moves 10px per press when Shift is held', () => {
    expect(nudgeDelta('ArrowUp', true)).toEqual({ dx: 0, dy: -10 });
    expect(nudgeDelta('ArrowDown', true)).toEqual({ dx: 0, dy: 10 });
    expect(nudgeDelta('ArrowLeft', true)).toEqual({ dx: -10, dy: 0 });
    expect(nudgeDelta('ArrowRight', true)).toEqual({ dx: 10, dy: 0 });
  });

  it('returns null for non-arrow keys', () => {
    expect(nudgeDelta('a', false)).toBeNull();
    expect(nudgeDelta('Enter', false)).toBeNull();
    expect(nudgeDelta('Escape', false)).toBeNull();
  });
});
