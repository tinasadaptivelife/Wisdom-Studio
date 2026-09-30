import { localProjectsApi } from './localProjectsApi.js';

const BASE = '/api/projects';

async function handle(res) {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed (${res.status})`);
  }
  if (res.status === 204) return null; // DELETE has no body
  return res.json();
}

const serverProjectsApi = {
  list: () => fetch(BASE).then(handle),
  get: (id) => fetch(`${BASE}/${id}`).then(handle),
  create: (project) =>
    fetch(BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(project),
    }).then(handle),
  update: (id, project) =>
    fetch(`${BASE}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(project),
    }).then(handle),
  remove: (id) => fetch(`${BASE}/${id}`, { method: 'DELETE' }).then(handle),
};

// The preview build (`npm run build:demo`) has no server behind it, so it keeps
// projects in the browser instead. Everything else uses the real server.
export const projectsApi = import.meta.env.VITE_PREVIEW ? localProjectsApi : serverProjectsApi;
