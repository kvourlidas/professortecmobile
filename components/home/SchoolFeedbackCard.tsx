// components/home/SchoolFeedbackCard.tsx
import { Star } from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

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

  const handleSubmit = async () => {
    if (!canSubmit) return;
    try {
      setSubmitting(true);
      await onSubmit?.({ rating, feedback: trimmed });
      setRating(rating); setFeedback(trimmed);
    } finally { setSubmitting(false); }
  };

  // Star fill colour — gold when filled
  const starFilled  = '#FBBF24';
  const starEmpty   = muted;

  return (
    <Card elevation="sm">
      {/* Title */}
      <ThemedText style={[styles.title, { color: text }]}>
        Αξιολόγησε το φροντιστήριό σου
      </ThemedText>

      {/* Stars + label */}
      <View style={styles.starsBlock}>
        <View style={styles.starsRow}>
          {[1, 2, 3, 4, 5].map((v) => {
            const filled = v <= rating;
            return (
              <Pressable
                key={v}
                onPress={() => setRating(v)}
                hitSlop={8}
                style={({ pressed }) => [styles.starBtn, { opacity: pressed ? 0.7 : 1 }]}
              >
                <Star
                  size={28}
                  color={filled ? starFilled : starEmpty}
                  fill={filled ? starFilled : 'transparent'}
                  strokeWidth={1.8}
                />
              </Pressable>
            );
          })}
        </View>
        {rating > 0 && (
          <ThemedText style={[styles.starLabel, { color: starFilled }]}>
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

      {/* Submit */}
      <Pressable
        onPress={handleSubmit}
        disabled={!canSubmit}
        style={({ pressed }) => [
          styles.submitBtn,
          {
            backgroundColor: canSubmit ? tint : 'transparent',
            borderColor:     tint,
            opacity:         canSubmit ? (pressed ? 0.82 : 1) : 0.45,
          },
        ]}
      >
        <ThemedText style={[styles.submitText, { color: canSubmit ? '#fff' : tint }]}>
          {submitting ? 'Αποστολή…' : 'Υποβολή'}
        </ThemedText>
      </Pressable>
    </Card>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize:      15,
    fontWeight:    '700',
    letterSpacing: -0.1,
    marginBottom:  Spacing.md,
  },

  starsBlock: {
    marginBottom: Spacing.md,
    gap:          6,
  },
  starsRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           4,
  },
  starBtn: {
    padding:      3,
    borderRadius: Radius.sm,
  },
  starLabel: {
    fontSize:   12,
    fontWeight: '600',
    marginLeft: 2,
  },

  inputWrap: {
    borderWidth:   1,
    borderRadius:  Radius.lg,
    padding:       Spacing.md,
    marginBottom:  Spacing.md,
  },
  input: {
    minHeight:  80,
    fontSize:   14,
    fontWeight: '400',
    lineHeight: 20,
  },
  counter: {
    fontSize:   11,
    fontWeight: '500',
    textAlign:  'right',
    marginTop:  6,
  },

  submitBtn: {
    borderWidth:     1,
    borderRadius:    Radius.lg,
    paddingVertical: 12,
    alignItems:      'center',
    justifyContent:  'center',
  },
  submitText: {
    fontSize:   13,
    fontWeight: '700',
  },
});