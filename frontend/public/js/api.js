// ── API Helper ────────────────────────────────────────────────────────────────
const api = {
  async request(method, url, data = null, isFormData = false) {
    const opts = { method, credentials: 'same-origin', headers: {} };
    if (data) {
      if (isFormData) { opts.body = data; }
      else { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(data); }
    }
    const res = await fetch(url, opts);
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || `Erro ${res.status}`);
    return json;
  },
  get: (url) => api.request('GET', url),
  post: (url, data, isFormData) => api.request('POST', url, data, isFormData),
  put: (url, data) => api.request('PUT', url, data),
  delete: (url) => api.request('DELETE', url),
};
