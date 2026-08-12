import { useState } from 'react';
import {
  Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../src/store/auth';
import { COLORS } from '../../src/config';

export default function Login() {
  const login = useAuth((s) => s.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const onSubmit = async () => {
    if (!email || !password) return;
    setBusy(true);
    try {
      await login(email.trim(), password);
    } catch (e) {
      Alert.alert('No pudimos ingresar', e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={st.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={st.c}>
        <Text style={st.brand}>NexaSalud</Text>
        <Text style={st.sub}>App Profesional</Text>
        <Text style={st.hint}>Teleorientación médica</Text>

        <TextInput
          style={st.in} placeholder="Correo" placeholderTextColor="#94A3B8"
          autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail}
        />
        <TextInput
          style={st.in} placeholder="Contraseña" placeholderTextColor="#94A3B8"
          secureTextEntry value={password} onChangeText={setPassword}
        />
        <TouchableOpacity style={st.btn} onPress={onSubmit} disabled={busy} activeOpacity={0.85}>
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={st.btnT}>Ingresar</Text>}
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.navy },
  c: { flex: 1, justifyContent: 'center', padding: 28 },
  brand: { fontSize: 34, fontWeight: '800', color: '#fff', textAlign: 'center' },
  sub: { fontSize: 18, fontWeight: '700', color: COLORS.teal, textAlign: 'center', marginTop: 2 },
  hint: { fontSize: 13, color: '#94A3B8', textAlign: 'center', marginTop: 6, marginBottom: 34 },
  in: { backgroundColor: '#fff', borderRadius: 12, padding: 15, fontSize: 16, marginBottom: 12 },
  btn: { backgroundColor: COLORS.teal, borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8 },
  btnT: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
