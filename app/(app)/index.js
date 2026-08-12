import { useEffect, useState } from 'react';
import {
  View, Text, Switch, FlatList, TouchableOpacity, StyleSheet, RefreshControl, Alert,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useQuery, useMutation } from '@tanstack/react-query';
import { orienta } from '../../src/api/orienta';
import { registerPush } from '../../src/lib/push';
import { COLORS, DEFAULT_CATS, DEFAULT_TARIFA } from '../../src/config';

export default function Home() {
  const router = useRouter();
  const [disponible, setDisponible] = useState(false);

  useEffect(() => { registerPush(); }, []);

  // Perfil del médico: define su tarifa/categorías y su estado de disponibilidad real.
  const perfil = useQuery({ queryKey: ['perfil'], queryFn: orienta.perfil });
  useEffect(() => {
    if (typeof perfil.data?.disponible === 'boolean') setDisponible(perfil.data.disponible);
  }, [perfil.data?.disponible]);

  const savedCats = perfil.data?.perfil?.categorias?.length ? perfil.data.perfil.categorias : DEFAULT_CATS;
  const savedTarifa = perfil.data?.perfil?.tarifa || DEFAULT_TARIFA;

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

  return (
    <View style={st.c}>
      <Stack.Screen
        options={{
          title: 'Orientaciones',
          headerRight: () => (
            <TouchableOpacity onPress={() => router.push('/perfil')}>
              <Text style={st.salir}>Ganancias</Text>
            </TouchableOpacity>
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

      <FlatList
        contentContainerStyle={{ padding: 16 }}
        data={feed.data?.feed || []}
        keyExtractor={(x) => String(x.id)}
        refreshControl={<RefreshControl refreshing={feed.isFetching} onRefresh={feed.refetch} />}
        ListEmptyComponent={
          <Text style={st.empty}>
            {disponible ? 'Sin solicitudes por ahora…' : 'Ponte Disponible para recibir solicitudes.'}
          </Text>
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={st.card} onPress={() => router.push(`/solicitud/${item.id}`)} activeOpacity={0.8}>
            <View style={st.badge}><Text style={st.badgeT}>{item.categoria}</Text></View>
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
