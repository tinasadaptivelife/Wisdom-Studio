import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';

vi.mock('mammoth', () => ({
  default: { extractRawText: vi.fn() },
}));

const mammoth = (await import('mammoth')).default;
const { extractDocxText } = await import('./docxImport.js');

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('extractDocxText', () => {
  it('extracts and trims plain text from a docx buffer', async () => {
    mammoth.extractRawText.mockResolvedValueOnce({ value: '  Once upon a time...  \n\n', messages: [] });

    const buffer = Buffer.from('fake docx bytes');
    const text = await extractDocxText(buffer);

    expect(text).toBe('Once upon a time...');
    expect(mammoth.extractRawText).toHaveBeenCalledWith({ buffer });
  });

  it('throws a friendly error when mammoth fails to parse the file', async () => {
    mammoth.extractRawText.mockRejectedValueOnce(new Error('End of data reached'));

    await expect(extractDocxText(Buffer.from('not a docx'))).rejects.toThrow(
      /couldn.t read that \.docx file/i
    );
  });
});
