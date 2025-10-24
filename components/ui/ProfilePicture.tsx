import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image } from './image';

interface ProfilePictureProps {
  userId: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  fallbackText?: string;
  style?: any;
  showSkeleton?: boolean;
  onLoad?: () => void;
  onError?: () => void;
}

const ProfilePicture: React.FC<ProfilePictureProps> = ({
  userId,
  size = 'md',
  fallbackText = '?',
  style,
  showSkeleton = true,
  onLoad,
  onError
}) => {
  const sizeStyles = {
    xs: { width: 24, height: 24, fontSize: 10 },
    sm: { width: 32, height: 32, fontSize: 12 },
    md: { width: 40, height: 40, fontSize: 14 },
    lg: { width: 48, height: 48, fontSize: 16 },
    xl: { width: 64, height: 64, fontSize: 20 }
  };

  const currentSize = sizeStyles[size];

  // For now, just show fallback text
  // This can be enhanced later to load from database
  return (
    <View style={[
      styles.fallbackContainer,
      currentSize,
      style
    ]}>
      <Text style={[
        styles.fallbackText,
        { fontSize: currentSize.fontSize }
      ]}>
        {fallbackText}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  fallbackContainer: {
    backgroundColor: '#E5E7EB',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  fallbackText: {
    color: '#6B7280',
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default ProfilePicture;
