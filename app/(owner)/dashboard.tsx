import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { 
  getOwnerDashboardStats,
  getOwnerListings,
  getOwnerMessages,
  type OwnerDashboardStats,
  type OwnerListing,
  type OwnerMessage
} from '../../utils/owner-dashboard';
import { getBookingsByOwner, updateBookingStatus } from '@/utils/booking';
import { BookingRecord } from '@/types';
import { 
  Home, 
  List, 
  Calendar, 
  MessageSquare,
  CreditCard, 
  LogOut,
  Plus,
  Eye
  // DollarSign, // Replaced with peso symbol ₱
} from 'lucide-react-native';
import { sharedStyles, designTokens, iconBackgrounds } from '../../styles/owner-dashboard-styles';
import { showAlert } from '../../utils/alert';
import { Image } from '../../components/ui/image';

// Types are now imported from owner-dashboard.ts

export default function OwnerDashboard() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [activeSection, setActiveSection] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [stats, setStats] = useState<OwnerDashboardStats>({
    totalListings: 0,
    totalViews: 0,
    monthlyRevenue: 0,
    totalInquiries: 0
  });
  const [listings, setListings] = useState<OwnerListing[]>([]);
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [messages, setMessages] = useState<OwnerMessage[]>([]);
  const [loading, setLoading] = useState(true);

  // Check authentication
  useEffect(() => {
    if (!user) {
      router.replace('/login');
      return;
    }

    if (!user.roles?.includes('owner')) {
      showAlert('Access Denied', 'This dashboard is for property owners only.');
      router.replace('/(tabs)');
      return;
    }

    loadDashboardData();
  }, [user]);

  // Listen for listing changes to auto-refresh dashboard
  useEffect(() => {
    const handleListingChange = () => {
      console.log('🔄 Listing changed, refreshing dashboard...');
      loadDashboardData();
    };

    const handleBookingCreated = (event: CustomEvent) => {
      console.log('🔄 New booking created, refreshing dashboard...', event.detail);
      loadDashboardData();
    };

    if (typeof window !== 'undefined') {
      if (typeof window !== 'undefined' && window.addEventListener) {
        window.addEventListener('listingChanged', handleListingChange);
        window.addEventListener('bookingCreated', handleBookingCreated);
      }
      return () => {
        if (typeof window !== 'undefined' && window.removeEventListener) {
          window.removeEventListener('listingChanged', handleListingChange);
          window.removeEventListener('bookingCreated', handleBookingCreated);
        }
      };
    }
  }, [user?.id]); // Only depend on user.id to prevent infinite loops

  const loadDashboardData = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      await Promise.all([
        loadStats(),
        loadListings(),
        loadBookings(),
        loadMessages()
      ]);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      showAlert('Error', 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [user?.id]); // Only depend on user.id to prevent infinite loops

  const loadStats = useCallback(async () => {
    if (!user?.id) return;

    try {
      const dashboardStats = await getOwnerDashboardStats(user.id);
      setStats(dashboardStats);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  }, [user?.id]);

  const loadListings = useCallback(async () => {
    if (!user?.id) return;

    try {
      console.log('🔍 Loading owner listings for user:', user.id);
      
      // REFRESH MEDIA FIRST (like tenant profile pictures)
      try {
        const { refreshAllPropertyMedia } = await import('../../utils/media-storage');
        await refreshAllPropertyMedia();
        console.log('✅ Owner media refreshed successfully (like tenant profile pictures)');
      } catch (mediaError) {
        console.log('⚠️ Owner media refresh failed:', mediaError);
      }
      
      // First, verify database storage
      const { db, generateId } = await import('../../utils/db');
      const allPublishedListings = await db.list('published_listings');
      const ownerListings = allPublishedListings.filter(listing => listing.userId === user.id);
      
      console.log('📊 Owner Listings Database Test:', {
        totalPublishedListings: allPublishedListings.length,
        ownerListingsCount: ownerListings.length,
        ownerId: user.id,
        listingsData: ownerListings.map(listing => ({
          id: listing.id,
          propertyType: listing.propertyType,
          address: listing.address?.substring(0, 30) + '...',
          status: listing.status,
          hasCoverPhoto: !!listing.coverPhoto,
          photosCount: listing.photos?.length || 0,
          videosCount: listing.videos?.length || 0
        }))
      });
      
      // Do not auto-create sample listings for owners
      
      // Load through the utility function (which includes media loading)
      const ownerListingsWithMedia = await getOwnerListings(user.id);
      setListings(ownerListingsWithMedia);
      
      console.log('📊 Owner Listings Loaded:', {
        listingsCount: ownerListingsWithMedia.length,
        listingsWithMedia: ownerListingsWithMedia.filter(l => l.coverPhoto).length
      });
    } catch (error) {
      console.error('Error loading listings:', error);
    }
  }, [user?.id]);

  const loadBookings = useCallback(async () => {
    if (!user?.id) return;

    try {
      const ownerBookings = await getBookingsByOwner(user.id);
      setBookings(ownerBookings);
      console.log(`✅ Loaded ${ownerBookings.length} bookings for owner ${user.id}`);
      console.log('📊 Bookings data:', ownerBookings.map(b => ({
        id: b.id,
        tenantName: b.tenantName,
        tenantId: b.tenantId,
        status: b.status,
        propertyTitle: b.propertyTitle
      })));
    } catch (error) {
      console.error('Error loading bookings:', error);
    }
  }, [user?.id]);

  const loadMessages = useCallback(async () => {
    if (!user?.id) return;

    try {
      const ownerMessages = await getOwnerMessages(user.id);
      setMessages(ownerMessages);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  }, [user?.id]);

  const handleBookingAction = async (bookingId: string, action: 'approve' | 'reject') => {
    if (!user?.id) return;

    try {
      const success = await updateBookingStatus(bookingId, action);

      if (success) {
        showAlert(
          'Success', 
          `Booking ${action === 'approve' ? 'approved' : 'rejected'} successfully`
        );

        // Reload bookings and stats
        loadBookings();
        loadStats();
      } else {
        throw new Error('Failed to update booking status');
      }
    } catch (error) {
      console.error(`Error ${action}ing booking:`, error);
      showAlert('Error', `Failed to ${action} booking`);
    }
  };



  const handleLogout = () => {
    console.log('🔘 Dashboard logout button clicked');
    console.log('User:', user);
    console.log('SignOut function available:', !!signOut);
    
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

  const renderOverview = () => (
    <View style={sharedStyles.pageContainer}>
      {/* Header */}
      <View style={sharedStyles.pageHeader}>
        <View style={sharedStyles.headerLeft}>
          <Text style={sharedStyles.pageTitle}>Property Dashboard</Text>
          <Text style={sharedStyles.pageSubtitle}>Welcome back!</Text>
        </View>
        <View style={sharedStyles.headerRight}>
          <TouchableOpacity 
            style={sharedStyles.primaryButton}
            onPress={() => router.push('/(owner)/create-listing')}
          >
            <Plus size={16} color="white" />
            <Text style={sharedStyles.primaryButtonText}>New</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={sharedStyles.primaryButton}
            onPress={() => {
              console.log('👆 Dashboard logout button press detected');
              handleLogout();
            }}
            activeOpacity={0.7}
          >
            <LogOut size={16} color="white" />
            <Text style={sharedStyles.primaryButtonText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Overview Section */}
      <View style={sharedStyles.section}>
        <Text style={sharedStyles.sectionTitle}>Overview</Text>
        <View style={sharedStyles.grid}>
          <View style={sharedStyles.gridItem}>
            <View style={sharedStyles.statCard}>
              <View style={sharedStyles.statIconContainer}>
                <View style={[sharedStyles.statIcon, iconBackgrounds.blue]}>
                  <List size={20} color="#3B82F6" />
                </View>
              </View>
              <Text style={sharedStyles.statLabel}>Total Listings</Text>
              <Text style={sharedStyles.statValue}>{stats.totalListings}</Text>
              <Text style={sharedStyles.statSubtitle}>{stats.totalListings} published</Text>
            </View>
          </View>

          <View style={sharedStyles.gridItem}>
            <View style={sharedStyles.statCard}>
              <View style={sharedStyles.statIconContainer}>
                <View style={[sharedStyles.statIcon, iconBackgrounds.green]}>
                  <Eye size={20} color="#10B981" />
                </View>
              </View>
              <Text style={sharedStyles.statLabel}>Total Views</Text>
              <Text style={sharedStyles.statValue}>{stats.totalViews}</Text>
              <Text style={sharedStyles.statSubtitle}>This month</Text>
            </View>
          </View>

          <View style={sharedStyles.gridItem}>
            <View style={sharedStyles.statCard}>
              <View style={sharedStyles.statIconContainer}>
                <View style={[sharedStyles.statIcon, iconBackgrounds.orange]}>
                  <Text style={{ fontSize: 20, color: "#F59E0B" }}>₱</Text>
                </View>
              </View>
              <Text style={sharedStyles.statLabel}>Monthly Revenue</Text>
              <Text style={[sharedStyles.statValue, { color: designTokens.colors.success }]}>
                {`₱${stats.monthlyRevenue.toLocaleString()}`}
              </Text>
              <Text style={sharedStyles.statSubtitle}>Potential income</Text>
            </View>
          </View>

          <View style={sharedStyles.gridItem}>
            <View style={sharedStyles.statCard}>
              <View style={sharedStyles.statIconContainer}>
                <View style={[sharedStyles.statIcon, iconBackgrounds.red]}>
                  <MessageSquare size={20} color="#EF4444" />
                </View>
              </View>
              <Text style={sharedStyles.statLabel}>Inquiries</Text>
              <Text style={sharedStyles.statValue}>{stats.totalInquiries}</Text>
              <Text style={sharedStyles.statSubtitle}>Need attention</Text>
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
            onPress={() => router.push('/(owner)/create-listing')}
          >
            <View style={[sharedStyles.statIcon, iconBackgrounds.blue]}>
              <Plus size={20} color="#3B82F6" />
            </View>
            <View style={{ flex: 1, marginLeft: designTokens.spacing.lg }}>
              <Text style={[sharedStyles.statLabel, { marginBottom: 2 }]}>Create New Listing</Text>
              <Text style={sharedStyles.statSubtitle}>Add a new property for rent</Text>
            </View>
            <Text style={{ fontSize: 20, color: designTokens.colors.textMuted }}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={sharedStyles.listItem}
            onPress={() => router.push('/(owner)/listings')}
          >
            <View style={[sharedStyles.statIcon, iconBackgrounds.green]}>
              <List size={20} color="#10B981" />
            </View>
            <View style={{ flex: 1, marginLeft: designTokens.spacing.lg }}>
              <Text style={[sharedStyles.statLabel, { marginBottom: 2 }]}>Manage Listings</Text>
              <Text style={sharedStyles.statSubtitle}>View and edit your properties</Text>
            </View>
            <Text style={{ fontSize: 20, color: designTokens.colors.textMuted }}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={sharedStyles.listItem}
            onPress={() => router.push('/(owner)/messages')}
          >
            <View style={[sharedStyles.statIcon, iconBackgrounds.teal]}>
              <MessageSquare size={20} color="#10B981" />
            </View>
            <View style={{ flex: 1, marginLeft: designTokens.spacing.lg }}>
              <Text style={[sharedStyles.statLabel, { marginBottom: 2 }]}>Messages</Text>
              <Text style={sharedStyles.statSubtitle}>Respond to tenant inquiries</Text>
            </View>
            <Text style={{ fontSize: 20, color: designTokens.colors.textMuted }}>›</Text>
          </TouchableOpacity>

        </View>
      </View>

      {/* Recent Listings Section */}
      <View style={sharedStyles.section}>
        <View style={sharedStyles.pageHeader}>
          <Text style={sharedStyles.sectionTitle}>Recent Listings</Text>
          <TouchableOpacity onPress={() => router.push('/(owner)/listings')}>
            <Text style={{ fontSize: designTokens.typography.sm, color: designTokens.colors.info, fontWeight: '500' }}>
              View All ›
            </Text>
          </TouchableOpacity>
        </View>
        
        {listings.length === 0 ? (
          <View style={sharedStyles.emptyState}>
            <Text style={sharedStyles.emptyStateTitle}>No listings yet</Text>
            <Text style={sharedStyles.emptyStateText}>Create your first property listing to get started</Text>
          </View>
        ) : (
          <View style={sharedStyles.card}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: designTokens.spacing.md }}>
              <View style={{ flex: 1 }}>
                <Text style={[sharedStyles.statLabel, { marginBottom: 4 }]}>
                  {listings[0]?.propertyType || 'Property Listing'}
                </Text>
                <Text style={sharedStyles.statSubtitle}>
                  {listings[0]?.address || 'Location'}
                </Text>
                <View style={{ flexDirection: 'row', gap: designTokens.spacing.md, marginTop: designTokens.spacing.sm }}>
                  <Text style={sharedStyles.statSubtitle}>{`■ ${listings[0]?.views || 0} views`}</Text>
                  <Text style={sharedStyles.statSubtitle}>{`■ ${listings[0]?.inquiries || 0} inquiries`}</Text>
                  <Text style={sharedStyles.statSubtitle}>{`■ Published ${new Date(listings[0]?.createdAt || Date.now()).toLocaleDateString()}`}</Text>
                </View>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <View style={[sharedStyles.statusBadge, { backgroundColor: designTokens.colors.infoLight }]}>
                  <Text style={[sharedStyles.statusText, { color: designTokens.colors.info }]}>Just Published!</Text>
                </View>
                <View style={{ marginTop: designTokens.spacing.sm }}>
                  <Text style={sharedStyles.statSubtitle}>★ Active</Text>
                </View>
              </View>
            </View>
            <View style={{ borderTopWidth: 1, borderTopColor: designTokens.colors.borderLight, paddingTop: designTokens.spacing.md }}>
              <Text style={[sharedStyles.statValue, { color: designTokens.colors.success, fontSize: designTokens.typography.lg }]}>
                {`₱${listings[0]?.monthlyRent?.toLocaleString() || '0'}/month`}
              </Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );

  const renderListings = () => (
    <View style={sharedStyles.pageContainer}>
      <View style={sharedStyles.pageHeader}>
        <Text style={sharedStyles.pageTitle}>My Listings</Text>
        <TouchableOpacity 
          style={sharedStyles.primaryButton}
          onPress={() => router.push('/(owner)/create-listing')}
        >
          <Plus size={16} color="white" />
          <Text style={sharedStyles.primaryButtonText}>Add New</Text>
        </TouchableOpacity>
      </View>

      {listings.length === 0 ? (
        <View style={sharedStyles.emptyState}>
          <View style={[sharedStyles.statIcon, iconBackgrounds.blue, { marginBottom: designTokens.spacing.lg }]}>
            <List size={32} color="#3B82F6" />
          </View>
          <Text style={sharedStyles.emptyStateTitle}>No listings yet</Text>
          <Text style={sharedStyles.emptyStateText}>
            Create your first property listing to start attracting tenants
          </Text>
          <TouchableOpacity 
            style={[sharedStyles.primaryButton, { marginTop: designTokens.spacing.lg }]}
            onPress={() => router.push('/(owner)/create-listing')}
          >
            <Plus size={16} color="white" />
            <Text style={sharedStyles.primaryButtonText}>Create Your First Listing</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={sharedStyles.list}>
          {listings.map((listing) => (
            <View key={listing.id} style={sharedStyles.card}>
              <View style={{ flexDirection: 'row', marginBottom: designTokens.spacing.lg }}>
                {/* Cover Photo */}
                <View style={{ width: 80, height: 80, marginRight: designTokens.spacing.md, borderRadius: 8, overflow: 'hidden' }}>
                  {listing.coverPhoto ? (
                    <Image 
                      source={{ uri: listing.coverPhoto }} 
                      style={{ width: '100%', height: '100%' }}
                      resizeMode="cover"
                      showSkeleton={true}
                      fallbackIcon="home"
                      borderRadius={8}
                      onError={() => {
                        console.log('❌ Owner dashboard image load error for:', listing.id);
                      }}
                      onLoad={() => {
                        console.log('✅ Owner dashboard image loaded successfully for:', listing.id);
                      }}
                    />
                  ) : (
                    <View style={{ width: '100%', height: '100%', backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' }}>
                      <Home size={24} color="#9CA3AF" />
                    </View>
                  )}
                </View>
                
                <View style={{ flex: 1 }}>
                  <Text style={[sharedStyles.statLabel, { marginBottom: 4, fontSize: designTokens.typography.lg }]}>
                    {listing.propertyType}
                  </Text>
                  <Text style={sharedStyles.statSubtitle}>{listing.address}</Text>
                  <Text style={[sharedStyles.statValue, { color: designTokens.colors.success, fontSize: designTokens.typography.lg }]}>
                    ₱{listing.monthlyRent.toLocaleString()}/month
                  </Text>
                </View>
              </View>
              
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: designTokens.spacing.lg }}>
                <View style={{ alignItems: 'flex-end' }}>
                  <View style={[
                    sharedStyles.statusBadge, 
                    listing.status === 'published' ? 
                      { backgroundColor: designTokens.colors.successLight } : 
                      { backgroundColor: designTokens.colors.border }
                  ]}>
                    <Text style={[
                      sharedStyles.statusText,
                      listing.status === 'published' ? 
                        { color: designTokens.colors.success } : 
                        { color: designTokens.colors.textSecondary }
                    ]}>
                      {listing.status}
                    </Text>
                  </View>
                </View>
              </View>
              
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flexDirection: 'row', gap: designTokens.spacing.lg }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Eye size={14} color={designTokens.colors.textMuted} />
                    <Text style={[sharedStyles.statSubtitle, { marginLeft: 4 }]}>
                      {listing.views || 0} views
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <MessageSquare size={14} color={designTokens.colors.textMuted} />
                    <Text style={[sharedStyles.statSubtitle, { marginLeft: 4 }]}>
                      {listing.inquiries || 0} inquiries
                    </Text>
                  </View>
                </View>
                
                <View style={{ flexDirection: 'row', gap: designTokens.spacing.sm }}>
                  <TouchableOpacity 
                    style={[sharedStyles.secondaryButton, { paddingHorizontal: designTokens.spacing.md, paddingVertical: designTokens.spacing.xs }]}
                    onPress={() => router.push(`/(owner)/edit-listing/${listing.id}` as any)}
                  >
                    <Text style={[sharedStyles.secondaryButtonText, { color: designTokens.colors.info }]}>
                      Edit
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[sharedStyles.secondaryButton, { paddingHorizontal: designTokens.spacing.md, paddingVertical: designTokens.spacing.xs }]}
                    onPress={() => router.push(`/property-preview?id=${listing.id}`)}
                  >
                    <Text style={[sharedStyles.secondaryButtonText, { color: designTokens.colors.success }]}>
                      View
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  const renderBookings = () => (
    <View style={sharedStyles.pageContainer}>
      <Text style={sharedStyles.pageTitle}>Booking Management</Text>
      
      {bookings.length === 0 ? (
        <View style={sharedStyles.emptyState}>
          <View style={[sharedStyles.statIcon, iconBackgrounds.orange, { marginBottom: designTokens.spacing.lg }]}>
            <Calendar size={32} color="#F59E0B" />
          </View>
          <Text style={sharedStyles.emptyStateTitle}>No bookings yet</Text>
          <Text style={sharedStyles.emptyStateText}>
            Booking requests from tenants will appear here
          </Text>
        </View>
      ) : (
        <View style={sharedStyles.list}>
          {bookings.map((booking) => (
            <View key={booking.id} style={sharedStyles.card}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: designTokens.spacing.lg }}>
                <View style={{ flex: 1 }}>
                  <Text style={[sharedStyles.statLabel, { marginBottom: 4, fontSize: designTokens.typography.lg }]}>
                    {booking.propertyTitle}
                  </Text>
                  <Text style={sharedStyles.statSubtitle}>Tenant: {booking.tenantName}</Text>
                  <Text style={sharedStyles.statSubtitle}>{booking.tenantEmail}</Text>
                  <Text style={sharedStyles.statSubtitle}>{booking.tenantPhone}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <View style={[
                    sharedStyles.statusBadge,
                    booking.status === 'approved' ? { backgroundColor: designTokens.colors.successLight } :
                    booking.status === 'rejected' ? { backgroundColor: designTokens.colors.errorLight } : 
                    { backgroundColor: designTokens.colors.warningLight }
                  ]}>
                    <Text style={[
                      sharedStyles.statusText,
                      booking.status === 'approved' ? { color: designTokens.colors.success } :
                      booking.status === 'rejected' ? { color: designTokens.colors.error } : 
                      { color: designTokens.colors.warning }
                    ]}>
                      {booking.status}
                    </Text>
                  </View>
                </View>
              </View>
              
              <View style={{ borderTopWidth: 1, borderTopColor: designTokens.colors.borderLight, paddingTop: designTokens.spacing.lg }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: designTokens.spacing.sm }}>
                  <Text style={sharedStyles.statSubtitle}>Monthly Rent:</Text>
                  <Text style={[sharedStyles.statValue, { fontSize: designTokens.typography.base }]}>
                    ₱{booking.monthlyRent.toLocaleString()}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: designTokens.spacing.sm }}>
                  <Text style={sharedStyles.statSubtitle}>Total Amount:</Text>
                  <Text style={[sharedStyles.statValue, { fontSize: designTokens.typography.base, color: designTokens.colors.success }]}>
                    ₱{booking.totalAmount.toLocaleString()}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: designTokens.spacing.lg }}>
                  <Text style={sharedStyles.statSubtitle}>Duration:</Text>
                  <Text style={[sharedStyles.statValue, { fontSize: designTokens.typography.base }]}>
                    {booking.startDate} to {booking.endDate}
                  </Text>
                </View>
                
                <View style={{ flexDirection: 'row', gap: designTokens.spacing.md }}>
                  
                  {/* Approve/Reject buttons - Only for pending bookings */}
                  {booking.status === 'pending' && (
                    <>
                      <TouchableOpacity 
                        style={[sharedStyles.primaryButton, { flex: 1, backgroundColor: designTokens.colors.success, paddingVertical: designTokens.spacing.md }]}
                        onPress={() => handleBookingAction(booking.id, 'approve')}
                      >
                        <Text style={sharedStyles.primaryButtonText}>Approve</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={[sharedStyles.primaryButton, { flex: 1, backgroundColor: designTokens.colors.error, paddingVertical: designTokens.spacing.md }]}
                        onPress={() => handleBookingAction(booking.id, 'reject')}
                      >
                        <Text style={sharedStyles.primaryButtonText}>Reject</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  const renderMessages = () => (
    <View style={sharedStyles.pageContainer}>
      <Text style={sharedStyles.pageTitle}>Messages</Text>
      
      {messages.length === 0 ? (
        <View style={sharedStyles.emptyState}>
          <View style={[sharedStyles.statIcon, iconBackgrounds.teal, { marginBottom: designTokens.spacing.lg }]}>
            <MessageSquare size={32} color="#10B981" />
          </View>
          <Text style={sharedStyles.emptyStateTitle}>No messages yet</Text>
          <Text style={sharedStyles.emptyStateText}>
            Messages from tenants will appear here
          </Text>
        </View>
      ) : (
        <View style={sharedStyles.list}>
          {messages.map((message) => (
            <TouchableOpacity 
              key={message.id}
              style={[
                sharedStyles.card,
                !message.isRead && { backgroundColor: designTokens.colors.infoLight }
              ]}
              onPress={() => router.push(`/(owner)/chat-room/${message.conversationId}` as any)}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: designTokens.spacing.sm }}>
                <Text style={[sharedStyles.statLabel, { marginBottom: 0, fontSize: designTokens.typography.lg }]}>
                  {message.tenantName}
                </Text>
                <Text style={sharedStyles.statSubtitle}>
                  {new Date(message.createdAt).toLocaleDateString()}
                </Text>
              </View>
              
              {message.propertyTitle && (
                <Text style={[sharedStyles.statSubtitle, { color: designTokens.colors.info, fontWeight: '500', marginBottom: designTokens.spacing.sm }]}>
                  {message.propertyTitle}
                </Text>
              )}
              
              <Text style={[sharedStyles.statSubtitle, { color: designTokens.colors.textPrimary }]} numberOfLines={2}>
                {message.text}
              </Text>
              
              {!message.isRead && (
                <View style={{ 
                  backgroundColor: designTokens.colors.info, 
                  width: 8, 
                  height: 8, 
                  borderRadius: 4, 
                  marginTop: designTokens.spacing.sm 
                }} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );


  const renderPaymentSettings = () => (
    <View style={sharedStyles.pageContainer}>
      <Text style={sharedStyles.pageTitle}>Payment Settings</Text>
      
      <View style={sharedStyles.card}>
        <Text style={[sharedStyles.sectionTitle, { marginBottom: designTokens.spacing.lg }]}>Payment Methods</Text>
        <Text style={[sharedStyles.statSubtitle, { marginBottom: designTokens.spacing.lg }]}>
          Configure your payment methods to receive payments from tenants.
        </Text>
        
        <TouchableOpacity 
          style={sharedStyles.primaryButton}
          onPress={() => router.push('/(owner)/payment-settings')}
        >
          <CreditCard size={16} color="white" />
          <Text style={sharedStyles.primaryButtonText}>Manage Payment Methods</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderContent = () => {
    switch (activeSection) {
      case 'overview':
        return renderOverview();
      case 'listings':
        return renderListings();
      case 'bookings':
        return renderBookings();
      case 'messages':
        return renderMessages();
      case 'payment-settings':
        return renderPaymentSettings();
      default:
        return renderOverview();
    }
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
        {renderContent()}
      </ScrollView>
    </View>
  );
}
