import { useQuery } from '@tanstack/react-query';
import { configPublica } from '../api/orienta';
import { CATEGORIAS as RESPALDO } from '../config';

/**
 * Catálogo de categorías, servido por el backend.
 *
 * ── POR QUÉ EXISTE ───────────────────────────────────────────────────────────
 * Hasta ahora cada pantalla importaba `CATEGORIAS` de `src/config.js`, una copia
 * congelada dentro del bundle. Ya había divergido del panel de administración:
 * donde el backend dice «Salud mental / Psicología», la app decía «Psicología».
 * Y una categoría nueva no llegaba nunca al móvil sin publicar una versión.
 *
 * La fuente de verdad es `nexa_orienta_config`, que el administrador edita y
 * WordPress expone en `nexa/v1/orienta/config` ya calculada: label, costo en
 * créditos, precio al paciente y **payout del médico**.
 *
 * ── EL RESPALDO NO ES OPCIONAL ───────────────────────────────────────────────
 * Si la petición falla se usa la lista del bundle. Un médico en una zona con mala
 * señal tiene que poder seguir viendo el feed y atendiendo: quedarse sin nombres
 * de categoría es un defecto cosmético, quedarse sin app es perder una consulta.
 * Por eso `catLabel` nunca devuelve vacío — como mucho devuelve el id.
 */
export function useCatalogo() {
  // Misma clave que usa la pantalla de perfil: React Query comparte la respuesta
  // y no se piden dos veces.
  const q = useQuery({
    queryKey: ['config-publica'],
    queryFn: configPublica,
    staleTime: 30 * 60 * 1000,   // cambia muy de vez en cuando
    retry: 1,
  });

  const remotas = Array.isArray(q.data?.categorias) ? q.data.categorias : [];
  const categorias = remotas.length ? remotas : RESPALDO;

  const porId = new Map(categorias.map((c) => [c.id, c]));

  return {
    categorias,
    cargando: q.isLoading,
    /** true si estamos mostrando la copia del bundle porque el backend no respondió. */
    esRespaldo: !remotas.length,

    /** Etiqueta legible. Si la categoría no está en el catálogo, devuelve su id. */
    catLabel: (id) => porId.get(id)?.label || id,

    /** Lo que cobra el médico por esa categoría, o 0 si no se sabe. */
    payoutDe: (id) => Number(porId.get(id)?.payout || 0),

    valorCredito: Number(q.data?.valor_credito || 0),
  };
}
