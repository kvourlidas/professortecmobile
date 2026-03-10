// app/index.tsx
import { Colors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';

export default function Index() {
  const { loading, session } = useAuth();
  const scheme = useColorScheme() ?? 'light';
  const C      = Colors[scheme];

  useEffect(() => {
    if (loading) return;
    if (session) {
      router.replace('/(tabs)/home');
    } else {
      router.replace('/(auth)/login');
    }
  }, [loading, session]);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.background }}>
      <ActivityIndicator color={C.tint} size="large" />
    </View>
  );
}