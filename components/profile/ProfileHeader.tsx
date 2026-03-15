// components/profile/ProfileHeader.tsx
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { getInitials } from './profileUtils';

type Props = {
  fullName: string;
};

export default function ProfileHeader({ fullName }: Props) {
  const tint    = useThemeColor({}, 'tint');
  const muted   = useThemeColor({}, 'mutedText');
  const border  = useThemeColor({}, 'border');

  const initials = getInitials(fullName);

  return (
    <View style={[styles.container, { borderBottomColor: border }]}>
      {/* Avatar */}
      <View style={[styles.avatarRing, { borderColor: tint + '35' }]}>
        <View style={[styles.avatar, { backgroundColor: tint + '14' }]}>
          <ThemedText style={[styles.initials, { color: tint }]}>
            {initials}
          </ThemedText>
        </View>
      </View>

      {/* Name + role */}
      <View style={{ flex: 1, gap: 2 }}>
        <ThemedText style={styles.name} numberOfLines={1}>
          {fullName}
        </ThemedText>
        <ThemedText style={[styles.roleText, { color: muted }]}>
          Μαθητής
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical:   Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom:      Spacing.sm,
  },

  avatarRing: {
    width:          44,
    height:         44,
    borderRadius:   22,
    borderWidth:    1,
    alignItems:     'center',
    justifyContent: 'center',
    padding:        2,
    flexShrink:     0,
  },
  avatar: {
    width:          38,
    height:         38,
    borderRadius:   19,
    alignItems:     'center',
    justifyContent: 'center',
  },
  initials: {
    fontSize:      14,
    fontWeight:    '700',
    letterSpacing: 0.3,
  },

  name: {
    fontSize:      15,
    fontWeight:    '700',
    letterSpacing: -0.2,
  },
  roleText: {
    fontSize:   12,
    fontWeight: '400',
  },
});
