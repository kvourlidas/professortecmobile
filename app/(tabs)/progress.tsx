// app/(tabs)/progress.tsx
import { useFocusEffect } from '@react-navigation/native';
import { BarChart3 } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import ProgressChart from '@/components/progress/ProgressChart';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useThemeColor } from '@/hooks/use-theme-color';
import { supabase } from '@/lib/supabaseClient';

type StudentTestGradeRow = {
  id: string; student_id: string; test_id: string;
  test_name: string | null; test_date: string | null;
  start_time: string | null; end_time: string | null;
  class_title: string | null; subject_id: string | null;
  subject_name: string | null; grade: number | null; graded_at: string | null;
};

type TabKey = 'overall' | 'by-subject';

function formatDate(value: string | null) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('el-GR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatDateShort(value: string | null) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('el-GR', { day: '2-digit', month: '2-digit' });
}

function formatTime(value: string | null) {
  if (!value) return '';
  return value.slice(0, 5);
}

function gradeColor(grade: number | null, tint: string): string {
  if (grade === null) return tint;
  if (grade >= 17) return '#22C55E';
  if (grade >= 13) return '#4F6EF7';
  if (grade >= 10) return '#FBBF24';
  return '#F87171';
}

export default function ProgressScreen() {
  const bg      = useThemeColor({}, 'background');
  const surface = useThemeColor({}, 'surface');
  const text    = useThemeColor({}, 'text');
  const muted   = useThemeColor({}, 'mutedText');
  const border  = useThemeColor({}, 'border');
  const tint    = useThemeColor({}, 'tint');

  const { user } = useAuth();

  const [loading,           setLoading]           = useState(false);
  const [error,             setError]             = useState<string | null>(null);
  const [grades,            setGrades]            = useState<StudentTestGradeRow[]>([]);
  const [activeTab,         setActiveTab]         = useState<TabKey>('overall');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);

  const resolveStudentId = useCallback(async (): Promise<string | null> => {
    if (!user?.id) return null;
    const { data, error: qErr } = await supabase
      .from('students').select('id').eq('auth_user_id', user.id).maybeSingle();
    if (qErr) return null;
    return (data as any)?.id ?? null;
  }, [user?.id]);

  const loadGrades = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const studentId = await resolveStudentId();
      if (!studentId) { setGrades([]); setError('Δεν βρέθηκε student για τον χρήστη.'); return; }
      const { data, error: gErr } = await supabase
        .from('student_test_grades')
        .select('id, student_id, test_id, test_name, test_date, start_time, end_time, class_title, subject_id, subject_name, grade, graded_at')
        .eq('student_id', studentId).order('test_date', { ascending: true });
      if (gErr) { setGrades([]); setError('Αποτυχία φόρτωσης βαθμών.'); return; }
      const rows = (data ?? []) as StudentTestGradeRow[];
      setGrades(rows);
      setSelectedSubjectId((prev) => prev ?? rows.find((x) => x.subject_id)?.subject_id ?? null);
    } catch { setGrades([]); setError('Αποτυχία φόρτωσης βαθμών.'); }
    finally { setLoading(false); }
  }, [resolveStudentId]);

  useFocusEffect(useCallback(() => { loadGrades(); }, [loadGrades]));

  const subjectOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const g of grades) {
      if (g.subject_id && g.subject_name && !map.has(g.subject_id))
        map.set(g.subject_id, g.subject_name);
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [grades]);

  useEffect(() => {
    if (activeTab !== 'by-subject' || selectedSubjectId || !subjectOptions.length) return;
    setSelectedSubjectId(subjectOptions[0].id);
  }, [activeTab, selectedSubjectId, subjectOptions]);

  const visibleGrades = useMemo(() => {
    if (activeTab === 'overall') return grades;
    if (!selectedSubjectId) return [];
    return grades.filter((g) => g.subject_id === selectedSubjectId);
  }, [grades, activeTab, selectedSubjectId]);

  const { avgGrade, gradedCount } = useMemo(() => {
    const valid = visibleGrades.filter((g) => typeof g.grade === 'number') as Array<StudentTestGradeRow & { grade: number }>;
    if (!valid.length) return { avgGrade: null as number | null, gradedCount: 0 };
    return { avgGrade: valid.reduce((a, g) => a + g.grade, 0) / valid.length, gradedCount: valid.length };
  }, [visibleGrades]);

  const chartPoints = useMemo(() =>
    [...visibleGrades]
      .sort((a, b) => new Date(a.test_date ?? 0).getTime() - new Date(b.test_date ?? 0).getTime())
      .map((g) => ({
        id: g.id, label: formatDateShort(g.test_date),
        value: typeof g.grade === 'number' ? g.grade : null,
        title: g.test_name ?? 'Διαγώνισμα',
      })),
  [visibleGrades]);

  const avgColor = gradeColor(avgGrade, tint);

  return (
    <ThemedView style={[styles.screen, { backgroundColor: bg }]}>

      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <BarChart3 size={20} color={tint} strokeWidth={2} />
          <ThemedText style={styles.headerTitle}>Πρόοδος</ThemedText>
        </View>
      </View>

      {/* ── Error ── */}
      {!!error && (
        <View style={styles.errorBox}>
          <ThemedText style={styles.errorText}>{error}</ThemedText>
        </View>
      )}

      {/* ── Main tabs ── */}
      <View style={[styles.tabsRow, { backgroundColor: surface, borderColor: border }]}>
        {(['overall', 'by-subject'] as TabKey[]).map((tab) => {
          const active = activeTab === tab;
          return (
            <Pressable
              key={tab}
              onPress={() => { setActiveTab(tab); if (tab === 'overall') setSelectedSubjectId(null); }}
              style={({ pressed }) => [
                styles.tabBtn,
                active && { backgroundColor: tint },
                pressed && { opacity: 0.82 },
              ]}
            >
              <ThemedText style={[styles.tabText, { color: active ? '#fff' : muted }]}>
                {tab === 'overall' ? 'Γενικά' : 'Ανά μάθημα'}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>

      {/* ── Subject selector: plain underline tabs, no bubbles ── */}
      {activeTab === 'by-subject' && (
        <View style={[styles.subjectBar, { borderBottomColor: border }]}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.subjectBarInner}
          >
            {subjectOptions.length === 0 ? (
              <ThemedText style={[styles.emptyText, { color: muted }]}>
                Δεν υπάρχουν μαθήματα με βαθμούς.
              </ThemedText>
            ) : subjectOptions.map((s) => {
              const active = s.id === selectedSubjectId;
              return (
                <Pressable
                  key={s.id}
                  onPress={() => setSelectedSubjectId(s.id)}
                  style={({ pressed }) => [styles.subjectTab, { opacity: pressed ? 0.65 : 1 }]}
                >
                  <ThemedText style={[styles.subjectTabText, { color: active ? tint : muted }]}>
                    {s.name}
                  </ThemedText>
                  <View style={[
                    styles.subjectUnderline,
                    { backgroundColor: active ? tint : 'transparent' },
                  ]} />
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* ── Summary card ── */}
      <View style={[styles.summaryCard, { backgroundColor: surface, borderColor: border }]}>
        <View style={styles.summaryLeft}>
          <ThemedText style={[styles.summaryLabel, { color: muted }]}>Μέσος όρος</ThemedText>
          <ThemedText style={[styles.summaryCount, { color: muted }]}>
            {gradedCount} {gradedCount === 1 ? 'διαγώνισμα' : 'διαγωνίσματα'}
          </ThemedText>
        </View>
        <ThemedText style={[styles.summaryValue, { color: avgColor }]}>
          {avgGrade !== null ? avgGrade.toFixed(1) : '—'}
        </ThemedText>
      </View>

      {/* ── Chart ── */}
      <View style={styles.chartWrap}>
        <ProgressChart points={chartPoints} />
      </View>

      {/* ── Grades list ── */}
      <View style={[styles.listCard, { backgroundColor: surface, borderColor: border }]}>
        {loading ? (
          <View style={styles.centeredBox}>
            <ActivityIndicator color={tint} size="small" />
            <ThemedText style={[styles.centeredText, { color: muted }]}>Φόρτωση βαθμών…</ThemedText>
          </View>
        ) : visibleGrades.length === 0 ? (
          <View style={styles.centeredBox}>
            <ThemedText style={[styles.centeredText, { color: muted }]}>
              Δεν υπάρχουν βαθμοί για τα επιλεγμένα κριτήρια.
            </ThemedText>
          </View>
        ) : (
          <FlatList
            data={[...visibleGrades].reverse()}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingVertical: Spacing.xs }}
            ItemSeparatorComponent={() => <View style={[styles.sep, { backgroundColor: border }]} />}
            renderItem={({ item }) => {
              const gc = gradeColor(item.grade, tint);
              return (
                <View style={styles.gradeRow}>
                  <View style={styles.gradeRowLeft}>
                    <ThemedText style={[styles.gradeRowTitle, { color: text }]} numberOfLines={1}>
                      {item.test_name ?? 'Διαγώνισμα'}
                    </ThemedText>
                    <ThemedText style={[styles.gradeRowSub, { color: muted }]} numberOfLines={1}>
                      {item.subject_name ?? '—'}{item.class_title ? ` · ${item.class_title}` : ''}
                    </ThemedText>
                    <ThemedText style={[styles.gradeRowMeta, { color: muted }]}>
                      {formatDate(item.test_date)}
                      {item.start_time ? ` · ${formatTime(item.start_time)}` : ''}
                      {item.end_time   ? `–${formatTime(item.end_time)}`    : ''}
                    </ThemedText>
                  </View>
                  <ThemedText style={[styles.gradePillText, { color: gc }]}>
                    {typeof item.grade === 'number' ? item.grade.toFixed(1) : '—'}
                  </ThemedText>
                </View>
              );
            }}
          />
        )}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1, padding: Spacing.lg,
    paddingTop: Platform.select({ ios: 56, default: Spacing.xl }),
  },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.lg },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  headerTitle: { fontSize: 22, fontWeight: '800', letterSpacing: -0.4 },
  errorBox: {
    padding: Spacing.md, borderRadius: Radius.lg, marginBottom: Spacing.md,
    backgroundColor: 'rgba(248,113,113,0.10)',
    borderWidth: 1, borderColor: 'rgba(248,113,113,0.40)',
  },
  errorText: { fontSize: 13, fontWeight: '600', color: '#F87171' },

  tabsRow: {
    flexDirection: 'row', borderRadius: Radius.xl,
    borderWidth: StyleSheet.hairlineWidth, padding: 4,
    marginBottom: Spacing.md, gap: 4,
  },
  tabBtn: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: Radius.lg },
  tabText: { fontSize: 13, fontWeight: '700' },

  // ── Underline subject bar ─────────────────────────────────────────────────
  subjectBar: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom:      Spacing.md,
  },
  subjectBarInner: {
    flexDirection: 'row',
    paddingHorizontal: 2,
  },
  subjectTab: {
    paddingHorizontal: Spacing.md,
    paddingTop:        Spacing.sm,
    paddingBottom:     0,
    alignItems:        'center',
  },
  subjectTabText: {
    fontSize:     13,
    fontWeight:   '600',
    marginBottom: 8,
  },
  // 2px line flush with the bar border
  subjectUnderline: {
    height:       2.5,
    width:        '100%',
    borderRadius: 2,
    marginBottom: -StyleSheet.hairlineWidth,
  },
  emptyText: { fontSize: 12, fontWeight: '500', paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md },

  summaryCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderRadius: Radius.xl, borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.lg, marginBottom: Spacing.md,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  summaryLeft:  { gap: 3 },
  summaryLabel: { fontSize: 12, fontWeight: '600', letterSpacing: 0.2 },
  summaryCount: { fontSize: 11, fontWeight: '500' },
  summaryValue: { fontSize: 17, fontWeight: '700', letterSpacing: -0.3 },

  chartWrap: { marginBottom: Spacing.md },

  listCard: {
    flex: 1, borderRadius: Radius.xl, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  centeredBox:  { paddingVertical: Spacing.xl, alignItems: 'center', gap: Spacing.sm },
  centeredText: { fontSize: 13, fontWeight: '500', textAlign: 'center' },
  sep:          { height: StyleSheet.hairlineWidth, marginHorizontal: Spacing.lg },

  gradeRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: Spacing.md, paddingHorizontal: Spacing.lg, gap: Spacing.md,
  },
  gradeRowLeft:  { flex: 1, gap: 2 },
  gradeRowTitle: { fontSize: 14, fontWeight: '700', letterSpacing: -0.1 },
  gradeRowSub:   { fontSize: 12, fontWeight: '500' },
  gradeRowMeta:  { fontSize: 11, fontWeight: '400', marginTop: 1 },
  gradePillText: { fontSize: 12, fontWeight: '700', letterSpacing: -0.1 },
});