import { Plus, Copy, Trash2 } from 'lucide-react';
import { useDesignStore } from '../../store/useDesignStore.js';
import { PAGE_SIZES } from '../../utils/pageSizes.js';

export default function PagePanel() {
  const project = useDesignStore((s) => s.project);
  const currentPageIndex = useDesignStore((s) => s.currentPageIndex);
  const goToPage = useDesignStore((s) => s.goToPage);
  const addPage = useDesignStore((s) => s.addPage);
  const duplicatePage = useDesignStore((s) => s.duplicatePage);
  const deletePage = useDesignStore((s) => s.deletePage);
  const setPageSize = useDesignStore((s) => s.setPageSize);

  const handleDeletePage = () => {
    if (window.confirm(`Delete page ${currentPageIndex + 1}? You can undo this right after if you change your mind.`)) {
      deletePage(currentPageIndex);
    }
  };

  return (
    <nav className="page-panel" aria-label="Pages">
      <ul className="page-list" role="list">
        {project.pages.map((page, index) => (
          <li key={page.id}>
            <button
              className={`page-thumb${index === currentPageIndex ? ' active' : ''}`}
              onClick={() => goToPage(index)}
              aria-current={index === currentPageIndex ? 'true' : undefined}
              aria-label={`Go to page ${index + 1}, ${page.elements.length} item${page.elements.length === 1 ? '' : 's'}`}
            >
              {index + 1}
            </button>
          </li>
        ))}
      </ul>
      <div className="page-actions">
        <button onClick={addPage} aria-label="Add new page">
          <Plus size={18} strokeWidth={2.2} aria-hidden="true" />
          Page
        </button>
        <button onClick={() => duplicatePage(currentPageIndex)} aria-label="Duplicate current page">
          <Copy size={18} strokeWidth={2.2} aria-hidden="true" />
          Duplicate
        </button>
        <button onClick={handleDeletePage} disabled={project.pages.length <= 1} aria-label="Delete current page">
          <Trash2 size={18} strokeWidth={2.2} aria-hidden="true" />
          Delete page
        </button>
      </div>
      <label className="page-size-picker">
        <span>Page size</span>
        <select value={project.pageSize} onChange={(e) => setPageSize(e.target.value)}>
          {Object.entries(PAGE_SIZES).map(([key, size]) => (
            <option key={key} value={key}>
              {size.label}
            </option>
          ))}
        </select>
      </label>
    </nav>
  );
}
