import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle, ActivityIndicator, Pressable, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

interface SignInButtonProps {
  title: string;
  onPress: () => void;
  isLoading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const SignInButton: React.FC<SignInButtonProps> = ({
  title,
  onPress,
  isLoading = false,
  disabled = false,
  style,
  textStyle,
}) => {
  const getButtonStyle = () => {
    const baseStyle = [styles.button];
    
    if (disabled) {
      baseStyle.push({ opacity: 0.6 });
    }
    
    return [...baseStyle, style];
  };

  const getTextStyle = () => {
    const baseTextStyle = [styles.text];
    
    if (disabled) {
      baseTextStyle.push({ color: '#9CA3AF' });
    }
    
    return [...baseTextStyle, textStyle];
  };

  return (
    <Pressable
      style={({ pressed }) => [
        getButtonStyle(),
        pressed && !disabled && styles.pressed
      ]}
      onPress={onPress}
      disabled={disabled || isLoading}
    >
      <LinearGradient
        colors={disabled ? ['#E5E7EB', '#D1D5DB'] : ['#1E3A8A', '#3B82F6', '#60A5FA']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#fff" />
            <Text style={[styles.text, styles.loadingText]}>Signing In...</Text>
          </View>
        ) : (
          <View style={styles.contentContainer}>
            <Text style={getTextStyle()}>{title}</Text>
            <Ionicons 
              name="arrow-forward" 
              size={20} 
              color={disabled ? '#9CA3AF' : '#fff'} 
              style={styles.icon}
            />
          </View>
        )}
      </LinearGradient>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: 20,
    elevation: 6,
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    marginVertical: 8,
  },
  gradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 32,
    minHeight: 64,
  },
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  text: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.8,
    textAlign: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '600',
  },
  icon: {
    marginLeft: 4,
  },
  disabled: {
    opacity: 0.6,
  },
  disabledText: {
    color: '#9CA3AF',
  },
  pressed: {
    transform: [{ scale: 0.98 }],
    shadowOpacity: 0.1,
  },
});
