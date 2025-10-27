import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { GluestackUIProvider } from "../components/ui/gluestack-ui-provider";
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { ToastProvider } from '@gluestack-ui/toast';
import { PermissionsProvider } from '../context/PermissionContext';
import { AuthProvider } from '../context/AuthContext';
import { NotificationProvider } from '../context/NotificationContext';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <AuthProvider>
      <NotificationProvider>
        <PermissionsProvider>
          <GluestackUIProvider mode="light">
            {/* Force light theme for clean white look across the app */}
            <ThemeProvider value={DefaultTheme}>
              <ToastProvider>
              <Stack screenOptions={{ 
                headerShown: false, 
                contentStyle: { backgroundColor: '#FFFFFF' },
                gestureEnabled: true,
                animation: 'slide_from_right',
                animationDuration: 200
              }}>
                <Stack.Screen name="index" />
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="(owner)" />
                <Stack.Screen name="(brgy)" />
                <Stack.Screen name="+not-found" />
                <Stack.Screen name="unauthorized" options={{ title: 'Unauthorized' }} />
                <Stack.Screen name="login" options={{ headerShown: false }} />
                <Stack.Screen name="sign-up" options={{ headerShown: false }} />
                <Stack.Screen name="forgot-password" options={{ headerShown: false }} />
                <Stack.Screen name="property-preview" options={{ headerShown: false }} />
                <Stack.Screen name="book-now" options={{ headerShown: false }} />
                <Stack.Screen name="filter" options={{ headerShown: false }} />
                <Stack.Screen name="chat-room" options={{ headerShown: false }} />
              </Stack>
              <StatusBar style="dark" />
            </ToastProvider>
          </ThemeProvider>
        </GluestackUIProvider>
      </PermissionsProvider>
      </NotificationProvider>
    </AuthProvider>
  );
}
