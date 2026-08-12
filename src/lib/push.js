import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { orienta } from '../api/orienta';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Pide permiso, obtiene el Expo push token y lo registra en nexa-orienta.
export async function registerPush() {
  if (!Device.isDevice) return null; // los simuladores no reciben push
  try {
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
