// components/profile/InfoRow.tsx
import {
  CalendarDays,
  Euro,
  Flag,
  GraduationCap,
  Mail,
  Package,
  Phone,
  Play,
  Users,
} from 'lucide-react-native';
import type { ReactNode } from 'react';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';

type IconName =
  | 'mail' | 'phone' | 'calendar'
  | 'level' | 'class'
  | 'package' | 'price' | 'start' | 'end';

type Props = {
  label: string;
  value: string;
  last?: boolean;
  icon?: IconName;
};

function RowIcon({ icon, color }: { icon: IconName; color: string }) {
  const s = 15;
  const w = 2;
  switch (icon) {
    case 'mail':     return <Mail          size={s} color={color} strokeWidth={w} />;
    case 'phone':    return <Phone         size={s} color={color} strokeWidth={w} />;
    case 'calendar': return <CalendarDays  size={s} color={color} strokeWidth={w} />;
    case 'level':    return <GraduationCap size={s} color={color} strokeWidth={w} />;
    case 'class':    return <Users         size={s} color={color} strokeWidth={w} />;
    case 'package':  return <Package       size={s} color={color} strokeWidth={w} />;
    case 'price':    return <Euro          size={s} color={color} strokeWidth={w} />;
    case 'start':    return <Play          size={s} color={color} strokeWidth={w} />;
    case 'end':      return <Flag          size={s} color={color} strokeWidth={w} />;
    default:         return null as unknown as ReactNode;
  }
}

export default function InfoRow({ label, value, last, icon }: Props) {
  const border = useThemeColor({}, 'border');
  const muted  = useThemeColor({}, 'mutedText');
  const text   = useThemeColor({}, 'text');

  return (
    <View
      style={[
        styles.row,
        !last && { borderBottomColor: border, borderBottomWidth: StyleSheet.hairlineWidth },
      ]}
    >
      {/* Left: icon + label */}
      <View style={styles.left}>
        {icon && (
          <View style={styles.iconWrap}>
            <RowIcon icon={icon} color={muted} />
          </View>
        )}
        <ThemedText style={[styles.label, { color: muted }]} numberOfLines={1}>
          {label}
        </ThemedText>
      </View>

      {/* Right: value */}
      <ThemedText style={[styles.value, { color: text }]} numberOfLines={1}>
        {value}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    paddingVertical: 11,
    gap:            Spacing.sm,
  },
  left: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           8,
    flexShrink:    1,
    paddingRight:  Spacing.sm,
  },
  iconWrap: {
    width:          22,
    alignItems:     'center',
    justifyContent: 'center',
    flexShrink:     0,
  },
  label: {
    fontSize:   12,
    fontWeight: '500',
  },
  value: {
    fontSize:   13,
    fontWeight: '700',
    textAlign:  'right',
    flexShrink: 0,
  },
});