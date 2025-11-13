import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  RefreshControl,
  ActivityIndicator
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { 
  Users, 
  Home, 
  User, 
  MapPin, 
  Calendar,
  Phone,
  Mail,
  X,
  ChevronRight,
  Trash2
} from 'lucide-react-native';
import { getTenantsByOwner, type ListingWithTenants, type TenantInfo } from '../../utils/tenant-management';
import { deleteBookingByOwner } from '../../utils/booking';
import { showAlert } from '../../utils/alert';
import TenantInfoModal from '../../components/TenantInfoModal';
import { designTokens } from '../../styles/owner-dashboard-styles';
import { addCustomEventListener } from '../../utils/custom-events';

export default function TenantsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [listingsWithTenants, setListingsWithTenants] = useState<ListingWithTenants[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<{
    id: string;
    name: string;
    email?: string;
    phone?: string;
  } | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [removingTenantId, setRemovingTenantId] = useState<string | null>(null);

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
  }, [user]);

  // Refresh when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (user?.id) {
        loadTenants();
      }
    }, [user?.id])
  );

  // Listen for booking changes to auto-refresh tenants
  useEffect(() => {
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
    
    console.log('👂 Tenants page: Added booking change listeners');
    
    return () => {
      removeBookingCreated();
      removeBookingDeleted();
      removeBookingStatusChanged();
      console.log('🔇 Tenants page: Removed booking change listeners');
    };
  }, [loadTenants]);

  const loadTenants = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const tenants = await getTenantsByOwner(user.id);
      setListingsWithTenants(tenants);
      console.log(`✅ Loaded ${tenants.length} listings with tenants`);
    } catch (error) {
      console.error('❌ Error loading tenants:', error);
      showAlert('Error', 'Failed to load tenants. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadTenants();
  }, [loadTenants]);

  const handleViewTenantInfo = (tenant: TenantInfo) => {
    setSelectedTenant({
      id: tenant.tenantId,
      name: tenant.tenantName,
      email: tenant.tenantEmail,
      phone: tenant.tenantPhone
    });
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedTenant(null);
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

  const totalTenants = listingsWithTenants.reduce((sum, listing) => sum + listing.tenants.length, 0);

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
                  ? `${totalTenants} active tenant${totalTenants !== 1 ? 's' : ''} across ${listingsWithTenants.length} listing${listingsWithTenants.length !== 1 ? 's' : ''}`
                  : 'Manage your tenants and monitor occupancy'}
              </Text>
            </View>
          </View>

          {/* Summary Card */}
          {totalTenants > 0 && (
            <View style={styles.summaryCard}>
              <View style={styles.summaryItem}>
                <Users size={24} color={designTokens.colors.primary} />
                <View style={styles.summaryContent}>
                  <Text style={styles.summaryValue}>{totalTenants}</Text>
                  <Text style={styles.summaryLabel}>Total Tenants</Text>
                </View>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Home size={24} color={designTokens.colors.success} />
                <View style={styles.summaryContent}>
                  <Text style={styles.summaryValue}>{listingsWithTenants.length}</Text>
                  <Text style={styles.summaryLabel}>Listings</Text>
                </View>
              </View>
            </View>
          )}

          {/* Listings with Tenants */}
          {listingsWithTenants.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Users size={48} color="#9CA3AF" />
              </View>
              <Text style={styles.emptyTitle}>No Active Tenants</Text>
              <Text style={styles.emptyText}>
                You don't have any active tenants yet. Once tenants book and pay for your properties, they will appear here.
              </Text>
            </View>
          ) : (
            <View style={styles.listingsContainer}>
              {listingsWithTenants.map((listing) => (
                <View key={listing.listingId} style={styles.listingCard}>
                  {/* Listing Header */}
                  <View style={styles.listingHeader}>
                    <View style={styles.listingHeaderLeft}>
                      <Home size={20} color={designTokens.colors.primary} />
                      <View style={styles.listingTitleContainer}>
                        <Text style={styles.listingTitle} numberOfLines={1}>
                          {listing.propertyTitle}
                        </Text>
                        <View style={styles.listingLocationRow}>
                          <MapPin size={12} color="#6B7280" />
                          <Text style={styles.listingLocation} numberOfLines={1}>
                            {listing.propertyAddress}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  {/* Capacity Info */}
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
                          <View style={styles.tenantHeaderLeft}>
                            <View style={styles.slotBadge}>
                              <Text style={styles.slotBadgeText}>Slot #{tenant.slotNumber}</Text>
                            </View>
                            <Text style={styles.tenantName} numberOfLines={1}>
                              {tenant.tenantName}
                            </Text>
                          </View>
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

                        <View style={styles.tenantInfo}>
                          <TouchableOpacity
                            style={styles.tenantInfoRow}
                            onPress={() => handleViewTenantInfo(tenant)}
                            activeOpacity={0.7}
                          >
                            <View style={styles.tenantInfoLeft}>
                              <User size={16} color="#6B7280" />
                              <Text style={styles.tenantInfoLabel}>View Details</Text>
                            </View>
                            <ChevronRight size={16} color="#9CA3AF" />
                          </TouchableOpacity>

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
                              {formatDate(tenant.startDate)} - {formatDate(tenant.endDate)}
                            </Text>
                          </View>

                          <View style={styles.tenantInfoRow}>
                            <Text style={styles.tenantInfoLabel}>Monthly Rent:</Text>
                            <Text style={styles.tenantRent}>
                              ₱{tenant.monthlyRent.toLocaleString()}
                            </Text>
                          </View>
                        </View>
                      </View>
                    ))}
                  </View>
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
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  listingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  listingHeaderLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  listingTitleContainer: {
    flex: 1,
  },
  listingTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  listingLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  listingLocation: {
    fontSize: 12,
    color: '#6B7280',
    flex: 1,
  },
  capacityInfo: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    marginBottom: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
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
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
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
    gap: 8,
  },
  slotBadge: {
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
  tenantName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
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
});

