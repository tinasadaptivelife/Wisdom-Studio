// Flux.1-Schnell follows prompts far more faithfully than the SD1.5
// `stable_diffusion` checkpoint (which routinely ignored the subject) and,
// now that the provider gives each model family its own sampler/step/cfg
// profile, it renders cleanly here. Callers can still pass any curated model.
export const DEFAULT_MODEL = 'Flux.1-Schnell fp8 (Compact)';

const GENERIC_NEGATIVE = 'blurry, low quality, watermark, text, signature';

export const STYLE_MODES = [
  {
    key: 'general',
    label: 'General',
    suffix: '',
    negativePrompt: GENERIC_NEGATIVE,
  },
  {
    key: 'storybook',
    label: 'Storybook illustration',
    suffix: ", children's storybook illustration, warm inviting colors, soft lighting, whimsical, digital painting",
    negativePrompt: `${GENERIC_NEGATIVE}, scary, dark, photorealistic`,
  },
  {
    key: 'flyer',
    label: 'Flyer graphic',
    suffix: ', bold vibrant flyer graphic, clean modern composition, professional graphic design, high contrast',
    negativePrompt: `${GENERIC_NEGATIVE}, cluttered`,
  },
  {
    key: 'coloring-page',
    label: 'Coloring page line art',
    suffix:
      ', black and white line art, coloring book page, clean bold outlines, simple linework, no shading, no color, white background',
    negativePrompt: 'color, shading, grayscale, realistic, photo, texture, blurry, watermark, signature, text',
  },
];

const modeByKey = Object.fromEntries(STYLE_MODES.map((m) => [m.key, m]));

export function buildPrompt({ mode, userPrompt }) {
  const trimmed = (userPrompt || '').trim();
  if (!trimmed) throw new Error('A prompt is required to generate an image.');

  const style = modeByKey[mode] || modeByKey.general;
  return {
    prompt: `${trimmed}${style.suffix}`,
    negativePrompt: style.negativePrompt,
  };
}

const MIN_DIMENSION = 384;
// AI Horde requires extra kudos (balance most anonymous/new keys don't have)
// for any request over 665x665, so the standard tier caps well under that.
// Print quality opts into 1024 (SDXL-native base) and needs kudos to match;
// allow_downgrade on the submit payload keeps low-balance keys from erroring.
const MAX_DIMENSION_STANDARD = 576;
const MAX_DIMENSION_PRINT = 1024;
const ALIGNMENT = 64;

const alignTo64 = (value) => Math.round(value / ALIGNMENT) * ALIGNMENT;
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export function dimensionsForAspectRatio(elementWidth, elementHeight, { print = false } = {}) {
  const maxDimension = print ? MAX_DIMENSION_PRINT : MAX_DIMENSION_STANDARD;
  const ratio = elementWidth / elementHeight;
  let width;
  let height;
  if (ratio >= 1) {
    width = maxDimension;
    height = width / ratio;
  } else {
    height = maxDimension;
    width = height * ratio;
  }
  width = alignTo64(clamp(width, MIN_DIMENSION, maxDimension));
  height = alignTo64(clamp(height, MIN_DIMENSION, maxDimension));
  return { width, height };
}
