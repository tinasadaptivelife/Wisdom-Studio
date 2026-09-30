// The brands the templates come in.
//
// A copy of frontend/src/templates/brands.js (this server is a separate npm
// package, so the two are duplicated on purpose; a test fails if the built-in
// brand drifts), plus refreshBrands, which asks the backend for the brands of
// its brand pack (docs/brand-packs.md) instead of a fixed list.
//
// A brand is { key, label, shortLabel, fonts, palettes, footerText?, imageStyle? }.
//  - fonts: `reading` is used for all text under 32px (Atkinson Hyperlegible,
//    designed for low vision). `display` is used only at 32px and larger, for
//    titles and headlines. `displayFallback` is its generic family ('serif' or
//    'sans-serif', the default).
//  - A palette is { key, label, suffix, background, border, headline, body }.
//    `suffix` is appended to a template's base key ('flyer' + '-cream-sage').
//
// Accessibility floor: every palette's headline is at least 4.5:1 on its
// background and its body text at least 7:1 (asserted for the built-in brand in
// ../frontend/src/templates/brands.test.js, and enforced for a brand pack when the server loads it). The
// border is decoration only, so it isn't held to a text-contrast minimum.

export const DEFAULT_BRAND = {
  key: 'classic',
  label: 'Classic',
  shortLabel: 'Classic',
  fonts: { reading: 'Atkinson Hyperlegible', display: 'Atkinson Hyperlegible' },
  palettes: [
    { key: 'cream-terracotta', label: 'Cream & Terracotta', suffix: '', background: '#F5F0E8', border: '#C2704F', headline: '#8F4526', body: '#2B2620' },
    { key: 'cream-sage', label: 'Cream & Sage', suffix: '-cream-sage', background: '#F5F0E8', border: '#8A9A7E', headline: '#4F5E45', body: '#2B2620' },
    { key: 'terracotta-sage', label: 'Terracotta & Sage', suffix: '-terracotta-sage', background: '#7E3D22', border: '#8A9A7E', headline: '#F5F0E8', body: '#F5F0E8' },
    { key: 'sage-terracotta', label: 'Sage & Terracotta', suffix: '-sage-terracotta', background: '#414F38', border: '#C2704F', headline: '#F5F0E8', body: '#F5F0E8' },
    { key: 'terracotta-cream', label: 'Terracotta & Cream', suffix: '-terracotta-cream', background: '#7E3D22', border: '#F5F0E8', headline: '#F5F0E8', body: '#F5F0E8' },
    { key: 'sage-cream', label: 'Sage & Cream', suffix: '-sage-cream', background: '#414F38', border: '#F5F0E8', headline: '#F5F0E8', body: '#F5F0E8' },
  ],
};

let brands = [DEFAULT_BRAND];

export const getBrands = () => brands;

// Called once at startup with the brands the server sent. An empty or missing
// list restores the built-in brand.
export function setBrands(list) {
  brands = Array.isArray(list) && list.length > 0 ? list : [DEFAULT_BRAND];
}

export const getBrand = (key) => brands.find((b) => b.key === key) ?? brands[0];

// Fetches the brands from the backend and sets them. With no brand pack the
// backend sends none, which restores the built-in brand. If the backend can't be
// reached, the brands stay as they were; the tool that follows reports the
// connection problem.
export async function refreshBrands(client) {
  try {
    const { brands } = await client.getBrands();
    setBrands(brands);
  } catch {
    // Keep the current brands.
  }
}
