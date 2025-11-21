import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { 
  getOwnerListings,
  deleteOwnerListing,
  type OwnerListing
} from '../../utils/owner-dashboard';
import { 
  Plus, 
  Edit, 
  Eye,
  MapPin,
  MessageSquare,
  Home,
  Users
} from 'lucide-react-native';
import { Image } from '../../components/ui/image';

export default function ListingsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [listings, setListings] = useState<OwnerListing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      router.replace('/login');
      return;
    }

    if (!user.roles?.includes('owner')) {
      Alert.alert('Access Denied', 'This page is for property owners only.');
      router.replace('/(tabs)');
      return;
    }

    loadListings();
  }, [user]);

  // Refresh listings when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (user?.id) {
        loadListings();
      }
    }, [user?.id])
  );

  const loadListings = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const ownerListings = await getOwnerListings(user.id);
      
      // Load room availability for each listing
      const { getAvailableSlotsPerRoom, getOccupiedSlots } = await import('../../utils/listing-capacity');
      
      // Sanitize listing data to prevent text rendering errors
      const sanitizedListings = await Promise.all(ownerListings.map(async (listing: any) => {
        // Get room availability if room capacities are defined
        let roomAvailability: number[] | undefined = undefined;
        let hasAvailability = true;
        
        if (listing.roomCapacities && Array.isArray(listing.roomCapacities) && listing.roomCapacities.length > 0) {
          try {
            roomAvailability = await getAvailableSlotsPerRoom(listing.id, listing.roomCapacities.map((rc: any) => Number(rc)));
            // Check if all rooms have 0 available slots
            hasAvailability = roomAvailability.some(slots => slots > 0);
          } catch (error) {
            console.error(`Error loading room availability for listing ${listing.id}:`, error);
          }
        } else if (listing.capacity !== undefined) {
          // For listings without room capacities, check overall capacity
          try {
            const occupiedSlots = await getOccupiedSlots(listing.id);
            const capacity = Number(listing.capacity);
            hasAvailability = occupiedSlots < capacity;
          } catch (error) {
            console.error(`Error checking capacity for listing ${listing.id}:`, error);
          }
        }
        
        // Determine availability status based on room availability
        let availabilityStatus = String(listing.availabilityStatus || 'Available');
        if (!hasAvailability) {
          availabilityStatus = 'Occupied';
        }
        
        return {
          id: String(listing.id || ''),
          userId: user.id,
          propertyType: String(listing.propertyType || 'Property'),
          address: String(listing.address || 'No address'),
          status: String(listing.status || 'draft'),
          businessName: listing.businessName ? String(listing.businessName) : '',
          ownerName: listing.ownerName ? String(listing.ownerName) : '',
          rentalType: String(listing.rentalType || 'Long-term'),
          availabilityStatus: availabilityStatus,
          description: listing.description ? String(listing.description) : '',
          contactNumber: listing.contactNumber ? String(listing.contactNumber) : '',
          email: listing.email ? String(listing.email) : '',
          amenities: Array.isArray(listing.amenities) ? listing.amenities.map((a: any) => String(a || '')) : [],
          monthlyRent: Number(listing.monthlyRent) || 0,
          rooms: Number(listing.rooms || listing.bedrooms) || 0,
          bathrooms: Number(listing.bathrooms) || 0,
          size: Number(listing.size) || 0,
          baseRent: Number(listing.baseRent) || 0,
          securityDeposit: 0, // Security deposit feature removed
          views: Number(listing.views) || 0,
          inquiries: Number(listing.inquiries) || 0,
          createdAt: String(listing.createdAt || new Date().toISOString()),
          updatedAt: String(listing.updatedAt || new Date().toISOString()),
          photos: Array.isArray(listing.photos) ? listing.photos : [],
          videos: Array.isArray(listing.videos) ? listing.videos : [],
          coverPhoto: listing.coverPhoto ? String(listing.coverPhoto) : '',
          capacity: listing.capacity !== undefined ? Number(listing.capacity) : undefined,
          occupiedSlots: listing.occupiedSlots !== undefined ? Number(listing.occupiedSlots) : undefined,
          roomCapacities: Array.isArray(listing.roomCapacities) ? listing.roomCapacities.map((rc: any) => Number(rc)) : undefined,
          roomAvailability: roomAvailability
        };
      }));
      
      setListings(sanitizedListings);
    } catch (error) {
      console.error('Error loading listings:', error);
      Alert.alert('Error', 'Failed to load listings');
      setListings([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const handleDeleteListing = async (listingId: string, listingTitle: string) => {
    if (!user?.id) return;

    Alert.alert(
      'Delete Listing',
      `Are you sure you want to delete "${listingTitle}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const success = await deleteOwnerListing(user.id, listingId);
              if (success) {
                Alert.alert('Success', 'Listing deleted successfully');
                loadListings();
              } else {
                Alert.alert('Error', 'Failed to delete listing');
              }
            } catch (error) {
              console.error('Error deleting listing:', error);
              Alert.alert('Error', 'Failed to delete listing');
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

  const getPropertyTitle = (listing: any) => {
    if (listing.businessName) {
      return `${listing.businessName}'s ${listing.propertyType || 'Property'}`;
    }
    if (listing.ownerName) {
      return `${listing.ownerName}'s ${listing.propertyType || 'Property'}`;
    }
    return String(listing.propertyType || 'Property');
  };

  const getPropertyAddress = (listing: any) => {
    const title = getPropertyTitle(listing);
    const address = listing.address || 'No address';
    return `${title} in ${String(address)}`;
  };


  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading listings...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.pageContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.pageTitle}>My Listings</Text>
              <Text style={styles.pageSubtitle}>Manage your property listings</Text>
            </View>
            <TouchableOpacity 
              style={styles.addButton}
              onPress={() => router.push('/(owner)/create-listing')}
            >
              <Plus size={16} color="white" />
              <Text style={styles.addButtonText}>Add Listing</Text>
            </TouchableOpacity>
          </View>

          {/* Listings */}
          <View style={styles.listingsContainer}>
            {listings.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyIcon}>
                  <Plus size={32} color="#3B82F6" />
                </View>
                <Text style={styles.emptyTitle}>No listings yet</Text>
                <Text style={styles.emptyText}>
                  Create your first property listing to start attracting tenants
                </Text>
                <TouchableOpacity 
                  style={styles.createButton}
                  onPress={() => router.push('/(owner)/create-listing')}
                >
                  <Plus size={16} color="white" />
                  <Text style={styles.createButtonText}>Create Your First Listing</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.listingsList}>
                {listings.map((listing) => (
                  <TouchableOpacity 
                    key={listing.id} 
                    style={styles.listingCard}
                    activeOpacity={0.95}
                    onLongPress={() => handleDeleteListing(listing.id, getPropertyTitle(listing))}
                  >
                    {/* Cover Photo */}
                    <View style={styles.imageContainer}>
                      {listing.coverPhoto && listing.coverPhoto !== '' ? (
                        <Image 
                          source={{ uri: listing.coverPhoto }} 
                          style={styles.coverImage}
                          resizeMode="cover"
                          showSkeleton={true}
                          fallbackIcon="home"
                          borderRadius={0}
                        />
                      ) : (
                        <View style={styles.placeholderImage}>
                          <Home size={48} color="#9CA3AF" />
                          <Text style={styles.placeholderText}>No Photo</Text>
                        </View>
                      )}
                      
                      {/* Status Badge */}
                      <View style={[
                        styles.statusBadge,
                        listing.status === 'published' && styles.statusBadgePublished
                      ]}>
                        <Text style={styles.statusBadgeText}>
                          {listing.status === 'published' ? 'Published' : 'Draft'}
                        </Text>
                      </View>

                      {/* Stats Overlay */}
                      <View style={styles.statsOverlay}>
                        <View style={styles.statItem}>
                          <Eye size={14} color="#FFFFFF" />
                          <Text style={styles.statText}>{String(listing.views || 0)}</Text>
                        </View>
                        <View style={styles.statItem}>
                          <MessageSquare size={14} color="#FFFFFF" />
                          <Text style={styles.statText}>{String(listing.inquiries || 0)}</Text>
                        </View>
                      </View>
                    </View>

                    {/* Content */}
                    <View style={styles.cardContent}>
                      {/* Title & Location */}
                      <View style={styles.titleSection}>
                        <Text style={styles.propertyTitle} numberOfLines={2}>
                          {getPropertyTitle(listing)}
                        </Text>
                        <Text style={styles.propertyAddress} numberOfLines={2}>
                          {getPropertyAddress(listing)}
                        </Text>
                        <View style={styles.locationRow}>
                          <MapPin size={14} color="#6B7280" />
                          <Text style={styles.locationText} numberOfLines={1}>
                            {String(listing.address || 'No address')}
                          </Text>
                        </View>
                      </View>

                      {/* Property Details */}
                      <View style={styles.detailsSection}>
                        <View style={styles.detailRow}>
                          <View style={styles.detailItem}>
                            <Text style={styles.detailLabel}>Rooms</Text>
                            <Text style={styles.detailValue}>{String(listing.rooms || listing.bedrooms || 0)}</Text>
                          </View>
                          <View style={styles.detailItem}>
                            <Text style={styles.detailLabel}>Bathrooms</Text>
                            <Text style={styles.detailValue}>{String(listing.bathrooms || 0)}</Text>
                          </View>
                        </View>
                        
                        {/* Rental Type & Availability */}
                        <View style={styles.rentalInfoRow}>
                          <View style={styles.rentalInfoItem}>
                            <Text style={styles.rentalTypeLabel}>Type:</Text>
                            <Text style={styles.rentalTypeValue}>{String(listing.rentalType || 'N/A')}</Text>
                          </View>
                          <View style={styles.rentalInfoItem}>
                            <Text style={styles.availabilityLabel}>Status:</Text>
                            <Text style={[
                              styles.availabilityValue,
                              listing.availabilityStatus === 'Available' ? styles.availableStatus : styles.unavailableStatus
                            ]}>
                              {String(listing.availabilityStatus || 'Available')}
                            </Text>
                          </View>
                        </View>
                      </View>

                      {/* Capacity/Slots Information */}
                      {listing.capacity !== undefined && (
                        <View style={styles.capacitySection}>
                          <View style={styles.capacityHeader}>
                            <Users size={16} color="#10B981" />
                            <Text style={styles.capacitySectionTitle}>Capacity</Text>
                          </View>
                          {listing.occupiedSlots !== undefined 
                            ? (() => {
                                const available = listing.capacity - listing.occupiedSlots;
                                const percentage = Math.round((available / listing.capacity) * 100);
                                
                                return (
                                  <View style={styles.capacityInfo}>
                                    <View style={styles.capacityRow}>
                                      <Text style={styles.capacityLabel}>Total Capacity:</Text>
                                      <Text style={styles.capacityValue}>{listing.capacity} {listing.capacity === 1 ? 'slot' : 'slots'}</Text>
                                    </View>
                                    <View style={styles.capacityRow}>
                                      <Text style={styles.capacityLabel}>Occupied:</Text>
                                      <Text style={[styles.capacityValue, { color: '#EF4444' }]}>
                                        {listing.occupiedSlots} {listing.occupiedSlots === 1 ? 'slot' : 'slots'}
                                      </Text>
                                    </View>
                                    <View style={styles.capacityRow}>
                                      <Text style={styles.capacityLabel}>Available:</Text>
                                      <Text style={[
                                        styles.capacityValue, 
                                        available === 0 ? { color: '#EF4444' } : { color: '#10B981' }
                                      ]}>
                                        {available} {available === 1 ? 'slot' : 'slots'} ({percentage}%)
                                      </Text>
                                    </View>
                                  </View>
                                );
                              })()
                            : (
                              <View style={styles.capacityInfo}>
                                <View style={styles.capacityRow}>
                                  <Text style={styles.capacityLabel}>Total Capacity:</Text>
                                  <Text style={styles.capacityValue}>{listing.capacity} {listing.capacity === 1 ? 'slot' : 'slots'}</Text>
                                </View>
                                <Text style={styles.capacityNote}>Ready for occupancy</Text>
                              </View>
                            )
                          }
                          {/* Room Capacity Breakdown */}
                          {listing.roomCapacities && listing.roomCapacities.length > 0 && (
                            <View style={styles.roomCapacityBreakdown}>
                              <Text style={styles.roomCapacityTitle}>Room Availability:</Text>
                              <View style={styles.roomCapacityList}>
                                {listing.roomCapacities.map((roomCap, index) => {
                                  const available = listing.roomAvailability && listing.roomAvailability[index] !== undefined 
                                    ? listing.roomAvailability[index] 
                                    : roomCap; // Fallback to full capacity if availability not provided
                                  const isFullyOccupied = available === 0;
                                  
                                  return (
                                    <View 
                                      key={index} 
                                      style={[
                                        styles.roomCapacityItem,
                                        isFullyOccupied && { backgroundColor: '#FEF2F2', borderColor: '#FEE2E2' }
                                      ]}
                                    >
                                      <Text style={[
                                        styles.roomCapacityText,
                                        isFullyOccupied && { color: '#DC2626' }
                                      ]} numberOfLines={2}>
                                        Room {index + 1}: {available}/{roomCap}
                                      </Text>
                                      <Text style={[
                                        styles.roomCapacityText,
                                        { fontSize: 9, fontWeight: '400', marginTop: 2 },
                                        isFullyOccupied && { color: '#DC2626' }
                                      ]} numberOfLines={1}>
                                        {available === 1 ? 'slot' : 'slots'} available
                                      </Text>
                                      {isFullyOccupied && (
                                        <Text style={{ fontSize: 9, color: '#DC2626', fontWeight: '600', marginTop: 2, textAlign: 'center' }}>
                                          Fully Occupied
                                        </Text>
                                      )}
                                    </View>
                                  );
                                })}
                              </View>
                            </View>
                          )}
                        </View>
                      )}

                      {/* Price & Financial Info */}
                      <View style={styles.priceSection}>
                        <View style={styles.priceInfo}>
                          <View>
                            <Text style={styles.priceAmount}>
                              ₱{String(Number(listing.monthlyRent || 0).toLocaleString())}
                            </Text>
                            <Text style={styles.priceLabel}>per month</Text>
                          </View>
                        </View>
                        <View style={styles.dateInfo}>
                          <Text style={styles.dateText}>
                            {formatDate(listing.createdAt)}
                          </Text>
                          <Text style={styles.dateLabel}>Published</Text>
                        </View>
                      </View>

                      {/* Action Buttons */}
                      <View style={styles.actionButtons}>
                        <TouchableOpacity 
                          style={[styles.actionButton, styles.editButton]}
                          onPress={() => router.push(`/(owner)/edit-listing/${listing.id}` as any)}
                          activeOpacity={0.7}
                        >
                          <Edit size={16} color="#FFFFFF" />
                          <Text style={styles.actionButtonText}>Edit</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </View>
      </ScrollView>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
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
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  listingsContainer: {
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#EBF8FF',
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
    marginBottom: 24,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  listingsList: {
    gap: 16,
  },
  listingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: 160,
    backgroundColor: '#F3F4F6',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
  },
  placeholderText: {
    marginTop: 6,
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  statusBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(107, 114, 128, 0.95)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
  },
  statusBadgePublished: {
    backgroundColor: 'rgba(16, 185, 129, 0.95)',
  },
  statusBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  statsOverlay: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    gap: 8,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  cardContent: {
    padding: 16,
  },
  titleSection: {
    marginBottom: 12,
  },
  propertyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  propertyAddress: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 6,
    lineHeight: 18,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    fontSize: 12,
    color: '#6B7280',
    flex: 1,
  },
  detailsSection: {
    marginBottom: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  detailItem: {
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 10,
    color: '#6B7280',
    fontWeight: '500',
    marginBottom: 3,
  },
  detailValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '700',
  },
  rentalInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  rentalInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rentalTypeLabel: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
  },
  rentalTypeValue: {
    fontSize: 11,
    color: '#111827',
    fontWeight: '600',
  },
  availabilityLabel: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
  },
  availabilityValue: {
    fontSize: 11,
    fontWeight: '600',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  availableStatus: {
    color: '#10B981',
    backgroundColor: '#ECFDF5',
  },
  unavailableStatus: {
    color: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  capacitySection: {
    marginBottom: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  capacityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  capacitySectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#10B981',
  },
  capacityInfo: {
    gap: 6,
  },
  capacityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  capacityLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  capacityValue: {
    fontSize: 12,
    color: '#111827',
    fontWeight: '700',
  },
  capacityNote: {
    fontSize: 11,
    color: '#10B981',
    fontStyle: 'italic',
    marginTop: 4,
  },
  roomCapacityBreakdown: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#D1FAE5',
  },
  roomCapacityTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#10B981',
    marginBottom: 6,
  },
  roomCapacityList: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    gap: 8,
    alignItems: 'flex-start',
  },
  roomCapacityItem: {
    flex: 1,
    minWidth: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#D1FAE5',
    alignItems: 'center',
  },
  roomCapacityText: {
    fontSize: 10,
    color: '#10B981',
    fontWeight: '500',
    textAlign: 'center',
  },
  priceSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    marginBottom: 12,
  },
  priceInfo: {
    flex: 1,
  },
  priceAmount: {
    fontSize: 20,
    fontWeight: '800',
    color: '#10B981',
  },
  priceLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  additionalCosts: {
    marginTop: 4,
  },
  additionalCostText: {
    fontSize: 10,
    color: '#6B7280',
    fontWeight: '500',
  },
  dateInfo: {
    alignItems: 'flex-end',
  },
  dateText: {
    fontSize: 11,
    color: '#374151',
    fontWeight: '500',
  },
  dateLabel: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  editButton: {
    flex: 1,
    backgroundColor: '#10B981',
  },
  deleteButton: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 12,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
});
