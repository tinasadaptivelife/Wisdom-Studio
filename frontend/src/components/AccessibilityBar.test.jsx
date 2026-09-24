import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import AccessibilityBar from './AccessibilityBar.jsx';

// Node's own global `localStorage` (no-op without --localstorage-file) can
// shadow jsdom's working implementation in the test environment, so stub a
// simple in-memory version rather than relying on the ambient global.
function createMemoryStorage() {
  let store = {};
  return {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => {
      store[k] = String(v);
    },
    removeItem: (k) => delete store[k],
    clear: () => {
      store = {};
    },
  };
}

beforeEach(() => {
  vi.stubGlobal('localStorage', createMemoryStorage());
  document.documentElement.style.fontSize = '';
  document.documentElement.removeAttribute('data-contrast');
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('AccessibilityBar', () => {
  it('defaults to 100% text size and normal contrast', () => {
    render(<AccessibilityBar />);
    expect(document.documentElement.style.fontSize).toBe('16px');
    expect(document.documentElement.getAttribute('data-contrast')).toBe('normal');
  });

  it('scales the root font size when the text-size slider changes', () => {
    render(<AccessibilityBar />);
    fireEvent.change(screen.getByLabelText(/text size/i), { target: { value: '200' } });
    expect(document.documentElement.style.fontSize).toBe('32px');
  });

  it('toggles data-contrast when the high-contrast checkbox changes', () => {
    render(<AccessibilityBar />);
    fireEvent.click(screen.getByLabelText(/high contrast/i));
    expect(document.documentElement.getAttribute('data-contrast')).toBe('high');
  });

  it('persists settings to localStorage and restores them on remount', () => {
    const { unmount } = render(<AccessibilityBar />);
    fireEvent.change(screen.getByLabelText(/text size/i), { target: { value: '150' } });
    fireEvent.click(screen.getByLabelText(/high contrast/i));
    unmount();

    render(<AccessibilityBar />);
    expect(document.documentElement.style.fontSize).toBe('24px');
    expect(document.documentElement.getAttribute('data-contrast')).toBe('high');
  });
});
