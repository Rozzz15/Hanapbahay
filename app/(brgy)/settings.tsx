import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'expo-router';
import { sharedStyles } from '../../styles/owner-dashboard-styles';

export default function SettingsPage() {
  const { user } = useAuth();
  const router = useRouter();

  return (
    <View style={sharedStyles.container}>
      <ScrollView style={sharedStyles.scrollView}>
        <View style={sharedStyles.pageContainer}>
          <Text style={sharedStyles.pageTitle}>Settings</Text>
          <Text style={sharedStyles.pageSubtitle}>
            Manage your barangay settings
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
