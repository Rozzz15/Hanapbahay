import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  RefreshControl,
  ActivityIndicator,
  Image,
  Modal,
  TextInput
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { 
  Users, 
  Home, 
  MapPin, 
  Calendar,
  Phone,
  Mail,
  Trash2,
  X,
  Search,
  MessageSquare
} from 'lucide-react-native';
import { getTenantsByOwner, type ListingWithTenants, type TenantInfo } from '../../utils/tenant-management';
import { deleteBookingByOwner } from '../../utils/booking';
import { showAlert } from '../../utils/alert';
import { createOrFindConversation } from '../../utils/conversation-utils';
import TenantInfoModal from '../../components/TenantInfoModal';
import { designTokens } from '../../styles/owner-dashboard-styles';
import { addCustomEventListener } from '../../utils/custom-events';
import { getRentPaymentsByBooking, type RentPayment } from '../../utils/tenant-payments';
import { CheckCircle, Clock, XCircle, AlertCircle, Download, History, FileText, Bell } from 'lucide-react-native';
import { loadPropertyMedia } from '../../utils/media-storage';
import { db } from '../../utils/db';
import { generatePaymentReceipt } from '../../utils/tenant-payments';
import { BookingRecord, RentPaymentRecord } from '../../types';
import { confirmPaymentByOwner, rejectPaymentByOwner, restoreRejectedPayment, deleteRejectedPayment, autoDeleteOldRejectedPayments } from '../../utils/owner-payment-confirmation';
import { useNotifications } from '../../context/NotificationContext';

export default function TenantsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { pendingPaymentsCount, refreshPendingPayments } = useNotifications();
  const [listingsWithTenants, setListingsWithTenants] = useState<ListingWithTenants[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<{
    id: string;
    name: string;
    email?: string;
    phone?: string;
    avatar?: string;
  } | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [removingTenantId, setRemovingTenantId] = useState<string | null>(null);
  const [tenantPayments, setTenantPayments] = useState<Map<string, RentPayment[]>>(new Map());
  const [tenantAvatars, setTenantAvatars] = useState<Map<string, string>>(new Map());
  const [propertyCoverPhotos, setPropertyCoverPhotos] = useState<Map<string, string>>(new Map());
  const [paymentHistoryModalVisible, setPaymentHistoryModalVisible] = useState(false);
  const [selectedTenantForHistory, setSelectedTenantForHistory] = useState<{
    tenant: TenantInfo;
    payments: RentPayment[];
    booking: BookingRecord | null;
  } | null>(null);
  const [processingPayment, setProcessingPayment] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTenantType, setSelectedTenantType] = useState<'individual' | 'couple' | 'family' | 'group' | null>(null);

  const loadTenants = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      
      // Process termination countdown in background
      try {
        const { processTerminationCountdown } = await import('../../utils/advance-deposit');
        processTerminationCountdown().catch(err => {
          console.log('Termination countdown processing completed (background)');
        });
      } catch (err) {
        // Silently fail
      }
      
      const tenants = await getTenantsByOwner(user.id);
      setListingsWithTenants(tenants);
      console.log(`✅ Loaded ${tenants.length} listings with tenants`);
      
      // Load payment status, avatars, and property cover photos
      const paymentsMap = new Map<string, RentPayment[]>();
      const avatarsMap = new Map<string, string>();
      const coverPhotosMap = new Map<string, string>();
      
      for (const listing of tenants) {
        // Load property cover photo
        try {
          const media = await loadPropertyMedia(listing.listingId);
          if (media.coverPhoto && media.coverPhoto.trim() !== '' && media.coverPhoto.length > 10) {
            coverPhotosMap.set(listing.listingId, media.coverPhoto.trim());
            console.log(`✅ Loaded cover photo for property ${listing.propertyTitle}`);
          } else {
            // Try to get from listing directly
            const listingData = await db.get('published_listings', listing.listingId);
            if (listingData && (listingData as any).coverPhoto) {
              coverPhotosMap.set(listing.listingId, (listingData as any).coverPhoto.trim());
              console.log(`✅ Loaded cover photo from listing for ${listing.propertyTitle}`);
            }
          }
        } catch (coverPhotoError) {
          console.log(`⚠️ Could not load property cover photo for ${listing.propertyTitle}:`, coverPhotoError);
        }

        for (const tenant of listing.tenants) {
          try {
            let payments = await getRentPaymentsByBooking(tenant.bookingId);
            
            // If tenant has no payment history but their booking is marked as paid,
            // automatically create the first payment record with advance deposit
            if (payments.length === 0 && tenant.paymentStatus === 'paid') {
              try {
                const { createOrUpdateFirstPaymentForPaidBooking } = await import('../../utils/booking');
                const result = await createOrUpdateFirstPaymentForPaidBooking(tenant.bookingId, user.id);
                
                if (result.success) {
                  console.log('✅ Auto-created first payment record with advance deposit for tenant:', tenant.tenantName, result.paymentId);
                  
                  // Reload payments to include the newly created one
                  payments = await getRentPaymentsByBooking(tenant.bookingId);
                } else {
                  console.error('❌ Error auto-creating first payment record:', result.error);
                }
              } catch (paymentError) {
                console.error('❌ Error auto-creating first payment record:', paymentError);
                // Don't fail the whole operation if payment creation fails
              }
            }
            
            paymentsMap.set(tenant.bookingId, payments);
            
            // Load tenant avatar
            try {
              const { loadUserProfilePhoto } = await import('../../utils/user-profile-photos');
              const photoUri = await loadUserProfilePhoto(tenant.tenantId);
              if (photoUri && photoUri.trim() && photoUri.length > 10) {
                avatarsMap.set(tenant.tenantId, photoUri.trim());
                console.log(`✅ Loaded avatar for tenant ${tenant.tenantName} (${tenant.tenantId}):`, {
                  hasAvatar: true,
                  uriLength: photoUri.trim().length,
                  uriPreview: photoUri.trim().substring(0, 50)
                });
              } else {
                console.log(`⚠️ Invalid avatar URI for tenant ${tenant.tenantName} (${tenant.tenantId}):`, {
                  hasUri: !!photoUri,
                  uriLength: photoUri?.length || 0,
                  uriPreview: photoUri?.substring(0, 50) || 'none'
                });
              }
            } catch (avatarError) {
              console.log(`⚠️ Could not load avatar for tenant ${tenant.tenantName} (${tenant.tenantId}):`, avatarError);
            }
          } catch (error) {
            console.error(`❌ Error loading payments for booking ${tenant.bookingId}:`, error);
          }
        }
      }
      setTenantPayments(paymentsMap);
      setTenantAvatars(avatarsMap);
      setPropertyCoverPhotos(coverPhotosMap);
      
      // Refresh pending payments count in notification context
      try {
        await refreshPendingPayments();
      } catch (error) {
        console.error('❌ Error refreshing pending payments count:', error);
      }
    } catch (error) {
      console.error('❌ Error loading tenants:', error);
      showAlert('Error', 'Failed to load tenants. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

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

    loadTenants();
    
    // Auto-delete rejected payments older than 2 days
    autoDeleteOldRejectedPayments().catch((error: any) => {
      console.error('Error auto-deleting old rejected payments:', error);
    });
  }, [user, loadTenants]);

  // Refresh when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (user?.id) {
        loadTenants();
        // Auto-delete rejected payments older than 2 days when screen comes into focus
        autoDeleteOldRejectedPayments().catch((error: any) => {
          console.error('Error auto-deleting old rejected payments:', error);
        });
      }
    }, [user?.id, loadTenants])
  );

  // Listen for booking changes to auto-refresh tenants
  useEffect(() => {
    if (!user?.id) return;

    const handleBookingCreated = (event: any) => {
      console.log('🔄 New booking created, refreshing tenants...', event?.detail);
      loadTenants();
    };

    const handleBookingDeleted = (event: any) => {
      console.log('🔄 Booking deleted, refreshing tenants...', event?.detail);
      loadTenants();
    };

    const handleBookingApproved = (event: any) => {
      console.log('🔄 Booking approved, refreshing tenants...', event?.detail);
      loadTenants();
    };

    // Use cross-platform event listener utility
    const removeBookingCreated = addCustomEventListener('bookingCreated', handleBookingCreated);
    const removeBookingDeleted = addCustomEventListener('bookingDeleted', handleBookingDeleted);
    
    // Also listen for booking status changes (when approved and paid)
    const removeBookingStatusChanged = addCustomEventListener('bookingStatusChanged', handleBookingApproved);
    
    // Listen for payment updates
    const handlePaymentUpdate = async (event: any) => {
      console.log('🔄 Payment updated, refreshing tenants...', event?.detail);
      // Update pending payments count immediately
      await refreshPendingPayments();
      loadTenants();
    };
    const removePaymentUpdate = addCustomEventListener('paymentUpdated', handlePaymentUpdate);
    
    console.log('👂 Tenants page: Added booking and payment change listeners');
    
    // Set up periodic auto-delete check (every 6 hours)
    const autoDeleteInterval = setInterval(() => {
      autoDeleteOldRejectedPayments().catch((error: any) => {
        console.error('Error in periodic auto-delete check:', error);
      });
    }, 6 * 60 * 60 * 1000); // 6 hours
    
    return () => {
      removeBookingCreated();
      removeBookingDeleted();
      removeBookingStatusChanged();
      removePaymentUpdate();
      clearInterval(autoDeleteInterval);
      console.log('🔇 Tenants page: Removed booking and payment change listeners');
    };
  }, [user?.id, loadTenants]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadTenants();
  }, [loadTenants]);

  const handleViewTenantInfo = (tenant: TenantInfo) => {
    // Get the avatar from the loaded avatars map
    const avatar = tenantAvatars.get(tenant.tenantId);
    console.log(`👤 Opening tenant profile modal for ${tenant.tenantName}:`, {
      tenantId: tenant.tenantId,
      hasAvatar: !!avatar,
      avatarLength: avatar?.length || 0,
      avatarPreview: avatar?.substring(0, 50) || 'none',
      allAvatarKeys: Array.from(tenantAvatars.keys())
    });
    setSelectedTenant({
      id: tenant.tenantId,
      name: tenant.tenantName,
      email: tenant.tenantEmail,
      phone: tenant.tenantPhone,
      avatar: avatar
    });
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedTenant(null);
  };

  const handleConfirmPayment = async (paymentId: string) => {
    if (!user?.id) return;

    Alert.alert(
      'Confirm Payment',
      'Have you verified that you received this payment in your account?\n\nThis will mark the payment as paid and notify the tenant.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, Confirm',
          onPress: async () => {
            try {
              setProcessingPayment(paymentId);
              const result = await confirmPaymentByOwner(paymentId, user.id);
              
              if (result.success) {
                showAlert('Success', 'Payment confirmed successfully.');
                
                // Update pending payments count
                await refreshPendingPayments();
                
                // Reload tenants to refresh payment data
                await loadTenants();
                
                // If payment history modal is open, refresh the selected tenant's payments
                if (selectedTenantForHistory) {
                  try {
                    const updatedPayments = await getRentPaymentsByBooking(selectedTenantForHistory.tenant.bookingId);
                    const booking = await db.get<BookingRecord>('bookings', selectedTenantForHistory.tenant.bookingId);
                    setSelectedTenantForHistory({
                      ...selectedTenantForHistory,
                      payments: updatedPayments.sort((a, b) => 
                        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                      ),
                      booking: booking || selectedTenantForHistory.booking,
                    });
                  } catch (error) {
                    console.error('Error refreshing payment history:', error);
                  }
                }
              } else {
                showAlert('Error', result.error || 'Failed to confirm payment');
              }
            } catch (error) {
              console.error('Error confirming payment:', error);
              showAlert('Error', 'Failed to confirm payment');
            } finally {
              setProcessingPayment(null);
            }
          },
        },
      ]
    );
  };

  const handleRejectPayment = async (paymentId: string) => {
    if (!user?.id) return;

    // Get payment details for better warning message
    let paymentAmount = '';
    let paymentMethod = '';
    try {
      const payment = await db.get<RentPaymentRecord>('rent_payments', paymentId);
      if (payment) {
        paymentAmount = `₱${payment.totalAmount.toLocaleString()}`;
        paymentMethod = payment.paymentMethod || 'Unknown method';
      }
    } catch (error) {
      console.error('Error loading payment details:', error);
    }

    Alert.alert(
      '⚠️ Reject Payment',
      `Are you absolutely sure you did NOT receive this payment?\n\n` +
      `Payment Details:\n` +
      `• Amount: ${paymentAmount}\n` +
      `• Method: ${paymentMethod}\n\n` +
      `⚠️ WARNING: This action will:\n` +
      `• Mark the payment as pending\n` +
      `• Notify the tenant to pay again\n` +
      `• Clear the payment confirmation\n\n` +
      `If you accidentally reject, you can restore it from the payment history.\n\n` +
      `Please double-check your account before rejecting.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, I\'m Sure - Reject',
          style: 'destructive',
          onPress: async () => {
            try {
              setProcessingPayment(paymentId);
              const result = await rejectPaymentByOwner(
                paymentId, 
                user.id, 
                'Payment not received in owner account'
              );
              
              if (result.success) {
                showAlert('Success', 'Payment rejected. Tenant has been notified.');
                
                // Update pending payments count
                await refreshPendingPayments();
                
                // Reload tenants to refresh payment data
                await loadTenants();
                
                // If payment history modal is open, refresh the selected tenant's payments
                if (selectedTenantForHistory) {
                  try {
                    const updatedPayments = await getRentPaymentsByBooking(selectedTenantForHistory.tenant.bookingId);
                    const booking = await db.get<BookingRecord>('bookings', selectedTenantForHistory.tenant.bookingId);
                    setSelectedTenantForHistory({
                      ...selectedTenantForHistory,
                      payments: updatedPayments.sort((a, b) => 
                        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                      ),
                      booking: booking || selectedTenantForHistory.booking,
                    });
                  } catch (error) {
                    console.error('Error refreshing payment history:', error);
                  }
                }
              } else {
                showAlert('Error', result.error || 'Failed to reject payment');
              }
            } catch (error) {
              console.error('Error rejecting payment:', error);
              showAlert('Error', 'Failed to reject payment');
            } finally {
              setProcessingPayment(null);
            }
          },
        },
      ]
    );
  };

  const handleRemoveTenant = (tenant: TenantInfo) => {
    if (!user?.id) return;

    Alert.alert(
      'Remove Tenant',
      `Are you sure you want to remove ${tenant.tenantName} from ${tenant.propertyTitle}?\n\n` +
      `This will free up Slot #${tenant.slotNumber} and make it available for new bookings.\n\n` +
      `This action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Remove Tenant',
          style: 'destructive',
          onPress: async () => {
            try {
              setRemovingTenantId(tenant.bookingId);
              
              const success = await deleteBookingByOwner(tenant.bookingId, user.id);
              
              if (success) {
                showAlert(
                  'Success',
                  `${tenant.tenantName} has been removed. Slot #${tenant.slotNumber} is now available.`
                );
                
                // Reload tenants to reflect the change
                await loadTenants();
                
                // Refresh pending payments count to update notification badge
                await refreshPendingPayments();
              } else {
                showAlert('Error', 'Failed to remove tenant. Please try again.');
              }
            } catch (error) {
              console.error('❌ Error removing tenant:', error);
              showAlert('Error', 'Failed to remove tenant. Please try again.');
            } finally {
              setRemovingTenantId(null);
            }
          }
        }
      ]
    );
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return 'N/A';
    }
  };

  if (loading && listingsWithTenants.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={designTokens.colors.primary} />
        <Text style={styles.loadingText}>Loading tenants...</Text>
      </View>
    );
  }

  // Helper function to calculate people count from tenant
  const getPeopleCountFromTenant = (tenant: TenantInfo): number => {
    if (!tenant.tenantType) return 1; // Default to 1 if no tenant type
    
    switch (tenant.tenantType) {
      case 'individual':
        return 1;
      case 'couple':
        return 2;
      case 'family':
      case 'group':
        // Count tenant (1) + family/group members (numberOfPeople)
        const members = tenant.numberOfPeople || 0;
        return 1 + members;
      default:
        return 1;
    }
  };

  // Calculate total people count (not just tenant count)
  const totalTenants = listingsWithTenants.reduce((sum, listing) => {
    return sum + listing.tenants.reduce((tenantSum, tenant) => {
      return tenantSum + getPeopleCountFromTenant(tenant);
    }, 0);
  }, 0);

  // Filter listings and tenants based on search query and tenant type
  const getFilteredListings = () => {
    let filtered = listingsWithTenants;

    // Apply tenant type filter
    if (selectedTenantType) {
      filtered = filtered
        .map(listing => {
          const filteredTenants = listing.tenants.filter(tenant => {
            return tenant.tenantType === selectedTenantType;
          });

          if (filteredTenants.length > 0) {
            return {
              ...listing,
              tenants: filteredTenants
            };
          }
          return null;
        })
        .filter((listing): listing is ListingWithTenants => listing !== null);
    }

    // Apply search query filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered
        .map(listing => {
          // Filter tenants within each listing
          const filteredTenants = listing.tenants.filter(tenant => {
            return (
              tenant.tenantName.toLowerCase().includes(query) ||
              tenant.tenantEmail?.toLowerCase().includes(query) ||
              tenant.tenantPhone?.toLowerCase().includes(query) ||
              listing.propertyTitle.toLowerCase().includes(query) ||
              listing.propertyAddress.toLowerCase().includes(query)
            );
          });

          // Return listing only if it has matching tenants
          if (filteredTenants.length > 0) {
            return {
              ...listing,
              tenants: filteredTenants
            };
          }
          return null;
        })
        .filter((listing): listing is ListingWithTenants => listing !== null);
    }

    return filtered;
  };

  const filteredListings = getFilteredListings();
  // Calculate filtered total people count (not just tenant count)
  const filteredTotalTenants = filteredListings.reduce((sum, listing) => {
    return sum + listing.tenants.reduce((tenantSum, tenant) => {
      return tenantSum + getPeopleCountFromTenant(tenant);
    }, 0);
  }, 0);

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.pageContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.pageTitle}>My Tenants</Text>
              <Text style={styles.pageSubtitle}>
                {totalTenants > 0 
                  ? `${(selectedTenantType || searchQuery.trim()) ? filteredTotalTenants : totalTenants} active ${(selectedTenantType || searchQuery.trim()) ? filteredTotalTenants : totalTenants === 1 ? 'person' : 'people'} across ${(selectedTenantType || searchQuery.trim()) ? filteredListings.length : listingsWithTenants.length} listing${(selectedTenantType || searchQuery.trim()) ? filteredListings.length : listingsWithTenants.length !== 1 ? 's' : ''}`
                  : 'Manage your tenants and monitor occupancy'}
              </Text>
            </View>
          </View>

          {/* Payment Awaiting Confirmation Notification */}
          {pendingPaymentsCount > 0 && (
            <View style={styles.pendingPaymentNotification}>
              <View style={styles.pendingPaymentNotificationContent}>
                <Bell size={16} color="#F59E0B" />
                <Text style={styles.pendingPaymentNotificationText}>
                  {pendingPaymentsCount === 1 
                    ? '1 payment awaiting confirmation'
                    : `${pendingPaymentsCount} payments awaiting confirmation`}
                </Text>
              </View>
            </View>
          )}

          {/* Search Bar */}
          {totalTenants > 0 && (
            <View style={styles.searchContainer}>
              <Search size={18} color={designTokens.colors.textMuted || '#9CA3AF'} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by tenant name, email, phone, or property..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholderTextColor={designTokens.colors.textMuted || '#9CA3AF'}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity
                  onPress={() => setSearchQuery('')}
                  style={styles.clearSearchButton}
                >
                  <X size={16} color={designTokens.colors.textMuted || '#9CA3AF'} />
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Tenant Type Filter */}
          {totalTenants > 0 && (
            <View style={styles.filterContainer}>
              <Text style={styles.filterLabel}>Filter by Tenant Type:</Text>
              <View style={styles.filterButtonsRow}>
                {(['individual', 'couple', 'family', 'group'] as const).map((type) => {
                  const isSelected = selectedTenantType === type;
                  const labels: Record<typeof type, string> = {
                    individual: 'Individual',
                    couple: 'Couple',
                    family: 'Family',
                    group: 'Group'
                  };
                  
                  return (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.filterButton,
                        isSelected && styles.filterButtonActive
                      ]}
                      onPress={() => {
                        setSelectedTenantType(isSelected ? null : type);
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={[
                        styles.filterButtonText,
                        isSelected && styles.filterButtonTextActive
                      ]}>
                        {labels[type]}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
                {selectedTenantType && (
                  <TouchableOpacity
                    style={styles.clearFilterButton}
                    onPress={() => setSelectedTenantType(null)}
                    activeOpacity={0.7}
                  >
                    <X size={14} color="#6B7280" />
                    <Text style={styles.clearFilterButtonText}>Clear</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          {/* Summary Card */}
          {totalTenants > 0 && (
            <View style={styles.summaryCard}>
              <View style={styles.summaryItem}>
                <Users size={24} color={designTokens.colors.primary} />
                <View style={styles.summaryContent}>
                  <Text style={styles.summaryValue}>
                    {(selectedTenantType || searchQuery.trim()) ? filteredTotalTenants : totalTenants}
                  </Text>
                  <Text style={styles.summaryLabel}>
                    {(selectedTenantType || searchQuery.trim()) ? 'Filtered' : 'Total'} People
                  </Text>
                </View>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Home size={24} color={designTokens.colors.success} />
                <View style={styles.summaryContent}>
                  <Text style={styles.summaryValue}>
                    {(selectedTenantType || searchQuery.trim()) ? filteredListings.length : listingsWithTenants.length}
                  </Text>
                  <Text style={styles.summaryLabel}>Listings</Text>
                </View>
              </View>
            </View>
          )}

          {/* Listings with Tenants - Improved UI */}
          {filteredListings.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Users size={48} color="#9CA3AF" />
              </View>
              <Text style={styles.emptyTitle}>
                {(selectedTenantType || searchQuery.trim()) ? 'No Tenants Found' : 'No Active Tenants'}
              </Text>
              <Text style={styles.emptyText}>
                {searchQuery.trim() 
                  ? `No tenants match your search "${searchQuery}". Try a different search term.`
                  : selectedTenantType
                  ? `No tenants found with type "${selectedTenantType.charAt(0).toUpperCase() + selectedTenantType.slice(1)}". Try selecting a different type or clear the filter.`
                  : 'You don\'t have any active tenants yet. Once tenants book and pay for your properties, they will appear here.'}
              </Text>
              {(selectedTenantType || searchQuery.trim()) && (
                <TouchableOpacity
                  style={styles.clearSearchButtonLarge}
                  onPress={() => {
                    setSearchQuery('');
                    setSelectedTenantType(null);
                  }}
                >
                  <Text style={styles.clearSearchButtonText}>Clear Filters</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View style={styles.listingsContainer}>
              {filteredListings.map((listing) => {
                const coverPhoto = propertyCoverPhotos.get(listing.listingId);
                return (
                <View key={listing.listingId} style={styles.listingCard}>
                  {/* Property Cover Photo */}
                  {coverPhoto && coverPhoto.trim() !== '' && coverPhoto.length > 10 ? (
                    <View style={styles.coverPhotoContainer}>
                      <Image
                        source={{ uri: coverPhoto }}
                        style={styles.coverPhoto}
                        resizeMode="cover"
                        onError={(error) => {
                          console.error(`❌ Failed to load cover photo for ${listing.propertyTitle}:`, error.nativeEvent?.error);
                        }}
                      />
                      <LinearGradient
                        colors={['transparent', 'rgba(0, 0, 0, 0.3)', 'rgba(0, 0, 0, 0.7)']}
                        locations={[0, 0.5, 1]}
                        style={styles.coverPhotoGradient}
                      >
                        <View style={styles.coverPhotoOverlayContent}>
                          <Text style={styles.propertyTitleLarge} numberOfLines={2}>
                            {listing.propertyTitle}
                          </Text>
                          <View style={styles.coverPhotoInfoRow}>
                            <View style={styles.listingLocationRow}>
                              <MapPin size={14} color="#FFFFFF" />
                              <Text style={styles.coverPhotoLocation} numberOfLines={1}>
                                {listing.propertyAddress}
                              </Text>
                            </View>
                            <View style={styles.tenantCountBadge}>
                              <Users size={14} color="#10B981" />
                              <Text style={styles.tenantCountText}>{listing.tenants.length}</Text>
                            </View>
                          </View>
                        </View>
                      </LinearGradient>
                    </View>
                  ) : (
                    <View style={styles.coverPhotoPlaceholder}>
                      <Text style={[styles.propertyTitleLarge, { color: '#111827' }]} numberOfLines={2}>
                        {listing.propertyTitle}
                      </Text>
                      <View style={styles.coverPhotoInfoRow}>
                        <View style={styles.listingLocationRow}>
                          <MapPin size={14} color="#6B7280" />
                          <Text style={[styles.coverPhotoLocation, { color: '#6B7280' }]} numberOfLines={1}>
                            {listing.propertyAddress}
                          </Text>
                        </View>
                        <View style={styles.tenantCountBadge}>
                          <Users size={14} color="#10B981" />
                          <Text style={styles.tenantCountText}>{listing.tenants.length}</Text>
                        </View>
                      </View>
                    </View>
                  )}

                  {/* Capacity Info - Enhanced */}
                  <View style={styles.capacityInfo}>
                    <View style={styles.capacityItem}>
                      <Text style={styles.capacityLabel}>Capacity</Text>
                      <Text style={styles.capacityValue}>{listing.capacity}</Text>
                    </View>
                    <View style={styles.capacityDivider} />
                    <View style={styles.capacityItem}>
                      <Text style={styles.capacityLabel}>Occupied</Text>
                      <Text style={[styles.capacityValue, { color: designTokens.colors.warning }]}>
                        {listing.occupiedSlots}
                      </Text>
                    </View>
                    <View style={styles.capacityDivider} />
                    <View style={styles.capacityItem}>
                      <Text style={styles.capacityLabel}>Available</Text>
                      <Text style={[styles.capacityValue, { color: designTokens.colors.success }]}>
                        {listing.availableSlots}
                      </Text>
                    </View>
                  </View>

                  {/* Tenants List */}
                  <View style={styles.tenantsList}>
                    {listing.tenants.map((tenant) => (
                      <View key={tenant.bookingId} style={styles.tenantCard}>
                        <View style={styles.tenantHeader}>
                          <TouchableOpacity
                            style={styles.tenantHeaderLeft}
                            onPress={() => handleViewTenantInfo(tenant)}
                            activeOpacity={0.7}
                          >
                            <TouchableOpacity
                              onPress={() => handleViewTenantInfo(tenant)}
                              activeOpacity={0.7}
                            >
                              {(() => {
                                const avatar = tenantAvatars.get(tenant.tenantId);
                                if (avatar && avatar.trim() !== '' && avatar.length > 10) {
                                  return (
                                    <Image
                                      source={{ uri: avatar }}
                                      style={styles.tenantAvatarImage}
                                      resizeMode="cover"
                                      onError={(error) => {
                                        console.error(`❌ Failed to load tenant avatar for ${tenant.tenantName}:`, error.nativeEvent?.error);
                                      }}
                                    />
                                  );
                                } else {
                                  return (
                                    <View style={styles.tenantAvatar}>
                                      <Text style={styles.tenantAvatarText}>
                                        {tenant.tenantName.charAt(0).toUpperCase()}
                                      </Text>
                                    </View>
                                  );
                                }
                              })()}
                            </TouchableOpacity>
                            <View style={styles.tenantNameContainer}>
                              <TouchableOpacity
                                onPress={() => handleViewTenantInfo(tenant)}
                                activeOpacity={0.7}
                              >
                                <Text style={styles.tenantName} numberOfLines={1}>
                                  {tenant.tenantName}
                                </Text>
                              </TouchableOpacity>
                              <View style={styles.slotBadge}>
                                <Text style={styles.slotBadgeText}>Slot #{tenant.slotNumber}</Text>
                              </View>
                              {tenant.status && tenant.status.includes('terminating') && (
                                <View style={{
                                  backgroundColor: designTokens.colors.warningLight,
                                  paddingHorizontal: 8,
                                  paddingVertical: 4,
                                  borderRadius: 12,
                                  borderWidth: 1,
                                  borderColor: designTokens.colors.warning,
                                  marginLeft: 8,
                                }}>
                                  <Text style={{
                                    fontSize: 10,
                                    fontWeight: '600',
                                    color: designTokens.colors.warning,
                                  }}>
                                    {tenant.status}
                                  </Text>
                                </View>
                              )}
                            </View>
                          </TouchableOpacity>
                          <View style={styles.tenantHeaderRight}>
                            <TouchableOpacity
                              style={styles.messageButton}
                              onPress={async () => {
                                if (!user?.id) return;
                                
                                try {
                                  // Get owner's display name
                                  let ownerDisplayName = 'Property Owner';
                                  try {
                                    const ownerProfile = await db.get('owner_profiles', user.id);
                                    ownerDisplayName = (ownerProfile as any)?.businessName || (ownerProfile as any)?.name || user.name || 'Property Owner';
                                  } catch (error) {
                                    ownerDisplayName = user.name || 'Property Owner';
                                  }

                                  // Create or find conversation
                                  const conversationId = await createOrFindConversation({
                                    ownerId: user.id,
                                    tenantId: tenant.tenantId,
                                    ownerName: ownerDisplayName,
                                    tenantName: tenant.tenantName,
                                    propertyId: tenant.propertyId,
                                    propertyTitle: tenant.propertyTitle
                                  });

                                  // Navigate to chat room
                                  router.push({
                                    pathname: `/(owner)/chat-room/${conversationId}` as any,
                                    params: {
                                      conversationId: conversationId,
                                      tenantName: tenant.tenantName,
                                      propertyTitle: tenant.propertyTitle
                                    }
                                  } as any);
                                } catch (error) {
                                  console.error('❌ Error starting conversation:', error);
                                  showAlert('Error', 'Failed to start conversation. Please try again.');
                                }
                              }}
                              activeOpacity={0.7}
                            >
                              <MessageSquare size={16} color="#3B82F6" />
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[
                                styles.removeButton,
                                removingTenantId === tenant.bookingId && styles.removeButtonDisabled
                              ]}
                              onPress={() => handleRemoveTenant(tenant)}
                              disabled={removingTenantId === tenant.bookingId}
                            >
                              {removingTenantId === tenant.bookingId ? (
                                <ActivityIndicator size="small" color="#FFFFFF" />
                              ) : (
                                <Trash2 size={16} color="#FFFFFF" />
                              )}
                            </TouchableOpacity>
                          </View>
                        </View>

                        <View style={styles.tenantInfo}>
                          {tenant.tenantPhone && (
                            <View style={styles.tenantInfoRow}>
                              <Phone size={14} color="#6B7280" />
                              <Text style={styles.tenantInfoText} numberOfLines={1}>
                                {tenant.tenantPhone}
                              </Text>
                            </View>
                          )}

                          {tenant.tenantEmail && (
                            <View style={styles.tenantInfoRow}>
                              <Mail size={14} color="#6B7280" />
                              <Text style={styles.tenantInfoText} numberOfLines={1}>
                                {tenant.tenantEmail}
                              </Text>
                            </View>
                          )}

                          <View style={styles.tenantInfoRow}>
                            <Calendar size={14} color="#6B7280" />
                            <Text style={styles.tenantInfoText}>
                              Started: {formatDate(tenant.startDate)}
                            </Text>
                          </View>

                          <View style={styles.tenantInfoRow}>
                            <Text style={styles.tenantInfoLabel}>Monthly Rent:</Text>
                            <Text style={styles.tenantRent}>
                              ₱{tenant.monthlyRent.toLocaleString()}
                            </Text>
                          </View>

                          {/* Payment Status */}
                          {(() => {
                            const payments = tenantPayments.get(tenant.bookingId) || [];
                            const now = new Date();
                            // Filter out advance payments (future months) and rejected payments from pending count
                            // Advance payments should only show when they're awaiting confirmation, not as pending
                            // Rejected payments should not show as pending
                            const pendingPayments = payments.filter(p => {
                              // Don't count payments that are marked as rejected (check rejectedAt field)
                              // Note: Rejected payments now have status 'pending' or 'overdue' but are marked by rejectedAt
                              if ((p as any).rejectedAt && p.status !== 'paid') return false;
                              if (p.status === 'pending' || p.status === 'overdue') {
                                // Check if this is an advance payment (future month)
                                const paymentMonth = new Date(p.paymentMonth + '-01');
                                const isAdvancePayment = paymentMonth > now;
                                // Don't count advance payments as pending - they should only show when paid/awaiting confirmation
                                return !isAdvancePayment;
                              }
                              return false;
                            });
                            const paidPayments = payments.filter(p => p.status === 'paid');
                            const overduePayments = payments.filter(p => p.status === 'overdue');
                            // Check for rejectedAt field instead of status, since rejected payments now have status 'pending' or 'overdue'
                            const rejectedPayments = payments.filter(p => (p as any).rejectedAt && p.status !== 'paid');
                            const pendingConfirmationPayments = payments.filter(p => p.status === 'pending_owner_confirmation');
                            
                            if (payments.length === 0) {
                              return null; // No payments yet
                            }
                            
                            return (
                              <View style={styles.paymentStatusContainer}>
                                <View style={styles.paymentStatusRow}>
                                  <Text style={styles.paymentStatusLabel}>Payment Status:</Text>
                                  {overduePayments.length > 0 ? (
                                    <View style={styles.paymentBadgeOverdue}>
                                      <XCircle size={14} color="#EF4444" />
                                      <Text style={styles.paymentBadgeTextOverdue}>
                                        {overduePayments.length} Overdue
                                      </Text>
                                    </View>
                                  ) : pendingConfirmationPayments.length > 0 ? (
                                    <View style={styles.paymentBadgePendingConfirmation}>
                                      <AlertCircle size={14} color="#F59E0B" />
                                      <Text style={styles.paymentBadgeTextPendingConfirmation}>
                                        {pendingConfirmationPayments.length} Awaiting Confirmation
                                      </Text>
                                    </View>
                                  ) : pendingPayments.length > 0 ? (
                                    <View style={styles.paymentBadgePending}>
                                      <Clock size={14} color="#F59E0B" />
                                      <Text style={styles.paymentBadgeTextPending}>
                                        {pendingPayments.length} Pending
                                      </Text>
                                    </View>
                                  ) : paidPayments.length > 0 ? (
                                    <View style={styles.paymentBadgePaid}>
                                      <CheckCircle size={14} color="#10B981" />
                                      <Text style={styles.paymentBadgeTextPaid}>
                                        {paidPayments.length} Paid
                                      </Text>
                                    </View>
                                  ) : null}
                                </View>
                                
                                {/* Payment Summary */}
                                {paidPayments.length > 0 && (
                                  <View style={styles.paymentSummaryRow}>
                                    <Text style={styles.paymentSummaryLabel}>Total Received:</Text>
                                    <Text style={styles.paymentSummaryValue}>
                                      ₱{paidPayments.reduce((sum, p) => sum + p.totalAmount, 0).toLocaleString()}
                                    </Text>
                                  </View>
                                )}
                                
                                {pendingPayments.length > 0 && (
                                  <View style={styles.paymentSummaryRow}>
                                    <Text style={styles.paymentSummaryLabel}>Pending Amount:</Text>
                                    <Text style={[styles.paymentSummaryValue, { color: '#F59E0B' }]}>
                                      ₱{pendingPayments.reduce((sum, p) => sum + p.totalAmount, 0).toLocaleString()}
                                    </Text>
                                  </View>
                                )}

                                {/* Payment Action Buttons - Show for payments awaiting confirmation */}
                                {pendingConfirmationPayments.length > 0 && (
                                  <View style={styles.paymentActionsContainer}>
                                    <Text style={styles.paymentActionsTitle}>
                                      Payments Awaiting Your Confirmation:
                                    </Text>
                                    {pendingConfirmationPayments.map((payment) => (
                                      <View key={payment.id} style={styles.paymentActionCard}>
                                        <View style={styles.paymentActionInfo}>
                                          <Text style={styles.paymentActionMonth}>
                                            {new Date(payment.paymentMonth + '-01').toLocaleDateString('en-US', { 
                                              year: 'numeric', 
                                              month: 'long' 
                                            })}
                                          </Text>
                                          <Text style={styles.paymentActionAmount}>
                                            ₱{payment.totalAmount.toLocaleString()}
                                          </Text>
                                        </View>
                                        <View style={styles.paymentActionButtons}>
                                          <TouchableOpacity
                                            style={[styles.confirmPaymentButton, processingPayment === payment.id && styles.paymentButtonDisabled]}
                                            onPress={() => handleConfirmPayment(payment.id)}
                                            disabled={processingPayment === payment.id}
                                            activeOpacity={0.7}
                                          >
                                            {processingPayment === payment.id ? (
                                              <ActivityIndicator size="small" color="#FFFFFF" />
                                            ) : (
                                              <>
                                                <CheckCircle size={16} color="#FFFFFF" />
                                                <Text style={styles.confirmPaymentButtonText}>Confirm</Text>
                                              </>
                                            )}
                                          </TouchableOpacity>
                                          <TouchableOpacity
                                            style={[styles.rejectPaymentButton, processingPayment === payment.id && styles.paymentButtonDisabled]}
                                            onPress={() => handleRejectPayment(payment.id)}
                                            disabled={processingPayment === payment.id}
                                            activeOpacity={0.7}
                                          >
                                            {processingPayment === payment.id ? (
                                              <ActivityIndicator size="small" color="#FFFFFF" />
                                            ) : (
                                              <>
                                                <XCircle size={16} color="#FFFFFF" />
                                                <Text style={styles.rejectPaymentButtonText}>Reject</Text>
                                              </>
                                            )}
                                          </TouchableOpacity>
                                        </View>
                                      </View>
                                    ))}
                                  </View>
                                )}

                                {/* Payment History Button */}
                                {payments.length > 0 && (
                                  <TouchableOpacity
                                    style={styles.viewHistoryButton}
                                    onPress={async () => {
                                      // Get booking record for receipt generation
                                      let booking: BookingRecord | null = null;
                                      try {
                                        booking = await db.get<BookingRecord>('bookings', tenant.bookingId);
                                      } catch (error) {
                                        console.error('Error loading booking:', error);
                                      }
                                      
                                      setSelectedTenantForHistory({
                                        tenant,
                                        payments: payments.sort((a, b) => 
                                          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                                        ),
                                        booking,
                                      });
                                      setPaymentHistoryModalVisible(true);
                                    }}
                                    activeOpacity={0.7}
                                  >
                                    <History size={16} color="#3B82F6" />
                                    <Text style={styles.viewHistoryButtonText}>
                                      View Payment History ({payments.length})
                                    </Text>
                                  </TouchableOpacity>
                                )}
                              </View>
                            );
                          })()}
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
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
          tenantAvatar={selectedTenant.avatar || tenantAvatars.get(selectedTenant.id)}
          onClose={closeModal}
        />
      )}

      {/* Payment History Modal */}
      <Modal
        visible={paymentHistoryModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          setPaymentHistoryModalVisible(false);
          setSelectedTenantForHistory(null);
        }}
      >
        <View style={styles.historyModalContainer}>
          <View style={styles.historyModalHeader}>
            <View style={styles.historyModalHeaderLeft}>
              <History size={24} color={designTokens.colors.primary} />
              <View>
                <Text style={styles.historyModalTitle}>Payment History</Text>
                {selectedTenantForHistory && (
                  <Text style={styles.historyModalSubtitle}>
                    {selectedTenantForHistory.tenant.tenantName}
                  </Text>
                )}
              </View>
            </View>
            <TouchableOpacity
              onPress={() => {
                setPaymentHistoryModalVisible(false);
                setSelectedTenantForHistory(null);
              }}
              style={styles.historyModalCloseButton}
            >
              <X size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {selectedTenantForHistory && (
            <ScrollView style={styles.historyModalContent} showsVerticalScrollIndicator={false}>
              {selectedTenantForHistory.payments.length === 0 ? (
                <View style={styles.historyEmptyState}>
                  <FileText size={48} color="#9CA3AF" />
                  <Text style={styles.historyEmptyTitle}>No Payment History</Text>
                  <Text style={styles.historyEmptyText}>
                    This tenant hasn't made any payments yet.
                  </Text>
                </View>
              ) : (
                selectedTenantForHistory.payments.map((payment) => {
                  const paymentDate = payment.paidDate 
                    ? new Date(payment.paidDate) 
                    : new Date(payment.createdAt);
                  const dueDate = new Date(payment.dueDate);
                  
                  return (
                    <View key={payment.id} style={styles.paymentHistoryCard}>
                      <View style={styles.paymentHistoryHeader}>
                        <View style={styles.paymentHistoryHeaderLeft}>
                          {(() => {
                            const wasRejected = (payment as any).rejectedAt && payment.status !== 'paid';
                            return (
                              <View style={[
                                styles.paymentHistoryStatusBadge,
                                payment.status === 'paid' && styles.paymentHistoryStatusBadgePaid,
                                payment.status === 'pending' && styles.paymentHistoryStatusBadgePending,
                                payment.status === 'overdue' && styles.paymentHistoryStatusBadgeOverdue,
                                payment.status === 'pending_owner_confirmation' && styles.paymentHistoryStatusBadgePending,
                                (payment.status === 'rejected' || wasRejected) && styles.paymentHistoryStatusBadgeRejected,
                              ]}>
                                {payment.status === 'paid' && <CheckCircle size={14} color="#10B981" />}
                                {payment.status === 'pending' && !wasRejected && <Clock size={14} color="#F59E0B" />}
                                {payment.status === 'overdue' && !wasRejected && <XCircle size={14} color="#EF4444" />}
                                {payment.status === 'pending_owner_confirmation' && <AlertCircle size={14} color="#F59E0B" />}
                                {(payment.status === 'rejected' || wasRejected) && <XCircle size={14} color="#EF4444" />}
                                <Text style={[
                                  styles.paymentHistoryStatusText,
                                  payment.status === 'paid' && styles.paymentHistoryStatusTextPaid,
                                  payment.status === 'pending' && !wasRejected && styles.paymentHistoryStatusTextPending,
                                  payment.status === 'overdue' && !wasRejected && styles.paymentHistoryStatusTextOverdue,
                                  payment.status === 'pending_owner_confirmation' && styles.paymentHistoryStatusTextPending,
                                  (payment.status === 'rejected' || wasRejected) && styles.paymentHistoryStatusTextRejected,
                                ]}>
                                  {payment.status === 'pending_owner_confirmation' ? 'Pending Confirmation' : 
                                   (payment.status === 'rejected' || wasRejected) ? 'Rejected' :
                                   payment.status.toUpperCase()}
                                </Text>
                              </View>
                            );
                          })()}
                          <Text style={styles.paymentHistoryAmount}>
                            ₱{payment.totalAmount.toLocaleString()}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.paymentHistoryDetails}>
                        <View style={styles.paymentHistoryDetailRow}>
                          <Text style={styles.paymentHistoryDetailLabel}>Payment Month:</Text>
                          <Text style={styles.paymentHistoryDetailValue}>
                            {new Date(payment.paymentMonth + '-01').toLocaleDateString('en-US', { 
                              year: 'numeric', 
                              month: 'long' 
                            })}
                          </Text>
                        </View>
                        <View style={styles.paymentHistoryDetailRow}>
                          <Text style={styles.paymentHistoryDetailLabel}>Due Date:</Text>
                          <Text style={styles.paymentHistoryDetailValue}>
                            {dueDate.toLocaleDateString('en-US', { 
                              year: 'numeric', 
                              month: 'short', 
                              day: 'numeric' 
                            })}
                          </Text>
                        </View>
                        {payment.paidDate && (
                          <View style={styles.paymentHistoryDetailRow}>
                            <Text style={styles.paymentHistoryDetailLabel}>Paid Date:</Text>
                            <Text style={styles.paymentHistoryDetailValue}>
                              {paymentDate.toLocaleDateString('en-US', { 
                                year: 'numeric', 
                                month: 'short', 
                                day: 'numeric' 
                              })}
                            </Text>
                          </View>
                        )}
                        {payment.paymentMethod && (
                          <View style={styles.paymentHistoryDetailRow}>
                            <Text style={styles.paymentHistoryDetailLabel}>Payment Method:</Text>
                            <Text style={styles.paymentHistoryDetailValue}>
                              {payment.paymentMethod}
                            </Text>
                          </View>
                        )}
                        <View style={styles.paymentHistoryReceiptContainer}>
                          <Text style={styles.paymentHistoryDetailLabel}>Receipt Number:</Text>
                          <Text style={styles.paymentHistoryDetailValueReceipt} selectable>
                            {payment.receiptNumber}
                          </Text>
                        </View>
                        {payment.lateFee > 0 && (
                          <View style={styles.paymentHistoryDetailRow}>
                            <Text style={styles.paymentHistoryDetailLabel}>Late Fee:</Text>
                            <Text style={[styles.paymentHistoryDetailValue, { color: '#EF4444' }]}>
                              ₱{payment.lateFee.toLocaleString()}
                            </Text>
                          </View>
                        )}
                      </View>

                      {/* Restore/Delete Buttons for Rejected Payments */}
                      {((payment as any).rejectedAt && payment.status !== 'paid') && (
                        <View style={styles.paymentHistoryActionsContainer}>
                          <Text style={styles.paymentHistoryActionsTitle}>
                            ⚠️ This payment was previously rejected
                          </Text>
                          <Text style={styles.paymentHistoryRestoreNote}>
                            ⚠️ Only restore if you have verified in your account that you actually received this payment. Do not restore scam or fake payments.
                          </Text>
                          <View style={styles.paymentHistoryActionButtons}>
                            <TouchableOpacity
                              style={[styles.restorePaymentButton, processingPayment === payment.id && styles.paymentButtonDisabled]}
                              onPress={async () => {
                                if (!user?.id) return;
                                
                                Alert.alert(
                                  '⚠️ Restore Rejected Payment',
                                  `IMPORTANT: Only restore this payment if you have VERIFIED that you actually received it in your account.\n\n` +
                                  `Payment Details:\n` +
                                  `• Amount: ₱${payment.totalAmount.toLocaleString()}\n` +
                                  `• Method: ${payment.originalPaymentMethod || payment.paymentMethod || 'Unknown'}\n` +
                                  `• Receipt: ${payment.receiptNumber}\n\n` +
                                  `⚠️ WARNING:\n` +
                                  `• Do NOT restore if this was a scam or fake payment\n` +
                                  `• Do NOT restore if you did NOT receive the payment\n` +
                                  `• Only restore if you accidentally rejected a legitimate payment\n\n` +
                                  `This will restore the payment to "awaiting confirmation" status, and you'll need to verify it again before confirming.\n\n` +
                                  `Have you verified in your account that you actually received this payment?`,
                                  [
                                    { text: 'Cancel', style: 'cancel' },
                                    {
                                      text: 'No, I Did NOT Receive It',
                                      style: 'destructive',
                                      onPress: () => {
                                        showAlert('Info', 'Payment will remain rejected. If you need to restore it later, you can do so from the payment history.');
                                      },
                                    },
                                    {
                                      text: 'Yes, I Received It - Restore',
                                      onPress: async () => {
                                        try {
                                          setProcessingPayment(payment.id);
                                          const result = await restoreRejectedPayment(payment.id, user.id, true);
                                          
                                          if (result.success) {
                                            showAlert('Success', 'Payment restored successfully. Tenant has been notified.');
                                            
                                            // Update pending payments count
                                            await refreshPendingPayments();
                                            
                                            // Reload tenants to refresh payment data
                                            await loadTenants();
                                            
                                            // If payment history modal is open, refresh the selected tenant's payments
                                            if (selectedTenantForHistory) {
                                              try {
                                                const updatedPayments = await getRentPaymentsByBooking(selectedTenantForHistory.tenant.bookingId);
                                                const booking = await db.get<BookingRecord>('bookings', selectedTenantForHistory.tenant.bookingId);
                                                setSelectedTenantForHistory({
                                                  ...selectedTenantForHistory,
                                                  payments: updatedPayments.sort((a, b) => 
                                                    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                                                  ),
                                                  booking: booking || selectedTenantForHistory.booking,
                                                });
                                              } catch (error) {
                                                console.error('Error refreshing payment history:', error);
                                              }
                                            }
                                          } else {
                                            showAlert('Error', result.error || 'Failed to restore payment');
                                          }
                                        } catch (error) {
                                          console.error('Error restoring payment:', error);
                                          showAlert('Error', 'Failed to restore payment');
                                        } finally {
                                          setProcessingPayment(null);
                                        }
                                      },
                                    },
                                  ]
                                );
                              }}
                              disabled={processingPayment === payment.id}
                              activeOpacity={0.7}
                            >
                              {processingPayment === payment.id ? (
                                <ActivityIndicator size="small" color="#FFFFFF" />
                              ) : (
                                <>
                                  <CheckCircle size={16} color="#FFFFFF" />
                                  <Text style={styles.restorePaymentButtonText}>Restore</Text>
                                </>
                              )}
                            </TouchableOpacity>
                            
                            <TouchableOpacity
                              style={[styles.deletePaymentButton, processingPayment === payment.id && styles.paymentButtonDisabled]}
                              onPress={async () => {
                                if (!user?.id) return;
                                
                                Alert.alert(
                                  '🗑️ Delete Rejected Payment',
                                  `⚠️ PERMANENT ACTION - This cannot be undone!\n\n` +
                                  `Payment Details:\n` +
                                  `• Amount: ₱${payment.totalAmount.toLocaleString()}\n` +
                                  `• Method: ${payment.originalPaymentMethod || payment.paymentMethod || 'Unknown'}\n` +
                                  `• Receipt: ${payment.receiptNumber}\n\n` +
                                  `⚠️ WARNING:\n` +
                                  `• This will PERMANENTLY DELETE the payment from the system\n` +
                                  `• The tenant will be notified of the deletion\n` +
                                  `• This action CANNOT be undone\n\n` +
                                  `Only delete if this was a scam or fake payment that should be completely removed.\n\n` +
                                  `Are you absolutely sure you want to permanently delete this payment?`,
                                  [
                                    { text: 'Cancel', style: 'cancel' },
                                    {
                                      text: 'Yes, Delete Permanently',
                                      style: 'destructive',
                                      onPress: async () => {
                                        try {
                                          setProcessingPayment(payment.id);
                                          const result = await deleteRejectedPayment(
                                            payment.id, 
                                            user.id, 
                                            'Payment was a scam/fake payment - permanently deleted by owner'
                                          );
                                          
                                          if (result.success) {
                                            showAlert('Success', 'Payment permanently deleted. Tenant has been notified.');
                                            
                                            // Update pending payments count
                                            await refreshPendingPayments();
                                            
                                            // Reload tenants to refresh payment data
                                            await loadTenants();
                                            
                                            // If payment history modal is open, refresh the selected tenant's payments
                                            if (selectedTenantForHistory) {
                                              try {
                                                const updatedPayments = await getRentPaymentsByBooking(selectedTenantForHistory.tenant.bookingId);
                                                const booking = await db.get<BookingRecord>('bookings', selectedTenantForHistory.tenant.bookingId);
                                                setSelectedTenantForHistory({
                                                  ...selectedTenantForHistory,
                                                  payments: updatedPayments.sort((a, b) => 
                                                    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                                                  ),
                                                  booking: booking || selectedTenantForHistory.booking,
                                                });
                                              } catch (error) {
                                                console.error('Error refreshing payment history:', error);
                                              }
                                            }
                                            
                                            // Close modal if payment was deleted
                                            setPaymentHistoryModalVisible(false);
                                            setSelectedTenantForHistory(null);
                                          } else {
                                            showAlert('Error', result.error || 'Failed to delete payment');
                                          }
                                        } catch (error) {
                                          console.error('Error deleting payment:', error);
                                          showAlert('Error', 'Failed to delete payment');
                                        } finally {
                                          setProcessingPayment(null);
                                        }
                                      },
                                    },
                                  ]
                                );
                              }}
                              disabled={processingPayment === payment.id}
                              activeOpacity={0.7}
                            >
                              {processingPayment === payment.id ? (
                                <ActivityIndicator size="small" color="#FFFFFF" />
                              ) : (
                                <>
                                  <Trash2 size={16} color="#FFFFFF" />
                                  <Text style={styles.deletePaymentButtonText}>Delete</Text>
                                </>
                              )}
                            </TouchableOpacity>
                          </View>
                        </View>
                      )}

                      {/* Action Buttons for Pending Payments */}
                      {(payment.status === 'pending' || payment.status === 'pending_owner_confirmation') && (
                        <View style={styles.paymentHistoryActionsContainer}>
                          <Text style={styles.paymentHistoryActionsTitle}>
                            {payment.status === 'pending_owner_confirmation' 
                              ? 'Payment Awaiting Your Confirmation' 
                              : 'Mark Payment Status'}
                          </Text>
                          <View style={styles.paymentHistoryActionButtons}>
                            <TouchableOpacity
                              style={[styles.confirmPaymentButton, processingPayment === payment.id && styles.paymentButtonDisabled]}
                              onPress={() => handleConfirmPayment(payment.id)}
                              disabled={processingPayment === payment.id}
                              activeOpacity={0.7}
                            >
                              {processingPayment === payment.id ? (
                                <ActivityIndicator size="small" color="#FFFFFF" />
                              ) : (
                                <>
                                  <CheckCircle size={16} color="#FFFFFF" />
                                  <Text style={styles.confirmPaymentButtonText}>Mark as Paid</Text>
                                </>
                              )}
                            </TouchableOpacity>
                            {payment.status === 'pending_owner_confirmation' && (
                              <TouchableOpacity
                                style={[styles.rejectPaymentButton, processingPayment === payment.id && styles.paymentButtonDisabled]}
                                onPress={() => handleRejectPayment(payment.id)}
                                disabled={processingPayment === payment.id}
                                activeOpacity={0.7}
                              >
                                {processingPayment === payment.id ? (
                                  <ActivityIndicator size="small" color="#FFFFFF" />
                                ) : (
                                  <>
                                    <XCircle size={16} color="#FFFFFF" />
                                    <Text style={styles.rejectPaymentButtonText}>Reject</Text>
                                  </>
                                )}
                              </TouchableOpacity>
                            )}
                          </View>
                        </View>
                      )}

                      {/* Download Receipt Button for Paid Payments */}
                      {payment.status === 'paid' && selectedTenantForHistory.booking && (
                        <TouchableOpacity
                          style={[styles.downloadReceiptButton, isSharing && { opacity: 0.5 }]}
                          disabled={isSharing}
                          onPress={async () => {
                            // Prevent multiple simultaneous share requests
                            if (isSharing) {
                              return;
                            }

                            try {
                              setIsSharing(true);
                              const receipt = generatePaymentReceipt(payment, selectedTenantForHistory.booking!);
                              
                              // Use legacy API to avoid deprecation warnings and URI issues
                              const FileSystemModule = await import('expo-file-system/legacy');
                              
                              // Handle different import structures
                              const FileSystem = (FileSystemModule as any).default || FileSystemModule;
                              
                              // Create file name
                              const fileName = `Receipt_${payment.receiptNumber}_${payment.paymentMonth}.txt`;
                              const documentDir = FileSystem.documentDirectory || FileSystem.cacheDirectory || '';
                              const fullFileUri = documentDir + fileName;
                              
                              // Write receipt to file using legacy API (stable and works)
                              await FileSystem.writeAsStringAsync(fullFileUri, receipt, {
                                encoding: FileSystem.EncodingType?.UTF8 || 'utf8',
                              });
                              
                              // Share/download the file
                              try {
                                const SharingModule = await import('expo-sharing');
                                const Sharing = (SharingModule as any).default || SharingModule;
                                
                                // Check if Sharing methods are available
                                if (Sharing && Sharing.isAvailableAsync && await Sharing.isAvailableAsync()) {
                                  await Sharing.shareAsync(fullFileUri, {
                                    mimeType: 'text/plain',
                                    dialogTitle: 'Download Payment Receipt',
                                  });
                                } else {
                                  showAlert('Info', 'Receipt saved to: ' + fullFileUri);
                                }
                              } catch (sharingError: any) {
                                // Handle specific error: another share request is being processed
                                if (sharingError?.message?.includes('Another share request is being processed')) {
                                  showAlert('Please wait', 'A download is already in progress. Please wait for it to complete.');
                                } else {
                                  // If sharing is not available, just show info
                                  console.log('Sharing not available:', sharingError);
                                  showAlert('Info', 'Receipt saved to: ' + fullFileUri);
                                }
                              }
                            } catch (error: any) {
                              console.error('Error downloading payment history:', error);
                              // Handle specific error: another share request is being processed
                              if (error?.message?.includes('Another share request is being processed')) {
                                showAlert('Please wait', 'A download is already in progress. Please wait for it to complete.');
                              } else {
                                showAlert('Error', 'Failed to download receipt. Please try again.');
                              }
                            } finally {
                              setIsSharing(false);
                            }
                          }}
                          activeOpacity={0.7}
                        >
                          <Download size={16} color={isSharing ? "#9CA3AF" : "#3B82F6"} />
                          <Text style={[styles.downloadReceiptButtonText, isSharing && { color: "#9CA3AF" }]}>
                            {isSharing ? 'Downloading...' : 'Download Receipt'}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })
              )}
            </ScrollView>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  pageContainer: {
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  headerLeft: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    gap: 12,
  },
  filterContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  filterButtonsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterButtonActive: {
    backgroundColor: designTokens.colors.primary,
    borderColor: designTokens.colors.primary,
  },
  filterButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
  },
  clearFilterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    gap: 4,
  },
  clearFilterButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
    padding: 0,
  },
  clearSearchButton: {
    padding: 4,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  clearSearchButtonLarge: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: designTokens.colors.primary,
    borderRadius: 12,
  },
  clearSearchButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
  },
  pageSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  summaryCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  summaryItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  summaryContent: {
    flex: 1,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 2,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  summaryDivider: {
    width: 1,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 16,
  },
  listingsContainer: {
    gap: 16,
  },
  listingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  coverPhotoContainer: {
    width: '100%',
    height: 200,
    position: 'relative',
  },
  coverPhoto: {
    width: '100%',
    height: '100%',
  },
  coverPhotoGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    top: 0,
  },
  coverPhotoOverlayContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingTop: 20,
  },
  coverPhotoPlaceholder: {
    width: '100%',
    height: 200,
    backgroundColor: '#F0FDF4',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  propertyTitleLarge: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  coverPhotoInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  coverPhotoLocation: {
    fontSize: 13,
    color: '#FFFFFF',
    flex: 1,
    marginLeft: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  capacityInfo: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 14,
    marginBottom: 16,
    marginHorizontal: 20,
    backgroundColor: '#F0F9FF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  listingHeaderContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  listingIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: designTokens.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  listingTitleContainer: {
    flex: 1,
  },
  listingTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 6,
  },
  listingLocationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  listingLocation: {
    fontSize: 13,
    color: '#6B7280',
    flex: 1,
    lineHeight: 18,
  },
  tenantCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#10B981',
    gap: 6,
  },
  tenantCountText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#10B981',
  },
  capacityItem: {
    alignItems: 'center',
  },
  capacityLabel: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
    marginBottom: 4,
  },
  capacityValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  capacityDivider: {
    width: 1,
    backgroundColor: '#E5E7EB',
  },
  tenantsList: {
    gap: 12,
  },
  tenantCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 12,
  },
  tenantHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  tenantHeaderLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  tenantHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  messageButton: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  tenantAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: designTokens.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tenantAvatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  tenantAvatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  tenantNameContainer: {
    flex: 1,
  },
  tenantName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  slotBadge: {
    alignSelf: 'flex-start',
    backgroundColor: designTokens.colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  slotBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  removeButton: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  removeButtonDisabled: {
    opacity: 0.6,
  },
  tenantInfo: {
    gap: 8,
  },
  tenantInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tenantInfoLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tenantInfoLabel: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  tenantInfoText: {
    fontSize: 13,
    color: '#374151',
    flex: 1,
  },
  tenantRent: {
    fontSize: 14,
    fontWeight: '700',
    color: designTokens.colors.success,
  },
  paymentStatusContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  paymentStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  paymentStatusLabel: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  paymentBadgePaid: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#10B981',
    gap: 4,
  },
  paymentBadgePending: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F59E0B',
    gap: 4,
  },
  paymentBadgeOverdue: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EF4444',
    gap: 4,
  },
  paymentBadgeTextPaid: {
    fontSize: 11,
    fontWeight: '600',
    color: '#10B981',
  },
  paymentBadgeTextPending: {
    fontSize: 11,
    fontWeight: '600',
    color: '#F59E0B',
  },
  paymentBadgeTextOverdue: {
    fontSize: 11,
    fontWeight: '600',
    color: '#EF4444',
  },
  paymentSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  paymentSummaryLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  paymentSummaryValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10B981',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  removeButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 4,
  },
  viewHistoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DBEAFE',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  viewHistoryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
  },
  paymentBadgePendingConfirmation: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F59E0B',
    gap: 4,
  },
  paymentBadgeTextPendingConfirmation: {
    fontSize: 11,
    fontWeight: '600',
    color: '#F59E0B',
  },
  paymentActionsContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#FFFBEB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  paymentActionsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#92400E',
    marginBottom: 8,
  },
  paymentActionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  paymentActionInfo: {
    marginBottom: 10,
  },
  paymentActionMonth: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  paymentActionAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  paymentActionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  confirmPaymentButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6,
  },
  confirmPaymentButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  rejectPaymentButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EF4444',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6,
  },
  rejectPaymentButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  paymentButtonDisabled: {
    opacity: 0.6,
  },
  historyModalContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  historyModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  historyModalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  historyModalTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
  },
  historyModalSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  historyModalCloseButton: {
    padding: 4,
  },
  historyModalContent: {
    flex: 1,
    padding: 20,
  },
  historyEmptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  historyEmptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  historyEmptyText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  paymentHistoryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  paymentHistoryHeader: {
    marginBottom: 12,
  },
  paymentHistoryHeaderLeft: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paymentHistoryStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  paymentHistoryStatusBadgePaid: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#10B981',
  },
  paymentHistoryStatusBadgePending: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  paymentHistoryStatusBadgeOverdue: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  paymentHistoryStatusBadgeRejected: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  paymentHistoryStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  paymentHistoryStatusTextPaid: {
    color: '#10B981',
  },
  paymentHistoryStatusTextPending: {
    color: '#F59E0B',
  },
  paymentHistoryStatusTextOverdue: {
    color: '#EF4444',
  },
  paymentHistoryStatusTextRejected: {
    color: '#EF4444',
  },
  paymentHistoryAmount: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
  },
  paymentHistoryDetails: {
    gap: 8,
    marginBottom: 12,
  },
  paymentHistoryDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  paymentHistoryDetailLabel: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
    flexShrink: 0,
  },
  paymentHistoryDetailValue: {
    fontSize: 13,
    color: '#111827',
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  paymentHistoryDetailValueReceipt: {
    fontSize: 13,
    color: '#111827',
    fontWeight: '600',
    marginTop: 4,
    flexWrap: 'wrap',
  },
  paymentHistoryReceiptContainer: {
    marginTop: 4,
    width: '100%',
  },
  downloadReceiptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DBEAFE',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 8,
    borderWidth: 1,
    borderColor: '#3B82F6',
    marginTop: 8,
  },
  downloadReceiptButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
  },
  paymentHistoryActionsContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#FFFBEB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  paymentHistoryActionsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#92400E',
    marginBottom: 10,
  },
  paymentHistoryActionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  paymentHistoryRestoreNote: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 12,
    lineHeight: 16,
  },
  restorePaymentButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6,
  },
  restorePaymentButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  deletePaymentButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DC2626',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6,
  },
  deletePaymentButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  pendingPaymentNotification: {
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FCD34D',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pendingPaymentNotificationContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  pendingPaymentNotificationText: {
    fontSize: 13,
    color: '#92400E',
    fontWeight: '600',
    flex: 1,
  },
});

