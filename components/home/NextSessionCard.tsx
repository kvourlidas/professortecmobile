import { CalendarDays } from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabaseClient';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/Card';
import { Radius, Spacing } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';

type StudentRow = {
  id: string;
  school_id: string;
  full_name: string;
};

type ClassStudentRow = {
  class_id: string;
  status: string;
};

type ClassRow = {
  id: string;
  title: string;
  subject: string | null;
  subject_id: string | null;
  tutor_id: string | null;
};

type TutorRow = {
  id: string;
  full_name: string | null;
};

type SubjectRow = {
  id: string;
  name: string;
};

type ProgramItemRow = {
  id: string;
  class_id: string;
  day_of_week: string;
  start_time: string | null;
  end_time: string | null;
  start_date: string | null;
  end_date: string | null;
  subject_id: string | null;
  tutor_id: string | null;
};

type ProgramItemOverrideRow = {
  id: string;
  program_item_id: string;
  override_date: string;
  start_time: string | null;
  end_time: string | null;
  is_deleted: boolean;
  is_inactive: boolean;
  holiday_active_override: boolean;
};

type HolidayRow = {
  date: string;
  name: string | null;
};

type TestRow = {
  id: string;
  class_id: string;
  subject_id: string;
  test_date: string;
  start_time: string | null;
  end_time: string | null;
  title: string | null;
  active_during_holiday: boolean;
};

type SchoolEventRow = {
  id: string;
  school_id: string;
  name: string;
  description: string | null;
  date: string;
  start_time: string;
  end_time: string;
};

type NextEventKind = 'program' | 'test' | 'schoolEvent';

type NextEvent = {
  kind: NextEventKind;
  start: Date;
  end: Date;
  subjectName: string | null;
  tutorName: string | null;
  classTitle: string | null;
  title: string | null;
};

const pad2 = (n: number) => n.toString().padStart(2, '0');

function toYMD(d: Date): string {
  const y = d.getFullYear();
  const m = pad2(d.getMonth() + 1);
  const day = pad2(d.getDate());
  return `${y}-${m}-${day}`;
}

function addDays(d: Date, days: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

const WEEKDAY_TO_INDEX: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

const WEEKDAY_GR = ['Κυριακή', 'Δευτέρα', 'Τρίτη', 'Τετάρτη', 'Πέμπτη', 'Παρασκευή', 'Σάββατο'];

function getNextDateForDow(from: Date, dow: number): Date {
  const d = new Date(from);
  const diff = (dow - d.getDay() + 7) % 7;
  d.setDate(d.getDate() + diff);
  return d;
}

function parseTimeToHM(time: string): { h: number; m: number } | null {
  const parts = time.split(':');
  if (parts.length < 2) return null;
  const h = Number(parts[0]);
  const m = Number(parts[1]);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return { h, m };
}

function buildDateTime(dateISO: string, time: string): Date | null {
  const hm = parseTimeToHM(time);
  if (!hm) return null;
  const d = new Date(dateISO + 'T00:00:00');
  d.setHours(hm.h, hm.m, 0, 0);
  return d;
}

function formatTimeHHMM(d: Date): string {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function formatDayLabel(d: Date): string {
  const now = new Date();
  const today = toYMD(now);
  const target = toYMD(d);
  if (target === today) return 'Σήμερα';
  const tomorrow = toYMD(addDays(now, 1));
  if (target === tomorrow) return 'Αύριο';
  return WEEKDAY_GR[d.getDay()];
}

function formatDateDDMMYYYY(d: Date): string {
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
}

export default function NextSessionCard() {
  const text = useThemeColor({}, 'text');
  const mutedText = useThemeColor({}, 'mutedText');
  const border = useThemeColor({}, 'border');
  const icon = useThemeColor({}, 'icon');

  const { user } = useAuth();

  const [loadingNext, setLoadingNext] = useState(true);
  const [inactiveMessage, setInactiveMessage] = useState<string | null>(null);
  const [nextEvent, setNextEvent] = useState<NextEvent | null>(null);

  useEffect(() => {
    const loadNext = async () => {
      setLoadingNext(true);
      setInactiveMessage(null);
      setNextEvent(null);

      try {
        const authUserId = user?.id ?? null;
        if (!authUserId) {
          setInactiveMessage('Δεν βρέθηκε χρήστης. Κάνε ξανά login.');
          return;
        }

        const { data: student, error: studentErr } = await supabase
          .from('students')
          .select('id, school_id, full_name')
          .eq('auth_user_id', authUserId)
          .maybeSingle();

        if (studentErr || !student) {
          console.error('student load error', studentErr);
          setInactiveMessage('Δεν βρέθηκε μαθητής συνδεδεμένος με αυτόν τον λογαριασμό.');
          return;
        }

        const s = student as StudentRow;

        const { data: classStudents, error: csErr } = await supabase
          .from('class_students')
          .select('class_id, status')
          .eq('student_id', s.id)
          .eq('status', 'active');

        if (csErr) {
          console.error('class_students load error', csErr);
          setInactiveMessage('Αποτυχία φόρτωσης συνδρομής/τμημάτων.');
          return;
        }

        const activeClassIds =
          (classStudents as ClassStudentRow[] | null)?.map((r) => r.class_id) ?? [];

        if (activeClassIds.length === 0) {
          setInactiveMessage('Δεν έχεις ενεργή συνδρομή/τμήμα αυτή τη στιγμή.');
          return;
        }

        const now = new Date();
        const startISO = toYMD(now);
        const endISO = toYMD(addDays(now, 30));

        const [
          classesRes,
          tutorsRes,
          subjectsRes,
          programItemsRes,
          holidaysRes,
          testsRes,
          schoolEventsRes,
        ] = await Promise.all([
          supabase.from('classes').select('id, title, subject, subject_id, tutor_id').in('id', activeClassIds),
          supabase.from('tutors').select('id, full_name').eq('school_id', s.school_id),
          supabase.from('subjects').select('id, name').eq('school_id', s.school_id),
          supabase
            .from('program_items')
            .select('id, class_id, day_of_week, start_time, end_time, start_date, end_date, subject_id, tutor_id')
            .in('class_id', activeClassIds),
          supabase
            .from('school_holidays')
            .select('date, name')
            .eq('school_id', s.school_id)
            .gte('date', startISO)
            .lte('date', endISO),
          supabase
            .from('tests')
            .select('id, class_id, subject_id, test_date, start_time, end_time, title, active_during_holiday')
            .eq('school_id', s.school_id)
            .in('class_id', activeClassIds)
            .gte('test_date', startISO)
            .lte('test_date', endISO),
          supabase
            .from('school_events')
            .select('id, school_id, name, description, date, start_time, end_time')
            .eq('school_id', s.school_id)
            .gte('date', startISO)
            .lte('date', endISO),
        ]);

        const classes = (classesRes.data ?? []) as ClassRow[];
        const tutors = (tutorsRes.data ?? []) as TutorRow[];
        const subjects = (subjectsRes.data ?? []) as SubjectRow[];
        const programItems = (programItemsRes.data ?? []) as ProgramItemRow[];
        const holidays = (holidaysRes.data ?? []) as HolidayRow[];
        const tests = (testsRes.data ?? []) as TestRow[];
        const schoolEvents = (schoolEventsRes.data ?? []) as SchoolEventRow[];

        const tutorById = new Map<string, string>();
        tutors.forEach((t) => t.id && t.full_name && tutorById.set(t.id, t.full_name));

        const subjectById = new Map<string, string>();
        subjects.forEach((subj) => subjectById.set(subj.id, subj.name));

        const classById = new Map<string, ClassRow>();
        classes.forEach((c) => classById.set(c.id, c));

        const holidaySet = new Set<string>(holidays.map((h) => h.date));

        const programItemIds = programItems.map((pi) => pi.id);
        let overrides: ProgramItemOverrideRow[] = [];

        if (programItemIds.length > 0) {
          const { data: ovData, error: ovErr } = await supabase
            .from('program_item_overrides')
            .select('id, program_item_id, override_date, start_time, end_time, is_deleted, is_inactive, holiday_active_override')
            .in('program_item_id', programItemIds)
            .gte('override_date', startISO)
            .lte('override_date', endISO);

          if (ovErr) console.error('overrides load error', ovErr);
          overrides = (ovData ?? []) as ProgramItemOverrideRow[];
        }

        const overrideByKey = new Map<string, ProgramItemOverrideRow>();
        overrides.forEach((ov) => overrideByKey.set(`${ov.program_item_id}-${ov.override_date}`, ov));

        const candidates: NextEvent[] = [];

        const windowStart = new Date(startISO + 'T00:00:00');
        const windowEnd = new Date(endISO + 'T23:59:59');

        for (const item of programItems) {
          if (!item.day_of_week || !item.start_time || !item.end_time) continue;

          const dow = WEEKDAY_TO_INDEX[item.day_of_week];
          if (dow === undefined) continue;

          const cls = classById.get(item.class_id);
          if (!cls) continue;

          const patternStart = item.start_date ? new Date(item.start_date + 'T00:00:00') : new Date('1970-01-01T00:00:00');
          const patternEnd = item.end_date ? new Date(item.end_date + 'T23:59:59') : new Date('2999-12-31T23:59:59');

          const effectiveStart = patternStart > windowStart ? patternStart : windowStart;
          const effectiveEnd = patternEnd < windowEnd ? patternEnd : windowEnd;
          if (effectiveStart > effectiveEnd) continue;

          let current = getNextDateForDow(effectiveStart, dow);

          while (current <= effectiveEnd) {
            const dateStr = toYMD(current);
            const ov = overrideByKey.get(`${item.id}-${dateStr}`);

            if (ov?.is_deleted) {
              current = addDays(current, 7);
              continue;
            }

            const isHoliday = holidaySet.has(dateStr);
            const manualInactive = !!ov?.is_inactive;
            const holidayActiveOverride = !!ov?.holiday_active_override;
            const isInactive = manualInactive || (isHoliday && !holidayActiveOverride);

            if (isInactive) {
              current = addDays(current, 7);
              continue;
            }

            const startTime = ov?.start_time ?? item.start_time;
            const endTime = ov?.end_time ?? item.end_time;
            if (!startTime || !endTime) {
              current = addDays(current, 7);
              continue;
            }

            const start = buildDateTime(dateStr, startTime);
            const end = buildDateTime(dateStr, endTime);
            if (!start || !end) {
              current = addDays(current, 7);
              continue;
            }

            if (start > now) {
              const tutorName =
                (item.tutor_id && tutorById.get(item.tutor_id)) ||
                (cls.tutor_id && tutorById.get(cls.tutor_id)) ||
                null;

              const subjectName =
                (item.subject_id && subjectById.get(item.subject_id)) ||
                (cls.subject_id && subjectById.get(cls.subject_id)) ||
                cls.subject ||
                null;

              candidates.push({
                kind: 'program',
                start,
                end,
                tutorName,
                subjectName,
                classTitle: cls.title,
                title: null,
              });
            }

            current = addDays(current, 7);
          }
        }

        for (const t of tests) {
          const isHoliday = holidaySet.has(t.test_date);
          if (isHoliday && !t.active_during_holiday) continue;

          const startTime = t.start_time ?? '09:00:00';
          const endTime = t.end_time ?? '10:00:00';

          const start = buildDateTime(t.test_date, startTime);
          const end = buildDateTime(t.test_date, endTime);
          if (!start || !end) continue;
          if (start <= now) continue;

          const cls = classById.get(t.class_id);
          const subjectName = subjectById.get(t.subject_id) ?? cls?.subject ?? null;

          candidates.push({
            kind: 'test',
            start,
            end,
            subjectName,
            tutorName: null,
            classTitle: cls?.title ?? null,
            title: t.title ? `Διαγώνισμα · ${t.title}` : 'Διαγώνισμα',
          });
        }

        for (const ev of schoolEvents) {
          if (holidaySet.has(ev.date)) continue;

          const start = buildDateTime(ev.date, ev.start_time);
          const end = buildDateTime(ev.date, ev.end_time);
          if (!start || !end) continue;
          if (start <= now) continue;

          candidates.push({
            kind: 'schoolEvent',
            start,
            end,
            subjectName: null,
            tutorName: null,
            classTitle: null,
            title: ev.name,
          });
        }

        candidates.sort((a, b) => a.start.getTime() - b.start.getTime());
        const first = candidates[0] ?? null;

        setNextEvent(first);

        if (!first) {
          setInactiveMessage('Δεν βρέθηκε επόμενο event στο πρόγραμμα (επόμενες 30 ημέρες).');
        }
      } catch (e) {
        console.error('Next session load error', e);
        setInactiveMessage('Κάτι πήγε στραβά στη φόρτωση του επόμενου event.');
      } finally {
        setLoadingNext(false);
      }
    };

    loadNext();
  }, [user?.id]);

  const nextLabel = useMemo(() => {
    if (!nextEvent) return null;
    const day = formatDayLabel(nextEvent.start);
    const timeRange = `${formatTimeHHMM(nextEvent.start)} – ${formatTimeHHMM(nextEvent.end)}`;
    return `${day} · ${timeRange}`;
  }, [nextEvent]);

  const nextDateLabel = useMemo(() => {
    if (!nextEvent) return null;
    return formatDateDDMMYYYY(nextEvent.start);
  }, [nextEvent]);

  const nextTimeRange = useMemo(() => {
    if (!nextEvent) return null;
    return `${formatTimeHHMM(nextEvent.start)} – ${formatTimeHHMM(nextEvent.end)}`;
  }, [nextEvent]);

  return (
    <Card variant="glass">
      <View style={styles.cardHeader}>
        <CalendarDays size={18} color={icon} />
        <ThemedText style={[styles.cardTitle, { color: text }]}>Επόμενο session</ThemedText>
      </View>

      {loadingNext ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator />
          <ThemedText style={{ color: mutedText, fontWeight: '700' }}>Φόρτωση…</ThemedText>
        </View>
      ) : nextEvent ? (
        <>
          <ThemedText style={[styles.linePrimary, { color: text }]}>
            {nextEvent.subjectName ?? nextEvent.title ?? 'Event'}
          </ThemedText>

          {!!nextEvent.tutorName && (
            <ThemedText style={[styles.lineSecondary, { color: mutedText }]}>
              Καθηγητής: {nextEvent.tutorName}
            </ThemedText>
          )}

          {!!nextDateLabel && (
            <ThemedText style={[styles.lineSecondary, { color: mutedText }]}>
              Ημερομηνία: {nextDateLabel}
            </ThemedText>
          )}

          {!!nextTimeRange && (
            <ThemedText style={[styles.lineSecondary, { color: mutedText }]}>
              Ώρα: {nextTimeRange}
            </ThemedText>
          )}

          {nextLabel && (
            <ThemedText style={[styles.lineSecondary, { color: mutedText }]}>
              {nextLabel}
            </ThemedText>
          )}

          {!!nextEvent.classTitle && (
            <ThemedText style={[styles.lineHint, { color: mutedText }]}>
              Τμήμα: {nextEvent.classTitle}
            </ThemedText>
          )}
        </>
      ) : (
        <ThemedText style={[styles.lineSecondary, { color: mutedText }]}>
          {inactiveMessage ?? 'Δεν βρέθηκε επόμενο event.'}
        </ThemedText>
      )}

      {!loadingNext && inactiveMessage && !nextEvent && (
        <View style={[styles.notice, { borderColor: border }]}>
          <ThemedText style={[styles.noticeTitle, { color: text }]}>Συνδρομή / Τμήμα</ThemedText>
          <ThemedText style={[styles.noticeText, { color: mutedText }]}>{inactiveMessage}</ThemedText>
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '900',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: 6,
  },
  linePrimary: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.2,
  },
  lineSecondary: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  lineHint: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: '700',
    opacity: 0.9,
  },
  notice: {
    marginTop: Spacing.md,
    borderWidth: 1,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
  },
  noticeTitle: {
    fontSize: 14,
    fontWeight: '900',
  },
  noticeText: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
});
