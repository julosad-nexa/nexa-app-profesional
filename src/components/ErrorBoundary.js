import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { COLORS } from '../config';

/**
 * Pantalla de rescate cuando algo revienta al renderizar.
 *
 * ── POR QUÉ ──────────────────────────────────────────────────────────────────
 * Sin esto, un error de render dejaba la app **en blanco y sin salida**. En el
 * teléfono de un médico eso significa cerrarla, y si el fallo se repite al
 * arrancar, reinstalarla. Peor aún: si ocurre mientras está de turno, sigue
 * figurando disponible en el servidor hasta que caduque su TTL — un fantasma
 * más, creado por un fallo que nadie ve.
 *
 * Expo Router usa este componente automáticamente si se exporta como
 * `ErrorBoundary` desde un layout.
 *
 * El mensaje no intenta disimular: dice que algo falló, ofrece reintentar y
 * muestra el detalle técnico, porque quien lo va a leer primero somos nosotros
 * cuando el médico mande una captura.
 */
export function PantallaDeError({ error, retry }) {
  return (
    <View style={st.c}>
      <Text style={st.icono}>⚠️</Text>
      <Text style={st.titulo}>Algo se rompió</Text>
      <Text style={st.texto}>
        No pudimos mostrar esta pantalla. Puedes reintentar; si vuelve a pasar,
        cierra la app y ábrela de nuevo.
      </Text>

      <TouchableOpacity style={st.boton} onPress={retry} activeOpacity={0.85}>
        <Text style={st.botonT}>Reintentar</Text>
      </TouchableOpacity>

      {!!error?.message && (
        <ScrollView style={st.detalleWrap}>
          <Text style={st.detalleTitulo}>Detalle técnico</Text>
          <Text style={st.detalle}>{String(error.message)}</Text>
        </ScrollView>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  c: { flex: 1, backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center', padding: 28 },
  icono: { fontSize: 44, marginBottom: 12 },
  titulo: { fontSize: 20, fontWeight: '800', color: COLORS.navy, marginBottom: 8 },
  texto: { fontSize: 15, color: COLORS.ink2, textAlign: 'center', lineHeight: 22, marginBottom: 22 },
  boton: { backgroundColor: COLORS.teal, paddingVertical: 13, paddingHorizontal: 34, borderRadius: 10 },
  botonT: { color: '#fff', fontWeight: '800', fontSize: 15 },
  detalleWrap: { maxHeight: 120, marginTop: 26, alignSelf: 'stretch' },
  detalleTitulo: { fontSize: 11, fontWeight: '700', color: COLORS.ink2, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },
  detalle: { fontSize: 12, color: COLORS.ink2, fontFamily: 'monospace' },
});
