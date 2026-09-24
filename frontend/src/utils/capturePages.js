// Thin DOM/Konva glue for PDF export — deliberately not unit tested (no
// canvas rendering in jsdom); verified live in the browser instead. The pure
// logic it calls into (buildPdfBytes, sanitizeFilename) is unit tested in
// exportPdf.test.js.

export const waitForNextPaint = () =>
  new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

// GeneratedImageShape only renders a real Konva Image node once its image has
// loaded (a placeholder Rect renders until then), so "does an Image node
// exist" is a reliable readiness check without touching HTMLImageElement.
export async function waitForPageImages(page, nodeRefs, timeoutMs = 3000) {
  const imageElements = page.elements.filter((el) => el.type === 'image' && el.visible !== false);
  if (imageElements.length === 0) return;

  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const ready = imageElements.every((el) => nodeRefs.current[el.id]?.findOne?.('Image'));
    if (ready) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

const THUMBNAIL_WIDTH = 160;

// Small preview for the Home screen's saved-projects list. Best-effort: a
// cross-origin generated image without CORS headers taints the canvas and
// makes toDataURL throw — in that case we skip the thumbnail rather than
// block autosave over a cosmetic feature.
export function captureThumbnail(stage) {
  if (!stage) return undefined;
  try {
    const pageWidth = stage.width();
    if (!pageWidth) return undefined;
    const pixelRatio = Math.min(1, THUMBNAIL_WIDTH / pageWidth);
    return stage.toDataURL({ pixelRatio, mimeType: 'image/jpeg', quality: 0.6 });
  } catch {
    return undefined;
  }
}

export function downloadBytes(bytes, filename, mimeType) {
  const blob = new Blob([bytes], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
