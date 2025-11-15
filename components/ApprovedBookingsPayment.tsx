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
import { useRouter } from 'expo-router';
import { db } from '@/utils/db';
import { showAlert } from '@/utils/alert';
import { BookingRecord, RentPaymentRecord } from '@/types';
import { 
  getPaymentsPendingConfirmation, 
  removePaidPayment
} from '@/utils/owner-payment-confirmation';
import { getRentPaymentsByBooking } from '@/utils/tenant-payments';
import TenantInfoModal from './TenantInfoModal';
import { loadPropertyMedia } from '@/utils/media-storage';

interface ApprovedBookingsPaymentProps {
  ownerId: string;
}

interface BookingWithPayment extends BookingRecord {
  tenantAvatar?: string;
  propertyCoverPhoto?: string;
}

export default function ApprovedBookingsPayment({ ownerId }: ApprovedBookingsPaymentProps) {
  const router = useRouter();
  const [approvedBookings, setApprovedBookings] = useState<BookingWithPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [pendingConfirmations, setPendingConfirmations] = useState<Map<string, RentPaymentRecord[]>>(new Map());
  const [processingConfirmation, setProcessingConfirmation] = useState<string | null>(null);
  const [selectedTenant, setSelectedTenant] = useState<{
    id: string;
    name: string;
    email?: string;
    phone?: string;
    avatar?: string;
  } | null>(null);
  const [tenantModalVisible, setTenantModalVisible] = useState(false);
  const [avatarErrors, setAvatarErrors] = useState<Set<string>>(new Set());

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

      // Load tenant avatars, property cover photos, and pending payment confirmations
      const bookingsWithAvatars = await Promise.all(
        ownerApprovedBookings.map(async (booking) => {
          let tenantAvatar = '';
          let propertyCoverPhoto = '';
          
          // Load tenant avatar
          try {
            const { loadUserProfilePhoto } = await import('@/utils/user-profile-photos');
            const photoUri = await loadUserProfilePhoto(booking.tenantId);
            if (photoUri && photoUri.trim() !== '' && photoUri.length > 10) {
              tenantAvatar = photoUri.trim();
              console.log(`✅ Loaded avatar for tenant ${booking.tenantName} (${booking.tenantId}):`, {
                hasAvatar: true,
                uriLength: tenantAvatar.length,
                uriPreview: tenantAvatar.substring(0, 50)
              });
            } else {
              console.log(`⚠️ Invalid avatar URI for tenant ${booking.tenantName}:`, {
                hasUri: !!photoUri,
                uriLength: photoUri?.length || 0,
                uriPreview: photoUri?.substring(0, 50) || 'none'
              });
            }
          } catch (photoError) {
            console.log(`⚠️ Could not load tenant profile photo for ${booking.tenantName}:`, photoError);
          }

          // Load property cover photo
          try {
            const media = await loadPropertyMedia(booking.propertyId);
            if (media.coverPhoto && media.coverPhoto.trim() !== '' && media.coverPhoto.length > 10) {
              propertyCoverPhoto = media.coverPhoto.trim();
              console.log(`✅ Loaded cover photo for property ${booking.propertyTitle} (${booking.propertyId})`);
            } else {
              // Try to get from listing directly
              const listing = await db.get('published_listings', booking.propertyId);
              if (listing && (listing as any).coverPhoto) {
                propertyCoverPhoto = (listing as any).coverPhoto.trim();
                console.log(`✅ Loaded cover photo from listing for ${booking.propertyTitle}`);
              }
            }
          } catch (coverPhotoError) {
            console.log(`⚠️ Could not load property cover photo for ${booking.propertyTitle}:`, coverPhotoError);
          }

          return {
            ...booking,
            tenantAvatar,
            propertyCoverPhoto
          };
        })
      );

      // Load pending payment confirmations AND paid payments for each booking
      // This allows owner to see and remove even confirmed payments (for fraud/scam cases)
      const confirmationsMap = new Map<string, RentPaymentRecord[]>();
      for (const booking of ownerApprovedBookings) {
        try {
          const payments = await getRentPaymentsByBooking(booking.id);
          // Include both pending confirmation and paid payments
          const pending = payments.filter(p => 
            p.status === 'pending_owner_confirmation' || p.status === 'paid'
          );
          if (pending.length > 0) {
            confirmationsMap.set(booking.id, pending);
          }
        } catch (error) {
          console.error(`❌ Error loading payments for booking ${booking.id}:`, error);
        }
      }
      setPendingConfirmations(confirmationsMap);

      // Sort by most recent first
      bookingsWithAvatars.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      setApprovedBookings(bookingsWithAvatars);
      // Clear avatar errors when reloading bookings
      setAvatarErrors(new Set());
      console.log('✅ Loaded approved bookings:', bookingsWithAvatars.length);
      console.log(`📋 Found ${confirmationsMap.size} bookings with pending payment confirmations`);
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
      
      // If payment status is updated to 'paid', create a rent payment record for payment history
      if (newStatus === 'paid') {
        try {
          // Check if a rent payment already exists for this booking's initial payment
          const { getRentPaymentsByBooking } = await import('../utils/tenant-payments');
          const { generateId } = await import('../utils/db');
          const existingPayments = await getRentPaymentsByBooking(booking.id);
          
          // Check if there's already a payment for the booking start month
          const startDate = new Date(booking.startDate);
          const paymentMonth = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}`;
          const existingInitialPayment = existingPayments.find(
            p => p.paymentMonth === paymentMonth && p.status === 'paid'
          );
          
          // Only create if it doesn't exist
          if (!existingInitialPayment) {
            const { RentPaymentRecord } = await import('../types');
            const now = new Date();
            const paidDate = now.toISOString();
            
            // Create initial booking payment record
            const initialPayment: RentPaymentRecord = {
              id: generateId('rent_payment'),
              bookingId: booking.id,
              tenantId: booking.tenantId,
              ownerId: booking.ownerId,
              propertyId: booking.propertyId,
              amount: booking.monthlyRent || booking.totalAmount,
              lateFee: 0,
              totalAmount: booking.totalAmount,
              paymentMonth: paymentMonth,
              dueDate: booking.startDate,
              paidDate: paidDate,
              status: 'paid',
              paymentMethod: booking.selectedPaymentMethod || 'Manual',
              receiptNumber: `INITIAL-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
              notes: 'Initial booking payment',
              createdAt: paidDate,
              updatedAt: paidDate,
            };
            
            await db.upsert('rent_payments', initialPayment.id, initialPayment);
            console.log('✅ Created initial booking payment record in payment history:', initialPayment.id);
          }
        } catch (paymentError) {
          console.error('❌ Error creating initial payment record:', paymentError);
          // Don't fail the whole operation if payment history creation fails
        }
        
        // Check if listing has reached capacity and auto-reject pending bookings
        const { checkAndRejectPendingBookings } = await import('../utils/listing-capacity');
        await checkAndRejectPendingBookings(booking.propertyId);
      }
      
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


  const handleRemovePaidPayment = async (paymentId: string) => {
    if (!ownerId) return;

    Alert.alert(
      'Remove Confirmed Payment',
      '⚠️ WARNING: This payment has already been confirmed as paid.\n\nAre you sure you want to remove it? This should only be done if:\n\n• Payment was not actually received\n• Payment was fraudulent/scam\n• Payment needs to be corrected\n\nThis will mark the payment as pending and notify the tenant.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, Remove Payment',
          style: 'destructive',
          onPress: async () => {
            try {
              setProcessingConfirmation(paymentId);
              const result = await removePaidPayment(
                paymentId, 
                ownerId, 
                'Payment removed by owner - payment not received or fraudulent'
              );
              
              if (result.success) {
                showAlert('Success', 'Payment removed. Tenant has been notified and payment is now pending.');
                loadApprovedBookings();
              } else {
                showAlert('Error', result.error || 'Failed to remove payment');
              }
            } catch (error) {
              console.error('Error removing paid payment:', error);
              showAlert('Error', 'Failed to remove payment');
            } finally {
              setProcessingConfirmation(null);
            }
          },
        },
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
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.headerLeft}
          onPress={() => setIsExpanded(!isExpanded)}
          activeOpacity={0.7}
        >
          <Ionicons name="cash-outline" size={24} color="#10B981" />
          <Text style={styles.headerTitle}>Revenue & Payments</Text>
          {approvedBookings.length > 0 && (
            <View style={styles.badgeContainer}>
              <Text style={styles.badgeCount}>{approvedBookings.length}</Text>
            </View>
          )}
        </TouchableOpacity>
        <View style={styles.headerRight}>
          <TouchableOpacity 
            onPress={() => setIsExpanded(!isExpanded)}
            activeOpacity={0.7}
          >
            <Ionicons 
              name={isExpanded ? "chevron-up" : "chevron-down"} 
              size={20} 
              color="#6B7280" 
            />
          </TouchableOpacity>
        </View>
      </View>
      
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
            {/* Property Cover Photo */}
            {booking.propertyCoverPhoto && 
             booking.propertyCoverPhoto.trim() !== '' && 
             booking.propertyCoverPhoto.length > 10 ? (
              <View style={styles.coverPhotoContainer}>
                <Image
                  source={{ uri: booking.propertyCoverPhoto }}
                  style={styles.coverPhoto}
                  resizeMode="cover"
                  onError={(error) => {
                    console.error(`❌ Failed to load cover photo for ${booking.propertyTitle}:`, error.nativeEvent?.error);
                  }}
                />
                <View style={styles.coverPhotoOverlay}>
                  <Text style={styles.propertyTitleLarge}>{booking.propertyTitle}</Text>
                </View>
              </View>
            ) : (
              <View style={styles.coverPhotoPlaceholder}>
                <Ionicons name="home" size={32} color="#10B981" />
                <Text style={[styles.propertyTitleLarge, { color: '#111827', marginTop: 8 }]}>{booking.propertyTitle}</Text>
              </View>
            )}

            <View style={styles.cardHeader}>
              {/* Tenant Avatar */}
              <View style={styles.avatarContainer}>
                {booking.tenantAvatar && 
                 booking.tenantAvatar.trim() !== '' && 
                 booking.tenantAvatar.length > 10 &&
                 !avatarErrors.has(booking.id) ? (
                  <Image
                    key={`avatar-${booking.id}-${booking.tenantAvatar.substring(0, 20)}`}
                    source={{ uri: booking.tenantAvatar }}
                    style={styles.avatarImage}
                    onError={(error) => {
                      console.error(`❌ Failed to load avatar for ${booking.tenantName}:`, error.nativeEvent?.error);
                      console.error(`❌ Avatar URI:`, booking.tenantAvatar?.substring(0, 100));
                      setAvatarErrors(prev => new Set(prev).add(booking.id));
                    }}
                    onLoad={() => {
                      console.log(`✅ Successfully loaded avatar for ${booking.tenantName}`);
                      setAvatarErrors(prev => {
                        const newSet = new Set(prev);
                        newSet.delete(booking.id);
                        return newSet;
                      });
                    }}
                    resizeMode="cover"
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
                <TouchableOpacity
                  onPress={() => {
                    setSelectedTenant({
                      id: booking.tenantId,
                      name: booking.tenantName,
                      email: booking.tenantEmail,
                      phone: booking.tenantPhone,
                      avatar: booking.tenantAvatar,
                    });
                    setTenantModalVisible(true);
                  }}
                  activeOpacity={0.7}
                  style={styles.tenantNameContainer}
                >
                  <Text style={styles.tenantName}>{booking.tenantName}</Text>
                  <Ionicons name="person-circle-outline" size={16} color="#3B82F6" style={styles.tenantNameIcon} />
                </TouchableOpacity>
                {booking.selectedRoom !== undefined && (
                  <Text style={[styles.propertyTitle, { color: '#10B981', fontWeight: '600', marginTop: 2 }]}>
                    Room {booking.selectedRoom + 1}
                  </Text>
                )}
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

            {/* Payment Confirmations and Paid Payments */}
            {pendingConfirmations.has(booking.id) && (
              <View style={styles.pendingConfirmationsContainer}>
                <View style={styles.pendingConfirmationsHeader}>
                  <Ionicons name="alert-circle" size={18} color="#F59E0B" />
                  <Text style={styles.pendingConfirmationsTitle}>
                    Payments ({pendingConfirmations.get(booking.id)?.length || 0})
                  </Text>
                </View>
                {pendingConfirmations.get(booking.id)?.map((payment) => {
                  const isPaid = payment.status === 'paid';
                  const isPending = payment.status === 'pending_owner_confirmation';
                  
                  return (
                    <View key={payment.id} style={styles.pendingPaymentCard}>
                      <View style={styles.pendingPaymentInfo}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <Text style={styles.pendingPaymentAmount}>
                            ₱{payment.totalAmount.toLocaleString()}
                          </Text>
                          {isPaid && (
                            <View style={styles.paidBadge}>
                              <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                              <Text style={styles.paidBadgeText}>Confirmed</Text>
                            </View>
                          )}
                          {isPending && (
                            <View style={styles.pendingBadge}>
                              <Ionicons name="time-outline" size={14} color="#F59E0B" />
                              <Text style={styles.pendingBadgeText}>Pending</Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.pendingPaymentMethod}>
                          {payment.paymentMethod || 'PayMongo GCash'}
                        </Text>
                        <Text style={styles.pendingPaymentDate}>
                          {payment.paidDate ? new Date(payment.paidDate).toLocaleDateString() : 'N/A'}
                        </Text>
                        {payment.paymentMonth && (
                          <Text style={styles.pendingPaymentDate}>
                            Month: {payment.paymentMonth}
                          </Text>
                        )}
                      </View>
                      {isPaid && (
                        <View style={styles.pendingPaymentActions}>
                          <TouchableOpacity
                            style={[styles.removeButton, processingConfirmation === payment.id && styles.removeButtonDisabled]}
                            onPress={() => handleRemovePaidPayment(payment.id)}
                            disabled={processingConfirmation === payment.id}
                          >
                            {processingConfirmation === payment.id ? (
                              <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : (
                              <>
                                <Ionicons name="trash-outline" size={16} color="#FFFFFF" />
                                <Text style={styles.removeButtonText}>Remove</Text>
                              </>
                            )}
                          </TouchableOpacity>
                        </View>
                      )}
                      {isPending && (
                        <View style={styles.pendingPaymentInfo}>
                          <Text style={styles.pendingNote}>
                            Go to Tenants page to confirm or reject this payment
                          </Text>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            )}

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

      {/* Tenant Info Modal */}
      {selectedTenant && (
        <TenantInfoModal
          visible={tenantModalVisible}
          tenantId={selectedTenant.id}
          tenantName={selectedTenant.name}
          tenantEmail={selectedTenant.email}
          tenantPhone={selectedTenant.phone}
          tenantAvatar={selectedTenant.avatar}
          onClose={() => {
            setTenantModalVisible(false);
            setSelectedTenant(null);
          }}
        />
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
    flex: 1,
  },
  headerRight: {
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
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  coverPhotoContainer: {
    width: '100%',
    height: 180,
    position: 'relative',
  },
  coverPhoto: {
    width: '100%',
    height: '100%',
  },
  coverPhotoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: 16,
    paddingTop: 20,
  },
  coverPhotoPlaceholder: {
    width: '100%',
    height: 180,
    backgroundColor: '#F0FDF4',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  propertyTitleLarge: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: 12,
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
  tenantNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  tenantName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  tenantNameIcon: {
    marginLeft: 4,
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
  pendingConfirmationsContainer: {
    backgroundColor: '#FFFBEB',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  pendingConfirmationsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  pendingConfirmationsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F59E0B',
  },
  pendingPaymentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  pendingPaymentInfo: {
    marginBottom: 12,
  },
  pendingPaymentAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  pendingPaymentMethod: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 2,
  },
  pendingPaymentDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  pendingNote: {
    fontSize: 12,
    color: '#F59E0B',
    fontStyle: 'italic',
    marginTop: 8,
    textAlign: 'center',
  },
  pendingPaymentActions: {
    flexDirection: 'row',
    gap: 8,
  },
  confirmButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 6,
  },
  confirmButtonDisabled: {
    opacity: 0.6,
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  rejectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EF4444',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 6,
  },
  rejectButtonDisabled: {
    opacity: 0.6,
  },
  rejectButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  removeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DC2626',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 6,
  },
  removeButtonDisabled: {
    opacity: 0.6,
  },
  removeButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  paidBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  paidBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#10B981',
  },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  pendingBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#F59E0B',
  },
});

