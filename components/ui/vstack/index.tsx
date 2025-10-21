import React from 'react';
import { View, StyleSheet } from 'react-native';

type VStackSpace = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';

interface VStackProps {
  space?: VStackSpace;
  reversed?: boolean;
  children?: React.ReactNode;
  style?: any;
}

const VStack = React.forwardRef<View, VStackProps>(
  ({ space = 'md', reversed = false, children, style, ...props }, ref) => {
    return (
      <View
        ref={ref}
        style={[
          styles.vstack,
          styles[`space_${space}`],
          reversed && styles.reversed,
          style,
        ]}
        {...props}
      >
        {children}
      </View>
    );
  }
);

const styles = StyleSheet.create({
  vstack: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  reversed: {
    flexDirection: 'column-reverse',
  },
  space_xs: { gap: 4 },
  space_sm: { gap: 8 },
  space_md: { gap: 12 },
  space_lg: { gap: 16 },
  space_xl: { gap: 20 },
  space_2xl: { gap: 24 },
  space_3xl: { gap: 28 },
  space_4xl: { gap: 32 },
});

VStack.displayName = 'VStack';

export { VStack };
