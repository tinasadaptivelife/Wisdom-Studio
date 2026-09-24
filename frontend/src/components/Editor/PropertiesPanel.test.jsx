import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import PropertiesPanel from './PropertiesPanel.jsx';
import { useDesignStore } from '../../store/useDesignStore.js';

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({ ok: true, json: async () => ({ models: [], default: 'stable_diffusion' }) })
  );
  useDesignStore.getState().closeProject();
  useDesignStore.getState().newProjectFromTemplate('blank');
  useDesignStore.getState().addElement('text');
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('PropertiesPanel text editing', () => {
  it('lets the user edit a text element’s content from the keyboard via a labeled field', () => {
    render(<PropertiesPanel />);

    const field = screen.getByLabelText(/text content/i);
    expect(field.tagName).toBe('TEXTAREA');

    fireEvent.change(field, { target: { value: 'Hello from the keyboard' } });

    const el = useDesignStore.getState().project.pages[0].elements[0];
    expect(el.text).toBe('Hello from the keyboard');
  });

  it('does not show a text content field for non-text elements', () => {
    useDesignStore.getState().addElement('rect');
    render(<PropertiesPanel />);
    expect(screen.queryByLabelText(/text content/i)).toBeNull();
  });
});

describe('PropertiesPanel speech features', () => {
  it('hides dictation and read-aloud buttons when the browser has no Web Speech support', () => {
    render(<PropertiesPanel />);
    expect(screen.queryByRole('button', { name: /dictation/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /read aloud/i })).toBeNull();
  });

  it('appends a final dictation transcript to the existing text via updateElement', () => {
    let recognitionInstance;
    class MockRecognition {
      constructor() {
        recognitionInstance = this;
      }
      start() {}
      stop() {}
    }
    vi.stubGlobal('SpeechRecognition', MockRecognition);
    useDesignStore.getState().updateElement(useDesignStore.getState().project.pages[0].elements[0].id, {
      text: 'Once upon a time.',
    });

    render(<PropertiesPanel />);
    fireEvent.click(screen.getByRole('button', { name: /start dictation/i }));

    recognitionInstance.onresult({
      resultIndex: 0,
      results: [Object.assign([{ transcript: 'a fox appeared' }], { isFinal: true })],
    });

    const el = useDesignStore.getState().project.pages[0].elements[0];
    expect(el.text).toBe('Once upon a time. a fox appeared');
  });

  it('reads the element text aloud via speechSynthesis', () => {
    const speak = vi.fn();
    vi.stubGlobal('speechSynthesis', { speak, cancel: vi.fn(), speaking: false });
    vi.stubGlobal(
      'SpeechSynthesisUtterance',
      vi.fn(function (text) {
        this.text = text;
      })
    );
    useDesignStore.getState().updateElement(useDesignStore.getState().project.pages[0].elements[0].id, {
      text: 'Read this aloud.',
    });

    render(<PropertiesPanel />);
    fireEvent.click(screen.getByRole('button', { name: /read aloud/i }));

    expect(speak).toHaveBeenCalledTimes(1);
    expect(speak.mock.calls[0][0].text).toBe('Read this aloud.');
  });
});
