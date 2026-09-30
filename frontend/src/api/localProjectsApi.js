// A stand-in for the projects server that keeps everything in this browser's
// localStorage. It is used only by the preview build (`npm run build:demo`),
// which runs as a plain web page with no server behind it. It mirrors the
// real API's shapes and error messages (backend/routes/projects.js), so the
// rest of the app can't tell the difference.

export const STORAGE_KEY = 'wisdom-studio-preview-projects';

const readAll = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? [];
  } catch {
    return [];
  }
};

const writeAll = (projects) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  } catch {
    throw new Error('This browser’s storage is full. Delete a project or download your work as a PDF first.');
  }
};

const summarize = (p) => ({
  id: p.id,
  name: p.name,
  pageSize: p.pageSize,
  templateKey: p.templateKey,
  pageCount: p.pages?.length ?? 1,
  ...(p.thumbnail ? { thumbnail: p.thumbnail } : {}),
  createdAt: p.createdAt,
  updatedAt: p.updatedAt,
});

const find = (projects, id) => {
  const project = projects.find((p) => p.id === id);
  if (!project) throw new Error('Project not found');
  return project;
};

export const localProjectsApi = {
  async list() {
    return readAll()
      .map(summarize)
      .sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''));
  },

  async get(id) {
    return find(readAll(), id);
  },

  async create(project) {
    if (!project?.id || !project?.name || !project?.pageSize || !Array.isArray(project?.pages)) {
      throw new Error('Invalid project payload');
    }
    const projects = readAll();
    const now = new Date().toISOString();
    const saved = { ...project, createdAt: project.createdAt || now, updatedAt: project.updatedAt || now };
    writeAll([...projects.filter((p) => p.id !== saved.id), saved]);
    return saved;
  },

  async update(id, project) {
    const projects = readAll();
    const existing = find(projects, id);
    const saved = { ...existing, ...project, id, createdAt: existing.createdAt, updatedAt: new Date().toISOString() };
    writeAll(projects.map((p) => (p.id === id ? saved : p)));
    return saved;
  },

  async remove(id) {
    const projects = readAll();
    find(projects, id);
    writeAll(projects.filter((p) => p.id !== id));
    return null;
  },
};
