import { Stack } from 'expo-router';
import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { GluestackUIProvider } from "../../components/ui/gluestack-ui-provider";
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { View } from 'react-native';
import { ToastProvider } from '@gluestack-ui/toast';
import { StatusBar } from 'expo-status-bar';

export default function GetStartedLayout() {
  return (
    <GluestackUIProvider mode="light">
      {/* Force light theme for clean white look across the app */}
      <ThemeProvider value={DefaultTheme}>
        <ToastProvider>
          <SafeAreaProvider>
            <SafeAreaView style={{ flex: 1 }} edges={['top']}>
              <View style={{ flex: 1 }}>
                <Stack
                  screenOptions={{
                    headerShown: false,
                    contentStyle: { backgroundColor: '#FFFFFF' },
                    gestureEnabled: true,
                    animation: 'slide_from_right',
                    animationDuration: 200
                  }}
                >
                  <Stack.Screen name="index" />
                  <Stack.Screen name="features" />
                </Stack>
                <StatusBar style="dark" />
              </View>
            </SafeAreaView>
          </SafeAreaProvider>
        </ToastProvider>
      </ThemeProvider>
    </GluestackUIProvider>
  );
}

