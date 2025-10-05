import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';

interface LoadingSpinnerProps {
  message?: string;
  size?: 'small' | 'large';
  color?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  message = 'Loading...', 
  size = 'large',
  color = '#3B82F6'
}) => {
  return (
    <View className="flex-1 justify-center items-center p-4">
      <ActivityIndicator size={size} color={color} />
      <Text className="text-gray-600 mt-2 text-center">{message}</Text>
    </View>
  );
};

interface LoadingOverlayProps {
  visible: boolean;
  message?: string;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ 
  visible, 
  message = 'Loading...' 
}) => {
  if (!visible) return null;

  return (
    <View className="absolute inset-0 bg-black/50 justify-center items-center z-50">
      <View className="bg-white rounded-lg p-6 items-center">
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text className="text-gray-700 mt-2">{message}</Text>
      </View>
    </View>
  );
};
