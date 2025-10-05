import React, { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';

export default function OwnerListingsScreen() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated && user?.id) {
      // Redirect to the new dashboard-based listings page
      router.replace('/(owner)/dashboard/listings');
    } else {
      router.replace('/login');
    }
  }, [isAuthenticated, user?.id]);

  return null; // This component just handles redirects
}