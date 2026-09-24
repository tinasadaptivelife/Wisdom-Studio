const BASE = '/api/projects';

async function handle(res) {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed (${res.status})`);
  }
  if (res.status === 204) return null; // DELETE has no body
  return res.json();
}

export const projectsApi = {
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
