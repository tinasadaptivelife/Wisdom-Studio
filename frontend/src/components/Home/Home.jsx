import { useEffect, useState } from 'react';
import { ASSET_TYPES, getTemplatesForType } from '../../templates/templates.js';
import { useDesignStore } from '../../store/useDesignStore.js';
import { projectsApi } from '../../api/projectsApi.js';
import { readImportedFile } from '../../utils/textImport.js';
import TemplatePreview from './TemplatePreview.jsx';
import './Home.css';

const IMPORT_TEMPLATES = [
  { key: 'storybook', title: 'Storybook page' },
  { key: 'flyer', title: 'Flyer' },
];

export default function Home() {
  const newProjectFromTemplate = useDesignStore((s) => s.newProjectFromTemplate);
  const newProjectFromImportedText = useDesignStore((s) => s.newProjectFromImportedText);
  const loadProject = useDesignStore((s) => s.loadProject);
  const [savedProjects, setSavedProjects] = useState([]);
  const [loadError, setLoadError] = useState(null);
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const [importTemplateKey, setImportTemplateKey] = useState('storybook');
  const [importFile, setImportFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState(null);
  const [selectedType, setSelectedType] = useState(null);

  useEffect(() => {
    projectsApi
      .list()
      .then(setSavedProjects)
      .catch((err) => setLoadError(err.message));
  }, []);

  const openSavedProject = async (id) => {
    try {
      const project = await projectsApi.get(id);
      loadProject(project);
    } catch (err) {
      setLoadError(err.message);
    }
  };

  const startRename = (p) => {
    setRenamingId(p.id);
    setRenameValue(p.name);
  };

  const commitRename = async (id) => {
    setRenamingId(null);
    const trimmed = renameValue.trim();
    if (!trimmed) return;
    try {
      const full = await projectsApi.get(id);
      if (full.name === trimmed) return;
      await projectsApi.update(id, { ...full, name: trimmed });
      setSavedProjects((prev) => prev.map((sp) => (sp.id === id ? { ...sp, name: trimmed } : sp)));
    } catch (err) {
      setLoadError(err.message);
    }
  };

  const handleTypeCardClick = (type) => {
    const variants = getTemplatesForType(type.key);
    if (variants.length === 1) {
      newProjectFromTemplate(variants[0].key, type.defaultPageSize);
    } else {
      setSelectedType(type);
    }
  };

  const handleImport = async () => {
    if (!importFile) return;
    setImporting(true);
    setImportError(null);
    try {
      const text = await readImportedFile(importFile);
      newProjectFromImportedText({
        text,
        templateKey: importTemplateKey,
        name: importFile.name.replace(/\.[^.]+$/, ''),
      });
    } catch (err) {
      setImportError(err.message);
    } finally {
      setImporting(false);
    }
  };

  const handleDelete = async (p) => {
    if (!window.confirm(`Delete "${p.name}"? This can't be undone.`)) return;
    try {
      await projectsApi.remove(p.id);
      setSavedProjects((prev) => prev.filter((sp) => sp.id !== p.id));
    } catch (err) {
      setLoadError(err.message);
    }
  };

  return (
    <main className="home">
      <header className="home-header">
        <h1>Wisdom Studio</h1>
        <p>Design quote cards, newsletters, workbooks, certificates, and more — free to create, free to share.</p>
      </header>

      <section aria-labelledby="templates-heading" className="home-section">
        <h2 id="templates-heading">
          {selectedType ? `Choose a ${selectedType.title} template` : 'Start from a template'}
        </h2>
        {selectedType && (
          <button className="quiet" onClick={() => setSelectedType(null)} aria-label="Back to templates">
            ← Back to templates
          </button>
        )}
        <ul className="template-grid" role="list">
          {selectedType
            ? getTemplatesForType(selectedType.key).map((variant) => {
                const accent = variant.accent ?? selectedType.accent;
                return (
                  <li key={variant.key}>
                    <button
                      className="template-card"
                      style={{ '--accent': accent }}
                      onClick={() => newProjectFromTemplate(variant.key, selectedType.defaultPageSize)}
                      aria-label={`Start a new ${variant.title} project`}
                    >
                      <TemplatePreview typeKey={selectedType.key} accent={accent} />
                      <span className="template-card-title">{variant.title}</span>
                      <span className="template-card-desc">{variant.description}</span>
                    </button>
                  </li>
                );
              })
            : ASSET_TYPES.map((type) => {
                const isGallery = getTemplatesForType(type.key).length > 1;
                return (
                  <li key={type.key}>
                    <button
                      className="template-card"
                      style={{ '--accent': type.accent }}
                      onClick={() => handleTypeCardClick(type)}
                      aria-label={isGallery ? `Browse ${type.title} templates` : `Start a new ${type.title} project`}
                    >
                      <TemplatePreview typeKey={type.key} accent={type.accent} />
                      <span className="template-card-title">{type.title}</span>
                      <span className="template-card-desc">{type.description}</span>
                    </button>
                  </li>
                );
              })}
        </ul>
      </section>

      <section aria-labelledby="import-heading" className="home-section">
        <h2 id="import-heading">Import a script or document</h2>
        <p>Bring in a .txt, .md, or .docx file and it will flow automatically into a multi-page project.</p>
        <div className="import-controls">
          <label>
            <span>Template</span>
            <select
              aria-label="Template for imported text"
              value={importTemplateKey}
              onChange={(e) => setImportTemplateKey(e.target.value)}
            >
              {IMPORT_TEMPLATES.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.title}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="visually-hidden">Choose a file to import</span>
            <input
              type="file"
              accept=".txt,.md,.docx"
              aria-label="Choose a file to import"
              onChange={(e) => setImportFile(e.target.files?.[0] || null)}
            />
          </label>
          <button onClick={handleImport} disabled={!importFile || importing} className="primary">
            {importing ? 'Importing…' : 'Import'}
          </button>
        </div>
        {importError && (
          <p role="alert" className="home-error">
            {importError}
          </p>
        )}
      </section>

      <section aria-labelledby="projects-heading" className="home-section">
        <h2 id="projects-heading">Your saved projects</h2>
        {loadError && (
          <p role="alert" className="home-error">
            Couldn&apos;t reach the local server ({loadError}). Make sure the backend is running.
          </p>
        )}
        {!loadError && savedProjects.length === 0 && (
          <div className="home-empty">
            <p>
              Nothing saved yet — and that&apos;s just fine. Pick a template above and your work will save itself
              automatically as you go.
            </p>
          </div>
        )}
        {savedProjects.length > 0 && (
          <ul className="project-list" role="list">
            {savedProjects.map((p) => (
              <li key={p.id} className="project-item">
                <button className="project-item-open" onClick={() => openSavedProject(p.id)} aria-label={`Open ${p.name}`}>
                  {p.thumbnail ? (
                    <img src={p.thumbnail} alt={p.name} className="project-item-thumb" />
                  ) : (
                    <span className="project-item-thumb project-item-thumb-empty" aria-hidden="true" />
                  )}
                  <span className="project-item-info">
                    <span className="project-item-name">{p.name}</span>
                    <span className="project-item-meta">
                      {p.pageCount} page{p.pageCount === 1 ? '' : 's'} · updated{' '}
                      {new Date(p.updatedAt).toLocaleString()}
                    </span>
                  </span>
                </button>
                <div className="project-item-actions">
                  {renamingId === p.id ? (
                    <input
                      className="project-item-rename-input"
                      aria-label="New name"
                      value={renameValue}
                      autoFocus
                      onChange={(e) => setRenameValue(e.target.value)}
                      onBlur={() => commitRename(p.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') commitRename(p.id);
                        if (e.key === 'Escape') setRenamingId(null);
                      }}
                    />
                  ) : (
                    <button className="quiet" onClick={() => startRename(p)} aria-label={`Rename ${p.name}`}>
                      Rename
                    </button>
                  )}
                  <button className="quiet" onClick={() => handleDelete(p)} aria-label={`Delete ${p.name}`}>
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
