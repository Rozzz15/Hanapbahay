import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'expo-router';
import { sharedStyles } from '../../styles/owner-dashboard-styles';

export default function ResidentsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [residents, setResidents] = useState<any[]>([]);

  useEffect(() => {
    if (!user || !user.roles?.includes('brgy_official')) {
      router.replace('/login');
    }
  }, [user]);

  return (
    <View style={sharedStyles.container}>
      <ScrollView style={sharedStyles.scrollView}>
        <View style={sharedStyles.pageContainer}>
          <Text style={sharedStyles.pageTitle}>Residents</Text>
          <Text style={sharedStyles.pageSubtitle}>
            Manage registered users in your barangay
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
