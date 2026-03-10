// app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router';
import { CalendarDays, Home, TrendingUp, User } from 'lucide-react-native';
import React from 'react';
import { Platform, StyleSheet } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const colorScheme = useColorScheme() ?? 'light';
  const C = Colors[colorScheme];

  return (
    <Tabs
      screenOptions={{
        headerShown:           false,
        tabBarButton:          HapticTab,
        tabBarActiveTintColor: C.tint,
        tabBarInactiveTintColor: C.tabIconDefault,

        tabBarStyle: {
          backgroundColor: C.surface,
          borderTopColor:  C.border,
          borderTopWidth:  StyleSheet.hairlineWidth,
          height:          Platform.select({ ios: 84, android: 64, default: 64 }),
          paddingBottom:   Platform.select({ ios: 24, android: 8, default: 8 }),
          paddingTop:      8,
          // subtle shadow lifting it off the screen
          shadowColor:   '#000',
          shadowOpacity: colorScheme === 'dark' ? 0.35 : 0.08,
          shadowRadius:  16,
          shadowOffset:  { width: 0, height: -4 },
          elevation:     12,
        },

        tabBarLabelStyle: {
          fontSize:      10,
          fontWeight:    '600',
          letterSpacing: 0.3,
          marginTop:     2,
        },

        tabBarIconStyle: {
          marginBottom: -2,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Αρχική',
          tabBarIcon: ({ color, size }) => (
            <Home size={size ?? 22} color={color} strokeWidth={2} />
          ),
        }}
      />
      <Tabs.Screen
        name="schedule"
        options={{
          title: 'Πρόγραμμα',
          tabBarIcon: ({ color, size }) => (
            <CalendarDays size={size ?? 22} color={color} strokeWidth={2} />
          ),
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: 'Πρόοδος',
          tabBarIcon: ({ color, size }) => (
            <TrendingUp size={size ?? 22} color={color} strokeWidth={2} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Προφίλ',
          tabBarIcon: ({ color, size }) => (
            <User size={size ?? 22} color={color} strokeWidth={2} />
          ),
        }}
      />
    </Tabs>
  );
}