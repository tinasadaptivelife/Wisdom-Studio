import { useState } from 'react';
import { ArrowLeft, Undo2, Redo2, Download } from 'lucide-react';
import { useDesignStore } from '../../store/useDesignStore.js';

function formatSaveStatus(status, lastSavedAt) {
  if (status === 'saving') return 'Saving…';
  if (status === 'error') return 'Couldn’t save — will retry';
  if (status === 'saved' && lastSavedAt) {
    return `Last saved ${new Date(lastSavedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }
  return 'Unsaved changes';
}

export default function TopBar({ onExportPdf, exportStatus, exportError }) {
  const project = useDesignStore((s) => s.project);
  const setProjectName = useDesignStore((s) => s.setProjectName);
  const closeProject = useDesignStore((s) => s.closeProject);
  const undo = useDesignStore((s) => s.undo);
  const redo = useDesignStore((s) => s.redo);
  const canUndo = useDesignStore((s) => s.past.length > 0);
  const canRedo = useDesignStore((s) => s.future.length > 0);
  const saveStatus = useDesignStore((s) => s.saveStatus);
  const lastSavedAt = useDesignStore((s) => s.lastSavedAt);
  const [bookletOrder, setBookletOrder] = useState(false);

  return (
    <header className="topbar">
      <button onClick={closeProject} aria-label="Back to home screen">
        <ArrowLeft size={18} strokeWidth={2.2} aria-hidden="true" />
        Home
      </button>
      <label className="visually-hidden" htmlFor="project-name">
        Project name
      </label>
      <input
        id="project-name"
        className="project-name-input"
        value={project.name}
        onChange={(e) => setProjectName(e.target.value)}
      />
      <div className="topbar-actions">
        <button onClick={undo} disabled={!canUndo} aria-label="Undo last change">
          <Undo2 size={18} strokeWidth={2.2} aria-hidden="true" />
          Undo
        </button>
        <button onClick={redo} disabled={!canRedo} aria-label="Redo last undone change">
          <Redo2 size={18} strokeWidth={2.2} aria-hidden="true" />
          Redo
        </button>
        <label className="booklet-toggle">
          <input type="checkbox" checked={bookletOrder} onChange={(e) => setBookletOrder(e.target.checked)} />
          <span>Booklet order (for folding &amp; stapling)</span>
        </label>
        <button
          onClick={() => onExportPdf(bookletOrder)}
          disabled={exportStatus === 'preparing'}
          className="primary"
          aria-label="Export this project as a PDF"
        >
          <Download size={18} strokeWidth={2.2} aria-hidden="true" />
          {exportStatus === 'preparing' ? 'Preparing PDF…' : 'Export to PDF'}
        </button>
        <span className="save-status" role="status">
          {formatSaveStatus(saveStatus, lastSavedAt)}
        </span>
      </div>
      {exportStatus === 'error' && (
        <p className="export-error" role="alert">
          {exportError}{' '}
          <button onClick={() => onExportPdf(bookletOrder)} className="quiet">
            Retry
          </button>
        </p>
      )}
    </header>
  );
}
