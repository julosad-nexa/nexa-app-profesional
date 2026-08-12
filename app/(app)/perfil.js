import { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import { Stack } from 'expo-router';
import { useQuery, useMutation } from '@tanstack/react-query';
import { orienta } from '../../src/api/orienta';
import { useAuth } from '../../src/store/auth';
import { COLORS, CATEGORIAS } from '../../src/config';

const money = (n) => '$' + (Number(n) || 0).toLocaleString('es-CO');

export default function Perfil() {
  const logout = useAuth((s) => s.logout);
  const [cats, setCats] = useState([]);
  const [tarifa, setTarifa] = useState('');
  const [dirty, setDirty] = useState(false);

  const q = useQuery({ queryKey: ['perfil'], queryFn: orienta.perfil });

  // Al cargar el perfil, sembrar los campos editables una sola vez.
  useEffect(() => {
    if (q.data?.perfil && !dirty) {
      setCats(q.data.perfil.categorias || []);
      setTarifa(String(q.data.perfil.tarifa || ''));
    }
  }, [q.data]); // eslint-disable-line react-hooks/exhaustive-deps

  const guardar = useMutation({
    mutationFn: () => orienta.guardarPerfil(Number(tarifa) || 0, cats),
    onSuccess: () => { setDirty(false); q.refetch(); Alert.alert('Listo', 'Perfil actualizado'); },
    onError: (e) => Alert.alert('No se pudo guardar', e?.message || 'Error'),
  });

  const toggleCat = (id) => {
    setDirty(true);
    setCats((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
  };

  const g = q.data?.ganancias;
  const rating = q.data?.perfil?.rating;

  return (
    <ScrollView style={st.c} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Stack.Screen options={{ title: 'Ganancias y perfil' }} />

      {q.isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={COLORS.teal} />
      ) : (
        <>
          {/* Ganancia total destacada */}
          <View style={st.hero}>
            <Text style={st.heroLabel}>Ganancia acumulada</Text>
            <Text style={st.heroValue}>{money(g?.total)}</Text>
            <Text style={st.heroSub}>{g?.atendidas || 0} orientaciones atendidas</Text>
          </View>

          {/* Métricas */}
          <View style={st.row}>
            <View style={st.metric}>
              <Text style={st.mLabel}>Por cobrar</Text>
              <Text style={st.mValue}>{money(g?.pendiente)}</Text>
            </View>
            <View style={st.metric}>
              <Text style={st.mLabel}>Pagado</Text>
              <Text style={st.mValue}>{money(g?.liquidado)}</Text>
            </View>
            <View style={st.metric}>
              <Text style={st.mLabel}>Calificación</Text>
              <Text style={st.mValue}>{rating != null ? `${rating}★` : '—'}</Text>
            </View>
          </View>

          {/* Editar categorías */}
          <Text style={st.section}>Categorías que atiendes</Text>
          <Text style={st.hint}>Solo recibirás orientaciones de las categorías seleccionadas.</Text>
          <View style={st.chips}>
            {CATEGORIAS.map((c) => {
              const on = cats.includes(c.id);
              return (
                <TouchableOpacity
                  key={c.id}
                  style={[st.chip, on && st.chipOn]}
                  onPress={() => toggleCat(c.id)}
                  activeOpacity={0.8}
                >
                  <Text style={[st.chipT, on && st.chipTOn]}>{c.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Editar tarifa */}
          <Text style={st.section}>Tu tarifa por orientación</Text>
          <Text style={st.hint}>Referencia informativa; el pago neto se calcula al cerrarse cada orientación.</Text>
          <View style={st.tarifaRow}>
            <Text style={st.peso}>$</Text>
            <TextInput
              style={st.tarifaIn}
              value={tarifa}
              onChangeText={(v) => { setDirty(true); setTarifa(v.replace(/[^0-9]/g, '')); }}
              keyboardType="number-pad"
              placeholder="8000"
              placeholderTextColor="#94A3B8"
            />
          </View>

          <TouchableOpacity
            style={[st.save, { opacity: dirty && !guardar.isPending ? 1 : 0.5 }]}
            onPress={() => dirty && guardar.mutate()}
            disabled={!dirty || guardar.isPending}
            activeOpacity={0.85}
          >
            {guardar.isPending
              ? <ActivityIndicator color="#fff" />
              : <Text style={st.saveT}>Guardar cambios</Text>}
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
  hint: { color: COLORS.ink2, fontSize: 12, marginTop: 3, marginBottom: 10, lineHeight: 17 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, backgroundColor: '#fff', borderWidth: 1.5, borderColor: COLORS.line },
  chipOn: { backgroundColor: 'rgba(0,166,156,0.12)', borderColor: COLORS.teal },
  chipT: { color: COLORS.ink2, fontWeight: '700', fontSize: 13 },
  chipTOn: { color: COLORS.tealD },
  tarifaRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: COLORS.line, paddingHorizontal: 14 },
  peso: { color: COLORS.ink2, fontSize: 18, fontWeight: '800' },
  tarifaIn: { flex: 1, padding: 14, fontSize: 18, fontWeight: '700', color: COLORS.ink },
  save: { backgroundColor: COLORS.teal, borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 24 },
  saveT: { color: '#fff', fontWeight: '800', fontSize: 16 },
  logout: { padding: 16, alignItems: 'center', marginTop: 8 },
  logoutT: { color: '#B4231B', fontWeight: '700' },
});
