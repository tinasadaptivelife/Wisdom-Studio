import { importApi } from '../api/importApi.js';

export function readPlainTextFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error || new Error('Could not read that file.'));
    reader.readAsText(file);
  });
}

export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',').pop());
    reader.onerror = () => reject(reader.error || new Error('Could not read that file.'));
    reader.readAsDataURL(file);
  });
}

export async function readImportedFile(file) {
  const name = file.name || '';
  const ext = name.slice(name.lastIndexOf('.')).toLowerCase();

  if (ext === '.txt' || ext === '.md') {
    return readPlainTextFile(file);
  }
  if (ext === '.docx') {
    const base64 = await fileToBase64(file);
    const { text } = await importApi.importDocx(base64);
    return text;
  }
  throw new Error('Unsupported file type. Please choose a .txt, .md, or .docx file.');
}
