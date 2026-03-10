import { LogOut } from 'lucide-react-native';
import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';

import NextSessionCard from '@/components/home/NextSessionCard';
import { useAuth } from '@/context/AuthContext';

export default function HomeScreen() {
  const bg = useThemeColor({}, 'background');
  const border = useThemeColor({}, 'border');
  const icon = useThemeColor({}, 'icon');

  const { signOut } = useAuth();

  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = () => {
    if (loggingOut) return;

    Alert.alert(
      'Αποσύνδεση',
      'Θέλεις σίγουρα να αποσυνδεθείς;',
      [
        { text: 'Ακύρωση', style: 'cancel' },
        {
          text: 'Αποσύνδεση',
          style: 'destructive',
          onPress: async () => {
            setLoggingOut(true);
            try {
              await signOut(); // ✅ provider handles redirect
            } catch (e) {
              console.error('Logout error:', e);
              Alert.alert('Σφάλμα', 'Δεν έγινε αποσύνδεση. Δοκίμασε ξανά.');
            } finally {
              setLoggingOut(false);
            }
          },
        },
      ],
      { cancelable: true },
    );
  };

  return (
    <ThemedView style={[styles.screen, { backgroundColor: bg }]}>
      {/* top-right logout (no header) */}
      <View style={styles.topRow}>
        <View style={{ flex: 1 }} />
        <Pressable
          onPress={handleLogout}
          disabled={loggingOut}
          style={[
            styles.iconBtn,
            { borderColor: border, opacity: loggingOut ? 0.5 : 1 },
          ]}
        >
          <LogOut size={20} color={icon} />
        </Pressable>
      </View>

      {/* Next session */}
      <NextSessionCard />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: Spacing.lg },

  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },

  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
