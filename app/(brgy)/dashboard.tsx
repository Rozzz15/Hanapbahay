import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Dimensions, ViewStyle, TextStyle } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context/AuthContext';
import { 
  getBrgyDashboardStats,
  type BrgyDashboardStats
} from '../../utils/brgy-dashboard';
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
  BarChart3
} from 'lucide-react-native';
import { sharedStyles, designTokens, iconBackgrounds } from '../../styles/owner-dashboard-styles';
import { showAlert } from '../../utils/alert';
import { db } from '../../utils/db';
import { DbUserRecord, PublishedListingRecord, BookingRecord, OwnerApplicationRecord, BrgyNotificationRecord } from '../../types';

const windowWidth = Dimensions.get('window').width;

export default function BrgyDashboard() {
  const { user, signOut } = useAuth();
  const router = useRouter();
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
  const [pendingApplicationsCount, setPendingApplicationsCount] = useState(0);

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

    const barangayLabel = `BRGY ${barangayName || (user as any)?.barangay || 'Barangay Official'}, LOPEZ, QUEZON`;

    const quickStats = [
      { label: 'Residents', value: stats.totalResidents, note: 'With completed payments' },
      { label: 'Properties', value: stats.totalProperties, note: 'Available homes' },
      { label: 'Active Listings', value: stats.totalListings, note: 'Live on the app' },
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
        title: 'Published Listings',
        value: stats.totalListings,
        subtext: 'Live inventory',
        trend: stats.totalListings > 0 ? 'Ready for tenant discovery' : 'Publish new listings',
        trendColor: '#1D4ED8',
        icon: <BarChart3 size={18} color="#1D4ED8" />,
        iconStyle: iconBackgrounds.blue,
      },
      {
        title: 'Barangay Coverage',
        value: barangayName ? 1 : 0,
        subtext: barangayLabel,
        trend: 'Official account verified',
        trendColor: '#6B7280',
        icon: <Calendar size={18} color="#6B7280" />,
        iconStyle: iconBackgrounds.purple,
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
    ];

    const actionAlertsTotal = actionItems.reduce(
      (total, item) => total + (item.badge ?? 0),
      0
    );
    const hasActionAlerts = actionAlertsTotal > 0;

    const statsSummary = quickStats;

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
        label: 'Active Bookings',
        value: stats.activeBookings,
        status: stats.activeBookings > 0 ? 'Residents currently renting' : 'No rentals in progress',
        accent: '#0EA5E9',
        priority: stats.activeBookings > 0,
        icon: <Calendar size={16} color="#0EA5E9" />,
      },
      {
        label: 'Published Listings',
        value: stats.totalListings,
        status: stats.totalListings > 0 ? 'Live inventory available' : 'Publish more homes',
        accent: '#6366F1',
        priority: stats.totalListings === 0,
        icon: <Home size={16} color="#6366F1" />,
      },
    ];

    const chartSeries = [
      { label: 'Bookings', value: stats.activeBookings, color: '#6366F1' },
      { label: 'Listings', value: stats.totalListings, color: '#0EA5E9' },
      { label: 'Residents', value: stats.totalResidents, color: '#10B981' },
    ];
    const chartMax = Math.max(...chartSeries.map(s => s.value), 1);
    const chartHeight = 120;

    return (
      <View style={sharedStyles.pageContainer}>
        <View style={[styles.card, styles.heroCard]}>
          <View style={styles.heroHeader}>
            <View>
              <Text style={styles.heroEyebrow}>Barangay Account</Text>
              <Text style={styles.heroTitle}>Welcome back, {officialName || user?.name || 'Barangay Official'}</Text>
              <Text style={styles.heroSubtitle}>
                Managing rentals for {barangayLabel}.
              </Text>
            </View>
            <TouchableOpacity
              style={styles.heroButton}
              onPress={handleLogout}
              activeOpacity={0.85}
            >
              <LogOut size={18} color={designTokens.colors.primary} />
              <Text style={styles.heroButtonText}>Logout</Text>
            </TouchableOpacity>
          </View>
          <LinearGradient
            colors={designTokens.gradients.primary as [string, string]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroGradient}
            pointerEvents="none"
          />
        </View>

        <View style={styles.cardGrid}>
          <View style={[styles.card, styles.statsCard]}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Key Stats</Text>
              <Text style={styles.cardSubtitle}>Live barangay overview</Text>
            </View>
            <View style={styles.statGrid}>
              {statsSummary.map((item) => (
                <View key={item.label} style={styles.statCell}>
                  <Text style={styles.statValue}>{item.value}</Text>
                  <Text style={styles.statLabel}>{item.label}</Text>
                  <Text style={styles.statNote}>{item.note}</Text>
                </View>
              ))}
            </View>
          </View>

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

        <View style={[styles.card, styles.performanceCard]}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Performance Snapshot</Text>
            <Text style={styles.cardSubtitle}>Key operational health</Text>
          </View>
          <View style={styles.metricGrid}>
            {insightCards.map((card) => (
              <View key={card.title} style={styles.metricCard}>
                <View style={[styles.metricIconWrapper, card.iconStyle]}>
                  {card.icon}
                </View>
                <Text style={styles.metricLabel}>{card.title}</Text>
                <Text style={styles.metricValue}>{card.value}</Text>
                <Text style={styles.metricSubtext}>{card.subtext}</Text>
                <Text style={[styles.metricTrend, { color: card.trendColor }]}>
                  {card.trend}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View style={[styles.card, styles.quickActionsListCard]}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Quick Actions</Text>
            <Text style={styles.cardSubtitle}>
              {hasActionAlerts ? 'Handle pending reviews' : 'You’re up to date'}
            </Text>
          </View>
          <View style={styles.quickActionList}>
            {actionItems.map((item) => (
              <TouchableOpacity
                key={item.label}
                style={[
                  styles.quickActionRow,
                  item.highlight && styles.quickActionRowActive,
                ]}
                onPress={() => router.push(item.route as any)}
                activeOpacity={0.85}
              >
                <View style={[
                  styles.quickActionCircle,
                  !item.useGradient && item.iconBackground
                ]}>
                  {item.useGradient ? (
                    <LinearGradient
                      colors={designTokens.gradients.primary as [string, string]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.quickActionGradientFill}
                    >
                      {item.icon}
                    </LinearGradient>
                  ) : (
                    item.icon
                  )}
                  {item.badge && (
                    <View style={styles.quickActionListBadge}>
                      <Text style={styles.quickActionBadgeText}>
                        {item.badge > 99 ? '99+' : item.badge}
                      </Text>
                    </View>
                  )}
                </View>
                <View style={styles.quickActionContent}>
                  <Text style={styles.quickActionTitle}>{item.label}</Text>
                  <Text style={styles.quickActionDescription}>{item.description}</Text>
                </View>
                <Text style={styles.quickActionChevron}>›</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={[styles.card, styles.focusCard]}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Barangay Focus</Text>
            <Text style={styles.cardSubtitle}>Weekly reminders</Text>
          </View>
          <View style={styles.focusRow}>
            <View style={styles.focusItem}>
              <AlertCircle size={18} color={designTokens.colors.warning} />
              <View style={styles.focusText}>
                <Text style={styles.focusTitle}>Tenant Experience</Text>
                <Text style={styles.focusSubtitle}>Keep response times under 24 hrs</Text>
              </View>
            </View>
            <View style={styles.focusItem}>
              <Calendar size={18} color={designTokens.colors.info} />
              <View style={styles.focusText}>
                <Text style={styles.focusTitle}>Upcoming reviews</Text>
                <Text style={styles.focusSubtitle}>Schedule property checks weekly</Text>
              </View>
            </View>
          </View>
          <View style={styles.badgeRow}>
            <View style={[styles.badge, styles.badgeSuccess]}>
              <Text style={styles.badgeText}>Verified Barangay Account</Text>
            </View>
            <View style={[styles.badge, styles.badgeOutline]}>
              <Text style={styles.badgeText}>Theme synced with tenant & owner apps</Text>
            </View>
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

type DashboardStyles = {
  card: ViewStyle;
  heroCard: ViewStyle;
  heroHeader: ViewStyle;
  heroEyebrow: TextStyle;
  heroTitle: TextStyle;
  heroSubtitle: TextStyle;
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
  focusCard: ViewStyle;
  focusRow: ViewStyle;
  focusItem: ViewStyle;
  focusText: ViewStyle;
  focusTitle: TextStyle;
  focusSubtitle: TextStyle;
  badgeRow: ViewStyle;
  badge: ViewStyle;
  badgeSuccess: ViewStyle;
  badgeOutline: ViewStyle;
  badgeText: TextStyle;
};

const styles = StyleSheet.create<DashboardStyles>({
  card: {
    backgroundColor: designTokens.colors.white,
    borderRadius: 14,
    padding: designTokens.spacing['2xl'],
    borderWidth: 1,
    borderColor: designTokens.colors.borderLight,
    ...designTokens.shadows.sm,
    marginBottom: designTokens.spacing['2xl'],
  },
  heroCard: {
    position: 'relative',
    overflow: 'hidden',
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: designTokens.spacing.lg,
    alignItems: 'flex-start',
  },
  heroEyebrow: {
    fontSize: designTokens.typography.xs,
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: designTokens.colors.textMuted,
    marginBottom: designTokens.spacing.xs,
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
  heroButton: {
    paddingHorizontal: designTokens.spacing.lg,
    paddingVertical: designTokens.spacing.sm,
    borderRadius: designTokens.borderRadius.full,
    backgroundColor: designTokens.colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    gap: designTokens.spacing.xs,
    ...designTokens.shadows.sm,
  },
  heroButtonText: {
    color: designTokens.colors.primary,
    fontSize: designTokens.typography.sm,
    fontWeight: designTokens.typography.semibold as TextStyle['fontWeight'],
  },
  heroGradient: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.08,
    borderRadius: 14,
  },
  cardGrid: {
    gap: designTokens.spacing['2xl'],
    marginBottom: designTokens.spacing['2xl'],
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
    gap: designTokens.spacing.lg,
  },
  statCell: {
    flexBasis: '48%',
    backgroundColor: designTokens.colors.background,
    borderRadius: 12,
    padding: designTokens.spacing.lg,
  },
  statValue: {
    fontSize: designTokens.typography['2xl'],
    fontWeight: designTokens.typography.bold as TextStyle['fontWeight'],
    color: designTokens.colors.textPrimary,
  },
  statLabel: {
    fontSize: designTokens.typography.sm,
    color: designTokens.colors.textSecondary,
    marginTop: designTokens.spacing.xs,
  },
  statNote: {
    fontSize: designTokens.typography.xs,
    color: designTokens.colors.textMuted,
    marginTop: 2,
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
  focusCard: {},
  focusRow: {
    gap: designTokens.spacing.md,
  },
  focusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: designTokens.spacing.md,
  },
  focusText: {
    flex: 1,
  },
  focusTitle: {
    fontSize: designTokens.typography.base,
    fontWeight: designTokens.typography.semibold as TextStyle['fontWeight'],
    color: designTokens.colors.textPrimary,
  },
  focusSubtitle: {
    fontSize: designTokens.typography.xs,
    color: designTokens.colors.textSecondary,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: designTokens.spacing.sm,
    marginTop: designTokens.spacing.lg,
  },
  badge: {
    paddingHorizontal: designTokens.spacing.md,
    paddingVertical: designTokens.spacing.xs,
    borderRadius: designTokens.borderRadius.full,
  },
  badgeSuccess: {
    backgroundColor: designTokens.colors.successLight,
  },
  badgeOutline: {
    borderWidth: 1,
    borderColor: designTokens.colors.border,
    backgroundColor: designTokens.colors.white,
  },
  badgeText: {
    fontSize: designTokens.typography.xs,
    color: designTokens.colors.textSecondary,
    fontWeight: designTokens.typography.medium as TextStyle['fontWeight'],
  },
});
