// constants/theme.ts
import { Platform } from 'react-native';

// ─── Accent ───────────────────────────────────────────────────────────────────
// Indigo-blue: crisp, trustworthy, premium
const tintLight = '#4F6EF7';
const tintDark  = '#7B96FF';

export const Colors = {
  light: {
    // Page background — warm off-white, never harsh
    background:    '#F7F8FC',
    // Card / modal surface — pure white with micro-lift
    surface:       '#FFFFFF',
    // Primary accent
    tint:          tintLight,
    // Primary text — near-black, slightly warm
    text:          '#0F1117',
    // Secondary / muted text
    mutedText:     'rgba(15, 17, 23, 0.50)',
    // Dividers / card borders — barely-there
    border:        'rgba(15, 17, 23, 0.08)',
    // Icon default (tab bar, decorative)
    icon:          'rgba(15, 17, 23, 0.38)',
    // Tab bar
    tabIconDefault:  'rgba(15, 17, 23, 0.38)',
    tabIconSelected: tintLight,
    // Semantic colours (kept consistent with dark)
    success:       '#22C55E',
    danger:        '#F87171',
    warning:       '#FBBF24',
  },
  dark: {
    // Deep cool-charcoal — not pure black, not navy
    background:    '#111318',
    // Slightly lighter surface for cards
    surface:       '#1C1F28',
    tint:          tintDark,
    text:          '#EEF0F7',
    mutedText:     'rgba(238, 240, 247, 0.48)',
    border:        'rgba(238, 240, 247, 0.09)',
    icon:          'rgba(238, 240, 247, 0.36)',
    tabIconDefault:  'rgba(238, 240, 247, 0.36)',
    tabIconSelected: tintDark,
    success:       '#4ADE80',
    danger:        '#F87171',
    warning:       '#FCD34D',
  },
} as const;

// ─── Border-radius scale ───────────────────────────────────────────────────────
export const Radius = {
  xs:  6,
  sm:  10,
  md:  14,
  lg:  18,
  xl:  24,
  '2xl': 32,
} as const;

// ─── Spacing scale ─────────────────────────────────────────────────────────────
export const Spacing = {
  xs:  4,
  sm:  8,
  md:  14,
  lg:  20,
  xl:  28,
  '2xl': 40,
} as const;

// ─── Typography ────────────────────────────────────────────────────────────────
export const Fonts = Platform.select({
  ios: {
    sans:    'system-ui',
    serif:   'ui-serif',
    rounded: 'ui-rounded',
    mono:    'ui-monospace',
  },
  default: {
    sans:    'normal',
    serif:   'serif',
    rounded: 'normal',
    mono:    'monospace',
  },
  web: {
    sans:    "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    serif:   "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', sans-serif",
    mono:    "SFMono-Regular, Menlo, Monaco, Consolas, 'Courier New', monospace",
  },
});

// ─── Shadow presets ────────────────────────────────────────────────────────────
export const Shadow = {
  none: {},
  sm: {
    shadowColor:   '#000',
    shadowOpacity: 0.06,
    shadowRadius:  6,
    shadowOffset:  { width: 0, height: 2 },
    elevation:     2,
  },
  md: {
    shadowColor:   '#000',
    shadowOpacity: 0.09,
    shadowRadius:  12,
    shadowOffset:  { width: 0, height: 4 },
    elevation:     5,
  },
  lg: {
    shadowColor:   '#000',
    shadowOpacity: 0.13,
    shadowRadius:  20,
    shadowOffset:  { width: 0, height: 8 },
    elevation:     10,
  },
} as const;