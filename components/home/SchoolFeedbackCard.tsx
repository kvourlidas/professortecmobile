// components/home/SchoolFeedbackCard.tsx
import { Pencil, Star } from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/Card';
import { Radius, Spacing } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';

type Props = {
  maxChars?: number;
  initialRating?: number;
  initialFeedback?: string;
  onSubmit?: (payload: { rating: number; feedback: string }) => Promise<void> | void;
};

const STAR_LABELS = ['', 'Κακό', 'Μέτριο', 'Καλό', 'Πολύ καλό', 'Εξαιρετικό'];
const STAR_FILLED = '#FBBF24';

export default function SchoolFeedbackCard({
  maxChars = 500,
  initialRating = 0,
  initialFeedback = '',
  onSubmit,
}: Props) {
  const text    = useThemeColor({}, 'text');
  const muted   = useThemeColor({}, 'mutedText');
  const border  = useThemeColor({}, 'border');
  const tint    = useThemeColor({}, 'tint');
  const surface = useThemeColor({}, 'surface');
  const bg      = useThemeColor({}, 'background');

  // Modal state
  const [modalOpen,  setModalOpen]  = useState(false);
  const [rating,     setRating]     = useState(initialRating);
  const [feedback,   setFeedback]   = useState(initialFeedback);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setRating(initialRating);
    setFeedback(initialFeedback);
  }, [initialRating, initialFeedback]);

  const trimmed   = useMemo(() => feedback.trim(), [feedback]);
  const remaining = useMemo(() => Math.max(0, maxChars - feedback.length), [feedback, maxChars]);
  const canSubmit = rating > 0 && trimmed.length > 0 && !submitting;

  const hasExisting = initialRating > 0;

  const openModal = () => {
    setRating(initialRating);
    setFeedback(initialFeedback);
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    try {
      setSubmitting(true);
      await onSubmit?.({ rating, feedback: trimmed });
      setModalOpen(false);
    } finally { setSubmitting(false); }
  };

  return (
    <>
      {/* ── Compact read-only card ── */}
      <Card elevation="sm">
        <View style={styles.cardRow}>
          <View style={styles.cardLeft}>
            <ThemedText style={[styles.cardTitle, { color: text }]}>
              Αξιολόγησή σου
            </ThemedText>

            {hasExisting ? (
              <>
                {/* Stars display */}
                <View style={styles.starsRow}>
                  {[1, 2, 3, 4, 5].map((v) => (
                    <Star
                      key={v}
                      size={14}
                      color={v <= initialRating ? STAR_FILLED : muted}
                      fill={v <= initialRating ? STAR_FILLED : 'transparent'}
                      strokeWidth={1.8}
                    />
                  ))}
                  <ThemedText style={[styles.starLabel, { color: STAR_FILLED }]}>
                    {STAR_LABELS[initialRating]}
                  </ThemedText>
                </View>
                {/* Feedback preview */}
                {initialFeedback.trim().length > 0 && (
                  <ThemedText style={[styles.feedbackPreview, { color: muted }]} numberOfLines={2}>
                    {initialFeedback.trim()}
                  </ThemedText>
                )}
              </>
            ) : (
              <ThemedText style={[styles.emptyText, { color: muted }]}>
                Δεν έχεις αξιολογήσει ακόμα.
              </ThemedText>
            )}
          </View>

          {/* Edit button */}
          <Pressable
            onPress={openModal}
            hitSlop={8}
            style={({ pressed }) => [
              styles.editBtn,
              { borderColor: border, backgroundColor: surface, opacity: pressed ? 0.65 : 1 },
            ]}
          >
            <Pencil size={13} color={tint} strokeWidth={2} />
          </Pressable>
        </View>
      </Card>

      {/* ── Submission modal ── */}
      <Modal
        transparent
        visible={modalOpen}
        animationType="fade"
        onRequestClose={() => { if (!submitting) setModalOpen(false); }}
      >
        <View style={styles.backdrop}>
          <View style={[styles.modalCard, { backgroundColor: surface, borderColor: border }]}>
            <ThemedText style={[styles.modalTitle, { color: text }]}>
              Αξιολόγησε το φροντιστήριό σου
            </ThemedText>

            {/* Stars */}
            <View style={styles.modalStarsBlock}>
              <View style={styles.modalStarsRow}>
                {[1, 2, 3, 4, 5].map((v) => {
                  const filled = v <= rating;
                  return (
                    <Pressable
                      key={v}
                      onPress={() => setRating(v)}
                      hitSlop={8}
                      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
                    >
                      <Star
                        size={28}
                        color={filled ? STAR_FILLED : muted}
                        fill={filled ? STAR_FILLED : 'transparent'}
                        strokeWidth={1.8}
                      />
                    </Pressable>
                  );
                })}
              </View>
              {rating > 0 && (
                <ThemedText style={[styles.modalStarLabel, { color: STAR_FILLED }]}>
                  {STAR_LABELS[rating]}
                </ThemedText>
              )}
            </View>

            {/* Text input */}
            <View style={[styles.inputWrap, { borderColor: border, backgroundColor: bg }]}>
              <TextInput
                value={feedback}
                onChangeText={(t) => setFeedback(t.slice(0, maxChars))}
                placeholder="Γράψε εδώ το feedback σου…"
                placeholderTextColor={muted}
                multiline
                textAlignVertical="top"
                style={[styles.input, { color: text }]}
              />
              <ThemedText style={[styles.counter, { color: muted }]}>{remaining}</ThemedText>
            </View>

            {/* Actions */}
            <View style={styles.modalActions}>
              <Pressable
                disabled={submitting}
                onPress={() => setModalOpen(false)}
                style={({ pressed }) => [
                  styles.modalBtn,
                  { borderColor: border, backgroundColor: pressed ? 'rgba(148,163,184,0.14)' : 'transparent', opacity: submitting ? 0.5 : 1 },
                ]}
              >
                <ThemedText style={[styles.modalBtnText, { color: muted }]}>Ακύρωση</ThemedText>
              </Pressable>

              <Pressable
                onPress={handleSubmit}
                disabled={!canSubmit}
                style={({ pressed }) => [
                  styles.modalBtn,
                  {
                    backgroundColor: canSubmit ? tint : 'transparent',
                    borderColor:     tint,
                    opacity:         canSubmit ? (pressed ? 0.82 : 1) : 0.4,
                  },
                ]}
              >
                <ThemedText style={[styles.modalBtnText, { color: canSubmit ? '#fff' : tint }]}>
                  {submitting ? 'Αποστολή…' : 'Υποβολή'}
                </ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  // ── Card ─────────────────────────────────────────────────────────────────
  cardRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           Spacing.md,
  },
  cardLeft: {
    flex: 1,
    gap:  4,
  },
  cardTitle: {
    fontSize:   13,
    fontWeight: '700',
  },
  starsRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           3,
  },
  starLabel: {
    fontSize:   11,
    fontWeight: '600',
    marginLeft: 2,
  },
  feedbackPreview: {
    fontSize:   12,
    fontWeight: '400',
    lineHeight: 17,
  },
  emptyText: {
    fontSize:   12,
    fontWeight: '400',
  },
  editBtn: {
    width:          30,
    height:         30,
    borderRadius:   15,
    borderWidth:    StyleSheet.hairlineWidth,
    alignItems:     'center',
    justifyContent: 'center',
    flexShrink:     0,
  },

  // ── Modal ─────────────────────────────────────────────────────────────────
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
    gap:          Spacing.md,
    shadowColor:   '#000',
    shadowOpacity: 0.18,
    shadowRadius:  24,
    shadowOffset:  { width: 0, height: 10 },
    elevation:     14,
  },
  modalTitle: {
    fontSize:      15,
    fontWeight:    '700',
    letterSpacing: -0.1,
  },

  modalStarsBlock: { gap: 6 },
  modalStarsRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           4,
  },
  modalStarLabel: {
    fontSize:   12,
    fontWeight: '600',
    marginLeft: 2,
  },

  inputWrap: {
    borderWidth:  1,
    borderRadius: Radius.lg,
    padding:      Spacing.md,
  },
  input: {
    minHeight:  80,
    fontSize:   14,
    fontWeight: '400',
    lineHeight: 20,
  },
  counter: {
    fontSize:  11,
    fontWeight: '500',
    textAlign:  'right',
    marginTop:  6,
  },

  modalActions: {
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
