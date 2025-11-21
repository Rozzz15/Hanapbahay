import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { Heart, Home, MapPin, Star, Users, ArrowLeft } from 'lucide-react-native';
import { getUserFavorites, toggleFavorite, isFavorite, removeFromFavorites } from '../../utils/favorites';
import { db } from '../../utils/db';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PublishedListingRecord } from '../../types';
import { isPublishedListingRecord } from '../../utils/db';
import { loadPropertyMedia } from '../../utils/media-storage';
import { getPropertyRatingsMap } from '../../utils/property-ratings';
import { createOrFindConversation } from '../../utils/conversation-utils';
import { showAlert } from '../../utils/alert';
import { addCustomEventListener } from '../../utils/custom-events';
import ListingCard from '../../components/listings/ListingCard';

export default function FavoritesScreen() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [favoriteListings, setFavoriteListings] = useState<PublishedListingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [ratingsMap, setRatingsMap] = useState<Map<string, { averageRating: number; totalReviews: number }>>(new Map());

  const loadFavorites = useCallback(async () => {
    if (!user?.id || !isAuthenticated) {
      setFavoriteListings([]);
      setLoading(false);
      return;
    }

    try {
      console.log('🔄 Loading favorite listings for user:', user.id);
      
      // Get user's favorite property IDs
      const favoriteIds = await getUserFavorites(user.id);
      console.log('📋 Favorite property IDs:', favoriteIds);

      if (favoriteIds.length === 0) {
        setFavoriteListings([]);
        setRatingsMap(new Map());
        setLoading(false);
        return;
      }

      // Load all published listings
      const allListings = await db.list<PublishedListingRecord>('published_listings');
      const publishedListings = allListings.filter(isPublishedListingRecord);

      // Filter to only favorite listings
      const favorites = publishedListings.filter(listing => 
        favoriteIds.includes(listing.id)
      );

      // Load media for each favorite listing
      const favoritesWithMedia = await Promise.all(
        favorites.map(async (listing) => {
          try {
            const media = await loadPropertyMedia(listing.id, user.id);
            return {
              ...listing,
              coverPhoto: media.coverPhoto || listing.coverPhoto,
              photos: media.photos.length > 0 ? media.photos : listing.photos || [],
              videos: media.videos.length > 0 ? media.videos : listing.videos || [],
            };
          } catch (error) {
            console.error(`Error loading media for listing ${listing.id}:`, error);
            return listing;
          }
        })
      );

      // Sort by most recently favorited (if we had that data) or by published date
      favoritesWithMedia.sort((a, b) => {
        const dateA = new Date(a.publishedAt || '').getTime();
        const dateB = new Date(b.publishedAt || '').getTime();
        return dateB - dateA;
      });

      setFavoriteListings(favoritesWithMedia);

      // Load ratings for favorite listings
      if (favoritesWithMedia.length > 0) {
        const propertyIds = favoritesWithMedia.map(listing => listing.id).filter(id => id !== '');
        const ratings = await getPropertyRatingsMap(propertyIds);
        setRatingsMap(ratings);
      }

      console.log(`✅ Loaded ${favoritesWithMedia.length} favorite listings`);
    } catch (error) {
      console.error('❌ Error loading favorites:', error);
      showAlert('Error', 'Failed to load favorites. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id, isAuthenticated]);

  // Load favorites on mount and when screen comes into focus
  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  useFocusEffect(
    useCallback(() => {
      loadFavorites();
    }, [loadFavorites])
  );

  // Listen for favorite changes
  useEffect(() => {
    if (!user?.id) return;

    const handleFavoriteChange = () => {
      loadFavorites();
    };

    const unsubscribe = addCustomEventListener('favoriteChanged', handleFavoriteChange);
    return unsubscribe;
  }, [user?.id, loadFavorites]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadFavorites();
  }, [loadFavorites]);

  // Convert PublishedListingRecord to ListingCard format
  const convertToListingCardFormat = (listing: PublishedListingRecord) => {
    const rating = ratingsMap.get(listing.id) || { averageRating: 0, totalReviews: 0 };
    
    return {
      id: listing.id,
      image: listing.coverPhoto || '',
      coverPhoto: listing.coverPhoto,
      title: listing.title || `${listing.propertyType} in ${listing.address}`,
      location: listing.address || '',
      rating: rating.averageRating,
      reviews: rating.totalReviews,
      rooms: listing.rooms || 0,
      bathrooms: listing.bathrooms || 0,
      size: 0, // Size not available in PublishedListingRecord
      price: listing.monthlyRent || 0,
      ownerUserId: listing.userId,
      description: listing.description || '',
      amenities: listing.amenities || [],
      photos: listing.photos || [],
      propertyType: listing.propertyType,
      rentalType: listing.rentalType,
      availabilityStatus: listing.availabilityStatus,
      leaseTerm: listing.leaseTerm,
      securityDeposit: 0, // Security deposit feature removed
      paymentMethods: listing.paymentMethods || [],
      ownerName: listing.ownerName,
      businessName: listing.businessName,
      contactNumber: listing.contactNumber,
      email: listing.email,
      emergencyContact: listing.emergencyContact,
      rules: listing.rules || [],
      videos: listing.videos || [],
      publishedAt: listing.publishedAt,
      capacity: listing.capacity,
      occupiedSlots: undefined, // Would need to calculate this
      roomCapacities: undefined, // Would need to calculate this
      roomAvailability: undefined, // Would need to calculate this
    };
  };

  if (!isAuthenticated || !user) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.emptyContainer}>
          <Heart size={64} color="#9CA3AF" />
          <Text style={styles.emptyTitle}>Login Required</Text>
          <Text style={styles.emptyText}>
            Please log in to view your saved listings.
          </Text>
          <TouchableOpacity
            style={styles.loginButton}
            onPress={() => router.push('/login')}
          >
            <Text style={styles.loginButtonText}>Go to Login</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Saved Listings</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#10B981" />
          <Text style={styles.loadingText}>Loading your favorites...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <ArrowLeft size={24} color="#111827" />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Saved Listings</Text>
            <Text style={styles.headerSubtitle}>
              {favoriteListings.length} {favoriteListings.length === 1 ? 'property' : 'properties'} saved
            </Text>
          </View>
        </View>
      </View>

      {favoriteListings.length === 0 ? (
        <ScrollView
          contentContainerStyle={styles.emptyContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          <Heart size={64} color="#9CA3AF" />
          <Text style={styles.emptyTitle}>No Saved Listings</Text>
          <Text style={styles.emptyText}>
            Start exploring properties and tap the heart icon to save your favorites.
          </Text>
          <TouchableOpacity
            style={styles.browseButton}
            onPress={async () => {
              // Set flag to skip redirect when navigating from favorites
              await AsyncStorage.setItem('skip_booking_redirect', 'true');
              // Navigate to the home tab
              router.push('/(tabs)/');
            }}
          >
            <Text style={styles.browseButtonText}>Browse Properties</Text>
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <ScrollView
          style={styles.listContainer}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={true}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {favoriteListings.map((listing) => {
            const rating = ratingsMap.get(listing.id) || { averageRating: 0, totalReviews: 0 };
            return (
              <TouchableOpacity
                key={listing.id}
                style={styles.compactCard}
                onPress={() => {
                  router.push({
                    pathname: '/property-preview',
                    params: { id: listing.id }
                  });
                }}
                onLongPress={() => {
                  Alert.alert(
                    'Remove from Saved',
                    `Are you sure you want to remove "${listing.title || listing.propertyType}" from your saved listings?`,
                    [
                      {
                        text: 'Cancel',
                        style: 'cancel',
                      },
                      {
                        text: 'Remove',
                        style: 'destructive',
                        onPress: async () => {
                          if (!user?.id || !listing.id) return;
                          try {
                            await removeFromFavorites(user.id, listing.id);
                            loadFavorites(); // Reload the list
                          } catch (error) {
                            console.error('Error removing favorite:', error);
                            showAlert('Error', 'Failed to remove from saved listings. Please try again.');
                          }
                        },
                      },
                    ]
                  );
                }}
                activeOpacity={0.7}
              >
                {/* Image Section - Compact */}
                <View style={styles.compactImageContainer}>
                  {listing.coverPhoto ? (
                    <Image
                      source={{ uri: listing.coverPhoto }}
                      style={styles.compactImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.compactImagePlaceholder}>
                      <Home size={32} color="#9CA3AF" />
                    </View>
                  )}
                  

                  {/* Rating Badge */}
                  {rating.averageRating > 0 && (
                    <View style={styles.compactRatingBadge}>
                      <Star size={12} color="#F59E0B" fill="#F59E0B" />
                      <Text style={styles.compactRatingText}>
                        {rating.averageRating.toFixed(1)}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Content Section - Compact */}
                <View style={styles.compactContent}>
                  <View style={styles.compactHeader}>
                    <View style={styles.compactTitleContainer}>
                      <Text style={styles.compactTitle} numberOfLines={1}>
                        {listing.title || `${listing.propertyType} in ${listing.address?.split(',')[0] || 'Location'}`}
                      </Text>
                      <View style={styles.compactLocationRow}>
                        <MapPin size={12} color="#6B7280" />
                        <Text style={styles.compactLocation} numberOfLines={1}>
                          {listing.address?.split(',')[0] || 'Location not specified'}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.compactPrice}>
                      ₱{listing.monthlyRent?.toLocaleString() || '0'}
                    </Text>
                  </View>

                  {/* Property Details */}
                  <View style={styles.compactDetails}>
                    {listing.rooms > 0 && (
                      <View style={styles.compactDetailItem}>
                        <Text style={styles.compactDetailText}>
                          {listing.rooms} {listing.rooms === 1 ? 'room' : 'rooms'}
                        </Text>
                      </View>
                    )}
                    {listing.bathrooms > 0 && (
                      <View style={styles.compactDetailItem}>
                        <Text style={styles.compactDetailText}>
                          {listing.bathrooms} {listing.bathrooms === 1 ? 'bath' : 'baths'}
                        </Text>
                      </View>
                    )}
                    {listing.propertyType && (
                      <View style={styles.compactDetailItem}>
                        <Text style={styles.compactDetailText}>
                          {listing.propertyType}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    padding: 4,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  loginButton: {
    backgroundColor: '#10B981',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  browseButton: {
    backgroundColor: '#10B981',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  browseButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  listContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  listContent: {
    padding: 12,
    paddingBottom: 24,
  },
  compactCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    flexDirection: 'row',
    minHeight: 100,
  },
  compactImageContainer: {
    width: 120,
    height: 100,
    backgroundColor: '#F3F4F6',
    position: 'relative',
  },
  compactImage: {
    width: '100%',
    height: '100%',
  },
  compactImagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  compactRatingBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  compactRatingText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1F2937',
  },
  compactContent: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  compactHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  compactTitleContainer: {
    flex: 1,
    marginRight: 8,
  },
  compactTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  compactLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  compactLocation: {
    fontSize: 12,
    color: '#6B7280',
    flex: 1,
  },
  compactPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#10B981',
  },
  compactDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  compactDetailItem: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  compactDetailText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#6B7280',
  },
});

