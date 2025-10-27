import { Stack } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import BrgyBottomNav from '../../components/BrgyBottomNav';

export default function BrgyLayout() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.replace('/login');
      } else if (!user.roles?.includes('brgy_official')) {
        router.replace('/(tabs)');
      }
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return null; // or a loading spinner
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={{ flex: 1 }}>
          <Stack
            screenOptions={{
              headerShown: false,
            }}
          >
            <Stack.Screen name="dashboard" />
            <Stack.Screen name="residents" />
            <Stack.Screen name="properties" />
            <Stack.Screen name="reports" />
            <Stack.Screen name="settings" />
          </Stack>
          <BrgyBottomNav />
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
