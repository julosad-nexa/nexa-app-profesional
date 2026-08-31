import { Stack } from 'expo-router';
import { COLORS } from '../../src/config';
import { useVigilanciaSolicitudes } from '../../src/lib/vigilancia';

export default function AppLayout() {
  // Vive aquí y no en la pantalla del feed: así el médico se entera de una
  // solicitud nueva aunque esté mirando su historial o su perfil. Antes la
  // alerta solo existía dentro del feed, y fuera de esa pantalla no sonaba nada.
  useVigilanciaSolicitudes();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.navy },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '800' },
        contentStyle: { backgroundColor: COLORS.bg },
      }}
    />
  );
}
