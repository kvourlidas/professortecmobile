// app/(tabs)/schedule.tsx
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CalendarDays, ChevronLeft, ChevronRight, Clock } from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useThemeColor } from '@/hooks/use-theme-color';
import { supabase } from '@/lib/supabaseClient';

/* ─────────────────────────────── Types ──────────────────────────────────── */

type StudentRow       = { id: string; school_id: string; full_name: string };
type ClassStudentRow  = { class_id: string; status: string };
type ClassRow         = { id: string; title: string; subject: string | null; subject_id: string | null; tutor_id: string | null };
type TutorRow         = { id: string; full_name: string | null };
type SubjectRow       = { id: string; name: string };
type ProgramItemRow   = { id: string; class_id: string; day_of_week: string; start_time: string | null; end_time: string | null; start_date: string | null; end_date: string | null; subject_id: string | null; tutor_id: string | null };
type ProgramItemOverrideRow = { id: string; program_item_id: string; override_date: string; start_time: string | null; end_time: string | null; is_deleted: boolean; is_inactive: boolean; holiday_active_override: boolean };
type HolidayRow       = { date: string; name: string | null };
type TestRow          = { id: string; class_id: string; subject_id: string; test_date: string; start_time: string | null; end_time: string | null; title: string | null; active_during_holiday: boolean };
type SchoolEventRow   = { id: string; school_id: string; name: string; description: string | null; date: string; start_time: string; end_time: string };
type NextEventKind    = 'program' | 'test' | 'schoolEvent';

type CalendarEvent = {
  kind:        NextEventKind;
  start:       Date;
  end:         Date;
  subjectName: string | null;
  tutorName:   string | null;
  classTitle:  string | null;
  title:       string | null;
};

/* ─────────────────────────────── Helpers ────────────────────────────────── */

const pad2 = (n: number) => n.toString().padStart(2, '0');

function toYMD(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function addDays(d: Date, days: number): Date {
  const x = new Date(d); x.setDate(x.getDate() + days); return x;
}
function startOfMonth(d: Date): Date {
  const x = new Date(d); x.setDate(1); x.setHours(0, 0, 0, 0); return x;
}
function endOfMonth(d: Date): Date {
  const x = new Date(d); x.setMonth(x.getMonth() + 1, 0); x.setHours(23, 59, 59, 999); return x;
}
function getWeekStartMonday(date: Date): Date {
  const d = new Date(date); d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff); return d;
}
function parseTimeToHM(time: string): { h: number; m: number } | null {
  const parts = time.split(':');
  if (parts.length < 2) return null;
  const h = Number(parts[0]); const m = Number(parts[1]);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return { h, m };
}
function buildDateTime(dateISO: string, time: string): Date | null {
  const hm = parseTimeToHM(time); if (!hm) return null;
  const d = new Date(dateISO + 'T00:00:00');
  d.setHours(hm.h, hm.m, 0, 0); return d;
}
function formatTimeHHMM(d: Date): string { return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`; }
function formatDateDDMM(d: Date): string { return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}`; }
function isSameYMD(a: Date, b: Date) { return toYMD(a) === toYMD(b); }
function isToday(d: Date) { return toYMD(d) === toYMD(new Date()); }
function getNextDateForDow(from: Date, dow: number): Date {
  const d = new Date(from);
  const diff = (dow - d.getDay() + 7) % 7;
  d.setDate(d.getDate() + diff); d.setHours(0, 0, 0, 0); return d;
}

const WEEKDAY_TO_INDEX: Record<string, number> = {
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
  thursday: 4, friday: 5, saturday: 6,
};
const WEEKDAY_GR = ['Δευ', 'Τρι', 'Τετ', 'Πεμ', 'Παρ', 'Σαβ', 'Κυρ'];
const MONTHS_GR  = ['Ιανουάριος','Φεβρουάριος','Μάρτιος','Απρίλιος','Μάιος','Ιούνιος','Ιούλιος','Αύγουστος','Σεπτέμβριος','Οκτώβριος','Νοέμβριος','Δεκέμβριος'];

/* Event kind → accent ──────────────────────────────────────────────────── */
const KIND_COLORS: Record<NextEventKind, { bg: string; text: string; dot: string }> = {
  program:     { bg: 'rgba(79,110,247,0.12)', text: 'rgba(79,110,247,0.95)', dot: '#4F6EF7' },
  test:        { bg: 'rgba(251,191,36,0.12)', text: 'rgba(180,130,0,0.95)',  dot: '#FBBF24' },
  schoolEvent: { bg: 'rgba(34,197,94,0.12)',  text: 'rgba(21,128,61,0.95)', dot: '#22C55E' },
};
const KIND_COLORS_DARK: Record<NextEventKind, { bg: string; text: string; dot: string }> = {
  program:     { bg: 'rgba(123,150,255,0.14)', text: '#7B96FF', dot: '#7B96FF' },
  test:        { bg: 'rgba(251,191,36,0.14)',  text: '#FCD34D', dot: '#FCD34D' },
  schoolEvent: { bg: 'rgba(74,222,128,0.14)',  text: '#4ADE80', dot: '#4ADE80' },
};

/* ─────────────────────── EventRow component ─────────────────────────────── */

function EventRow({
  ev,
  isLast,
  isDark,
}: {
  ev: CalendarEvent;
  isLast: boolean;
  isDark: boolean;
}) {
  const text   = useThemeColor({}, 'text');
  const muted  = useThemeColor({}, 'mutedText');
  const tint   = useThemeColor({}, 'tint');
  const border = useThemeColor({}, 'border');

  const palette  = isDark ? KIND_COLORS_DARK[ev.kind] : KIND_COLORS[ev.kind];
  const primary  = ev.subjectName ?? ev.title ?? 'Event';
  const timeStr  = `${formatTimeHHMM(ev.start)} – ${formatTimeHHMM(ev.end)}`;
  const kindLabel =
    ev.kind === 'program' ? 'Μάθημα' : ev.kind === 'test' ? 'Διαγώνισμα' : 'Εκδήλωση';

  return (
    <View style={[styles.evRow, !isLast && { borderBottomColor: border, borderBottomWidth: StyleSheet.hairlineWidth }]}>
      {/* Left accent line */}
      <View style={[styles.evAccentBar, { backgroundColor: palette.dot }]} />

      <View style={styles.evContent}>
        {/* Time + kind badge */}
        <View style={styles.evMeta}>
          <View style={styles.evTimeRow}>
            <Clock size={13} color={palette.dot} strokeWidth={2.2} />
            <ThemedText style={[styles.evTime, { color: text }]}>{timeStr}</ThemedText>
          </View>
          <View style={[styles.evKindBadge, { backgroundColor: palette.bg }]}>
            <ThemedText style={[styles.evKindText, { color: palette.text }]}>
              {kindLabel}
            </ThemedText>
          </View>
        </View>

        {/* Title row */}
        <View style={styles.evTitleRow}>
          {!!ev.classTitle && (
            <ThemedText style={[styles.evClass, { color: palette.dot }]} numberOfLines={1}>
              {ev.classTitle}
            </ThemedText>
          )}
          {!!ev.classTitle && (
            <ThemedText style={[styles.evDot, { color: muted }]}>·</ThemedText>
          )}
          <ThemedText style={[styles.evTitle, { color: text }]} numberOfLines={2}>
            {primary}
          </ThemedText>
        </View>

        {!!ev.tutorName && (
          <ThemedText style={[styles.evTutor, { color: muted }]}>{ev.tutorName}</ThemedText>
        )}
      </View>
    </View>
  );
}

/* ─────────────────────────── Screen ─────────────────────────────────────── */

export default function ScheduleScreen() {
  const bg      = useThemeColor({}, 'background');
  const text    = useThemeColor({}, 'text');
  const muted   = useThemeColor({}, 'mutedText');
  const border  = useThemeColor({}, 'border');
  const icon    = useThemeColor({}, 'icon');
  const surface = useThemeColor({}, 'surface');
  const tint    = useThemeColor({}, 'tint');

  // Detect dark mode by checking if bg is dark
  const isDark = bg === '#111318' || bg.startsWith('#0') || bg.startsWith('#1');

  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [monthAnchor, setMonthAnchor] = useState<Date>(() => startOfMonth(new Date()));
  const [selectedDay, setSelectedDay] = useState<Date>(() => new Date());
  const [loading,     setLoading]     = useState(true);
  const [inactiveMsg, setInactiveMsg] = useState<string | null>(null);
  const [events,      setEvents]      = useState<CalendarEvent[]>([]);

  const monthStart = useMemo(() => startOfMonth(monthAnchor), [monthAnchor]);
  const monthEnd   = useMemo(() => endOfMonth(monthAnchor),   [monthAnchor]);

  // Keep selected day in month
  useEffect(() => {
    const y = monthStart.getFullYear(); const m = monthStart.getMonth();
    if (selectedDay.getFullYear() !== y || selectedDay.getMonth() !== m)
      setSelectedDay(new Date(y, m, 1));
  }, [monthStart]);

  const calendarGridDays = useMemo(() => {
    const gridStart = getWeekStartMonday(monthStart);
    return Array.from({ length: 42 }).map((_, i) => addDays(gridStart, i));
  }, [monthStart]);

  const selectedISO   = useMemo(() => toYMD(selectedDay), [selectedDay]);
  const dayEvents     = useMemo(() => {
    const list = events.filter((e) => toYMD(e.start) === selectedISO);
    list.sort((a, b) => a.start.getTime() - b.start.getTime());
    return list;
  }, [events, selectedISO]);

  const eventsCountByDay = useMemo(() => {
    const map = new Map<string, number>();
    for (const ev of events) { const k = toYMD(ev.start); map.set(k, (map.get(k) ?? 0) + 1); }
    return map;
  }, [events]);

  useEffect(() => {
    const loadMonth = async () => {
      setLoading(true); setInactiveMsg(null); setEvents([]);
      try {
        const authUserId = user?.id ?? null;
        if (!authUserId) { setInactiveMsg('Δεν βρέθηκε χρήστης. Κάνε ξανά login.'); return; }

        const { data: student, error: studentErr } = await supabase
          .from('students').select('id, school_id, full_name').eq('auth_user_id', authUserId).maybeSingle();
        if (studentErr || !student) { setInactiveMsg('Δεν βρέθηκε μαθητής συνδεδεμένος.'); return; }

        const s = student as StudentRow;
        const { data: classStudents, error: csErr } = await supabase
          .from('class_students').select('class_id, status').eq('student_id', s.id).eq('status', 'active');
        if (csErr) { setInactiveMsg('Αποτυχία φόρτωσης τμημάτων.'); return; }

        const activeClassIds = (classStudents as ClassStudentRow[] | null)?.map((r) => r.class_id) ?? [];
        if (activeClassIds.length === 0) { setInactiveMsg('Δεν έχεις ενεργή συνδρομή/τμήμα.'); return; }

        const startISO = toYMD(monthStart); const endISO = toYMD(monthEnd);

        const [classesRes, tutorsRes, subjectsRes, programItemsRes, holidaysRes, testsRes, schoolEventsRes] =
          await Promise.all([
            supabase.from('classes').select('id, title, subject, subject_id, tutor_id').in('id', activeClassIds),
            supabase.from('tutors').select('id, full_name').eq('school_id', s.school_id),
            supabase.from('subjects').select('id, name').eq('school_id', s.school_id),
            supabase.from('program_items').select('id, class_id, day_of_week, start_time, end_time, start_date, end_date, subject_id, tutor_id').in('class_id', activeClassIds),
            supabase.from('school_holidays').select('date, name').eq('school_id', s.school_id).gte('date', startISO).lte('date', endISO),
            supabase.from('tests').select('id, class_id, subject_id, test_date, start_time, end_time, title, active_during_holiday').eq('school_id', s.school_id).in('class_id', activeClassIds).gte('test_date', startISO).lte('test_date', endISO),
            supabase.from('school_events').select('id, school_id, name, description, date, start_time, end_time').eq('school_id', s.school_id).gte('date', startISO).lte('date', endISO),
          ]);

        const classes     = (classesRes.data     ?? []) as ClassRow[];
        const tutors      = (tutorsRes.data      ?? []) as TutorRow[];
        const subjects    = (subjectsRes.data    ?? []) as SubjectRow[];
        const programItems = (programItemsRes.data ?? []) as ProgramItemRow[];
        const holidays    = (holidaysRes.data    ?? []) as HolidayRow[];
        const tests       = (testsRes.data       ?? []) as TestRow[];
        const schoolEvents = (schoolEventsRes.data ?? []) as SchoolEventRow[];

        const tutorById   = new Map<string, string>(); tutors.forEach((t)   => { if (t.id && t.full_name) tutorById.set(t.id, t.full_name); });
        const subjectById = new Map<string, string>(); subjects.forEach((s) => { if (s.id) subjectById.set(s.id, s.name); });
        const classById   = new Map<string, ClassRow>(); classes.forEach((c) => classById.set(c.id, c));
        const holidaySet  = new Set<string>(holidays.map((h) => h.date));

        const programItemIds = programItems.map((pi) => pi.id);
        let overrides: ProgramItemOverrideRow[] = [];
        if (programItemIds.length > 0) {
          const { data: ovData } = await supabase
            .from('program_item_overrides').select('id, program_item_id, override_date, start_time, end_time, is_deleted, is_inactive, holiday_active_override')
            .in('program_item_id', programItemIds).gte('override_date', startISO).lte('override_date', endISO);
          overrides = (ovData ?? []) as ProgramItemOverrideRow[];
        }

        const overrideByKey = new Map<string, ProgramItemOverrideRow>();
        overrides.forEach((ov) => overrideByKey.set(`${ov.program_item_id}-${ov.override_date}`, ov));

        const candidates: CalendarEvent[] = [];
        const windowStart = new Date(startISO + 'T00:00:00');
        const windowEnd   = new Date(endISO   + 'T23:59:59');

        // Program items
        for (const item of programItems) {
          if (!item.day_of_week || !item.start_time || !item.end_time) continue;
          const dow = WEEKDAY_TO_INDEX[item.day_of_week];
          if (dow === undefined) continue;
          const cls = classById.get(item.class_id); if (!cls) continue;
          const patternStart = item.start_date ? new Date(item.start_date + 'T00:00:00') : new Date('1970-01-01T00:00:00');
          const patternEnd   = item.end_date   ? new Date(item.end_date   + 'T23:59:59') : new Date('2999-12-31T23:59:59');
          const effectiveStart = patternStart > windowStart ? patternStart : windowStart;
          const effectiveEnd   = patternEnd   < windowEnd   ? patternEnd   : windowEnd;
          if (effectiveStart > effectiveEnd) continue;
          let current = getNextDateForDow(effectiveStart, dow);
          while (current <= effectiveEnd) {
            const dateStr = toYMD(current);
            const ov = overrideByKey.get(`${item.id}-${dateStr}`);
            if (ov?.is_deleted) { current = addDays(current, 7); continue; }
            const isHoliday = holidaySet.has(dateStr);
            const isInactive = !!ov?.is_inactive || (isHoliday && !ov?.holiday_active_override);
            if (isInactive) { current = addDays(current, 7); continue; }
            const startTime = ov?.start_time ?? item.start_time;
            const endTime   = ov?.end_time   ?? item.end_time;
            if (!startTime || !endTime) { current = addDays(current, 7); continue; }
            const start = buildDateTime(dateStr, startTime); const end = buildDateTime(dateStr, endTime);
            if (!start || !end) { current = addDays(current, 7); continue; }
            const tutorName   = (item.tutor_id ? tutorById.get(item.tutor_id) : undefined) ?? (cls.tutor_id ? tutorById.get(cls.tutor_id) : undefined) ?? null;
            const subjectName = (item.subject_id ? subjectById.get(item.subject_id) : undefined) ?? (cls.subject_id ? subjectById.get(cls.subject_id) : undefined) ?? cls.subject ?? null;
            candidates.push({ kind: 'program', start, end, tutorName, subjectName, classTitle: cls.title, title: null });
            current = addDays(current, 7);
          }
        }

        // Tests
        for (const t of tests) {
          if (holidaySet.has(t.test_date) && !t.active_during_holiday) continue;
          const start = buildDateTime(t.test_date, t.start_time ?? '09:00:00');
          const end   = buildDateTime(t.test_date, t.end_time   ?? '10:00:00');
          if (!start || !end) continue;
          const cls = classById.get(t.class_id);
          candidates.push({ kind: 'test', start, end, subjectName: subjectById.get(t.subject_id) ?? cls?.subject ?? null, tutorName: null, classTitle: cls?.title ?? null, title: t.title ? `Διαγώνισμα · ${t.title}` : 'Διαγώνισμα' });
        }

        // School events
        for (const ev of schoolEvents) {
          if (holidaySet.has(ev.date)) continue;
          const start = buildDateTime(ev.date, ev.start_time); const end = buildDateTime(ev.date, ev.end_time);
          if (!start || !end) continue;
          candidates.push({ kind: 'schoolEvent', start, end, subjectName: null, tutorName: null, classTitle: null, title: ev.name });
        }

        candidates.sort((a, b) => a.start.getTime() - b.start.getTime());
        setEvents(candidates);
        if (candidates.length === 0) setInactiveMsg('Δεν υπάρχουν events αυτόν τον μήνα.');
      } catch (e) {
        console.error('Schedule month load error', e);
        setInactiveMsg('Κάτι πήγε στραβά στη φόρτωση του προγράμματος.');
      } finally {
        setLoading(false);
      }
    };
    loadMonth();
  }, [user?.id, monthStart.getTime()]);

  const headerMonthLabel = useMemo(() =>
    `${MONTHS_GR[monthStart.getMonth()]} ${monthStart.getFullYear()}`,
  [monthStart]);

  const selectedLabel = useMemo(() => {
    const prefix = isToday(selectedDay) ? 'Σήμερα · ' : '';
    return `${prefix}${formatDateDDMM(selectedDay)}`;
  }, [selectedDay]);

  return (
    <ThemedView style={[styles.screen, { backgroundColor: bg }]}>

      {/* Subtle vertical accent lines left/right */}
      <LinearGradient
        pointerEvents="none"
        colors={['transparent', tint + '55', 'transparent']}
        start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }}
        style={[styles.sideLineLeft,  { top: insets.top + Spacing.sm, bottom: insets.bottom + Spacing.sm }]}
      />
      <LinearGradient
        pointerEvents="none"
        colors={['transparent', tint + '55', 'transparent']}
        start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }}
        style={[styles.sideLineRight, { top: insets.top + Spacing.sm, bottom: insets.bottom + Spacing.sm }]}
      />

      {/* ── Header ── */}
      <View style={styles.headerRow}>
        <CalendarDays size={20} color={tint} strokeWidth={2} />
        <ThemedText style={styles.headerTitle}>Πρόγραμμα</ThemedText>
      </View>

      {/* ── Calendar ── */}
      <View style={styles.calendarWrap}>

        {/* Month nav */}
        <View style={styles.monthHeaderRow}>
          <Pressable
            onPress={() => setMonthAnchor((d) => startOfMonth(new Date(d.getFullYear(), d.getMonth() - 1, 1)))}
            style={[styles.monthArrowBtn, { borderColor: border, backgroundColor: surface }]}
            hitSlop={10}
          >
            <ChevronLeft size={16} color={icon} strokeWidth={2.2} />
          </Pressable>

          <ThemedText style={styles.monthTitle}>{headerMonthLabel}</ThemedText>

          <Pressable
            onPress={() => setMonthAnchor((d) => startOfMonth(new Date(d.getFullYear(), d.getMonth() + 1, 1)))}
            style={[styles.monthArrowBtn, { borderColor: border, backgroundColor: surface }]}
            hitSlop={10}
          >
            <ChevronRight size={16} color={icon} strokeWidth={2.2} />
          </Pressable>
        </View>

        {/* Weekday labels */}
        <View style={styles.weekdayRow}>
          {WEEKDAY_GR.map((w) => (
            <View key={w} style={styles.weekdayCell}>
              <ThemedText style={[styles.weekdayText, { color: muted }]}>{w}</ThemedText>
            </View>
          ))}
        </View>

        {/* Day grid */}
        <View style={styles.grid}>
          {calendarGridDays.map((d) => {
            const inMonth = d.getMonth() === monthStart.getMonth();
            const selected = isSameYMD(d, selectedDay);
            const today    = isToday(d);
            const iso      = toYMD(d);
            const count    = eventsCountByDay.get(iso) ?? 0;

            return (
              <Pressable key={iso} onPress={() => setSelectedDay(d)} style={styles.dayOuter} hitSlop={4}>
                <View
                  style={[
                    styles.dayCell,
                    { borderColor: border },
                    today    && { borderColor: tint + '60' },
                    selected && { borderColor: tint, backgroundColor: surface,
                      shadowColor: tint, shadowOpacity: 0.18, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 4,
                    },
                  ]}
                >
                  <ThemedText
                    style={[
                      styles.dayNum,
                      { color: inMonth ? text : muted, opacity: inMonth ? 1 : 0.35 },
                      today    && { color: tint, opacity: 1, fontWeight: '800' },
                      selected && { fontWeight: '800' },
                    ]}
                  >
                    {d.getDate()}
                  </ThemedText>

                  {!!count && (
                    <View style={styles.dotsRow}>
                      {Array.from({ length: Math.min(3, count) }).map((_, i) => (
                        <View
                          key={i}
                          style={[styles.dot, { backgroundColor: selected ? tint : muted, opacity: selected ? 1 : 0.7 }]}
                        />
                      ))}
                      {count > 3 && (
                        <ThemedText style={[styles.moreText, { color: muted }]}>+</ThemedText>
                      )}
                    </View>
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={{ height: Spacing.md }} />

      {/* ── Selected day label ── */}
      <View style={styles.dayLabelRow}>
        <ThemedText style={styles.dayLabel}>{selectedLabel}</ThemedText>
        {loading && <ActivityIndicator size="small" color={tint} style={{ marginLeft: Spacing.sm }} />}
      </View>

      {/* ── Events list ── */}
      {!loading && dayEvents.length === 0 ? (
        <View style={[styles.emptyBox, { borderColor: border, backgroundColor: surface }]}>
          <ThemedText style={[styles.emptyTitle, { color: text }]}>
            Δεν έχεις event αυτή την ημέρα.
          </ThemedText>
          {!!inactiveMsg && (
            <ThemedText style={[styles.emptySub, { color: muted }]}>{inactiveMsg}</ThemedText>
          )}
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[styles.evList, { borderColor: border, backgroundColor: surface }]}
          showsVerticalScrollIndicator={false}
        >
          {dayEvents.map((ev, idx) => (
            <EventRow
              key={`${ev.kind}-${ev.start.getTime()}-${idx}`}
              ev={ev}
              isLast={idx === dayEvents.length - 1}
              isDark={isDark}
            />
          ))}
        </ScrollView>
      )}
    </ThemedView>
  );
}

/* ─────────────────────────── Styles ─────────────────────────────────────── */

const styles = StyleSheet.create({
  screen: {
    flex:       1,
    padding:    Spacing.lg,
    paddingTop: Platform.select({ ios: 56, default: Spacing.xl }),
  },

  sideLineLeft: {
    position:     'absolute',
    left:         8,
    width:        2,
    borderRadius: 999,
    opacity:      0.35,
  },
  sideLineRight: {
    position:     'absolute',
    right:        8,
    width:        2,
    borderRadius: 999,
    opacity:      0.35,
  },

  // ── Header ───────────────────────────────────────────────────────────────
  headerRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           Spacing.sm,
    marginBottom:  Spacing.lg,
  },
  headerTitle: {
    fontSize:      22,
    fontWeight:    '800',
    letterSpacing: -0.4,
  },

  // ── Calendar ─────────────────────────────────────────────────────────────
  calendarWrap: {},

  monthHeaderRow: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    marginBottom:   Spacing.md,
  },
  monthArrowBtn: {
    width:          34,
    height:         34,
    borderRadius:   Radius.md,
    borderWidth:    StyleSheet.hairlineWidth,
    alignItems:     'center',
    justifyContent: 'center',
  },
  monthTitle: {
    fontSize:      16,
    fontWeight:    '700',
    letterSpacing: -0.2,
  },

  weekdayRow: {
    flexDirection:  'row',
    alignItems:     'center',
    paddingBottom:  6,
    marginBottom:   4,
  },
  weekdayCell: {
    width:          '14.2857%',
    alignItems:     'center',
    justifyContent: 'center',
  },
  weekdayText: {
    fontSize:      11,
    fontWeight:    '700',
    letterSpacing: 0.3,
  },

  grid: { flexDirection: 'row', flexWrap: 'wrap' },

  dayOuter: { width: '14.2857%', padding: 3 },
  dayCell: {
    width:        '100%',
    aspectRatio:  1,
    borderRadius: Radius.sm,
    borderWidth:  StyleSheet.hairlineWidth,
    padding:      5,
    justifyContent: 'space-between',
  },
  dayNum: {
    fontSize:   13,
    fontWeight: '600',
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           2,
  },
  dot: {
    width:        5,
    height:       5,
    borderRadius: 999,
  },
  moreText: {
    fontSize:   9,
    fontWeight: '700',
    marginLeft: 1,
  },

  // ── Day label ─────────────────────────────────────────────────────────────
  dayLabelRow: {
    flexDirection: 'row',
    alignItems:    'center',
    marginBottom:  Spacing.sm,
  },
  dayLabel: {
    fontSize:      15,
    fontWeight:    '700',
    letterSpacing: -0.1,
  },

  // ── Empty state ───────────────────────────────────────────────────────────
  emptyBox: {
    borderWidth:  StyleSheet.hairlineWidth,
    borderRadius: Radius.xl,
    padding:      Spacing.lg,
    gap:          Spacing.xs,
    // shadow
    shadowColor:   '#000',
    shadowOpacity: 0.06,
    shadowRadius:  8,
    shadowOffset:  { width: 0, height: 2 },
    elevation:     2,
  },
  emptyTitle: { fontSize: 14, fontWeight: '600' },
  emptySub:   { fontSize: 12, fontWeight: '400', lineHeight: 18 },

  // ── Events list ───────────────────────────────────────────────────────────
  evList: {
    borderWidth:  StyleSheet.hairlineWidth,
    borderRadius: Radius.xl,
    overflow:     'hidden',
    // shadow
    shadowColor:   '#000',
    shadowOpacity: 0.06,
    shadowRadius:  8,
    shadowOffset:  { width: 0, height: 2 },
    elevation:     2,
  },

  evRow: {
    flexDirection:  'row',
    alignItems:     'stretch',
    paddingVertical:   Spacing.md,
    paddingHorizontal: Spacing.md,
    gap:            Spacing.md,
  },

  // Left colored bar
  evAccentBar: {
    width:        3,
    borderRadius: 999,
    minHeight:    40,
  },

  evContent: { flex: 1, gap: 4 },

  evMeta: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    gap:            Spacing.sm,
  },
  evTimeRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           5,
  },
  evTime: {
    fontSize:   13,
    fontWeight: '700',
  },
  evKindBadge: {
    paddingHorizontal: 8,
    paddingVertical:   4,
    borderRadius:      999,
  },
  evKindText: {
    fontSize:      10,
    fontWeight:    '700',
    letterSpacing: 0.3,
  },

  evTitleRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           5,
    flexWrap:      'nowrap',
  },
  evClass: {
    fontSize:   12,
    fontWeight: '700',
    maxWidth:   100,
  },
  evDot: {
    fontSize:   13,
    fontWeight: '400',
  },
  evTitle: {
    flex:          1,
    fontSize:      15,
    fontWeight:    '700',
    letterSpacing: -0.2,
  },
  evTutor: {
    fontSize:   12,
    fontWeight: '500',
    marginTop:  2,
  },
});