import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { API } from '../config';

const TOKEN_KEY   = 'nexa_prof_token';
const REFRESH_KEY = 'nexa_prof_refresh';

// Estado de autenticación: guarda el JWT de acceso (1h) y el refresh token (30d)
// en almacenamiento seguro. El refresh evita que el médico sea expulsado cada hora.
export const useAuth = create((set, get) => ({
  token: null,
  refreshToken: null,
  loading: true,

  async hydrate() {
    const [token, refreshToken] = await Promise.all([
      SecureStore.getItemAsync(TOKEN_KEY),
      SecureStore.getItemAsync(REFRESH_KEY),
    ]);
    set({ token: token || null, refreshToken: refreshToken || null, loading: false });
  },

  async login(email, password) {
    const res = await fetch(`${API.wp}/auth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || 'Credenciales incorrectas');

    const token   = data.access_token || data.token || data.jwt;
    const refresh = data.refresh_token || null;
    if (!token) throw new Error('El servidor no devolvió un token');

    await SecureStore.setItemAsync(TOKEN_KEY, token);
    if (refresh) await SecureStore.setItemAsync(REFRESH_KEY, refresh);
    set({ token, refreshToken: refresh });
    return token;
  },

  // Rota la pareja de tokens usando el refresh. Devuelve el nuevo access token.
  // Lanza si no hay refresh o el servidor lo rechaza (→ el llamador hace logout).
  async refresh() {
    const rt = get().refreshToken;
    if (!rt) throw new Error('sin_refresh');
    const res = await fetch(`${API.wp}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: rt }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || 'refresh_rechazado');

    const token   = data.access_token || data.token;
    const refresh = data.refresh_token || rt;
    if (!token) throw new Error('refresh_sin_token');

    await SecureStore.setItemAsync(TOKEN_KEY, token);
    await SecureStore.setItemAsync(REFRESH_KEY, refresh);
    set({ token, refreshToken: refresh });
    return token;
  },

  async logout() {
    /*
     * Dar de baja el dispositivo ANTES de tirar el token.
     *
     * El push token vive en el servidor (`orienta:push:{userId}`) y no se
     * borraba al salir: el teléfono seguía recibiendo avisos de pacientes
     * aunque el médico hubiera cerrado sesión, o aunque el aparato hubiera
     * cambiado de manos.
     *
     * El orden importa: la baja necesita el JWT, así que va primero. Y si falla
     * —sin red, servidor caído— se cierra la sesión igualmente: dejar a alguien
     * atrapado dentro de la app por no poder avisar al servidor sería peor. El
     * TTL de 90 días del token es la red de seguridad para ese caso.
     */
    const tok = get().token;
    if (tok) {
      try {
        // Petición directa, sin pasar por el cliente HTTP: importarlo aquí crearía
        // un ciclo (orienta → client → auth → orienta).
        await fetch(`${API.orienta}/orienta/push/baja`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
        });
      } catch (e) {
        console.warn('[NEXA][logout] no se pudo dar de baja el push:', e?.message);
      }
    }

    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(REFRESH_KEY);
    set({ token: null, refreshToken: null });
  },

  getToken() {
    return get().token;
  },
}));
