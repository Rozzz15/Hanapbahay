import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { 
  getBrgyDashboardStats,
  type BrgyDashboardStats
} from '../../utils/brgy-dashboard';
import { 
  Users, 
  Home, 
  FileText, 
  AlertCircle,
  LogOut,
  Settings
} from 'lucide-react-native';
import { sharedStyles, designTokens, iconBackgrounds } from '../../styles/owner-dashboard-styles';
import { showAlert } from '../../utils/alert';
import { db } from '../../utils/db';
import { DbUserRecord, PublishedListingRecord, BookingRecord } from '../../types';

export default function BrgyDashboard() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [activeSection, setActiveSection] = useState('overview');
  const [stats, setStats] = useState<BrgyDashboardStats>({
    totalResidents: 0,
    totalProperties: 0,
    totalListings: 0,
    activeBookings: 0
  });
  const [loading, setLoading] = useState(true);

  // Check authentication
  useEffect(() => {
    if (!user) {
      router.replace('/login');
      return;
    }

    if (!user.roles?.includes('brgy_official')) {
      showAlert('Access Denied', 'This dashboard is for Barangay Officials only.');
      router.replace('/(tabs)');
      return;
    }

    loadDashboardData();
  }, [user]);

  const loadDashboardData = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      await loadStats();
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      showAlert('Error', 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const loadStats = useCallback(async () => {
    if (!user?.id) return;

    try {
      // Get barangay name from user data
      const userRecord = await db.get<DbUserRecord>('users', user.id);
      const barangay = userRecord?.barangay || 'Unknown Barangay';
      
      // Get all users in this barangay
      const allUsers = await db.list<DbUserRecord>('users');
      const residentsInBarangay = allUsers.filter(u => u.barangay === barangay);
      
      // Get all published listings
      const allListings = await db.list<PublishedListingRecord>('published_listings');
      const listingsInBarangay = allListings.filter(l => {
        const listingUser = allUsers.find(u => u.id === l.userId);
        return listingUser?.barangay === barangay;
      });
      
      // Get all bookings for properties in this barangay
      const allBookings = await db.list<BookingRecord>('bookings');
      const activeBookingsInBarangay = allBookings.filter(b => {
        const property = allListings.find(l => l.id === b.propertyId);
        if (!property) return false;
        const propertyUser = allUsers.find(u => u.id === property.userId);
        return propertyUser?.barangay === barangay && b.status === 'approved';
      });
      
      setStats({
        totalResidents: residentsInBarangay.length,
        totalProperties: listingsInBarangay.length,
        totalListings: listingsInBarangay.length,
        activeBookings: activeBookingsInBarangay.length
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  }, [user?.id]);

  const handleLogout = () => {
    if (!user) {
      // User already logged out or being logged out, just navigate to login
      router.replace('/login');
      return;
    }

    showAlert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { 
          text: 'Cancel', 
          style: 'cancel',
          onPress: () => console.log('❌ Logout cancelled')
        },
        { 
          text: 'Logout', 
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('🚪 User confirmed logout from dashboard, starting signOut...');
              await signOut();
              console.log('✅ SignOut completed successfully');
              router.replace('/login');
            } catch (error) {
              console.error('❌ Logout error:', error);
              showAlert('Logout Error', 'Failed to logout. Please try again.');
            }
          }
        }
      ]
    );
  };

  const renderOverview = () => {
    if (!user) {
      return null;
    }

    const userRecord = db.get<DbUserRecord>('users', user.id);
    let barangayName = 'Unknown Barangay';
    userRecord.then(record => {
      if (record) barangayName = record.barangay || 'Unknown Barangay';
    });

    return (
      <View style={sharedStyles.pageContainer}>
        {/* Header */}
        <View style={sharedStyles.pageHeader}>
          <View style={sharedStyles.headerLeft}>
            <Text style={sharedStyles.pageTitle}>Barangay Dashboard</Text>
            <Text style={sharedStyles.pageSubtitle}>Welcome back!</Text>
          </View>
          <View style={sharedStyles.headerRight}>
            <TouchableOpacity 
              style={sharedStyles.primaryButton}
              onPress={() => router.push('/(brgy)/settings' as any)}
            >
              <Settings size={16} color="white" />
              <Text style={sharedStyles.primaryButtonText}>Settings</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={sharedStyles.primaryButton}
              onPress={() => {
                handleLogout();
              }}
              activeOpacity={0.7}
            >
              <LogOut size={16} color="white" />
              <Text style={sharedStyles.primaryButtonText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Barangay Info Card */}
        <View style={sharedStyles.card}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: designTokens.spacing.md }}>
            <View style={[sharedStyles.statIcon, iconBackgrounds.blue]}>
              <Home size={20} color="#3B82F6" />
            </View>
            <View style={{ marginLeft: designTokens.spacing.md }}>
              <Text style={sharedStyles.statLabel}>Barangay</Text>
              <Text style={[sharedStyles.statValue, { fontSize: designTokens.typography.lg }]}>
                {user?.name || 'Barangay Official'}
              </Text>
            </View>
          </View>
        </View>

        {/* Overview Section */}
        <View style={sharedStyles.section}>
          <Text style={sharedStyles.sectionTitle}>Statistics</Text>
          <View style={sharedStyles.grid}>
            <View style={sharedStyles.gridItem}>
              <View style={sharedStyles.statCard}>
                <View style={sharedStyles.statIconContainer}>
                  <View style={[sharedStyles.statIcon, iconBackgrounds.blue]}>
                    <Users size={20} color="#3B82F6" />
                  </View>
                </View>
                <Text style={sharedStyles.statLabel}>Total Residents</Text>
                <Text style={sharedStyles.statValue}>{stats.totalResidents}</Text>
                <Text style={sharedStyles.statSubtitle}>Registered users</Text>
              </View>
            </View>

            <View style={sharedStyles.gridItem}>
              <View style={sharedStyles.statCard}>
                <View style={sharedStyles.statIconContainer}>
                  <View style={[sharedStyles.statIcon, iconBackgrounds.green]}>
                    <Home size={20} color="#10B981" />
                  </View>
                </View>
                <Text style={sharedStyles.statLabel}>Total Properties</Text>
                <Text style={sharedStyles.statValue}>{stats.totalProperties}</Text>
                <Text style={sharedStyles.statSubtitle}>Available listings</Text>
              </View>
            </View>

            <View style={sharedStyles.gridItem}>
              <View style={sharedStyles.statCard}>
                <View style={sharedStyles.statIconContainer}>
                  <View style={[sharedStyles.statIcon, iconBackgrounds.orange]}>
                    <FileText size={20} color="#F59E0B" />
                  </View>
                </View>
                <Text style={sharedStyles.statLabel}>Active Listings</Text>
                <Text style={sharedStyles.statValue}>{stats.totalListings}</Text>
                <Text style={sharedStyles.statSubtitle}>Published properties</Text>
              </View>
            </View>

            <View style={sharedStyles.gridItem}>
              <View style={sharedStyles.statCard}>
                <View style={sharedStyles.statIconContainer}>
                  <View style={[sharedStyles.statIcon, iconBackgrounds.red]}>
                    <AlertCircle size={20} color="#EF4444" />
                  </View>
                </View>
                <Text style={sharedStyles.statLabel}>Active Bookings</Text>
                <Text style={sharedStyles.statValue}>{stats.activeBookings}</Text>
                <Text style={sharedStyles.statSubtitle}>On-going rentals</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Quick Actions Section */}
        <View style={sharedStyles.section}>
          <Text style={sharedStyles.sectionTitle}>Quick Actions</Text>
          <View style={sharedStyles.list}>
            <TouchableOpacity 
              style={sharedStyles.listItem}
              onPress={() => router.push('/(brgy)/residents' as any)}
            >
              <View style={[sharedStyles.statIcon, iconBackgrounds.blue]}>
                <Users size={20} color="#3B82F6" />
              </View>
              <View style={{ flex: 1, marginLeft: designTokens.spacing.lg }}>
                <Text style={[sharedStyles.statLabel, { marginBottom: 2 }]}>View Residents</Text>
                <Text style={sharedStyles.statSubtitle}>Manage registered users in your barangay</Text>
              </View>
              <Text style={{ fontSize: 20, color: designTokens.colors.textMuted }}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={sharedStyles.listItem}
              onPress={() => router.push('/(brgy)/properties' as any)}
            >
              <View style={[sharedStyles.statIcon, iconBackgrounds.green]}>
                <Home size={20} color="#10B981" />
              </View>
              <View style={{ flex: 1, marginLeft: designTokens.spacing.lg }}>
                <Text style={[sharedStyles.statLabel, { marginBottom: 2 }]}>View Properties</Text>
                <Text style={sharedStyles.statSubtitle}>Browse available rental properties</Text>
              </View>
              <Text style={{ fontSize: 20, color: designTokens.colors.textMuted }}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={sharedStyles.listItem}
              onPress={() => router.push('/(brgy)/reports' as any)}
            >
              <View style={[sharedStyles.statIcon, iconBackgrounds.orange]}>
                <FileText size={20} color="#F59E0B" />
              </View>
              <View style={{ flex: 1, marginLeft: designTokens.spacing.lg }}>
                <Text style={[sharedStyles.statLabel, { marginBottom: 2 }]}>Reports</Text>
                <Text style={sharedStyles.statSubtitle}>Generate barangay reports and analytics</Text>
              </View>
              <Text style={{ fontSize: 20, color: designTokens.colors.textMuted }}>›</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={sharedStyles.loadingContainer}>
        <Text style={sharedStyles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <View style={sharedStyles.container}>
      <ScrollView style={sharedStyles.scrollView}>
        {renderOverview()}
      </ScrollView>
    </View>
  );
}
