import { afterEach, describe, it, expect, vi } from 'vitest';
import {
  isDictationSupported,
  isReadAloudSupported,
  createRecognizer,
  readAloud,
  stopReadingAloud,
} from './speech.js';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('feature detection', () => {
  it('reports dictation unsupported when no SpeechRecognition constructor exists', () => {
    expect(isDictationSupported()).toBe(false);
  });

  it('reports dictation supported when SpeechRecognition exists', () => {
    vi.stubGlobal('SpeechRecognition', class {});
    expect(isDictationSupported()).toBe(true);
  });

  it('reports dictation supported via the webkit-prefixed constructor', () => {
    vi.stubGlobal('webkitSpeechRecognition', class {});
    expect(isDictationSupported()).toBe(true);
  });

  it('reports read-aloud unsupported when speechSynthesis is absent', () => {
    expect(isReadAloudSupported()).toBe(false);
  });

  it('reports read-aloud supported when speechSynthesis exists', () => {
    vi.stubGlobal('speechSynthesis', {});
    expect(isReadAloudSupported()).toBe(true);
  });
});

describe('createRecognizer', () => {
  it('configures a continuous, final-results-only recognizer', () => {
    class MockRecognition {}
    vi.stubGlobal('SpeechRecognition', MockRecognition);

    const recognition = createRecognizer({ onResult: vi.fn() });

    expect(recognition.continuous).toBe(true);
    expect(recognition.interimResults).toBe(false);
    expect(recognition).toBeInstanceOf(MockRecognition);
  });

  it('calls onResult with the concatenated, trimmed final transcript', () => {
    vi.stubGlobal('SpeechRecognition', class {});
    const onResult = vi.fn();
    const recognition = createRecognizer({ onResult });

    const results = [Object.assign([{ transcript: 'hello there ' }], { isFinal: true })];
    recognition.onresult({ resultIndex: 0, results });

    expect(onResult).toHaveBeenCalledWith('hello there');
  });

  it('ignores non-final results', () => {
    vi.stubGlobal('SpeechRecognition', class {});
    const onResult = vi.fn();
    const recognition = createRecognizer({ onResult });

    const results = [Object.assign([{ transcript: 'still talking' }], { isFinal: false })];
    recognition.onresult({ resultIndex: 0, results });

    expect(onResult).not.toHaveBeenCalled();
  });

  it('calls onEnd when recognition ends', () => {
    vi.stubGlobal('SpeechRecognition', class {});
    const onEnd = vi.fn();
    const recognition = createRecognizer({ onResult: vi.fn(), onEnd });
    recognition.onend();
    expect(onEnd).toHaveBeenCalled();
  });
});

describe('readAloud', () => {
  it('does nothing when unsupported', () => {
    expect(() => readAloud('hello')).not.toThrow();
  });

  it('cancels any current speech and speaks a new utterance of the given text', () => {
    const speak = vi.fn();
    const cancel = vi.fn();
    vi.stubGlobal('speechSynthesis', { speak, cancel, speaking: false });
    vi.stubGlobal(
      'SpeechSynthesisUtterance',
      vi.fn(function (text) {
        this.text = text;
      })
    );

    readAloud('Once upon a time');

    expect(cancel).toHaveBeenCalled();
    expect(speak).toHaveBeenCalledTimes(1);
    expect(speak.mock.calls[0][0].text).toBe('Once upon a time');
  });

  it('does nothing for empty/whitespace-only text', () => {
    const speak = vi.fn();
    vi.stubGlobal('speechSynthesis', { speak, cancel: vi.fn() });
    readAloud('   ');
    expect(speak).not.toHaveBeenCalled();
  });

  it('wires the onEnd callback to the utterance so callers know when speech finishes', () => {
    const speak = vi.fn();
    vi.stubGlobal('speechSynthesis', { speak, cancel: vi.fn(), speaking: false });
    vi.stubGlobal('SpeechSynthesisUtterance', vi.fn(function (text) {
      this.text = text;
    }));

    const onEnd = vi.fn();
    readAloud('Once upon a time', { onEnd });

    const utterance = speak.mock.calls[0][0];
    expect(utterance.onend).toBe(onEnd);
  });
});

describe('stopReadingAloud', () => {
  it('cancels ongoing speech when supported', () => {
    const cancel = vi.fn();
    vi.stubGlobal('speechSynthesis', { cancel });
    stopReadingAloud();
    expect(cancel).toHaveBeenCalled();
  });

  it('does nothing when unsupported', () => {
    expect(() => stopReadingAloud()).not.toThrow();
  });
});
