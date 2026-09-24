// Thin HTTP client for the Wisdom Studio backend REST API. The MCP server
// is a client of the same API the frontend uses — no business logic is
// duplicated here beyond the template builders (see templates.js).
const BASE_URL = process.env.WISDOM_STUDIO_API_URL || 'http://localhost:4000';

async function handle(res) {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err = new Error(body.error || `Request to ${res.url} failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  if (res.status === 204) return null;
  return res.json();
}

function withConnectionHint(err) {
  if (err.cause?.code === 'ECONNREFUSED' || err.message?.includes('fetch failed')) {
    return new Error(
      `Couldn't reach the Wisdom Studio backend at ${BASE_URL}. Start it with "cd backend && npm start" and try again.`
    );
  }
  return err;
}

export function createClient(baseUrl = BASE_URL) {
  return {
    baseUrl,

    async createProject(project) {
      try {
        return await fetch(`${baseUrl}/api/projects`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(project),
        }).then(handle);
      } catch (err) {
        throw withConnectionHint(err);
      }
    },

    async getProject(id) {
      try {
        return await fetch(`${baseUrl}/api/projects/${id}`).then(handle);
      } catch (err) {
        throw withConnectionHint(err);
      }
    },

    async updateProject(id, project) {
      try {
        return await fetch(`${baseUrl}/api/projects/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(project),
        }).then(handle);
      } catch (err) {
        throw withConnectionHint(err);
      }
    },

    async getModels() {
      try {
        return await fetch(`${baseUrl}/api/image-gen/models`).then(handle);
      } catch (err) {
        throw withConnectionHint(err);
      }
    },

    async submitImageJob(payload) {
      try {
        return await fetch(`${baseUrl}/api/image-gen/jobs`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }).then(handle);
      } catch (err) {
        throw withConnectionHint(err);
      }
    },

    async getImageJobStatus(jobId) {
      try {
        return await fetch(`${baseUrl}/api/image-gen/jobs/${jobId}`).then(handle);
      } catch (err) {
        throw withConnectionHint(err);
      }
    },

    async listBorders({ tag, brand } = {}) {
      try {
        const params = new URLSearchParams();
        if (tag) params.set('tag', tag);
        if (brand) params.set('brand', brand);
        const qs = params.toString();
        return await fetch(`${baseUrl}/api/borders${qs ? `?${qs}` : ''}`).then(handle);
      } catch (err) {
        throw withConnectionHint(err);
      }
    },

    async getBorder(id) {
      try {
        return await fetch(`${baseUrl}/api/borders/${id}`).then(handle);
      } catch (err) {
        throw withConnectionHint(err);
      }
    },

    async getProjectPdfBytes(id) {
      try {
        const res = await fetch(`${baseUrl}/api/projects/${id}/pdf`);
        if (!res.ok) return handle(res);
        return Buffer.from(await res.arrayBuffer());
      } catch (err) {
        throw withConnectionHint(err);
      }
    },
  };
}
