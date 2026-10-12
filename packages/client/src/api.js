const HOME_SECTIONS = ["trending", "latest", "popular-series"];

async function request(path, options = {}) {
  const res = await fetch(path, options);
  const body = await res.json();
  if (!res.ok) {
    throw new Error(body.message || `Request failed with status ${res.status}`);
  }
  return body;
}

export function fetchHomeSections() {
  return Promise.allSettled(
    HOME_SECTIONS.map((key) => request(`/api/home/${key}`).then((data) => ({ key, data })))
  );
}

export function fetchSearch(q, options = {}) {
  return request(`/api/search?q=${encodeURIComponent(q)}`, options);
}

export function fetchDetail(type, id, { provider, ...options } = {}) {
  const query = provider ? `?provider=${encodeURIComponent(provider)}` : "";
  return request(`/api/detail/${type}/${encodeURIComponent(id)}${query}`, options);
}

export function createStream(type, id, { lang, provider, ...options } = {}) {
  const base = `/api/stream/${type}/${encodeURIComponent(id)}`;
  const params = new URLSearchParams();
  if (lang) params.set("lang", lang);
  if (provider) params.set("provider", provider);
  const query = params.toString();
  const path = query ? `${base}?${query}` : base;
  return request(path, { method: "POST", ...options });
}

export function cleanupStream(sessionId) {
  return request(`/api/stream/${encodeURIComponent(sessionId)}`, { method: "DELETE" }).catch(() => null);
}
