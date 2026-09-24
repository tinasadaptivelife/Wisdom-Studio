import { useRef, useState } from 'react';
import { useDesignStore } from '../../store/useDesignStore.js';
import ImageGenerationPanel from './ImageGenerationPanel.jsx';
import {
  isDictationSupported,
  isReadAloudSupported,
  createRecognizer,
  readAloud,
  stopReadingAloud,
} from '../../utils/speech.js';

// Split into horizontal/vertical clusters (max 3 each) instead of one flat
// row of 6 — matches how alignment tools are grouped in most design apps,
// and keeps each decision point within the ~4-item working-memory guideline.
const HORIZONTAL_ALIGN_BUTTONS = [
  { key: 'left', label: 'Left' },
  { key: 'center-h', label: 'Center' },
  { key: 'right', label: 'Right' },
];
const VERTICAL_ALIGN_BUTTONS = [
  { key: 'top', label: 'Top' },
  { key: 'center-v', label: 'Middle' },
  { key: 'bottom', label: 'Bottom' },
];

export default function PropertiesPanel() {
  const project = useDesignStore((s) => s.project);
  const currentPageIndex = useDesignStore((s) => s.currentPageIndex);
  const selectedElementId = useDesignStore((s) => s.selectedElementId);
  const updateElement = useDesignStore((s) => s.updateElement);
  const alignElement = useDesignStore((s) => s.alignElement);
  const reorderElement = useDesignStore((s) => s.reorderElement);

  const [dictating, setDictating] = useState(false);
  const [reading, setReading] = useState(false);
  const recognitionRef = useRef(null);

  const element = project.pages[currentPageIndex].elements.find((e) => e.id === selectedElementId);

  if (!element) {
    return (
      <section className="properties-panel" aria-labelledby="properties-heading">
        <h2 id="properties-heading">Properties</h2>
        <p className="panel-empty">Select an item on the canvas or in Layers to edit it.</p>
      </section>
    );
  }

  const num = (patchKey) => (e) => {
    const value = Number(e.target.value);
    if (!Number.isNaN(value)) updateElement(element.id, { [patchKey]: value });
  };

  const handleToggleDictation = () => {
    if (dictating) {
      recognitionRef.current?.stop();
      setDictating(false);
      return;
    }
    const recognition = createRecognizer({
      onResult: (transcript) => {
        const current = useDesignStore.getState().project.pages[currentPageIndex].elements.find(
          (e) => e.id === element.id
        );
        const next = current?.text ? `${current.text} ${transcript}` : transcript;
        updateElement(element.id, { text: next });
      },
      onEnd: () => setDictating(false),
    });
    recognitionRef.current = recognition;
    recognition.start();
    setDictating(true);
  };

  const handleToggleReadAloud = () => {
    if (reading) {
      stopReadingAloud();
      setReading(false);
      return;
    }
    readAloud(element.text, { onEnd: () => setReading(false) });
    setReading(true);
  };

  return (
    <section className="properties-panel" aria-labelledby="properties-heading">
      <h2 id="properties-heading">Properties</h2>

      <label className="field">
        <span>Name</span>
        <input value={element.name} onChange={(e) => updateElement(element.id, { name: e.target.value })} />
      </label>

      <fieldset className="field-grid">
        <legend>Position</legend>
        <label>
          <span>X</span>
          <input type="number" value={Math.round(element.x)} onChange={num('x')} />
        </label>
        <label>
          <span>Y</span>
          <input type="number" value={Math.round(element.y)} onChange={num('y')} />
        </label>
      </fieldset>

      <fieldset className="field-grid">
        <legend>Size &amp; rotation</legend>
        <label>
          <span>Width</span>
          <input type="number" value={Math.round(element.width)} onChange={num('width')} />
        </label>
        <label>
          <span>Height</span>
          <input type="number" value={Math.round(element.height)} onChange={num('height')} />
        </label>
        <label>
          <span>Rotation (°)</span>
          <input type="number" value={Math.round(element.rotation)} onChange={num('rotation')} />
        </label>
      </fieldset>

      {element.type === 'text' && (
        <fieldset className="field-grid">
          <legend>Text</legend>
          <label style={{ gridColumn: '1 / -1' }}>
            <span>Text content</span>
            <textarea
              rows={3}
              value={element.text}
              onChange={(e) => updateElement(element.id, { text: e.target.value })}
            />
          </label>
          {(isDictationSupported() || isReadAloudSupported()) && (
            <div className="align-buttons" style={{ gridColumn: '1 / -1' }}>
              {isDictationSupported() && (
                <button type="button" onClick={handleToggleDictation} aria-pressed={dictating}>
                  {dictating ? 'Stop dictation' : 'Start dictation'}
                </button>
              )}
              {isReadAloudSupported() && (
                <button type="button" onClick={handleToggleReadAloud} aria-pressed={reading}>
                  {reading ? 'Stop reading' : 'Read aloud'}
                </button>
              )}
            </div>
          )}
          <label>
            <span>Font size</span>
            <input type="number" value={element.fontSize} onChange={num('fontSize')} />
          </label>
          <label>
            <span>Color</span>
            <input type="color" value={element.fill} onChange={(e) => updateElement(element.id, { fill: e.target.value })} />
          </label>
          <label>
            <span>Alignment</span>
            <select value={element.align} onChange={(e) => updateElement(element.id, { align: e.target.value })}>
              <option value="left">Left</option>
              <option value="center">Center</option>
              <option value="right">Right</option>
            </select>
          </label>
          <p className="hint">Tip: you can also double-click the text on the canvas to edit it in place.</p>
        </fieldset>
      )}

      {(element.type === 'rect' || element.type === 'ellipse') && (
        <fieldset className="field-grid">
          <legend>Shape style</legend>
          <label>
            <span>Fill</span>
            <input type="color" value={element.fill} onChange={(e) => updateElement(element.id, { fill: e.target.value })} />
          </label>
          <label>
            <span>Outline</span>
            <input type="color" value={element.stroke} onChange={(e) => updateElement(element.id, { stroke: e.target.value })} />
          </label>
        </fieldset>
      )}

      {element.type === 'image-placeholder' && (
        <fieldset className="field-grid">
          <legend>Placeholder</legend>
          <label>
            <span>Label</span>
            <input value={element.label} onChange={(e) => updateElement(element.id, { label: e.target.value })} />
          </label>
        </fieldset>
      )}

      {(element.type === 'image-placeholder' || element.type === 'image') && (
        <ImageGenerationPanel element={element} />
      )}

      <fieldset className="field-grid">
        <legend>Align horizontally</legend>
        <div className="align-buttons">
          {HORIZONTAL_ALIGN_BUTTONS.map((a) => (
            <button key={a.key} onClick={() => alignElement(element.id, a.key)} aria-label={`Align ${a.label.toLowerCase()}`}>
              {a.label}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="field-grid">
        <legend>Align vertically</legend>
        <div className="align-buttons">
          {VERTICAL_ALIGN_BUTTONS.map((a) => (
            <button key={a.key} onClick={() => alignElement(element.id, a.key)} aria-label={`Align ${a.label.toLowerCase()}`}>
              {a.label}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="field-grid">
        <legend>Stacking order</legend>
        <div className="align-buttons">
          <button onClick={() => reorderElement(element.id, 'front')} aria-label="Bring to front">
            Bring to front
          </button>
          <button onClick={() => reorderElement(element.id, 'back')} aria-label="Send to back">
            Send to back
          </button>
        </div>
      </fieldset>
    </section>
  );
}
