import { aiHordeProvider } from './aiHordeProvider.js';

// Swapping to a self-hosted backend (FLUX.1-schnell / SDXL via ComfyUI) later
// means writing a provider satisfying provider.interface.js and changing
// this one export — routes/imageGen.js never talks to AI Horde directly.
export const imageGenProvider = aiHordeProvider;

export * from './promptTemplates.js';
