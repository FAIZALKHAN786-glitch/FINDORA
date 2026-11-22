async function request(path, { json, body, headers, ...options } = {}) {
  const init = { credentials: 'include', ...options };
  if (json !== undefined) {
    init.body = JSON.stringify(json);
    init.headers = { 'content-type': 'application/json', ...headers };
  } else if (body !== undefined) {
    init.body = body;
    init.headers = headers;
  }

  const response = await fetch(path, init);
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.error || `Request failed (${response.status}).`);
  }
  return response.status === 204 ? null : response.json();
}

export const api = {
  me: () => request('/api/auth/me'),
  signup: (values) => request('/api/auth/signup', { method: 'POST', json: values }),
  login: (values) => request('/api/auth/login', { method: 'POST', json: values }),
  logout: () => request('/api/auth/logout', { method: 'POST' }),
  listItems: (filters = {}) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(filters)) {
      if (value && value !== 'all') params.set(key, value);
    }
    const query = params.toString();
    return request(`/api/items${query ? `?${query}` : ''}`);
  },
  getItem: (id) => request(`/api/items/${encodeURIComponent(id)}`),
  createItem: (values) => request('/api/items', { method: 'POST', body: toFormData(values) }),
  claimItem: (id) => request(`/api/items/${encodeURIComponent(id)}/claim`, { method: 'PATCH' }),
  deleteItem: (id) => request(`/api/items/${encodeURIComponent(id)}`, { method: 'DELETE' }),
};

export function toFormData(values) {
  const form = new FormData();
  for (const [key, value] of Object.entries(values)) {
    if (value !== null && value !== undefined && value !== '') form.set(key, value);
  }
  return form;
}

export const photoUrl = (path) => path || null;
