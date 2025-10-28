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
        console.log('🚫 Brgy layout: No user found, redirecting to login');
        router.replace('/login');
      } else if (!user.roles?.includes('brgy_official')) {
        console.log('🚫 Brgy layout: User does not have brgy_official role, redirecting to tenant tabs');
        router.replace('/(tabs)');
      }
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return null;
  }
  
  // Don't render if user check is still pending
  if (!user) {
    return null;
  }
  
  // Don't render if user doesn't have brgy_official role
  if (!user.roles?.includes('brgy_official')) {
    return null;
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
            <Stack.Screen name="owner-applications" />
            <Stack.Screen name="approved-owners" />
          </Stack>
          <BrgyBottomNav />
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
