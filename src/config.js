// Endpoints del backend. Apuntan a QA; para prod se cambian (o vía app config).
export const API = {
  orienta: 'https://orienta-qa.nexasalud.com',        // microservicio marketplace
  wp:      'https://qa.nexasalud.com/gateway/nexa/v1', // WordPress (identidad/wallet) vía /gateway
};

// Catálogo de categorías que un médico puede atender (MVP).
export const CATEGORIAS = [
  { id: 'general',      label: 'Medicina general' },
  { id: 'pediatria',    label: 'Pediatría' },
  { id: 'dermatologia', label: 'Dermatología' },
  { id: 'ginecologia',  label: 'Ginecología' },
  { id: 'nutricion',    label: 'Nutrición' },
  { id: 'psicologia',   label: 'Psicología' },
];
export const DEFAULT_CATS = ['general', 'pediatria'];
export const DEFAULT_TARIFA = 8000;

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
