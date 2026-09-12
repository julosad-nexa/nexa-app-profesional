import { Platform } from 'react-native';

/**
 * Subir una imagen del chat.
 *
 * ── POR QUÉ NO SE USA fetch + FormData EN EL TELÉFONO ────────────────────────
 * Se intentó, y falló dos veces seguidas por motivos distintos:
 *
 * 1. `form.append('file', { uri, name, type })` —el atajo de toda la vida en
 *    React Native— dejó de funcionar con la nueva arquitectura: `FormData` es
 *    ahora el del estándar y solo acepta `Blob`/`File`. Lanza literalmente
 *    «Unsupported FormDataPart implementation».
 * 2. Leer el archivo con `fetch(uri)` para obtener un blob TAMPOCO vale: sobre
 *    un `file://` de la caché de Expo la petición devuelve 404 con el cuerpo
 *    «File not found»… y como nadie miraba `response.ok`, eso era exactamente lo
 *    que acababa subido y guardado como si fuera la foto. 14 bytes en disco y
 *    dos apps mostrando «no se puede cargar la imagen».
 *
 * `uploadAsync` de expo-file-system no pasa por JavaScript: entrega el archivo
 * del disco directamente al servidor, con su multipart y su mime. No hay blob
 * que etiquetar ni cuerpo que confundir con un error.
 *
 * ── Y EN WEB ─────────────────────────────────────────────────────────────────
 * Allí `uploadAsync` no existe, pero tampoco hace falta: el `uri` del selector
 * es un `blob:`/`data:` que el navegador sí sabe leer, y `FormData` funciona
 * como en cualquier página. Por eso hay dos caminos y no uno.
 */

const MIMES = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };

function datosDe(asset) {
  const tipo = asset?.mimeType || MIMES[String(asset?.fileName || '').split('.').pop()?.toLowerCase()] || 'image/jpeg';
  const ext = (tipo.split('/')[1] || 'jpg').replace('jpeg', 'jpg');
  return { tipo, nombre: asset?.fileName || `foto.${ext}` };
}

/**
 * Sube la imagen y devuelve la respuesta ya interpretada.
 *
 * @returns {Promise<{ok: boolean, status: number, data: any}>}
 */
export async function subirImagen({ url, asset, token }) {
  const { tipo, nombre } = datosDe(asset);
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  if (Platform.OS === 'web') {
    const r = await fetch(asset.uri);
    // Sin esta comprobación se sube el cuerpo del error como si fuera la imagen.
    if (!r.ok) throw new Error('No pudimos leer la imagen seleccionada.');
    const blob = await r.blob();

    const form = new FormData();
    form.append('file', blob, nombre);
    const res = await fetch(url, { method: 'POST', headers, body: form });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  }

  // Import diferido: en web el módulo nativo no existe y cargarlo arriba
  // rompería el bundle del navegador.
  const FileSystem = await import('expo-file-system');
  const res = await FileSystem.uploadAsync(url, asset.uri, {
    httpMethod: 'POST',
    uploadType: FileSystem.FileSystemUploadType.MULTIPART,
    fieldName: 'file',
    mimeType: tipo,
    parameters: {},
    headers,
  });

  let data = {};
  try { data = JSON.parse(res.body || '{}'); } catch { data = { error: res.body }; }
  return { ok: res.status >= 200 && res.status < 300, status: res.status, data };
}
