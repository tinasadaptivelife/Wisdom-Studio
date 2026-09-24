export function extractSelection(text, start, end) {
  if (start == null || end == null || end <= start) return '';
  return text.slice(start, end).trim();
}
