import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { API } from '../config';

const TOKEN_KEY = 'nexa_prof_token';

// Estado de autenticación: guarda el JWT de WP en almacenamiento seguro.
export const useAuth = create((set, get) => ({
  token: null,
  loading: true,

  async hydrate() {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    set({ token: token || null, loading: false });
  },

  async login(email, password) {
    const res = await fetch(`${API.wp}/auth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || 'Credenciales incorrectas');
    const token = data.token || data.access_token || data.jwt;
    if (!token) throw new Error('El servidor no devolvió un token');
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    set({ token });
    return token;
  },

  async logout() {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    set({ token: null });
  },

  getToken() {
    return get().token;
  },
}));
