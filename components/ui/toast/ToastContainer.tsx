import React from 'react';
import { View } from 'react-native';

export const ToastContainer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 9999 }}>
      {children}
    </View>
  );
};