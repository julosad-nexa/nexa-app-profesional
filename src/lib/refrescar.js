import { useCallback, useRef } from 'react';
import { useFocusEffect } from 'expo-router';

/**
 * Volver a pedir los datos al VOLVER a una pantalla.
 *
 * ── POR QUÉ HACE FALTA, SI YA HAY INVALIDACIONES ─────────────────────────────
 * Porque invalidar solo arregla el lado que hizo el cambio. En una orientación
 * hay dos personas, y **cualquiera de las dos puede cerrarla**: cuando el médico
 * finaliza, la app del paciente no se ha enterado de nada, y al revés igual. La
 * lista se quedaba diciendo «en curso» sobre algo terminado hace diez minutos,
 * que es peor que no decir nada — quien la lee cree que sigue esperando
 * respuesta.
 *
 * ── POR QUÉ NO BASTA `refetchOnMount` ────────────────────────────────────────
 * Es lo que uno espera y no ocurre: en expo-router la pantalla anterior **no se
 * desmonta** al navegar, se queda debajo en la pila. Al volver no hay montaje,
 * así que React Query no vuelve a pedir nada y los datos viejos siguen ahí sin
 * que nadie haya hecho nada mal. `refetchOnWindowFocus` tampoco ayuda: en móvil
 * no existe esa noción de ventana.
 *
 * El foco de la pantalla es el único momento que significa «esta persona está
 * mirando esto otra vez».
 *
 * ── POR QUÉ LA CALLBACK VA EN UNA REF ────────────────────────────────────────
 * Para que se pueda llamar con una función anónima —lo natural cuando hay que
 * refrescar dos consultas— sin que eso se convierta en un bucle. Una arrow
 * declarada en el render cambia de identidad en cada render; si entrara en las
 * dependencias del efecto, este se volvería a registrar y a disparar sin parar,
 * pidiendo al servidor en bucle mientras la pantalla esté abierta. La ref
 * guarda siempre la última versión y el efecto se registra una sola vez.
 *
 * ── Y POR QUÉ SE SALTA EL PRIMER FOCO ────────────────────────────────────────
 * La primera vez la pantalla se acaba de montar y la consulta ya está trayendo
 * datos frescos. Refrescar ahí serían dos peticiones idénticas seguidas, con los
 * datos del paciente pagándolas.
 */
export function useRefrescarAlVolver(refrescar) {
  const yaEstuvo = useRef(false);
  const ultima = useRef(refrescar);
  ultima.current = refrescar;

  useFocusEffect(
    useCallback(() => {
      if (!yaEstuvo.current) { yaEstuvo.current = true; return; }
      ultima.current?.();
    }, []),
  );
}
