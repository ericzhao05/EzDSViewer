export const API_BASE = 'http://127.0.0.1:5000/api';

async function parse(response) {
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || `Request failed (${response.status})`);
  }
  return data;
}

export function dsGet(slug) {
  return fetch(`${API_BASE}/${slug}`).then(parse);
}

export function dsPost(slug, op, payload = {}) {
  return fetch(`${API_BASE}/${slug}/${op}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).then(parse);
}
