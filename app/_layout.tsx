// app/_layout.tsx
import { ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';
import { AuthProvider } from '@/context/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const scheme      = colorScheme ?? 'light';
  const C           = Colors[scheme];

  const navTheme = {
    dark: scheme === 'dark',
    colors: {
      primary:      C.tint,
      background:   C.background,
      card:         C.surface,       // header / modal cards match surface
      text:         C.text,
      border:       C.border,
      notification: C.tint,
    },
    fonts: {} as any,
  };

  return (
    <SafeAreaProvider>
      <ThemeProvider value={navTheme as any}>
        <SafeAreaView
          style={{ flex: 1, backgroundColor: C.background }}
          edges={['top', 'left', 'right']}
        >
          <AuthProvider>
            <Stack
              screenOptions={{
                // Shared defaults for all pushed screens
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
          </AuthProvider>
        </SafeAreaView>
        <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}