import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../config';

/**
 * A quién está atendiendo el médico.
 *
 * ── POR QUÉ ──────────────────────────────────────────────────────────────────
 * Hasta ahora la pantalla mostraba una categoría, un texto y nada más: el
 * profesional orientaba a un identificador. Edad y sexo cambian una orientación
 * —no se responde igual un dolor abdominal a los 19 que a los 78— y no tenerlos
 * delante obliga a preguntarlos, gastando los primeros mensajes en algo que la
 * plataforma ya sabe.
 *
 * ── NO ES UNA HISTORIA CLÍNICA ───────────────────────────────────────────────
 * Y no puede parecerlo. Teleorientación bajo la Res. 2654/2019 es orientación
 * general, sin diagnóstico: esto es contexto para orientar mejor, no un
 * expediente. Por eso van los datos demográficos que el propio socio registró
 * y ni uno solo de sus antecedentes clínicos, que viven en `ns_hc_*` y este
 * servicio no toca por diseño.
 *
 * El servidor solo la manda al médico ASIGNADO. Quien está ojeando el feed no
 * recibe nada que enseñar aquí.
 */
export default function FichaPaciente({ paciente }) {
  if (!paciente?.nombre) return null;

  const {
    nombre, edad, genero, tipo_sangre, ocupacion, ciudad, departamento,
    tipo_socio, orientaciones_previas,
  } = paciente;

  // Cada dato desaparece solo si falta. Un guion en su lugar solo enseñaría el
  // hueco, y un hueco en una ficha clínica invita a rellenarlo con suposiciones.
  const datos = [
    edad != null && ['Edad', `${edad} años`],
    genero && ['Sexo', capitalizar(genero)],
    tipo_sangre && ['Tipo de sangre', tipo_sangre],
    lugar(ciudad, departamento) && ['Ciudad', lugar(ciudad, departamento)],
    ocupacion && ['Ocupación', ocupacion],
    tipo_socio === 2 && ['Vínculo', 'Beneficiario del plan'],
    // Solo si ha consultado antes: un "0 previas" no aporta nada y ocupa sitio.
    orientaciones_previas > 0 && [
      'Consultas previas',
      `${orientaciones_previas} ${orientaciones_previas === 1 ? 'orientación' : 'orientaciones'}`,
    ],
  ].filter(Boolean);

  return (
    <View style={st.caja}>
      <Text style={st.encabezado}>PACIENTE</Text>
      <Text style={st.nombre}>{nombre}</Text>

      {datos.length > 0 && (
        <View style={st.rejilla}>
          {datos.map(([etiqueta, valor]) => (
            <View key={etiqueta} style={st.dato}>
              <Text style={st.etiqueta}>{etiqueta}</Text>
              <Text style={st.valor}>{valor}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const capitalizar = (t) => String(t).charAt(0).toUpperCase() + String(t).slice(1);
const lugar = (ciudad, departamento) =>
  [ciudad, departamento].filter(Boolean).join(', ') || null;

const st = StyleSheet.create({
  caja: {
    backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.line,
    borderRadius: 14, padding: 14, marginHorizontal: 16, marginBottom: 12,
  },
  encabezado: { fontSize: 10, fontWeight: '800', letterSpacing: 0.8, color: COLORS.ink2 },
  nombre:     { fontSize: 18, fontWeight: '800', color: COLORS.ink, marginTop: 4 },

  rejilla:  { flexDirection: 'row', flexWrap: 'wrap', marginTop: 12, rowGap: 10 },
  dato:     { minWidth: '33%', paddingRight: 10 },
  etiqueta: { fontSize: 10, color: COLORS.ink2, textTransform: 'uppercase', letterSpacing: 0.4 },
  valor:    { fontSize: 14, fontWeight: '700', color: COLORS.ink, marginTop: 2 },
});
