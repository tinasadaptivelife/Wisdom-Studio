// Two invented brands for tests, shaped like the brands the server sends from a
// brand pack (see docs/brand-packs.md). They mirror backend/test/fixtures/
// brand-pack, so the tests never depend on anyone's real brands.
export const EXAMPLE_BRANDS = [
  {
    key: 'example',
    label: 'Example Studio',
    shortLabel: 'Example',
    fonts: { reading: 'Atkinson Hyperlegible', display: 'Example Display', displayFallback: 'serif' },
    footerText: 'example.test',
    imageStyle: { label: 'Example Studio look', suffix: ', soft watercolor', negativePrompt: 'blurry' },
    palettes: [
      { key: 'paper-navy', label: 'Paper & Navy', suffix: '', background: '#F7F3EA', border: '#1F3A5F', headline: '#1F3A5F', body: '#222222' },
      { key: 'navy-paper', label: 'Navy & Paper', suffix: '-example-navy-paper', background: '#1F3A5F', border: '#F7F3EA', headline: '#FFFFFF', body: '#FFFFFF' },
      { key: 'paper-gold', label: 'Paper & Gold', suffix: '-example-paper-gold', background: '#F7F3EA', border: '#B8912F', headline: '#5C4310', body: '#222222' },
    ],
  },
  {
    key: 'sample',
    label: 'Sample Podcast',
    shortLabel: 'Sample',
    fonts: { reading: 'Atkinson Hyperlegible', display: 'Atkinson Hyperlegible' },
    palettes: [
      { key: 'night-gold', label: 'Night & Gold', suffix: '-sample-night-gold', background: '#141414', border: '#E0B84C', headline: '#E0B84C', body: '#F0F0F0' },
      { key: 'night-mist', label: 'Night & Mist', suffix: '-sample-night-mist', background: '#141414', border: '#7FA6A0', headline: '#F0F0F0', body: '#F0F0F0' },
    ],
  },
];
