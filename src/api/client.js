import { useAuth } from '../store/auth';

// Cliente HTTP con Bearer JWT + manejo de 401 (cierra sesión).
export async function request(base, path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = useAuth.getState().token;
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(`${base}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));

  if (res.status === 401) {
    useAuth.getState().logout();
    const e = new Error(data?.error || 'Sesión expirada');
    e.status = 401;
    throw e;
  }
  if (!res.ok) {
    const e = new Error(data?.error || data?.message || `Error ${res.status}`);
    e.status = res.status;
    e.data = data;
    throw e;
  }
  return data;
}
