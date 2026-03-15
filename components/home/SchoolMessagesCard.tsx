// components/home/SchoolMessagesCard.tsx
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { ChevronRight, MessageCircle } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/Card';
import { Radius, Spacing } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { supabase } from '@/lib/supabaseClient';

type MsgPreviewRow = {
  body: string;
  sender_role: 'student' | 'school';
};

export default function SchoolMessagesCard() {
  const text   = useThemeColor({}, 'text');
  const muted  = useThemeColor({}, 'mutedText');
  const tint   = useThemeColor({}, 'tint');
  const border = useThemeColor({}, 'border');

  const [loading,     setLoading]     = useState(true);
  const [lastMsg,     setLastMsg]     = useState<MsgPreviewRow | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  const previewText = useMemo(() => {
    if (!lastMsg?.body) return 'Επικοινώνησε απευθείας και δες το ιστορικό';
    const prefix = lastMsg.sender_role === 'school' ? 'Σχολή: ' : 'Εσύ: ';
    const body = lastMsg.body.length > 70 ? `${lastMsg.body.slice(0, 70)}…` : lastMsg.body;
    return `${prefix}${body}`;
  }, [lastMsg]);

  const loadPreview = useCallback(async () => {
    setLoading(true);
    try {
      const { data: tid, error: tErr } = await supabase.rpc('get_or_create_message_thread');
      if (tErr) throw tErr;
      const threadId = typeof tid === 'string' ? tid : (tid as any);
      if (!threadId) throw new Error('No thread id');

      const { data: last, error: lastErr } = await supabase
        .from('messages').select('body, sender_role')
        .eq('thread_id', threadId).order('created_at', { ascending: false }).limit(1).maybeSingle();
      if (lastErr) throw lastErr;
      setLastMsg((last as any) ?? null);

      const { count, error: cErr } = await supabase
        .from('messages').select('id', { count: 'exact', head: true })
        .eq('thread_id', threadId).eq('sender_role', 'school').is('read_at_student', null);
      if (cErr) throw cErr;
      setUnreadCount(count ?? 0);
    } catch (e) {
      console.error('SchoolMessagesCard loadPreview error:', e);
      setLastMsg(null); setUnreadCount(0);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadPreview(); }, [loadPreview]);
  useFocusEffect(React.useCallback(() => { loadPreview(); }, [loadPreview]));

  return (
    <Pressable onPress={() => router.push('/messages')}>
      {({ pressed }) => (
        <Card style={{ opacity: pressed ? 0.85 : 1 }} elevation="sm">
          <View style={styles.row}>
            {/* Icon */}
            <View style={[styles.iconWrap, { backgroundColor: tint + '15', borderColor: tint + '30' }]}>
              <MessageCircle size={18} color={tint} strokeWidth={2} />
            </View>

            {/* Text */}
            <View style={styles.textBlock}>
              <View style={styles.titleRow}>
                <ThemedText style={[styles.title, { color: text }]}>
                  Μηνύματα προς τη Σχολή
                </ThemedText>
                {!loading && unreadCount > 0 && (
                  <View style={[styles.unreadPill, { backgroundColor: tint + '18', borderColor: tint + '35' }]}>
                    <ThemedText style={[styles.unreadPillText, { color: tint }]}>
                      {unreadCount === 1 ? '1 νέο' : `${unreadCount} νέα`}
                    </ThemedText>
                  </View>
                )}
              </View>

              <ThemedText numberOfLines={2} style={[styles.preview, { color: muted }]}>
                {loading ? 'Φόρτωση…' : previewText}
              </ThemedText>
            </View>

            {/* Arrow */}
            <ChevronRight size={16} color={muted} strokeWidth={2} />
          </View>
        </Card>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            Spacing.md,
  },

  iconWrap: {
    width:          42,
    height:         42,
    borderRadius:   Radius.md,
    borderWidth:    1,
    alignItems:     'center',
    justifyContent: 'center',
    flexShrink:     0,
    position:       'relative',
  },
  textBlock: { flex: 1, gap: 3 },

  titleRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           Spacing.sm,
    flexWrap:      'wrap',
  },
  title: { fontSize: 14, fontWeight: '700' },

  unreadPill: {
    paddingHorizontal: 8,
    paddingVertical:   3,
    borderRadius:      999,
    borderWidth:       1,
  },
  unreadPillText: { fontSize: 10, fontWeight: '700' },

  preview: {
    fontSize:   12,
    fontWeight: '400',
    lineHeight: 17,
  },
});