import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { getBookingsByOwner, updateBookingStatus, getStatusColor, getStatusIcon } from '@/utils/booking';
import { BookingRecord } from '@/types';
import { showAlert } from '../../utils/alert';
import TenantInfoModal from '../../components/TenantInfoModal';
import { createOrFindConversation } from '@/utils/conversation-utils';
import { db } from '@/utils/db';

export default function BookingsPage() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
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
      
      // Clean up any cancelled bookings first
      const { cleanupCancelledBookingsForUser } = await import('../../utils/cleanup-cancelled-bookings');
      await cleanupCancelledBookingsForUser(user.id, 'owner');
      
      const ownerBookings = await getBookingsByOwner(user.id);
      setBookings(ownerBookings);
    } catch (error) {
      console.error('❌ Error loading bookings:', error);
      showAlert('Error', 'Failed to load bookings');
    } finally {
      setLoading(false);
    }
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

    try {
      const status = action === 'approve' ? 'approved' : 'rejected';
      const success = await updateBookingStatus(bookingId, status, user.id);

      if (success) {
        showAlert(
          'Success', 
          `Booking ${action === 'approve' ? 'approved' : 'rejected'} successfully`
        );
        
        // Get booking details to send notification
        const booking = bookings.find(b => b.id === bookingId);
        if (booking) {
          // Send notification message to tenant with payment details
          const { sendBookingApprovalNotification, sendBookingRejectionNotification } = await import('../../utils/booking-notifications');
          
          if (action === 'approve') {
            await sendBookingApprovalNotification(
              bookingId,
              user.id,
              booking.tenantId,
              booking.propertyTitle
            );
          } else {
            await sendBookingRejectionNotification(
              bookingId,
              user.id,
              booking.tenantId,
              booking.propertyTitle
            );
          }
        }
        
        // Dispatch event to notify tenant dashboard
        const { dispatchCustomEvent } = await import('../../utils/custom-events');
        dispatchCustomEvent('bookingStatusChanged', {
          bookingId,
          status,
          ownerId: user.id,
          timestamp: new Date().toISOString()
        });
        
        loadBookings();
      } else {
        throw new Error('Failed to update booking status');
      }
    } catch (error) {
      console.error(`Error ${action}ing booking:`, error);
      showAlert('Error', `Failed to ${action} booking`);
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
      <SafeAreaView style={styles.container}>
        <View style={styles.authRequiredContainer}>
          <Text style={styles.authRequiredTitle}>Authentication Required</Text>
          <TouchableOpacity 
            onPress={() => router.replace('/login')}
            style={styles.loginButton}
          >
            <Text style={styles.loginButtonText}>Go to Login</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Booking Management</Text>
        <Text style={styles.headerSubtitle}>{stats.total} booking requests</Text>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <View style={styles.statContent}>
              <Text style={styles.statNumber}>{stats.total}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            <Ionicons name="calendar" size={20} color="#6B7280" />
          </View>
          
          <View style={styles.statCard}>
            <View style={styles.statContent}>
              <Text style={[styles.statNumber, styles.pendingNumber]}>{stats.pending}</Text>
              <Text style={styles.statLabel}>Pending</Text>
            </View>
            <Ionicons name="time" size={20} color="#F59E0B" />
          </View>
          
          <View style={styles.statCard}>
            <View style={styles.statContent}>
              <Text style={[styles.statNumber, styles.approvedNumber]}>{stats.approved}</Text>
              <Text style={styles.statLabel}>Approved</Text>
            </View>
            <Ionicons name="checkmark-circle" size={20} color="#10B981" />
          </View>
        </View>
      </View>

      {/* Filter Buttons */}
      <View style={styles.filtersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.filtersRow}>
            {(['all', 'pending', 'approved', 'rejected'] as const).map((filterType) => (
              <TouchableOpacity
                key={filterType}
                onPress={() => setFilter(filterType)}
                style={[
                  styles.filterButton,
                  filter === filterType && styles.filterButtonActive
                ]}
              >
                <Text style={[
                  styles.filterButtonText,
                  filter === filterType && styles.filterButtonTextActive
                ]}>
                  {filterType.charAt(0).toUpperCase() + filterType.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Loading bookings...</Text>
            </View>
          ) : filteredBookings.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={48} color="#9CA3AF" />
              <Text style={styles.emptyStateTitle}>No bookings found</Text>
              <Text style={styles.emptyStateText}>
                {filter === 'all' 
                  ? 'Booking requests from tenants will appear here'
                  : `No ${filter} bookings found`
                }
              </Text>
            </View>
          ) : (
            <View style={styles.bookingsList}>
              {filteredBookings.map((booking) => (
                <View key={booking.id} style={styles.bookingCard}>
                  {/* Header */}
                  <View style={styles.bookingHeader}>
                    <View style={styles.bookingTitleContainer}>
                      <Text style={styles.bookingTitle}>
                        {booking.propertyTitle}
                      </Text>
                      <View style={styles.tenantRow}>
                        <Ionicons name="person" size={14} color="#6B7280" />
                        <Text style={styles.tenantText}>{booking.tenantName}</Text>
                      </View>
                    </View>
                    
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(booking.status) }]}>
                      <Text style={styles.statusText}>
                        {getStatusIcon(booking.status)} {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                      </Text>
                    </View>
                  </View>

                  {/* Booking Details */}
                  <TouchableOpacity 
                    style={styles.bookingDetails}
                    onPress={() => handleViewTenantInfo(booking)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.tenantInfoHeader}>
                      <Text style={styles.detailsTitle}>Tenant Information</Text>
                      <View style={styles.viewProfileButton}>
                        <Ionicons name="person-circle-outline" size={16} color="#3B82F6" />
                        <Text style={styles.viewProfileText}>View Profile</Text>
                      </View>
                    </View>
                    <View style={styles.detailRow}>
                      <Ionicons name="mail" size={14} color="#6B7280" />
                      <Text style={styles.detailText}>{booking.tenantEmail}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Ionicons name="call" size={14} color="#6B7280" />
                      <Text style={styles.detailText}>{booking.tenantPhone}</Text>
                    </View>
                  </TouchableOpacity>

                  {/* Payment Details */}
                  <View style={styles.bookingDetails}>
                    <Text style={styles.detailsTitle}>Payment Details</Text>
                    <View style={styles.detailRow}>
                      <Ionicons name="calendar" size={14} color="#6B7280" />
                      <Text style={styles.detailText}>
                        Move-in: {booking.startDate ? new Date(booking.startDate).toLocaleDateString() : 'N/A'}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Ionicons name="cash" size={14} color="#6B7280" />
                      <Text style={styles.detailText}>
                        Monthly: ₱{booking.monthlyRent ? booking.monthlyRent.toLocaleString() : '0'}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Ionicons name="wallet" size={14} color="#6B7280" />
                      <Text style={[styles.detailText, { fontWeight: '600', color: '#10B981' }]}>
                        Total: ₱{booking.totalAmount ? booking.totalAmount.toLocaleString() : '0'}
                      </Text>
                    </View>
                  </View>

                  {/* Special Requests */}
                  {booking.specialRequests && (
                    <View style={styles.specialRequests}>
                      <Text style={styles.detailsTitle}>Special Requests</Text>
                      <Text style={styles.specialRequestsText}>{booking.specialRequests}</Text>
                    </View>
                  )}

                  {/* Action Buttons */}
                  {booking.status === 'pending' && (
                    <View style={styles.actionButtons}>
                      <TouchableOpacity
                        onPress={() => handleBookingAction(booking.id, 'approve')}
                        style={styles.approveButton}
                      >
                        <Ionicons name="checkmark-circle" size={16} color="white" />
                        <Text style={styles.approveButtonText}>Approve</Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity
                        onPress={() => handleBookingAction(booking.id, 'reject')}
                        style={styles.rejectButton}
                      >
                        <Ionicons name="close-circle" size={16} color="white" />
                        <Text style={styles.rejectButtonText}>Reject</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Contact Tenant - For approved/rejected */}
                  {(booking.status === 'approved' || booking.status === 'rejected') && (
                    <View style={styles.actionButtons}>
                      <TouchableOpacity
                        onPress={async () => {
                          if (!user?.id) {
                            showAlert('Error', 'Please log in to message the tenant.');
                            return;
                          }

                          try {
                            console.log('💬 Starting conversation with tenant:', booking.tenantId);
                            
                            // Get owner's display name
                            let ownerDisplayName = 'Property Owner';
                            try {
                              const ownerProfile = await db.get('owner_profiles', user.id);
                              ownerDisplayName = (ownerProfile as any)?.businessName || (ownerProfile as any)?.name || user.name || 'Property Owner';
                            } catch (error) {
                              console.log('⚠️ Could not load owner profile, using user name');
                              ownerDisplayName = user.name || 'Property Owner';
                            }

                            // Create or find conversation
                            const conversationId = await createOrFindConversation({
                              ownerId: user.id,
                              tenantId: booking.tenantId,
                              ownerName: ownerDisplayName,
                              tenantName: booking.tenantName,
                              propertyId: booking.propertyId,
                              propertyTitle: booking.propertyTitle
                            });

                            console.log('✅ Created/found conversation:', conversationId);

                            // Navigate to chat room with conversation ID
                            router.push({
                              pathname: '/chat-room',
                              params: {
                                conversationId: conversationId
                              }
                            });
                          } catch (error) {
                            console.error('❌ Error starting conversation:', error);
                            showAlert('Error', 'Failed to start conversation. Please try again.');
                          }
                        }}
                        style={styles.messageButton}
                      >
                        <Ionicons name="chatbubble" size={16} color="#3B82F6" />
                        <Text style={styles.messageButtonText}>Message Tenant</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              ))}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  authRequiredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  authRequiredTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 16,
  },
  loginButton: {
    backgroundColor: '#10B981',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#6B7280',
  },
  statsContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  statContent: {
    marginBottom: 8,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  pendingNumber: {
    color: '#F59E0B',
  },
  approvedNumber: {
    color: '#10B981',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  filtersContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  filtersRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  filterButtonActive: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  bookingsList: {
    gap: 16,
  },
  bookingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  bookingTitleContainer: {
    flex: 1,
    marginRight: 12,
  },
  bookingTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  tenantRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tenantText: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  bookingDetails: {
    marginBottom: 16,
  },
  tenantInfoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  viewProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  viewProfileText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#3B82F6',
  },
  detailsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  detailText: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 8,
  },
  specialRequests: {
    marginBottom: 16,
  },
  specialRequestsText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  approveButton: {
    flex: 1,
    backgroundColor: '#10B981',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
  },
  approveButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  rejectButton: {
    flex: 1,
    backgroundColor: '#EF4444',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
  },
  rejectButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  messageButton: {
    flex: 1,
    backgroundColor: '#EFF6FF',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
  },
  messageButtonText: {
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: '500',
  },
});
