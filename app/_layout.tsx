import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import "@/global.css";
import { GluestackUIProvider } from "@/components/ui/gluestack-ui-provider";
import { useFonts } from 'expo-font';
import { Stack, Slot } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from 'react-native';
import { ToastProvider } from '@gluestack-ui/toast';
import { PermissionsProvider } from '../context/PermissionContext';
import { AuthProvider } from '../context/AuthContext';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
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
      <PermissionsProvider>
        <GluestackUIProvider mode="light">
          {/* Force light theme for a clean white look across the app */}
          <ThemeProvider value={DefaultTheme}>
            <ToastProvider>
              <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#FFFFFF' } }}>
                <Stack.Screen name="index" />
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="+not-found" />
                <Stack.Screen name="unauthorized" options={{ title: 'Unauthorized' }} />
                <Stack.Screen name="login" options={{ headerShown: false }} />
                <Stack.Screen name="sign-up" options={{ headerShown: false }} />
                <Stack.Screen name="forgot-password" options={{ headerShown: false }} />
                <Stack.Screen name="property-owner" options={{ headerShown: false }} />
                <Stack.Screen name="property-preview" options={{ headerShown: false }} />
              </Stack>
              <StatusBar style="dark" />
            </ToastProvider>
          </ThemeProvider>
        </GluestackUIProvider>
      </PermissionsProvider>
    </AuthProvider>
  );
}
