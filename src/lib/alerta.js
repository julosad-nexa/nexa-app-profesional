import { Platform, Vibration } from 'react-native';
import Constants from 'expo-constants';

/**
 * Avisos al médico cuando entra una solicitud.
 *
 * ── POR QUÉ EL MÓDULO SE CARGA TARDE ─────────────────────────────────────────
 * Desde el SDK 55, importar `expo-notifications` en Expo Go sobre Android LANZA
 * —antes solo avisaba—, porque el módulo se auto-registra para el push nada más
 * cargarse. Estando arriba del archivo, tumbaba el arranque entero de la app
 * aunque nadie llamara a ninguna función.
 *
 * Así que se importa dentro de cada función y una sola vez. En Expo Go ni se
 * intenta: queda la vibración directa, que es la parte que de verdad despierta a
 * alguien y no depende de permisos ni de canales.
 */
const ES_EXPO_GO = Constants.executionEnvironment === 'storeClient';

let modulo = null;
async function notis() {
  if (ES_EXPO_GO) return null;
  if (modulo) return modulo;
  try {
    modulo = await import('expo-notifications');
    // En foreground: banner + sonido, para que el médico se entere.
    modulo.setNotificationHandler({
      handleNotification: async () => ({
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true, // SDK nuevos
        shouldShowList: true,
        shouldShowAlert: true,  // compat SDK viejos
      }),
    });
    return modulo;
  } catch {
    return null;   // sin notificaciones el aviso sigue siendo la vibración
  }
}

let ready = false;

// Pide permiso de notificaciones y crea el canal Android (sonido + vibración fuerte).
export async function prepararAlertas() {
  if (ready) return;
  const N = await notis();
  if (!N) return;
  try {
    const { status } = await N.getPermissionsAsync();
    if (status !== 'granted') await N.requestPermissionsAsync();
    if (Platform.OS === 'android') {
      await N.setNotificationChannelAsync('orientaciones', {
        name: 'Nuevas orientaciones',
        importance: N.AndroidImportance.MAX,
        sound: 'default',
        vibrationPattern: [0, 500, 200, 500],
        enableVibrate: true,
      });
    }
    ready = true;
  } catch (e) {
    // Sin permisos igual dejamos la vibración directa como respaldo.
  }
}

// Alerta al llegar una solicitud nueva: vibración directa (fiable aunque el háptico
// del sistema esté apagado) + notificación local con sonido/banner.
export async function alertaNuevaSolicitud(n = 1) {
  try { Vibration.vibrate([0, 500, 200, 500]); } catch {}

  const N = await notis();
  if (!N) return;
  try {
    await N.scheduleNotificationAsync({
      content: {
        title: n > 1 ? `${n} nuevas orientaciones` : 'Nueva orientación disponible',
        body: 'Toca para atender.',
        sound: 'default',
        ...(Platform.OS === 'android' ? { channelId: 'orientaciones' } : {}),
      },
      trigger: null, // inmediata
    });
  } catch {}
}
