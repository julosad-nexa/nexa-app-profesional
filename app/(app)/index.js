import { useEffect, useRef, useState } from 'react';
import {
  View, Text, Switch, FlatList, TouchableOpacity, StyleSheet, RefreshControl, Alert, AppState,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useQuery, useMutation } from '@tanstack/react-query';
import { orienta } from '../../src/api/orienta';
import { useAuth } from '../../src/store/auth';
import { registerPush } from '../../src/lib/push';
import { prepararAlertas, alertaNuevaSolicitud } from '../../src/lib/alerta';
import { COLORS, DEFAULT_CATS, haceTiempo } from '../../src/config';
import { useCatalogo } from '../../src/lib/catalogo';

const HEARTBEAT_MS = 4 * 60 * 1000; // re-pinga cada 4 min (TTL Redis = 8 min)

export default function Home() {
  const router = useRouter();
  const logout = useAuth((s) => s.logout);
  const [disponible, setDisponible] = useState(false);
  const [filtroCat, setFiltroCat] = useState('');

  const confirmarSalir = () =>
    Alert.alert('Cerrar sesión', '¿Seguro que quieres salir?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Salir', style: 'destructive', onPress: () => logout() },
    ]);

  useEffect(() => { registerPush(); prepararAlertas(); }, []);

  // Categorías y payouts vienen del backend, no del bundle.
  const { catLabel, payoutDe } = useCatalogo();

  // Perfil del médico: define su tarifa/categorías y su estado de disponibilidad real.
  const perfil = useQuery({ queryKey: ['perfil'], queryFn: orienta.perfil });
  useEffect(() => {
    if (typeof perfil.data?.disponible === 'boolean') setDisponible(perfil.data.disponible);
  }, [perfil.data?.disponible]);

  const savedCats = perfil.data?.perfil?.categorias?.length ? perfil.data.perfil.categorias : DEFAULT_CATS;
  // Si el médico aún no fijó tarifa, se usa el payout real de su primera categoría.
  // Antes había un 8.000 escrito en el bundle que no correspondía a nada: el payout
  // de medicina general son 17.500 y el del resto 35.000.
  const savedTarifa = perfil.data?.perfil?.tarifa || payoutDe(savedCats[0]) || 0;

  const feed = useQuery({
    queryKey: ['feed'],
    queryFn: orienta.feed,
    refetchInterval: disponible ? 8000 : false, // solo hace polling si está disponible
  });

  const toggle = useMutation({
    mutationFn: (val) => orienta.setDisponibilidad(val, savedTarifa, savedCats),
    onSuccess: (_res, val) => { setDisponible(val); if (val) feed.refetch(); },
    onError: (e) => Alert.alert('No se pudo cambiar el estado', e?.message || 'Error de red'),
  });

  // Heartbeat: mantiene viva la disponibilidad en Redis (TTL 8 min) mientras esté
  // Disponible. Sin esto el médico "cae" del índice a los 8 min sin darse cuenta.
  // También re-pinga y refresca el feed al volver la app a primer plano.
  useEffect(() => {
    if (!disponible) return;
    const ping = () => orienta.setDisponibilidad(true, savedTarifa, savedCats).catch(() => {});
    const id = setInterval(ping, HEARTBEAT_MS);
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') { ping(); feed.refetch(); }
    });
    return () => { clearInterval(id); sub.remove(); };
  }, [disponible, savedTarifa, savedCats]);

  // Alerta (vibración) cuando llega una solicitud nueva al feed estando Disponible.
  const knownIdsRef = useRef(null); // null = feed aún no cargado
  useEffect(() => {
    if (!disponible) { knownIdsRef.current = null; return; }
    const items = feed.data?.feed || [];
    const ids = new Set(items.map((x) => x.id));
    if (knownIdsRef.current) {
      const nuevos = items.filter((x) => !knownIdsRef.current.has(x.id)).length;
      if (nuevos > 0) alertaNuevaSolicitud(nuevos);
    }
    knownIdsRef.current = ids;
  }, [feed.data, disponible]);

  return (
    <View style={st.c}>
      <Stack.Screen
        options={{
          title: 'Orientaciones',
          headerRight: () => (
            <View style={st.headerActions}>
              <TouchableOpacity onPress={() => router.push('/historial')}>
                <Text style={st.headerBtn}>Historial</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => router.push('/perfil')}>
                <Text style={st.headerBtn}>Ganancias</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={confirmarSalir}>
                <Text style={st.headerSalir}>Salir</Text>
              </TouchableOpacity>
            </View>
          ),
        }}
      />

      <View style={[st.avail, { borderColor: disponible ? COLORS.teal : COLORS.line }]}>
        <View>
          <Text style={st.availT}>{disponible ? 'Disponible' : 'Ocupado'}</Text>
          <Text style={st.availS}>{disponible ? 'Recibes solicitudes' : 'Actívate para atender'}</Text>
        </View>
        <Switch
          value={disponible}
          onValueChange={(v) => toggle.mutate(v)}
          trackColor={{ true: COLORS.teal }}
          disabled={toggle.isPending}
        />
      </View>

      {toggle.isError && (
        <View style={st.errBox}>
          <Text style={st.errT}>
            {`⚠ ${toggle.error?.status ? `[${toggle.error.status}] ` : ''}${toggle.error?.message || 'Error'}`}
          </Text>
        </View>
      )}

      {/* Filtro por categoría (solo si atiende más de una) */}
      {disponible && savedCats.length > 1 && (
        <View style={st.filterRow}>
          <FlatList
            horizontal showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
            data={['', ...savedCats]}
            keyExtractor={(x) => x || 'todas'}
            renderItem={({ item }) => {
              const on = filtroCat === item;
              return (
                <TouchableOpacity style={[st.chip, on && st.chipOn]} onPress={() => setFiltroCat(item)} activeOpacity={0.8}>
                  <Text style={[st.chipT, on && st.chipTOn]}>{item ? catLabel(item) : 'Todas'}</Text>
                </TouchableOpacity>
              );
            }}
          />
        </View>
      )}

      <FlatList
        contentContainerStyle={{ padding: 16 }}
        data={(feed.data?.feed || []).filter((x) => !filtroCat || x.categoria === filtroCat)}
        keyExtractor={(x) => String(x.id)}
        refreshControl={<RefreshControl refreshing={feed.isFetching} onRefresh={feed.refetch} />}
        ListEmptyComponent={
          <Text style={st.empty}>
            {disponible ? 'Sin solicitudes por ahora…' : 'Ponte Disponible para recibir solicitudes.'}
          </Text>
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={st.card} onPress={() => router.push(`/solicitud/${item.id}`)} activeOpacity={0.8}>
            <View style={st.cardHead}>
              <View style={st.badge}><Text style={st.badgeT}>{catLabel(item.categoria)}</Text></View>
              <Text style={st.time}>{haceTiempo(item.created_at)}</Text>
            </View>
            <Text style={st.txt} numberOfLines={2}>{item.texto}</Text>
            <Text style={st.cta}>Ver y aceptar →</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const st = StyleSheet.create({
  c: { flex: 1, backgroundColor: COLORS.bg },
  salir: { color: '#fff', fontWeight: '700' },
  headerActions: { flexDirection: 'row', gap: 14, alignItems: 'center' },
  headerBtn: { color: '#fff', fontWeight: '700', fontSize: 13 },
  headerSalir: { color: '#FCA5A5', fontWeight: '800', fontSize: 13 },
  filterRow: { paddingTop: 12 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, backgroundColor: '#fff', borderWidth: 1, borderColor: COLORS.line },
  chipOn: { backgroundColor: 'rgba(0,166,156,0.12)', borderColor: COLORS.teal },
  chipT: { color: COLORS.ink2, fontWeight: '700', fontSize: 13 },
  chipTOn: { color: COLORS.tealD },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  time: { color: COLORS.ink2, fontSize: 12 },
  avail: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#fff', margin: 16, marginBottom: 0, padding: 16, borderRadius: 14, borderWidth: 1.5,
  },
  availT: { fontSize: 17, fontWeight: '800', color: COLORS.ink },
  availS: { fontSize: 12, color: COLORS.ink2, marginTop: 2 },
  empty: { textAlign: 'center', color: COLORS.ink2, marginTop: 40, paddingHorizontal: 20 },
  errBox: { backgroundColor: '#FDECEC', borderColor: '#E5534B', borderWidth: 1, borderRadius: 10, marginHorizontal: 16, marginTop: 10, padding: 12 },
  errT: { color: '#B4231B', fontSize: 13, fontWeight: '700' },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: COLORS.line },
  badge: { alignSelf: 'flex-start', backgroundColor: 'rgba(0,166,156,0.12)', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999, marginBottom: 8 },
  badgeT: { color: COLORS.tealD, fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  txt: { color: COLORS.ink, fontSize: 15, lineHeight: 21 },
  cta: { color: COLORS.teal, fontWeight: '800', marginTop: 10 },
});
