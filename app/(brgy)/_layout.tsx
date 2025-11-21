import { Stack } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import { View, Text, ActivityIndicator } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import BrgyBottomNav from '../../components/BrgyBottomNav';

export default function BrgyLayout() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const hasCheckedRef = useRef(false);
  const isRedirectingRef = useRef(false);

  // Reset refs when user changes
  useEffect(() => {
    hasCheckedRef.current = false;
    isRedirectingRef.current = false;
  }, [user?.id]);

  useEffect(() => {
    const checkBrgyAccess = () => {
      // Prevent multiple simultaneous checks
      if (hasCheckedRef.current || isRedirectingRef.current || isLoading) {
        return;
      }

      if (!user) {
        console.log('🚫 Brgy layout: No user found, redirecting to login');
        isRedirectingRef.current = true;
        router.replace('/login');
        return;
      }
      
      if (!user.roles?.includes('brgy_official')) {
        console.log('🚫 Brgy layout: User does not have brgy_official role, redirecting to tenant tabs');
        isRedirectingRef.current = true;
        router.replace('/(tabs)');
        return;
      }

      hasCheckedRef.current = true;
    };

    checkBrgyAccess();
  }, [user?.id, isLoading, router]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' }}>
        <ActivityIndicator size="large" color="#10B981" />
        <Text style={{ marginTop: 16, fontSize: 16, color: '#6B7280' }}>
          Loading...
        </Text>
      </View>
    );
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
            <Stack.Screen name="ratings" />
            <Stack.Screen name="complaints" />
            <Stack.Screen name="move-monitoring" />
          </Stack>
          <BrgyBottomNav />
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
