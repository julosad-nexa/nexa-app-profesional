import { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import { Stack } from 'expo-router';
import { useQuery, useMutation } from '@tanstack/react-query';
import { orienta, configPublica } from '../../src/api/orienta';
import { useAuth } from '../../src/store/auth';
import { COLORS, cop, fmtFecha, catLabel } from '../../src/config';

export default function Perfil() {
  const logout = useAuth((s) => s.logout);
  const [cats, setCats] = useState([]);
  const [dirty, setDirty] = useState(false);

  const [verif, setVerif] = useState({ registro_profesional: '', especialidad: '', documento: '' });

  const q = useQuery({ queryKey: ['perfil'], queryFn: orienta.perfil });
  const cfg = useQuery({ queryKey: ['config-publica'], queryFn: configPublica });
  const pay = useQuery({ queryKey: ['payouts'], queryFn: orienta.payouts });

  // Sembrar categorías y datos de verificación del médico una sola vez.
  useEffect(() => {
    if (q.data?.perfil && !dirty) setCats(q.data.perfil.categorias || []);
    const v = q.data?.verificacion;
    if (v) setVerif((prev) =>
      (prev.registro_profesional || prev.especialidad) ? prev : {
        registro_profesional: v.registro_profesional || '',
        especialidad: v.especialidad || '',
        documento: v.documento || '',
      });
  }, [q.data]); // eslint-disable-line react-hooks/exhaustive-deps

  const verificar = useMutation({
    mutationFn: () => orienta.enviarVerificacion(verif),
    onSuccess: () => { q.refetch(); Alert.alert('Enviado', 'Tus datos quedaron en revisión. Te avisaremos al verificarte.'); },
    onError: (e) => Alert.alert('No se pudo enviar', e?.message || 'Error'),
  });

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
  const v = q.data?.verificacion;
  const verificado = v?.verificado;
  const setV = (k, val) => setVerif((p) => ({ ...p, [k]: val }));

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

          {/* Verificación profesional (ReTHUS) */}
          <Text style={st.section}>Verificación profesional</Text>
          {verificado ? (
            <View style={st.verOk}>
              <Text style={st.verOkT}>✓ Cuenta verificada</Text>
              <Text style={st.verOkS}>{v?.especialidad}{v?.registro_profesional ? ` · Reg. ${v.registro_profesional}` : ''}</Text>
            </View>
          ) : (
            <View style={st.verBox}>
              {v?.estado === 'pendiente' && <Text style={[st.verBadge, st.verPend]}>En revisión</Text>}
              {v?.estado === 'rechazado' && (
                <Text style={[st.verBadge, st.verRej]}>Rechazada{v?.motivo_rechazo ? `: ${v.motivo_rechazo}` : ''}</Text>
              )}
              <Text style={st.hint}>Debes verificarte para recibir orientaciones. Ingresa tus datos profesionales (los validamos contra ReTHUS).</Text>
              <TextInput style={st.vin} placeholder="Registro / Tarjeta profesional" placeholderTextColor="#94A3B8"
                value={verif.registro_profesional} onChangeText={(t) => setV('registro_profesional', t)} autoCapitalize="characters" />
              <TextInput style={st.vin} placeholder="Especialidad (ej. Medicina general)" placeholderTextColor="#94A3B8"
                value={verif.especialidad} onChangeText={(t) => setV('especialidad', t)} />
              <TextInput style={st.vin} placeholder="Documento de identidad (opcional)" placeholderTextColor="#94A3B8"
                value={verif.documento} onChangeText={(t) => setV('documento', t)} keyboardType="number-pad" />
              <TouchableOpacity
                style={[st.verSend, { opacity: verif.registro_profesional && verif.especialidad && !verificar.isPending ? 1 : 0.5 }]}
                onPress={() => verif.registro_profesional && verif.especialidad && verificar.mutate()}
                disabled={!verif.registro_profesional || !verif.especialidad || verificar.isPending}
              >
                {verificar.isPending ? <ActivityIndicator color="#fff" /> : <Text style={st.verSendT}>{v?.estado === 'pendiente' || v?.estado === 'rechazado' ? 'Actualizar datos' : 'Enviar para verificación'}</Text>}
              </TouchableOpacity>
            </View>
          )}

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

          {/* Historial de pagos */}
          <Text style={st.section}>Historial de pagos</Text>
          {pay.isLoading ? (
            <ActivityIndicator style={{ marginVertical: 16 }} color={COLORS.teal} />
          ) : (pay.data?.payouts || []).length === 0 ? (
            <Text style={st.hint}>Aún no tienes pagos. Aparecerán al cerrarse cada orientación.</Text>
          ) : (
            <View style={st.payList}>
              {pay.data.payouts.map((p, i) => (
                <View key={i} style={st.payRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={st.payCat}>{catLabel(p.categoria)}</Text>
                    <Text style={st.payDate}>{fmtFecha(p.ts)}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={st.payNeto}>{cop(p.neto_medico)}</Text>
                    <Text style={[st.payEstado, p.estado_payout === 'liquidado' ? st.payPagado : st.payPend]}>
                      {p.estado_payout === 'liquidado' ? 'Pagado' : 'Por cobrar'}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}

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
  verOk: { backgroundColor: 'rgba(0,166,156,0.10)', borderWidth: 1, borderColor: COLORS.teal, borderRadius: 14, padding: 14, marginTop: 10 },
  verOkT: { color: COLORS.tealD, fontWeight: '800', fontSize: 15 },
  verOkS: { color: COLORS.ink2, fontSize: 13, marginTop: 2 },
  verBox: { backgroundColor: '#fff', borderWidth: 1, borderColor: COLORS.line, borderRadius: 14, padding: 14, marginTop: 10 },
  verBadge: { alignSelf: 'flex-start', fontSize: 12, fontWeight: '800', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, overflow: 'hidden', marginBottom: 8 },
  verPend: { backgroundColor: 'rgba(245,158,11,0.15)', color: '#92400E' },
  verRej: { backgroundColor: '#FDECEC', color: '#B4231B' },
  vin: { backgroundColor: COLORS.bg, borderWidth: 1, borderColor: COLORS.line, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: COLORS.ink, marginBottom: 8 },
  verSend: { backgroundColor: COLORS.navy, borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 4 },
  verSendT: { color: '#fff', fontWeight: '800' },
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
  payList: { gap: 8, marginTop: 4 },
  payRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: COLORS.line, padding: 14 },
  payCat: { color: COLORS.ink, fontSize: 14, fontWeight: '700' },
  payDate: { color: COLORS.ink2, fontSize: 12, marginTop: 2 },
  payNeto: { color: COLORS.ink, fontSize: 15, fontWeight: '800' },
  payEstado: { fontSize: 11, fontWeight: '800', marginTop: 2 },
  payPagado: { color: '#0E7C66' },
  payPend: { color: '#92400E' },
  logout: { padding: 16, alignItems: 'center', marginTop: 8 },
  logoutT: { color: '#B4231B', fontWeight: '700' },
});
