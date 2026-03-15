// components/home/ClassInfoCard.tsx
import { useFocusEffect } from '@react-navigation/native';
import { GraduationCap } from 'lucide-react-native';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/Card';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useThemeColor } from '@/hooks/use-theme-color';
import { supabase } from '@/lib/supabaseClient';

const WEEKDAY_TO_INDEX: Record<string, number> = {
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
  thursday: 4, friday: 5, saturday: 6,
};
const WEEKDAY_GR = ['Κυρ', 'Δευ', 'Τρι', 'Τετ', 'Πεμ', 'Παρ', 'Σαβ'];

function formatTime(t: string | null) {
  if (!t) return '';
  return t.slice(0, 5);
}

type Slot = {
  day:       string; // e.g. 'Δευ'
  dayIndex:  number;
  startTime: string;
  endTime:   string;
};

type SubjectRow = {
  key:         string;
  subjectName: string;
  tutorName:   string | null;
  slots:       Slot[];
};

type ClassInfo = {
  id:    string;
  title: string;
  rows:  SubjectRow[];
};

export default function ClassInfoCard() {
  const text   = useThemeColor({}, 'text');
  const muted  = useThemeColor({}, 'mutedText');
  const tint   = useThemeColor({}, 'tint');
  const border = useThemeColor({}, 'border');

  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<ClassInfo[]>([]);

  const load = useCallback(async () => {
    if (!user?.id) { setLoading(false); return; }
    setLoading(true);
    try {
      // 1. Resolve student
      const { data: student } = await supabase
        .from('students').select('id, school_id')
        .eq('auth_user_id', user.id).maybeSingle();
      if (!student) { setClasses([]); setLoading(false); return; }

      // 2. Active class ids
      const { data: cs } = await supabase
        .from('class_students').select('class_id')
        .eq('student_id', student.id).eq('status', 'active');
      const classIds = (cs ?? []).map((r: any) => r.class_id as string);
      if (!classIds.length) { setClasses([]); setLoading(false); return; }

      // 3. Class titles
      const { data: classRows } = await supabase
        .from('classes').select('id, title').in('id', classIds);
      const classMap = new Map<string, string>(
        (classRows ?? []).map((c: any) => [c.id as string, c.title as string])
      );

      // 4. Program items with schedule info
      const { data: items } = await supabase
        .from('program_items')
        .select('class_id, subject_id, tutor_id, day_of_week, start_time, end_time')
        .in('class_id', classIds);

      // Collect unique subject and tutor ids
      const subjectIds = new Set<string>();
      const tutorIds   = new Set<string>();
      for (const item of (items ?? []) as any[]) {
        if (item.subject_id) subjectIds.add(item.subject_id);
        if (item.tutor_id)   tutorIds.add(item.tutor_id);
      }

      // 5. Subject names
      const subjectMap = new Map<string, string>();
      if (subjectIds.size) {
        const { data: subs } = await supabase
          .from('subjects').select('id, name').in('id', [...subjectIds]);
        for (const s of (subs ?? []) as any[]) subjectMap.set(s.id, s.name);
      }

      // 6. Tutor names
      const tutorMap = new Map<string, string>();
      if (tutorIds.size) {
        const { data: tutors } = await supabase
          .from('tutors').select('id, full_name').in('id', [...tutorIds]);
        for (const t of (tutors ?? []) as any[]) tutorMap.set(t.id, t.full_name);
      }

      // 7. Build rows grouped by (subject_id, tutor_id) per class, collecting slots
      const classInfoMap = new Map<string, Map<string, SubjectRow>>();
      for (const item of (items ?? []) as any[]) {
        if (!item.subject_id) continue;
        if (!classInfoMap.has(item.class_id)) classInfoMap.set(item.class_id, new Map());
        const groupKey = `${item.subject_id}__${item.tutor_id ?? ''}`;
        const map = classInfoMap.get(item.class_id)!;
        if (!map.has(groupKey)) {
          map.set(groupKey, {
            key:         groupKey,
            subjectName: subjectMap.get(item.subject_id) ?? item.subject_id,
            tutorName:   item.tutor_id ? (tutorMap.get(item.tutor_id) ?? null) : null,
            slots:       [],
          });
        }
        const dayIndex = WEEKDAY_TO_INDEX[item.day_of_week] ?? -1;
        if (dayIndex >= 0 && item.start_time) {
          const row = map.get(groupKey)!;
          // avoid duplicate slots
          const slotKey = `${item.day_of_week}__${item.start_time}`;
          if (!row.slots.find((s) => `${s.day}__${s.startTime}` === slotKey)) {
            row.slots.push({
              day:       WEEKDAY_GR[dayIndex],
              dayIndex,
              startTime: formatTime(item.start_time),
              endTime:   formatTime(item.end_time),
            });
          }
        }
      }

      // Sort slots by day index within each row
      for (const map of classInfoMap.values())
        for (const row of map.values())
          row.slots.sort((a, b) => a.dayIndex - b.dayIndex);

      const result: ClassInfo[] = classIds
        .filter((id) => classMap.has(id))
        .map((id) => ({
          id,
          title: classMap.get(id)!,
          rows:  [...(classInfoMap.get(id)?.values() ?? [])],
        }));

      setClasses(result);
    } catch (e) {
      console.error('ClassInfoCard load error:', e);
      setClasses([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading) {
    return (
      <Card elevation="sm">
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color={tint} />
          <ThemedText style={[styles.loadingText, { color: muted }]}>Φόρτωση τμήματος…</ThemedText>
        </View>
      </Card>
    );
  }

  if (!classes.length) return null;

  return (
    <>
      {classes.map((cls, ci) => (
        <Card key={cls.id} elevation="sm" style={ci > 0 ? { marginTop: Spacing.md } : undefined}>
          {/* Header */}
          <View style={styles.header}>
            <View style={[styles.iconWrap, { backgroundColor: tint + '15' }]}>
              <GraduationCap size={15} color={tint} strokeWidth={2} />
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText style={[styles.label, { color: muted }]}>Τμήμα</ThemedText>
              <ThemedText style={[styles.classTitle, { color: text }]} numberOfLines={1}>
                {cls.title}
              </ThemedText>
            </View>
          </View>

          {/* Subject rows */}
          {cls.rows.length > 0 && (
            <View style={[styles.subjectList, { borderTopColor: border }]}>
              {cls.rows.map((row, i) => (
                <View
                  key={row.key}
                  style={[
                    styles.subjectRow,
                    i < cls.rows.length - 1 && { borderBottomColor: border, borderBottomWidth: StyleSheet.hairlineWidth },
                  ]}
                >
                  {/* Left: subject + tutor */}
                  <View style={styles.subjectLeft}>
                    <ThemedText style={[styles.subjectName, { color: text }]} numberOfLines={1}>
                      {row.subjectName}
                    </ThemedText>
                    {row.tutorName && (
                      <ThemedText style={[styles.tutorName, { color: muted }]} numberOfLines={1}>
                        {row.tutorName}
                      </ThemedText>
                    )}
                  </View>

                  {/* Right: schedule slots */}
                  {row.slots.length > 0 && (
                    <View style={styles.slotsCol}>
                      {row.slots.map((slot, si) => (
                        <View key={si} style={styles.slotRow}>
                          <ThemedText style={[styles.slotDay, { color: tint }]}>
                            {slot.day}
                          </ThemedText>
                          <ThemedText style={[styles.slotTime, { color: muted }]}>
                            {slot.startTime}{slot.endTime ? `–${slot.endTime}` : ''}
                          </ThemedText>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}
        </Card>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  loadingRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           Spacing.sm,
  },
  loadingText: { fontSize: 13, fontWeight: '500' },

  header: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           Spacing.sm,
  },
  iconWrap: {
    width:          32,
    height:         32,
    borderRadius:   8,
    alignItems:     'center',
    justifyContent: 'center',
    flexShrink:     0,
  },
  label: {
    fontSize:      10,
    fontWeight:    '600',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  classTitle: {
    fontSize:      14,
    fontWeight:    '700',
    letterSpacing: -0.1,
  },

  subjectList: {
    marginTop:      Spacing.sm,
    paddingTop:     Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  subjectRow: {
    flexDirection:   'row',
    alignItems:      'flex-start',
    paddingVertical: 7,
    gap:             Spacing.sm,
  },
  subjectLeft: {
    flex: 1,
    gap:  2,
  },
  subjectName: {
    fontSize:   13,
    fontWeight: '600',
  },
  tutorName: {
    fontSize:   11,
    fontWeight: '400',
  },

  slotsCol: {
    alignItems: 'flex-end',
    gap:        3,
  },
  slotRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           5,
  },
  slotDay: {
    fontSize:   11,
    fontWeight: '700',
  },
  slotTime: {
    fontSize:   11,
    fontWeight: '400',
  },
});
