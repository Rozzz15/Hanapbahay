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
        router.replace('/login');
      } else if (!user.roles?.includes('owner')) {
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
