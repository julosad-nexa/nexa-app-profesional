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
