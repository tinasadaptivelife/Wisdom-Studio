// Curated, plain-language model catalog. The raw AI Horde model list exposes
// hundreds of checkpoint names — including NSFW ones — that mean nothing to
// this app's audience. Only these vetted models are offered, in this order,
// with labels a non-technical user can choose between.
const CURATED_MODELS = [
  { name: 'stable_diffusion', label: 'Classic — good all-rounder' },
  { name: 'Deliberate', label: 'Detailed illustrations' },
  { name: 'Dreamshaper', label: 'Painterly and artistic' },
  { name: 'AlbedoBase XL (SDXL)', label: 'High detail (takes longer)' },
  { name: 'ICBINP - I Can\'t Believe It\'s Not Photography', label: 'Photo-realistic' },
  { name: 'Flux.1-Schnell fp8 (Compact)', label: 'Newest quality (slowest)' },
];

// Safety net beyond the allowlist, in case the curated list ever grows
// programmatically: never surface adult-content model names.
const BLOCKED_PATTERN = /nsfw|hentai|porn|babes|yiff|urpm|afterdark|bigasp|nudify|nude/i;

export const isBlockedModelName = (name) => BLOCKED_PATTERN.test(name);

export function curateModels(liveModels) {
  const liveByName = new Map(liveModels.map((m) => [m.name, m]));
  return CURATED_MODELS.filter((m) => liveByName.has(m.name) && !isBlockedModelName(m.name)).map((m) => ({
    name: m.name,
    label: m.label,
    count: liveByName.get(m.name).count,
  }));
}
