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
  const surface = useThemeColor({}, 'surface');
  const muted   = useThemeColor({}, 'mutedText');
  const border  = useThemeColor({}, 'border');

  const initials = getInitials(fullName);

  return (
    <View style={[styles.container, { backgroundColor: surface, borderBottomColor: border }]}>
      {/* Avatar */}
      <View style={[styles.avatarRing, { borderColor: tint + '35' }]}>
        <View style={[styles.avatar, { backgroundColor: tint + '14' }]}>
          <ThemedText style={[styles.initials, { color: tint }]}>
            {initials}
          </ThemedText>
        </View>
      </View>

      {/* Name + role */}
      <View style={styles.textBlock}>
        <View style={[styles.rolePill, { backgroundColor: tint + '12', borderColor: tint + '25' }]}>
          <ThemedText style={[styles.roleText, { color: tint }]}>ΜΑΘΗΤΗΣ</ThemedText>
        </View>
        <ThemedText style={styles.name} numberOfLines={2}>
          {fullName}
        </ThemedText>
        <ThemedText style={[styles.nameSub, { color: muted }]}>
          Λογαριασμός μαθητή
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               Spacing.lg,
    paddingHorizontal: Spacing.lg,
    paddingTop:        Spacing.xl,
    paddingBottom:     Spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom:      Spacing.sm,
  },

  avatarRing: {
    width:          70,
    height:         70,
    borderRadius:   35,
    borderWidth:    1.5,
    alignItems:     'center',
    justifyContent: 'center',
    padding:        3,
    flexShrink:     0,
  },
  avatar: {
    width:          60,
    height:         60,
    borderRadius:   30,
    alignItems:     'center',
    justifyContent: 'center',
  },
  initials: {
    fontSize:      22,
    fontWeight:    '800',
    letterSpacing: 0.5,
  },

  textBlock: {
    flex: 1,
    gap:  5,
  },
  rolePill: {
    alignSelf:         'flex-start',
    paddingHorizontal: 8,
    paddingVertical:   3,
    borderRadius:      999,
    borderWidth:       1,
  },
  roleText: {
    fontSize:      9,
    fontWeight:    '700',
    letterSpacing: 1.4,
  },
  name: {
    fontSize:      19,
    fontWeight:    '800',
    lineHeight:    25,
    letterSpacing: -0.3,
  },
  nameSub: {
    fontSize:   11,
    fontWeight: '400',
  },
});