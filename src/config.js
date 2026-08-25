import Constants from 'expo-constants';

/**
 * Backends por entorno.
 *
 * Antes las URLs estaban escritas aquí y apuntar a producción exigía EDITAR ESTE
 * FICHERO antes de compilar — con el riesgo evidente de publicar una versión que
 * habla con QA, o de olvidar devolverlo y desarrollar contra producción.
 *
 * Ahora el entorno se declara en `app.json` (`extra.nexaEnv`) y se puede
 * sobrescribir por perfil de EAS al construir, sin tocar código.
 *
 * WordPress se consume por `/gateway`, no por `/wp-json`: el enmascaramiento del
 * sitio devuelve 404 en la ruta estándar.
 */
const ENTORNOS = {
  qa: {
    orienta: 'https://orienta-qa.nexasalud.com',
    wp:      'https://qa.nexasalud.com/gateway/nexa/v1',
  },
  prod: {
    orienta: 'https://orienta.nexasalud.com',
    wp:      'https://nexasalud.com/gateway/nexa/v1',
  },
};

export const ENV = Constants.expoConfig?.extra?.nexaEnv || 'qa';

// Un entorno mal escrito cae a QA a propósito: es preferible que una compilación
// equivocada hable con pruebas a que hable con producción sin querer.
export const API = ENTORNOS[ENV] || ENTORNOS.qa;

// RESPALDO del catálogo de categorías.
//
// ⚠️ NO es la fuente de verdad: lo es `nexa_orienta_config`, que sirve el backend
// en `nexa/v1/orienta/config` y que la app lee con `useCatalogo()`. Esta lista
// solo se usa si esa petición falla, para que el médico pueda seguir trabajando
// sin señal. Por eso puede quedar desfasada — de hecho lo estaba: aquí decía
// «Psicología» donde el backend dice «Salud mental / Psicología».
export const CATEGORIAS = [
  { id: 'general',      label: 'Medicina general' },
  { id: 'pediatria',    label: 'Pediatría' },
  { id: 'dermatologia', label: 'Dermatología' },
  { id: 'ginecologia',  label: 'Ginecología' },
  { id: 'nutricion',    label: 'Nutrición' },
  { id: 'psicologia',   label: 'Psicología' },
];
export const DEFAULT_CATS = ['general', 'pediatria'];

// Respuestas rápidas para el médico (MVP; luego configurables desde el admin).
export const PLANTILLAS = [
  { t: 'Hidratación y reposo', x: 'Te recomiendo hidratación abundante y reposo. Si en 48–72 h no mejoras, consulta presencialmente.' },
  { t: 'Signos de alarma', x: 'Vigila señales de alarma (fiebre alta persistente, dificultad para respirar, dolor intenso). Ante cualquiera, acude a urgencias.' },
  { t: 'Fiebre', x: 'Puedes usar medios físicos y el antipirético que ya toleres según indicación previa. Si la fiebre supera 39°C o dura más de 3 días, consulta.' },
  { t: 'No es diagnóstico', x: 'Recuerda que esto es orientación general, no reemplaza una consulta médica presencial ni un diagnóstico formal.' },
  { t: 'Cierre', x: '¿Tienes alguna otra duda sobre esta orientación? Si no, con gusto la finalizo.' },
];

// Etiqueta legible de una categoría por su id.
export const catLabel = (id) => CATEGORIAS.find((c) => c.id === id)?.label || id;

// Formato moneda COP.
export const cop = (n) => '$' + Number(n || 0).toLocaleString('es-CO', { maximumFractionDigits: 0 });

// "hace X min/h/d" a partir de un datetime del backend ("YYYY-MM-DD HH:MM:SS").
export function haceTiempo(dt) {
  if (!dt) return '';
  const s = Math.max(0, Math.floor((Date.now() - new Date(String(dt).replace(' ', 'T')).getTime()) / 1000));
  if (s < 60) return 'hace instantes';
  const m = Math.floor(s / 60); if (m < 60) return `hace ${m} min`;
  const h = Math.floor(m / 60); if (h < 24) return `hace ${h} h`;
  return `hace ${Math.floor(h / 24)} d`;
}

// Fecha corta legible.
export function fmtFecha(dt) {
  if (!dt) return '';
  return new Date(String(dt).replace(' ', 'T'))
    .toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
}

// Paleta NexaSalud
export const COLORS = {
  navy:  '#0A1B3F',
  teal:  '#00A69C',
  tealD: '#007A72',
  bg:    '#F6F7F9',
  ink:   '#16202E',
  ink2:  '#64748B',
  line:  '#E2E8F0',
  white: '#FFFFFF',
};
