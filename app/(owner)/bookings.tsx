import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, Pressable, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { getBookingsByOwner, updateBookingStatus, getStatusColor, getStatusIcon, deleteBookingByOwner } from '@/utils/booking';
import { BookingRecord, RentPaymentRecord } from '@/types';
import { showAlert } from '../../utils/alert';
import TenantInfoModal from '../../components/TenantInfoModal';
import { createOrFindConversation } from '@/utils/conversation-utils';
import { db } from '@/utils/db';
import { sharedStyles, designTokens, iconBackgrounds } from '../../styles/owner-dashboard-styles';
import { 
  Calendar, 
  Clock, 
  CheckCircle, 
  XCircle, 
  User, 
  MapPin, 
  Phone, 
  Mail, 
  Home, 
  Wallet,
  MessageSquare,
  ArrowLeft,
  Trash2,
  LayoutGrid,
  List,
  LayoutList,
  Users
} from 'lucide-react-native';

export default function BookingsPage() {
  const { user, signOut } = useAuth();
  const { refreshPendingBookings } = useNotifications();
  const router = useRouter();
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [viewMode, setViewMode] = useState<'large' | 'compact' | 'list'>('large');
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<{
    id: string;
    name: string;
    email?: string;
    phone?: string;
  } | null>(null);

  const loadBookings = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      
      const ownerBookings = await getBookingsByOwner(user.id);
      setBookings(ownerBookings);
    } catch (error) {
      console.error('❌ Error loading bookings:', error);
      // Don't show alert on every error to prevent spam
      console.warn('Failed to load bookings');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadBookings();
  };

  useEffect(() => {
    if (!user) {
      router.replace('/login');
      return;
    }

    if (!user.roles?.includes('owner')) {
      showAlert('Access Denied', 'This page is for property owners only.');
      router.replace('/(tabs)');
      return;
    }

    loadBookings();
  }, [user]);

  // Listen for new bookings from tenants
  useEffect(() => {
    const handleNewBooking = (event: any) => {
      console.log('🔄 New booking received, refreshing owner bookings...', event.detail);
      loadBookings();
    };

    const handleBookingCancelled = (event: any) => {
      console.log('🔄 Booking cancelled by tenant, refreshing owner bookings...', event.detail);
      loadBookings();
    };

    if (typeof window !== 'undefined') {
      if (typeof window !== 'undefined' && window.addEventListener) {
        window.addEventListener('bookingCreated', handleNewBooking);
        window.addEventListener('bookingCancelled', handleBookingCancelled);
      }
      return () => {
        if (typeof window !== 'undefined' && window.removeEventListener) {
          window.removeEventListener('bookingCreated', handleNewBooking);
          window.removeEventListener('bookingCancelled', handleBookingCancelled);
        }
      };
    }
  }, []); // Remove loadBookings dependency to prevent infinite re-renders

  const handleBookingAction = async (bookingId: string, action: 'approve' | 'reject') => {
    if (!user?.id) return;

    // Get booking details for confirmation message
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) {
      showAlert('Error', 'Booking not found');
      return;
    }

    // Show confirmation alert before accepting
    if (action === 'approve') {
      Alert.alert(
        'Confirm Booking Approval',
        `Are you sure you want to approve the booking from ${booking.tenantName} for ${booking.propertyTitle}?\n\n` +
        `This will:\n` +
        `• Reserve the property slot for this tenant\n` +
        `• Send a payment notification to the tenant\n` +
        `• Create the initial payment record\n\n` +
        `This action cannot be undone.`,
        [
          {
            text: 'Cancel',
            style: 'cancel'
          },
          {
            text: 'Approve',
            style: 'default',
            onPress: async () => {
              try {
                const status = 'approved';
                const success = await updateBookingStatus(bookingId, status, user.id);

                if (success) {
                  showAlert(
                    'Success', 
                    `Booking approved successfully! The tenant has been notified.`
                  );
                  
                  // Send notification message to tenant with payment details
                  const { sendBookingApprovalNotification } = await import('../../utils/booking-notifications');
                  await sendBookingApprovalNotification(
                    bookingId,
                    user.id,
                    booking.tenantId,
                    booking.propertyTitle
                  );
                  
                  // Dispatch event to notify tenant dashboard
                  const { dispatchCustomEvent } = await import('../../utils/custom-events');
                  dispatchCustomEvent('bookingStatusChanged', {
                    bookingId,
                    status,
                    ownerId: user.id,
                    timestamp: new Date().toISOString()
                  });
                  
                  loadBookings();
                  // Refresh the pending bookings count in the navigation badge
                  refreshPendingBookings();
                } else {
                  throw new Error('Failed to update booking status');
                }
              } catch (error) {
                console.error('Error approving booking:', error);
                showAlert('Error', 'Failed to approve booking');
              }
            }
          }
        ]
      );
    } else {
      // For rejection, show confirmation as well
      Alert.alert(
        'Confirm Booking Rejection',
        `Are you sure you want to reject the booking from ${booking.tenantName} for ${booking.propertyTitle}?\n\n` +
        `This will notify the tenant that their booking has been declined.`,
        [
          {
            text: 'Cancel',
            style: 'cancel'
          },
          {
            text: 'Reject',
            style: 'destructive',
            onPress: async () => {
              try {
                const status = 'rejected';
                const success = await updateBookingStatus(bookingId, status, user.id);

                if (success) {
                  showAlert(
                    'Success', 
                    `Booking rejected successfully`
                  );
                  
                  // Send notification message to tenant
                  const { sendBookingRejectionNotification } = await import('../../utils/booking-notifications');
                  await sendBookingRejectionNotification(
                    bookingId,
                    user.id,
                    booking.tenantId,
                    booking.propertyTitle
                  );
                  
                  // Dispatch event to notify tenant dashboard
                  const { dispatchCustomEvent } = await import('../../utils/custom-events');
                  dispatchCustomEvent('bookingStatusChanged', {
                    bookingId,
                    status,
                    ownerId: user.id,
                    timestamp: new Date().toISOString()
                  });
                  
                  loadBookings();
                  // Refresh the pending bookings count in the navigation badge
                  refreshPendingBookings();
                } else {
                  throw new Error('Failed to update booking status');
                }
              } catch (error) {
                console.error('Error rejecting booking:', error);
                showAlert('Error', 'Failed to reject booking');
              }
            }
          }
        ]
      );
    }
  };

  const handleViewTenantInfo = (booking: BookingRecord) => {
    setSelectedTenant({
      id: booking.tenantId,
      name: booking.tenantName,
      email: booking.tenantEmail,
      phone: booking.tenantPhone
    });
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedTenant(null);
  };

  const handleDeleteBooking = (booking: BookingRecord) => {
    Alert.alert(
      'Delete Booking Request',
      `Are you sure you want to delete the booking request from ${booking.tenantName} for ${booking.propertyTitle}?`,
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!user?.id) return;
            
            try {
              const success = await deleteBookingByOwner(booking.id, user.id);
              
              if (success) {
                // Remove from UI after successful deletion
                setBookings(prevBookings => prevBookings.filter(b => b.id !== booking.id));
                // Refresh the pending bookings count in the navigation badge
                refreshPendingBookings();
              } else {
                showAlert('Error', 'Failed to delete booking request');
              }
            } catch (error) {
              console.error('Error deleting booking:', error);
              showAlert('Error', 'Failed to delete booking request');
            }
          }
        }
      ]
    );
  };

  const getBookingStats = () => {
    const total = bookings.length;
    const pending = bookings.filter(b => b.status === 'pending').length;
    const approved = bookings.filter(b => b.status === 'approved').length;
    const rejected = bookings.filter(b => b.status === 'rejected').length;
    
    return { total, pending, approved, rejected };
  };

  const stats = getBookingStats();

  const filteredBookings = filter === 'all' 
    ? bookings 
    : bookings.filter(b => b.status === filter);

  if (!user) {
    return (
      <SafeAreaView style={sharedStyles.container}>
        <View style={[sharedStyles.emptyState, { justifyContent: 'center', minHeight: 400 }]}>
          <Text style={sharedStyles.emptyStateTitle}>Authentication Required</Text>
          <TouchableOpacity 
            onPress={() => router.replace('/login')}
            style={sharedStyles.primaryButton}
          >
            <Text style={sharedStyles.primaryButtonText}>Go to Login</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={sharedStyles.container}>
      <ScrollView 
        style={sharedStyles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={sharedStyles.pageContainer}>
          {/* Header */}
          <View style={sharedStyles.pageHeader}>
            <View style={sharedStyles.headerLeft}>
              <Text style={sharedStyles.pageTitle}>Booking Management</Text>
              <Text style={sharedStyles.pageSubtitle}>{stats.total} booking request{stats.total !== 1 ? 's' : ''}</Text>
            </View>
            <View style={sharedStyles.headerRight}>
              {/* View Mode Selector */}
              <View style={{ flexDirection: 'row', gap: designTokens.spacing.xs, backgroundColor: designTokens.colors.white, padding: designTokens.spacing.xs, borderRadius: designTokens.borderRadius.md, borderWidth: 1, borderColor: designTokens.colors.border }}>
                <TouchableOpacity
                  onPress={() => setViewMode('large')}
                  style={[
                    { padding: designTokens.spacing.sm, borderRadius: designTokens.borderRadius.sm },
                    viewMode === 'large' && { backgroundColor: designTokens.colors.primary }
                  ]}
                >
                  <LayoutGrid size={18} color={viewMode === 'large' ? designTokens.colors.white : designTokens.colors.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setViewMode('compact')}
                  style={[
                    { padding: designTokens.spacing.sm, borderRadius: designTokens.borderRadius.sm },
                    viewMode === 'compact' && { backgroundColor: designTokens.colors.primary }
                  ]}
                >
                  <List size={18} color={viewMode === 'compact' ? designTokens.colors.white : designTokens.colors.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setViewMode('list')}
                  style={[
                    { padding: designTokens.spacing.sm, borderRadius: designTokens.borderRadius.sm },
                    viewMode === 'list' && { backgroundColor: designTokens.colors.primary }
                  ]}
                >
                  <LayoutList size={18} color={viewMode === 'list' ? designTokens.colors.white : designTokens.colors.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Stats Cards */}
          <View style={sharedStyles.section}>
            <View style={sharedStyles.grid}>
              <View style={sharedStyles.gridItem}>
                <View style={[sharedStyles.statCard, { position: 'relative', overflow: 'hidden' }]}>
                  <View style={[sharedStyles.statCardGradient, { backgroundColor: designTokens.colors.primary }]} />
                  <View style={sharedStyles.statIconContainer}>
                    <View style={[sharedStyles.statIcon, iconBackgrounds.blue]}>
                      <Calendar size={20} color={designTokens.colors.primary} />
                    </View>
                  </View>
                  <Text style={sharedStyles.statValue}>{stats.total}</Text>
                  <Text style={sharedStyles.statLabel}>Total Bookings</Text>
                </View>
              </View>
              
              <View style={sharedStyles.gridItem}>
                <View style={[sharedStyles.statCard, { position: 'relative', overflow: 'hidden' }]}>
                  <View style={[sharedStyles.statCardGradient, { backgroundColor: designTokens.colors.warning }]} />
                  <View style={sharedStyles.statIconContainer}>
                    <View style={[sharedStyles.statIcon, iconBackgrounds.orange]}>
                      <Clock size={20} color={designTokens.colors.warning} />
                    </View>
                  </View>
                  <Text style={[sharedStyles.statValue, { color: designTokens.colors.warning }]}>{stats.pending}</Text>
                  <Text style={sharedStyles.statLabel}>Pending</Text>
                </View>
              </View>
              
              <View style={sharedStyles.gridItem}>
                <View style={[sharedStyles.statCard, { position: 'relative', overflow: 'hidden' }]}>
                  <View style={[sharedStyles.statCardGradient, { backgroundColor: designTokens.colors.success }]} />
                  <View style={sharedStyles.statIconContainer}>
                    <View style={[sharedStyles.statIcon, iconBackgrounds.green]}>
                      <CheckCircle size={20} color={designTokens.colors.success} />
                    </View>
                  </View>
                  <Text style={[sharedStyles.statValue, { color: designTokens.colors.success }]}>{stats.approved}</Text>
                  <Text style={sharedStyles.statLabel}>Approved</Text>
                </View>
              </View>
              
              <View style={sharedStyles.gridItem}>
                <View style={[sharedStyles.statCard, { position: 'relative', overflow: 'hidden' }]}>
                  <View style={[sharedStyles.statCardGradient, { backgroundColor: designTokens.colors.error }]} />
                  <View style={sharedStyles.statIconContainer}>
                    <View style={[sharedStyles.statIcon, iconBackgrounds.red]}>
                      <XCircle size={20} color={designTokens.colors.error} />
                    </View>
                  </View>
                  <Text style={[sharedStyles.statValue, { color: designTokens.colors.error }]}>{stats.rejected}</Text>
                  <Text style={sharedStyles.statLabel}>Rejected</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Filter Buttons */}
          <View style={[sharedStyles.section, { marginBottom: designTokens.spacing.lg }]}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: designTokens.spacing.sm }}>
              {(['all', 'pending', 'approved', 'rejected'] as const).map((filterType) => (
                <TouchableOpacity
                  key={filterType}
                  onPress={() => setFilter(filterType)}
                  style={[
                    sharedStyles.secondaryButton,
                    filter === filterType && {
                      backgroundColor: designTokens.colors.primary,
                      borderColor: designTokens.colors.primary,
                    }
                  ]}
                >
                  <Text style={[
                    sharedStyles.secondaryButtonText,
                    filter === filterType && { color: designTokens.colors.white }
                  ]}>
                    {filterType.charAt(0).toUpperCase() + filterType.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Bookings List */}
          {loading ? (
            <View style={sharedStyles.loadingContainer}>
              <Text style={sharedStyles.loadingText}>Loading bookings...</Text>
            </View>
          ) : filteredBookings.length === 0 ? (
            <View style={sharedStyles.emptyState}>
              <Calendar size={48} color={designTokens.colors.textMuted} />
              <Text style={sharedStyles.emptyStateTitle}>No bookings found</Text>
              <Text style={sharedStyles.emptyStateText}>
                {filter === 'all' 
                  ? 'Booking requests from tenants will appear here'
                  : `No ${filter} bookings found`
                }
              </Text>
            </View>
          ) : (
            <View style={sharedStyles.list}>
              {filteredBookings.map((booking) => {
                // Large View (Default - Full Details)
                if (viewMode === 'large') {
                  return (
                    <Pressable
                      key={booking.id}
                      onLongPress={() => handleDeleteBooking(booking)}
                      style={({ pressed }) => [
                        sharedStyles.card,
                        { padding: designTokens.spacing.md },
                        pressed && { opacity: 0.7 }
                      ]}
                    >
                      <View>
                    {/* Header */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: designTokens.spacing.md }}>
                      <View style={{ flex: 1, marginRight: designTokens.spacing.sm }}>
                        <Text style={[sharedStyles.sectionTitle, { fontSize: designTokens.typography.lg, marginBottom: designTokens.spacing.xs }]}>
                          {booking.propertyTitle}
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                          <User size={14} color={designTokens.colors.textSecondary} />
                          <Text style={[sharedStyles.statLabel, { marginLeft: designTokens.spacing.xs }]}>
                            {booking.tenantName}
                          </Text>
                        </View>
                      </View>
                      
                      <View style={[
                        sharedStyles.statusBadge,
                        { 
                          backgroundColor: getStatusColor(booking.status),
                          paddingHorizontal: designTokens.spacing.md,
                          paddingVertical: designTokens.spacing.xs,
                        }
                      ]}>
                        <Text style={[sharedStyles.statusText, { color: designTokens.colors.white }]}>
                          {getStatusIcon(booking.status)} {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                        </Text>
                      </View>
                    </View>

                    {/* Tenant Information */}
                    <TouchableOpacity 
                      onPress={() => handleViewTenantInfo(booking)}
                      activeOpacity={0.7}
                      style={{ marginBottom: designTokens.spacing.md }}
                    >
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: designTokens.spacing.sm }}>
                        <Text style={[sharedStyles.formLabel, { marginBottom: 0, fontSize: designTokens.typography.sm }]}>Tenant Information</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: designTokens.colors.infoLight, paddingHorizontal: designTokens.spacing.sm, paddingVertical: 4, borderRadius: designTokens.borderRadius.md }}>
                          <User size={12} color={designTokens.colors.info} />
                          <Text style={[sharedStyles.statLabel, { marginLeft: designTokens.spacing.xs, color: designTokens.colors.info, fontWeight: '500' as const, fontSize: designTokens.typography.xs }]}>
                            View Profile
                          </Text>
                        </View>
                      </View>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: designTokens.spacing.sm }}>
                        {booking.tenantAddress && (
                          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: '48%' }}>
                            <MapPin size={12} color={designTokens.colors.textSecondary} />
                            <Text style={[sharedStyles.statLabel, { marginLeft: designTokens.spacing.xs, fontSize: designTokens.typography.xs, flex: 1 }]} numberOfLines={1}>
                              {booking.tenantAddress}
                            </Text>
                          </View>
                        )}
                        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: '48%' }}>
                          <Phone size={12} color={designTokens.colors.textSecondary} />
                          <Text style={[sharedStyles.statLabel, { marginLeft: designTokens.spacing.xs, fontSize: designTokens.typography.xs }]}>
                            {booking.tenantPhone}
                          </Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: '48%' }}>
                          <Mail size={12} color={designTokens.colors.textSecondary} />
                          <Text style={[sharedStyles.statLabel, { marginLeft: designTokens.spacing.xs, fontSize: designTokens.typography.xs, flex: 1 }]} numberOfLines={1}>
                            {booking.tenantEmail}
                          </Text>
                        </View>
                        {booking.tenantType && (
                          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: '48%' }}>
                            <Users size={12} color={designTokens.colors.textSecondary} />
                            <Text style={[sharedStyles.statLabel, { marginLeft: designTokens.spacing.xs, fontSize: designTokens.typography.xs }]}>
                              {booking.tenantType.charAt(0).toUpperCase() + booking.tenantType.slice(1)}
                              {booking.numberOfPeople && (booking.tenantType === 'family' || booking.tenantType === 'group') && (
                                <Text style={{ fontWeight: '600' as const }}>
                                  {' '}({booking.numberOfPeople})
                                </Text>
                              )}
                            </Text>
                          </View>
                        )}
                      </View>
                    </TouchableOpacity>

                    {/* Payment Details */}
                    <View style={{ marginBottom: designTokens.spacing.md, paddingTop: designTokens.spacing.md, borderTopWidth: 1, borderTopColor: designTokens.colors.borderLight }}>
                      <Text style={[sharedStyles.formLabel, { marginBottom: designTokens.spacing.sm, fontSize: designTokens.typography.sm }]}>Payment Details</Text>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: designTokens.spacing.sm }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: '48%' }}>
                          <Calendar size={12} color={designTokens.colors.textSecondary} />
                          <Text style={[sharedStyles.statLabel, { marginLeft: designTokens.spacing.xs, fontSize: designTokens.typography.xs }]}>
                            {booking.startDate ? String(new Date(booking.startDate).toLocaleDateString()) : 'N/A'}
                          </Text>
                        </View>
                        {booking.selectedRoom !== undefined && (
                          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: '48%' }}>
                            <Home size={12} color={designTokens.colors.success} />
                            <Text style={[sharedStyles.statLabel, { marginLeft: designTokens.spacing.xs, fontSize: designTokens.typography.xs, color: designTokens.colors.success, fontWeight: '600' as const }]}>
                              Room {booking.selectedRoom + 1}
                            </Text>
                          </View>
                        )}
                        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: '48%' }}>
                          <Text style={[sharedStyles.statLabel, { fontSize: designTokens.typography.xs }]}>
                            Rent: ₱{booking.monthlyRent ? String(booking.monthlyRent.toLocaleString()) : '0'}
                          </Text>
                        </View>
                        {booking.advanceDepositMonths && booking.advanceDepositMonths > 0 && (
                          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: '48%' }}>
                            <Text style={[sharedStyles.statLabel, { fontSize: designTokens.typography.xs, color: designTokens.colors.info }]}>
                              Advance: {booking.advanceDepositMonths}m (₱{((booking.advanceDepositMonths || 0) * (booking.monthlyRent || 0)).toLocaleString()})
                            </Text>
                          </View>
                        )}
                        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: '48%' }}>
                          <Wallet size={12} color={designTokens.colors.success} />
                          <Text style={[sharedStyles.statLabel, { marginLeft: designTokens.spacing.xs, fontSize: designTokens.typography.xs, fontWeight: '600' as const, color: designTokens.colors.success }]}>
                            Total: ₱{booking.totalAmount ? String(booking.totalAmount.toLocaleString()) : '0'}
                          </Text>
                        </View>
                        {booking.status === 'approved' && (
                          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: '48%' }}>
                            {booking.paymentStatus === 'paid' ? (
                              <CheckCircle size={12} color={designTokens.colors.success} />
                            ) : (
                              <Clock size={12} color={designTokens.colors.warning} />
                            )}
                            <Text style={[
                              sharedStyles.statLabel, 
                              { 
                                marginLeft: designTokens.spacing.xs,
                                fontSize: designTokens.typography.xs,
                                fontWeight: '600' as const,
                                color: booking.paymentStatus === 'paid' ? designTokens.colors.success : designTokens.colors.warning
                              }
                            ]}>
                              {booking.paymentStatus === 'paid' ? 'Paid' : 'Pending'}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>

                    {/* Special Requests */}
                    {booking.specialRequests && (
                      <View style={{ marginBottom: designTokens.spacing.md, paddingTop: designTokens.spacing.md, borderTopWidth: 1, borderTopColor: designTokens.colors.borderLight }}>
                        <Text style={[sharedStyles.formLabel, { marginBottom: designTokens.spacing.xs, fontSize: designTokens.typography.sm }]}>Special Requests</Text>
                        <Text style={[sharedStyles.statLabel, { lineHeight: 18, fontSize: designTokens.typography.xs }]} numberOfLines={3}>{booking.specialRequests}</Text>
                      </View>
                    )}

                    {/* Action Buttons */}
                    {booking.status === 'pending' && (
                      <View style={{ flexDirection: 'row', gap: designTokens.spacing.sm, paddingTop: designTokens.spacing.md, borderTopWidth: 1, borderTopColor: designTokens.colors.borderLight }}>
                        <TouchableOpacity
                          onPress={() => handleBookingAction(booking.id, 'approve')}
                          style={[sharedStyles.primaryButton, { flex: 1, paddingVertical: designTokens.spacing.sm }]}
                        >
                          <CheckCircle size={16} color={designTokens.colors.white} />
                          <Text style={sharedStyles.primaryButtonText}>Approve</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity
                          onPress={() => handleBookingAction(booking.id, 'reject')}
                          style={[sharedStyles.primaryButton, { flex: 1, backgroundColor: designTokens.colors.error, paddingVertical: designTokens.spacing.sm }]}
                        >
                          <XCircle size={16} color={designTokens.colors.white} />
                          <Text style={sharedStyles.primaryButtonText}>Reject</Text>
                        </TouchableOpacity>
                      </View>
                    )}

                    {/* Mark as Paid - For approved bookings not yet paid */}
                    {booking.status === 'approved' && booking.paymentStatus !== 'paid' && (
                      <View style={{ paddingTop: designTokens.spacing.md, borderTopWidth: 1, borderTopColor: designTokens.colors.borderLight }}>
                        <TouchableOpacity
                          onPress={async () => {
                          if (!user?.id) return;

                          Alert.alert(
                            'Mark as Paid',
                            `Have you received the payment from ${booking.tenantName}?\n\nThis will mark the booking as paid and add the tenant to your tenants list.`,
                            [
                              { text: 'Cancel', style: 'cancel' },
                              {
                                text: 'Yes, Mark as Paid',
                                onPress: async () => {
                                  try {
                                    // Ensure remainingAdvanceMonths is initialized when marking booking as paid
                                    // This is the first payment from tenant to owner and must include advance deposit
                                    const updatedBooking: BookingRecord = {
                                      ...booking,
                                      paymentStatus: 'paid',
                                      updatedAt: new Date().toISOString()
                                    };
                                    
                                    // Initialize remainingAdvanceMonths if booking has advance deposit
                                    if (booking.advanceDepositMonths && booking.advanceDepositMonths > 0) {
                                      if (updatedBooking.remainingAdvanceMonths === undefined || updatedBooking.remainingAdvanceMonths === null) {
                                        updatedBooking.remainingAdvanceMonths = booking.advanceDepositMonths;
                                        console.log('✅ Initialized remainingAdvanceMonths for first payment:', updatedBooking.remainingAdvanceMonths);
                                      }
                                    }

                                    await db.upsert('bookings', booking.id, updatedBooking);
                                    
                                    console.log(`✅ Marked booking as paid: ${booking.id}`);
                                    
                                    // Check if listing has reached capacity and update availability status
                                    try {
                                      const { checkAndRejectPendingBookings } = await import('../../utils/listing-capacity');
                                      await checkAndRejectPendingBookings(booking.propertyId);
                                    } catch (capacityError) {
                                      console.error('❌ Error checking listing capacity:', capacityError);
                                    }
                                    
                                    // Create or update first payment record with advance deposit
                                    // This ensures the first payment always includes the advance deposit
                                    // This is the first payment of the tenant for the owner and must include advance deposit
                                    try {
                                      const { createOrUpdateFirstPaymentForPaidBooking } = await import('../../utils/booking');
                                      const result = await createOrUpdateFirstPaymentForPaidBooking(booking.id, user.id);
                                      
                                      if (!result.success) {
                                        console.error('❌ Error creating/updating first payment:', result.error);
                                      } else {
                                        console.log('✅ First payment created/updated with advance deposit:', result.paymentId);
                                      }
                                    } catch (paymentError) {
                                      console.error('❌ Error creating/updating first payment record:', paymentError);
                                    }
                                    
                                    // Dispatch event to notify other parts of the app
                                    try {
                                      const { dispatchCustomEvent } = await import('../../utils/custom-events');
                                      dispatchCustomEvent('bookingStatusChanged', {
                                        bookingId: booking.id,
                                        status: 'approved',
                                        paymentStatus: 'paid',
                                        ownerId: user.id,
                                        timestamp: new Date().toISOString()
                                      });
                                      dispatchCustomEvent('paymentUpdated', {
                                        bookingId: booking.id,
                                        ownerId: user.id,
                                        tenantId: booking.tenantId,
                                        status: 'paid',
                                      });
                                    } catch (eventError) {
                                      console.warn('⚠️ Could not dispatch events:', eventError);
                                    }
                                    
                                    showAlert('Success', 'Booking marked as paid. Tenant has been added to your tenants list.');
                                    loadBookings();
                                  } catch (error) {
                                    console.error('❌ Error marking booking as paid:', error);
                                    showAlert('Error', 'Failed to mark booking as paid');
                                  }
                                }
                              }
                            ]
                          );
                        }}
                        style={sharedStyles.primaryButton}
                      >
                        <CheckCircle size={16} color={designTokens.colors.white} />
                        <Text style={sharedStyles.primaryButtonText}>Mark as Paid</Text>
                      </TouchableOpacity>
                      </View>
                    )}

                    {/* Contact Tenant - For approved/rejected */}
                    {(booking.status === 'approved' || booking.status === 'rejected') && (
                      <View style={{ paddingTop: designTokens.spacing.md, borderTopWidth: 1, borderTopColor: designTokens.colors.borderLight }}>
                      </View>
                    )}

                        {/* Delete hint */}
                        <View style={{ marginTop: designTokens.spacing.sm, paddingTop: designTokens.spacing.sm, borderTopWidth: 1, borderTopColor: designTokens.colors.borderLight }}>
                          <Text style={[sharedStyles.statSubtitle, { fontSize: 11, textAlign: 'center', fontStyle: 'italic' }]}>
                            💡 Tap and hold to delete
                          </Text>
                        </View>
                      </View>
                    </Pressable>
                  );
                }

                // Compact View (Medium Cards - Essential Info)
                if (viewMode === 'compact') {
                  return (
                    <Pressable
                      key={booking.id}
                      onLongPress={() => handleDeleteBooking(booking)}
                      style={({ pressed }) => [
                        sharedStyles.card,
                        { padding: designTokens.spacing.md },
                        pressed && { opacity: 0.7 }
                      ]}
                    >
                      <View>
                        {/* Header Row */}
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: designTokens.spacing.md }}>
                          <View style={{ flex: 1, marginRight: designTokens.spacing.sm }}>
                            <Text style={[sharedStyles.sectionTitle, { fontSize: designTokens.typography.base, marginBottom: designTokens.spacing.xs }]} numberOfLines={1}>
                              {booking.propertyTitle}
                            </Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: designTokens.spacing.xs }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <User size={12} color={designTokens.colors.textSecondary} />
                                <Text style={[sharedStyles.statLabel, { marginLeft: designTokens.spacing.xs, fontSize: designTokens.typography.xs }]} numberOfLines={1}>
                                  {booking.tenantName}
                                </Text>
                              </View>
                              <Text style={{ color: designTokens.colors.textMuted }}>•</Text>
                              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Wallet size={12} color={designTokens.colors.success} />
                                <Text style={[sharedStyles.statLabel, { marginLeft: designTokens.spacing.xs, fontSize: designTokens.typography.xs, fontWeight: '600' as const, color: designTokens.colors.success }]}>
                                  ₱{booking.totalAmount ? String(booking.totalAmount.toLocaleString()) : '0'}
                                </Text>
                              </View>
                            </View>
                          </View>
                          <View style={[
                            sharedStyles.statusBadge,
                            { 
                              backgroundColor: getStatusColor(booking.status),
                              paddingHorizontal: designTokens.spacing.sm,
                              paddingVertical: 4,
                            }
                          ]}>
                            <Text style={[sharedStyles.statusText, { color: designTokens.colors.white, fontSize: designTokens.typography.xs }]}>
                              {getStatusIcon(booking.status)} {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                            </Text>
                          </View>
                        </View>

                        {/* Quick Info Row */}
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: designTokens.spacing.sm, marginBottom: designTokens.spacing.md }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Calendar size={12} color={designTokens.colors.textSecondary} />
                            <Text style={[sharedStyles.statLabel, { marginLeft: designTokens.spacing.xs, fontSize: designTokens.typography.xs }]}>
                              {booking.startDate ? String(new Date(booking.startDate).toLocaleDateString()) : 'N/A'}
                            </Text>
                          </View>
                          {booking.status === 'approved' && (
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                              {booking.paymentStatus === 'paid' ? (
                                <CheckCircle size={12} color={designTokens.colors.success} />
                              ) : (
                                <Clock size={12} color={designTokens.colors.warning} />
                              )}
                              <Text style={[sharedStyles.statLabel, { marginLeft: designTokens.spacing.xs, fontSize: designTokens.typography.xs, fontWeight: '600' as const, color: booking.paymentStatus === 'paid' ? designTokens.colors.success : designTokens.colors.warning }]}>
                                {booking.paymentStatus === 'paid' ? 'Paid' : 'Pending'}
                              </Text>
                            </View>
                          )}
                        </View>

                        {/* Action Buttons - Compact */}
                        {booking.status === 'pending' && (
                          <View style={{ flexDirection: 'row', gap: designTokens.spacing.xs, paddingTop: designTokens.spacing.sm, borderTopWidth: 1, borderTopColor: designTokens.colors.borderLight }}>
                            <TouchableOpacity
                              onPress={() => handleBookingAction(booking.id, 'approve')}
                              style={[sharedStyles.primaryButton, { flex: 1, paddingVertical: designTokens.spacing.sm }]}
                            >
                              <CheckCircle size={14} color={designTokens.colors.white} />
                              <Text style={[sharedStyles.primaryButtonText, { fontSize: designTokens.typography.xs }]}>Approve</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() => handleBookingAction(booking.id, 'reject')}
                              style={[sharedStyles.primaryButton, { flex: 1, backgroundColor: designTokens.colors.error, paddingVertical: designTokens.spacing.sm }]}
                            >
                              <XCircle size={14} color={designTokens.colors.white} />
                              <Text style={[sharedStyles.primaryButtonText, { fontSize: designTokens.typography.xs }]}>Reject</Text>
                            </TouchableOpacity>
                          </View>
                        )}

                        {booking.status === 'approved' && booking.paymentStatus !== 'paid' && (
                          <View style={{ paddingTop: designTokens.spacing.sm, borderTopWidth: 1, borderTopColor: designTokens.colors.borderLight }}>
                            <TouchableOpacity
                              onPress={async () => {
                                if (!user?.id) return;
                                Alert.alert(
                                  'Mark as Paid',
                                  `Have you received the payment from ${booking.tenantName}?\n\nThis will mark the booking as paid and add the tenant to your tenants list.`,
                                  [
                                    { text: 'Cancel', style: 'cancel' },
                                    {
                                      text: 'Yes, Mark as Paid',
                                      onPress: async () => {
                                        try {
                                          // Ensure remainingAdvanceMonths is initialized when marking booking as paid
                                          // This is the first payment from tenant to owner and must include advance deposit
                                          const updatedBooking: BookingRecord = {
                                            ...booking,
                                            paymentStatus: 'paid',
                                            updatedAt: new Date().toISOString()
                                          };
                                          
                                          // Initialize remainingAdvanceMonths if booking has advance deposit
                                          if (booking.advanceDepositMonths && booking.advanceDepositMonths > 0) {
                                            if (updatedBooking.remainingAdvanceMonths === undefined || updatedBooking.remainingAdvanceMonths === null) {
                                              updatedBooking.remainingAdvanceMonths = booking.advanceDepositMonths;
                                              console.log('✅ Initialized remainingAdvanceMonths for first payment:', updatedBooking.remainingAdvanceMonths);
                                            }
                                          }
                                          
                                          await db.upsert('bookings', booking.id, updatedBooking);
                                          
                                          console.log(`✅ Marked booking as paid: ${booking.id}`);
                                          
                                          // Check if listing has reached capacity and update availability status
                                          try {
                                            const { checkAndRejectPendingBookings } = await import('../../utils/listing-capacity');
                                            await checkAndRejectPendingBookings(booking.propertyId);
                                          } catch (capacityError) {
                                            console.error('❌ Error checking listing capacity:', capacityError);
                                          }
                                          
                                          // Create or update first payment record with advance deposit
                                          // This ensures the first payment always includes the advance deposit
                                          // This is the first payment of the tenant for the owner and must include advance deposit
                                          try {
                                            const { createOrUpdateFirstPaymentForPaidBooking } = await import('../../utils/booking');
                                            const result = await createOrUpdateFirstPaymentForPaidBooking(booking.id, user.id);
                                            
                                            if (!result.success) {
                                              console.error('❌ Error creating/updating first payment:', result.error);
                                            } else {
                                              console.log('✅ First payment created/updated with advance deposit:', result.paymentId);
                                            }
                                          } catch (paymentError) {
                                            console.error('❌ Error creating/updating first payment record:', paymentError);
                                          }
                                          
                                          // Dispatch event to notify other parts of the app
                                          try {
                                            const { dispatchCustomEvent } = await import('../../utils/custom-events');
                                            dispatchCustomEvent('bookingStatusChanged', {
                                              bookingId: booking.id,
                                              status: 'approved',
                                              paymentStatus: 'paid',
                                              ownerId: user.id,
                                              timestamp: new Date().toISOString()
                                            });
                                            dispatchCustomEvent('paymentUpdated', {
                                              bookingId: booking.id,
                                              ownerId: user.id,
                                              tenantId: booking.tenantId,
                                              status: 'paid',
                                            });
                                          } catch (eventError) {
                                            console.warn('⚠️ Could not dispatch events:', eventError);
                                          }
                                          
                                          showAlert('Success', 'Booking marked as paid. Tenant has been added to your tenants list.');
                                          loadBookings();
                                        } catch (error) {
                                          console.error('❌ Error marking booking as paid:', error);
                                          showAlert('Error', 'Failed to mark booking as paid');
                                        }
                                      }
                                    }
                                  ]
                                );
                              }}
                              style={[sharedStyles.primaryButton, { paddingVertical: designTokens.spacing.sm }]}
                            >
                              <CheckCircle size={14} color={designTokens.colors.white} />
                              <Text style={[sharedStyles.primaryButtonText, { fontSize: designTokens.typography.xs }]}>Mark as Paid</Text>
                            </TouchableOpacity>
                          </View>
                        )}

                        {(booking.status === 'approved' || booking.status === 'rejected') && (
                          <View style={{ paddingTop: designTokens.spacing.sm, borderTopWidth: 1, borderTopColor: designTokens.colors.borderLight }}>
                            <TouchableOpacity
                              onPress={async () => {
                                if (!user?.id) return;
                                
                                try {
                                  let ownerDisplayName = 'Property Owner';
                                  try {
                                    const ownerProfile = await db.get('owner_profiles', user.id);
                                    ownerDisplayName = (ownerProfile as any)?.businessName || (ownerProfile as any)?.name || user.name || 'Property Owner';
                                  } catch (error) {
                                    ownerDisplayName = user.name || 'Property Owner';
                                  }
                                  const conversationId = await createOrFindConversation({
                                    ownerId: user.id,
                                    tenantId: booking.tenantId,
                                    ownerName: ownerDisplayName,
                                    tenantName: booking.tenantName,
                                    propertyId: booking.propertyId,
                                    propertyTitle: booking.propertyTitle
                                  });
                                  router.push({
                                    pathname: `/(owner)/chat-room/${conversationId}` as any,
                                    params: { 
                                      conversationId: conversationId,
                                      tenantName: booking.tenantName,
                                      propertyTitle: booking.propertyTitle
                                    }
                                  } as any);
                                } catch (error) {
                                  showAlert('Error', 'Failed to start conversation.');
                                }
                              }}
                              style={[sharedStyles.secondaryButton, { paddingVertical: designTokens.spacing.sm, flexDirection: 'row', alignItems: 'center', gap: 8 }]}
                            >
                              <MessageSquare size={14} color={designTokens.colors.info} />
                              <Text style={[sharedStyles.secondaryButtonText, { color: designTokens.colors.info, fontSize: designTokens.typography.xs }]}>
                                Message
                              </Text>
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                    </Pressable>
                  );
                }

                // List View (Minimal - Key Info Only)
                return (
                  <Pressable
                    key={booking.id}
                    onLongPress={() => handleDeleteBooking(booking)}
                    style={({ pressed }) => [
                      sharedStyles.listItem,
                      pressed && { opacity: 0.7 }
                    ]}
                  >
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: designTokens.spacing.xs }}>
                        <Text style={[sharedStyles.sectionTitle, { fontSize: designTokens.typography.base }]} numberOfLines={1}>
                          {booking.propertyTitle}
                        </Text>
                        <View style={[
                          sharedStyles.statusBadge,
                          { 
                            backgroundColor: getStatusColor(booking.status),
                            paddingHorizontal: designTokens.spacing.sm,
                            paddingVertical: 4,
                          }
                        ]}>
                          <Text style={[sharedStyles.statusText, { color: designTokens.colors.white, fontSize: designTokens.typography.xs }]}>
                            {getStatusIcon(booking.status)}
                          </Text>
                        </View>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: designTokens.spacing.sm }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <User size={12} color={designTokens.colors.textSecondary} />
                          <Text style={[sharedStyles.statLabel, { marginLeft: designTokens.spacing.xs, fontSize: designTokens.typography.xs }]} numberOfLines={1}>
                            {booking.tenantName}
                          </Text>
                        </View>
                        <Text style={{ color: designTokens.colors.textMuted }}>•</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Wallet size={12} color={designTokens.colors.success} />
                          <Text style={[sharedStyles.statLabel, { marginLeft: designTokens.spacing.xs, fontSize: designTokens.typography.xs, fontWeight: '600' as const, color: designTokens.colors.success }]}>
                            ₱{booking.totalAmount ? String(booking.totalAmount.toLocaleString()) : '0'}
                          </Text>
                        </View>
                        {booking.status === 'approved' && (
                          <>
                            <Text style={{ color: designTokens.colors.textMuted }}>•</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                              {booking.paymentStatus === 'paid' ? (
                                <CheckCircle size={12} color={designTokens.colors.success} />
                              ) : (
                                <Clock size={12} color={designTokens.colors.warning} />
                              )}
                              <Text style={[sharedStyles.statLabel, { marginLeft: designTokens.spacing.xs, fontSize: designTokens.typography.xs, fontWeight: '600' as const, color: booking.paymentStatus === 'paid' ? designTokens.colors.success : designTokens.colors.warning }]}>
                                {booking.paymentStatus === 'paid' ? 'Paid' : 'Pending'}
                              </Text>
                            </View>
                          </>
                        )}
                      </View>
                      {booking.status === 'pending' && (
                        <View style={{ flexDirection: 'row', gap: designTokens.spacing.xs, marginTop: designTokens.spacing.sm }}>
                          <TouchableOpacity
                            onPress={() => handleBookingAction(booking.id, 'approve')}
                            style={[sharedStyles.primaryButton, { flex: 1, paddingVertical: designTokens.spacing.xs }]}
                          >
                            <CheckCircle size={12} color={designTokens.colors.white} />
                            <Text style={[sharedStyles.primaryButtonText, { fontSize: designTokens.typography.xs }]}>Approve</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => handleBookingAction(booking.id, 'reject')}
                            style={[sharedStyles.primaryButton, { flex: 1, backgroundColor: designTokens.colors.error, paddingVertical: designTokens.spacing.xs }]}
                          >
                            <XCircle size={12} color={designTokens.colors.white} />
                            <Text style={[sharedStyles.primaryButtonText, { fontSize: designTokens.typography.xs }]}>Reject</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Tenant Info Modal */}
      {selectedTenant && (
        <TenantInfoModal
          visible={modalVisible}
          tenantId={selectedTenant.id}
          tenantName={selectedTenant.name}
          tenantEmail={selectedTenant.email}
          tenantPhone={selectedTenant.phone}
          onClose={closeModal}
        />
      )}
    </SafeAreaView>
  );
}
