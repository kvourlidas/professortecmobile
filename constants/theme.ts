// constants/theme.ts
import { Platform } from 'react-native';

const tintColorLight = '#2563eb'; // closer to your web primary
const tintColorDark = '#60a5fa';

export const Colors = {
  light: {
    // core
    text: '#11181C',
    background: '#F3F6FB',     // page bg (like web)
    surface: '#FFFFFF',        // cards/modals
    tint: tintColorLight,

    // ui
    border: 'rgba(15, 23, 42, 0.10)',
    mutedText: 'rgba(17, 24, 39, 0.70)',
    icon: '#687076',

    // tabs
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: '#ECEDEE',
    background: '#253649',     // your web page background
    surface: '#1f2d3d',        // cards feel like sidebar surface
    tint: tintColorDark,

    border: 'rgba(148, 163, 184, 0.20)',
    mutedText: 'rgba(236, 237, 238, 0.75)',
    icon: '#9BA1A6',

    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
  },
} as const;

export const Radius = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 22,
} as const;

export const Spacing = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
} as const;

export const Fonts = Platform.select({
  ios: { sans: 'system-ui', serif: 'ui-serif', rounded: 'ui-rounded', mono: 'ui-monospace' },
  default: { sans: 'normal', serif: 'serif', rounded: 'normal', mono: 'monospace' },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
