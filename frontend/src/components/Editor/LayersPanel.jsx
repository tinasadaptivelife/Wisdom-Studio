import { Eye, EyeOff, Lock, Unlock, ArrowUp, ArrowDown, Trash2 } from 'lucide-react';
import { useDesignStore } from '../../store/useDesignStore.js';

const typeLabel = {
  text: 'Text',
  rect: 'Rectangle',
  ellipse: 'Ellipse',
  'image-placeholder': 'Image placeholder',
  image: 'Image',
};

const ICON_SIZE = 18;

export default function LayersPanel() {
  const project = useDesignStore((s) => s.project);
  const currentPageIndex = useDesignStore((s) => s.currentPageIndex);
  const selectedElementId = useDesignStore((s) => s.selectedElementId);
  const selectElement = useDesignStore((s) => s.selectElement);
  const updateElement = useDesignStore((s) => s.updateElement);
  const deleteElement = useDesignStore((s) => s.deleteElement);
  const reorderElement = useDesignStore((s) => s.reorderElement);

  const elements = project.pages[currentPageIndex].elements;
  const frontToBack = [...elements].reverse();

  return (
    <section className="layers-panel" aria-labelledby="layers-heading">
      <h2 id="layers-heading">Layers</h2>
      {frontToBack.length === 0 && <p className="panel-empty">No items on this page yet.</p>}
      <ul className="layers-list" role="list">
        {frontToBack.map((el) => {
          const isSelected = el.id === selectedElementId;
          return (
            <li key={el.id} className={`layer-row${isSelected ? ' selected' : ''}`}>
              <button
                className="layer-select"
                onClick={() => selectElement(el.id)}
                aria-pressed={isSelected}
                aria-label={`Select ${el.name || typeLabel[el.type]}`}
              >
                {el.name || typeLabel[el.type]}
              </button>
              <div className="layer-controls">
                <button
                  onClick={() => updateElement(el.id, { visible: el.visible === false })}
                  aria-label={el.visible === false ? `Show ${el.name}` : `Hide ${el.name}`}
                  aria-pressed={el.visible === false}
                >
                  {el.visible === false ? (
                    <EyeOff size={ICON_SIZE} aria-hidden="true" />
                  ) : (
                    <Eye size={ICON_SIZE} aria-hidden="true" />
                  )}
                </button>
                <button
                  onClick={() => updateElement(el.id, { locked: !el.locked })}
                  aria-label={el.locked ? `Unlock ${el.name}` : `Lock ${el.name}`}
                  aria-pressed={!!el.locked}
                >
                  {el.locked ? <Lock size={ICON_SIZE} aria-hidden="true" /> : <Unlock size={ICON_SIZE} aria-hidden="true" />}
                </button>
                <button onClick={() => reorderElement(el.id, 'forward')} aria-label={`Move ${el.name} forward`}>
                  <ArrowUp size={ICON_SIZE} aria-hidden="true" />
                </button>
                <button onClick={() => reorderElement(el.id, 'backward')} aria-label={`Move ${el.name} backward`}>
                  <ArrowDown size={ICON_SIZE} aria-hidden="true" />
                </button>
                <button onClick={() => deleteElement(el.id)} aria-label={`Delete ${el.name}`}>
                  <Trash2 size={ICON_SIZE} aria-hidden="true" />
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
