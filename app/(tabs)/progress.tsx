import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
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

  const { avgGrade, gradedCount, bestGrade } = useMemo(() => {
    const valid = visibleGrades.filter((g) => typeof g.grade === 'number') as Array<StudentTestGradeRow & { grade: number }>;
    if (!valid.length) return { avgGrade: null as number | null, gradedCount: 0, bestGrade: null as number | null };
    const avg  = valid.reduce((a, g) => a + g.grade, 0) / valid.length;
    const best = Math.max(...valid.map((g) => g.grade));
    return { avgGrade: avg, gradedCount: valid.length, bestGrade: best };
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

  const avgColor  = gradeColor(avgGrade, tint);
  const bestColor = gradeColor(bestGrade, tint);

  const reversedGrades = useMemo(() => [...visibleGrades].reverse(), [visibleGrades]);

  return (
    <ThemedView style={[styles.screen, { backgroundColor: bg }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* ── Header ── */}
        <View style={styles.header}>
          <ThemedText style={[styles.headerTitle, { color: text }]}>Πρόοδος</ThemedText>
        </View>

        {/* ── Error ── */}
        {!!error && (
          <View style={[styles.errorBox, { backgroundColor: 'rgba(248,113,113,0.08)', borderColor: 'rgba(248,113,113,0.30)' }]}>
            <ThemedText style={styles.errorText}>{error}</ThemedText>
          </View>
        )}

        {/* ── Tabs ── */}
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
                  pressed && { opacity: 0.80 },
                ]}
              >
                <ThemedText style={[styles.tabText, { color: active ? '#fff' : muted }]}>
                  {tab === 'overall' ? 'Γενικά' : 'Ανά μάθημα'}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>

        {/* ── Subject selector ── */}
        {activeTab === 'by-subject' && (
          <View style={[styles.subjectBar, { borderBottomColor: border }]}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.subjectBarInner}>
              {subjectOptions.length === 0 ? (
                <ThemedText style={[styles.subjectEmptyText, { color: muted }]}>
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
                    <View style={[styles.subjectUnderline, { backgroundColor: active ? tint : 'transparent' }]} />
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* ── Stats strip ── */}
        <View style={styles.statsRow}>
          <View style={[styles.statBox, { backgroundColor: surface, borderColor: border }]}>
            <ThemedText style={[styles.statLabel, { color: muted }]}>Μέσος όρος</ThemedText>
            <ThemedText style={[styles.statValue, { color: avgColor }]}>
              {avgGrade !== null ? avgGrade.toFixed(1) : '—'}
            </ThemedText>
          </View>
          <View style={[styles.statBox, { backgroundColor: surface, borderColor: border }]}>
            <ThemedText style={[styles.statLabel, { color: muted }]}>Καλύτερη</ThemedText>
            <ThemedText style={[styles.statValue, { color: bestColor }]}>
              {bestGrade !== null ? bestGrade.toFixed(1) : '—'}
            </ThemedText>
          </View>
          <View style={[styles.statBox, { backgroundColor: surface, borderColor: border }]}>
            <ThemedText style={[styles.statLabel, { color: muted }]}>Σύνολο</ThemedText>
            <ThemedText style={[styles.statValue, { color: text }]}>{gradedCount}</ThemedText>
          </View>
        </View>

        {/* ── Chart ── */}
        <View style={styles.chartWrap}>
          <ProgressChart points={chartPoints} />
        </View>

        {/* ── Grades list ── */}
        <View style={[styles.listCard, { backgroundColor: surface, borderColor: border }]}>
          {loading ? (
            <View style={styles.placeholder}>
              <ActivityIndicator color={tint} size="small" />
              <ThemedText style={[styles.placeholderText, { color: muted }]}>Φόρτωση βαθμών…</ThemedText>
            </View>
          ) : reversedGrades.length === 0 ? (
            <View style={styles.placeholder}>
              <ThemedText style={[styles.placeholderText, { color: muted }]}>
                Δεν υπάρχουν βαθμοί για τα επιλεγμένα κριτήρια.
              </ThemedText>
            </View>
          ) : (
            reversedGrades.map((item, index) => {
              const gc = gradeColor(item.grade, tint);
              return (
                <React.Fragment key={item.id}>
                  {index > 0 && <View style={[styles.sep, { backgroundColor: border }]} />}
                  <View style={styles.gradeRow}>
                    <View style={[styles.accentBar, { backgroundColor: gc }]} />
                    <View style={styles.gradeRowBody}>
                      <View style={styles.gradeRowLeft}>
                        <ThemedText style={[styles.gradeTitle, { color: text }]} numberOfLines={1}>
                          {item.test_name ?? 'Διαγώνισμα'}
                        </ThemedText>
                        {(item.subject_name || item.class_title) && (
                          <ThemedText style={[styles.gradeSub, { color: muted }]} numberOfLines={1}>
                            {item.subject_name ?? '—'}{item.class_title ? ` · ${item.class_title}` : ''}
                          </ThemedText>
                        )}
                        <ThemedText style={[styles.gradeDate, { color: muted }]}>
                          {formatDate(item.test_date)}
                        </ThemedText>
                      </View>
                      <View style={[styles.gradeBadge, { backgroundColor: gc + '18' }]}>
                        <ThemedText style={[styles.gradeBadgeText, { color: gc }]}>
                          {typeof item.grade === 'number' ? item.grade.toFixed(1) : '—'}
                        </ThemedText>
                      </View>
                    </View>
                  </View>
                </React.Fragment>
              );
            })
          )}
        </View>

      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scrollContent: {
    padding:    Spacing.lg,
    paddingTop: Platform.select({ ios: 56, default: Spacing.xl }),
    paddingBottom: Spacing.xl,
    gap: Spacing.md,
  },

  header: { marginBottom: Spacing.xs },
  headerTitle: { fontSize: 26, fontWeight: '800', letterSpacing: -0.6 },

  errorBox: {
    padding: Spacing.md, borderRadius: Radius.lg,
    borderWidth: 1,
  },
  errorText: { fontSize: 13, fontWeight: '600', color: '#F87171' },

  // ── Tabs ─────────────────────────────────────────────────────────────────────
  tabsRow: {
    flexDirection: 'row', borderRadius: Radius.xl,
    borderWidth: StyleSheet.hairlineWidth, padding: 4, gap: 4,
  },
  tabBtn:  { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: Radius.lg },
  tabText: { fontSize: 13, fontWeight: '700' },

  // ── Subject tabs ─────────────────────────────────────────────────────────────
  subjectBar:      { borderBottomWidth: StyleSheet.hairlineWidth },
  subjectBarInner: { flexDirection: 'row', paddingHorizontal: 2 },
  subjectTab: {
    paddingHorizontal: Spacing.md,
    paddingTop:        Spacing.sm,
    paddingBottom:     0,
    alignItems:        'center',
  },
  subjectTabText:    { fontSize: 13, fontWeight: '600', marginBottom: 8 },
  subjectUnderline:  { height: 2.5, width: '100%', borderRadius: 2, marginBottom: -StyleSheet.hairlineWidth },
  subjectEmptyText:  { fontSize: 12, fontWeight: '500', paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md },

  // ── Stats ────────────────────────────────────────────────────────────────────
  statsRow: { flexDirection: 'row', gap: Spacing.sm },
  statBox: {
    flex: 1, alignItems: 'center', paddingVertical: Spacing.md,
    borderRadius: Radius.lg, borderWidth: StyleSheet.hairlineWidth,
    gap: 4,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  statLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 0.1 },
  statValue: { fontSize: 20, fontWeight: '800', letterSpacing: -0.5 },

  chartWrap: {},

  // ── Grade list ───────────────────────────────────────────────────────────────
  listCard: {
    borderRadius: Radius.xl, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  placeholder: {
    paddingVertical: Spacing.xl, alignItems: 'center',
    gap: Spacing.sm, paddingHorizontal: Spacing.lg,
  },
  placeholderText: { fontSize: 13, fontWeight: '500', textAlign: 'center' },

  sep: { height: StyleSheet.hairlineWidth },

  gradeRow: { flexDirection: 'row', alignItems: 'stretch' },
  accentBar: { width: 3 },
  gradeRowBody: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    paddingVertical: Spacing.md, paddingHorizontal: Spacing.md,
    gap: Spacing.md,
  },
  gradeRowLeft: { flex: 1, gap: 3 },
  gradeTitle:   { fontSize: 14, fontWeight: '700', letterSpacing: -0.1 },
  gradeSub:     { fontSize: 12, fontWeight: '500' },
  gradeDate:    { fontSize: 11, fontWeight: '400' },

  gradeBadge: {
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center',
    minWidth: 48,
  },
  gradeBadgeText: { fontSize: 15, fontWeight: '800', letterSpacing: -0.3 },
});
