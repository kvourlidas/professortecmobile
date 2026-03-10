// components/ui/Card.tsx
import { Radius, Shadow, Spacing } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Platform, StyleSheet, View, type ViewProps } from 'react-native';

type CardProps = ViewProps & {
  /** Remove inner padding entirely */
  noPadding?: boolean;
  /** Elevate shadow level: 'sm' | 'md' | 'lg' (default: 'sm') */
  elevation?: keyof typeof Shadow;
};

export function Card({
  style,
  noPadding = false,
  elevation = 'sm',
  ...props
}: CardProps) {
  const surface = useThemeColor({}, 'surface');
  const border  = useThemeColor({}, 'border');

  return (
    <View
      {...props}
      style={[
        styles.card,
        {
          backgroundColor: surface,
          borderColor:     border,
          borderWidth:     Platform.select({ ios: StyleSheet.hairlineWidth, default: 1 }),
          paddingVertical:   noPadding ? 0 : Spacing.lg,
          paddingHorizontal: noPadding ? 0 : Spacing.lg,
        },
        Shadow[elevation],
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.xl,
    overflow:     'hidden',
  },
});