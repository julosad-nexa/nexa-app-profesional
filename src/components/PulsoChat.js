import { View, Text, StyleSheet } from 'react-native';

/**
 * La línea de «quién está ahí», justo encima de donde se escribe.
 *
 * Va aquí y no en la cabecera porque es donde está el ojo: quien acaba de
 * mandar un mensaje y espera respuesta mira el teclado, no el título.
 *
 * ── QUÉ SE DICE Y QUÉ NO ─────────────────────────────────────────────────────
 * Tres estados y ninguno más. «Escribiendo» solo mientras es verdad —el
 * servidor lo caduca a los 6 s— porque un indicador que se queda pegado hace
 * esperar un mensaje que no viene. «En línea» cuando hay señal reciente. Y
 * cuando no la hay, **la última vez que estuvo**, que es lo que de verdad
 * calma: lo que angustia al paciente no es no saber si el otro teclea, sino no
 * saber si hay alguien al otro lado.
 *
 * Si no sabemos nada (Redis caído, o nunca abrió el hilo) no se pinta nada. Un
 * hueco es honesto; «desconectado» sería una afirmación que no podemos hacer.
 */

function haceTexto(seg) {
  if (seg == null) return null;
  if (seg < 60)    return 'hace un momento';
  const min = Math.round(seg / 60);
  if (min < 60)    return `hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24)      return `hace ${h} h`;
  return null;   // más de un día: ya no es presencia, es historia
}

export default function PulsoChat({ latido, nombre, visible = true }) {
  if (!visible || !latido) return null;

  const quien = nombre || 'La otra persona';

  if (latido.escribiendo) {
    return (
      <View style={s.fila}>
        <View style={[s.punto, s.puntoVerde]} />
        <Text style={[s.texto, s.escribiendo]}>{quien} está escribiendo…</Text>
      </View>
    );
  }

  if (latido.otro?.enLinea) {
    return (
      <View style={s.fila}>
        <View style={[s.punto, s.puntoVerde]} />
        <Text style={s.texto}>En línea</Text>
      </View>
    );
  }

  const hace = haceTexto(latido.otro?.hace);
  if (!hace) return null;

  return (
    <View style={s.fila}>
      <View style={[s.punto, s.puntoGris]} />
      <Text style={s.texto}>Estuvo {hace}</Text>
    </View>
  );
}

// Colores literales a proposito: este componente es el MISMO en las dos apps y
// sus paletas no tienen los mismos tokens (el profesional no define `ink3`).
// Un token que falta no avisa, se evalua a `undefined` y pinta lo que le parece.
const GRIS  = '#94A3B8';
const GRIS2 = '#64748B';
const VERDE = '#2DB47C';

const s = StyleSheet.create({
  fila:  { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 4, gap: 6 },
  punto: { width: 7, height: 7, borderRadius: 4 },
  puntoVerde: { backgroundColor: VERDE },
  puntoGris:  { backgroundColor: GRIS },
  texto: { fontSize: 12, color: GRIS },
  escribiendo: { fontStyle: 'italic', color: GRIS2 },
});
