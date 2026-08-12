import { Stack } from 'expo-router';
import { COLORS } from '../../src/config';

export default function AppLayout() {
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
