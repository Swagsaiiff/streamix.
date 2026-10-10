const HOME_SECTIONS = ["trending", "latest", "popular-series"];

async function request(path) {
  const res = await fetch(path);
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

export function fetchSearch(q) {
  return request(`/api/search?q=${encodeURIComponent(q)}`);
}
