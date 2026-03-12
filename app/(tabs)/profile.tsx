// app/(tabs)/profile.tsx
import { router } from 'expo-router';
import { CheckCircle2, LogOut, TriangleAlert } from 'lucide-react-native';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import AcademicInfoCard from '@/components/profile/AcademicInfoCard';
import ContactInfoCard from '@/components/profile/ContactInfoCard';
import ProfileHeader from '@/components/profile/ProfileHeader';
import SchoolInfoCard from '@/components/profile/SchoolInfoCard';
import StudentPackageCard from '@/components/profile/StudentPackageCard';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useThemeColor } from '@/hooks/use-theme-color';
import { supabase } from '@/lib/supabaseClient';

type ResultKind = 'success' | 'error';

type ParentsInfo = {
  father_name?: string | null; father_phone?: string | null;
  father_email?: string | null; father_date_of_birth?: string | null;
  mother_name?: string | null; mother_phone?: string | null;
  mother_email?: string | null; mother_date_of_birth?: string | null;
};

type StudentRow = {
  id: string; school_id: string; full_name: string;
  date_of_birth: string | null; phone: string | null; email: string | null; level_id: string | null;
  father_name: string | null; father_phone: string | null; father_email: string | null; father_date_of_birth: string | null;
  mother_name: string | null; mother_phone: string | null; mother_email: string | null; mother_date_of_birth: string | null;
};

const STUDENT_SELECT = `
  id, school_id, full_name, date_of_birth, phone, email, level_id,
  father_name, father_phone, father_email, father_date_of_birth,
  mother_name, mother_phone, mother_email, mother_date_of_birth
` as const;

export default function ProfileScreen() {
  const bg      = useThemeColor({}, 'background');
  const tint    = useThemeColor({}, 'tint');
  const surface = useThemeColor({}, 'surface');
  const text    = useThemeColor({}, 'text');
  const muted   = useThemeColor({}, 'mutedText');
  const border  = useThemeColor({}, 'border');

  const { user, loading: authLoading, signOut } = useAuth();

  const [loading,     setLoading]     = useState(true);
  const [student,     setStudent]     = useState<StudentRow | null>(null);
  const [levelName,   setLevelName]   = useState<string | null>(null);
  const [classTitle,  setClassTitle]  = useState<string | null>(null);
  const [error,       setError]       = useState<string | null>(null);
  const [loggingOut,  setLoggingOut]  = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const [resultOpen,  setResultOpen]  = useState(false);
  const [resultKind,  setResultKind]  = useState<ResultKind>('success');
  const [resultTitle, setResultTitle] = useState('');
  const [resultMsg,   setResultMsg]   = useState('');
  const resultTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (resultTimer.current) clearTimeout(resultTimer.current); }, []);

  const danger = useMemo(() => ({
    border:  'rgba(248,113,113,0.40)',
    bg:      'rgba(248,113,113,0.10)',
    bgPress: 'rgba(248,113,113,0.18)',
    icon:    '#F87171',
    text:    '#FECACA',
  }), []);

  const success = useMemo(() => ({
    border:  'rgba(34,197,94,0.40)',
    bg:      'rgba(34,197,94,0.10)',
    bgPress: 'rgba(34,197,94,0.18)',
    icon:    '#4ADE80',
    text:    '#DCFCE7',
  }), []);

  const closeResult = () => { if (resultTimer.current) clearTimeout(resultTimer.current); setResultOpen(false); };
  const openResult  = (kind: ResultKind, title: string, msg: string) => {
    setResultKind(kind); setResultTitle(title); setResultMsg(msg); setResultOpen(true);
    if (resultTimer.current) clearTimeout(resultTimer.current);
    resultTimer.current = setTimeout(() => setResultOpen(false), 2200);
  };

  const handleLogoutPress = () => { if (!loggingOut) setConfirmOpen(true); };
  const doLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await signOut();
      router.replace('/(auth)/login');
    } catch { openResult('error', 'Σφάλμα', 'Δεν έγινε αποσύνδεση. Δοκίμασε ξανά.'); }
    finally { setLoggingOut(false); setConfirmOpen(false); }
  };

  const titleName = useMemo(() => student?.full_name ?? '—', [student?.full_name]);
  const parents: ParentsInfo = useMemo(() => ({
    father_name: student?.father_name ?? null, father_phone: student?.father_phone ?? null,
    father_email: student?.father_email ?? null, father_date_of_birth: student?.father_date_of_birth ?? null,
    mother_name: student?.mother_name ?? null, mother_phone: student?.mother_phone ?? null,
    mother_email: student?.mother_email ?? null, mother_date_of_birth: student?.mother_date_of_birth ?? null,
  }), [student?.father_name, student?.father_phone, student?.father_email, student?.father_date_of_birth,
       student?.mother_name, student?.mother_phone, student?.mother_email, student?.mother_date_of_birth]);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      if (authLoading) return;
      setLoading(true); setError(null); setStudent(null); setLevelName(null); setClassTitle(null);
      if (!user?.id) { setLoading(false); return; }

      const { data: studentRow, error: sErr } = await supabase
        .from('students').select(STUDENT_SELECT).eq('auth_user_id', user.id).maybeSingle<StudentRow>();
      if (!alive) return;
      if (sErr) { setError('Αποτυχία φόρτωσης προφίλ.'); setLoading(false); return; }
      if (!studentRow) { setError('Δεν βρέθηκε προφίλ μαθητή.'); setLoading(false); return; }
      setStudent(studentRow);

      if (studentRow.level_id) {
        const { data: lvl } = await supabase.from('levels').select('name').eq('id', studentRow.level_id).maybeSingle<{ name: string }>();
        if (!alive) return;
        setLevelName(lvl?.name ?? null);
      }

      const { data: cs } = await supabase.from('class_students').select('class_id, created_at')
        .eq('student_id', studentRow.id).order('created_at', { ascending: false }).limit(1);
      if (!alive) return;
      const classId = cs?.[0]?.class_id ?? null;
      if (classId) {
        const { data: cl } = await supabase.from('classes').select('title').eq('id', classId).maybeSingle<{ title: string }>();
        if (!alive) return;
        setClassTitle(cl?.title ?? null);
      }
      setLoading(false);
    };
    load();
    return () => { alive = false; };
  }, [authLoading, user?.id]);

  if (authLoading || loading) {
    return (
      <ThemedView style={[styles.screen, { backgroundColor: bg }]}>
        <View style={styles.center}>
          <ActivityIndicator color={tint} />
          <ThemedText style={[styles.loadingText, { color: muted }]}>Φόρτωση προφίλ…</ThemedText>
        </View>
      </ThemedView>
    );
  }

  const resTheme = resultKind === 'success' ? success : danger;
  const ResIcon  = resultKind === 'success' ? CheckCircle2 : TriangleAlert;

  return (
    <ThemedView style={[styles.screen, { backgroundColor: bg }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <ProfileHeader fullName={titleName} />

        {error ? (
          <View style={[styles.errorBox, { borderColor: danger.border, backgroundColor: danger.bg }]}>
            <ThemedText style={[styles.errorText, { color: danger.text }]}>{error}</ThemedText>
          </View>
        ) : (
          <>
            <ContactInfoCard
              email={student?.email ?? null}
              phone={student?.phone ?? null}
              dateOfBirth={student?.date_of_birth ?? null}
              parents={parents}
            />
            <AcademicInfoCard levelName={levelName} classTitle={classTitle} />

            {student?.id && student?.school_id ? (
              <StudentPackageCard studentId={student.id} schoolId={student.school_id} />
            ) : null}

            {/* ── School info — passes school_id from the already-loaded student row ── */}
            {student?.school_id ? (
              <SchoolInfoCard schoolId={student.school_id} />
            ) : null}

            {/* ── Logout button ── */}
            <Pressable
              onPress={handleLogoutPress}
              disabled={loggingOut}
              style={({ pressed }) => [
                styles.logoutBtn,
                {
                  borderColor:     danger.border,
                  backgroundColor: pressed ? danger.bgPress : danger.bg,
                  opacity:         loggingOut ? 0.6 : 1,
                },
              ]}
            >
              {loggingOut
                ? <ActivityIndicator color={danger.icon} size="small" />
                : <LogOut size={16} color={danger.icon} strokeWidth={2.2} />
              }
              <ThemedText style={[styles.logoutText, { color: danger.text }]}>
                {loggingOut ? 'Γίνεται αποσύνδεση…' : 'Αποσύνδεση από τον λογαριασμό'}
              </ThemedText>
            </Pressable>
          </>
        )}

        <View style={{ height: Spacing.xl }} />
      </ScrollView>

      {/* ── Confirm logout modal ── */}
      <Modal transparent visible={confirmOpen} animationType="fade"
        onRequestClose={() => { if (!loggingOut) setConfirmOpen(false); }}>
        <View style={styles.backdrop}>
          <View style={[styles.modalCard, { backgroundColor: surface, borderColor: border }]}>
            <View style={styles.modalHeader}>
              <View style={[styles.iconWrap, { backgroundColor: danger.bg }]}>
                <LogOut size={16} color={danger.icon} strokeWidth={2.2} />
              </View>
              <ThemedText style={[styles.modalTitle, { color: text }]}>Αποσύνδεση</ThemedText>
            </View>

            <ThemedText style={[styles.modalMsg, { color: muted }]}>
              Θέλεις σίγουρα να αποσυνδεθείς;
            </ThemedText>

            <View style={styles.modalActions}>
              <Pressable
                disabled={loggingOut}
                onPress={() => setConfirmOpen(false)}
                style={({ pressed }) => [
                  styles.modalBtn,
                  {
                    borderColor:     border,
                    backgroundColor: pressed ? 'rgba(148,163,184,0.14)' : 'transparent',
                    opacity:         loggingOut ? 0.5 : 1,
                  },
                ]}
              >
                <ThemedText style={[styles.modalBtnText, { color: muted }]}>Ακύρωση</ThemedText>
              </Pressable>

              <Pressable
                disabled={loggingOut}
                onPress={doLogout}
                style={({ pressed }) => [
                  styles.modalBtn,
                  {
                    borderColor:     danger.border,
                    backgroundColor: pressed ? danger.bgPress : danger.bg,
                    opacity:         loggingOut ? 0.5 : 1,
                  },
                ]}
              >
                <ThemedText style={[styles.modalBtnText, { color: danger.text }]}>
                  {loggingOut ? 'Αποσύνδεση…' : 'Αποσύνδεση'}
                </ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Result modal ── */}
      <Modal transparent visible={resultOpen} animationType="fade" onRequestClose={closeResult}>
        <View style={styles.backdrop}>
          <View style={[styles.modalCard, { backgroundColor: surface, borderColor: border }]}>
            <View style={styles.modalHeader}>
              <View style={[styles.iconWrap, { backgroundColor: resTheme.bg }]}>
                <ResIcon size={16} color={resTheme.icon} strokeWidth={2.2} />
              </View>
              <ThemedText style={[styles.modalTitle, { color: text }]}>{resultTitle}</ThemedText>
            </View>

            <ThemedText style={[styles.modalMsg, { color: muted }]}>{resultMsg}</ThemedText>

            <View style={[styles.modalActions, { justifyContent: 'flex-end' }]}>
              <Pressable
                onPress={closeResult}
                style={({ pressed }) => [
                  styles.modalBtn,
                  {
                    borderColor:     resTheme.border,
                    backgroundColor: pressed ? resTheme.bgPress : resTheme.bg,
                  },
                ]}
              >
                <ThemedText style={[styles.modalBtnText, { color: resTheme.text }]}>OK</ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen:  { flex: 1 },
  content: { paddingTop: Spacing.xs, paddingBottom: Spacing.xl },

  center: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    padding: Spacing.lg, gap: Spacing.md,
  },
  loadingText: { fontSize: 13, fontWeight: '500' },

  errorBox: {
    marginHorizontal: Spacing.lg,
    marginTop:        Spacing.md,
    padding:          Spacing.lg,
    borderRadius:     Radius.xl,
    borderWidth:      1,
  },
  errorText: { fontSize: 13, fontWeight: '600' },

  // ── Logout button ────────────────────────────────────────────────────────
  logoutBtn: {
    marginHorizontal:  Spacing.lg,
    marginTop:         Spacing.md,
    borderRadius:      Radius.xl,
    borderWidth:       1,
    paddingVertical:   13,
    paddingHorizontal: Spacing.md,
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'center',
    gap:               Spacing.sm,
  },
  logoutText: { fontSize: 13, fontWeight: '700' },

  // ── Modals ────────────────────────────────────────────────────────────────
  backdrop: {
    flex:            1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems:      'center',
    justifyContent:  'center',
    padding:         Spacing.lg,
  },
  modalCard: {
    width:        '100%',
    maxWidth:     380,
    borderRadius: Radius.xl,
    borderWidth:  Platform.select({ ios: StyleSheet.hairlineWidth, default: 1 }),
    padding:      Spacing.lg,
    shadowColor:   '#000',
    shadowOpacity: 0.18,
    shadowRadius:  24,
    shadowOffset:  { width: 0, height: 10 },
    elevation:     14,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           Spacing.sm,
    marginBottom:  Spacing.sm,
  },
  iconWrap: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  modalTitle: { fontSize: 16, fontWeight: '700', letterSpacing: -0.2 },
  modalMsg:   { fontSize: 13, fontWeight: '400', lineHeight: 19 },
  modalActions: {
    marginTop:     Spacing.lg,
    flexDirection: 'row',
    gap:           Spacing.sm,
  },
  modalBtn: {
    flex:              1,
    borderRadius:      999,
    paddingVertical:   10,
    paddingHorizontal: 16,
    borderWidth:       1,
    alignItems:        'center',
    justifyContent:    'center',
  },
  modalBtnText: { fontSize: 13, fontWeight: '700' },
});