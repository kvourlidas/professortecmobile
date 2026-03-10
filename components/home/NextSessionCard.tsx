// components/home/NextSessionCard.tsx
import { Calendar, CalendarDays, Clock } from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabaseClient';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/Card';
import { Radius, Spacing } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';

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

type NextEvent = {
  kind: NextEventKind;
  start: Date; end: Date;
  subjectName: string | null; tutorName: string | null;
  classTitle: string | null; title: string | null;
};

const pad2 = (n: number) => n.toString().padStart(2, '0');
function toYMD(d: Date): string { return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`; }
function addDays(d: Date, days: number): Date { const x = new Date(d); x.setDate(x.getDate() + days); return x; }
function parseTimeToHM(t: string): {h:number;m:number}|null { const p = t.split(':'); if (p.length<2) return null; const h=Number(p[0]),m=Number(p[1]); return (isNaN(h)||isNaN(m)) ? null : {h,m}; }
function buildDateTime(dateISO: string, time: string): Date|null { const hm=parseTimeToHM(time); if (!hm) return null; const d=new Date(dateISO+'T00:00:00'); d.setHours(hm.h,hm.m,0,0); return d; }
function formatTimeHHMM(d: Date): string { return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`; }
function formatDateDDMMYYYY(d: Date): string { return `${pad2(d.getDate())}/${pad2(d.getMonth()+1)}/${d.getFullYear()}`; }
function getNextDateForDow(from: Date, dow: number): Date { const d=new Date(from); const diff=(dow-d.getDay()+7)%7; d.setDate(d.getDate()+diff); return d; }

const WEEKDAY_TO_INDEX: Record<string,number> = { sunday:0, monday:1, tuesday:2, wednesday:3, thursday:4, friday:5, saturday:6 };
const WEEKDAY_GR = ['Κυριακή','Δευτέρα','Τρίτη','Τετάρτη','Πέμπτη','Παρασκευή','Σάββατο'];

function formatDayLabel(d: Date): string {
  const today    = toYMD(new Date());
  const target   = toYMD(d);
  const tomorrow = toYMD(addDays(new Date(), 1));
  if (target === today)    return 'Σήμερα';
  if (target === tomorrow) return 'Αύριο';
  return WEEKDAY_GR[d.getDay()];
}

// Kind → accent colour
const KIND_DOT: Record<NextEventKind, string> = {
  program:     '#4F6EF7',
  test:        '#FBBF24',
  schoolEvent: '#22C55E',
};
const KIND_LABEL: Record<NextEventKind, string> = {
  program:     'Μάθημα',
  test:        'Διαγώνισμα',
  schoolEvent: 'Εκδήλωση',
};

export default function NextSessionCard() {
  const text   = useThemeColor({}, 'text');
  const muted  = useThemeColor({}, 'mutedText');
  const border = useThemeColor({}, 'border');
  const tint   = useThemeColor({}, 'tint');
  const surface = useThemeColor({}, 'surface');

  const { user } = useAuth();

  const [loadingNext,     setLoadingNext]     = useState(true);
  const [inactiveMessage, setInactiveMessage] = useState<string | null>(null);
  const [nextEvent,       setNextEvent]       = useState<NextEvent | null>(null);

  useEffect(() => {
    const loadNext = async () => {
      setLoadingNext(true); setInactiveMessage(null); setNextEvent(null);
      try {
        if (!user?.id) { setInactiveMessage('Δεν βρέθηκε χρήστης.'); return; }

        const { data: student, error: sErr } = await supabase.from('students').select('id, school_id, full_name').eq('auth_user_id', user.id).maybeSingle();
        if (sErr || !student) { setInactiveMessage('Δεν βρέθηκε μαθητής.'); return; }
        const s = student as StudentRow;

        const { data: cs, error: csErr } = await supabase.from('class_students').select('class_id, status').eq('student_id', s.id).eq('status', 'active');
        if (csErr) { setInactiveMessage('Αποτυχία φόρτωσης τμημάτων.'); return; }
        const activeClassIds = (cs as ClassStudentRow[]|null)?.map((r) => r.class_id) ?? [];
        if (!activeClassIds.length) { setInactiveMessage('Δεν έχεις ενεργή συνδρομή/τμήμα.'); return; }

        const now = new Date();
        const startISO = toYMD(now); const endISO = toYMD(addDays(now, 30));

        const [classesRes, tutorsRes, subjectsRes, programItemsRes, holidaysRes, testsRes, schoolEventsRes] = await Promise.all([
          supabase.from('classes').select('id, title, subject, subject_id, tutor_id').in('id', activeClassIds),
          supabase.from('tutors').select('id, full_name').eq('school_id', s.school_id),
          supabase.from('subjects').select('id, name').eq('school_id', s.school_id),
          supabase.from('program_items').select('id, class_id, day_of_week, start_time, end_time, start_date, end_date, subject_id, tutor_id').in('class_id', activeClassIds),
          supabase.from('school_holidays').select('date, name').eq('school_id', s.school_id).gte('date', startISO).lte('date', endISO),
          supabase.from('tests').select('id, class_id, subject_id, test_date, start_time, end_time, title, active_during_holiday').eq('school_id', s.school_id).in('class_id', activeClassIds).gte('test_date', startISO).lte('test_date', endISO),
          supabase.from('school_events').select('id, school_id, name, description, date, start_time, end_time').eq('school_id', s.school_id).gte('date', startISO).lte('date', endISO),
        ]);

        const classes      = (classesRes.data      ?? []) as ClassRow[];
        const tutors       = (tutorsRes.data       ?? []) as TutorRow[];
        const subjects     = (subjectsRes.data     ?? []) as SubjectRow[];
        const programItems = (programItemsRes.data ?? []) as ProgramItemRow[];
        const holidays     = (holidaysRes.data     ?? []) as HolidayRow[];
        const tests        = (testsRes.data        ?? []) as TestRow[];
        const schoolEvents = (schoolEventsRes.data ?? []) as SchoolEventRow[];

        const tutorById   = new Map<string,string>(); tutors.forEach((t) => { if (t.id && t.full_name) tutorById.set(t.id, t.full_name); });
        const subjectById = new Map<string,string>(); subjects.forEach((s) => { if (s.id) subjectById.set(s.id, s.name); });
        const classById   = new Map<string,ClassRow>(); classes.forEach((c) => classById.set(c.id, c));
        const holidaySet  = new Set<string>(holidays.map((h) => h.date));

        const programItemIds = programItems.map((pi) => pi.id);
        let overrides: ProgramItemOverrideRow[] = [];
        if (programItemIds.length) {
          const { data: ovData } = await supabase.from('program_item_overrides').select('id, program_item_id, override_date, start_time, end_time, is_deleted, is_inactive, holiday_active_override').in('program_item_id', programItemIds).gte('override_date', startISO).lte('override_date', endISO);
          overrides = (ovData ?? []) as ProgramItemOverrideRow[];
        }
        const overrideByKey = new Map<string,ProgramItemOverrideRow>();
        overrides.forEach((ov) => overrideByKey.set(`${ov.program_item_id}-${ov.override_date}`, ov));

        const candidates: NextEvent[] = [];
        const windowStart = new Date(startISO+'T00:00:00');
        const windowEnd   = new Date(endISO+'T23:59:59');

        for (const item of programItems) {
          if (!item.day_of_week || !item.start_time || !item.end_time) continue;
          const dow = WEEKDAY_TO_INDEX[item.day_of_week]; if (dow === undefined) continue;
          const cls = classById.get(item.class_id); if (!cls) continue;
          const pStart = item.start_date ? new Date(item.start_date+'T00:00:00') : new Date('1970-01-01');
          const pEnd   = item.end_date   ? new Date(item.end_date  +'T23:59:59') : new Date('2999-12-31');
          const eStart = pStart > windowStart ? pStart : windowStart;
          const eEnd   = pEnd   < windowEnd   ? pEnd   : windowEnd;
          if (eStart > eEnd) continue;
          let cur = getNextDateForDow(eStart, dow);
          while (cur <= eEnd) {
            const dateStr = toYMD(cur);
            const ov = overrideByKey.get(`${item.id}-${dateStr}`);
            if (ov?.is_deleted) { cur = addDays(cur, 7); continue; }
            const isInactive = !!ov?.is_inactive || (holidaySet.has(dateStr) && !ov?.holiday_active_override);
            if (isInactive) { cur = addDays(cur, 7); continue; }
            const st = ov?.start_time ?? item.start_time; const et = ov?.end_time ?? item.end_time;
            if (!st || !et) { cur = addDays(cur, 7); continue; }
            const start = buildDateTime(dateStr, st); const end = buildDateTime(dateStr, et);
            if (!start || !end) { cur = addDays(cur, 7); continue; }
            if (start > now) {
              candidates.push({ kind: 'program', start, end,
                tutorName:   (item.tutor_id ? tutorById.get(item.tutor_id) : undefined) ?? (cls.tutor_id ? tutorById.get(cls.tutor_id) : undefined) ?? null,
                subjectName: (item.subject_id ? subjectById.get(item.subject_id) : undefined) ?? (cls.subject_id ? subjectById.get(cls.subject_id) : undefined) ?? cls.subject ?? null,
                classTitle: cls.title, title: null });
            }
            cur = addDays(cur, 7);
          }
        }

        for (const t of tests) {
          if (holidaySet.has(t.test_date) && !t.active_during_holiday) continue;
          const start = buildDateTime(t.test_date, t.start_time ?? '09:00:00');
          const end   = buildDateTime(t.test_date, t.end_time   ?? '10:00:00');
          if (!start || !end || start <= now) continue;
          const cls = classById.get(t.class_id);
          candidates.push({ kind: 'test', start, end, subjectName: subjectById.get(t.subject_id) ?? cls?.subject ?? null, tutorName: null, classTitle: cls?.title ?? null, title: t.title ? `Διαγώνισμα · ${t.title}` : 'Διαγώνισμα' });
        }

        for (const ev of schoolEvents) {
          if (holidaySet.has(ev.date)) continue;
          const start = buildDateTime(ev.date, ev.start_time); const end = buildDateTime(ev.date, ev.end_time);
          if (!start || !end || start <= now) continue;
          candidates.push({ kind: 'schoolEvent', start, end, subjectName: null, tutorName: null, classTitle: null, title: ev.name });
        }

        candidates.sort((a, b) => a.start.getTime() - b.start.getTime());
        const first = candidates[0] ?? null;
        setNextEvent(first);
        if (!first) setInactiveMessage('Δεν βρέθηκε επόμενο event στο πρόγραμμα (30 ημέρες).');
      } catch (e) {
        console.error('Next session load error', e);
        setInactiveMessage('Κάτι πήγε στραβά στη φόρτωση.');
      } finally {
        setLoadingNext(false);
      }
    };
    loadNext();
  }, [user?.id]);

  const dayLabel      = useMemo(() => nextEvent ? formatDayLabel(nextEvent.start)       : null, [nextEvent]);
  const dateLabel     = useMemo(() => nextEvent ? formatDateDDMMYYYY(nextEvent.start)   : null, [nextEvent]);
  const timeRange     = useMemo(() => nextEvent ? `${formatTimeHHMM(nextEvent.start)} – ${formatTimeHHMM(nextEvent.end)}` : null, [nextEvent]);
  const accentColor   = nextEvent ? KIND_DOT[nextEvent.kind] : tint;
  const kindLabel     = nextEvent ? KIND_LABEL[nextEvent.kind] : null;

  return (
    <Card elevation="sm">
      {/* Card title row */}
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <CalendarDays size={16} color={tint} strokeWidth={2} />
          <ThemedText style={[styles.cardTitle, { color: text }]}>Επόμενο μάθημα</ThemedText>
        </View>
        {kindLabel && (
          <View style={[styles.kindBadge, { backgroundColor: accentColor + '18' }]}>
            <ThemedText style={[styles.kindBadgeText, { color: accentColor }]}>{kindLabel}</ThemedText>
          </View>
        )}
      </View>

      {loadingNext ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator color={tint} size="small" />
          <ThemedText style={[styles.loadingText, { color: muted }]}>Φόρτωση…</ThemedText>
        </View>
      ) : nextEvent ? (
        <View style={styles.body}>
          {/* Left accent bar */}
          <View style={[styles.accentBar, { backgroundColor: accentColor }]} />

          <View style={styles.bodyContent}>
            {/* Subject / title */}
            <View style={styles.subjectRow}>
              {!!nextEvent.classTitle && (
                <>
                  <ThemedText style={[styles.classText, { color: accentColor }]} numberOfLines={1}>
                    {nextEvent.classTitle}
                  </ThemedText>
                  <ThemedText style={[styles.dot, { color: muted }]}>·</ThemedText>
                </>
              )}
              <ThemedText style={[styles.subjectText, { color: text }]} numberOfLines={1}>
                {nextEvent.subjectName ?? nextEvent.title ?? 'Event'}
              </ThemedText>
            </View>

            {!!nextEvent.tutorName && (
              <ThemedText style={[styles.tutorText, { color: muted }]}>{nextEvent.tutorName}</ThemedText>
            )}

            {/* Meta row */}
            <View style={[styles.metaStrip, { borderTopColor: border }]}>
              {!!dayLabel && (
                <View style={styles.metaItem}>
                  <CalendarDays size={12} color={muted} strokeWidth={2} />
                  <ThemedText style={[styles.metaText, { color: muted }]}>{dayLabel}</ThemedText>
                </View>
              )}
              {!!dateLabel && (
                <View style={styles.metaItem}>
                  <Calendar size={12} color={muted} strokeWidth={2} />
                  <ThemedText style={[styles.metaText, { color: muted }]}>{dateLabel}</ThemedText>
                </View>
              )}
              {!!timeRange && (
                <View style={styles.metaItem}>
                  <Clock size={12} color={muted} strokeWidth={2} />
                  <ThemedText style={[styles.metaText, { color: muted }]}>{timeRange}</ThemedText>
                </View>
              )}
            </View>
          </View>
        </View>
      ) : (
        <View style={[styles.emptyBox, { borderColor: border }]}>
          <ThemedText style={[styles.emptyText, { color: muted }]}>
            {inactiveMessage ?? 'Δεν βρέθηκε επόμενο event.'}
          </ThemedText>
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  cardHeader: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    marginBottom:   Spacing.md,
  },
  cardHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  cardTitle:      { fontSize: 14, fontWeight: '700', letterSpacing: 0.1 },

  kindBadge: {
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 999,
  },
  kindBadgeText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.2 },

  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: 6 },
  loadingText: { fontSize: 13, fontWeight: '500' },

  body: { flexDirection: 'row', gap: Spacing.md, alignItems: 'stretch' },

  accentBar: { width: 3, borderRadius: 999, minHeight: 50 },

  bodyContent: { flex: 1, gap: 4 },

  subjectRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  classText:  { fontSize: 12, fontWeight: '700' },
  dot:        { fontSize: 13, fontWeight: '400' },
  subjectText:{ fontSize: 17, fontWeight: '800', letterSpacing: -0.3, flex: 1 },
  tutorText:  { fontSize: 12, fontWeight: '500' },

  metaStrip: {
    flexDirection:  'row',
    flexWrap:       'wrap',
    gap:            Spacing.md,
    marginTop:      Spacing.sm,
    paddingTop:     Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12, fontWeight: '500' },

  emptyBox: { borderWidth: 1, borderRadius: Radius.lg, padding: Spacing.md, marginTop: 4 },
  emptyText:{ fontSize: 12, fontWeight: '500', lineHeight: 18 },
});