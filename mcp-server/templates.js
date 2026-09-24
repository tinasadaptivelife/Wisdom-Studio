import { randomUUID } from 'node:crypto';

// Mirrors frontend/src/utils/pageSizes.js and frontend/src/templates/
// templates.js. Duplicated intentionally: this server is a separate npm
// package (no shared module resolution with the Vite frontend), and the
// data is small and stable enough that the duplication is cheaper than the
// build-tooling cost of a shared workspace package.
export const PAGE_SIZES = {
  letter: { label: 'US Letter', width: 816, height: 1056 },
  a4: { label: 'A4', width: 794, height: 1123 },
  'letter-landscape': { label: 'US Letter (Landscape)', width: 1056, height: 816 },
  'social-square': { label: 'Social Square (1080×1080)', width: 1080, height: 1080 },
};

const makeId = (prefix) => `${prefix}_${randomUUID().slice(0, 8)}`;

const textEl = (overrides) => ({
  id: makeId('el'),
  type: 'text',
  name: 'Text',
  x: 60,
  y: 60,
  width: 400,
  height: 60,
  rotation: 0,
  locked: false,
  visible: true,
  text: 'Double-click to edit text',
  fontSize: 24,
  fontFamily: 'Poppins, Arial, sans-serif',
  fill: '#2b2b2b',
  align: 'left',
  ...overrides,
});

const shapeEl = (type, overrides) => ({
  id: makeId('el'),
  type,
  name: type === 'rect' ? 'Rectangle' : 'Ellipse',
  x: 60,
  y: 60,
  width: 200,
  height: 140,
  rotation: 0,
  locked: false,
  visible: true,
  fill: '#f4a259',
  stroke: '#c97a2e',
  strokeWidth: 2,
  ...overrides,
});

const imagePlaceholderEl = (overrides) => ({
  id: makeId('el'),
  type: 'image-placeholder',
  name: 'Image placeholder',
  x: 60,
  y: 60,
  width: 300,
  height: 300,
  rotation: 0,
  locked: false,
  visible: true,
  label: 'Image goes here',
  ...overrides,
});

// Earth-tone palette. Only these three hexes are used for the themed
// elements (background, border, headline) across the branded variants below.
const EARTH_TONES = {
  cream: '#F5F0E8',
  terracotta: '#C2704F',
  sage: '#8A9A7E',
};

// Not a brand color — just a legible ink tone for body text on light (cream)
// backgrounds, where terracotta/sage alone would be borderline-low-contrast
// at body-text size.
const READABLE_DARK = '#2b2620';

function buildBrandedFlyerPage(pageSize, { background, border, headline, body }) {
  const { width, height } = PAGE_SIZES[pageSize];
  const margin = 48;
  return [
    shapeEl('rect', {
      name: 'Brand background',
      x: 0,
      y: 0,
      width,
      height,
      fill: background,
      stroke: border,
      strokeWidth: 16,
      locked: true,
    }),
    textEl({
      name: 'Headline',
      text: 'Your Event Headline',
      x: margin,
      y: margin,
      width: width - margin * 2,
      fontSize: 40,
      align: 'center',
      fill: headline,
    }),
    imagePlaceholderEl({
      name: 'Flyer image',
      x: margin,
      y: margin + 90,
      width: width - margin * 2,
      height: 320,
      label: 'Add a flyer graphic',
    }),
    textEl({
      name: 'Details',
      text: 'Date, time, and location details go here.',
      x: margin,
      y: margin + 90 + 340,
      width: width - margin * 2,
      height: 160,
      fontSize: 20,
      align: 'left',
      fill: body,
    }),
  ];
}

// Coloring page: the brand background/border rect frames the page, but a
// second locked white rect sits exactly behind the line-art area — the
// coloring surface itself must stay neutral so it's actually colorable.
function buildColoringPageForColors(pageSize, { background, border, headline }) {
  const { width, height } = PAGE_SIZES[pageSize];
  const margin = 48;
  const artHeight = height - margin * 2 - 70;
  return [
    shapeEl('rect', {
      name: 'Brand background',
      x: 0,
      y: 0,
      width,
      height,
      fill: background,
      stroke: border,
      strokeWidth: 16,
      locked: true,
    }),
    shapeEl('rect', {
      name: 'Coloring surface',
      x: margin,
      y: margin,
      width: width - margin * 2,
      height: artHeight,
      fill: '#ffffff',
      stroke: 'transparent',
      strokeWidth: 0,
      locked: true,
    }),
    imagePlaceholderEl({
      name: 'Line art image',
      x: margin,
      y: margin,
      width: width - margin * 2,
      height: artHeight,
      label: 'Add coloring-page line art',
    }),
    textEl({
      name: 'Title',
      text: 'Coloring Page Title',
      x: margin,
      y: height - margin - 50,
      width: width - margin * 2,
      fontSize: 28,
      align: 'center',
      fill: headline,
    }),
  ];
}

function buildStorybookPageForColors(pageSize, { background, border, body }) {
  const { width, height } = PAGE_SIZES[pageSize];
  const margin = 48;
  return [
    shapeEl('rect', {
      name: 'Brand background',
      x: 0,
      y: 0,
      width,
      height,
      fill: background,
      stroke: border,
      strokeWidth: 16,
      locked: true,
    }),
    imagePlaceholderEl({
      name: 'Story illustration',
      x: margin,
      y: margin,
      width: width - margin * 2,
      height: height * 0.55,
      label: 'Add an illustration for this page',
    }),
    textEl({
      name: 'Story text',
      text: 'Once upon a time...',
      x: margin,
      y: margin + height * 0.55 + 24,
      width: width - margin * 2,
      height: height * 0.3,
      fontSize: 22,
      fill: body,
    }),
  ];
}

// Generic single-column document/report page — Title + a large body block.
function buildDocumentForColors(pageSize, { background, border, headline, body }) {
  const { width, height } = PAGE_SIZES[pageSize];
  const margin = 56;
  return [
    shapeEl('rect', {
      name: 'Brand background',
      x: 0,
      y: 0,
      width,
      height,
      fill: background,
      stroke: border,
      strokeWidth: 16,
      locked: true,
    }),
    textEl({
      name: 'Title',
      text: 'Document Title',
      x: margin,
      y: margin,
      width: width - margin * 2,
      fontSize: 30,
      align: 'center',
      fill: headline,
    }),
    textEl({
      name: 'Body text',
      text: 'Type or paste your document text here.',
      x: margin,
      y: margin + 60,
      width: width - margin * 2,
      height: height - margin * 2 - 60,
      fontSize: 20,
      fill: body,
    }),
  ];
}

// Masthead + issue line, then a two-column row (lead image + lead story)
// followed by a full-width body block.
function buildNewsletterForColors(pageSize, { background, border, headline, body }) {
  const { width, height } = PAGE_SIZES[pageSize];
  const margin = 48;
  const colGap = 24;
  const colWidth = (width - margin * 2 - colGap) / 2;
  const imageHeight = 260;
  const colY = margin + 92;
  return [
    shapeEl('rect', {
      name: 'Brand background',
      x: 0,
      y: 0,
      width,
      height,
      fill: background,
      stroke: border,
      strokeWidth: 16,
      locked: true,
    }),
    textEl({
      name: 'Masthead',
      text: 'Your Newsletter Name',
      x: margin,
      y: margin,
      width: width - margin * 2,
      fontSize: 40,
      align: 'center',
      fill: headline,
    }),
    textEl({
      name: 'Issue line',
      text: 'Issue No. 1 — Month Year',
      x: margin,
      y: margin + 56,
      width: width - margin * 2,
      height: 24,
      fontSize: 16,
      align: 'center',
      fill: body,
    }),
    imagePlaceholderEl({
      name: 'Lead image',
      x: margin,
      y: colY,
      width: colWidth,
      height: imageHeight,
      label: 'Add a lead photo or graphic',
    }),
    textEl({
      name: 'Lead story',
      text: 'Lead story headline goes here, with a paragraph or two introducing this issue.',
      x: margin + colWidth + colGap,
      y: colY,
      width: colWidth,
      height: imageHeight,
      fontSize: 16,
      fill: body,
    }),
    textEl({
      name: 'Body text',
      text: 'Continue the newsletter here — announcements, upcoming events, and more.',
      x: margin,
      y: colY + imageHeight + 24,
      width: width - margin * 2,
      height: height - (colY + imageHeight + 24) - margin,
      fontSize: 16,
      fill: body,
    }),
  ];
}

// Title + short instructions + a large response area participants can type
// directly into (or extend with more pages via the editor's "Add page").
function buildWorkbookForColors(pageSize, { background, border, headline, body }) {
  const { width, height } = PAGE_SIZES[pageSize];
  const margin = 48;
  const responseY = margin + 130;
  return [
    shapeEl('rect', {
      name: 'Brand background',
      x: 0,
      y: 0,
      width,
      height,
      fill: background,
      stroke: border,
      strokeWidth: 16,
      locked: true,
    }),
    textEl({
      name: 'Title',
      text: 'Workbook Title',
      x: margin,
      y: margin,
      width: width - margin * 2,
      fontSize: 36,
      align: 'center',
      fill: headline,
    }),
    textEl({
      name: 'Instructions',
      text: 'Instructions: Follow along and fill in your answers below.',
      x: margin,
      y: margin + 60,
      width: width - margin * 2,
      height: 50,
      fontSize: 18,
      fill: body,
    }),
    textEl({
      name: 'Response area',
      text: 'Write your thoughts here...',
      x: margin,
      y: responseY,
      width: width - margin * 2,
      height: height - margin - responseY,
      fontSize: 18,
      fill: body,
    }),
  ];
}

// Landscape, centered, with a date line (bottom-left) and signature line
// (bottom-right) — a thicker border than other types for a formal feel.
function buildCertificateForColors(pageSize, { background, border, headline, body }) {
  const { width, height } = PAGE_SIZES[pageSize];
  const margin = 72;
  const lineWidth = 280;
  return [
    shapeEl('rect', {
      name: 'Brand background',
      x: 0,
      y: 0,
      width,
      height,
      fill: background,
      stroke: border,
      strokeWidth: 20,
      locked: true,
    }),
    textEl({
      name: 'Certificate title',
      text: 'Certificate of Achievement',
      x: margin,
      y: margin,
      width: width - margin * 2,
      fontSize: 38,
      align: 'center',
      fill: headline,
    }),
    textEl({
      name: 'Recipient name',
      text: 'Presented to: [Name]',
      x: margin,
      y: margin + 80,
      width: width - margin * 2,
      fontSize: 30,
      align: 'center',
      fill: headline,
    }),
    textEl({
      name: 'Achievement text',
      text: 'For outstanding participation and achievement.',
      x: margin,
      y: margin + 140,
      width: width - margin * 2,
      fontSize: 18,
      align: 'center',
      fill: body,
    }),
    textEl({
      name: 'Date line',
      text: 'Date: ____________',
      x: margin,
      y: height - margin - 30,
      width: lineWidth,
      fontSize: 16,
      fill: body,
    }),
    textEl({
      name: 'Signature line',
      text: 'Signature: ____________',
      x: width - margin - lineWidth,
      y: height - margin - 30,
      width: lineWidth,
      fontSize: 16,
      align: 'right',
      fill: body,
    }),
  ];
}

// Square, image-forward: a large post image up top, then headline + caption.
function buildSocialPostForColors(pageSize, { background, border, headline, body }) {
  const { width, height } = PAGE_SIZES[pageSize];
  const margin = 60;
  const imageHeight = height * 0.55;
  return [
    shapeEl('rect', {
      name: 'Brand background',
      x: 0,
      y: 0,
      width,
      height,
      fill: background,
      stroke: border,
      strokeWidth: 16,
      locked: true,
    }),
    imagePlaceholderEl({
      name: 'Post image',
      x: margin,
      y: margin,
      width: width - margin * 2,
      height: imageHeight,
      label: 'Add an image for this post',
    }),
    textEl({
      name: 'Headline',
      text: 'Your headline here',
      x: margin,
      y: margin + imageHeight + 24,
      width: width - margin * 2,
      fontSize: 32,
      align: 'center',
      fill: headline,
    }),
    textEl({
      name: 'Caption',
      text: 'A short caption to go with the post.',
      x: margin,
      y: margin + imageHeight + 80,
      width: width - margin * 2,
      height: height - (margin + imageHeight + 80) - margin,
      fontSize: 18,
      align: 'center',
      fill: body,
    }),
  ];
}

// Decorative image up top, then event name, details, and an RSVP line.
function buildInvitationForColors(pageSize, { background, border, headline, body }) {
  const { width, height } = PAGE_SIZES[pageSize];
  const margin = 56;
  const imageHeight = 320;
  const textY = margin + imageHeight + 24;
  return [
    shapeEl('rect', {
      name: 'Brand background',
      x: 0,
      y: 0,
      width,
      height,
      fill: background,
      stroke: border,
      strokeWidth: 16,
      locked: true,
    }),
    imagePlaceholderEl({
      name: 'Invitation image',
      x: margin,
      y: margin,
      width: width - margin * 2,
      height: imageHeight,
      label: 'Add decorative art or a photo',
    }),
    textEl({
      name: 'Event name',
      text: "You're Invited!",
      x: margin,
      y: textY,
      width: width - margin * 2,
      fontSize: 34,
      align: 'center',
      fill: headline,
    }),
    textEl({
      name: 'Details',
      text: 'Date, time, and location go here.',
      x: margin,
      y: textY + 56,
      width: width - margin * 2,
      height: 80,
      fontSize: 18,
      align: 'center',
      fill: body,
    }),
    textEl({
      name: 'RSVP',
      text: 'RSVP by [date] to [contact info].',
      x: margin,
      y: textY + 146,
      width: width - margin * 2,
      height: 40,
      fontSize: 16,
      align: 'center',
      fill: body,
    }),
  ];
}

// Simple one-pager (not a tri-fold): headline, image, body copy, and a
// small contact line at the bottom.
function buildBrochureForColors(pageSize, { background, border, headline, body }) {
  const { width, height } = PAGE_SIZES[pageSize];
  const margin = 48;
  const imageY = margin + 70;
  const imageHeight = 300;
  const bodyY = imageY + imageHeight + 24;
  return [
    shapeEl('rect', {
      name: 'Brand background',
      x: 0,
      y: 0,
      width,
      height,
      fill: background,
      stroke: border,
      strokeWidth: 16,
      locked: true,
    }),
    textEl({
      name: 'Headline',
      text: 'Your Organization Name',
      x: margin,
      y: margin,
      width: width - margin * 2,
      fontSize: 36,
      align: 'center',
      fill: headline,
    }),
    imagePlaceholderEl({
      name: 'Brochure image',
      x: margin,
      y: imageY,
      width: width - margin * 2,
      height: imageHeight,
      label: 'Add a photo or graphic',
    }),
    textEl({
      name: 'Body text',
      text: 'Describe your programs, services, or offerings here.',
      x: margin,
      y: bodyY,
      width: width - margin * 2,
      height: height - bodyY - margin - 40,
      fontSize: 16,
      fill: body,
    }),
    textEl({
      name: 'Contact info',
      text: 'Contact: name@example.com | (555) 555-5555',
      x: margin,
      y: height - margin - 30,
      width: width - margin * 2,
      fontSize: 14,
      align: 'center',
      fill: body,
    }),
  ];
}

function buildQuoteCardForColors(pageSize, { background, border, headline, body }) {
  const { width, height } = PAGE_SIZES[pageSize];
  const margin = 56;
  const imageHeight = height * 0.5;
  const quoteY = margin + imageHeight + 32;
  const quoteHeight = height * 0.22;
  return [
    shapeEl('rect', {
      name: 'Brand background',
      x: 0,
      y: 0,
      width,
      height,
      fill: background,
      stroke: border,
      strokeWidth: 16,
      locked: true,
    }),
    imagePlaceholderEl({
      name: 'Complementary image',
      x: margin,
      y: margin,
      width: width - margin * 2,
      height: imageHeight,
      label: 'Add an image that matches the quote',
    }),
    textEl({
      name: 'Quote',
      text: '"Type your quote here."',
      x: margin,
      y: quoteY,
      width: width - margin * 2,
      height: quoteHeight,
      fontSize: 30,
      align: 'center',
      fill: headline,
    }),
    textEl({
      name: 'Attribution',
      text: '— Author name',
      x: margin,
      y: quoteY + quoteHeight + 12,
      width: width - margin * 2,
      height: 40,
      fontSize: 18,
      align: 'center',
      fill: body,
    }),
  ];
}

// The 6 earth-tone color pairings shared by every branded asset type —
// mirrors frontend/src/templates/templates.js exactly.
const COLOR_PAIRINGS = [
  {
    suffix: '',
    label: 'Cream & Terracotta',
    background: EARTH_TONES.cream,
    border: EARTH_TONES.terracotta,
    headline: EARTH_TONES.terracotta,
    body: READABLE_DARK,
  },
  {
    suffix: '-cream-sage',
    label: 'Cream & Sage',
    background: EARTH_TONES.cream,
    border: EARTH_TONES.sage,
    headline: EARTH_TONES.sage,
    body: READABLE_DARK,
  },
  {
    suffix: '-terracotta-sage',
    label: 'Terracotta & Sage',
    background: EARTH_TONES.terracotta,
    border: EARTH_TONES.sage,
    headline: EARTH_TONES.cream,
    body: EARTH_TONES.cream,
  },
  {
    suffix: '-sage-terracotta',
    label: 'Sage & Terracotta',
    background: EARTH_TONES.sage,
    border: EARTH_TONES.terracotta,
    headline: EARTH_TONES.cream,
    body: EARTH_TONES.cream,
  },
  {
    suffix: '-terracotta-cream',
    label: 'Terracotta & Cream',
    background: EARTH_TONES.terracotta,
    border: EARTH_TONES.cream,
    headline: EARTH_TONES.cream,
    body: EARTH_TONES.cream,
  },
  {
    suffix: '-sage-cream',
    label: 'Sage & Cream',
    background: EARTH_TONES.sage,
    border: EARTH_TONES.cream,
    headline: EARTH_TONES.cream,
    body: EARTH_TONES.cream,
  },
];

function buildBrandedVariants(baseKey, assetLabel, buildPageForColors) {
  return COLOR_PAIRINGS.map((pairing) => ({
    key: `${baseKey}${pairing.suffix}`,
    title: `${pairing.label} ${assetLabel}`,
    buildPage: (pageSize) => buildPageForColors(pageSize, pairing),
  }));
}

// Key stability matters: `key` is what create_project's templateKey accepts.
// 'script-sheet' was retired (replaced by 'newsletter') — old saved projects
// referencing it fall back to blank via getTemplate's ?? TEMPLATES[0].
export const TEMPLATES = [
  { key: 'blank', title: 'Blank canvas', buildPage: () => [] },
  ...buildBrandedVariants('coloring-page', 'coloring page', buildColoringPageForColors),
  ...buildBrandedVariants('flyer', 'flyer', buildBrandedFlyerPage),
  ...buildBrandedVariants('storybook', 'storybook page', buildStorybookPageForColors),
  ...buildBrandedVariants('quote-card', 'quote card', buildQuoteCardForColors),
  ...buildBrandedVariants('document', 'document', buildDocumentForColors),
  ...buildBrandedVariants('newsletter', 'newsletter', buildNewsletterForColors),
  ...buildBrandedVariants('workbook', 'workbook', buildWorkbookForColors),
  ...buildBrandedVariants('certificate', 'certificate', buildCertificateForColors),
  ...buildBrandedVariants('social-post', 'social media post', buildSocialPostForColors),
  ...buildBrandedVariants('invitation', 'invitation', buildInvitationForColors),
  ...buildBrandedVariants('brochure', 'brochure', buildBrochureForColors),
];

export const getTemplate = (key) => TEMPLATES.find((t) => t.key === key) ?? TEMPLATES[0];
