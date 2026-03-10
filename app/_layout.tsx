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
  const scheme = colorScheme ?? 'light';

  const navTheme = {
    dark: scheme === 'dark',
    colors: {
      primary: Colors[scheme].tint,
      background: Colors[scheme].background,
      card: Colors[scheme].background,
      text: Colors[scheme].text,
      border: 'transparent',
      notification: Colors[scheme].tint,
    },
    fonts: {} as any,
  };

  return (
    <SafeAreaProvider>
      <ThemeProvider value={navTheme as any}>
        <SafeAreaView
          style={{ flex: 1, backgroundColor: Colors[scheme].background }}
          edges={['top', 'left', 'right']}
        >
          <AuthProvider>
            <Stack>
              <Stack.Screen name="(auth)" options={{ headerShown: false }} />
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            </Stack>
          </AuthProvider>
        </SafeAreaView>

        <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
