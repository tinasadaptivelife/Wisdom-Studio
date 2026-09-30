import { setBrands } from '../templates/brands.js';

// Makes the fonts of the brand pack available to the page. Canvas text only
// draws in a font once it has loaded, so this waits for them. A font that
// can't be loaded is skipped (its text then uses the fallback family).
export async function installBrandFonts(fonts = []) {
  if (typeof FontFace === 'undefined' || !document.fonts) return;
  await Promise.allSettled(
    fonts.map(async ({ family, weight, url }) => {
      const face = new FontFace(family, `url(${url})`, { weight: String(weight) });
      document.fonts.add(face);
      await face.load();
    })
  );
}

// Asks the server for the brands of its brand pack (see docs/brand-packs.md)
// and sets them, so the templates come in those brands. If the server has no
// pack, is down, or answers with an error, the built-in brand stays. The
// preview build has no server, so it always uses the built-in brand.
export async function loadBrands() {
  if (import.meta.env.VITE_PREVIEW) return;
  try {
    const res = await fetch('/api/brands');
    if (!res.ok) return;
    const { brands, fonts } = await res.json();
    if (!brands?.length) return;
    await installBrandFonts(fonts);
    setBrands(brands);
  } catch {
    // Keep the built-in brand.
  }
}
