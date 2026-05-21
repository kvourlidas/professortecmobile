// app/_layout.tsx
import { ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { usePushNotifications } from '@/hooks/use-push-notifications';
import { supabase } from '@/lib/supabaseClient';

export const unstable_settings = {
  anchor: '(tabs)',
};

// Only mounted after the user is authenticated — prevents the push-permission
// dialog from racing with auth session initialisation and causing RPC failures.
function PushNotificationRegistrar({ userId }: { userId: string }) {
  const { expoPushToken } = usePushNotifications();

  useEffect(() => {
    if (!expoPushToken) return;
    (async () => {
      await supabase.rpc('update_my_push_token', { p_token: expoPushToken });
    })();
  }, [userId, expoPushToken]);

  return null;
}

function AppContent() {
  const { user } = useAuth();
  const colorScheme = useColorScheme();
  const scheme      = colorScheme ?? 'light';
  const C           = Colors[scheme];

  const navTheme = {
    dark: scheme === 'dark',
    colors: {
      primary:      C.tint,
      background:   C.background,
      card:         C.surface,
      text:         C.text,
      border:       C.border,
      notification: C.tint,
    },
    fonts: {} as any,
  };

  return (
    <ThemeProvider value={navTheme as any}>
      {user && <PushNotificationRegistrar userId={user.id} />}
      <SafeAreaView
        style={{ flex: 1, backgroundColor: C.background }}
        edges={['top', 'left', 'right']}
      >
        <Stack
          screenOptions={{
            headerStyle:      { backgroundColor: C.surface },
            headerTintColor:  C.tint,
            headerTitleStyle: { color: C.text, fontWeight: '700', fontSize: 16 },
            headerShadowVisible: false,
            contentStyle:     { backgroundColor: C.background },
          }}
        >
          <Stack.Screen name="(auth)"          options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)"          options={{ headerShown: false }} />
          <Stack.Screen name="notifications"   options={{ headerShown: false }} />
        </Stack>
      </SafeAreaView>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </SafeAreaProvider>
  );
}