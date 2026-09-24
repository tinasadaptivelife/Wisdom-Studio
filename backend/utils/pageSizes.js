// Mirrors frontend/src/utils/pageSizes.js exactly — both must agree so
// server-rendered and client-rendered PDFs come out the same physical size.
// Page sizes in px at 96dpi.
export const PAGE_SIZES = {
  letter: { label: 'US Letter', width: 816, height: 1056 },
  a4: { label: 'A4', width: 794, height: 1123 },
  'letter-landscape': { label: 'US Letter (Landscape)', width: 1056, height: 816 },
  'social-square': { label: 'Social Square (1080×1080)', width: 1080, height: 1080 },
};

export const DEFAULT_PAGE_SIZE = 'letter';
