import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Dimensions, ViewStyle, TextStyle, ImageStyle, useWindowDimensions, Image } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context/AuthContext';
import { 
  getBrgyDashboardStats,
  type BrgyDashboardStats
} from '../../utils/brgy-dashboard';
import {
  getComplaintsByBarangay,
  getNewComplaintsCount,
} from '../../utils/tenant-complaints';
import { 
  Users, 
  Home, 
  FileText, 
  LogOut,
  Bell,
  CheckSquare,
  Star,
  Calendar,
  AlertCircle,
  TrendingUp,
  ClipboardList,
  BarChart3,
  AlertTriangle,
  List,
  Sparkles,
  ArrowRight,
  ArrowLeft
} from 'lucide-react-native';
import { sharedStyles, designTokens, iconBackgrounds } from '../../styles/owner-dashboard-styles';
import { showAlert } from '../../utils/alert';
import { db } from '../../utils/db';
import { DbUserRecord, PublishedListingRecord, BookingRecord, OwnerApplicationRecord, BrgyNotificationRecord } from '../../types';

const windowWidth = Dimensions.get('window').width;

export default function BrgyDashboard() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const [activeSection, setActiveSection] = useState('overview');
  const [stats, setStats] = useState<BrgyDashboardStats>({
    totalResidents: 0,
    totalProperties: 0,
    totalListings: 0,
    activeBookings: 0,
    totalApprovedOwners: 0
  });
  const [loading, setLoading] = useState(true);
  const [barangayName, setBarangayName] = useState<string>('');
  const [officialName, setOfficialName] = useState<string>('');
  const [barangayLogo, setBarangayLogo] = useState<string | null>(null);
  const [pendingApplicationsCount, setPendingApplicationsCount] = useState(0);
  const [newComplaintsCount, setNewComplaintsCount] = useState(0);

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
      
      // Load barangay logo from user record
      const logo = (userRecord as any)?.barangayLogo || null;
      setBarangayLogo(logo);
      
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
      
      // Filter bookings to only include those with paid payment status
      // Only count tenants with completed payments as residents
      const paidBookingsInBarangay = approvedBookingsInBarangay.filter(b => b.paymentStatus === 'paid');
      
      // Count unique tenants (residents) with paid approved bookings in this barangay
      const uniqueTenantIds = new Set(paidBookingsInBarangay.map(booking => booking.tenantId));
      const totalResidents = uniqueTenantIds.size;
      
      // Count approved owners in this barangay by checking owner_applications table
      // This ensures accuracy by only counting owners who have been officially approved
      const allApplications = await db.list<OwnerApplicationRecord>('owner_applications');
      const approvedApplicationsInBarangay = allApplications.filter(
        app => app.status === 'approved' && app.barangay?.toUpperCase() === barangay.toUpperCase()
      );
      const totalApprovedOwners = approvedApplicationsInBarangay.length;
      
      console.log('📊 Approved owners count:', {
        barangay,
        totalApprovedOwners,
        approvedApplications: approvedApplicationsInBarangay.map(app => ({
          userId: app.userId,
          name: app.name,
          status: app.status,
          reviewedAt: app.reviewedAt
        }))
      });
      
      setStats({
        totalResidents,
        totalProperties: listingsInBarangay.length,
        totalListings: listingsInBarangay.length,
        activeBookings: paidBookingsInBarangay.length,
        totalApprovedOwners
      });

      // Get pending owner applications count (reusing allApplications)
      const pendingApps = allApplications.filter(
        app => app.status === 'pending' && app.barangay.toUpperCase() === barangay.toUpperCase()
      );
      setPendingApplicationsCount(pendingApps.length);

      // Get new complaints count
      const newComplaints = await getNewComplaintsCount(barangay);
      setNewComplaintsCount(newComplaints);
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

  // Helper function to get default logo based on barangay name
  const getDefaultLogo = (barangayName: string | null | undefined) => {
    if (!barangayName) return null;
    
    const barangayLower = barangayName.toLowerCase();
    
    switch (barangayLower) {
      case 'talolong':
        return require('../../assets/images/talolong.jpg');
      case 'burgos':
        return require('../../assets/images/burgos.jpg');
      case 'magsaysay':
        return require('../../assets/images/magsaysay.jpg');
      case 'gomez':
        return require('../../assets/images/gomez.jpg');
      case 'rizal':
        return require('../../assets/images/rizal.jpg');
      default:
        return null;
    }
  };

  const renderOverview = () => {
    if (!user) {
      return null;
    }

    const barangayLabel = `BRGY ${barangayName || (user as any)?.barangay || 'Barangay Official'}, LOPEZ, QUEZON`;

    const quickStats = [
      { label: 'Residents', value: stats.totalResidents, note: 'With completed payments' },
      { label: 'Properties', value: stats.totalProperties, note: 'Available homes' },
      { label: 'Active Properties', value: stats.totalListings, note: 'Live on the app' },
      { label: 'Bookings', value: stats.activeBookings, note: 'On-going rentals' },
    ];

    const insightCards = [
      {
        title: 'Active Bookings',
        value: stats.activeBookings,
        subtext: 'On-going rentals',
        trend: stats.activeBookings > 0 ? '+ Stable tenant demand' : 'Awaiting new bookings',
        trendColor: stats.activeBookings > 0 ? '#059669' : designTokens.colors.textMuted,
        icon: <TrendingUp size={18} color="#059669" />,
        iconStyle: iconBackgrounds.teal,
      },
      {
        title: 'Approved Owners',
        value: stats.totalApprovedOwners,
        subtext: 'Verified property partners',
        trend: stats.totalApprovedOwners > 0 ? `${stats.totalApprovedOwners} active owner${stats.totalApprovedOwners > 1 ? 's' : ''}` : 'Invite more owners',
        trendColor: '#0F766E',
        icon: <ClipboardList size={18} color="#0F766E" />,
        iconStyle: iconBackgrounds.green,
      },
      {
        title: 'Published Properties',
        value: stats.totalListings,
        subtext: 'Live inventory',
        trend: stats.totalListings > 0 ? 'Ready for tenant discovery' : 'Publish new properties',
        trendColor: '#1D4ED8',
        icon: <BarChart3 size={18} color="#1D4ED8" />,
        iconStyle: iconBackgrounds.blue,
      },
    ];

    const actionItems = [
      {
        label: 'Owner Applications',
        description: pendingApplicationsCount > 0
          ? `${pendingApplicationsCount} pending review${pendingApplicationsCount > 1 ? 's' : ''}`
          : 'Review latest submissions',
        icon: <Bell size={24} color="#FFFFFF" />,
        iconBackground: iconBackgrounds.orange,
        route: '/(brgy)/owner-applications',
        badge: pendingApplicationsCount > 0 ? pendingApplicationsCount : undefined,
        highlight: pendingApplicationsCount > 0,
        useGradient: true,
      },
      {
        label: 'Approved Owners',
        description: 'View verified owners',
        icon: <CheckSquare size={24} color="#10B981" />,
        iconBackground: iconBackgrounds.green,
        route: '/(brgy)/approved-owners',
      },
      {
        label: 'Residents',
        description: 'Manage registered tenants',
        icon: <Users size={24} color="#3B82F6" />,
        iconBackground: iconBackgrounds.blue,
        route: '/(brgy)/residents',
      },
      {
        label: 'Properties',
        description: 'Oversee listed homes',
        icon: <Home size={24} color="#10B981" />,
        iconBackground: iconBackgrounds.green,
        route: '/(brgy)/properties',
      },
      {
        label: 'Property Ratings',
        description: 'Monitor feedback',
        icon: <Star size={24} color="#F59E0B" />,
        iconBackground: iconBackgrounds.orange,
        route: '/(brgy)/ratings',
      },
      {
        label: 'Reports & Analytics',
        description: 'Generate barangay insights',
        icon: <FileText size={24} color="#F59E0B" />,
        iconBackground: iconBackgrounds.orange,
        route: '/(brgy)/reports',
      },
      {
        label: 'Complaints',
        description: newComplaintsCount > 0
          ? `${newComplaintsCount} new complaint${newComplaintsCount > 1 ? 's' : ''}`
          : 'Review tenant complaints',
        icon: <AlertTriangle size={24} color="#EF4444" />,
        iconBackground: iconBackgrounds.red,
        route: '/(brgy)/complaints',
        badge: newComplaintsCount > 0 ? newComplaintsCount : undefined,
        highlight: newComplaintsCount > 0,
        useGradient: false,
      },
      {
        label: 'Move-in / Move-out Monitoring',
        description: 'Track tenant relocations',
        icon: <ArrowRight size={24} color="#6366F1" />,
        iconBackground: iconBackgrounds.blue,
        route: '/(brgy)/move-monitoring',
      },
    ];

    const actionAlertsTotal = actionItems.reduce(
      (total, item) => total + (item.badge ?? 0),
      0
    );
    const hasActionAlerts = actionAlertsTotal > 0;

    const statsSummary = quickStats;
    
    // Define stat card configurations with icons and gradients
    const statCards = [
      {
        label: 'Residents',
        gradient: designTokens.gradients.success,
        iconBg: iconBackgrounds.green,
        icon: Users,
        iconColor: '#10B981',
        route: '/(brgy)/residents',
      },
      {
        label: 'Properties',
        gradient: designTokens.gradients.info,
        iconBg: iconBackgrounds.blue,
        icon: Home,
        iconColor: '#3B82F6',
        route: '/(brgy)/properties',
      },
      {
        label: 'Active Properties',
        gradient: designTokens.gradients.teal,
        iconBg: iconBackgrounds.teal,
        icon: List,
        iconColor: '#14B8A6',
        route: '/(brgy)/properties',
      },
      {
        label: 'Bookings',
        gradient: designTokens.gradients.warning,
        iconBg: iconBackgrounds.orange,
        icon: Calendar,
        iconColor: '#F59E0B',
        route: '/(brgy)/properties',
      },
    ];

    const alertItems = [
      {
        label: 'Owner Applications',
        value: pendingApplicationsCount,
        status: pendingApplicationsCount > 0 ? 'Awaiting review' : 'All caught up',
        accent: '#F59E0B',
        priority: pendingApplicationsCount > 0,
        icon: <Bell size={16} color="#F59E0B" />,
      },
      {
        label: 'New Complaints',
        value: newComplaintsCount,
        status: newComplaintsCount > 0 ? 'Requires attention' : 'No new complaints',
        accent: '#EF4444',
        priority: newComplaintsCount > 0,
        icon: <AlertTriangle size={16} color="#EF4444" />,
      },
      {
        label: 'Active Bookings',
        value: stats.activeBookings,
        status: stats.activeBookings > 0 ? 'Residents currently renting' : 'No rentals in progress',
        accent: '#0EA5E9',
        priority: stats.activeBookings > 0,
        icon: <Calendar size={16} color="#0EA5E9" />,
      },
      {
        label: 'Published Properties',
        value: stats.totalListings,
        status: stats.totalListings > 0 ? 'Live inventory available' : 'Publish more homes',
        accent: '#6366F1',
        priority: stats.totalListings === 0,
        icon: <Home size={16} color="#6366F1" />,
      },
    ];

    const chartSeries = [
      { label: 'Bookings', value: stats.activeBookings, color: '#6366F1' },
      { label: 'Properties', value: stats.totalListings, color: '#0EA5E9' },
      { label: 'Residents', value: stats.totalResidents, color: '#10B981' },
    ];
    const chartMax = Math.max(...chartSeries.map(s => s.value), 1);
    const chartHeight = 120;

    return (
      <View style={sharedStyles.pageContainer}>
        <View style={[styles.card, styles.heroCard]}>
          <View style={[
            styles.heroHeader,
            screenWidth < 400 && { flexDirection: 'column', alignItems: 'stretch' }
          ]}>
            <View style={[
              styles.heroHeaderLeft,
              screenWidth < 400 && { flex: 0 }
            ]}>
              <View style={[styles.heroEyebrowContainer, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%' }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: designTokens.spacing.sm }}>
                  {barangayLogo ? (
                    <Image
                      source={{ uri: barangayLogo }}
                      style={styles.barangayLogo}
                      resizeMode="cover"
                    />
                  ) : (() => {
                    const defaultLogo = getDefaultLogo(barangayName);
                    return defaultLogo ? (
                      <Image
                        source={defaultLogo}
                        style={styles.barangayLogo}
                        resizeMode="contain"
                      />
                    ) : null;
                  })()}
                  <Text style={styles.heroEyebrow}>
                    {barangayName ? `Barangay ${barangayName}` : 'Barangay Account'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.heroButton}
                  onPress={handleLogout}
                  activeOpacity={0.85}
                >
                  <LogOut size={18} color={designTokens.colors.primary} />
                </TouchableOpacity>
              </View>
              <Text style={styles.heroSubtitle}>
                Managing rentals for {barangayLabel}.
              </Text>
              <View style={styles.welcomeBackContainer}>
                <Text style={styles.welcomeBackText}>Welcome back,</Text>
                <Text style={styles.welcomeBackName}>{officialName || user?.name || 'Barangay Official'}</Text>
              </View>
            </View>
          </View>
          <LinearGradient
            colors={designTokens.gradients.primary as [string, string]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroGradient}
            pointerEvents="none"
          />
        </View>

        {/* Key Stats Section */}
        <View style={{ marginBottom: designTokens.spacing['2xl'] }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: designTokens.spacing.lg }}>
            <View>
              <Text style={sharedStyles.sectionTitle}>Key Stats</Text>
              <Text style={{
                fontSize: designTokens.typography.sm,
                color: designTokens.colors.textSecondary,
                marginTop: designTokens.spacing.xs,
              }}>
                Live barangay overview
              </Text>
            </View>
            <View style={[sharedStyles.statIcon, iconBackgrounds.blue]}>
              <BarChart3 size={18} color="#3B82F6" />
            </View>
          </View>
          <View style={sharedStyles.grid}>
            {statCards.map((cardConfig, index) => {
              const stat = statsSummary.find(s => s.label === cardConfig.label);
              const IconComponent = cardConfig.icon;
              
              return (
                <TouchableOpacity
                  key={cardConfig.label}
                  style={sharedStyles.gridItem}
                  onPress={() => router.push(cardConfig.route as any)}
                  activeOpacity={0.7}
                >
                  <View style={sharedStyles.statCard}>
                    <LinearGradient
                      colors={cardConfig.gradient as any}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={[sharedStyles.statCardGradient, { height: 4 }]}
                    />
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: designTokens.spacing.sm }}>
                      <View style={[sharedStyles.statIcon, cardConfig.iconBg]}>
                        <IconComponent size={20} color={cardConfig.iconColor} />
                      </View>
                    </View>
                    <Text style={[sharedStyles.statLabel, { marginBottom: designTokens.spacing.xs }]}>
                      {stat?.label || cardConfig.label}
                    </Text>
                    <Text style={[sharedStyles.statValue, { fontSize: designTokens.typography['2xl'], marginBottom: 0 }]}>
                      {stat?.value || 0}
                    </Text>
                    <Text style={{
                      fontSize: designTokens.typography.xs,
                      color: designTokens.colors.textMuted,
                      marginTop: designTokens.spacing.xs,
                    }}>
                      {stat?.note || ''}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.cardGrid}>

          <View style={[styles.card, styles.alertsCard]}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Alerts</Text>
              <Text style={styles.cardSubtitle}>
                {hasActionAlerts ? 'Action required' : 'All systems normal'}
              </Text>
            </View>
            <View style={styles.alertList}>
              {alertItems.map((alert) => (
                <View
                  key={alert.label}
                  style={[styles.alertItem, alert.priority && styles.alertItemActive]}
                >
                  <View style={[styles.alertIcon, { backgroundColor: `${alert.accent}1a` }]}>
                    {alert.icon}
                  </View>
                  <View style={styles.alertContent}>
                    <Text style={styles.alertLabel}>{alert.label}</Text>
                    <Text style={styles.alertStatus}>{alert.status}</Text>
                  </View>
                  <Text style={[styles.alertValue, { color: alert.accent }]}>
                    {alert.value}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        <View style={[styles.card, styles.chartCard]}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Engagement Trend</Text>
            <Text style={styles.cardSubtitle}>Last 30 days</Text>
          </View>
          <LinearGradient
            colors={['#EEF2FF', '#F5F3FF'] as [string, string]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.chartSurface}
          >
            <View style={styles.chartBars}>
              {chartSeries.map((series) => {
                const computedHeight = Math.max(8, (series.value / chartMax) * chartHeight);
                return (
                  <View key={series.label} style={styles.chartBarWrapper}>
                    <View style={[styles.chartBar, { height: computedHeight, backgroundColor: series.color }]} />
                    <Text style={styles.chartBarLabel}>{series.label}</Text>
                  </View>
                );
              })}
            </View>
          </LinearGradient>
        </View>

        {/* Operational Overview Section */}
        <View style={{ marginBottom: designTokens.spacing['2xl'] }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: designTokens.spacing.lg }}>
            <View>
              <Text style={sharedStyles.sectionTitle}>Operational Overview</Text>
              <Text style={{
                fontSize: designTokens.typography.sm,
                color: designTokens.colors.textSecondary,
                marginTop: designTokens.spacing.xs,
              }}>
                Key performance indicators and operational metrics
              </Text>
            </View>
            <View style={[sharedStyles.statIcon, iconBackgrounds.purple]}>
              <TrendingUp size={18} color="#8B5CF6" />
            </View>
          </View>
          <View style={sharedStyles.grid}>
            {insightCards.map((card) => (
              <View key={card.title} style={sharedStyles.gridItem}>
                <View style={sharedStyles.statCard}>
                  <LinearGradient
                    colors={
                      card.title === 'Active Bookings' ? designTokens.gradients.success as any :
                      card.title === 'Approved Owners' ? designTokens.gradients.purple as any :
                      card.title === 'Published Properties' ? designTokens.gradients.info as any :
                      ['#6B7280', '#9CA3AF'] as any
                    }
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[sharedStyles.statCardGradient, { height: 4 }]}
                  />
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: designTokens.spacing.sm }}>
                    <View style={[sharedStyles.statIcon, card.iconStyle]}>
                      {card.icon}
                    </View>
                  </View>
                  <Text style={[sharedStyles.statLabel, { marginBottom: designTokens.spacing.xs }]}>
                    {card.title}
                  </Text>
                  <Text style={[sharedStyles.statValue, { fontSize: designTokens.typography['2xl'], marginBottom: designTokens.spacing.xs }]}>
                    {card.value}
                  </Text>
                  <Text style={{
                    fontSize: designTokens.typography.xs,
                    color: designTokens.colors.textMuted,
                    marginBottom: designTokens.spacing.xs,
                  }}>
                    {card.subtext}
                  </Text>
                  <Text style={{
                    fontSize: designTokens.typography.xs,
                    color: card.trendColor,
                    fontWeight: designTokens.typography.semibold as TextStyle['fontWeight'],
                    marginTop: designTokens.spacing.xs,
                  }}>
                    {card.trend}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Operations & Management Section */}
        <View style={{ marginBottom: designTokens.spacing['2xl'] }}>
          <View style={{
            flexDirection: 'row',
            alignItems: 'flex-start',
            marginBottom: designTokens.spacing.lg,
            paddingBottom: designTokens.spacing.md,
            borderBottomWidth: 2,
            borderBottomColor: designTokens.colors.borderLight,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <View style={[sharedStyles.statIcon, iconBackgrounds.orange, { marginRight: designTokens.spacing.md, position: 'relative' }]}>
                <Sparkles size={20} color="#F59E0B" />
                {hasActionAlerts && (
                  <View style={{
                    position: 'absolute',
                    top: -6,
                    right: -6,
                    backgroundColor: designTokens.colors.error,
                    borderRadius: 8,
                    width: 16,
                    height: 16,
                    borderWidth: 2,
                    borderColor: designTokens.colors.white,
                  }} />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: designTokens.spacing.sm }}>
                  <Text style={[sharedStyles.sectionTitle, { marginBottom: 0 }]}>Operations & Management</Text>
                  {hasActionAlerts && (
                    <View style={{
                      backgroundColor: designTokens.colors.error,
                      borderRadius: 12,
                      paddingHorizontal: 8,
                      paddingVertical: 2,
                      minWidth: 24,
                      height: 20,
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}>
                      <Text style={{ color: designTokens.colors.white, fontSize: 10, fontWeight: '700' }}>
                        {actionAlertsTotal}
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={{
                  fontSize: designTokens.typography.sm,
                  color: designTokens.colors.textSecondary,
                  marginTop: designTokens.spacing.xs,
                }}>
                  {hasActionAlerts
                    ? `${actionAlertsTotal} item${actionAlertsTotal > 1 ? 's' : ''} need attention`
                    : 'Quick actions and daily operations'}
                </Text>
              </View>
            </View>
          </View>

          {/* Horizontal Scrollable Operations Grid */}
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingRight: designTokens.spacing.lg }}
          >
            <View style={{ flexDirection: 'row', gap: designTokens.spacing.md }}>
              {actionItems.map((item) => (
                <TouchableOpacity 
                  key={item.label}
                  style={{
                    width: 160,
                    padding: designTokens.spacing.lg,
                    backgroundColor: item.highlight ? designTokens.colors.warningLight : designTokens.colors.white,
                    borderRadius: designTokens.borderRadius.lg,
                    borderWidth: item.highlight ? 2 : 1,
                    borderColor: item.highlight ? designTokens.colors.warning : designTokens.colors.borderLight,
                    ...designTokens.shadows.sm,
                    position: 'relative',
                  }}
                  onPress={() => router.push(item.route as any)}
                  activeOpacity={0.7}
                >
                  {item.useGradient ? (
                    <LinearGradient
                      colors={designTokens.gradients.primary as any}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: designTokens.borderRadius.md,
                        justifyContent: 'center',
                        alignItems: 'center',
                        marginBottom: designTokens.spacing.md,
                      }}
                    >
                      {item.icon}
                    </LinearGradient>
                  ) : (
                    <View style={[sharedStyles.statIcon, item.iconBackground, { marginBottom: designTokens.spacing.md, position: 'relative' }]}>
                      {item.icon}
                      {item.badge && (
                        <View style={{
                          position: 'absolute',
                          top: -4,
                          right: -4,
                          backgroundColor: item.highlight ? designTokens.colors.error : designTokens.colors.info,
                          borderRadius: 12,
                          minWidth: 24,
                          height: 24,
                          justifyContent: 'center',
                          alignItems: 'center',
                          paddingHorizontal: 6,
                          borderWidth: 2,
                          borderColor: designTokens.colors.white,
                        }}>
                          <Text style={{ color: designTokens.colors.white, fontSize: 10, fontWeight: '700' }}>
                            {item.badge > 99 ? '99+' : item.badge}
                          </Text>
                        </View>
                      )}
                    </View>
                  )}
                  <Text style={[sharedStyles.statLabel, { fontSize: designTokens.typography.base, marginBottom: 4 }]}>
                    {item.label}
                  </Text>
                  <Text style={[sharedStyles.statSubtitle, { fontSize: 11 }]}>
                    {item.description}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
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

type DashboardStyles = {
  card: ViewStyle;
  heroCard: ViewStyle;
  heroHeader: ViewStyle;
  heroHeaderLeft: ViewStyle;
  heroEyebrowContainer: ViewStyle;
  barangayLogo: ImageStyle;
  heroEyebrow: TextStyle;
  heroTitle: TextStyle;
  heroSubtitle: TextStyle;
  welcomeBackContainer: ViewStyle;
  welcomeBackText: TextStyle;
  welcomeBackName: TextStyle;
  heroButton: ViewStyle;
  heroButtonText: TextStyle;
  heroGradient: ViewStyle;
  cardGrid: ViewStyle;
  cardHeader: ViewStyle;
  cardTitle: TextStyle;
  cardSubtitle: TextStyle;
  statsCard: ViewStyle;
  statGrid: ViewStyle;
  statCell: ViewStyle;
  statCellContent: ViewStyle;
  statValue: TextStyle;
  statLabel: TextStyle;
  statNote: TextStyle;
  alertsCard: ViewStyle;
  alertList: ViewStyle;
  alertItem: ViewStyle;
  alertItemActive: ViewStyle;
  alertIcon: ViewStyle;
  alertContent: ViewStyle;
  alertLabel: TextStyle;
  alertStatus: TextStyle;
  alertValue: TextStyle;
  chartCard: ViewStyle;
  chartSurface: ViewStyle;
  chartBars: ViewStyle;
  chartBarWrapper: ViewStyle;
  chartBar: ViewStyle;
  chartBarLabel: TextStyle;
  performanceCard: ViewStyle;
  metricGrid: ViewStyle;
  metricCard: ViewStyle;
  metricIconWrapper: ViewStyle;
  metricLabel: TextStyle;
  metricValue: TextStyle;
  metricSubtext: TextStyle;
  metricTrend: TextStyle;
  quickActionsListCard: ViewStyle;
  quickActionList: ViewStyle;
  quickActionRow: ViewStyle;
  quickActionRowActive: ViewStyle;
  quickActionCircle: ViewStyle;
  quickActionGradientFill: ViewStyle;
  quickActionListBadge: ViewStyle;
  quickActionBadgeText: TextStyle;
  quickActionContent: ViewStyle;
  quickActionTitle: TextStyle;
  quickActionDescription: TextStyle;
  quickActionChevron: TextStyle;
};

const styles = StyleSheet.create<DashboardStyles>({
  card: {
    backgroundColor: designTokens.colors.white,
    borderRadius: 16,
    padding: designTokens.spacing.xl,
    borderWidth: 1,
    borderColor: designTokens.colors.borderLight,
    ...designTokens.shadows.sm,
    marginBottom: designTokens.spacing.xl,
  },
  heroCard: {
    position: 'relative',
    overflow: 'hidden',
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: designTokens.spacing.md,
    alignItems: 'flex-start',
    position: 'relative',
    zIndex: 10,
  },
  heroHeaderLeft: {
    flex: 1,
    minWidth: 0,
  },
  heroEyebrowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: designTokens.spacing.sm,
    marginBottom: designTokens.spacing.xs,
  },
  barangayLogo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
  },
  heroEyebrow: {
    fontSize: designTokens.typography.xs,
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: designTokens.colors.textMuted,
    flex: 1,
  },
  heroTitle: {
    fontSize: designTokens.typography['2xl'],
    color: designTokens.colors.textPrimary,
    fontWeight: designTokens.typography.bold as TextStyle['fontWeight'],
    marginBottom: designTokens.spacing.xs,
  },
  heroSubtitle: {
    fontSize: designTokens.typography.sm,
    color: designTokens.colors.textSecondary,
  },
  welcomeBackContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    marginTop: designTokens.spacing.sm,
    gap: designTokens.spacing.xs,
  },
  welcomeBackText: {
    fontSize: designTokens.typography.xl,
    color: designTokens.colors.textSecondary,
    fontWeight: designTokens.typography.medium as TextStyle['fontWeight'],
  },
  welcomeBackName: {
    fontSize: designTokens.typography['3xl'],
    color: designTokens.colors.textPrimary,
    fontWeight: designTokens.typography.bold as TextStyle['fontWeight'],
    letterSpacing: -0.5,
  },
  heroButton: {
    padding: designTokens.spacing.sm,
    borderRadius: designTokens.borderRadius.full,
    backgroundColor: designTokens.colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...designTokens.shadows.sm,
    position: 'relative',
    zIndex: 20,
    flexShrink: 0,
    minWidth: 36,
    minHeight: 36,
  },
  heroButtonText: {
    color: designTokens.colors.primary,
    fontSize: designTokens.typography.sm,
    fontWeight: designTokens.typography.semibold as TextStyle['fontWeight'],
  },
  heroGradient: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.08,
    borderRadius: 16,
  },
  cardGrid: {
    gap: designTokens.spacing.lg,
    marginBottom: designTokens.spacing.xl,
  },
  cardHeader: {
    marginBottom: designTokens.spacing.lg,
  },
  cardTitle: {
    fontSize: designTokens.typography.lg,
    fontWeight: designTokens.typography.semibold as TextStyle['fontWeight'],
    color: designTokens.colors.textPrimary,
  },
  cardSubtitle: {
    fontSize: designTokens.typography.sm,
    color: designTokens.colors.textSecondary,
    marginTop: designTokens.spacing.xs,
  },
  statsCard: {},
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: designTokens.spacing.md,
  },
  statCell: {
    flex: 1,
    minWidth: '47%',
    maxWidth: '48%',
  },
  statCellContent: {
    backgroundColor: designTokens.colors.background,
    borderRadius: 12,
    padding: designTokens.spacing.lg,
    borderWidth: 1,
    borderColor: designTokens.colors.borderLight,
  },
  statValue: {
    fontSize: designTokens.typography['2xl'],
    fontWeight: designTokens.typography.bold as TextStyle['fontWeight'],
    color: designTokens.colors.textPrimary,
    marginBottom: designTokens.spacing.xs,
    lineHeight: 32,
  },
  statLabel: {
    fontSize: designTokens.typography.sm,
    fontWeight: designTokens.typography.semibold as TextStyle['fontWeight'],
    color: designTokens.colors.textPrimary,
    marginBottom: designTokens.spacing.xs,
  },
  statNote: {
    fontSize: designTokens.typography.xs,
    color: designTokens.colors.textSecondary,
    lineHeight: 16,
  },
  alertsCard: {},
  alertList: {
    gap: designTokens.spacing.md,
  },
  alertItem: {
    borderRadius: 12,
    padding: designTokens.spacing.md,
    backgroundColor: designTokens.colors.background,
    flexDirection: 'row',
    alignItems: 'center',
    gap: designTokens.spacing.md,
    borderWidth: 1,
    borderColor: designTokens.colors.borderLight,
  },
  alertItemActive: {
    backgroundColor: designTokens.colors.warningLight,
  },
  alertIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertContent: {
    flex: 1,
  },
  alertLabel: {
    fontSize: designTokens.typography.base,
    color: designTokens.colors.textPrimary,
    fontWeight: designTokens.typography.medium as TextStyle['fontWeight'],
  },
  alertStatus: {
    fontSize: designTokens.typography.xs,
    color: designTokens.colors.textSecondary,
    marginTop: 2,
  },
  alertValue: {
    fontSize: designTokens.typography['xl'],
    fontWeight: designTokens.typography.bold as TextStyle['fontWeight'],
  },
  chartCard: {},
  chartSurface: {
    borderRadius: 12,
    padding: designTokens.spacing.lg,
  },
  chartBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 140,
    gap: designTokens.spacing.lg,
  },
  chartBarWrapper: {
    flex: 1,
    alignItems: 'center',
  },
  chartBar: {
    width: 32,
    borderRadius: 16,
  },
  chartBarLabel: {
    marginTop: designTokens.spacing.sm,
    fontSize: designTokens.typography.xs,
    color: designTokens.colors.textSecondary,
  },
  performanceCard: {},
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: designTokens.spacing.md,
  },
  metricCard: {
    flexBasis: '48%',
    borderRadius: 12,
    padding: designTokens.spacing.lg,
    backgroundColor: designTokens.colors.background,
    borderWidth: 1,
    borderColor: designTokens.colors.borderLight,
  },
  metricIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: designTokens.spacing.sm,
  },
  metricLabel: {
    fontSize: designTokens.typography.sm,
    color: designTokens.colors.textSecondary,
  },
  metricValue: {
    fontSize: designTokens.typography['2xl'],
    fontWeight: designTokens.typography.bold as TextStyle['fontWeight'],
    color: designTokens.colors.textPrimary,
    marginVertical: designTokens.spacing.xs,
  },
  metricSubtext: {
    fontSize: designTokens.typography.xs,
    color: designTokens.colors.textMuted,
  },
  metricTrend: {
    marginTop: designTokens.spacing.sm,
    fontSize: designTokens.typography.xs,
    fontWeight: designTokens.typography.semibold as TextStyle['fontWeight'],
  },
  quickActionsListCard: {},
  quickActionList: {
    gap: designTokens.spacing.sm,
  },
  quickActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: designTokens.spacing.md,
    backgroundColor: designTokens.colors.background,
    borderWidth: 1,
    borderColor: designTokens.colors.borderLight,
  },
  quickActionRowActive: {
    backgroundColor: designTokens.colors.warningLight,
    borderWidth: 1,
    borderColor: designTokens.colors.warning,
  },
  quickActionCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: designTokens.spacing.md,
    position: 'relative',
  },
  quickActionGradientFill: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickActionListBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: designTokens.colors.error,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: designTokens.colors.white,
  },
  quickActionBadgeText: {
    color: designTokens.colors.white,
    fontSize: 10,
    fontWeight: '700',
  },
  quickActionContent: {
    flex: 1,
  },
  quickActionTitle: {
    fontSize: designTokens.typography.base,
    fontWeight: designTokens.typography.semibold as TextStyle['fontWeight'],
    color: designTokens.colors.textPrimary,
  },
  quickActionDescription: {
    marginTop: 4,
    fontSize: designTokens.typography.xs,
    color: designTokens.colors.textSecondary,
  },
  quickActionChevron: {
    fontSize: 20,
    color: designTokens.colors.textMuted,
    marginLeft: designTokens.spacing.sm,
  },
});
