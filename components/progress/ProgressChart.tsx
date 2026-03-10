// components/progress/ProgressChart.tsx
import React, { useMemo, useRef, useState } from 'react';
import { LayoutChangeEvent, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';

type ChartPoint = {
  id: string;
  label: string;
  value: number | null;
  title?: string | null;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}
function deg(rad: number) {
  return (rad * 180) / Math.PI;
}

/** Grade → semantic dot color */
function dotColor(value: number | null, tint: string): string {
  if (value === null) return tint;
  if (value >= 17) return '#22C55E';
  if (value >= 13) return '#4F6EF7';
  if (value >= 10) return '#FBBF24';
  return '#F87171';
}

export default function ProgressChart({
  points,
  maxValue = 20,
  height   = 170,
  minStep  = 52,
}: {
  points:    ChartPoint[];
  maxValue?: number;
  height?:   number;
  minStep?:  number;
}) {
  const muted   = useThemeColor({}, 'mutedText');
  const border  = useThemeColor({}, 'border');
  const tint    = useThemeColor({}, 'tint');
  const surface = useThemeColor({}, 'surface');
  const text    = useThemeColor({}, 'text');
  const bg      = useThemeColor({}, 'background');

  // Detect dark mode from background color
  const isDark = bg === '#111318' || bg.startsWith('#0') || bg.startsWith('#1');

  const tooltipBg     = isDark ? 'rgba(15,17,30,0.92)' : 'rgba(255,255,255,0.96)';
  const tooltipBorder = isDark ? 'rgba(238,240,247,0.14)' : 'rgba(15,17,23,0.10)';
  const axisColor     = isDark ? 'rgba(238,240,247,0.12)' : 'rgba(15,17,23,0.10)';
  const gridColor     = isDark ? 'rgba(238,240,247,0.05)' : 'rgba(15,17,23,0.05)';

  const scrollRef = useRef<ScrollView | null>(null);
  const [viewportW, setViewportW] = useState<number>(0);
  const [selected, setSelected]   = useState<{
    id: string; x: number; y: number;
    title: string; gradeText: string; dotCol: string;
  } | null>(null);

  const paddingL = 40;
  const paddingR = 16;
  const paddingT = 16;
  const paddingB = 32;
  const innerH   = height - paddingT - paddingB;

  const n = Math.max(1, points.length);

  const validValues = useMemo(() =>
    points.map((p) => p.value).filter((v): v is number => typeof v === 'number'),
  [points]);

  const computedMax = useMemo(() => {
    if (!validValues.length) return maxValue;
    return Math.max(maxValue, Math.ceil(Math.max(...validValues)));
  }, [validValues, maxValue]);

  const yTicks = useMemo(() => {
    const top  = computedMax;
    const step = top >= 20 ? 5 : Math.max(1, Math.round(top / 4));
    const ticks: number[] = [];
    for (let v = 0; v <= top; v += step) ticks.push(v);
    if (ticks[ticks.length - 1] !== top) ticks.push(top);
    return ticks;
  }, [computedMax]);

  const contentW = useMemo(() => {
    if (n <= 1) return Math.max(viewportW, paddingL + paddingR + minStep);
    return paddingL + paddingR + (n - 1) * minStep;
  }, [n, viewportW, paddingL, paddingR, minStep]);

  const coords = useMemo(() =>
    points.map((p, idx) => {
      const has   = typeof p.value === 'number';
      const ratio = has ? clamp(p.value! / computedMax, 0, 1) : 0;
      const x     = paddingL + idx * minStep;
      const y     = paddingT + (innerH - ratio * innerH);
      return { id: p.id, x, y, has, p, idx };
    }),
  [points, computedMax, innerH, paddingL, paddingT, minStep]);

  const segments = useMemo(() => {
    const segs: Array<{ key: string; x1: number; y1: number; x2: number; y2: number }> = [];
    for (let i = 1; i < coords.length; i++) {
      const a = coords[i - 1]; const b = coords[i];
      if (!a.has || !b.has) continue;
      segs.push({ key: `${a.id}-${b.id}`, x1: a.x, y1: a.y, x2: b.x, y2: b.y });
    }
    return segs;
  }, [coords]);

  const onViewportLayout = (e: LayoutChangeEvent) => setViewportW(e.nativeEvent.layout.width);

  if (!points.length) {
    return (
      <View style={[styles.emptyBox, { borderColor: border, backgroundColor: surface }]}>
        <ThemedText style={[styles.emptyText, { color: muted }]}>
          Δεν υπάρχουν δεδομένα για διάγραμμα.
        </ThemedText>
      </View>
    );
  }

  return (
    <Pressable
      onPress={() => setSelected(null)}
      style={{ width: '100%' }}
      onLayout={onViewportLayout}
    >
      <View style={[styles.chartCard, { backgroundColor: surface, borderColor: border }]}>
        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ width: contentW }}
          onScrollBeginDrag={() => setSelected(null)}
          scrollEventThrottle={16}
        >
          <View style={{ height, width: contentW, position: 'relative' }}>

            {/* Horizontal grid lines at Y ticks */}
            {yTicks.map((v) => {
              const ratio = clamp(v / computedMax, 0, 1);
              const y     = paddingT + (innerH - ratio * innerH);
              if (v === 0) return null;
              return (
                <View
                  key={`grid-${v}`}
                  style={[
                    styles.gridLine,
                    { top: y, left: paddingL, right: paddingR, backgroundColor: gridColor },
                  ]}
                />
              );
            })}

            {/* Y axis line */}
            <View style={[styles.axisY, { left: paddingL, top: paddingT, bottom: paddingB, backgroundColor: axisColor }]} />
            {/* X axis line */}
            <View style={[styles.axisX, { left: paddingL, right: paddingR, top: paddingT + innerH, backgroundColor: axisColor }]} />

            {/* Y tick labels */}
            {yTicks.map((v) => {
              const ratio = clamp(v / computedMax, 0, 1);
              const y     = paddingT + (innerH - ratio * innerH);
              return (
                <View key={v} style={[styles.yTickWrap, { top: y - 8, left: 0, width: paddingL - 6 }]}>
                  <ThemedText style={[styles.yTickText, { color: muted }]} numberOfLines={1}>
                    {v}
                  </ThemedText>
                </View>
              );
            })}

            {/* Line segments */}
            {segments.map((s) => {
              const dx    = s.x2 - s.x1; const dy = s.y2 - s.y1;
              const len   = Math.sqrt(dx * dx + dy * dy);
              const angle = deg(Math.atan2(dy, dx));
              return (
                <View
                  key={s.key}
                  style={[
                    styles.segment,
                    {
                      width:     len,
                      left:      (s.x1 + s.x2) / 2 - len / 2,
                      top:       (s.y1 + s.y2) / 2 - 1.5,
                      transform: [{ rotateZ: `${angle}deg` }],
                      backgroundColor: tint,
                      opacity: 0.70,
                    },
                  ]}
                />
              );
            })}

            {/* Dots + X labels */}
            {coords.map(({ id, x, y, has, p, idx }) => {
              const dc          = dotColor(has ? p.value! : null, tint);
              const labelEvery  = n > 14 ? 2 : 1;
              const showLabel   = idx % labelEvery === 0 || idx === n - 1;
              const DOT         = 10;
              const isSelected  = selected?.id === id;

              return (
                <View key={id} style={{ position: 'absolute', left: x - minStep / 2, width: minStep, top: 0, bottom: 0 }}>
                  <Pressable
                    disabled={!has}
                    onPress={(e) => {
                      e.stopPropagation?.();
                      const title     = (p.title?.trim() || p.label || 'Διαγώνισμα').toString();
                      const gradeText = typeof p.value === 'number' ? p.value.toFixed(1) : '—';
                      setSelected(isSelected ? null : { id, x, y, title, gradeText, dotCol: dc });
                    }}
                    style={[
                      styles.dot,
                      {
                        width:           DOT,
                        height:          DOT,
                        borderRadius:    999,
                        left:            minStep / 2 - DOT / 2,
                        top:             y - DOT / 2,
                        backgroundColor: has ? dc : muted,
                        opacity:         !has ? 0.30 : 1,
                        borderColor:     surface,
                        // pop selected dot
                        transform: isSelected ? [{ scale: 1.35 }] : [{ scale: 1 }],
                      },
                    ]}
                  />

                  {showLabel && (
                    <ThemedText
                      style={[styles.xTickText, { color: muted, left: 0, width: minStep }]}
                      numberOfLines={1}
                    >
                      {p.label}
                    </ThemedText>
                  )}
                </View>
              );
            })}

            {/* Tooltip */}
            {selected && (
              <View
                pointerEvents="none"
                style={[
                  styles.tooltip,
                  {
                    left:            clamp(selected.x - 136 / 2, paddingL, Math.max(paddingL, contentW - paddingR - 136)),
                    top:             clamp(selected.y - 62, paddingT, paddingT + innerH - 62),
                    backgroundColor: tooltipBg,
                    borderColor:     tooltipBorder,
                  },
                ]}
              >
                {/* Coloured dot accent */}
                <View style={[styles.tooltipDot, { backgroundColor: selected.dotCol }]} />
                <View style={styles.tooltipBody}>
                  <ThemedText style={[styles.tooltipTitle, { color: text }]} numberOfLines={2}>
                    {selected.title}
                  </ThemedText>
                  <ThemedText style={[styles.tooltipGrade, { color: selected.dotCol }]} numberOfLines={1}>
                    {selected.gradeText}
                  </ThemedText>
                </View>

                {/* Arrow */}
                <View style={[styles.tooltipArrow, { backgroundColor: tooltipBg, borderColor: tooltipBorder }]} />
              </View>
            )}
          </View>
        </ScrollView>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chartCard: {
    borderRadius:  Radius.xl,
    borderWidth:   StyleSheet.hairlineWidth,
    overflow:      'hidden',
    paddingTop:    Spacing.xs,
    // shadow
    shadowColor:   '#000',
    shadowOpacity: 0.06,
    shadowRadius:  8,
    shadowOffset:  { width: 0, height: 2 },
    elevation:     2,
  },

  gridLine: {
    position: 'absolute',
    height:   StyleSheet.hairlineWidth,
  },

  axisY: {
    position:     'absolute',
    width:        1.5,
    borderRadius: 999,
  },
  axisX: {
    position:     'absolute',
    height:       1.5,
    borderRadius: 999,
  },

  yTickWrap: {
    position:  'absolute',
    alignItems: 'flex-end',
    paddingRight: 5,
  },
  yTickText: {
    fontSize:   10,
    fontWeight: '600',
  },

  xTickText: {
    position:   'absolute',
    bottom:     4,
    fontSize:   10,
    fontWeight: '600',
    textAlign:  'center',
  },

  segment: {
    position:     'absolute',
    height:       2,
    borderRadius: 999,
  },

  dot: {
    position:    'absolute',
    borderWidth: 2,
  },

  // ── Tooltip ───────────────────────────────────────────────────────────────
  tooltip: {
    position:          'absolute',
    width:             136,
    flexDirection:     'row',
    alignItems:        'flex-start',
    gap:               8,
    paddingVertical:   8,
    paddingHorizontal: 10,
    borderRadius:      Radius.md,
    borderWidth:       StyleSheet.hairlineWidth,
    // shadow
    shadowColor:   '#000',
    shadowOpacity: 0.14,
    shadowRadius:  12,
    shadowOffset:  { width: 0, height: 4 },
    elevation:     8,
  },
  tooltipDot: {
    width:        8,
    height:       8,
    borderRadius: 999,
    marginTop:    3,
    flexShrink:   0,
  },
  tooltipBody: { flex: 1, gap: 3 },
  tooltipTitle: {
    fontSize:   11,
    fontWeight: '600',
    lineHeight: 14,
  },
  tooltipGrade: {
    fontSize:   13,
    fontWeight: '800',
    letterSpacing: -0.2,
  },

  // Diamond arrow pointing down
  tooltipArrow: {
    position:     'absolute',
    bottom:       -5,
    left:         16,
    width:        10,
    height:       10,
    borderRadius: 2,
    transform:    [{ rotate: '45deg' }],
    borderWidth:  StyleSheet.hairlineWidth,
  },

  emptyBox: {
    borderWidth:    StyleSheet.hairlineWidth,
    borderRadius:   Radius.xl,
    padding:        Spacing.lg,
    alignItems:     'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize:   12,
    fontWeight: '500',
    textAlign:  'center',
  },
});