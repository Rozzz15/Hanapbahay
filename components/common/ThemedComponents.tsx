import React from 'react';
import { View, Text, ViewProps, TextProps } from 'react-native';
import { useColorScheme } from '@/hooks/useColorScheme';

interface ThemedViewProps extends ViewProps {
  lightColor?: string;
  darkColor?: string;
}

export const ThemedView: React.FC<ThemedViewProps> = ({ 
  style, 
  lightColor, 
  darkColor, 
  ...otherProps 
}) => {
  const theme = useColorScheme();
  const backgroundColor = theme === 'light' ? lightColor : darkColor;

  return <View style={[{ backgroundColor }, style]} {...otherProps} />;
};

interface ThemedTextProps extends TextProps {
  lightColor?: string;
  darkColor?: string;
  type?: string;
}

export const ThemedText: React.FC<ThemedTextProps> = ({ 
  style, 
  lightColor, 
  darkColor, 
  ...otherProps 
}) => {
  const theme = useColorScheme();
  const color = theme === 'light' ? lightColor : darkColor;

  return <Text style={[{ color }, style]} {...otherProps} />;
};
