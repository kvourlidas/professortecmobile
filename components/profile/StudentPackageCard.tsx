// components/profile/StudentPackageCard.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/Card';
import { Radius, Spacing } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { supabase } from '@/lib/supabaseClient';

import InfoRow from './InfoRow';

type SubscriptionWithTotalsRow = {
  id:           string;
  student_id:   string;
  school_id:    string;
  package_name: string;
  price:        number;
  currency:     string | null;
  starts_on:    string | null;
  ends_on:      string | null;
  status:       string;
  balance:      number | null;
};

type Props = {
  studentId: string;
  schoolId:  string;
};

function formatDateGR(isoDate: string | null | undefined) {
  if (!isoDate) return '—';
  const [y, m, d] = isoDate.split('-');
  if (!y || !m || !d) return '—';
  return `${d}/${m}/${y}`;
}

function isExpired(status: string, endsOn: string | null) {
  if (status !== 'active') return true;
  if (!endsOn) return false;
  const now = new Date();
  const todayISO = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  return endsOn < todayISO;
}

export default function StudentPackageCard({ studentId, schoolId }: Props) {
  const text    = useThemeColor({}, 'text');
  const muted   = useThemeColor({}, 'mutedText');
  const tint    = useThemeColor({}, 'tint');
  const border  = useThemeColor({}, 'border');
  const surface = useThemeColor({}, 'surface');
  const bg      = useThemeColor({}, 'background');

  const [loading, setLoading] = useState(true);
  const [row,     setRow]     = useState<SubscriptionWithTotalsRow | null>(null);
  const [error,   setError]   = useState<string | null>(null);

  const load = async () => {
    setLoading(true); setError(null); setRow(null);
    const { data, error: qErr } = await supabase
      .from('student_subscriptions_with_totals')
      .select('id, student_id, school_id, package_name, price, currency, starts_on, ends_on, status, balance')
      .eq('student_id', studentId)
      .eq('school_id', schoolId)
      .order('status',    { ascending: true })
      .order('starts_on', { ascending: false })
      .limit(1)
      .maybeSingle<SubscriptionWithTotalsRow>();

    if (qErr) {
      console.error('StudentPackageCard: fetch error', qErr);
      setError('Αποτυχία φόρτωσης πακέτου.');
    } else {
      setRow(data ?? null);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (studentId && schoolId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId, schoolId]);

  const expired = useMemo(() => row ? isExpired(row.status, row.ends_on) : false, [row]);

  const owes = useMemo(() => {
    const v = Number(row?.balance ?? 0);
    return Number.isFinite(v) ? Math.max(0, v) : 0;
  }, [row?.balance]);

  // Semantic owe color
  const oweColor = useMemo(() => {
    if (owes === 0)   return '#22C55E'; // green  — settled
    if (owes < 50)    return '#FBBF24'; // amber  — small
    return '#F87171';                   // red    — significant
  }, [owes]);

  const statusActive = !expired;
  const statusColor  = statusActive ? '#22C55E' : '#F87171';

  const priceText = useMemo(() =>
    row ? `${Number(row.price ?? 0).toFixed(2)} ${row.currency ?? 'EUR'}` : '—',
  [row]);

  return (
    <Card elevation="sm" style={styles.card}>
      {/* Header */}
      <View style={[styles.headerRow, { borderBottomColor: border }]}>
        <ThemedText style={[styles.cardTitle, { color: text }]}>Πακέτο & Οφειλή</ThemedText>

        <View style={[
          styles.statusPill,
          { backgroundColor: statusColor + '15', borderColor: statusColor + '40' },
        ]}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <ThemedText style={[styles.statusText, { color: statusColor }]}>
            {statusActive ? 'Ενεργό' : 'Ληγμένο'}
          </ThemedText>
        </View>
      </View>

      {/* Body */}
      <View style={styles.content}>
        {loading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={tint} size="small" />
            <ThemedText style={[styles.mutedText, { color: muted }]}>Φόρτωση…</ThemedText>
          </View>
        ) : error ? (
          <View style={[styles.errorBox, { borderColor: '#F87171' + '40', backgroundColor: '#F87171' + '10' }]}>
            <ThemedText style={styles.errorText}>{error}</ThemedText>
          </View>
        ) : !row ? (
          <ThemedText style={[styles.mutedText, { color: muted }]}>
            Δεν υπάρχει ενεργή/καταχωρημένη συνδρομή.
          </ThemedText>
        ) : (
          <>
            <InfoRow icon="package"  label="Πακέτο"  value={row.package_name}          />
            <InfoRow icon="price"    label="Τιμή"     value={priceText}                 />
            <InfoRow icon="start"    label="Έναρξη"   value={formatDateGR(row.starts_on)} />
            <InfoRow icon="end"      label="Λήξη"     value={formatDateGR(row.ends_on)}   last />

            {/* Balance row */}
            <View style={[styles.oweStrip, { backgroundColor: oweColor + '10', borderColor: oweColor + '35' }]}>
              <View style={styles.oweLeft}>
                <View style={[styles.oweDot, { backgroundColor: oweColor }]} />
                <ThemedText style={[styles.oweLabel, { color: muted }]}>Οφειλή</ThemedText>
              </View>
              <ThemedText style={[styles.oweValue, { color: oweColor }]}>
                €{owes.toFixed(2)}
              </ThemedText>
            </View>
          </>
        )}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal:  Spacing.lg,
    marginBottom:      Spacing.md,
    paddingTop:        0,
    paddingBottom:     0,
    paddingHorizontal: 0,
    overflow:          'hidden',
  },

  headerRow: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    gap:               Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical:   Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  cardTitle: {
    fontSize:   14,
    fontWeight: '700',
  },

  statusPill: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               5,
    paddingHorizontal: 9,
    paddingVertical:   4,
    borderRadius:      999,
    borderWidth:       1,
  },
  statusDot: {
    width:        6,
    height:       6,
    borderRadius: 999,
  },
  statusText: {
    fontSize:   11,
    fontWeight: '700',
  },

  content: {
    paddingHorizontal: Spacing.lg,
    paddingBottom:     Spacing.md,
  },

  loadingRow: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            Spacing.sm,
    paddingVertical: Spacing.md,
  },
  mutedText: {
    fontSize:   13,
    fontWeight: '400',
    paddingVertical: Spacing.sm,
  },
  errorBox: {
    marginTop:    Spacing.sm,
    padding:      Spacing.md,
    borderRadius: Radius.lg,
    borderWidth:  1,
  },
  errorText: {
    fontSize:   13,
    fontWeight: '600',
    color:      '#F87171',
  },

  // ── Balance strip ─────────────────────────────────────────────────────────
  oweStrip: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    marginTop:      Spacing.md,
    borderRadius:   Radius.lg,
    borderWidth:    1,
    paddingVertical:   10,
    paddingHorizontal: Spacing.md,
  },
  oweLeft: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           7,
  },
  oweDot: {
    width:        7,
    height:       7,
    borderRadius: 999,
  },
  oweLabel: {
    fontSize:   12,
    fontWeight: '600',
  },
  oweValue: {
    fontSize:      17,
    fontWeight:    '800',
    letterSpacing: -0.3,
  },
});