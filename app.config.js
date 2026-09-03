/**
 * Configuración dinámica. Recibe lo estático de `app.json` y solo cambia lo que
 * depende de con qué se esté compilando.
 *
 * ── POR QUÉ EXISTE ESTE ARCHIVO ──────────────────────────────────────────────
 * `eas.json` define `APP_ENV` por perfil, pero una variable de entorno no llega
 * sola al código de la app: hay que meterla en `extra` al construir. Sin este
 * puente, el perfil de producción compilaba con el `nexaEnv: "qa"` escrito en
 * app.json — es decir, se publicaba una app que habla con el servidor de
 * pruebas, y nada lo delataría hasta que alguien mirase los datos.
 *
 * Sigue cayendo a `qa` cuando no hay nada definido: es preferible que una
 * compilación equivocada hable con pruebas a que hable con producción.
 */
module.exports = ({ config }) => ({
  ...config,
  extra: {
    ...config.extra,
    nexaEnv: process.env.APP_ENV || config.extra?.nexaEnv || 'qa',
  },
});
