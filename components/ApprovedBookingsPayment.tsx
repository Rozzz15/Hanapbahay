import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { db } from '@/utils/db';
import { showAlert } from '@/utils/alert';
import { BookingRecord } from '@/types';

interface ApprovedBookingsPaymentProps {
  ownerId: string;
}

interface BookingWithPayment extends BookingRecord {
  tenantAvatar?: string;
}

export default function ApprovedBookingsPayment({ ownerId }: ApprovedBookingsPaymentProps) {
  const [approvedBookings, setApprovedBookings] = useState<BookingWithPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);

  const loadApprovedBookings = useCallback(async () => {
    if (!ownerId) return;

    try {
      setLoading(true);
      console.log('🔄 Loading approved bookings for owner:', ownerId);

      // Get all bookings
      const allBookings = await db.list<BookingRecord>('bookings');
      
      // Filter for approved bookings for this owner
      const ownerApprovedBookings = allBookings.filter(booking => 
        booking.ownerId === ownerId && booking.status === 'approved'
      );

      console.log(`📊 Found ${ownerApprovedBookings.length} approved bookings`);

      // Load tenant avatars
      const bookingsWithAvatars = await Promise.all(
        ownerApprovedBookings.map(async (booking) => {
          let tenantAvatar = '';
          
          try {
            const { loadUserProfilePhoto } = await import('@/utils/user-profile-photos');
            const photoUri = await loadUserProfilePhoto(booking.tenantId);
            if (photoUri && photoUri.trim() !== '') {
              tenantAvatar = photoUri;
            }
          } catch (photoError) {
            console.log('⚠️ Could not load tenant profile photo:', photoError);
          }

          return {
            ...booking,
            tenantAvatar
          };
        })
      );

      // Sort by most recent first
      bookingsWithAvatars.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      setApprovedBookings(bookingsWithAvatars);
      console.log('✅ Loaded approved bookings:', bookingsWithAvatars.length);
    } catch (error) {
      console.error('❌ Error loading approved bookings:', error);
    } finally {
      setLoading(false);
    }
  }, [ownerId]);

  useEffect(() => {
    loadApprovedBookings();
  }, [loadApprovedBookings]);

  const updatePaymentStatus = async (booking: BookingWithPayment, newStatus: 'paid' | 'partial' | 'pending') => {
    try {
      const updatedBooking: BookingRecord = {
        ...booking,
        paymentStatus: newStatus,
        updatedAt: new Date().toISOString()
      };

      await db.upsert('bookings', booking.id, updatedBooking);
      
      console.log(`✅ Updated payment status to: ${newStatus}`);
      showAlert('Success', `Payment status updated to ${newStatus}`);
      
      // Reload bookings
      loadApprovedBookings();
    } catch (error) {
      console.error('❌ Error updating payment status:', error);
      showAlert('Error', 'Failed to update payment status');
    }
  };

  const showPaymentStatusOptions = (booking: BookingWithPayment) => {
    Alert.alert(
      'Update Payment Status',
      `Current status: ${booking.paymentStatus}\nTenant: ${booking.tenantName}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark as Paid',
          onPress: () => updatePaymentStatus(booking, 'paid'),
          style: 'default'
        },
        {
          text: 'Mark as Partial',
          onPress: () => updatePaymentStatus(booking, 'partial'),
          style: 'default'
        },
        {
          text: 'Mark as Pending',
          onPress: () => updatePaymentStatus(booking, 'pending'),
          style: 'default'
        }
      ]
    );
  };

  const getPaymentBadge = (paymentStatus: string) => {
    switch (paymentStatus) {
      case 'paid':
        return (
          <View style={styles.badgePaid}>
            <Ionicons name="checkmark-circle" size={16} color="#10B981" />
            <Text style={styles.badgeTextPaid}>Paid</Text>
          </View>
        );
      case 'partial':
        return (
          <View style={styles.badgePartial}>
            <Ionicons name="time-outline" size={16} color="#F59E0B" />
            <Text style={styles.badgeTextPartial}>Partial</Text>
          </View>
        );
      default:
        return (
          <View style={styles.badgePending}>
            <Ionicons name="hourglass-outline" size={16} color="#6366F1" />
            <Text style={styles.badgeTextPending}>Pending</Text>
          </View>
        );
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10B981" />
        <Text style={styles.loadingText}>Loading approved bookings...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.header}
        onPress={() => setIsExpanded(!isExpanded)}
        activeOpacity={0.7}
      >
        <View style={styles.headerLeft}>
          <Ionicons name="cash-outline" size={24} color="#10B981" />
          <Text style={styles.headerTitle}>Revenue & Payments</Text>
          {approvedBookings.length > 0 && (
            <View style={styles.badgeContainer}>
              <Text style={styles.badgeCount}>{approvedBookings.length}</Text>
            </View>
          )}
        </View>
        <Ionicons 
          name={isExpanded ? "chevron-up" : "chevron-down"} 
          size={20} 
          color="#6B7280" 
        />
      </TouchableOpacity>
      
      {isExpanded && (
        <>
          <Text style={styles.subtitle}>
            Track payment status for approved bookings
          </Text>

          {approvedBookings.length === 0 ? (
            <View style={styles.emptyInCollapsed}>
              <Ionicons name="calendar-outline" size={32} color="#9CA3AF" />
              <Text style={styles.emptyTitle}>No Approved Bookings</Text>
              <Text style={styles.emptyText}>
                Bookings that you approve will appear here
              </Text>
            </View>
          ) : (
            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {approvedBookings.map((booking) => (
          <TouchableOpacity
            key={booking.id}
            style={styles.bookingCard}
            onPress={() => showPaymentStatusOptions(booking)}
            activeOpacity={0.7}
          >
            <View style={styles.cardHeader}>
              {/* Tenant Avatar */}
              <View style={styles.avatarContainer}>
                {booking.tenantAvatar && booking.tenantAvatar.trim() !== '' ? (
                  <Image
                    source={{ uri: booking.tenantAvatar }}
                    style={styles.avatarImage}
                  />
                ) : (
                  <View style={styles.avatarFallback}>
                    <Text style={styles.avatarText}>
                      {booking.tenantName.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
              </View>

              {/* Booking Info */}
              <View style={styles.bookingInfo}>
                <Text style={styles.tenantName}>{booking.tenantName}</Text>
                <Text style={styles.propertyTitle}>{booking.propertyTitle}</Text>
                <Text style={styles.bookingDates}>
                  {formatDate(booking.startDate)} - {formatDate(booking.endDate)}
                </Text>
              </View>

              {/* Payment Status Badge */}
              {getPaymentBadge(booking.paymentStatus)}
            </View>

            {/* Amount Info */}
            <View style={styles.amountContainer}>
              <View style={styles.amountRow}>
                <Text style={styles.amountLabel}>Monthly Rent:</Text>
                <Text style={styles.amountValue}>₱{booking.monthlyRent.toLocaleString()}</Text>
              </View>
              <View style={styles.amountRow}>
                <Text style={styles.amountLabel}>Total Amount:</Text>
                <Text style={styles.amountValueBold}>₱{booking.totalAmount.toLocaleString()}</Text>
              </View>
            </View>

            {/* Action Hint */}
            <View style={styles.actionHint}>
              <Text style={styles.actionHintText}>
                Tap to update payment status
              </Text>
            </View>
          </TouchableOpacity>
        ))}
            </ScrollView>
          )}

          {approvedBookings.length > 0 && (
            <View style={styles.summaryContainer}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Total Approved:</Text>
                <Text style={styles.summaryValue}>{approvedBookings.length}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Revenue (Paid):</Text>
                <Text style={[styles.summaryValue, styles.revenueValue]}>
                  ₱{approvedBookings
                    .filter(b => b.paymentStatus === 'paid')
                    .reduce((sum, b) => sum + b.totalAmount, 0)
                    .toLocaleString()}
                </Text>
              </View>
            </View>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 20,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 0,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badgeContainer: {
    backgroundColor: '#10B981',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    paddingHorizontal: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  badgeCount: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  subtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 12,
    marginTop: 12,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyInCollapsed: {
    padding: 40,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  scrollView: {
    maxHeight: 350,
  },
  bookingCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarFallback: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  bookingInfo: {
    flex: 1,
  },
  tenantName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  propertyTitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 2,
  },
  bookingDates: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  badgePaid: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#10B981',
    gap: 4,
  },
  badgePartial: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F59E0B',
    gap: 4,
  },
  badgePending: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#6366F1',
    gap: 4,
  },
  badgeTextPaid: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10B981',
  },
  badgeTextPartial: {
    fontSize: 12,
    fontWeight: '600',
    color: '#F59E0B',
  },
  badgeTextPending: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6366F1',
  },
  amountContainer: {
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  amountLabel: {
    fontSize: 13,
    color: '#6B7280',
  },
  amountValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  amountValueBold: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#10B981',
  },
  actionHint: {
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  actionHintText: {
    fontSize: 11,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  summaryContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 2,
    borderTopColor: '#E5E7EB',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#374151',
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#111827',
  },
  revenueValue: {
    color: '#10B981',
    fontSize: 18,
  },
});

