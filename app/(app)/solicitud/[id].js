import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useQuery, useMutation } from '@tanstack/react-query';
import { orienta } from '../../../src/api/orienta';
import { COLORS } from '../../../src/config';

export default function SolicitudDetalle() {
  const { id } = useLocalSearchParams();
  const [texto, setTexto] = useState('');

  const q = useQuery({
    queryKey: ['solicitud', id],
    queryFn: () => orienta.detalle(id),
    refetchInterval: 5000,
  });
  const sol = q.data?.solicitud;
  const mensajes = q.data?.mensajes || [];

  const aceptar = useMutation({
    mutationFn: () => orienta.aceptar(id),
    onSuccess: () => q.refetch(),
    onError: (e) => Alert.alert('No se pudo aceptar', e.message),
  });

  const responder = useMutation({
    mutationFn: () => orienta.responder(id, texto.trim()),
    onSuccess: () => { setTexto(''); q.refetch(); },
    onError: (e) => Alert.alert('No se pudo enviar', e.message),
  });

  const puedeChatear = sol && ['asignada', 'respondida'].includes(sol.estado);

  return (
    <KeyboardAvoidingView
      style={st.c}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <Stack.Screen options={{ title: `Solicitud #${id}` }} />

      {q.isLoading || !sol ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={COLORS.teal} />
      ) : (
        <>
          <View style={st.head}>
            <View style={st.badge}><Text style={st.badgeT}>{sol.categoria}</Text></View>
            <Text style={st.estado}>{sol.estado}</Text>
          </View>
          <Text style={st.pregunta}>{sol.texto}</Text>

          <FlatList
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 16 }}
            data={mensajes}
            keyExtractor={(_, i) => String(i)}
            ListEmptyComponent={
              sol.estado === 'buscando'
                ? <Text style={st.info}>Acepta para atender esta orientación.</Text>
                : <Text style={st.info}>Aún no hay mensajes.</Text>
            }
            renderItem={({ item }) => (
              <View style={[st.msg, item.emisor === 'medico' ? st.mine : st.theirs]}>
                <Text style={item.emisor === 'medico' ? st.msgTmine : st.msgT}>{item.texto}</Text>
              </View>
            )}
          />

          {sol.estado === 'buscando' && (
            <TouchableOpacity style={st.accept} onPress={() => aceptar.mutate()} disabled={aceptar.isPending} activeOpacity={0.85}>
              {aceptar.isPending ? <ActivityIndicator color="#fff" /> : <Text style={st.acceptT}>Aceptar y atender</Text>}
            </TouchableOpacity>
          )}

          {puedeChatear && (
            <>
              <Text style={st.disc}>Teleorientación: orientación general, sin diagnóstico ni fórmula. Ante señales de alarma, indica acudir a urgencias.</Text>
              <View style={st.inputRow}>
                <TextInput
                  style={st.in} placeholder="Escribe tu orientación…" placeholderTextColor="#94A3B8"
                  value={texto} onChangeText={setTexto} multiline
                />
                <TouchableOpacity
                  style={[st.send, { opacity: texto.trim() ? 1 : 0.5 }]}
                  onPress={() => texto.trim() && responder.mutate()}
                  disabled={!texto.trim() || responder.isPending}
                >
                  <Text style={st.sendT}>Enviar</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {sol.estado === 'cerrada' && <Text style={st.closed}>Esta orientación fue cerrada por el paciente.</Text>}
        </>
      )}
    </KeyboardAvoidingView>
  );
}

const st = StyleSheet.create({
  c: { flex: 1, backgroundColor: COLORS.bg },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingBottom: 6 },
  badge: { backgroundColor: 'rgba(0,166,156,0.12)', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999 },
  badgeT: { color: COLORS.tealD, fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  estado: { color: COLORS.ink2, fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  pregunta: { fontSize: 16, color: COLORS.ink, paddingHorizontal: 16, paddingBottom: 10, lineHeight: 22 },
  info: { textAlign: 'center', color: COLORS.ink2, marginTop: 30 },
  msg: { maxWidth: '82%', padding: 12, borderRadius: 14, marginBottom: 10 },
  mine: { alignSelf: 'flex-end', backgroundColor: COLORS.teal, borderBottomRightRadius: 4 },
  theirs: { alignSelf: 'flex-start', backgroundColor: '#fff', borderWidth: 1, borderColor: COLORS.line, borderBottomLeftRadius: 4 },
  msgT: { color: COLORS.ink, fontSize: 15 },
  msgTmine: { color: '#fff', fontSize: 15 },
  accept: { backgroundColor: COLORS.teal, margin: 16, padding: 16, borderRadius: 14, alignItems: 'center' },
  acceptT: { color: '#fff', fontWeight: '800', fontSize: 16 },
  disc: { fontSize: 11, color: COLORS.ink2, paddingHorizontal: 16, paddingBottom: 6 },
  inputRow: { flexDirection: 'row', padding: 12, gap: 8, backgroundColor: '#fff', borderTopWidth: 1, borderColor: COLORS.line, alignItems: 'flex-end' },
  in: { flex: 1, backgroundColor: COLORS.bg, borderRadius: 12, padding: 12, fontSize: 15, maxHeight: 100 },
  send: { backgroundColor: COLORS.navy, paddingHorizontal: 18, paddingVertical: 12, borderRadius: 12 },
  sendT: { color: '#fff', fontWeight: '800' },
  closed: { textAlign: 'center', color: COLORS.ink2, padding: 16 },
});
