import { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useInfiniteQuery } from '@tanstack/react-query';
import { orienta } from '../../src/api/orienta';

// Coincide con el tope por defecto del backend.
const PAGINA = 30;
import { COLORS, cop, haceTiempo, fmtFecha } from '../../src/config';
import { useCatalogo } from '../../src/lib/catalogo';

const ESTADOS = [
  { id: '', label: 'Todas' },
  { id: 'cerrada', label: 'Cerradas' },
  { id: 'respondida', label: 'En curso' },
  { id: 'reembolsada', label: 'Reembolsadas' },
];

const estadoTag = {
  cerrada:     { t: 'Cerrada',     c: '#0E7C66', bg: 'rgba(0,166,156,0.12)' },
  respondida:  { t: 'En curso',    c: '#1D4ED8', bg: 'rgba(29,78,216,0.10)' },
  asignada:    { t: 'En curso',    c: '#1D4ED8', bg: 'rgba(29,78,216,0.10)' },
  reembolsada: { t: 'Reembolsada', c: '#92400E', bg: 'rgba(245,158,11,0.12)' },
};

export default function Historial() {
  const { categorias, catLabel } = useCatalogo();
  const router = useRouter();
  const [estado, setEstado] = useState('');
  const [categoria, setCategoria] = useState('');
  const [q, setQ] = useState('');
  const [qDebounced, setQDebounced] = useState('');

  const onSearch = (v) => {
    setQ(v);
    clearTimeout(onSearch._t);
    onSearch._t = setTimeout(() => setQDebounced(v.trim()), 400);
  };

  /*
   * Paginado, no los 30 primeros y punto.
   *
   * El backend acepta `limit`/`offset` (tope 100) y la app no los pasaba: se
   * quedaba con las 30 orientaciones más recientes y no había forma de ver más.
   * Para un médico con trabajo acumulado eso significa perder de vista lo suyo —
   * y es justo la pantalla donde comprobaría qué le han pagado.
   */
  const query = useInfiniteQuery({
    queryKey: ['historial', estado, categoria, qDebounced],
    queryFn: ({ pageParam = 0 }) =>
      orienta.historial({ estado, categoria, q: qDebounced, limit: PAGINA, offset: pageParam }),
    initialPageParam: 0,
    // Si la página vino llena, asumimos que hay más. Es una página de más en el
    // peor caso, a cambio de no pedirle al backend que devuelva un total.
    getNextPageParam: (ultima, todas) => {
      const n = (ultima?.historial || []).length;
      return n < PAGINA ? undefined : todas.length * PAGINA;
    },
  });

  const items = (query.data?.pages || []).flatMap((p) => p?.historial || []);

  return (
    <View style={st.c}>
      <Stack.Screen options={{ title: 'Historial' }} />

      {/* Búsqueda */}
      <View style={st.searchWrap}>
        <TextInput
          style={st.search} placeholder="Buscar en el texto…" placeholderTextColor="#94A3B8"
          value={q} onChangeText={onSearch} returnKeyType="search"
        />
      </View>

      {/* Filtro por estado */}
      <FiltroChips data={ESTADOS} value={estado} onChange={setEstado} keyId="id" />
      {/* Filtro por categoría */}
      <FiltroChips
        data={[{ id: '', label: 'Toda categoría' }, ...categorias]}
        value={categoria} onChange={setCategoria} keyId="id"
      />

      {query.isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={COLORS.teal} />
      ) : (
        <FlatList
          contentContainerStyle={{ padding: 16, paddingTop: 6 }}
          data={items}
          keyExtractor={(x) => String(x.id)}
          refreshControl={<RefreshControl refreshing={query.isFetching && !query.isFetchingNextPage} onRefresh={query.refetch} />}
          ListEmptyComponent={<Text style={st.empty}>Sin orientaciones con estos filtros.</Text>}
          ListFooterComponent={
            query.hasNextPage ? (
              <TouchableOpacity
                style={st.masBtn}
                onPress={() => query.fetchNextPage()}
                disabled={query.isFetchingNextPage}
                activeOpacity={0.8}
              >
                <Text style={st.masT}>
                  {query.isFetchingNextPage ? 'Cargando…' : 'Ver más'}
                </Text>
              </TouchableOpacity>
            ) : items.length > 0 ? (
              <Text style={st.finLista}>No hay más orientaciones.</Text>
            ) : null
          }
          renderItem={({ item }) => {
            const tag = estadoTag[item.estado] || { t: item.estado, c: COLORS.ink2, bg: '#EEF2F7' };
            return (
              <TouchableOpacity style={st.card} onPress={() => router.push(`/solicitud/${item.id}`)} activeOpacity={0.85}>
                <View style={st.row}>
                  <View style={st.badge}><Text style={st.badgeT}>{catLabel(item.categoria)}</Text></View>
                  <View style={[st.tag, { backgroundColor: tag.bg }]}><Text style={[st.tagT, { color: tag.c }]}>{tag.t}</Text></View>
                </View>
                <Text style={st.txt} numberOfLines={2}>{item.texto}</Text>
                <View style={st.footer}>
                  <Text style={st.fecha}>{fmtFecha(item.created_at)} · {haceTiempo(item.created_at)}</Text>
                  {Number(item.neto_medico) > 0 && <Text style={st.monto}>{cop(item.neto_medico)}</Text>}
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

function FiltroChips({ data, value, onChange, keyId }) {
  return (
    <View style={st.chipsRow}>
      <FlatList
        horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 12, gap: 8 }}
        data={data}
        keyExtractor={(x) => String(x[keyId])}
        renderItem={({ item }) => {
          const on = value === item[keyId];
          return (
            <TouchableOpacity style={[st.chip, on && st.chipOn]} onPress={() => onChange(item[keyId])} activeOpacity={0.8}>
              <Text style={[st.chipT, on && st.chipTOn]}>{item.label}</Text>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const st = StyleSheet.create({
  masBtn: { margin: 16, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: COLORS.line, alignItems: 'center' },
  masT: { color: COLORS.teal, fontWeight: '700' },
  finLista: { textAlign: 'center', color: COLORS.ink2, fontSize: 12, paddingVertical: 18 },
  c: { flex: 1, backgroundColor: COLORS.bg },
  searchWrap: { padding: 12, paddingBottom: 6 },
  search: { backgroundColor: '#fff', borderWidth: 1, borderColor: COLORS.line, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, color: COLORS.ink },
  chipsRow: { paddingVertical: 6 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, backgroundColor: '#fff', borderWidth: 1, borderColor: COLORS.line },
  chipOn: { backgroundColor: 'rgba(0,166,156,0.12)', borderColor: COLORS.teal },
  chipT: { color: COLORS.ink2, fontWeight: '700', fontSize: 13 },
  chipTOn: { color: COLORS.tealD },
  empty: { textAlign: 'center', color: COLORS.ink2, marginTop: 40, paddingHorizontal: 20 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: COLORS.line },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  badge: { alignSelf: 'flex-start', backgroundColor: 'rgba(0,166,156,0.12)', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999 },
  badgeT: { color: COLORS.tealD, fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  tag: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999 },
  tagT: { fontSize: 11, fontWeight: '800' },
  txt: { color: COLORS.ink, fontSize: 15, lineHeight: 21 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  fecha: { color: COLORS.ink2, fontSize: 12 },
  monto: { color: '#0E7C66', fontWeight: '800', fontSize: 14 },
});
