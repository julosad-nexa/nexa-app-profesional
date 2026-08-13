import { request } from './client';
import { API } from '../config';

const O = (path, opts) => request(API.orienta, path, opts);

// Precios/planes públicos (los sirve WP desde la config del admin).
export const configPublica = () => request(API.wp, '/orienta/config');

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

  detalle: (id) => O(`/orienta/solicitudes/${id}`),

  aceptar: (id) => O(`/orienta/solicitudes/${id}/aceptar`, { method: 'POST' }),

  responder: (id, texto) =>
    O(`/orienta/solicitudes/${id}/mensajes`, { method: 'POST', body: { texto } }),

  cerrar: (id) =>
    O(`/orienta/solicitudes/${id}/cerrar`, { method: 'POST', body: {} }),

  derivar: (id, motivo = '') =>
    O(`/orienta/solicitudes/${id}/derivar`, { method: 'POST', body: { motivo } }),

  registrarPush: (token) =>
    O('/orienta/push/registrar', { method: 'POST', body: { token } }),
};
