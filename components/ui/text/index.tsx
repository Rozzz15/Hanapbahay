import React from 'react';
import { Text as RNText, StyleSheet } from 'react-native';

type TextSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl';

interface TextProps {
  size?: TextSize;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikeThrough?: boolean;
  children?: React.ReactNode;
  style?: any;
}

const Text = React.forwardRef<RNText, TextProps>(
  function Text(
    {
      size = 'md',
      bold = false,
      italic = false,
      underline = false,
      strikeThrough = false,
      children,
      style,
      ...props
    },
    ref
  ) {
    return (
      <RNText
        ref={ref}
        style={[
          styles.text,
          styles[`size_${size}`],
          bold && styles.bold,
          italic && styles.italic,
          underline && styles.underline,
          strikeThrough && styles.strikeThrough,
          style,
        ]}
        {...props}
      >
        {children}
      </RNText>
    );
  }
);

const styles = StyleSheet.create({
  text: {
    color: '#000000',
  },
  size_2xs: { fontSize: 10 },
  size_xs: { fontSize: 12 },
  size_sm: { fontSize: 14 },
  size_md: { fontSize: 16 },
  size_lg: { fontSize: 18 },
  size_xl: { fontSize: 20 },
  size_2xl: { fontSize: 24 },
  size_3xl: { fontSize: 30 },
  size_4xl: { fontSize: 36 },
  size_5xl: { fontSize: 48 },
  size_6xl: { fontSize: 60 },
  bold: { fontWeight: 'bold' },
  italic: { fontStyle: 'italic' },
  underline: { textDecorationLine: 'underline' },
  strikeThrough: { textDecorationLine: 'line-through' },
});

Text.displayName = 'Text';

export { Text };
