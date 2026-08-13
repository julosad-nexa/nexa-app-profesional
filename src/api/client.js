import { useAuth } from '../store/auth';

// Un solo refresh en vuelo aunque varias peticiones reciban 401 a la vez.
let refreshing = null;

async function doFetch(base, path, { method, body, token }) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const url = `${base}${path}`;
  try {
    return await fetch(url, {
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
}

// Cliente HTTP con Bearer JWT. Ante 401 intenta refrescar el token una vez y
// reintenta; si el refresh falla, cierra sesión.
export async function request(base, path, { method = 'GET', body, auth = true } = {}) {
  const store = useAuth.getState();
  let token = auth ? store.token : null;

  let res = await doFetch(base, path, { method, body, token });

  if (res.status === 401 && auth) {
    try {
      if (!refreshing) refreshing = useAuth.getState().refresh().finally(() => { refreshing = null; });
      token = await refreshing;
      res = await doFetch(base, path, { method, body, token });
    } catch {
      await useAuth.getState().logout();
      const e = new Error('Sesión expirada');
      e.status = 401;
      throw e;
    }
  }

  const data = await res.json().catch(() => ({}));
  if (res.status === 401) {
    await useAuth.getState().logout();
    const e = new Error(data?.error || 'Sesión expirada');
    e.status = 401;
    throw e;
  }
  if (!res.ok) {
    console.warn('[NEXA][http]', res.status, method, `${base}${path}`, JSON.stringify(data));
    const e = new Error(data?.error || data?.message || `Error ${res.status}`);
    e.status = res.status;
    e.data = data;
    throw e;
  }
  return data;
}

// Subida multipart (FormData). No fija Content-Type (fetch pone el boundary).
// Mismo manejo de 401 → refresh → reintento que request().
export async function upload(base, path, formData) {
  let token = useAuth.getState().token;
  const send = (tok) =>
    fetch(`${base}${path}`, {
      method: 'POST',
      headers: tok ? { Authorization: `Bearer ${tok}` } : {},
      body: formData,
    });

  let res = await send(token);
  if (res.status === 401) {
    try {
      if (!refreshing) refreshing = useAuth.getState().refresh().finally(() => { refreshing = null; });
      token = await refreshing;
      res = await send(token);
    } catch {
      await useAuth.getState().logout();
      const e = new Error('Sesión expirada'); e.status = 401; throw e;
    }
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const e = new Error(data?.error || `Error ${res.status}`);
    e.status = res.status;
    throw e;
  }
  return data;
}
