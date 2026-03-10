// components/profile/ProfileInfoCard.tsx
import { Users, X } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/Card';
import { Radius, Spacing } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { formatGreekDate, safeText } from './profileUtils';

type ParentsInfo = {
  father_name?: string | null;
  father_phone?: string | null;
  father_email?: string | null;
  father_date_of_birth?: string | null;
  mother_name?: string | null;
  mother_phone?: string | null;
  mother_email?: string | null;
  mother_date_of_birth?: string | null;
};

type Props = {
  title: string;
  children: React.ReactNode;
  parents?: ParentsInfo | null;
  parentsButtonLabel?: string;
};

export default function ProfileInfoCard({
  title,
  children,
  parents = null,
  parentsButtonLabel = 'Γονείς',
}: Props) {
  const [open, setOpen] = useState(false);

  const tint    = useThemeColor({}, 'tint');
  const surface = useThemeColor({}, 'surface');
  const border  = useThemeColor({}, 'border');
  const muted   = useThemeColor({}, 'mutedText');
  const text    = useThemeColor({}, 'text');
  const bg      = useThemeColor({}, 'background');

  const showParents = useMemo(() => parents !== null, [parents]);

  return (
    <>
      <Card elevation="sm" style={styles.card}>
        {/* Header */}
        <View style={[styles.headerRow, { borderBottomColor: border }]}>
          <ThemedText style={[styles.cardTitle, { color: text }]}>{title}</ThemedText>

          {showParents && (
            <Pressable
              onPress={() => setOpen(true)}
              hitSlop={10}
              style={({ pressed }) => [
                styles.parentsBtn,
                {
                  backgroundColor: pressed ? tint + '25' : tint + '12',
                  borderColor:     tint + '30',
                },
              ]}
            >
              <Users size={13} color={tint} strokeWidth={2.2} />
              <ThemedText style={[styles.parentsBtnText, { color: tint }]}>
                {parentsButtonLabel}
              </ThemedText>
            </Pressable>
          )}
        </View>

        {/* Rows */}
        <View style={styles.content}>{children}</View>
      </Card>

      {/* ── Parents Modal ── */}
      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable
            style={[styles.modalSheet, { backgroundColor: surface, borderColor: border }]}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <View style={[styles.modalHeaderRow, { borderBottomColor: border }]}>
              <ThemedText style={[styles.modalTitle, { color: text }]}>
                Στοιχεία Γονέων
              </ThemedText>
              <Pressable
                onPress={() => setOpen(false)}
                hitSlop={8}
                style={({ pressed }) => [
                  styles.closeBtn,
                  { backgroundColor: pressed ? border : bg, borderColor: border },
                ]}
              >
                <X size={14} color={muted} strokeWidth={2.5} />
              </Pressable>
            </View>

            {/* Two parent sections */}
            <View style={styles.modalBody}>
              <ParentSection
                title="Πατέρας"
                accentColor={tint}
                labelColor={muted}
                textColor={text}
                borderColor={border}
                rows={[
                  ['Ονοματεπώνυμο',  safeText(parents?.father_name           ?? null)],
                  ['Τηλέφωνο',       safeText(parents?.father_phone          ?? null)],
                  ['Email',          safeText(parents?.father_email          ?? null)],
                  ['Ημ/νία Γέννησης', formatGreekDate(parents?.father_date_of_birth ?? null)],
                ]}
              />

              <View style={[styles.sectionDivider, { backgroundColor: border }]} />

              <ParentSection
                title="Μητέρα"
                accentColor={tint}
                labelColor={muted}
                textColor={text}
                borderColor={border}
                rows={[
                  ['Ονοματεπώνυμο',  safeText(parents?.mother_name           ?? null)],
                  ['Τηλέφωνο',       safeText(parents?.mother_phone          ?? null)],
                  ['Email',          safeText(parents?.mother_email          ?? null)],
                  ['Ημ/νία Γέννησης', formatGreekDate(parents?.mother_date_of_birth ?? null)],
                ]}
              />
            </View>

            {/* Footer */}
            <View style={[styles.modalFooter, { borderTopColor: border }]}>
              <Pressable
                onPress={() => setOpen(false)}
                style={({ pressed }) => [
                  styles.closeFooterBtn,
                  {
                    backgroundColor: pressed ? tint : tint + '14',
                    borderColor:     tint + '35',
                  },
                ]}
              >
                <ThemedText style={[styles.closeFooterText, { color: tint }]}>
                  Κλείσιμο
                </ThemedText>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

// ── Parent section inside modal ───────────────────────────────────────────────
function ParentSection({
  title,
  accentColor,
  labelColor,
  textColor,
  borderColor,
  rows,
}: {
  title:       string;
  accentColor: string;
  labelColor:  string;
  textColor:   string;
  borderColor: string;
  rows:        Array<[string, string]>;
}) {
  return (
    <View style={pStyles.wrap}>
      {/* Section label */}
      <View style={pStyles.titleRow}>
        <View style={[pStyles.dot, { backgroundColor: accentColor }]} />
        <ThemedText style={[pStyles.title, { color: textColor }]}>{title}</ThemedText>
      </View>

      {/* Data rows */}
      {rows.map(([label, value], i) => (
        <View
          key={label}
          style={[
            pStyles.row,
            i < rows.length - 1 && { borderBottomColor: borderColor, borderBottomWidth: StyleSheet.hairlineWidth },
          ]}
        >
          <ThemedText style={[pStyles.label, { color: labelColor }]}>{label}</ThemedText>
          <ThemedText style={[pStyles.value, { color: textColor }]} numberOfLines={2}>
            {value}
          </ThemedText>
        </View>
      ))}
    </View>
  );
}

const pStyles = StyleSheet.create({
  wrap:     { gap: 0 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: Spacing.sm },
  dot:      { width: 7, height: 7, borderRadius: 999 },
  title:    { fontSize: 13, fontWeight: '700', letterSpacing: 0.1 },
  row: {
    flexDirection:  'row',
    alignItems:     'flex-start',
    justifyContent: 'space-between',
    gap:            Spacing.md,
    paddingVertical: 9,
  },
  label: { fontSize: 12, fontWeight: '500' },
  value: { flex: 1, textAlign: 'right', fontSize: 13, fontWeight: '600' },
});

const styles = StyleSheet.create({
  // ── Card ──────────────────────────────────────────────────────────────────
  card: {
    marginHorizontal:  Spacing.lg,
    marginBottom:      Spacing.md,
    paddingTop:        0,
    paddingBottom:     0,
    paddingHorizontal: 0,
    overflow:          'hidden',
  },

  headerRow: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    gap:               Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical:   Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  cardTitle: {
    fontSize:   14,
    fontWeight: '700',
    letterSpacing: 0,
  },

  parentsBtn: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               5,
    paddingVertical:   5,
    paddingHorizontal: 10,
    borderRadius:      999,
    borderWidth:       1,
  },
  parentsBtnText: {
    fontSize:   11,
    fontWeight: '700',
  },

  content: {
    paddingHorizontal: Spacing.lg,
    paddingBottom:     Spacing.sm,
  },

  // ── Modal ─────────────────────────────────────────────────────────────────
  backdrop: {
    flex:            1,
    backgroundColor: 'rgba(0,0,0,0.42)',
    alignItems:      'center',
    justifyContent:  'center',
    padding:         Spacing.lg,
  },
  modalSheet: {
    width:        '100%',
    maxWidth:     480,
    borderRadius: Radius.xl,
    borderWidth:  Platform.select({ ios: StyleSheet.hairlineWidth, default: 1 }),
    overflow:     'hidden',
    shadowColor:   '#000',
    shadowOpacity: 0.20,
    shadowRadius:  28,
    shadowOffset:  { width: 0, height: 12 },
    elevation:     16,
  },

  modalHeaderRow: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical:   Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalTitle: {
    fontSize:   16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  closeBtn: {
    width:          28,
    height:         28,
    borderRadius:   14,
    borderWidth:    StyleSheet.hairlineWidth,
    alignItems:     'center',
    justifyContent: 'center',
  },

  modalBody: {
    padding: Spacing.lg,
    gap:     Spacing.md,
  },

  sectionDivider: {
    height: StyleSheet.hairlineWidth,
  },

  modalFooter: {
    paddingHorizontal: Spacing.lg,
    paddingVertical:   Spacing.md,
    borderTopWidth:    StyleSheet.hairlineWidth,
    alignItems:        'flex-end',
  },
  closeFooterBtn: {
    paddingVertical:   9,
    paddingHorizontal: 20,
    borderRadius:      999,
    borderWidth:       1,
  },
  closeFooterText: {
    fontSize:   13,
    fontWeight: '700',
  },
});