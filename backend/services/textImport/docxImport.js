import mammoth from 'mammoth';

export async function extractDocxText(buffer) {
  let result;
  try {
    result = await mammoth.extractRawText({ buffer });
  } catch {
    throw new Error("Couldn't read that .docx file. Make sure it's a valid Word document.");
  }
  return (result.value || '').trim();
}
