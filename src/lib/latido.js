import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

/**
 * El pulso del chat: quién está al otro lado y quién está escribiendo.
 *
 * ── POR QUÉ UN SONDEO APARTE, Y NO EL DE SIEMPRE ─────────────────────────────
 * El hilo se pide cada 5 segundos, y a esa cadencia un «escribiendo…» no sirve:
 * aparece tarde y —lo que de verdad molesta— **se queda en pantalla después de
 * que el otro paró o ya envió**, dejando a alguien esperando un mensaje que no
 * viene. Un indicador de escritura vive de la inmediatez; a cinco segundos no
 * informa, miente.
 *
 * De ahí el latido: una respuesta de unas pocas decenas de bytes que sí se puede
 * pedir cada dos segundos. El hilo completo se sigue trayendo cada cinco, y solo
 * se adelanta cuando el latido avisa de que hay un mensaje nuevo — así los
 * mensajes también llegan antes, de regalo.
 *
 * ── DOS COSAS QUE PARECEN IGUALES Y NO LO SON ────────────────────────────────
 * «Escribiendo» caduca en 6 s en el servidor porque envejece mal. «En línea»
 * aguanta el retraso sin problema, porque la presencia cambia despacio; y cuando
 * caduca sigue valiendo como «estuvo hace un rato», que es justo lo que calma al
 * paciente que no sabe si hay alguien al otro lado.
 *
 * ── Y POR QUÉ SE PARA EN SEGUNDO PLANO ───────────────────────────────────────
 * Preguntar cada dos segundos con la pantalla apagada es gastar batería y datos
 * del paciente para pintar algo que nadie está mirando. Al volver se pide de
 * inmediato, así que no se nota.
 */

const CADA_MS = 2000;

export function useLatido({ pedir, activo, alHaberMensajes }) {
  const [latido, setLatido] = useState(null);
  const vivo    = useRef(true);
  const ultimoN = useRef(null);
  const avisar  = useRef(alHaberMensajes);

  // La callback se guarda en una ref para que cambiarla no reinicie el ciclo:
  // el padre la redefine en cada render y el sondeo se reiniciaría sin parar.
  useEffect(() => { avisar.current = alHaberMensajes; }, [alHaberMensajes]);
  useEffect(() => () => { vivo.current = false; }, []);

  useEffect(() => {
    if (!activo) { setLatido(null); return; }
    let t;
    let parado = AppState.currentState !== 'active';

    const ciclo = async () => {
      if (!vivo.current) return;
      if (!parado) {
        try {
          const d = await pedir();
          if (!vivo.current) return;
          setLatido(d);
          // Hay mensajes nuevos: traer el hilo YA en vez de esperar al sondeo
          // lento. La primera vuelta solo toma la medida, no dispara nada.
          if (typeof d?.mensajes === 'number') {
            if (ultimoN.current !== null && d.mensajes !== ultimoN.current) avisar.current?.();
            ultimoN.current = d.mensajes;
          }
        } catch { /* un latido perdido no es un error que mostrar */ }
      }
      t = setTimeout(ciclo, CADA_MS);
    };

    const sub = AppState.addEventListener('change', (s) => {
      const activoAhora = s === 'active';
      if (activoAhora && parado) { parado = false; clearTimeout(t); ciclo(); }
      else parado = !activoAhora;
    });

    ciclo();
    return () => { clearTimeout(t); sub.remove(); };
  }, [pedir, activo]);

  return latido;
}

/**
 * Avisar al otro de que estamos escribiendo, sin castigar la red.
 *
 * Mandar un aviso por tecla sería decenas de peticiones para transmitir un
 * único bit. Se manda uno cada 3 s como mucho —la marca del servidor dura 6, así
 * que nunca se apaga a media frase— y uno de despedida al dejar de teclear, que
 * es el momento en el que un indicador olvidado se nota.
 */
const CADA_AVISO_MS = 3000;
const SILENCIO_MS   = 4000;

export function useEscribiendo({ avisar, activo }) {
  const ultimo = useRef(0);
  const calla  = useRef(null);
  const puesto = useRef(false);

  const soltar = () => {
    clearTimeout(calla.current);
    if (puesto.current) { puesto.current = false; avisar(false)?.catch?.(() => {}); }
  };

  // Salir de la pantalla con el aviso puesto dejaría al otro esperando.
  useEffect(() => () => soltar(), []);

  return () => {
    if (!activo) return;
    const ahora = Date.now();
    if (ahora - ultimo.current > CADA_AVISO_MS) {
      ultimo.current = ahora;
      puesto.current = true;
      avisar(true)?.catch?.(() => {});
    }
    clearTimeout(calla.current);
    calla.current = setTimeout(soltar, SILENCIO_MS);
  };
}
