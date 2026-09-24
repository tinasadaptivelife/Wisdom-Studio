/**
 * Contract every image generation backend must satisfy, so the AI Horde
 * provider can later be swapped for a self-hosted one (FLUX.1-schnell or
 * SDXL via ComfyUI) without touching routes/imageGen.js.
 *
 * @typedef {object} ImageGenProvider
 * @property {(args: { apiKey: string, prompt: string, negativePrompt?: string, model: string, width: number, height: number, postProcessing?: string[], sourceImage?: string, sourceProcessing?: string, denoisingStrength?: number, n?: number }) => Promise<{ providerJobId: string }>} submit
 * @property {(args: { apiKey: string, prompt: string, negativePrompt?: string, model: string, width: number, height: number, postProcessing?: string[], sourceImage?: string, sourceProcessing?: string, denoisingStrength?: number, n?: number }) => Promise<{ kudos: number }>} estimateCost
 * @property {(args: { apiKey: string, providerJobId: string }) => Promise<{ done: boolean, faulted: boolean, waitTimeSeconds: number, queuePosition: number }>} checkStatus
 * @property {(args: { apiKey: string, providerJobId: string }) => Promise<{ images: Array<{ url: string, seed?: string }> }>} fetchResult
 * @property {(args: { apiKey: string }) => Promise<Array<{ name: string, count: number }>>} listModels
 * @property {(args: { apiKey: string, sourceImageUrl: string, upscaler: string }) => Promise<{ providerJobId: string }>} submitAlchemy
 * @property {(args: { apiKey: string, providerJobId: string }) => Promise<{ done: boolean, faulted: boolean, url?: string }>} checkAlchemy
 */
export const IMAGE_GEN_PROVIDER_SHAPE = [
  'submit',
  'estimateCost',
  'checkStatus',
  'fetchResult',
  'listModels',
  'submitAlchemy',
  'checkAlchemy',
];
