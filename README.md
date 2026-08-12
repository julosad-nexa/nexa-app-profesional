# NexaSalud App Profesional

App móvil (**React Native + Expo**, JS) para médicos de **NexaExpress** (teleorientación).
Consume el microservicio `nexa-orienta` + WordPress (identidad). iOS 13+ / Android 8+.

## Qué hace (MVP)
- **Login** con el JWT de WP (`POST /nexa/v1/auth/token`).
- **Disponible/Ocupado** + tarifa + categorías (`POST /orienta/medico/disponibilidad`).
- **Feed** de solicitudes del match (polling cada 8s cuando está disponible).
- **Aceptar** (bloqueo atómico "primero gana") y **responder** en un hilo corto.
- **Push** (Expo Notifications) al llegar una nueva solicitud.

## Estructura (Expo Router + capas)
```
app/_layout.js            root: QueryClient + gate de auth (grupos (auth)/(app))
app/(auth)/login.js       login
app/(app)/index.js        home: disponibilidad + feed
app/(app)/solicitud/[id]  detalle: aceptar + chat
src/config.js             URLs del backend + paleta
src/store/auth.js         Zustand + expo-secure-store (token)
src/api/{client,orienta}  cliente HTTP (Bearer) + endpoints
src/lib/push.js           registro de Expo push token
```

## Setup
```bash
npm install
npx expo install --fix     # alinea versiones exactas al SDK de Expo
npx expo start             # abre en Expo Go (iterar) o development build (push real)
```
> Para **push real** se necesita un *development build* (`npx expo run:android` / EAS), no Expo Go.

## Backend
Apunta a QA por defecto (`src/config.js`): `orienta-qa.nexasalud.com` + `qa.nexasalud.com/gateway`.
Para probar el login necesitas un **usuario médico real en QA** con el rol `medico_orienta` y contraseña
(el loop de curl usó un id sintético 9002; la app hace login real). Crear uno:
```bash
wp user create medico.test medico.test@nexasalud.com --role=medico_orienta --user_pass=Test#2026
```

## Pendiente (siguientes iteraciones)
Ganancias/historial, edición de categorías/tarifa en perfil, cierre por SLA visible, i18n,
íconos/splash, EAS Build + TestFlight/Play (requiere cuentas de desarrollador).
