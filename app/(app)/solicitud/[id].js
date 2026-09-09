import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform, Modal, ScrollView, Image,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useHeaderHeight } from "expo-router/react-navigation";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { orienta, adjuntoUrl } from '../../../src/api/orienta';
import { useAuth } from '../../../src/store/auth';
import { COLORS, PLANTILLAS, cop } from '../../../src/config';
import { useCatalogo } from '../../../src/lib/catalogo';

const INTAKE = [
  ['edad', 'Edad'], ['sexo', 'Sexo'], ['evolucion', 'Evolución'],
  ['alergias', 'Alergias'], ['medicamentos', 'Medicamentos'], ['embarazo', 'Embarazo'],
];

export default function SolicitudDetalle() {
  const { catLabel } = useCatalogo();
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const qc = useQueryClient();
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const token = useAuth((s) => s.token);
  const [texto, setTexto] = useState('');
  const [plantillasOpen, setPlantillasOpen] = useState(false);
  const [viewer, setViewer] = useState(null);
  const [pendingImg, setPendingImg] = useState(null); // imagen elegida, en espera de confirmación

  const q = useQuery({
    queryKey: ['solicitud', id],
    queryFn: () => orienta.detalle(id),
    /*
     * Solo se sondea mientras la orientación está viva.
     *
     * Antes eran 5 segundos para siempre: una orientación cerrada abierta en
     * pantalla seguía pidiendo al servidor cada 5 s indefinidamente. Con un
     * médico da igual; con varios y la app olvidada en una pestaña, es tráfico
     * constante que no aporta nada.
     */
    refetchInterval: (q) => {
      const estado = q?.state?.data?.solicitud?.estado;
      return (estado === 'cerrada' || estado === 'reembolsada' || estado === 'expirada')
        ? false
        : 5000;
    },
  });
  const sol = q.data?.solicitud;
  const mensajes = q.data?.mensajes || [];

  const aceptar = useMutation({
    mutationFn: () => orienta.aceptar(id),
    onSuccess: () => {
      // Ya es suya: el feed no debe seguir ofreciéndola mientras llega el siguiente poll.
      qc.invalidateQueries({ queryKey: ['feed'] });
      q.refetch();
    },
    onError: (e) => {
      // 409 no es un fallo: es el marketplace funcionando. Otro médico llegó antes,
      // o la solicitud expiró por SLA. Presentarlo como error asusta sin motivo y,
      // peor, deja al médico varado en una solicitud que ya no puede atender.
      //
      // Este caso se volvió más frecuente a propósito: el servidor antes se comía el
      // resultado de la asignación y le respondía "aceptada" al que perdía la carrera.
      if (e?.status === 409) {
        qc.invalidateQueries({ queryKey: ['feed'] });
        Alert.alert(
          'Ya no está disponible',
          e.message || 'Otro médico la tomó primero.',
          [{ text: 'Volver', onPress: () => router.back() }],
        );
        return;
      }
      Alert.alert('No se pudo aceptar', e.message);
    },
  });
  const responder = useMutation({
    mutationFn: () => orienta.responder(id, texto.trim()),
    onSuccess: () => { setTexto(''); q.refetch(); },
    onError: (e) => Alert.alert('No se pudo enviar', e.message),
  });
  const adjuntar = useMutation({
    mutationFn: (asset) => orienta.enviarAdjunto(id, asset),
    onSuccess: () => { setPendingImg(null); q.refetch(); },
    onError: (e) => Alert.alert('No se pudo enviar la imagen', e.message),
  });
  const finalizar = useMutation({
    mutationFn: () => orienta.cerrar(id),
    onSuccess: (res) => {
      if (res?.estado === 'reembolsada' || res?.sin_atencion) {
        Alert.alert('Sin atención registrada',
          'No respondiste al paciente, así que se reembolsó su crédito y no hay pago por esta orientación.',
          [{ text: 'Entendido', onPress: () => router.back() }]);
        return;
      }
      const liq = res?.liquidacion;
      Alert.alert('Orientación finalizada',
        liq ? `Ganaste ${cop(liq.neto_medico)} por esta orientación.` : 'La orientación fue cerrada.',
        [{ text: 'Listo', onPress: () => router.back() }]);
    },
    onError: (e) => Alert.alert('No se pudo finalizar', e.message),
  });
  const derivar = useMutation({
    mutationFn: () => orienta.derivar(id),
    onSuccess: () => q.refetch(),
    onError: (e) => Alert.alert('No se pudo derivar', e.message),
  });

  const confirmarFinalizar = () =>
    Alert.alert('Finalizar orientación',
      'Se cerrará la orientación y se registrará tu pago. El paciente ya no podrá escribir. ¿Continuar?',
      [{ text: 'Cancelar', style: 'cancel' }, { text: 'Finalizar', style: 'destructive', onPress: () => finalizar.mutate() }]);
  const confirmarDerivar = () =>
    Alert.alert('Derivar a urgencias',
      'Se enviará al paciente la recomendación de acudir a urgencias y quedará registrado en la auditoría. ¿Continuar?',
      [{ text: 'Cancelar', style: 'cancel' }, { text: 'Derivar', style: 'destructive', onPress: () => derivar.mutate() }]);

  const elegirImagen = () =>
    Alert.alert('Enviar imagen', 'Elige una fuente', [
      { text: 'Cámara', onPress: () => lanzarPicker('camera') },
      { text: 'Galería', onPress: () => lanzarPicker('gallery') },
      { text: 'Cancelar', style: 'cancel' },
    ]);

  const lanzarPicker = async (src) => {
    try {
      const perm = src === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) return Alert.alert('Permiso requerido', 'Habilita el acceso para enviar imágenes.');
      const opts = { mediaTypes: ['images'], quality: 0.6 };
      const r = src === 'camera'
        ? await ImagePicker.launchCameraAsync(opts)
        : await ImagePicker.launchImageLibraryAsync(opts);
      if (!r.canceled && r.assets?.[0]) setPendingImg(r.assets[0]); // muestra preview, no envía aún
    } catch (e) { Alert.alert('Error', e.message); }
  };

  const usarPlantilla = (x) => { setTexto((p) => (p ? `${p}\n${x}` : x)); setPlantillasOpen(false); };

  const puedeChatear = sol && ['asignada', 'respondida'].includes(sol.estado);
  const intake = (sol?.contexto && INTAKE.filter(([k]) => sol.contexto[k])) || [];

  return (
    <KeyboardAvoidingView
      style={st.c}
      behavior="padding"
      keyboardVerticalOffset={Platform.OS === 'ios' ? headerHeight : insets.bottom}
    >
      <Stack.Screen options={{ title: `Solicitud #${id}` }} />

      {q.isLoading || !sol ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={COLORS.teal} />
      ) : (
        <>
          <View style={st.head}>
            <View style={st.badge}><Text style={st.badgeT}>{catLabel(sol.categoria)}</Text></View>
            <Text style={st.estado}>{sol.estado}</Text>
          </View>
          <Text style={st.pregunta}>{sol.texto}</Text>

          {intake.length > 0 && (
            <View style={st.intake}>
              {intake.map(([k, label]) => (
                <View key={k} style={st.intakeItem}>
                  <Text style={st.intakeLabel}>{label}</Text>
                  <Text style={st.intakeValue}>{String(sol.contexto[k])}</Text>
                </View>
              ))}
            </View>
          )}

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
            renderItem={({ item }) => {
              if (item.emisor === 'sistema') {
                return <View style={st.sysWrap}><Text style={st.sysT}>{item.texto}</Text></View>;
              }
              const mine = item.emisor === 'medico';
              if (item.tipo === 'imagen' && item.adjunto) {
                const uri = adjuntoUrl(id, item.adjunto, token);
                return (
                  <View style={{ alignItems: mine ? 'flex-end' : 'flex-start' }}>
                    <ChatImage uri={uri} onPress={() => setViewer(uri)} />
                  </View>
                );
              }
              return (
                <View style={[st.msg, mine ? st.mine : st.theirs]}>
                  <Text style={mine ? st.msgTmine : st.msgT}>{item.texto}</Text>
                </View>
              );
            }}
          />

          {sol.estado === 'buscando' && (
            <TouchableOpacity style={st.accept} onPress={() => aceptar.mutate()} disabled={aceptar.isPending} activeOpacity={0.85}>
              {aceptar.isPending ? <ActivityIndicator color="#fff" /> : <Text style={st.acceptT}>Aceptar y atender</Text>}
            </TouchableOpacity>
          )}

          {puedeChatear && (
            <>
              <Text style={st.disc}>Teleorientación: orientación general, sin diagnóstico ni fórmula. Ante señales de alarma, deriva a urgencias.</Text>
              <View style={st.inputRow}>
                <TouchableOpacity style={st.tool} onPress={() => setPlantillasOpen(true)}><Text style={st.toolT}>＋</Text></TouchableOpacity>
                <TouchableOpacity style={st.tool} onPress={elegirImagen} disabled={adjuntar.isPending}>
                  {adjuntar.isPending ? <ActivityIndicator color={COLORS.tealD} /> : <Text style={st.toolT}>📷</Text>}
                </TouchableOpacity>
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
              {sol.estado === 'asignada' && (
                <Text style={st.finishHint}>Responde al paciente antes de finalizar (si cierras sin atender, se le reembolsa y no hay pago).</Text>
              )}
              <View style={st.actionsRow}>
                <TouchableOpacity style={st.derivar} onPress={confirmarDerivar} disabled={derivar.isPending} activeOpacity={0.85}>
                  {derivar.isPending ? <ActivityIndicator color="#B4231B" /> : <Text style={st.derivarT}>Derivar a urgencias</Text>}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[st.finish, sol.estado !== 'respondida' && st.finishDisabled]}
                  onPress={confirmarFinalizar}
                  disabled={finalizar.isPending || sol.estado !== 'respondida'}
                  activeOpacity={0.85}
                >
                  {finalizar.isPending ? <ActivityIndicator color={COLORS.tealD} /> : <Text style={st.finishT}>Finalizar</Text>}
                </TouchableOpacity>
              </View>
            </>
          )}

          {sol.estado === 'cerrada' && <Text style={st.closed}>Esta orientación fue cerrada.</Text>}
        </>
      )}

      {/* Plantillas */}
      <Modal visible={plantillasOpen} transparent animationType="slide" onRequestClose={() => setPlantillasOpen(false)}>
        <TouchableOpacity style={st.modalBg} activeOpacity={1} onPress={() => setPlantillasOpen(false)}>
          <View style={st.sheet}>
            <Text style={st.sheetTitle}>Respuestas rápidas</Text>
            <ScrollView>
              {PLANTILLAS.map((p, i) => (
                <TouchableOpacity key={i} style={st.plantilla} onPress={() => usarPlantilla(p.x)} activeOpacity={0.7}>
                  <Text style={st.plantillaT}>{p.t}</Text>
                  <Text style={st.plantillaX} numberOfLines={2}>{p.x}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Preview + confirmación antes de enviar la imagen */}
      <Modal visible={!!pendingImg} transparent animationType="slide" onRequestClose={() => setPendingImg(null)}>
        <View style={st.previewBg}>
          <View style={st.previewCard}>
            <Text style={st.previewTitle}>Enviar imagen</Text>
            {pendingImg && <Image source={{ uri: pendingImg.uri }} style={st.previewImg} resizeMode="contain" />}
            <View style={st.previewActions}>
              <TouchableOpacity style={st.previewCancel} onPress={() => setPendingImg(null)} disabled={adjuntar.isPending}>
                <Text style={st.previewCancelT}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={st.previewSend} onPress={() => adjuntar.mutate(pendingImg)} disabled={adjuntar.isPending}>
                {adjuntar.isPending ? <ActivityIndicator color="#fff" /> : <Text style={st.previewSendT}>Enviar</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Visor de imagen a pantalla completa */}
      <Modal visible={!!viewer} transparent animationType="fade" onRequestClose={() => setViewer(null)}>
        <TouchableOpacity style={st.viewerBg} activeOpacity={1} onPress={() => setViewer(null)}>
          {viewer && <Image source={{ uri: viewer }} style={st.viewerImg} resizeMode="contain" />}
        </TouchableOpacity>
      </Modal>
    </KeyboardAvoidingView>
  );
}

// Miniatura de imagen del chat con estado de error (evita el recuadro gris mudo).
function ChatImage({ uri, onPress }) {
  const [err, setErr] = useState(false);
  return (
    <TouchableOpacity style={st.imgBubble} onPress={onPress} activeOpacity={0.9}>
      {err ? (
        <View style={[st.thumb, st.thumbErr]}><Text style={st.thumbErrT}>No se pudo cargar la imagen</Text></View>
      ) : (
        <Image source={{ uri }} style={st.thumb} onError={() => setErr(true)} />
      )}
    </TouchableOpacity>
  );
}

const st = StyleSheet.create({
  c: { flex: 1, backgroundColor: COLORS.bg },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingBottom: 6 },
  badge: { backgroundColor: 'rgba(0,166,156,0.12)', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999 },
  badgeT: { color: COLORS.tealD, fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  estado: { color: COLORS.ink2, fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  pregunta: { fontSize: 16, color: COLORS.ink, paddingHorizontal: 16, paddingBottom: 10, lineHeight: 22 },
  intake: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, paddingBottom: 12 },
  intakeItem: { backgroundColor: '#fff', borderWidth: 1, borderColor: COLORS.line, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  intakeLabel: { fontSize: 10, color: COLORS.ink2, fontWeight: '700', textTransform: 'uppercase' },
  intakeValue: { fontSize: 14, color: COLORS.ink, fontWeight: '600' },
  info: { textAlign: 'center', color: COLORS.ink2, marginTop: 30 },
  msg: { maxWidth: '82%', padding: 12, borderRadius: 14, marginBottom: 10 },
  mine: { alignSelf: 'flex-end', backgroundColor: COLORS.teal, borderBottomRightRadius: 4 },
  theirs: { alignSelf: 'flex-start', backgroundColor: '#fff', borderWidth: 1, borderColor: COLORS.line, borderBottomLeftRadius: 4 },
  msgT: { color: COLORS.ink, fontSize: 15 },
  msgTmine: { color: '#fff', fontSize: 15 },
  imgBubble: { marginBottom: 10, borderRadius: 14, overflow: 'hidden' },
  thumb: { width: 200, height: 200, borderRadius: 14, backgroundColor: '#E2E8F0' },
  thumbErr: { alignItems: 'center', justifyContent: 'center', padding: 10 },
  thumbErrT: { color: COLORS.ink2, fontSize: 12, fontWeight: '700', textAlign: 'center' },
  sysWrap: { alignSelf: 'center', maxWidth: '92%', backgroundColor: '#FDECEC', borderWidth: 1, borderColor: '#E5534B', borderRadius: 12, padding: 10, marginBottom: 10 },
  sysT: { color: '#B4231B', fontSize: 13, fontWeight: '700', textAlign: 'center' },
  accept: { backgroundColor: COLORS.teal, margin: 16, padding: 16, borderRadius: 14, alignItems: 'center' },
  acceptT: { color: '#fff', fontWeight: '800', fontSize: 16 },
  disc: { fontSize: 11, color: COLORS.ink2, paddingHorizontal: 16, paddingBottom: 6 },
  inputRow: { flexDirection: 'row', padding: 12, gap: 6, backgroundColor: '#fff', borderTopWidth: 1, borderColor: COLORS.line, alignItems: 'flex-end' },
  tool: { width: 42, height: 42, borderRadius: 12, backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center' },
  toolT: { fontSize: 20, color: COLORS.tealD, fontWeight: '800' },
  in: { flex: 1, backgroundColor: COLORS.bg, borderRadius: 12, padding: 12, fontSize: 15, maxHeight: 100 },
  send: { backgroundColor: COLORS.navy, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12 },
  sendT: { color: '#fff', fontWeight: '800' },
  actionsRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 12, paddingBottom: 12 },
  derivar: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 12, borderWidth: 1.5, borderColor: '#E5534B' },
  derivarT: { color: '#B4231B', fontWeight: '800', fontSize: 14 },
  finish: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 12, borderWidth: 1.5, borderColor: COLORS.teal },
  finishDisabled: { opacity: 0.4 },
  finishT: { color: COLORS.tealD, fontWeight: '800', fontSize: 14 },
  finishHint: { fontSize: 11, color: '#92400E', paddingHorizontal: 16, paddingBottom: 6 },
  closed: { textAlign: 'center', color: COLORS.ink2, padding: 16 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, maxHeight: '70%' },
  sheetTitle: { fontSize: 16, fontWeight: '800', color: COLORS.ink, marginBottom: 12 },
  plantilla: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.line },
  plantillaT: { fontSize: 14, fontWeight: '800', color: COLORS.tealD },
  plantillaX: { fontSize: 13, color: COLORS.ink2, marginTop: 2 },
  viewerBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', alignItems: 'center', justifyContent: 'center' },
  viewerImg: { width: '100%', height: '80%' },
  previewBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
  previewCard: { backgroundColor: '#fff', borderRadius: 18, padding: 16 },
  previewTitle: { fontSize: 16, fontWeight: '800', color: COLORS.ink, marginBottom: 12 },
  previewImg: { width: '100%', height: 320, borderRadius: 12, backgroundColor: '#E2E8F0' },
  previewActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  previewCancel: { flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: 12, borderWidth: 1.5, borderColor: COLORS.line },
  previewCancelT: { color: COLORS.ink2, fontWeight: '800' },
  previewSend: { flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: 12, backgroundColor: COLORS.teal },
  previewSendT: { color: '#fff', fontWeight: '800' },
});
