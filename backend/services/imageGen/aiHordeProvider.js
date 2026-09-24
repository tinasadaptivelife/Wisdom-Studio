const API_BASE = 'https://aihorde.net/api/v2';

async function hordeFetch(path, { apiKey, method = 'GET', body } = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      apikey: apiKey,
      'Client-Agent': 'wisdom-studio:1.0:local-dev',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) {
    const message = data?.message || `AI Horde request failed (${res.status})`;
    throw new Error(message);
  }
  return data;
}

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

// Sampler / step / cfg defaults differ sharply by model family. The old
// fixed profile (k_euler_a + karras, 28 steps, cfg 7) is right for SD1.5
// checkpoints but wrong for Flux (a distilled few-step model that wants
// cfg ~1) and heavy for SDXL — using it on Flux produces the washed-out,
// low-contrast output we kept seeing.
function paramProfileFor(model = '') {
  const m = String(model).toLowerCase();
  if (m.includes('flux')) {
    return { sampler_name: 'k_euler', karras: false, steps: 6, cfg_scale: 1 };
  }
  if (m.includes('xl') || m.includes('sdxl') || m.includes('cascade')) {
    return { sampler_name: 'k_euler_a', karras: true, steps: 30, cfg_scale: 6 };
  }
  return { sampler_name: 'k_euler_a', karras: true, steps: 28, cfg_scale: 7 };
}

function buildGenerationBody({
  prompt,
  negativePrompt,
  model,
  width,
  height,
  postProcessing,
  dryRun,
  sourceImage,
  sourceProcessing,
  denoisingStrength,
  n,
}) {
  const profile = paramProfileFor(model);
  // AI Horde has no dedicated negative-prompt field. The documented
  // convention is to append it to the prompt after a ` ### ` separator;
  // sending `negative_prompt` at the top level (as this did before) was
  // silently ignored by every worker.
  const fullPrompt =
    negativePrompt && negativePrompt.trim() ? `${prompt} ### ${negativePrompt.trim()}` : prompt;

  return {
    prompt: fullPrompt,
    params: {
      width,
      height,
      n: clamp(Math.round(Number(n) || 1), 1, 10),
      sampler_name: profile.sampler_name,
      karras: profile.karras,
      steps: profile.steps,
      cfg_scale: profile.cfg_scale,
      // Only meaningful alongside a source_image (img2img/inpainting).
      // Lower = hew closer to the reference; higher = freer reinterpretation.
      ...(sourceImage && denoisingStrength != null
        ? { denoising_strength: clamp(Number(denoisingStrength), 0.05, 1) }
        : {}),
      ...(postProcessing?.length ? { post_processing: postProcessing } : {}),
    },
    models: [model],
    r2: true,
    // Always explicitly disabled: never route requests to NSFW-only
    // workers or accept NSFW-flagged content, regardless of API default.
    nsfw: false,
    // Sharing with LAION reduces the kudos cost of every generation.
    shared: true,
    // Shrink the request instead of erroring if the account lacks kudos.
    allow_downgrade: true,
    // img2img: a base64 webp reference the workers paint from.
    ...(sourceImage
      ? { source_image: sourceImage, source_processing: sourceProcessing || 'img2img' }
      : {}),
    // When true, AI Horde returns the kudos cost without queuing a job.
    ...(dryRun ? { dry_run: true } : {}),
  };
}

/** @type {import('./provider.interface.js').ImageGenProvider} */
export const aiHordeProvider = {
  async submit({
    apiKey,
    prompt,
    negativePrompt,
    model,
    width,
    height,
    postProcessing,
    sourceImage,
    sourceProcessing,
    denoisingStrength,
    n,
  }) {
    const data = await hordeFetch('/generate/async', {
      apiKey,
      method: 'POST',
      body: buildGenerationBody({
        prompt,
        negativePrompt,
        model,
        width,
        height,
        postProcessing,
        sourceImage,
        sourceProcessing,
        denoisingStrength,
        n,
      }),
    });
    return { providerJobId: data.id };
  },

  async estimateCost({
    apiKey,
    prompt,
    negativePrompt,
    model,
    width,
    height,
    postProcessing,
    sourceImage,
    sourceProcessing,
    denoisingStrength,
    n,
  }) {
    const data = await hordeFetch('/generate/async', {
      apiKey,
      method: 'POST',
      body: buildGenerationBody({
        prompt,
        negativePrompt,
        model,
        width,
        height,
        postProcessing,
        sourceImage,
        sourceProcessing,
        denoisingStrength,
        n,
        dryRun: true,
      }),
    });
    return { kudos: data.kudos };
  },

  async checkStatus({ apiKey, providerJobId }) {
    const data = await hordeFetch(`/generate/check/${providerJobId}`, { apiKey });
    return {
      done: Boolean(data.done),
      faulted: Boolean(data.faulted),
      waitTimeSeconds: data.wait_time ?? 0,
      queuePosition: data.queue_position ?? 0,
    };
  },

  async fetchResult({ apiKey, providerJobId }) {
    const data = await hordeFetch(`/generate/status/${providerJobId}`, { apiKey });
    return {
      images: (data.generations || []).map((g) => ({ url: g.img, seed: g.seed })),
    };
  },

  // Alchemy (the API calls this "interrogation" for legacy reasons) runs
  // post-processing on an already-completed generation's public image URL,
  // rather than mutating the in-flight generation job — so unlike inline
  // post_processing, the original image is never lost.
  async submitAlchemy({ apiKey, sourceImageUrl, upscaler }) {
    const data = await hordeFetch('/interrogate/async', {
      apiKey,
      method: 'POST',
      body: {
        source_image: sourceImageUrl,
        forms: [{ name: upscaler }],
      },
    });
    return { providerJobId: data.id };
  },

  async checkAlchemy({ apiKey, providerJobId }) {
    const data = await hordeFetch(`/interrogate/status/${providerJobId}`, { apiKey });
    const faulted = data.state === 'faulted';
    const done = data.state === 'done' || faulted;
    // The result object's shape is open-ended (keyed by form name per the AI
    // Horde schema) — take the first value rather than assuming the exact
    // key, since it's more robust to any naming variance across forms.
    const url = Object.values(data.forms?.[0]?.result ?? {})[0];
    return { done, faulted, url };
  },

  async listModels({ apiKey }) {
    const data = await hordeFetch('/status/models', { apiKey });
    return data
      .filter((m) => m.type === 'image')
      .map((m) => ({ name: m.name, count: m.count }))
      .sort((a, b) => b.count - a.count);
  },
};
