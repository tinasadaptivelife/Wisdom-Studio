import { useEffect, useState } from 'react';
import { useDesignStore } from '../../store/useDesignStore.js';
import { imageGenApi } from '../../api/imageGenApi.js';

const STYLE_MODES = [
  { key: 'general', label: 'General' },
  { key: 'storybook', label: 'Storybook illustration' },
  { key: 'flyer', label: 'Flyer graphic' },
  { key: 'coloring-page', label: 'Coloring page line art' },
];

// Curated subset of AI Horde's post-processing upscalers — plain-language
// labels over the raw model names, same convention as modelCatalog.js's
// CURATED_MODELS. No live-worker-list to validate against for these (unlike
// generation models), so this is a fixed, hand-picked set.
const UPSCALERS = [
  { key: 'RealESRGAN_x4plus', label: 'Sharper detail (general purpose)' },
  { key: 'RealESRGAN_x2plus', label: 'Balanced (lighter touch)' },
  { key: 'RealESRGAN_x4plus_anime_6B', label: 'Anime / illustration' },
  { key: 'NMKD_Siax', label: 'Soft, painterly' },
  { key: '4x_AnimeSharp', label: 'Anime, extra sharp' },
];

const defaultModeForTemplate = (templateKey) =>
  STYLE_MODES.some((m) => m.key === templateKey) ? templateKey : 'general';

const formatWait = (seconds) => {
  if (seconds == null) return null;
  if (seconds < 60) return `${Math.max(0, Math.round(seconds))}s`;
  return `${Math.round(seconds / 60)} min`;
};

const progressMessage = (gen) => {
  if (!gen) return null;
  if (gen.status === 'submitting') return 'Sending your request to AI Horde…';
  if (gen.status === 'polling') {
    const bits = [];
    if (gen.queuePosition > 0) bits.push(`queue position ${gen.queuePosition}`);
    const wait = formatWait(gen.waitTimeSeconds);
    if (wait) bits.push(`about ${wait} left`);
    return `Generating your image… ${bits.length ? bits.join(', ') : 'almost there'}`;
  }
  return null;
};

export default function ImageGenerationPanel({ element }) {
  const templateKey = useDesignStore((s) => s.project.templateKey);
  const generation = useDesignStore((s) => s.imageGeneration[element.id]);
  const costEstimate = useDesignStore((s) => s.imageCostEstimate[element.id]);
  const alchemy = useDesignStore((s) => s.alchemyUpscale[element.id]);
  const generateImageForElement = useDesignStore((s) => s.generateImageForElement);
  const estimateImageCost = useDesignStore((s) => s.estimateImageCost);
  const updateElement = useDesignStore((s) => s.updateElement);
  const upscaleImageViaAlchemy = useDesignStore((s) => s.upscaleImageViaAlchemy);
  const useAlchemyResult = useDesignStore((s) => s.useAlchemyResult);

  const isImage = element.type === 'image';
  const [prompt, setPrompt] = useState(element.prompt || (isImage ? '' : element.label || ''));
  const [mode, setMode] = useState(element.mode || defaultModeForTemplate(templateKey));
  const [model, setModel] = useState(element.model || '');
  // 'none' | 'inline' | 'alchemy' — folds the old standalone "print quality"
  // checkbox into one control for whether/how to upscale.
  const [upscaleMode, setUpscaleMode] = useState('none');
  const [upscaler, setUpscaler] = useState(UPSCALERS[0].key);
  const [models, setModels] = useState([]);
  const [modelsError, setModelsError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    imageGenApi
      .listModels()
      .then(({ models: list, default: defaultModel }) => {
        if (cancelled) return;
        setModels(list);
        setModel((current) => current || defaultModel);
      })
      .catch((err) => {
        if (!cancelled) setModelsError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const busy = generation?.status === 'submitting' || generation?.status === 'polling';
  const message = progressMessage(generation);
  const alchemyBusy = alchemy?.status === 'submitting' || alchemy?.status === 'polling';

  // Wanting a bigger final image is implied by choosing any upscale mode at
  // all — it's no longer a separate "print quality" checkbox — while which
  // post-processor to apply (and inline vs. Alchemy) is the explicit choice.
  const printQuality = upscaleMode !== 'none';

  const handleGenerate = () => {
    if (!prompt.trim() || busy) return;
    generateImageForElement(element.id, {
      prompt: prompt.trim(),
      mode,
      model,
      printQuality,
      postProcessingMode: upscaleMode,
      upscaler: upscaleMode !== 'none' ? upscaler : undefined,
    });
  };

  const handleEstimateCost = () => {
    if (!prompt.trim() || busy) return;
    estimateImageCost(element.id, { prompt: prompt.trim(), mode, model, printQuality });
  };

  const handleUpscaleViaAlchemy = () => {
    if (alchemyBusy) return;
    upscaleImageViaAlchemy(element.id, { upscaler, sourceImageUrl: element.src });
  };

  const handleUseAlchemyResult = () => {
    useAlchemyResult(element.id);
  };

  const clearImage = () => {
    updateElement(element.id, {
      type: 'image-placeholder',
      label: 'Image goes here',
      src: undefined,
      prompt: undefined,
      mode: undefined,
      model: undefined,
    });
  };

  return (
    <fieldset className="field-grid image-gen-panel">
      <legend>{isImage ? 'Regenerate with AI' : 'Generate with AI'}</legend>

      <label style={{ gridColumn: '1 / -1' }}>
        <span>Prompt</span>
        <textarea
          rows={3}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe the image you want, e.g. “a friendly otter reading a book”"
        />
      </label>

      <label>
        <span>Style</span>
        <select value={mode} onChange={(e) => setMode(e.target.value)}>
          {STYLE_MODES.map((m) => (
            <option key={m.key} value={m.key}>
              {m.label}
            </option>
          ))}
        </select>
      </label>

      <details className="advanced-options" style={{ gridColumn: '1 / -1' }}>
        <summary>Advanced options</summary>
        <label>
          <span>Art engine</span>
          <select value={model} onChange={(e) => setModel(e.target.value)} disabled={models.length === 0}>
            {models.length === 0 && <option value="">Loading…</option>}
            {models.map((m) => (
              <option key={m.name} value={m.name}>
                {m.label}
              </option>
            ))}
          </select>
        </label>
        {modelsError && (
          <p className="hint" role="alert">
            Couldn&apos;t load the art engine list ({modelsError}). Generating will still use the standard engine.
          </p>
        )}
      </details>

      <label>
        <span>Upscale</span>
        <select value={upscaleMode} onChange={(e) => setUpscaleMode(e.target.value)}>
          <option value="none">None</option>
          <option value="inline">Inline (replaces the original)</option>
          <option value="alchemy">Alchemy (A/B — keep the original)</option>
        </select>
      </label>

      {upscaleMode !== 'none' && (
        <label>
          <span>Upscaler</span>
          <select value={upscaler} onChange={(e) => setUpscaler(e.target.value)}>
            {UPSCALERS.map((u) => (
              <option key={u.key} value={u.key}>
                {u.label}
              </option>
            ))}
          </select>
        </label>
      )}

      <div className="align-buttons" style={{ gridColumn: '1 / -1' }}>
        <button onClick={handleEstimateCost} disabled={!prompt.trim() || busy}>
          {costEstimate?.status === 'loading' ? 'Checking cost…' : 'Check kudos cost'}
        </button>
        <button onClick={handleGenerate} disabled={!prompt.trim() || busy} className="primary">
          {isImage ? 'Regenerate image' : 'Generate image'}
        </button>
        {isImage && upscaleMode === 'alchemy' && (
          <button onClick={handleUpscaleViaAlchemy} disabled={alchemyBusy}>
            {alchemyBusy ? 'Upscaling…' : 'Upscale via Alchemy'}
          </button>
        )}
        {isImage && (
          <button onClick={clearImage} disabled={busy}>
            Clear image
          </button>
        )}
      </div>

      {alchemy?.status === 'done' && (
        <div className="alchemy-preview" style={{ gridColumn: '1 / -1' }}>
          <p className="hint">Alchemy upscale ready — compare and choose:</p>
          <img src={alchemy.url} alt="Alchemy upscale preview" style={{ maxWidth: '100%' }} />
          <button onClick={handleUseAlchemyResult}>Use this version</button>
        </div>
      )}
      {alchemy?.status === 'error' && (
        <p className="hint image-gen-error" role="alert" style={{ gridColumn: '1 / -1' }}>
          {alchemy.message || 'Something went wrong upscaling this image.'}
        </p>
      )}

      {costEstimate?.status === 'ready' && (
        <p className="hint image-gen-cost" style={{ gridColumn: '1 / -1' }}>
          Estimated cost: {costEstimate.kudos} kudos
        </p>
      )}
      {costEstimate?.status === 'error' && (
        <p className="hint image-gen-error" role="alert" style={{ gridColumn: '1 / -1' }}>
          Couldn&apos;t check the cost ({costEstimate.message}).
        </p>
      )}

      {message && (
        <p className="hint image-gen-status" role="status" aria-live="polite" style={{ gridColumn: '1 / -1' }}>
          {message}
        </p>
      )}
      {generation?.status === 'error' && (
        <p className="hint image-gen-error" role="alert" style={{ gridColumn: '1 / -1' }}>
          {generation.message || 'Something went wrong generating this image.'}{' '}
          <button onClick={handleGenerate}>Retry</button>
        </p>
      )}
    </fieldset>
  );
}
