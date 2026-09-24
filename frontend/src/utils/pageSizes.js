// Page sizes in px at 96dpi (matches typical screen-to-print scaling used by pdf-lib export in Phase 4)
export const PAGE_SIZES = {
  letter: { label: 'US Letter', width: 816, height: 1056 },
  a4: { label: 'A4', width: 794, height: 1123 },
  'letter-landscape': { label: 'US Letter (Landscape)', width: 1056, height: 816 },
  'social-square': { label: 'Social Square (1080×1080)', width: 1080, height: 1080 },
};

export const DEFAULT_PAGE_SIZE = 'letter';
