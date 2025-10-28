import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
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
  const [barangayName, setBarangayName] = useState<string>('');
  const [officialName, setOfficialName] = useState<string>('');

  // Define loadStats first (before loadDashboardData)
  const loadStats = useCallback(async () => {
    if (!user?.id) return;

    try {
      // Get barangay name from user data
      const userRecord = await db.get<DbUserRecord>('users', user.id);
      const barangay = userRecord?.barangay || 'Unknown Barangay';
      setBarangayName(barangay);
      
      // Set official name from database
      if (userRecord?.name) {
        setOfficialName(userRecord.name);
      }
      
      // Get all users
      const allUsers = await db.list<DbUserRecord>('users');
      
      // Get all published listings
      const allListings = await db.list<PublishedListingRecord>('published_listings');
      
      // Filter ACTIVE listings by barangay (only available, not occupied or reserved)
      const listingsInBarangay = allListings.filter(listing => {
        // First check if listing is active (only 'available' status)
        const isActive = listing.availabilityStatus === 'available';
        
        // Check barangay match
        let isInBarangay = false;
        if (listing.barangay) {
          const listingBarangay = listing.barangay.trim().toUpperCase();
          const targetBarangay = barangay.trim().toUpperCase();
          console.log(`🔍 Dashboard: Comparing listing barangay "${listingBarangay}" with target "${targetBarangay}"`);
          isInBarangay = listingBarangay === targetBarangay;
        } else {
          // Fallback: if barangay field not set, check via user
          const listingUser = allUsers.find(u => u.id === listing.userId);
          const userBarangay = listingUser?.barangay;
          if (userBarangay) {
            isInBarangay = userBarangay.trim().toUpperCase() === barangay.trim().toUpperCase();
          }
        }
        
        return isActive && isInBarangay;
      });
      
      // Get all bookings for properties in this barangay
      const allBookings = await db.list<BookingRecord>('bookings');
      const approvedBookingsInBarangay = allBookings.filter(b => {
        const property = allListings.find(l => l.id === b.propertyId);
        if (!property) return false;
        
        // Check property's barangay field
        if (property.barangay) {
          return property.barangay.trim().toUpperCase() === barangay.trim().toUpperCase() && b.status === 'approved';
        }
        
        // Fallback: check via property user
        const propertyUser = allUsers.find(u => u.id === property.userId);
        const userBarangay = propertyUser?.barangay;
        return userBarangay && userBarangay.trim().toUpperCase() === barangay.trim().toUpperCase() && b.status === 'approved';
      });
      
      // Count unique tenants (residents) with approved bookings in this barangay
      const uniqueTenantIds = new Set(approvedBookingsInBarangay.map(booking => booking.tenantId));
      const totalResidents = uniqueTenantIds.size;
      
      setStats({
        totalResidents,
        totalProperties: listingsInBarangay.length,
        totalListings: listingsInBarangay.length,
        activeBookings: approvedBookingsInBarangay.length
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  }, [user?.id]);

  // Define loadDashboardData after loadStats
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
  }, [user?.id, loadStats]);

  // Check authentication and load user data
  useEffect(() => {
    const loadInitialData = async () => {
      if (!user) {
        router.replace('/login');
        return;
      }

      if (!user.roles?.includes('brgy_official')) {
        showAlert('Access Denied', 'This dashboard is for Barangay Officials only.');
        router.replace('/(tabs)');
        return;
      }

      // Set initial official name from context
      if (user.name) {
        setOfficialName(user.name);
      }

      loadDashboardData();
    };

    loadInitialData();
  }, [user, loadDashboardData]);

  // Reload data when screen comes into focus (e.g., returning from settings)
  useFocusEffect(
    useCallback(() => {
      if (user?.roles?.includes('brgy_official')) {
        loadDashboardData();
      }
    }, [user, loadDashboardData])
  );

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
              <Text style={sharedStyles.statLabel}>BRGY {barangayName || (user as any)?.barangay || 'Barangay Official'}, LOPEZ, QUEZON</Text>
              <Text style={[sharedStyles.statValue, { fontSize: designTokens.typography.lg }]}>
                {officialName || user?.name || 'Barangay Official'}
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
                <Text style={sharedStyles.statSubtitle}>With approved bookings</Text>
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
