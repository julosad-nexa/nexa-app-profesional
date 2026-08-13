import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuth } from '../src/store/auth';
import OfflineBanner from '../src/components/OfflineBanner';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

function AuthGate({ children }) {
  const { token, loading, hydrate } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => { hydrate(); }, []);

  useEffect(() => {
    if (loading) return;
    const inAuth = segments[0] === '(auth)';
    if (!token && !inAuth) router.replace('/login');
    else if (token && inAuth) router.replace('/');
  }, [token, loading, segments]);

  return children;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="light" />
        <AuthGate>
          <Stack screenOptions={{ headerShown: false }} />
        </AuthGate>
        <OfflineBanner />
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
