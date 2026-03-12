import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { supabase } from '@/lib/supabaseClient';

type SchoolRow = {
  name:    string | null;
  address: string | null;
  phone:   string | null;
  email:   string | null;
};

type Props = { schoolId: string };

export default function SchoolInfoCard({ schoolId }: Props) {
  const tint    = useThemeColor({}, 'tint');
  const surface = useThemeColor({}, 'surface');
  const muted   = useThemeColor({}, 'mutedText');
  const border  = useThemeColor({}, 'border');
  const text    = useThemeColor({}, 'text');

  const [school,  setSchool]  = useState<SchoolRow | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('schools')
        .select('name, address, phone, email')
        .eq('id', schoolId)
        .maybeSingle<SchoolRow>();
      if (!alive) return;
      if (!error && data) setSchool(data);
      setLoading(false);
    };
    load();
    return () => { alive = false; };
  }, [schoolId]);

  const fields: { label: string; value: string | null }[] = [
    { label: 'Διεύθυνση', value: school?.address ?? null },
    { label: 'Τηλέφωνο',  value: school?.phone   ?? null },
    { label: 'Email',     value: school?.email    ?? null },
  ];

  return (
    <ThemedView style={[styles.card, { backgroundColor: surface, borderColor: border }]}>

      {/* ── Header row ── */}
      <View style={styles.header}>
        <View style={[styles.dot, { backgroundColor: tint }]} />
        <ThemedText style={[styles.name, { color: text }]} numberOfLines={1}>
          {loading ? '…' : (school?.name ?? '—')}
        </ThemedText>
        <ThemedText style={[styles.badge, { color: tint, borderColor: tint + '40' }]}>
          Σχολείο
        </ThemedText>
      </View>

      {/* ── Fields ── */}
      {loading ? (
        <ActivityIndicator color={tint} size="small" style={styles.loader} />
      ) : (
        <View style={[styles.fields, { borderTopColor: border }]}>
          {fields.map(({ label, value }) => (
            <View key={label} style={styles.fieldRow}>
              <ThemedText style={[styles.fieldLabel, { color: muted }]}>{label}</ThemedText>
              <ThemedText
                style={[styles.fieldValue, { color: value ? text : muted }]}
                numberOfLines={1}
              >
                {value || '—'}
              </ThemedText>
            </View>
          ))}
        </View>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: Spacing.lg,
    marginTop:        Spacing.md,
    borderRadius:     Radius.xl,
    borderWidth:      1,
    overflow:         'hidden',
  },

  // Header
  header: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical:   12,
  },
  dot: {
    width:        6,
    height:       6,
    borderRadius: 3,
  },
  name: {
    flex:          1,
    fontSize:      14,
    fontWeight:    '700',
    letterSpacing: -0.2,
  },
  badge: {
    fontSize:          10,
    fontWeight:        '600',
    textTransform:     'uppercase',
    letterSpacing:     0.6,
    borderWidth:       1,
    borderRadius:      999,
    paddingHorizontal: 8,
    paddingVertical:   2,
  },

  loader: { paddingVertical: Spacing.md },

  // Fields
  fields: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.md,
    paddingTop:     8,
    paddingBottom:  12,
    gap:            6,
  },
  fieldRow: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
    gap:            Spacing.sm,
  },
  fieldLabel: {
    fontSize:   12,
    fontWeight: '500',
    flexShrink: 0,
  },
  fieldValue: {
    fontSize:   12,
    fontWeight: '400',
    flexShrink: 1,
    textAlign:  'right',
  },
});