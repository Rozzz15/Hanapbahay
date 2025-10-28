import { Stack } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import OwnerBottomNav from '../../components/OwnerBottomNav';

export default function OwnerLayout() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        console.log('🚫 Owner layout: No user found, redirecting to login');
        router.replace('/login');
      } else if (!user.roles?.includes('owner')) {
        console.log('🚫 Owner layout: User does not have owner role, redirecting to tenant tabs');
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
  
  // Don't render if user doesn't have owner role
  if (!user.roles?.includes('owner')) {
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
            <Stack.Screen name="listings" />
            <Stack.Screen name="bookings" />
            <Stack.Screen name="messages" />
            <Stack.Screen name="payment-settings" />
            <Stack.Screen name="create-listing" />
            <Stack.Screen name="edit-listing/[id]" />
            <Stack.Screen name="chat-room/[id]" />
          </Stack>
          <OwnerBottomNav />
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
