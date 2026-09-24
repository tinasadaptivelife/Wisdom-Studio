import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../api/importApi.js', () => ({
  importApi: { importDocx: vi.fn() },
}));

const { importApi } = await import('../api/importApi.js');
const { readImportedFile } = await import('./textImport.js');

beforeEach(() => {
  vi.clearAllMocks();
});

describe('readImportedFile', () => {
  it('reads a .txt file directly as plain text', async () => {
    const file = new File(['Once upon a time...'], 'story.txt', { type: 'text/plain' });
    const text = await readImportedFile(file);
    expect(text).toBe('Once upon a time...');
    expect(importApi.importDocx).not.toHaveBeenCalled();
  });

  it('reads a .md file directly as plain text', async () => {
    const file = new File(['# Title\n\nBody text.'], 'notes.md', { type: 'text/markdown' });
    const text = await readImportedFile(file);
    expect(text).toBe('# Title\n\nBody text.');
  });

  it('sends a .docx file to the backend as base64 and returns the extracted text', async () => {
    importApi.importDocx.mockResolvedValueOnce({ text: 'Once upon a time...' });

    const file = new File(['fake docx bytes'], 'story.docx', {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
    const text = await readImportedFile(file);

    expect(text).toBe('Once upon a time...');
    expect(importApi.importDocx).toHaveBeenCalledTimes(1);
    const base64Arg = importApi.importDocx.mock.calls[0][0];
    expect(typeof base64Arg).toBe('string');
    expect(Buffer.from(base64Arg, 'base64').toString()).toBe('fake docx bytes');
  });

  it('rejects unsupported file types with a friendly error', async () => {
    const file = new File(['%PDF-1.4'], 'story.pdf', { type: 'application/pdf' });
    await expect(readImportedFile(file)).rejects.toThrow(/unsupported file type/i);
  });
});
