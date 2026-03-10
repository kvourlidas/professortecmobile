// app/messages/index.tsx
import { router, Stack } from 'expo-router';
import { ChevronLeft, RefreshCw, Send } from 'lucide-react-native';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { supabase } from '@/lib/supabaseClient';

type MsgRow = {
  id:          string;
  body:        string;
  sender_role: 'student' | 'school';
  created_at:  string;
};

type ThreadMeta = {
  school_id:  string;
  student_id: string;
};

type ListRow =
  | { type: 'divider'; id: string; label: string }
  | { type: 'msg';     id: string; item: MsgRow  };

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit' });
  } catch { return ''; }
}

function formatDay(iso: string): string {
  try {
    const d         = new Date(iso);
    const now       = new Date();
    const sameDay   = (a: Date, b: Date) =>
      a.getDate()     === b.getDate()     &&
      a.getMonth()    === b.getMonth()    &&
      a.getFullYear() === b.getFullYear();
    if (sameDay(d, now)) return 'Σήμερα';
    const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
    if (sameDay(d, yesterday)) return 'Χθες';
    return d.toLocaleDateString('el-GR', { day: '2-digit', month: '2-digit', year: '2-digit' });
  } catch { return ''; }
}

export default function MessagesScreen() {
  const bg      = useThemeColor({}, 'background');
  const surface = useThemeColor({}, 'surface');
  const text    = useThemeColor({}, 'text');
  const muted   = useThemeColor({}, 'mutedText');
  const tint    = useThemeColor({}, 'tint');
  const border  = useThemeColor({}, 'border');

  const [loading,    setLoading]    = useState(true);
  const [threadId,   setThreadId]   = useState<string | null>(null);
  const [threadMeta, setThreadMeta] = useState<ThreadMeta | null>(null);
  const [messages,   setMessages]   = useState<MsgRow[]>([]);
  const [draft,      setDraft]      = useState('');
  const [sending,    setSending]    = useState(false);

  // ✅ Untyped ref — avoids the union generic conflict entirely.
  //    We only ever call .scrollToEnd() on it which is available on any FlatList.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const listRef       = useRef<any>(null);
  const isAtBottomRef = useRef(true);

  const canSend = useMemo(
    () => draft.trim().length > 0 && !sending && !!threadId && !!threadMeta,
    [draft, sending, threadId, threadMeta],
  );

  const scrollToBottom = (animated: boolean) => {
    requestAnimationFrame(() => {
      try { listRef.current?.scrollToEnd({ animated }); } catch {}
    });
  };

  const onListScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
    isAtBottomRef.current =
      layoutMeasurement.height + contentOffset.y >= contentSize.height - 48;
  };

  const markThreadRead = async (tid: string) => {
    try {
      const { error } = await supabase.rpc('student_mark_thread_read', { p_thread_id: tid });
      if (error) console.error('student_mark_thread_read error:', error);
    } catch (e) { console.error('markThreadRead crash:', e); }
  };

  const fetchMessages = async (tid: string, shouldScrollIfAtBottom = true) => {
    const { data, error } = await supabase
      .from('messages')
      .select('id, body, sender_role, created_at')
      .eq('thread_id', tid)
      .order('created_at', { ascending: true });
    if (error) throw error;
    setMessages((data ?? []) as MsgRow[]);
    if (shouldScrollIfAtBottom && isAtBottomRef.current) scrollToBottom(false);
  };

  const loadThreadAndMessages = async () => {
    setLoading(true);
    try {
      const { data: tid, error: tErr } = await supabase.rpc('get_or_create_message_thread');
      if (tErr) throw tErr;
      const id = typeof tid === 'string' ? tid : (tid as any);
      if (!id) throw new Error('No thread id');
      setThreadId(id);
      await markThreadRead(id);

      const { data: mt, error: mtErr } = await supabase
        .from('message_threads').select('school_id, student_id').eq('id', id).maybeSingle();
      setThreadMeta((!mtErr && mt?.school_id && mt?.student_id)
        ? { school_id: mt.school_id, student_id: mt.student_id }
        : null);

      await fetchMessages(id, false);
      isAtBottomRef.current = true;
      scrollToBottom(false);
    } catch (e) {
      console.error('loadThreadAndMessages error:', e);
    } finally { setLoading(false); }
  };

  const handleRefresh = async () => {
    if (!threadId) { await loadThreadAndMessages(); return; }
    setLoading(true);
    try {
      await markThreadRead(threadId);
      await fetchMessages(threadId, true);
    } catch (e) { console.error('handleRefresh error:', e); }
    finally { setLoading(false); }
  };

  const sendMessage = async () => {
    const body = draft.trim();
    if (!body || !threadId || !threadMeta || sending) return;
    setSending(true);
    try {
      const { data: userRes, error: userErr } = await supabase.auth.getUser();
      if (userErr) throw userErr;
      const uid = userRes?.user?.id;
      if (!uid) return;
      const { error } = await supabase.from('messages').insert({
        thread_id:      threadId,
        school_id:      threadMeta.school_id,
        student_id:     threadMeta.student_id,
        body,
        sender_role:    'student',
        sender_user_id: uid,
      });
      if (error) throw error;
      setDraft('');
      isAtBottomRef.current = true;
      await fetchMessages(threadId, true);
      scrollToBottom(true);
    } catch (e) { console.error('sendMessage error:', e); }
    finally { setSending(false); }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadThreadAndMessages(); }, []);

  useEffect(() => {
    if (!threadId) return;
    markThreadRead(threadId);
    const channel = supabase
      .channel(`messages_thread_${threadId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'messages', filter: `thread_id=eq.${threadId}` },
        async () => {
          try {
            await markThreadRead(threadId);
            await fetchMessages(threadId, true);
          } catch (e) { console.error('realtime refresh error:', e); }
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId]);

  const groupedMessages = useMemo((): ListRow[] => {
    const result: ListRow[] = [];
    let lastDay = '';
    for (const msg of messages) {
      const day = formatDay(msg.created_at);
      if (day !== lastDay) {
        result.push({ type: 'divider', id: `div-${msg.created_at}-${day}`, label: day });
        lastDay = day;
      }
      result.push({ type: 'msg', id: msg.id, item: msg });
    }
    return result;
  }, [messages]);

  const renderRow = ({ item }: { item: ListRow }) => {
    if (item.type === 'divider') {
      return (
        <View style={styles.dividerRow}>
          <View style={[styles.dividerLine, { backgroundColor: border }]} />
          <ThemedText style={[styles.dividerLabel, { color: muted }]}>{item.label}</ThemedText>
          <View style={[styles.dividerLine, { backgroundColor: border }]} />
        </View>
      );
    }

    const msg  = item.item;
    const mine = msg.sender_role === 'student';

    return (
      <View style={[styles.bubbleRow, { justifyContent: mine ? 'flex-end' : 'flex-start' }]}>
        {!mine && (
          <View style={[styles.avatarDot, { backgroundColor: tint + '28', borderColor: tint + '40' }]}>
            <ThemedText style={[styles.avatarLetter, { color: tint }]}>Σ</ThemedText>
          </View>
        )}

        <View style={styles.bubbleCol}>
          <View style={[
            styles.bubble,
            mine
              ? { backgroundColor: tint,   borderColor: tint,   alignSelf: 'flex-end',   borderBottomRightRadius: 4 }
              : { backgroundColor: surface, borderColor: border, alignSelf: 'flex-start', borderBottomLeftRadius:  4 },
          ]}>
            <ThemedText style={[styles.bubbleText, { color: mine ? '#fff' : text }]}>
              {msg.body}
            </ThemedText>
          </View>
          <ThemedText style={[
            styles.bubbleTime,
            { color: muted, alignSelf: mine ? 'flex-end' : 'flex-start' },
          ]}>
            {formatTime(msg.created_at)}
          </ThemedText>
        </View>
      </View>
    );
  };

  return (
    <ThemedView style={[styles.screen, { backgroundColor: bg }]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* ── Header ── */}
      <View style={[styles.header, { borderBottomColor: border }]}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={10}
          style={({ pressed }) => [styles.headerBtn, { opacity: pressed ? 0.65 : 1 }]}
        >
          <ChevronLeft size={20} color={text} strokeWidth={2.2} />
          <ThemedText style={[styles.backLabel, { color: text }]}>Πίσω</ThemedText>
        </Pressable>

        <ThemedText style={[styles.headerTitle, { color: text }]}>Μηνύματα</ThemedText>

        <Pressable
          onPress={handleRefresh}
          hitSlop={8}
          style={({ pressed }) => [
            styles.headerIconBtn,
            { borderColor: border, backgroundColor: surface, opacity: pressed ? 0.65 : 1 },
          ]}
        >
          <RefreshCw size={14} color={tint} strokeWidth={2.2} />
        </Pressable>
      </View>

      {/* ── Message list ── */}
      <View style={[styles.listWrap, { backgroundColor: surface, borderColor: border }]}>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={tint} />
            <ThemedText style={[styles.loadingText, { color: muted }]}>Φόρτωση συνομιλίας…</ThemedText>
          </View>
        ) : messages.length === 0 ? (
          <View style={styles.center}>
            <ThemedText style={[styles.emptyTitle, { color: text }]}>Δεν υπάρχουν μηνύματα</ThemedText>
            <ThemedText style={[styles.emptySub, { color: muted }]}>Ξεκίνα τη συνομιλία παρακάτω.</ThemedText>
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={groupedMessages}
            keyExtractor={(item) => item.id}
            renderItem={renderRow}
            contentContainerStyle={styles.listContent}
            onContentSizeChange={() => { if (isAtBottomRef.current) scrollToBottom(false); }}
            onScroll={onListScroll}
            scrollEventThrottle={16}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      {/* ── Composer ── */}
      <KeyboardAvoidingView
        behavior={Platform.select({ ios: 'padding', default: undefined })}
        keyboardVerticalOffset={Platform.select({ ios: 90, default: 0 })}
      >
        <View style={[styles.composer, { borderColor: border, backgroundColor: surface }]}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Γράψε μήνυμα…"
            placeholderTextColor={muted}
            style={[styles.input, { color: text }]}
            multiline
          />
          <Pressable
            onPress={sendMessage}
            disabled={!canSend}
            style={({ pressed }) => [
              styles.sendBtn,
              {
                backgroundColor: canSend ? tint : 'transparent',
                borderColor:     canSend ? tint : border,
                opacity:         canSend ? (pressed ? 0.80 : 1) : 0.38,
              },
            ]}
          >
            {sending
              ? <ActivityIndicator color={canSend ? '#fff' : tint} size="small" />
              : <Send size={16} color={canSend ? '#fff' : muted} strokeWidth={2.2} />
            }
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex:       1,
    gap:        Spacing.sm,
    paddingTop: Platform.select({ ios: 56, default: Spacing.xl }),
  },

  header: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom:     Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerBtn: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               4,
    paddingVertical:   4,
    paddingHorizontal: 2,
  },
  backLabel:     { fontSize: 14, fontWeight: '600' },
  headerTitle:   { fontSize: 17, fontWeight: '700', letterSpacing: -0.2 },
  headerIconBtn: {
    width:          34,
    height:         34,
    borderRadius:   17,
    borderWidth:    StyleSheet.hairlineWidth,
    alignItems:     'center',
    justifyContent: 'center',
  },

  listWrap: {
    flex:             1,
    marginHorizontal: Spacing.lg,
    borderRadius:     Radius.xl,
    borderWidth:      StyleSheet.hairlineWidth,
    overflow:         'hidden',
    shadowColor:      '#000',
    shadowOpacity:    0.06,
    shadowRadius:     8,
    shadowOffset:     { width: 0, height: 2 },
    elevation:        2,
  },
  listContent: {
    padding:       Spacing.md,
    paddingBottom: Spacing.lg,
    gap:           4,
  },

  center: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    gap: Spacing.sm, padding: Spacing.xl,
  },
  loadingText: { fontSize: 13, fontWeight: '500' },
  emptyTitle:  { fontSize: 15, fontWeight: '700' },
  emptySub:    { fontSize: 13, fontWeight: '400', textAlign: 'center' },

  dividerRow: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            Spacing.sm,
    marginVertical: Spacing.md,
  },
  dividerLine:  { flex: 1, height: StyleSheet.hairlineWidth },
  dividerLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 0.3 },

  bubbleRow: {
    flexDirection: 'row',
    alignItems:    'flex-end',
    gap:           Spacing.sm,
    marginBottom:  4,
  },
  avatarDot: {
    width:          28,
    height:         28,
    borderRadius:   14,
    borderWidth:    1,
    alignItems:     'center',
    justifyContent: 'center',
    flexShrink:     0,
    marginBottom:   18,
  },
  avatarLetter: { fontSize: 11, fontWeight: '800' },
  bubbleCol:    { maxWidth: '78%', gap: 3 },
  bubble: {
    borderWidth:       1,
    borderRadius:      Radius.xl,
    paddingVertical:   10,
    paddingHorizontal: 14,
  },
  bubbleText: { fontSize: 14, fontWeight: '400', lineHeight: 20 },
  bubbleTime: { fontSize: 10, fontWeight: '500', marginHorizontal: 4 },

  composer: {
    flexDirection:  'row',
    alignItems:     'flex-end',
    gap:            Spacing.sm,
    margin:         Spacing.lg,
    marginTop:      Spacing.sm,
    borderWidth:    StyleSheet.hairlineWidth,
    borderRadius:   Radius.xl,
    padding:        Spacing.sm,
    shadowColor:    '#000',
    shadowOpacity:  0.06,
    shadowRadius:   8,
    shadowOffset:   { width: 0, height: 2 },
    elevation:      3,
  },
  input: {
    flex:              1,
    minHeight:         40,
    maxHeight:         120,
    fontSize:          14,
    fontWeight:        '400',
    paddingHorizontal: Spacing.sm,
    paddingVertical:   10,
  },
  sendBtn: {
    width:          40,
    height:         40,
    borderRadius:   20,
    borderWidth:    1,
    alignItems:     'center',
    justifyContent: 'center',
    flexShrink:     0,
  },
});