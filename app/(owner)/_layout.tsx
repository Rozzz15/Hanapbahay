import { Stack } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { View, Text, ActivityIndicator } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import OwnerBottomNav from '../../components/OwnerBottomNav';
import { isOwnerApproved, hasPendingOwnerApplication } from '../../utils/owner-approval';
import { showAlert } from '../../utils/alert';

export default function OwnerLayout() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [isCheckingApproval, setIsCheckingApproval] = useState(false);

  useEffect(() => {
    const checkOwnerAccess = async () => {
      if (!isLoading) {
        if (!user) {
          console.log('🚫 Owner layout: No user found, redirecting to login');
          router.replace('/login');
          return;
        }
        
        if (!user.roles?.includes('owner')) {
          console.log('🚫 Owner layout: User does not have owner role, redirecting to tenant tabs');
          router.replace('/(tabs)');
          return;
        }

        // Check if owner application is approved
        setIsCheckingApproval(true);
        try {
          const isApproved = await isOwnerApproved(user.id);
          const hasPending = await hasPendingOwnerApplication(user.id);
          
          if (!isApproved) {
            console.log('🚫 Owner layout: Owner application not approved');
            
            if (hasPending) {
              showAlert(
                'Application Pending',
                'Your owner application is still under review by your Barangay official. You will be notified once it is approved.',
                [
                  {
                    text: 'OK',
                    onPress: () => {
                      router.replace('/login');
                    }
                  }
                ]
              );
            } else {
              showAlert(
                'Access Denied',
                'Your owner application has not been approved yet. Please contact your Barangay official for assistance.',
                [
                  {
                    text: 'OK',
                    onPress: () => {
                      router.replace('/login');
                    }
                  }
                ]
              );
            }
            return;
          }
          
          console.log('✅ Owner layout: Owner application approved, allowing access');
        } catch (error) {
          console.error('❌ Error checking owner approval:', error);
          showAlert(
            'Error',
            'Unable to verify your owner status. Please try again.',
            [
              {
                text: 'OK',
                onPress: () => {
                  router.replace('/login');
                }
              }
            ]
          );
          return;
        } finally {
          setIsCheckingApproval(false);
        }
      }
    };

    checkOwnerAccess();
  }, [user, isLoading, router]);

  if (isLoading || isCheckingApproval) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' }}>
        <ActivityIndicator size="large" color="#10B981" />
        <Text style={{ marginTop: 16, fontSize: 16, color: '#6B7280' }}>
          {isCheckingApproval ? 'Verifying owner status...' : 'Loading...'}
        </Text>
      </View>
    );
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
            <Stack.Screen name="tenants" />
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
