import { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import { Stack } from 'expo-router';
import { useQuery, useMutation } from '@tanstack/react-query';
import { orienta, configPublica } from '../../src/api/orienta';
import { useAuth } from '../../src/store/auth';
import { COLORS, cop } from '../../src/config';

export default function Perfil() {
  const logout = useAuth((s) => s.logout);
  const [cats, setCats] = useState([]);
  const [dirty, setDirty] = useState(false);

  const q = useQuery({ queryKey: ['perfil'], queryFn: orienta.perfil });
  const cfg = useQuery({ queryKey: ['config-publica'], queryFn: configPublica });

  // Sembrar categorías del médico una sola vez.
  useEffect(() => {
    if (q.data?.perfil && !dirty) setCats(q.data.perfil.categorias || []);
  }, [q.data]); // eslint-disable-line react-hooks/exhaustive-deps

  const guardar = useMutation({
    // La tarifa la fija NexaSalud (config); el médico solo elige categorías.
    mutationFn: () => orienta.guardarPerfil(0, cats),
    onSuccess: () => { setDirty(false); q.refetch(); Alert.alert('Listo', 'Perfil actualizado'); },
    onError: (e) => Alert.alert('No se pudo guardar', e?.message || 'Error'),
  });

  const toggleCat = (id) => {
    setDirty(true);
    setCats((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
  };

  const g = q.data?.ganancias;
  const rating = q.data?.perfil?.rating;
  const categorias = cfg.data?.categorias || []; // catálogo con payout desde la config

  return (
    <ScrollView style={st.c} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Stack.Screen options={{ title: 'Ganancias y perfil' }} />

      {q.isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={COLORS.teal} />
      ) : (
        <>
          {/* Ganancia total */}
          <View style={st.hero}>
            <Text style={st.heroLabel}>Ganancia acumulada</Text>
            <Text style={st.heroValue}>{cop(g?.total)}</Text>
            <Text style={st.heroSub}>{g?.atendidas || 0} orientaciones atendidas</Text>
          </View>

          {/* Métricas */}
          <View style={st.row}>
            <View style={st.metric}><Text style={st.mLabel}>Por cobrar</Text><Text style={st.mValue}>{cop(g?.pendiente)}</Text></View>
            <View style={st.metric}><Text style={st.mLabel}>Pagado</Text><Text style={st.mValue}>{cop(g?.liquidado)}</Text></View>
            <View style={st.metric}><Text style={st.mLabel}>Calificación</Text><Text style={st.mValue}>{rating != null ? `${rating}★` : '—'}</Text></View>
          </View>

          {/* Categorías que atiende + payout (tarifa fijada por NexaSalud) */}
          <Text style={st.section}>Categorías que atiendes</Text>
          <Text style={st.hint}>
            Recibes orientaciones solo de las categorías seleccionadas. El pago por cada una lo define NexaSalud.
          </Text>

          {cfg.isLoading ? (
            <ActivityIndicator style={{ marginVertical: 20 }} color={COLORS.teal} />
          ) : (
            <View style={st.cardList}>
              {categorias.map((c) => {
                const on = cats.includes(c.id);
                return (
                  <TouchableOpacity key={c.id} style={[st.catRow, on && st.catRowOn]} onPress={() => toggleCat(c.id)} activeOpacity={0.8}>
                    <View style={[st.check, on && st.checkOn]}>{on && <Text style={st.checkMark}>✓</Text>}</View>
                    <View style={{ flex: 1 }}>
                      <Text style={[st.catName, on && st.catNameOn]}>{c.label}</Text>
                      <Text style={st.catMeta}>{c.creditos} créd. · precio {cop(c.precio)}</Text>
                    </View>
                    <Text style={[st.catPay, on && st.catPayOn]}>ganas {cop(c.payout)}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          <TouchableOpacity
            style={[st.save, { opacity: dirty && !guardar.isPending ? 1 : 0.5 }]}
            onPress={() => dirty && guardar.mutate()}
            disabled={!dirty || guardar.isPending}
            activeOpacity={0.85}
          >
            {guardar.isPending ? <ActivityIndicator color="#fff" /> : <Text style={st.saveT}>Guardar cambios</Text>}
          </TouchableOpacity>

          <TouchableOpacity style={st.logout} onPress={logout} activeOpacity={0.7}>
            <Text style={st.logoutT}>Cerrar sesión</Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}

const st = StyleSheet.create({
  c: { flex: 1, backgroundColor: COLORS.bg },
  hero: { backgroundColor: COLORS.navy, borderRadius: 18, padding: 22, alignItems: 'center' },
  heroLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '600' },
  heroValue: { color: '#fff', fontSize: 38, fontWeight: '900', marginTop: 4, letterSpacing: -0.5 },
  heroSub: { color: COLORS.teal, fontSize: 13, fontWeight: '700', marginTop: 4 },
  row: { flexDirection: 'row', gap: 10, marginTop: 12 },
  metric: { flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: COLORS.line },
  mLabel: { color: COLORS.ink2, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  mValue: { color: COLORS.ink, fontSize: 18, fontWeight: '800', marginTop: 6 },
  section: { color: COLORS.ink, fontSize: 16, fontWeight: '800', marginTop: 24 },
  hint: { color: COLORS.ink2, fontSize: 12, marginTop: 3, marginBottom: 12, lineHeight: 17 },
  cardList: { gap: 10 },
  catRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, padding: 14, borderWidth: 1.5, borderColor: COLORS.line },
  catRowOn: { borderColor: COLORS.teal, backgroundColor: 'rgba(0,166,156,0.05)' },
  check: { width: 24, height: 24, borderRadius: 7, borderWidth: 1.5, borderColor: COLORS.line, marginRight: 12, alignItems: 'center', justifyContent: 'center' },
  checkOn: { backgroundColor: COLORS.teal, borderColor: COLORS.teal },
  checkMark: { color: '#fff', fontWeight: '900', fontSize: 14 },
  catName: { color: COLORS.ink2, fontSize: 15, fontWeight: '700' },
  catNameOn: { color: COLORS.ink },
  catMeta: { color: COLORS.ink2, fontSize: 12, marginTop: 2 },
  catPay: { color: COLORS.ink2, fontSize: 13, fontWeight: '800' },
  catPayOn: { color: COLORS.tealD },
  save: { backgroundColor: COLORS.teal, borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 24 },
  saveT: { color: '#fff', fontWeight: '800', fontSize: 16 },
  logout: { padding: 16, alignItems: 'center', marginTop: 8 },
  logoutT: { color: '#B4231B', fontWeight: '700' },
});
