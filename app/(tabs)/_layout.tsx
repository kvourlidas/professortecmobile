import { Tabs } from 'expo-router';
import { CalendarDays, Home, TrendingUp, User } from 'lucide-react-native';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Αρχική',
          tabBarIcon: ({ color }) => <Home size={24} color={color} />,
        }}
      />

      <Tabs.Screen
        name="schedule"
        options={{
          title: 'Πρόγραμμα',
          tabBarIcon: ({ color }) => <CalendarDays size={24} color={color} />,
        }}
      />

      <Tabs.Screen
        name="progress"
        options={{
          title: 'Πρόοδος',
          tabBarIcon: ({ color }) => <TrendingUp size={24} color={color} />,
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: 'Προφίλ',
          tabBarIcon: ({ color }) => <User size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}
