import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, StyleSheet } from 'react-native';
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
  Trash2, 
  Eye,
  ArrowLeft,
  Calendar,
  MapPin,
  // DollarSign, // Replaced with peso symbol ₱
  MessageSquare,
  Star,
  Home
} from 'lucide-react-native';
import { sharedStyles, designTokens, iconBackgrounds, statusColors } from '../../styles/owner-dashboard-styles';
import { showAlert } from '../../utils/alert';
import { clearCache } from '../../utils/db';

export default function ListingsPage() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [listings, setListings] = useState<OwnerListing[]>([]);
  const [loading, setLoading] = useState(true);

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

    loadListings();
  }, [user]);

  // Listen for listing changes to auto-refresh
  useEffect(() => {
    const handleListingChange = () => {
      console.log('🔄 Listing changed, refreshing listings page...');
      loadListings();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('listingChanged', handleListingChange);
      return () => {
        window.removeEventListener('listingChanged', handleListingChange);
      };
    }
  }, [user]);

  // Refresh listings when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadListings();
    }, [])
  );

  const loadListings = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      
      // Clear cache to ensure fresh data
      await clearCache();
      
      const ownerListings = await getOwnerListings(user.id);
      
      console.log('📸 Media Check - Owner Listings:', ownerListings.map(listing => ({
        id: listing.id,
        propertyType: listing.propertyType,
        hasCoverPhoto: !!listing.coverPhoto,
        coverPhotoLength: listing.coverPhoto?.length || 0,
        photosCount: listing.photos?.length || 0,
        videosCount: listing.videos?.length || 0,
        coverPhotoPreview: listing.coverPhoto?.substring(0, 50) + '...'
      })));
      
      if (ownerListings && ownerListings.length > 0) {
        setListings(ownerListings);
      } else {
        console.log('📋 No listings found for owner, checking database directly...');
        
        // Fallback: Check database directly
        const { db } = await import('../../utils/db');
        const allListings = await db.list('published_listings');
        const userListings = allListings.filter(listing => listing.userId === user.id);
        
        if (userListings.length > 0) {
          console.log(`📋 Found ${userListings.length} listings directly from database`);
          // Convert to the expected format
          const convertedListings = userListings.map((listing: any) => ({
            id: listing.id,
            userId: listing.userId,
            propertyType: listing.propertyType,
            address: listing.address,
            monthlyRent: listing.monthlyRent,
            status: listing.status,
            views: listing.views || 0,
            inquiries: listing.inquiries || 0,
            createdAt: listing.createdAt,
            updatedAt: listing.updatedAt,
            coverPhoto: listing.coverPhoto,
            photos: listing.photos || [],
            videos: listing.videos || [],
            businessName: listing.businessName,
            bedrooms: listing.bedrooms,
            bathrooms: listing.bathrooms,
            size: listing.size,
            rentalType: listing.rentalType,
            availabilityStatus: listing.availabilityStatus,
            leaseTerm: listing.leaseTerm,
            baseRent: listing.baseRent,
            securityDeposit: listing.securityDeposit,
            ownerName: listing.ownerName,
            contactNumber: listing.contactNumber,
            email: listing.email,
            emergencyContact: listing.emergencyContact,
            amenities: listing.amenities,
            description: listing.description
          }));
          
          setListings(convertedListings);
        } else {
          console.log('📋 No listings found in database for this user');
          setListings([]);
        }
      }
    } catch (error) {
      console.error('❌ Error loading listings:', error);
      showAlert('Error', 'Failed to load listings');
      setListings([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteListing = async (listingId: string, listingTitle: string) => {
    if (!user?.id) return;

    showAlert(
      'Delete Listing',
      `Are you sure you want to delete "${listingTitle}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('🗑️ Deleting listing:', listingId);
              const success = await deleteOwnerListing(user.id, listingId);
              if (success) {
                console.log('✅ Listing deleted successfully');
                showAlert('Success', 'Listing deleted successfully');
                loadListings();
              } else {
                console.error('❌ Delete failed - unauthorized or not found');
                showAlert('Error', 'Failed to delete listing');
              }
            } catch (error) {
              console.error('❌ Error deleting listing:', error);
              showAlert('Error', 'Failed to delete listing');
            }
          }
        }
      ]
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };


  if (loading) {
    return (
      <View style={sharedStyles.loadingContainer}>
        <Text style={sharedStyles.loadingText}>Loading listings...</Text>
      </View>
    );
  }

  return (
    <View style={sharedStyles.container}>
      <View style={sharedStyles.mainContent}>
          <ScrollView style={sharedStyles.scrollView}>
            <View style={sharedStyles.pageContainer}>
              {/* Header */}
              <View style={sharedStyles.pageHeader}>
                <View style={sharedStyles.headerLeft}>
                  <Text style={sharedStyles.pageTitle}>My Listings</Text>
                  <Text style={sharedStyles.pageSubtitle}>Manage your property listings</Text>
                </View>
                <View style={sharedStyles.headerRight}>
                  <TouchableOpacity 
                    style={sharedStyles.primaryButton}
                    onPress={() => router.push('/(owner)/create-listing')}
                  >
                    <Plus size={16} color="white" />
                    <Text style={sharedStyles.primaryButtonText}>Add Listing</Text>
                  </TouchableOpacity>
                </View>
              </View>

          {/* Listings Section */}
          <View style={sharedStyles.section}>
            {listings.length === 0 ? (
              <View style={sharedStyles.emptyState}>
                <View style={[sharedStyles.statIcon, iconBackgrounds.blue, { marginBottom: designTokens.spacing.lg }]}>
                  <Plus size={32} color="#3B82F6" />
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
              <View style={{ gap: 16 }}>
                {listings.map((listing: any) => (
                  <TouchableOpacity 
                    key={listing.id} 
                    style={styles.modernCard}
                    activeOpacity={0.95}
                  >
                    {/* Cover Photo */}
                    <View style={styles.imageContainer}>
                      {listing.coverPhoto ? (
                        <Image 
                          source={{ uri: listing.coverPhoto }} 
                          style={styles.coverImage}
                          resizeMode="cover"
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
                          {listing.status === 'published' ? '● Published' : '● Draft'}
                        </Text>
                      </View>

                      {/* Stats Overlay */}
                      <View style={styles.statsOverlay}>
                        <View style={styles.statItem}>
                          <Eye size={14} color="#FFFFFF" />
                          <Text style={styles.statText}>{listing.views || 0}</Text>
                        </View>
                        <View style={styles.statItem}>
                          <MessageSquare size={14} color="#FFFFFF" />
                          <Text style={styles.statText}>{listing.inquiries || 0}</Text>
                        </View>
                      </View>
                    </View>

                    {/* Content */}
                    <View style={styles.cardContent}>
                      {/* Title & Location */}
                      <View style={styles.titleSection}>
                        <Text style={styles.propertyTitle} numberOfLines={2}>
                          {listing.businessName ? `${listing.businessName}'s ${listing.propertyType}` : listing.ownerName ? `${listing.ownerName}'s ${listing.propertyType}` : listing.propertyType}
                        </Text>
                        <Text style={styles.propertyAddress} numberOfLines={2}>
                          {listing.businessName ? `${listing.businessName} ${listing.propertyType}` : listing.ownerName ? `${listing.ownerName} ${listing.propertyType}` : listing.propertyType} in {listing.address}
                        </Text>
                        <View style={styles.locationRow}>
                          <MapPin size={14} color="#6B7280" />
                          <Text style={styles.locationText} numberOfLines={1}>
                            {listing.address}
                          </Text>
                        </View>
                      </View>

                      {/* Property Details */}
                      <View style={styles.detailsSection}>
                        <View style={styles.detailRow}>
                          <View style={styles.detailItem}>
                            <Text style={styles.detailLabel}>Bedrooms</Text>
                            <Text style={styles.detailValue}>{listing.bedrooms || 0}</Text>
                          </View>
                          <View style={styles.detailItem}>
                            <Text style={styles.detailLabel}>Bathrooms</Text>
                            <Text style={styles.detailValue}>{listing.bathrooms || 0}</Text>
                          </View>
                        </View>
                        
                        {/* Rental Type & Availability */}
                        <View style={styles.rentalInfoRow}>
                          <View style={styles.rentalInfoItem}>
                            <Text style={styles.rentalTypeLabel}>Type:</Text>
                            <Text style={styles.rentalTypeValue}>{listing.rentalType || 'Long-term'}</Text>
                          </View>
                          <View style={styles.rentalInfoItem}>
                            <Text style={styles.availabilityLabel}>Status:</Text>
                            <Text style={[
                              styles.availabilityValue,
                              listing.availabilityStatus === 'Available' ? styles.availableStatus : styles.unavailableStatus
                            ]}>
                              {listing.availabilityStatus || 'Available'}
                            </Text>
                          </View>
                        </View>
                        
                        {/* Amenities Preview */}
                        {listing.amenities && listing.amenities.length > 0 && (
                          <View style={styles.amenitiesSection}>
                            <Text style={styles.amenitiesLabel}>Amenities:</Text>
                            <View style={styles.amenitiesList}>
                              {listing.amenities.map((amenity: string, index: number) => (
                                <View key={index} style={styles.amenityTag}>
                                  <Text style={styles.amenityText}>{amenity}</Text>
                                </View>
                              ))}
                            </View>
                          </View>
                        )}
                        
                        {/* Description */}
                        {listing.description && (
                          <View style={styles.descriptionSection}>
                            <Text style={styles.descriptionLabel}>Description:</Text>
                            <Text style={styles.descriptionText} numberOfLines={2}>
                              {listing.description}
                            </Text>
                          </View>
                        )}
                        
                        {/* Contact Information */}
                        {(listing.contactNumber || listing.email) && (
                          <View style={styles.contactSection}>
                            <Text style={styles.contactLabel}>Contact:</Text>
                            <View style={styles.contactInfo}>
                              {listing.contactNumber && (
                                <Text style={styles.contactText}>📞 {listing.contactNumber}</Text>
                              )}
                              {listing.email && (
                                <Text style={styles.contactText}>✉️ {listing.email}</Text>
                              )}
                            </View>
                          </View>
                        )}
                      </View>

                      {/* Price & Financial Info */}
                      <View style={styles.priceSection}>
                        <View style={styles.priceInfo}>
                          <View>
                            <Text style={styles.priceAmount}>
                              ₱{listing.monthlyRent?.toLocaleString() || '0'}
                            </Text>
                            <Text style={styles.priceLabel}>per month</Text>
                          </View>
                          {listing.securityDeposit && (
                            <View style={styles.additionalCosts}>
                              <Text style={styles.additionalCostText}>
                                Deposit: ₱{listing.securityDeposit.toLocaleString()}
                              </Text>
                            </View>
                          )}
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
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
                          <Text style={styles.actionButtonText}>Edit Listing</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                          style={[styles.actionButton, styles.deleteButton]}
                          onPress={() => handleDeleteListing(listing.id, listing.propertyType)}
                          activeOpacity={0.7}
                        >
                          <Trash2 size={16} color="#FFFFFF" />
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
    </View>
  );
}

// Compact Modern Card Styles
const styles = StyleSheet.create({
  modernCard: {
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
    marginBottom: 12,
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
    backdropFilter: 'blur(10px)',
  },
  statusBadgePublished: {
    backgroundColor: 'rgba(16, 185, 129, 0.95)',
  },
  statusBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
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
    backdropFilter: 'blur(10px)',
  },
  statText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  cardContent: {
    padding: 14,
  },
  titleSection: {
    marginBottom: 10,
  },
  propertyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
    letterSpacing: -0.3,
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
  priceSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    marginBottom: 10,
  },
  priceAmount: {
    fontSize: 20,
    fontWeight: '800',
    color: '#10B981',
    letterSpacing: -0.5,
  },
  priceLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
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
    letterSpacing: 0.2,
  },
  // Compact details section
  detailsSection: {
    marginBottom: 10,
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
  // Compact amenities
  amenitiesSection: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  amenitiesLabel: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
    marginBottom: 6,
  },
  amenitiesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  amenityTag: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
  },
  amenityText: {
    fontSize: 10,
    color: '#374151',
    fontWeight: '500',
  },
  // Compact contact - make it collapsible or shorter
  contactSection: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  contactLabel: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
    marginBottom: 4,
  },
  contactInfo: {
    gap: 3,
  },
  contactText: {
    fontSize: 11,
    color: '#374151',
    fontWeight: '500',
  },
  // Compact description
  descriptionSection: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  descriptionLabel: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
    marginBottom: 4,
  },
  descriptionText: {
    fontSize: 12,
    color: '#374151',
    lineHeight: 16,
  },
  // Financial info
  priceInfo: {
    flex: 1,
  },
  additionalCosts: {
    marginTop: 4,
    gap: 2,
  },
  additionalCostText: {
    fontSize: 10,
    color: '#6B7280',
    fontWeight: '500',
  },
});
