import { request, upload } from './client';
import { API } from '../config';
import { subirImagen } from '../lib/archivo';
import { useAuth } from '../store/auth';

const O = (path, opts) => request(API.orienta, path, opts);

// Precios/planes públicos (los sirve WP desde la config del admin).
export const configPublica = () => request(API.wp, '/orienta/config');

// URL autenticada de un adjunto. Lleva el token por query (?t=) porque <Image> de RN
// no envía headers de forma fiable en Android.
export const adjuntoUrl = (id, name, token) =>
  `${API.orienta}/orienta/solicitudes/${id}/adjunto/${name}${token ? `?t=${encodeURIComponent(token)}` : ''}`;

/**
 * Pedir la eliminacion de la cuenta.
 *
 * Google Play exige que esto se pueda hacer DESDE LA APP, no solo desde la web.
 * Va contra WordPress y no contra el microservicio porque la cuenta vive alli.
 *
 * No manda correo ni nombre: el servidor los saca de la sesion. Pedirselos
 * seria darle la ocasion de teclear mal el correo al que le vamos a responder,
 * y ademas la sesion ya prueba quien es.
 */
export const eliminarCuenta = (motivo) =>
  request(API.wp, '/cuenta/eliminacion', { method: 'POST', body: { confirma: true, motivo: motivo || '' } });

// Endpoints del microservicio nexa-orienta consumidos por el médico.
export const orienta = {
  setDisponibilidad: (disponible, tarifa, categorias) =>
    O('/orienta/medico/disponibilidad', { method: 'POST', body: { disponible, tarifa, categorias } }),

  feed: () => O('/orienta/medico/feed'),

  perfil: () => O('/orienta/medico/perfil'),

  // Con que datos se le gira. Sin esto no hay pago legal posible.
  datosPago: () => O('/orienta/medico/datos-pago'),
  guardarDatosPago: (data) =>
    O('/orienta/medico/datos-pago', { method: 'POST', body: data }),

  payouts: () => O('/orienta/medico/payouts'),

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

  /**
   * Pulso del chat: si el paciente esta escribiendo, si esta en linea y cuantos
   * mensajes lleva el hilo. Se pide cada 2 s, asi que devuelve lo minimo.
   */
  latido: (id) => O(`/orienta/solicitudes/${id}/latido`),

  /** Avisar de que estamos escribiendo (el cliente se frena solo, no va por tecla). */
  escribiendo: (id, valor = true) =>
    O(`/orienta/solicitudes/${id}/escribiendo`, { method: 'POST', body: { escribiendo: valor } }),

  aceptar: (id) => O(`/orienta/solicitudes/${id}/aceptar`, { method: 'POST' }),

  responder: (id, texto) =>
    O(`/orienta/solicitudes/${id}/mensajes`, { method: 'POST', body: { texto } }),

  cerrar: (id) =>
    O(`/orienta/solicitudes/${id}/cerrar`, { method: 'POST', body: {} }),

  derivar: (id, motivo = '') =>
    O(`/orienta/solicitudes/${id}/derivar`, { method: 'POST', body: { motivo } }),

  /*
   * La subida NO pasa por fetch+FormData en el teléfono.
   *
   * El atajo `{uri, name, type}` murió con la nueva arquitectura, y leer el
   * archivo con fetch para armar un blob es peor: sobre un `file://` devuelve
   * «File not found» y eso acababa guardado como si fuera la foto. `subirImagen`
   * entrega el archivo del disco directamente.
   */
  enviarAdjunto: async (id, asset) => {
    const token = useAuth.getState().token;
    const res = await subirImagen({
      url: `${API.orienta}/orienta/solicitudes/${id}/adjunto`,
      asset,
      token,
    });
    if (!res.ok) throw new Error(res.data?.error || 'No se pudo subir la imagen.');
    return res.data;
  },

  registrarPush: (token) =>
    O('/orienta/push/registrar', { method: 'POST', body: { token } }),

  // Retira este dispositivo de los avisos. Se llama al cerrar sesión, mientras
  // el JWT todavía sirve.
  bajaPush: () => O('/orienta/push/baja', { method: 'POST' }),
};
