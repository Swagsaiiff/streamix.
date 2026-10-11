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

export function fetchDetail(type, id, options = {}) {
  return request(`/api/detail/${type}/${encodeURIComponent(id)}`, options);
}

export function createStream(type, id, options = {}) {
  return request(`/api/stream/${type}/${encodeURIComponent(id)}`, { method: "POST", ...options });
}

export function cleanupStream(sessionId) {
  return request(`/api/stream/${encodeURIComponent(sessionId)}`, { method: "DELETE" }).catch(() => null);
}
