import { encodeCommand } from '../explorer/commandLang';

export const API_BASE =
  process.env.REACT_APP_API_BASE ||
  (process.env.NODE_ENV === 'development' ? 'http://127.0.0.1:5000/api' : '/api');

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

// Resolves to the JSON body for both 200 and 400; rejects only on network failure or non-JSON.
export function runCommand(text) {
  return fetch(`${API_BASE}/run?cmd=${encodeCommand(text)}`).then((response) =>
    response.json().catch(() => {
      throw new Error(`Unexpected response from the server (${response.status})`);
    })
  );
}
