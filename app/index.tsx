import { useRouter } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export default function OnboardingScreen() {
  const router = useRouter();
  const { isLoading, user, isAuthenticated, redirectOwnerBasedOnListings, redirectTenantToTabs, redirectBrgyOfficial } = useAuth();

  // Redirect authenticated users to their appropriate dashboard
  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated && user) {
        const roles = user.roles || [];
        
        if (Array.isArray(roles) && roles.includes('owner')) {
          console.log('🏠 Owner detected on index, redirecting to owner dashboard');
          redirectOwnerBasedOnListings(user.id);
          return;
        } else if (Array.isArray(roles) && roles.includes('brgy_official')) {
          console.log('🏛️ Barangay official detected on index, redirecting to brgy dashboard');
          redirectBrgyOfficial();
          return;
        } else if (isAuthenticated) {
          console.log('👤 Tenant detected on index, redirecting to tenant tabs');
          redirectTenantToTabs();
          return;
        }
      }
      
      // Only redirect to get-started if user is not authenticated
      console.log('🚀 No authenticated user, redirecting to get-started');
      router.replace('/(get-started)');
    }
  }, [isLoading, isAuthenticated, user, redirectOwnerBasedOnListings, redirectTenantToTabs, redirectBrgyOfficial, router]);

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Show loading while redirecting
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    color: '#6B7280',
    fontWeight: '500',
  },
});
