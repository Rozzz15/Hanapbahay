import React, { Component, ReactNode } from 'react';
import { View, Text } from 'react-native';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <View className="flex-1 justify-center items-center p-4">
          <Text className="text-lg font-semibold text-red-600 mb-2">
            Something went wrong
          </Text>
          <Text className="text-gray-600 text-center">
            Please try refreshing the app or contact support if the problem persists.
          </Text>
        </View>
      );
    }

    return this.props.children;
  }
}
