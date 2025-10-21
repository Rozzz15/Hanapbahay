import React from 'react';
import { Text, View, StyleSheet } from 'react-native';

// Simple toast implementation without NativeWind dependencies
const Toast = React.forwardRef<View, React.ComponentProps<typeof View>>(
  function Toast(props, ref) {
    return (
      <View
        ref={ref}
        style={[styles.toast, props.style]}
        {...props}
      />
    );
  }
);

const ToastTitle = React.forwardRef<Text, React.ComponentProps<typeof Text>>(
  function ToastTitle(props, ref) {
    return (
      <Text
        ref={ref}
        style={[styles.title, props.style]}
        {...props}
      />
    );
  }
);

const ToastDescription = React.forwardRef<Text, React.ComponentProps<typeof Text>>(
  function ToastDescription(props, ref) {
    return (
      <Text
        ref={ref}
        style={[styles.description, props.style]}
        {...props}
      />
    );
  }
);

// Simple toast hook
const useToast = () => {
  return {
    show: (message: string) => {
      console.log('Toast:', message);
    },
    hide: () => {
      console.log('Toast hidden');
    },
  };
};

const styles = StyleSheet.create({
  toast: {
    padding: 16,
    margin: 4,
    borderRadius: 8,
    backgroundColor: '#333',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
    elevation: 3,
  },
  title: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
    marginBottom: 4,
  },
  description: {
    color: '#ccc',
    fontSize: 14,
  },
});

Toast.displayName = 'Toast';
ToastTitle.displayName = 'ToastTitle';
ToastDescription.displayName = 'ToastDescription';

export { useToast, Toast, ToastTitle, ToastDescription };
export { ToastContainer } from './ToastContainer';
