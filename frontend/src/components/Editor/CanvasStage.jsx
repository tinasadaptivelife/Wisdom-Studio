import { useEffect, useRef, useState } from 'react';
import { Stage, Layer, Rect, Transformer } from 'react-konva';
import { useDesignStore } from '../../store/useDesignStore.js';
import { PAGE_SIZES } from '../../utils/pageSizes.js';
import { extractSelection } from '../../utils/textSelection.js';
import ElementRenderer from './ElementRenderer.jsx';

export default function CanvasStage({ onStageReady }) {
  const project = useDesignStore((s) => s.project);
  const currentPageIndex = useDesignStore((s) => s.currentPageIndex);
  const selectedElementId = useDesignStore((s) => s.selectedElementId);
  const selectElement = useDesignStore((s) => s.selectElement);
  const updateElement = useDesignStore((s) => s.updateElement);

  const page = project.pages[currentPageIndex];
  const { width: pageWidth, height: pageHeight } = PAGE_SIZES[project.pageSize];

  const stageRef = useRef(null);
  const transformerRef = useRef(null);
  const nodeRefs = useRef({});
  const [editing, setEditing] = useState(null); // { elementId, node }
  const [hasSelection, setHasSelection] = useState(false);
  const textareaRef = useRef(null);
  const toolbarRef = useRef(null);
  const editingNodeRef = useRef(null);
  const viewportRef = useRef(null);

  const targetImageElement = page.elements.find((el) => el.type === 'image' || el.type === 'image-placeholder');

  const registerRef = (id, node) => {
    if (node) nodeRefs.current[id] = node;
    else delete nodeRefs.current[id];
  };

  // Hands the underlying Konva stage + node refs up to EditorLayout once, so
  // PDF export can rasterize each page (stage.toDataURL()) and confirm
  // generated images have loaded, without CanvasStage knowing about export.
  useEffect(() => {
    onStageReady?.({ stage: stageRef.current, nodeRefs });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const transformer = transformerRef.current;
    if (!transformer) return;
    const node = selectedElementId ? nodeRefs.current[selectedElementId] : null;
    if (node) {
      transformer.nodes([node]);
      transformer.getLayer().batchDraw();
    } else {
      transformer.nodes([]);
    }
  }, [selectedElementId, page.elements]);

  const handleStageMouseDown = (e) => {
    if (e.target === e.target.getStage()) selectElement(null);
  };

  // Keeps the overlay textarea aligned with its Konva text node — called on
  // entry and again on every scroll of the canvas viewport, since the
  // textarea is a plain DOM element positioned in fixed screen coordinates
  // and doesn't move with the canvas on its own.
  const positionTextarea = (groupNode) => {
    const stage = stageRef.current;
    const textarea = textareaRef.current;
    if (!stage || !groupNode || !textarea) return;
    const containerRect = stage.container().getBoundingClientRect();
    const absPos = groupNode.getAbsolutePosition();
    textarea.style.left = `${containerRect.left + absPos.x}px`;
    textarea.style.top = `${containerRect.top + absPos.y}px`;
    const toolbar = toolbarRef.current;
    if (toolbar) {
      toolbar.style.left = `${containerRect.left + absPos.x}px`;
      // Sits just above the textarea rather than overlapping it.
      toolbar.style.top = `${containerRect.top + absPos.y - 40}px`;
    }
  };

  const startTextEdit = (element, groupNode) => {
    editingNodeRef.current = groupNode;
    setEditing({ elementId: element.id, originalText: element.text });
    setHasSelection(false);
    requestAnimationFrame(() => {
      const textarea = textareaRef.current;
      if (!textarea || !groupNode) return;
      textarea.style.display = 'block';
      textarea.style.width = `${element.width}px`;
      textarea.style.height = `${element.height}px`;
      textarea.style.fontSize = `${element.fontSize}px`;
      textarea.style.fontFamily = element.fontFamily;
      textarea.style.color = element.fill;
      textarea.style.textAlign = element.align;
      textarea.value = element.text;
      if (toolbarRef.current) toolbarRef.current.style.display = 'flex';
      positionTextarea(groupNode);
      textarea.focus();
      textarea.select();
    });
  };

  const commitTextEdit = () => {
    if (!editing) return;
    const value = textareaRef.current?.value ?? '';
    updateElement(editing.elementId, { text: value });
    setEditing(null);
    setHasSelection(false);
    editingNodeRef.current = null;
    if (textareaRef.current) textareaRef.current.style.display = 'none';
    if (toolbarRef.current) toolbarRef.current.style.display = 'none';
  };

  // Escape discards changes and restores the original text, matching every
  // other text-editing surface (form fields, most editors) — it does not
  // save, unlike a plain blur/Enter.
  const cancelTextEdit = () => {
    if (!editing) return;
    setEditing(null);
    setHasSelection(false);
    editingNodeRef.current = null;
    if (textareaRef.current) textareaRef.current.style.display = 'none';
    if (toolbarRef.current) toolbarRef.current.style.display = 'none';
  };

  // Sending a passage to an image prompt first commits any in-progress text
  // edit (so nothing typed is lost), then seeds the page's image element and
  // jumps the selection there so the AI panel shows the prompt immediately.
  const useSelectionAsImagePrompt = () => {
    const textarea = textareaRef.current;
    if (!textarea || !targetImageElement) return;
    const selected = extractSelection(textarea.value, textarea.selectionStart, textarea.selectionEnd);
    if (!selected) return;
    commitTextEdit();
    updateElement(targetImageElement.id, { prompt: selected });
    selectElement(targetImageElement.id);
  };

  useEffect(() => {
    if (!editing) return;
    const viewport = viewportRef.current;
    const handleReposition = () => positionTextarea(editingNodeRef.current);
    viewport?.addEventListener('scroll', handleReposition);
    window.addEventListener('resize', handleReposition);
    return () => {
      viewport?.removeEventListener('scroll', handleReposition);
      window.removeEventListener('resize', handleReposition);
    };
  }, [editing]);

  return (
    <div className="canvas-viewport" ref={viewportRef}>
      <Stage
        ref={stageRef}
        width={pageWidth}
        height={pageHeight}
        onMouseDown={handleStageMouseDown}
        onTouchStart={handleStageMouseDown}
        className="konva-stage"
        aria-hidden="true"
      >
        <Layer>
          <Rect
            x={0}
            y={0}
            width={pageWidth}
            height={pageHeight}
            fill="#ffffff"
            stroke="#d8d0c2"
            strokeWidth={1}
            listening={false}
          />
          {page.elements.map((el) => (
            <ElementRenderer
              key={el.id}
              element={el}
              isSelected={el.id === selectedElementId}
              registerRef={registerRef}
              onSelect={selectElement}
              onChange={updateElement}
              onDblClickText={startTextEdit}
            />
          ))}
          <Transformer
            ref={transformerRef}
            rotateEnabled
            // Bigger, brand-colored handles: easier to grab precisely for
            // users with tremor or low vision, and matches the design system
            // (crimson selection) instead of Konva's default light blue.
            anchorSize={18}
            anchorCornerRadius={4}
            anchorFill="#ffffff"
            anchorStroke="#b23a48"
            anchorStrokeWidth={2.5}
            borderStroke="#b23a48"
            borderStrokeWidth={2.5}
            rotateAnchorOffset={32}
            boundBoxFunc={(oldBox, newBox) => {
              if (newBox.width < 20 || newBox.height < 20) return oldBox;
              return newBox;
            }}
          />
        </Layer>
      </Stage>
      <textarea
        ref={textareaRef}
        className="canvas-text-editor"
        style={{ display: 'none' }}
        onBlur={commitTextEdit}
        onSelect={(e) => setHasSelection(e.target.selectionStart !== e.target.selectionEnd)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') cancelTextEdit();
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            commitTextEdit();
          }
        }}
        aria-label="Edit text content"
      />
      <div ref={toolbarRef} className="canvas-text-toolbar" style={{ display: 'none' }}>
        <button
          type="button"
          disabled={!hasSelection || !targetImageElement}
          title={targetImageElement ? undefined : 'Add an image spot to this page first'}
          // Keeps the textarea focused (and its selection intact) through the
          // click — a mousedown here would otherwise blur the textarea first.
          onMouseDown={(e) => e.preventDefault()}
          onClick={useSelectionAsImagePrompt}
        >
          Use selection as image prompt
        </button>
      </div>
      <p className="visually-hidden" role="note">
        Canvas editor: use the Add buttons to place text, shapes, or an image placeholder, then use the Layers and
        Properties panels to select, move, resize, or delete items with the keyboard.
      </p>
    </div>
  );
}
