import React, { useState, useEffect, useCallback } from 'react';
import { ScrollView, View, TouchableOpacity, Alert, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { getBookingsByTenant, cancelBooking, getStatusColor, getStatusIcon } from '@/utils/booking';
import { BookingRecord } from '@/types';
import { useToast } from '@/components/ui/toast';
import { notifications } from '@/utils';
import { db } from '@/utils/db';
import { showAlert } from '@/utils/alert';

export default function TenantBookings() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const toast = useToast();
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'cancelled'>('all');
  const [cancellingBookingId, setCancellingBookingId] = useState<string | null>(null);
  const [deletingBookingId, setDeletingBookingId] = useState<string | null>(null);




  const loadBookings = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      
      // Clean up any cancelled bookings first
      const { cleanupCancelledBookingsForUser } = await import('@/utils/cleanup-cancelled-bookings');
      await cleanupCancelledBookingsForUser(user.id, 'tenant');
      
      const tenantBookings = await getBookingsByTenant(user.id);
      setBookings(tenantBookings);
      console.log(`✅ Loaded ${tenantBookings.length} bookings for tenant ${user.id}`);
    } catch (error) {
      console.error('❌ Error loading bookings:', error);
      showAlert('Error', 'Failed to load bookings. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Optimized loading - only load when user changes
  useEffect(() => {
    if (isAuthenticated && user?.id) {
      loadBookings();
    }
  }, [isAuthenticated, user?.id]); // Remove loadBookings dependency

  // Focus effect to reload bookings when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (user?.id) {
        loadBookings();
      }
    }, [user?.id]) // Remove loadBookings dependency
  );

  // Listen for booking status changes from owners
  useEffect(() => {
    const handleBookingStatusChange = (event: any) => {
      console.log('🔄 Booking status changed, refreshing tenant bookings...', event.detail);
      loadBookings();
    };

    if (typeof window !== 'undefined') {
      if (typeof window !== 'undefined' && window.addEventListener) {
        window.addEventListener('bookingStatusChanged', handleBookingStatusChange);
      }
      return () => {
        if (typeof window !== 'undefined' && window.removeEventListener) {
          window.removeEventListener('bookingStatusChanged', handleBookingStatusChange);
        }
      };
    }
  }, [user?.id]); // Remove loadBookings dependency

  const handleCancelBooking = async (bookingId: string) => {
    console.log('🔄 Starting cancel booking process for:', bookingId);
    console.log('👤 User object:', user);
    console.log('👤 User ID:', user?.id);
    
    // Check if user is available
    if (!user || !user.id) {
      console.error('❌ User not available for cancellation');
      Alert.alert('Error', 'User not authenticated. Please log in again.');
      return;
    }
    
    // Enhanced confirmation dialog
    showAlert(
      '⚠️ Cancel Booking Request?',
      'Are you sure you want to cancel this booking?\n\n' +
      '• This will remove the booking request completely\n' +
      '• The owner will be notified\n' +
      '• This action cannot be undone\n\n' +
      'Do you want to proceed?',
      [
        { 
          text: 'No, Keep Booking', 
          style: 'cancel',
          onPress: () => {
            console.log('❌ User cancelled the cancellation');
          }
        },
        { 
          text: 'Yes, Cancel Booking', 
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('🔄 Confirmed cancellation for booking:', bookingId);
              console.log('👤 Using user ID for cancellation:', user.id);
              
              // Set loading state
              setCancellingBookingId(bookingId);
              
              // Call the cancel booking function (now deletes the booking)
              await cancelBooking(bookingId, user.id);
              console.log('✅ Booking deleted successfully from database');
              
              // Remove from local state immediately for better UX
              setBookings(prevBookings => {
                const updatedBookings = prevBookings.filter(booking => booking.id !== bookingId);
                console.log('✅ Booking removed from local state');
                return updatedBookings;
              });

              // Show success message
              toast.show(notifications.operationSuccess('Booking cancelled and removed'));
              
              console.log('✅ Cancel booking process completed successfully');
            } catch (error) {
              console.error('❌ Error cancelling booking:', error);
              const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
              
              showAlert(
                'Cancellation Failed', 
                `Failed to cancel booking: ${errorMessage}\n\nPlease try again or contact support if the issue persists.`,
                [{ text: 'OK' }]
              );
            } finally {
              // Clear loading state
              setCancellingBookingId(null);
            }
          }
        }
      ]
    );
  };

  const handleDeleteRejectedBooking = async (bookingId: string) => {
    console.log('🗑️ Delete button clicked for booking:', bookingId);
    
    if (!user?.id) {
      showAlert('Error', 'User not authenticated');
      return;
    }
    
    console.log('👤 User ID:', user.id);
    
    showAlert(
      'Delete Rejected Booking',
      'Are you sure you want to permanently delete this rejected booking? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('🗑️ User confirmed deletion for booking:', bookingId);
              setDeletingBookingId(bookingId);
              
              await db.remove('bookings', bookingId);
              console.log('✅ Delete function completed successfully');
              
              // Reload bookings from database to ensure UI is in sync
              await loadBookings();
              console.log('✅ Bookings reloaded from database');

              // Show success message
              toast.show(notifications.operationSuccess('Rejected booking deleted'));
              
            } catch (error) {
              console.error('❌ Error deleting rejected booking:', error);
              const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
              
              showAlert(
                'Deletion Failed', 
                `Failed to delete booking: ${errorMessage}\n\nPlease try again or contact support if the issue persists.`,
                [{ text: 'OK' }]
              );
            } finally {
              // Clear loading state
              setDeletingBookingId(null);
            }
          }
        }
      ]
    );
  };

  const filteredBookings = bookings.filter(booking => {
    if (filter === 'all') {
      // For 'all' filter, show all bookings including cancelled
      return true;
    }
    // For specific filters, show bookings matching that status
    return booking.status === filter;
  });

  const getBookingStats = () => {
    const total = bookings.length;
    const pending = bookings.filter(b => b.status === 'pending').length;
    const approved = bookings.filter(b => b.status === 'approved').length;
    const rejected = bookings.filter(b => b.status === 'rejected').length;
    const cancelled = bookings.filter(b => b.status === 'cancelled').length;
    
    return { total, pending, approved, rejected, cancelled };
  };

  const stats = getBookingStats();

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.authRequiredContainer}>
          <Text style={styles.authRequiredTitle}>Authentication Required</Text>
          <TouchableOpacity 
            onPress={() => router.push('/login')}
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
        <Text style={styles.headerTitle}>My Bookings</Text>
        <Text style={styles.headerSubtitle}>{stats.total} active bookings</Text>
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
            {(['all', 'pending', 'approved', 'rejected', 'cancelled'] as const).map((filterType) => (
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
                  ? 'You haven\'t made any booking requests yet'
                  : `No ${filter} bookings found`
                }
              </Text>
              {filter === 'all' && (
                <TouchableOpacity
                  onPress={() => router.push('/(tabs)')}
                  style={styles.browseButton}
                >
                  <Text style={styles.browseButtonText}>Browse Properties</Text>
                </TouchableOpacity>
              )}
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
                      <View style={styles.locationRow}>
                        <Ionicons name="location" size={14} color="#6B7280" />
                        <Text style={styles.locationText}>{booking.propertyAddress}</Text>
                      </View>
                    </View>
                    
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(booking.status) }]}>
                      <Text style={styles.statusText}>
                        {getStatusIcon(booking.status)} {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                      </Text>
                    </View>
                  </View>

                  {/* Booking Details */}
                  <View style={styles.bookingDetails}>
                    <Text style={styles.detailsTitle}>Booking Details</Text>
                    <View style={styles.detailRow}>
                      <Ionicons name="calendar" size={14} color="#6B7280" />
                      <Text style={styles.detailText}>
                        Move-in: {booking.startDate ? new Date(booking.startDate).toLocaleDateString() : 'N/A'}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Ionicons name="cash" size={14} color="#6B7280" />
                      <Text style={styles.detailText}>
                        Monthly Rent: ₱{booking.monthlyRent ? booking.monthlyRent.toLocaleString() : '0'}
                      </Text>
                    </View>
                    {booking.status === 'cancelled' && booking.cancelledAt && (
                      <View style={styles.detailRow}>
                        <Ionicons name="close-circle" size={14} color="#EF4444" />
                        <Text style={[styles.detailText, { color: '#EF4444' }]}>
                          Cancelled: {new Date(booking.cancelledAt).toLocaleDateString()}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Special Requests */}
                  {booking.specialRequests && (
                    <View style={styles.specialRequests}>
                      <Text style={styles.detailsTitle}>Special Requests</Text>
                      <Text style={styles.specialRequestsText}>{booking.specialRequests}</Text>
                    </View>
                  )}

                  {/* Contact Owner - Only show for approved bookings */}
                  {booking.status === 'approved' && (
                    <View style={styles.approvedSection}>
                      <Text style={styles.detailsTitle}>Next Steps</Text>
                      <View style={styles.approvedCard}>
                        <Text style={styles.approvedTitle}>
                          ✅ Booking Approved!
                        </Text>
                        <Text style={styles.approvedText}>
                          Your booking has been approved! Please contact the property owner to discuss move-in details.
                        </Text>
                        <TouchableOpacity
                          onPress={() => router.push({
                            pathname: '/chat-room',
                            params: {
                              name: booking.ownerName,
                              otherUserId: booking.ownerId,
                              propertyId: booking.propertyId,
                              propertyTitle: booking.propertyTitle
                            }
                          })}
                          style={styles.contactOwnerButton}
                        >
                          <Text style={styles.contactOwnerButtonText}>
                            Contact Owner
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}

                  {/* Action Buttons */}
                  <View style={styles.actionButtons}>
                    {booking.status === 'pending' && (
                      <TouchableOpacity
                        onPress={() => {
                          console.log('🔴 Cancel button pressed for booking:', booking.id);
                          console.log('🔴 Booking status:', booking.status);
                          console.log('🔴 User ID:', user?.id);
                          handleCancelBooking(booking.id);
                        }}
                        disabled={cancellingBookingId === booking.id}
                        style={[
                          styles.cancelButton,
                          cancellingBookingId === booking.id && styles.disabledButton
                        ]}
                      >
                        <Text style={styles.cancelButtonText}>
                          {cancellingBookingId === booking.id ? 'Cancelling...' : 'Cancel Booking'}
                        </Text>
                      </TouchableOpacity>
                    )}
                    
                    {/* Delete Button - Only show for rejected bookings */}
                    {booking.status === 'rejected' && (
                      <TouchableOpacity
                        onPress={() => handleDeleteRejectedBooking(booking.id)}
                        disabled={deletingBookingId === booking.id}
                        style={[
                          styles.deleteButton,
                          deletingBookingId === booking.id && styles.disabledButton
                        ]}
                      >
                        <Ionicons name="trash" size={16} color="white" />
                        <Text style={styles.deleteButtonText}>
                          {deletingBookingId === booking.id ? 'Deleting...' : 'Delete'}
                        </Text>
                      </TouchableOpacity>
                    )}
                    
                    {/* Message Owner Button - Only show for pending bookings */}
                    {booking.status === 'pending' && (
                      <TouchableOpacity
                        onPress={() => router.push({
                          pathname: '/chat-room',
                          params: {
                            name: booking.ownerName,
                            otherUserId: booking.ownerId,
                            propertyId: booking.propertyId,
                            propertyTitle: booking.propertyTitle
                          }
                        })}
                        style={styles.messageButton}
                      >
                        <Ionicons name="chatbubble" size={16} color="#3B82F6" />
                        <Text style={styles.messageButtonText}>Message Owner</Text>
                      </TouchableOpacity>
                    )}
                    
                    {/* Payment Methods Button - Only show for approved bookings */}
                    {booking.status === 'approved' && (
                      <TouchableOpacity
                        onPress={() => router.push({
                          pathname: '/payment-methods',
                          params: {
                            bookingId: booking.id
                          }
                        })}
                        style={styles.paymentButton}
                      >
                        <Ionicons name="card" size={16} color="#10B981" />
                        <Text style={styles.paymentButtonText}>Payment Methods</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
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
        marginBottom: 24,
    },
    browseButton: {
        backgroundColor: '#10B981',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
    },
    browseButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
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
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    locationText: {
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
    detailsTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 8,
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
    approvedSection: {
        marginBottom: 16,
    },
    approvedCard: {
        backgroundColor: '#F0FDF4',
        borderWidth: 1,
        borderColor: '#BBF7D0',
        borderRadius: 8,
        padding: 12,
    },
    approvedTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#065F46',
        marginBottom: 8,
    },
    approvedText: {
        fontSize: 14,
        color: '#047857',
        marginBottom: 12,
        lineHeight: 20,
    },
    contactOwnerButton: {
        backgroundColor: '#10B981',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 6,
        alignItems: 'center',
    },
    contactOwnerButtonText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
    },
    actionButtons: {
        flexDirection: 'row',
        gap: 8,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
    },
    cancelButton: {
        flex: 1,
        backgroundColor: '#EF4444',
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    cancelButtonText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
    },
    deleteButton: {
        flex: 1,
        backgroundColor: '#EF4444',
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 4,
    },
    deleteButtonText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
    },
    messageButton: {
        flex: 1,
        backgroundColor: '#EFF6FF',
        paddingVertical: 8,
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
    paymentButton: {
        flex: 1,
        backgroundColor: '#F0FDF4',
        paddingVertical: 8,
        borderRadius: 8,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 4,
    },
    paymentButtonText: {
        color: '#10B981',
        fontSize: 14,
        fontWeight: '500',
    },
    disabledButton: {
        backgroundColor: '#9CA3AF',
    },
});

