const BASE = '/api/image-gen';

async function handle(res) {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed (${res.status})`);
  }
  return res.json();
}

export const imageGenApi = {
  listModels: () => fetch(`${BASE}/models`).then(handle),
  submitJob: (payload) =>
    fetch(`${BASE}/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).then(handle),
  estimateCost: (payload) =>
    fetch(`${BASE}/jobs/estimate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).then(handle),
  getJobStatus: (jobId) => fetch(`${BASE}/jobs/${jobId}`).then(handle),
  submitAlchemy: ({ sourceImageUrl, upscaler }) =>
    fetch(`${BASE}/alchemy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sourceImageUrl, upscaler }),
    }).then(handle),
  getAlchemyStatus: (jobId) => fetch(`${BASE}/alchemy/${jobId}`).then(handle),
};
