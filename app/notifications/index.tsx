// app/notifications/index.tsx
import { useFocusEffect } from '@react-navigation/native';
import { router, Stack } from 'expo-router';
import { Bell, Check, ChevronLeft } from 'lucide-react-native';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useThemeColor } from '@/hooks/use-theme-color';
import { supabase } from '@/lib/supabaseClient';

type NotificationRow = {
  id:         string;
  title:      string;
  body:       string;
  kind:       string;
  data:       any;
  created_at: string;
  read_at:    string | null;
};

function formatDateTime(iso: string) {
  try {
    return new Date(iso).toLocaleString('el-GR', {
      day: '2-digit', month: '2-digit', year: '2-digit',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return ''; }
}

export default function NotificationsScreen() {
  const bg      = useThemeColor({}, 'background');
  const surface = useThemeColor({}, 'surface');
  const border  = useThemeColor({}, 'border');
  const tint    = useThemeColor({}, 'tint');
  const text    = useThemeColor({}, 'text');
  const muted   = useThemeColor({}, 'mutedText');

  const { user } = useAuth();

  const [loading,    setLoading]    = useState(true);
  const [items,      setItems]      = useState<NotificationRow[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const unreadCount = useMemo(() => items.filter((n) => !n.read_at).length, [items]);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('notifications')
      .select('id,title,body,kind,data,created_at,read_at')
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) { console.error('notifications load error', error); setItems([]); }
    else        { setItems((data as NotificationRow[]) ?? []); }
    setLoading(false);
  }, [user?.id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const markRead = useCallback(async (id: string) => {
    setItems((prev) =>
      prev.map((n) => n.id === id ? { ...n, read_at: n.read_at ?? new Date().toISOString() } : n),
    );
    const { error } = await supabase
      .from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id);
    if (error) { console.error('mark read error', error); load(); }
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true); await load(); setRefreshing(false);
  }, [load]);

  return (
    <ThemedView style={[styles.screen, { backgroundColor: bg }]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* ── Header ── */}
      <View style={[styles.header, { borderBottomColor: border }]}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={10}
          style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.65 : 1 }]}
        >
          <ChevronLeft size={20} color={text} strokeWidth={2.2} />
        </Pressable>

        <View style={styles.titleRow}>
          <Bell size={18} color={tint} strokeWidth={2} />
          <ThemedText style={[styles.headerTitle, { color: text }]}>Ειδοποιήσεις</ThemedText>
          {unreadCount > 0 && (
            <View style={[styles.unreadBadge, { backgroundColor: tint + '18', borderColor: tint + '40' }]}>
              <ThemedText style={[styles.unreadBadgeText, { color: tint }]}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </ThemedText>
            </View>
          )}
        </View>

        {/* Balance spacer */}
        <View style={{ width: 36 }} />
      </View>

      {/* ── Content ── */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={tint} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          refreshing={refreshing}
          onRefresh={onRefresh}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <View style={[styles.emptyIconWrap, { backgroundColor: tint + '12', borderColor: tint + '25' }]}>
                <Bell size={24} color={tint} strokeWidth={1.8} />
              </View>
              <ThemedText style={[styles.emptyTitle, { color: text }]}>
                Δεν υπάρχουν ειδοποιήσεις
              </ThemedText>
              <ThemedText style={[styles.emptySub, { color: muted }]}>
                Όταν σταλούν, θα εμφανιστούν εδώ.
              </ThemedText>
            </View>
          }
          renderItem={({ item }) => {
            const isUnread = !item.read_at;

            return (
              <Pressable
                onPress={() => isUnread && markRead(item.id)}
                style={({ pressed }) => ({ opacity: pressed ? 0.88 : 1 })}
              >
                <View
                  style={[
                    styles.notifCard,
                    {
                      backgroundColor: surface,
                      borderColor:     isUnread ? tint + '35' : border,
                    },
                    isUnread && {
                      shadowColor:   tint,
                      shadowOpacity: 0.12,
                      shadowRadius:  12,
                      shadowOffset:  { width: 0, height: 4 },
                      elevation:     4,
                    },
                  ]}
                >
                  {/* Unread accent bar */}
                  {isUnread && (
                    <View style={[styles.accentBar, { backgroundColor: tint }]} />
                  )}

                  <View style={styles.cardBody}>
                    {/* Top row: title + read indicator */}
                    <View style={styles.cardTopRow}>
                      <ThemedText
                        style={[
                          styles.cardTitle,
                          { color: text, opacity: isUnread ? 1 : 0.75 },
                        ]}
                        numberOfLines={2}
                      >
                        {item.title}
                      </ThemedText>

                      {isUnread ? (
                        <View style={[styles.unreadDot, { backgroundColor: tint }]} />
                      ) : (
                        <View style={[styles.readIcon, { backgroundColor: tint + '15' }]}>
                          <Check size={10} color={tint} strokeWidth={2.5} />
                        </View>
                      )}
                    </View>

                    {/* Body */}
                    <ThemedText
                      style={[styles.cardBody2, { color: muted }]}
                      numberOfLines={3}
                    >
                      {item.body}
                    </ThemedText>

                    {/* Footer: date + tap to read hint */}
                    <View style={styles.cardFooter}>
                      <ThemedText style={[styles.cardDate, { color: muted }]}>
                        {formatDateTime(item.created_at)}
                      </ThemedText>
                      {isUnread && (
                        <ThemedText style={[styles.tapHint, { color: tint }]}>
                          Πάτα για ανάγνωση
                        </ThemedText>
                      )}
                    </View>
                  </View>
                </View>
              </Pressable>
            );
          }}
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex:       1,
    paddingTop: Platform.select({ ios: 56, default: Spacing.xl }),
  },

  // ── Header ───────────────────────────────────────────────────────────────
  header: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom:     Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom:      Spacing.sm,
  },
  backBtn: {
    width:          36,
    height:         36,
    borderRadius:   18,
    alignItems:     'center',
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           Spacing.sm,
  },
  headerTitle: {
    fontSize:      20,
    fontWeight:    '800',
    letterSpacing: -0.3,
  },
  unreadBadge: {
    paddingHorizontal: 9,
    paddingVertical:   3,
    borderRadius:      999,
    borderWidth:       1,
  },
  unreadBadgeText: { fontSize: 11, fontWeight: '700' },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom:     Spacing.xl,
    gap:               Spacing.sm,
  },

  // ── Notification card ─────────────────────────────────────────────────────
  notifCard: {
    borderRadius:  Radius.xl,
    borderWidth:   StyleSheet.hairlineWidth,
    flexDirection: 'row',
    overflow:      'hidden',
    // base shadow
    shadowColor:   '#000',
    shadowOpacity: 0.05,
    shadowRadius:  6,
    shadowOffset:  { width: 0, height: 2 },
    elevation:     2,
  },
  accentBar: {
    width:     3,
    alignSelf: 'stretch',
  },
  cardBody: {
    flex:    1,
    padding: Spacing.lg,
    gap:     Spacing.xs,
  },

  cardTopRow: {
    flexDirection:  'row',
    alignItems:     'flex-start',
    justifyContent: 'space-between',
    gap:            Spacing.sm,
    marginBottom:   4,
  },
  cardTitle: {
    flex:          1,
    fontSize:      15,
    fontWeight:    '700',
    letterSpacing: -0.1,
    lineHeight:    21,
  },
  unreadDot: {
    width:        9,
    height:       9,
    borderRadius: 999,
    marginTop:    5,
    flexShrink:   0,
  },
  readIcon: {
    width:          18,
    height:         18,
    borderRadius:   9,
    alignItems:     'center',
    justifyContent: 'center',
    marginTop:      3,
    flexShrink:     0,
  },

  cardBody2: {
    fontSize:   13,
    fontWeight: '400',
    lineHeight: 19,
  },

  cardFooter: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    marginTop:      Spacing.sm,
  },
  cardDate: { fontSize: 11, fontWeight: '500' },
  tapHint:  { fontSize: 11, fontWeight: '600' },

  // ── Empty state ────────────────────────────────────────────────────────────
  emptyBox: {
    marginTop:  Spacing['2xl'],
    alignItems: 'center',
    gap:        Spacing.md,
    padding:    Spacing.xl,
  },
  emptyIconWrap: {
    width:          64,
    height:         64,
    borderRadius:   32,
    borderWidth:    1,
    alignItems:     'center',
    justifyContent: 'center',
    marginBottom:   Spacing.sm,
  },
  emptyTitle: {
    fontSize:      17,
    fontWeight:    '700',
    letterSpacing: -0.2,
  },
  emptySub: {
    fontSize:   13,
    fontWeight: '400',
    textAlign:  'center',
    lineHeight: 19,
  },
});