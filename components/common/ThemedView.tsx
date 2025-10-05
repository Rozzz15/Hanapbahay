import { View, type ViewProps } from 'react-native';

// Removed unused useThemeColor import

export type ThemedViewProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
};

export function ThemedView({ style, lightColor, darkColor, ...otherProps }: ThemedViewProps) {
  const resolvedBackground = lightColor ?? '#ffffff'; // Using light color as default

  const styleArray = Array.isArray(style) ? style : [style].filter(Boolean) as any[];
  const hasExplicitBackground = styleArray.some((s) => s && typeof s === 'object' && 'backgroundColor' in s);

  const baseStyle = hasExplicitBackground ? {} : { backgroundColor: resolvedBackground };

  return <View style={[baseStyle, style]} {...otherProps} />;
}
