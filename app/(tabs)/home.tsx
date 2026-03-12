// app/(tabs)/home.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  useColorScheme,
  View,
} from 'react-native';

import { Bell, CheckCircle2, TriangleAlert } from 'lucide-react-native';

import NextSessionCard from '@/components/home/NextSessionCard';
import SchoolFeedbackCard from '@/components/home/SchoolFeedbackCard';
import SchoolMessagesCard from '@/components/home/SchoolMessagesCard';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useThemeColor } from '@/hooks/use-theme-color';
import { supabase } from '@/lib/supabaseClient';

const LOGO_LIGHT = require('@/assets/images/edra-primary-transparent-light(PNG)(1).png');
const LOGO_DARK  = require('@/assets/images/edra-primary-transparent-dark(PNG).png');

type ResultKind = 'success' | 'error';
const FEEDBACK_CACHE_KEY = 'pt_student_feedback_v1';

export default function HomeScreen() {
  const bg      = useThemeColor({}, 'background');
  const surface = useThemeColor({}, 'surface');
  const text    = useThemeColor({}, 'text');
  const muted   = useThemeColor({}, 'mutedText');
  const border  = useThemeColor({}, 'border');
  const tint    = useThemeColor({}, 'tint');

  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const { user } = useAuth();

  const [fbLoading,       setFbLoading]       = useState(true);
  const [initialRating,   setInitialRating]   = useState(0);
  const [initialFeedback, setInitialFeedback] = useState('');
  const [unreadCount,     setUnreadCount]     = useState(0);

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

  const closeResult = () => {
    if (resultTimer.current) clearTimeout(resultTimer.current);
    setResultOpen(false);
  };

  const openResult = (kind: ResultKind, title: string, msg: string) => {
    setResultKind(kind);
    setResultTitle(title);
    setResultMsg(msg);
    setResultOpen(true);
    if (resultTimer.current) clearTimeout(resultTimer.current);
    resultTimer.current = setTimeout(() => setResultOpen(false), 2200);
  };

  const cacheFeedback = async (payload: { rating: number; feedback: string }) => {
    try { await AsyncStorage.setItem(FEEDBACK_CACHE_KEY, JSON.stringify(payload)); } catch {}
  };

  const loadCachedFeedback = async (): Promise<{ rating: number; feedback: string } | null> => {
    try {
      const raw = await AsyncStorage.getItem(FEEDBACK_CACHE_KEY);
      if (!raw) return null;
      const p = JSON.parse(raw);
      return { rating: Number.isFinite(Number(p?.rating)) ? Number(p.rating) : 0, feedback: String(p?.feedback ?? '') };
    } catch { return null; }
  };

  const setFeedbackState = (rating: number, feedback: string) => {
    setInitialRating(Math.max(0, Math.min(5, Number(rating || 0))));
    setInitialFeedback(String(feedback ?? ''));
  };

  const loadUnreadNotifications = async () => {
    try {
      if (!user?.id) { setUnreadCount(0); return; }
      const { count, error } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .is('read_at', null);
      if (error) { setUnreadCount(0); return; }
      setUnreadCount(count ?? 0);
    } catch { setUnreadCount(0); }
  };

  const loadMyFeedback = async () => {
    setFbLoading(true);
    const cached = await loadCachedFeedback();
    if (cached) setFeedbackState(cached.rating, cached.feedback);

    try {
      if (!user?.id) { setFbLoading(false); return; }

      const rpcRes = await supabase.rpc('get_my_student_feedback');
      if (!rpcRes.error && rpcRes.data) {
        const row = Array.isArray(rpcRes.data) ? rpcRes.data[0] : rpcRes.data;
        const r = Number(row?.rating ?? 0);
        const f = String(row?.feedback ?? '');
        setFeedbackState(r, f);
        await cacheFeedback({ rating: r, feedback: f });
        setFbLoading(false);
        return;
      }

      const { data: student, error: sErr } = await supabase
        .from('students').select('id, school_id').eq('auth_user_id', user.id)
        .order('created_at', { ascending: false }).limit(1).maybeSingle();

      if (sErr || !student) { setFbLoading(false); return; }

      const { data: fbRow, error: fbErr } = await supabase
        .from('student_feedback').select('rating, feedback, updated_at')
        .eq('student_id', student.id).eq('school_id', student.school_id)
        .order('updated_at', { ascending: false }).limit(1).maybeSingle();

      if (!fbErr && fbRow) {
        const r = Number(fbRow.rating ?? 0);
        const f = String(fbRow.feedback ?? '');
        setFeedbackState(r, f);
        await cacheFeedback({ rating: r, feedback: f });
      }
    } catch (e) {
      console.error('loadMyFeedback crash:', e);
    } finally {
      setFbLoading(false);
    }
  };

  const submitFeedback = async (rating: number, feedback: string) => {
    try {
      const { error } = await supabase.rpc('submit_student_feedback', {
        p_rating: rating, p_feedback: feedback,
      });
      if (error) { openResult('error', 'Σφάλμα', 'Δεν μπόρεσε να σταλεί το feedback.'); return; }
      await cacheFeedback({ rating, feedback });
      setFeedbackState(rating, feedback);
      await loadMyFeedback();
      openResult('success', 'Ευχαριστούμε!', 'Το feedback σου καταχωρήθηκε.');
    } catch { openResult('error', 'Σφάλμα', 'Κάτι πήγε στραβά. Δοκίμασε ξανά.'); }
  };

  useEffect(() => {
    loadMyFeedback();
    loadUnreadNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useFocusEffect(
    React.useCallback(() => {
      loadMyFeedback();
      loadUnreadNotifications();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id]),
  );

  const resTheme = resultKind === 'success' ? success : danger;
  const ResIcon  = resultKind === 'success' ? CheckCircle2 : TriangleAlert;

  return (
    <ThemedView style={[styles.screen, { backgroundColor: bg }]}>

      {/* ── Top bar ── */}
      <View style={styles.topBar}>

        {/* Left spacer — same width as bell so logo stays truly centered */}
        <View style={styles.bellPlaceholder} />

        {/* Center — logo overflows the 52px header above and below */}
        <View style={styles.logoWrap}>
          <Image
            source={isDark ? LOGO_DARK : LOGO_LIGHT}
            style={styles.logo}
            resizeMode="cover"
          />
        </View>

        {/* Right — notification bell */}
        <Pressable
          onPress={() => router.push('/notifications')}
          style={({ pressed }) => [
            styles.bellBtn,
            {
              backgroundColor: pressed ? tint + '18' : surface,
              borderColor:     border,
            },
          ]}
        >
          <Bell size={18} color={tint} strokeWidth={2} />
          {unreadCount > 0 && (
            <View style={[styles.badge, { backgroundColor: tint }]}>
              <ThemedText style={styles.badgeText}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </ThemedText>
            </View>
          )}
        </Pressable>
      </View>

      {/* ── Content ── */}
      <NextSessionCard />

      <View style={{ marginTop: Spacing.md }}>
        {fbLoading ? (
          <View style={[styles.loadingBox, { borderColor: border, backgroundColor: surface }]}>
            <ActivityIndicator color={tint} size="small" />
            <ThemedText style={[styles.loadingText, { color: muted }]}>
              Φόρτωση feedback…
            </ThemedText>
          </View>
        ) : (
          <SchoolFeedbackCard
            initialRating={initialRating}
            initialFeedback={initialFeedback}
            onSubmit={async ({ rating, feedback }) => submitFeedback(rating, feedback)}
          />
        )}
      </View>

      <View style={{ marginTop: Spacing.md }}>
        <SchoolMessagesCard />
      </View>

      {/* ── Result modal ── */}
      <Modal transparent visible={resultOpen} animationType="fade" onRequestClose={closeResult}>
        <View style={styles.backdrop}>
          <View style={[styles.modalCard, { backgroundColor: surface, borderColor: border }]}>
            <View style={styles.modalHeader}>
              <View style={[styles.iconWrap, { backgroundColor: resTheme.bg }]}>
                <ResIcon size={16} color={resTheme.icon} strokeWidth={2.2} />
              </View>
              <ThemedText style={[styles.modalTitle, { color: text }]}>
                {resultTitle}
              </ThemedText>
            </View>
            <ThemedText style={[styles.modalMsg, { color: muted }]}>
              {resultMsg}
            </ThemedText>
            <View style={styles.modalActions}>
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
                <ThemedText style={[styles.modalBtnText, { color: resTheme.text }]}>
                  OK
                </ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
}

const BELL_SIZE = 42;

const styles = StyleSheet.create({
  screen: {
    flex:       1,
    padding:    Spacing.lg,
    paddingTop: Platform.select({ ios: 56, default: Spacing.xl }),
  },

  // ── Top bar ───────────────────────────────────────────────────────────────
  topBar: {
    flexDirection:  'row',
    alignItems:     'center',
    height:         52,
    marginBottom:   Spacing.lg,
    overflow:       'visible',
  },

  bellPlaceholder: {
    width: BELL_SIZE,
  },

  logoWrap: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'center',
    overflow:       'visible',
  },

  logo: {
    width:  220,
    height: 52,
  },

  // ── Bell ─────────────────────────────────────────────────────────────────
  bellBtn: {
    width:          BELL_SIZE,
    height:         BELL_SIZE,
    borderRadius:   BELL_SIZE / 2,
    borderWidth:    StyleSheet.hairlineWidth,
    alignItems:     'center',
    justifyContent: 'center',
  },
  badge: {
    position:          'absolute',
    top:               -5,
    right:             -5,
    minWidth:          18,
    height:            18,
    borderRadius:      9,
    alignItems:        'center',
    justifyContent:    'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    fontSize:           10,
    fontWeight:         '800',
    color:              '#fff',
    includeFontPadding: false,
  },

  // ── Loading box ────────────────────────────────────────────────────────────
  loadingBox: {
    borderWidth:   StyleSheet.hairlineWidth,
    borderRadius:  Radius.xl,
    padding:       Spacing.lg,
    flexDirection: 'row',
    alignItems:    'center',
    gap:           Spacing.sm,
  },
  loadingText: {
    fontSize:   13,
    fontWeight: '500',
  },

  // ── Modal ──────────────────────────────────────────────────────────────────
  backdrop: {
    flex:            1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems:      'center',
    justifyContent:  'center',
    padding:         Spacing.lg,
  },
  modalCard: {
    width:         '100%',
    maxWidth:      380,
    borderRadius:  Radius.xl,
    borderWidth:   Platform.select({ ios: StyleSheet.hairlineWidth, default: 1 }),
    padding:       Spacing.lg,
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
    width:          32,
    height:         32,
    borderRadius:   16,
    alignItems:     'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize:      16,
    fontWeight:    '700',
    letterSpacing: -0.2,
  },
  modalMsg: {
    fontSize:   13,
    fontWeight: '400',
    lineHeight: 19,
  },
  modalActions: {
    marginTop:      Spacing.lg,
    flexDirection:  'row',
    justifyContent: 'flex-end',
  },
  modalBtn: {
    borderRadius:      999,
    paddingVertical:   9,
    paddingHorizontal: 22,
    borderWidth:       1,
    alignItems:        'center',
    justifyContent:    'center',
  },
  modalBtnText: {
    fontSize:   13,
    fontWeight: '700',
  },
});