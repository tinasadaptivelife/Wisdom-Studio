const BASE = '/api/borders';

async function handle(res) {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed (${res.status})`);
  }
  return res.json();
}

export const bordersApi = {
  list: ({ tag, brand } = {}) => {
    const params = new URLSearchParams();
    if (tag) params.set('tag', tag);
    if (brand) params.set('brand', brand);
    const qs = params.toString();
    return fetch(`${BASE}${qs ? `?${qs}` : ''}`).then(handle);
  },
  get: (id) => fetch(`${BASE}/${id}`).then(handle),
};
