import { Platform, Vibration } from 'react-native';
import * as Notifications from 'expo-notifications';

// En foreground: mostrar aviso + reproducir sonido (para que el médico se entere).
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true, // SDK nuevos
    shouldShowList: true,
    shouldShowAlert: true,  // compat SDK viejos
  }),
});

let ready = false;

// Pide permiso de notificaciones y crea el canal Android (sonido + vibración fuerte).
export async function prepararAlertas() {
  if (ready) return;
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') await Notifications.requestPermissionsAsync();
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('orientaciones', {
        name: 'Nuevas orientaciones',
        importance: Notifications.AndroidImportance.MAX,
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
  try {
    await Notifications.scheduleNotificationAsync({
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
