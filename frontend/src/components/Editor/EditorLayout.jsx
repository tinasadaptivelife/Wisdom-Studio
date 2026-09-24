import { useCallback, useEffect, useRef, useState } from 'react';
import { useDesignStore } from '../../store/useDesignStore.js';
import { projectsApi } from '../../api/projectsApi.js';
import { buildPdfBytes, sanitizeFilename } from '../../utils/exportPdf.js';
import { waitForNextPaint, waitForPageImages, downloadBytes, captureThumbnail } from '../../utils/capturePages.js';
import { nudgeDelta } from '../../utils/nudge.js';
import TopBar from './TopBar.jsx';
import Toolbar from './Toolbar.jsx';
import CanvasStage from './CanvasStage.jsx';
import PagePanel from './PagePanel.jsx';
import LayersPanel from './LayersPanel.jsx';
import PropertiesPanel from './PropertiesPanel.jsx';
import './editor.css';

const AUTOSAVE_DELAY_MS = 1500;
const SAVE_RETRY_DELAY_MS = 5000;

export default function EditorLayout() {
  const project = useDesignStore((s) => s.project);
  const markSaving = useDesignStore((s) => s.markSaving);
  const markSaved = useDesignStore((s) => s.markSaved);
  const markSaveError = useDesignStore((s) => s.markSaveError);
  const saveStatus = useDesignStore((s) => s.saveStatus);
  const announce = useDesignStore((s) => s.announce);
  const timerRef = useRef(null);
  const retryTimerRef = useRef(null);
  // A loaded project is already in the backend; a brand-new one (just
  // created from a template) isn't yet — captured once at mount via the
  // saveStatus loadProject/newProjectFromTemplate set ('saved' vs 'unsaved').
  const persistedRef = useRef(useDesignStore.getState().saveStatus === 'saved');
  const stageApiRef = useRef(null);
  const [exportStatus, setExportStatus] = useState(null); // null | 'preparing' | 'error'
  const [exportError, setExportError] = useState(null);

  const handleStageReady = useCallback((api) => {
    stageApiRef.current = api;
  }, []);

  // Saves whatever the current project is (read fresh from the store, not a
  // stale closure) — shared by the debounced autosave and by the automatic
  // retry-after-failure below, so "Couldn't save — will retry" is honest.
  const performSave = useCallback(async () => {
    const currentProject = useDesignStore.getState().project;
    if (!currentProject) return;
    markSaving();
    try {
      const thumbnail = captureThumbnail(stageApiRef.current?.stage);
      const projectToSave = thumbnail ? { ...currentProject, thumbnail } : currentProject;
      if (!persistedRef.current) {
        await projectsApi.create(projectToSave);
        persistedRef.current = true;
      } else {
        await projectsApi.update(currentProject.id, projectToSave);
      }
      markSaved(new Date().toISOString());
    } catch (err) {
      markSaveError();
      retryTimerRef.current = setTimeout(performSave, SAVE_RETRY_DELAY_MS);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Autosave: debounce writes to the backend whenever the project changes.
  // A brand-new project (from a template, never yet persisted) doesn't save
  // until the user makes a real edit — merely opening/browsing a template
  // shouldn't clutter the saved-projects list. past.length>0 is exactly
  // "at least one edit has happened since this project was created/loaded."
  useEffect(() => {
    if (!project) return;
    const hasRealEdit = persistedRef.current || useDesignStore.getState().past.length > 0;
    if (!hasRealEdit) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
    timerRef.current = setTimeout(performSave, AUTOSAVE_DELAY_MS);
    return () => clearTimeout(timerRef.current);
  }, [project, performSave]);

  useEffect(
    () => () => {
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    },
    []
  );

  const handleExportPdf = async (booklet = false) => {
    const api = stageApiRef.current;
    const currentProject = useDesignStore.getState().project;
    if (!api?.stage || !currentProject || exportStatus === 'preparing') return;

    setExportStatus('preparing');
    setExportError(null);
    const originalPageIndex = useDesignStore.getState().currentPageIndex;

    try {
      const dataUrls = [];
      for (let i = 0; i < currentProject.pages.length; i++) {
        useDesignStore.getState().goToPage(i);
        await waitForNextPaint();
        await waitForPageImages(currentProject.pages[i], api.nodeRefs);
        dataUrls.push(api.stage.toDataURL({ pixelRatio: 2, mimeType: 'image/png' }));
      }
      const bytes = await buildPdfBytes(dataUrls, currentProject.pageSize, { booklet });
      downloadBytes(bytes, `${sanitizeFilename(currentProject.name)}.pdf`, 'application/pdf');
      setExportStatus(null);
    } catch (err) {
      setExportStatus('error');
      setExportError(
        err.name === 'SecurityError'
          ? 'A generated image couldn’t be included (the image host blocked it). Try regenerating that image, then export again.'
          : err.message || 'Something went wrong creating the PDF.'
      );
    } finally {
      useDesignStore.getState().goToPage(originalPageIndex);
    }
  };

  // Global keyboard shortcuts: undo/redo, delete selected element.
  useEffect(() => {
    const handler = (e) => {
      const tag = document.activeElement?.tagName;
      const isEditingText = tag === 'INPUT' || tag === 'TEXTAREA' || document.activeElement?.isContentEditable;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !isEditingText) {
        e.preventDefault();
        if (e.shiftKey) useDesignStore.getState().redo();
        else useDesignStore.getState().undo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y' && !isEditingText) {
        e.preventDefault();
        useDesignStore.getState().redo();
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && !isEditingText) {
        const { selectedElementId, deleteElement } = useDesignStore.getState();
        if (selectedElementId) {
          e.preventDefault();
          deleteElement(selectedElementId);
        }
      }
      const delta = nudgeDelta(e.key, e.shiftKey);
      if (delta && !isEditingText) {
        const { selectedElementId, project: currentProject, currentPageIndex, updateElement } = useDesignStore.getState();
        const el = currentProject?.pages[currentPageIndex]?.elements.find((e2) => e2.id === selectedElementId);
        if (el) {
          e.preventDefault();
          updateElement(selectedElementId, { x: el.x + delta.dx, y: el.y + delta.dy });
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  if (!project) return null;

  return (
    <div className="editor">
      <TopBar onExportPdf={handleExportPdf} exportStatus={exportStatus} exportError={exportError} />
      <div className="editor-body">
        <Toolbar />
        <div className="editor-center">
          <CanvasStage onStageReady={handleStageReady} />
          <PagePanel />
        </div>
        <div className="editor-sidebar" aria-label="Design panels">
          <PropertiesPanel />
          <LayersPanel />
        </div>
      </div>
      <div aria-live="polite" className="visually-hidden">
        {saveStatus === 'saving' ? 'Saving project…' : ''}
        {saveStatus === 'saved' ? 'Project saved.' : ''}
        {saveStatus === 'error' ? 'There was a problem saving your project.' : ''}
        {exportStatus === 'preparing' ? 'Preparing your PDF…' : ''}
      </div>
      <div aria-live="polite" className="visually-hidden">
        {announce}
      </div>
    </div>
  );
}
