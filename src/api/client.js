import { useAuth } from '../store/auth';

// Cliente HTTP con Bearer JWT + manejo de 401 (cierra sesión).
export async function request(base, path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = useAuth.getState().token;
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  const url = `${base}${path}`;
  let res;
  try {
    res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (netErr) {
    console.warn('[NEXA][net-fail]', method, url, String(netErr));
    const e = new Error(`Red: ${String(netErr?.message || netErr)}`);
    e.status = 0;
    throw e;
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) console.warn('[NEXA][http]', res.status, method, url, JSON.stringify(data));

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
