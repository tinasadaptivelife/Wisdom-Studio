import { Router } from 'express';
import sharp from 'sharp';
import { imageGenProvider } from '../services/imageGen/index.js';
import { buildPrompt, dimensionsForAspectRatio, DEFAULT_MODEL } from '../services/imageGen/promptTemplates.js';
import { curateModels } from '../services/imageGen/modelCatalog.js';

const router = Router();

// AI Horde's `source_image` (img2img) must be a base64 webp, and workers
// reject oversized payloads. Accept a data URI, a bare base64 string, or an
// http(s) URL, and normalize any of them to a downscaled webp base64 string.
async function normalizeSourceImage(input) {
  if (!input || typeof input !== 'string') return null;
  let bytes;
  if (input.startsWith('data:')) {
    bytes = Buffer.from(input.slice(input.indexOf(',') + 1), 'base64');
  } else if (/^https?:\/\//i.test(input)) {
    const res = await fetch(input);
    if (!res.ok) throw new Error(`Couldn't fetch the reference image (${res.status}).`);
    bytes = Buffer.from(await res.arrayBuffer());
  } else {
    bytes = Buffer.from(input, 'base64');
  }
  if (!bytes || bytes.length === 0) {
    throw new Error('The reference image was empty or could not be decoded.');
  }
  const webp = await sharp(bytes)
    .resize({ width: 1024, height: 1024, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 90 })
    .toBuffer();
  return webp.toString('base64');
}

function requireApiKey(req, res) {
  const apiKey = process.env.AI_HORDE_API_KEY;
  if (!apiKey) {
    res
      .status(400)
      .json({ error: 'AI_HORDE_API_KEY is not configured. Add it to backend/.env and restart the server.' });
    return null;
  }
  return apiKey;
}

router.get('/models', async (req, res, next) => {
  try {
    const apiKey = process.env.AI_HORDE_API_KEY || '0000000000';
    const liveModels = await imageGenProvider.listModels({ apiKey });
    res.json({ models: curateModels(liveModels), default: DEFAULT_MODEL });
  } catch (err) {
    next(err);
  }
});

function buildJobRequest(req, res) {
  const {
    prompt: userPrompt,
    mode,
    model,
    targetWidth,
    targetHeight,
    printQuality,
    postProcessingMode,
    upscaler,
    referenceImage,
    sourceProcessing,
    denoisingStrength,
    count,
  } = req.body || {};
  if (!userPrompt || !String(userPrompt).trim()) {
    res.status(400).json({ error: 'A prompt is required.' });
    return null;
  }

  const apiKey = requireApiKey(req, res);
  if (!apiKey) return null;

  const { prompt, negativePrompt } = buildPrompt({ mode, userPrompt });
  // printQuality (larger base dimensions) is independent of postProcessingMode
  // (which post-processing pipeline, if any, to apply) — a caller can request
  // a bigger base image without any upscaler, or vice versa.
  const { width, height } = dimensionsForAspectRatio(targetWidth || 512, targetHeight || 512, {
    print: Boolean(printQuality),
  });
  const chosenModel = model || DEFAULT_MODEL;

  return {
    apiKey,
    prompt,
    negativePrompt,
    model: chosenModel,
    width,
    height,
    // Raw, un-normalized reference — the handler converts it to webp base64
    // just before submitting (buildJobRequest stays synchronous).
    referenceImageRaw: referenceImage,
    sourceProcessing,
    denoisingStrength: denoisingStrength == null ? undefined : Number(denoisingStrength),
    n: count == null ? undefined : Number(count),
    // Inline post-processing replaces the returned image (the pre-upscale
    // original isn't retrievable) — 'alchemy' mode deliberately omits this so
    // the original comes back untouched; upscaling happens as a separate,
    // later call to /alchemy against that original's URL.
    ...(postProcessingMode === 'inline' && upscaler ? { postProcessing: [upscaler] } : {}),
  };
}

// Resolves buildJobRequest's raw reference image into the provider payload
// shape (webp base64 in `sourceImage`), leaving other fields untouched.
async function withNormalizedSource(jobRequest) {
  const { referenceImageRaw, ...rest } = jobRequest;
  if (!referenceImageRaw) return rest;
  const sourceImage = await normalizeSourceImage(referenceImageRaw);
  return { ...rest, sourceImage };
}

router.post('/jobs', async (req, res, next) => {
  try {
    const jobRequest = buildJobRequest(req, res);
    if (!jobRequest) return;

    const { providerJobId } = await imageGenProvider.submit(await withNormalizedSource(jobRequest));

    res.status(201).json({
      jobId: providerJobId,
      prompt: jobRequest.prompt,
      model: jobRequest.model,
      width: jobRequest.width,
      height: jobRequest.height,
    });
  } catch (err) {
    if (err.message?.includes('prompt')) return res.status(400).json({ error: err.message });
    next(err);
  }
});

router.post('/jobs/estimate', async (req, res, next) => {
  try {
    const jobRequest = buildJobRequest(req, res);
    if (!jobRequest) return;

    const { kudos } = await imageGenProvider.estimateCost(await withNormalizedSource(jobRequest));

    res.json({ kudos, model: jobRequest.model, width: jobRequest.width, height: jobRequest.height });
  } catch (err) {
    if (err.message?.includes('prompt')) return res.status(400).json({ error: err.message });
    next(err);
  }
});

router.post('/alchemy', async (req, res, next) => {
  try {
    const { sourceImageUrl, upscaler } = req.body || {};
    if (!sourceImageUrl) return res.status(400).json({ error: 'A sourceImageUrl is required.' });
    if (!upscaler) return res.status(400).json({ error: 'An upscaler is required.' });

    const apiKey = requireApiKey(req, res);
    if (!apiKey) return;

    const { providerJobId } = await imageGenProvider.submitAlchemy({ apiKey, sourceImageUrl, upscaler });
    res.status(201).json({ jobId: providerJobId });
  } catch (err) {
    next(err);
  }
});

router.get('/alchemy/:jobId', async (req, res, next) => {
  try {
    const apiKey = requireApiKey(req, res);
    if (!apiKey) return;

    const status = await imageGenProvider.checkAlchemy({ apiKey, providerJobId: req.params.jobId });
    if (status.faulted) {
      return res.json({ ...status, message: 'Alchemy upscaling failed on the AI Horde network. Try again.' });
    }
    res.json(status);
  } catch (err) {
    next(err);
  }
});

router.get('/jobs/:jobId', async (req, res, next) => {
  try {
    const apiKey = requireApiKey(req, res);
    if (!apiKey) return;

    const status = await imageGenProvider.checkStatus({ apiKey, providerJobId: req.params.jobId });

    if (!status.done) {
      return res.json(status);
    }
    if (status.faulted) {
      return res.json({
        ...status,
        message: 'Generation failed on the AI Horde network. Try again, or try a different model.',
      });
    }

    const { images } = await imageGenProvider.fetchResult({ apiKey, providerJobId: req.params.jobId });

    // AI Horde's /check can flip `done` to true a moment before /status has
    // the generations — most often when a worker dropped the job and it was
    // restarted. Report it as still in progress so the client keeps polling
    // instead of treating an empty result as a finished (image-less) job.
    if (!images || images.length === 0) {
      return res.json({ ...status, done: false, images: [], finalizing: true });
    }

    res.json({ ...status, images });
  } catch (err) {
    next(err);
  }
});

export default router;
