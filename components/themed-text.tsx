// components/themed-text.tsx
import { useThemeColor } from '@/hooks/use-theme-color';
import { StyleSheet, Text, type TextProps } from 'react-native';

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?:
    | 'default'
    | 'title'
    | 'heading'
    | 'subheading'
    | 'defaultSemiBold'
    | 'subtitle'
    | 'caption'
    | 'label'
    | 'link';
};

export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = 'default',
  ...rest
}: ThemedTextProps) {
  const color = useThemeColor({ light: lightColor, dark: darkColor }, 'text');

  return (
    <Text
      style={[
        { color },
        type === 'default'        ? styles.default        : undefined,
        type === 'title'          ? styles.title          : undefined,
        type === 'heading'        ? styles.heading        : undefined,
        type === 'subheading'     ? styles.subheading     : undefined,
        type === 'defaultSemiBold'? styles.defaultSemiBold: undefined,
        type === 'subtitle'       ? styles.subtitle       : undefined,
        type === 'caption'        ? styles.caption        : undefined,
        type === 'label'          ? styles.label          : undefined,
        type === 'link'           ? styles.link           : undefined,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  default: {
    fontSize:   15,
    lineHeight: 22,
    fontWeight: '400',
  },
  title: {
    fontSize:      28,
    fontWeight:    '800',
    lineHeight:    34,
    letterSpacing: -0.5,
  },
  heading: {
    fontSize:      20,
    fontWeight:    '700',
    lineHeight:    26,
    letterSpacing: -0.2,
  },
  subheading: {
    fontSize:   17,
    fontWeight: '600',
    lineHeight: 24,
  },
  defaultSemiBold: {
    fontSize:   15,
    lineHeight: 22,
    fontWeight: '600',
  },
  subtitle: {
    fontSize:   13,
    fontWeight: '500',
    lineHeight: 18,
  },
  caption: {
    fontSize:   11,
    fontWeight: '500',
    lineHeight: 15,
    letterSpacing: 0.2,
  },
  label: {
    fontSize:      11,
    fontWeight:    '700',
    lineHeight:    14,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  link: {
    fontSize:   15,
    lineHeight: 22,
    fontWeight: '500',
    color:      '#4F6EF7',
  },
});