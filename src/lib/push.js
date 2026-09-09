import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { orienta } from '../api/orienta';

// Expo Go (SDK 53+) no soporta push remoto — solo un development build. Desde el
// SDK 55 ya no avisa: lanza. Por eso `expo-notifications` se importa DENTRO de la
// función, después de las guardas, y no arriba: el módulo se auto-registra al
// cargarse, así que a quien no puede recibir push le reventaba en el arranque sin
// haberlo llamado nadie.
// El handler de notificaciones (foreground) vive en src/lib/alerta.js.
const IS_EXPO_GO = Constants.executionEnvironment === 'storeClient';

// Pide permiso, obtiene el Expo push token y lo registra en nexa-orienta.
export async function registerPush() {
  if (IS_EXPO_GO) return null;        // en Expo Go se prueba el flujo sin push (feed por polling)
  if (!Device.isDevice) return null;  // los simuladores no reciben push
  try {
    const Notifications = await import('expo-notifications');

    const { status: existing } = await Notifications.getPermissionsAsync();
    let status = existing;
    if (existing !== 'granted') {
      const req = await Notifications.requestPermissionsAsync();
      status = req.status;
    }
    if (status !== 'granted') return null;

    const tokenData = await Notifications.getExpoPushTokenAsync();
    const token = tokenData.data;
    await orienta.registrarPush(token);
    return token;
  } catch (e) {
    // Sin push no se rompe la app; el médico igual puede refrescar el feed.
    return null;
  }
}
