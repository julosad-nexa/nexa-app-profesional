import { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import NetInfo from '@react-native-community/netinfo';

// Banner superior que aparece cuando no hay conexión. Overlay (no empuja el layout).
export default function OfflineBanner() {
  const [offline, setOffline] = useState(false);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const unsub = NetInfo.addEventListener((s) => {
      setOffline(s.isConnected === false || s.isInternetReachable === false);
    });
    return () => unsub();
  }, []);

  if (!offline) return null;

  return (
    <View style={[st.bar, { paddingTop: insets.top + 6 }]} pointerEvents="none">
      <Text style={st.txt}>Sin conexión — reintentando…</Text>
    </View>
  );
}

const st = StyleSheet.create({
  bar: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 999,
    backgroundColor: '#B4231B', paddingBottom: 6, alignItems: 'center',
  },
  txt: { color: '#fff', fontSize: 13, fontWeight: '700' },
});
