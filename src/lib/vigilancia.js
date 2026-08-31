import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { orienta } from '../api/orienta';
import { alertaNuevaSolicitud } from './alerta';

/**
 * Vigila el feed y avisa de solicitudes nuevas, esté el médico donde esté.
 *
 * ── POR QUÉ NO BASTABA CON HACERLO EN EL FEED ────────────────────────────────
 * La alerta vivía dentro de la pantalla del feed. Si el médico estaba mirando su
 * historial, su perfil o una orientación antigua, entraba una solicitud y no se
 * enteraba: ni vibración, ni sonido, y el feed ni siquiera sondeaba porque esa
 * pantalla no estaba montada.
 *
 * Con un SLA de tres minutos, eso es exactamente la promesa del producto
 * rompiéndose en silencio: alguien marcado como disponible que no ve lo que le
 * llega. Montando esto en el layout, la vigilancia sigue viva mientras la app lo
 * esté, sin importar en qué pantalla ande.
 *
 * ── POR QUÉ COMPARTE CLAVE CON LA PANTALLA DEL FEED ──────────────────────────
 * Usa `['feed']`, la misma que el listado. React Query comparte caché y agrupa
 * las peticiones: dos observadores no son dos llamadas. Y la pantalla del feed
 * se beneficia de que alguien lo mantenga fresco por ella.
 *
 * ── LO QUE ESTO NO ES ────────────────────────────────────────────────────────
 * No sustituye a las notificaciones push. Si la app está cerrada o en segundo
 * plano, los timers de JS no corren y esto no suena; para eso hacen falta push
 * reales, que exigen una compilación de desarrollo. Esto cubre el caso frecuente
 * —la app abierta, en otra pantalla— que hoy no estaba cubierto en absoluto.
 */
export function useVigilanciaSolicitudes() {
  // La verdad sobre si está de turno la tiene el servidor (Redis), no un estado
  // local de pantalla: el perfil ya la expone.
  const perfil = useQuery({
    queryKey: ['perfil'],
    queryFn: orienta.perfil,
    refetchInterval: 60000,
  });

  const disponible = perfil.data?.disponible === true;

  const feed = useQuery({
    queryKey: ['feed'],
    queryFn: orienta.feed,
    enabled: disponible,
    refetchInterval: disponible ? 8000 : false,
  });

  // null = todavía no sabemos qué había, así que la primera carga no alerta.
  // Sin esto, entrar a la app con solicitudes en cola dispararía una alarma por
  // cada una, que es la forma más rápida de que alguien silencie el teléfono.
  const conocidasRef = useRef(null);

  useEffect(() => {
    if (!disponible) {
      conocidasRef.current = null;
      return;
    }

    const items = feed.data?.feed || [];
    const ids = new Set(items.map((x) => x.id));

    if (conocidasRef.current) {
      const nuevas = items.filter((x) => !conocidasRef.current.has(x.id)).length;
      if (nuevas > 0) alertaNuevaSolicitud(nuevas);
    }

    conocidasRef.current = ids;
  }, [feed.data, disponible]);
}
