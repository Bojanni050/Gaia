const BASE = process.env.REACT_APP_BACKEND_URL;
export const API = `${BASE}/api`;

export function fileUrl(url) {
  if (!url) return url;
  return url.startsWith('http') ? url : `${BASE}${url}`;
}

export async function uploadFile(file) {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${API}/uploads`, { method: 'POST', body: form });
  if (!res.ok) throw new Error('upload failed');
  return res.json();
}
