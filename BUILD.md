# Construir la app (EAS)

Lo que sigue **necesita tu cuenta de Expo**, así que hay que ejecutarlo a mano.
Todo lo demás —iconos, `eas.json`, `app.config.js`, `expo-dev-client`— ya está.

## Por qué hace falta un build y no basta Expo Go

Desde el **SDK 53, Expo Go dejó de recibir push remoto**, y estas apps van en el
54. `src/lib/push.js` lo detecta y ni siquiera pide el token: pedir uno que no va
a llegar solo gasta un permiso y falla en silencio.

Sin push, el médico no se entera de una solicitud con la app cerrada y el
paciente no se entera de que le respondieron. **Es de lo que depende el SLA de
tres minutos**, así que el build no es un trámite de publicación: es lo que hace
que el producto cumpla su promesa.

## Pasos

```bash
npm install                 # instala tambien expo-dev-client y las dependencias
npm install -g eas-cli      # o usa npx eas ...

eas login                   # tu cuenta de Expo
eas build:configure         # crea el proyecto y escribe extra.eas.projectId

eas build --profile development --platform android
```

Android sale como **APK**: se descarga del enlace que da EAS y se instala en el
teléfono directamente. El `.aab` por defecto solo sirve para subir a Play.

Después, para trabajar contra ese build en vez de contra Expo Go:

```bash
npx expo start --dev-client
```

⚠️ Con Tailscale levantado, Expo anuncia **su** IP en el QR y el teléfono no la
alcanza. Ya nos pasó:

```powershell
$env:REACT_NATIVE_PACKAGER_HOSTNAME = "<IP de tu WiFi>"
npx expo start --dev-client
```

## Lo que falta para que el push llegue de verdad

El build **habilita** el push; no lo configura. Además hace falta:

- **Android** — credenciales de **FCM V1**. Se crea un proyecto en Firebase, se
  descarga el JSON de la cuenta de servicio y se sube con
  `eas credentials`. Sin esto el build se instala y funciona, pero ningún aviso
  llega.
- **iOS** — clave de **APNs**, que requiere cuenta de Apple Developer (99 USD al
  año). EAS la genera si le das acceso.

Se puede empezar solo por Android: es el mercado mayoritario en Colombia y no
tiene coste de entrada.

## Comprobar que llegó

Con el build instalado y sesión iniciada, el token queda registrado en el
servidor. Desde `nexa-orienta`:

```bash
node --env-file=.env src/scripts/push-prueba.js <profesional_id>
```

Si dice que no hay token registrado, la app sigue corriendo en Expo Go o la
persona no ha iniciado sesión.

## Entornos

`eas.json` define `APP_ENV` por perfil y `app.config.js` lo pasa a la app. El
perfil `production` compila contra producción **sin editar ningún archivo**, que
es exactamente como se acaba publicando una versión que habla con QA.

Un entorno desconocido cae a QA a propósito (`src/config.js`).
