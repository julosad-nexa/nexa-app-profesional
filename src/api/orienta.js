import { request, upload } from './client';
import { API } from '../config';

const O = (path, opts) => request(API.orienta, path, opts);

// Precios/planes públicos (los sirve WP desde la config del admin).
export const configPublica = () => request(API.wp, '/orienta/config');

// URL autenticada de un adjunto. Lleva el token por query (?t=) porque <Image> de RN
// no envía headers de forma fiable en Android.
export const adjuntoUrl = (id, name, token) =>
  `${API.orienta}/orienta/solicitudes/${id}/adjunto/${name}${token ? `?t=${encodeURIComponent(token)}` : ''}`;

// Endpoints del microservicio nexa-orienta consumidos por el médico.
export const orienta = {
  setDisponibilidad: (disponible, tarifa, categorias) =>
    O('/orienta/medico/disponibilidad', { method: 'POST', body: { disponible, tarifa, categorias } }),

  feed: () => O('/orienta/medico/feed'),

  perfil: () => O('/orienta/medico/perfil'),

  historial: (params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v != null && v !== '')
    ).toString();
    return O(`/orienta/medico/historial${qs ? `?${qs}` : ''}`);
  },

  guardarPerfil: (tarifa, categorias) =>
    O('/orienta/medico/perfil', { method: 'POST', body: { tarifa, categorias } }),

  enviarVerificacion: (data) =>
    O('/orienta/medico/verificacion', { method: 'POST', body: data }),

  detalle: (id) => O(`/orienta/solicitudes/${id}`),

  aceptar: (id) => O(`/orienta/solicitudes/${id}/aceptar`, { method: 'POST' }),

  responder: (id, texto) =>
    O(`/orienta/solicitudes/${id}/mensajes`, { method: 'POST', body: { texto } }),

  cerrar: (id) =>
    O(`/orienta/solicitudes/${id}/cerrar`, { method: 'POST', body: {} }),

  derivar: (id, motivo = '') =>
    O(`/orienta/solicitudes/${id}/derivar`, { method: 'POST', body: { motivo } }),

  enviarAdjunto: (id, asset) => {
    const type = asset.mimeType || 'image/jpeg';
    const ext = (type.split('/')[1] || 'jpg').replace('jpeg', 'jpg');
    const form = new FormData();
    form.append('file', { uri: asset.uri, name: asset.fileName || `foto.${ext}`, type });
    return upload(API.orienta, `/orienta/solicitudes/${id}/adjunto`, form);
  },

  registrarPush: (token) =>
    O('/orienta/push/registrar', { method: 'POST', body: { token } }),
};
