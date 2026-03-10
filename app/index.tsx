// app/index.tsx
import { useAuth } from '@/context/AuthContext';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';

export default function Index() {
  const { loading, session } = useAuth();

  useEffect(() => {
    if (loading) return;

    if (session) {
      router.replace('/(tabs)/home');
    } else {
      router.replace('/(auth)/login');
    }
  }, [loading, session]);

  // small loader to avoid "unmatched route" / flashing
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator />
    </View>
  );
}
