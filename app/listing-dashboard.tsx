import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  TextInput,
  Pressable,
  TouchableWithoutFeedback,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Star } from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { db, isPublishedListingRecord } from '@/utils/db';
import { PublishedListingRecord } from '@/types';
import { getPropertyRatingsMap } from '@/utils/property-ratings';
import LoginModal from '@/components/LoginModal';
import SignUpModal from '@/components/SignUpModal';

const { width } = Dimensions.get('window');

type PropertyType = 'all' | 'Boarding House' | 'Apartment' | 'House' | 'BedSpace';

interface ListingDisplay {
  id: string;
  image: string;
  coverPhoto?: string;
  title: string;
  location: string;
  address?: string;
  description?: string;
  propertyType?: string;
  barangay?: string;
  photos?: string[];
  videos?: string[];
  monthlyRent?: number;
  capacity?: number;
  occupiedSlots?: number;
  roomCapacities?: number[];
  roomAvailability?: number[];
  rating?: {
    averageRating: number;
    totalReviews: number;
  };
}

export default function ListingDashboard() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, redirectTenantToTabs, redirectOwnerBasedOnListings, redirectBrgyOfficial } = useAuth();
  const [listings, setListings] = useState<PublishedListingRecord[]>([]);
  const [filteredListings, setFilteredListings] = useState<ListingDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<PropertyType>('all');
  const [noticeDismissed, setNoticeDismissed] = useState(false);
  const [ratingsMap, setRatingsMap] = useState<Map<string, { averageRating: number; totalReviews: number }>>(new Map());
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showSignUpModal, setShowSignUpModal] = useState(false);
  const [pendingListing, setPendingListing] = useState<ListingDisplay | null>(null);
  const [shouldExecuteAction, setShouldExecuteAction] = useState(false);

  // Redirect authenticated users away from this guest-only page
  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      console.log('🚫 User is authenticated, redirecting from listing dashboard');
      const userRoles = user.roles || [];
      
      if (Array.isArray(userRoles) && userRoles.includes('owner')) {
        redirectOwnerBasedOnListings(user.id);
      } else if (Array.isArray(userRoles) && userRoles.includes('brgy_official')) {
        redirectBrgyOfficial();
      } else {
        // Default to tenant dashboard
        redirectTenantToTabs();
      }
    }
  }, [isLoading, isAuthenticated, user, redirectTenantToTabs, redirectOwnerBasedOnListings, redirectBrgyOfficial]);

  // Debug: Log modal state changes
  useEffect(() => {
    console.log('🔍 LoginModal state changed:', { showLoginModal, isAuthenticated, userId: user?.id });
  }, [showLoginModal, isAuthenticated, user?.id]);

  // Load published listings (no login required)
  const loadListings = useCallback(async () => {
    try {
      setLoading(true);
      console.log('🔄 Loading published listings for guest dashboard...');
      
      const rawListings = await db.list<PublishedListingRecord>('published_listings');
      const publishedListings = rawListings.filter(isPublishedListingRecord);
      
      // Filter only available listings and check capacity
      const { areAllRoomsFullyOccupied } = await import('../utils/listing-capacity');
      
      const availableListings = [];
      for (const listing of publishedListings) {
        if (listing.availabilityStatus === 'available' && listing.status === 'published') {
          // Check if all rooms are fully occupied (for listings with room capacities)
          // or if overall capacity is reached (for listings without room capacities)
          const allRoomsOccupied = await areAllRoomsFullyOccupied(listing);
          if (!allRoomsOccupied) {
            availableListings.push(listing);
          } else {
            console.log(`🚫 Listing ${listing.id} has all rooms fully occupied, filtering out`);
          }
        }
      }
      
      // Sort by published date (newest first)
      availableListings.sort((a, b) => {
        const dateA = new Date(a.publishedAt || '').getTime();
        const dateB = new Date(b.publishedAt || '').getTime();
        return dateB - dateA;
      });
      
      setListings(availableListings);
      console.log(`✅ Loaded ${availableListings.length} available listings`);
      
      // Load ratings for all listings
      if (availableListings.length > 0) {
        const propertyIds = availableListings.map(listing => listing.id || '').filter(id => id !== '');
        const ratings = await getPropertyRatingsMap(propertyIds);
        setRatingsMap(ratings);
        console.log(`✅ Loaded ratings for ${ratings.size} properties`);
      }
    } catch (error) {
      console.error('❌ Error loading listings:', error);
      setListings([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadListings();
  }, [loadListings]);

  // Handle booking changes that affect capacity (tenant removed)
  useEffect(() => {
    const handleBookingCapacityChange = async (event?: any) => {
      const eventDetail = event?.detail || {};
      console.log('🔄 Booking capacity changed (tenant removed), refreshing listings...', eventDetail);
      
      // Refresh listings to show newly available slots
      try {
        await loadListings();
        console.log('✅ Listings refreshed after booking capacity change');
      } catch (error) {
        console.error('❌ Error refreshing listings after booking change:', error);
      }
    };

    // Use cross-platform event listener utility
    const { addCustomEventListener } = require('../utils/custom-events');
    const removeBookingCancelled = addCustomEventListener('bookingCancelled', handleBookingCapacityChange);
    const removeBookingDeleted = addCustomEventListener('bookingDeleted', handleBookingCapacityChange);
    console.log('👂 Listing dashboard: Added booking change listeners');
    
    return () => {
      removeBookingCancelled();
      removeBookingDeleted();
      console.log('🔇 Listing dashboard: Removed booking change listeners');
    };
  }, [loadListings]);

  // Convert and filter listings
  useEffect(() => {
    const convertListings = async () => {
      const converted: ListingDisplay[] = await Promise.all(listings.map(async (listing) => {
        const listingId = listing.id || '';
        const rating = ratingsMap.get(listingId);
        
        // Get capacity information
        const { getOccupiedSlots, getAvailableSlotsPerRoom } = await import('../utils/listing-capacity');
        const occupiedSlots = await getOccupiedSlots(listingId);
        const capacity = listing.capacity || 1;
        
        // Get room availability if room capacities are defined
        let roomAvailability: number[] | undefined = undefined;
        if (listing.roomCapacities && listing.roomCapacities.length > 0) {
          roomAvailability = await getAvailableSlotsPerRoom(listingId, listing.roomCapacities);
        }
        
        return {
          id: listingId,
          image: listing.coverPhoto || listing.photos?.[0] || '',
          coverPhoto: listing.coverPhoto ?? undefined,
          title: listing.title || `${listing.propertyType || 'Property'} in ${listing.barangay || 'Lopez, Quezon'}`,
          location: listing.address || listing.barangay || 'Lopez, Quezon',
          address: listing.address,
          description: listing.description,
          propertyType: listing.propertyType,
          barangay: listing.barangay,
          photos: listing.photos || [],
          videos: listing.videos || [],
          monthlyRent: listing.monthlyRent,
          capacity: capacity,
          occupiedSlots: occupiedSlots,
          roomCapacities: listing.roomCapacities || undefined,
          roomAvailability: roomAvailability,
          rating: rating,
        };
      }));
      
      return converted;
    };
    
    convertListings().then(converted => {
      // Apply property type filter (case-insensitive matching)
      let filtered = converted;
      if (selectedFilter !== 'all') {
        filtered = filtered.filter(
          listing => listing.propertyType?.toLowerCase() === selectedFilter.toLowerCase()
        );
      }

      // Apply search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(listing => {
          const barangay = listing.barangay?.toLowerCase() || '';
          const address = listing.address?.toLowerCase() || '';
          const location = listing.location?.toLowerCase() || '';
          const title = listing.title?.toLowerCase() || '';
          const propertyType = listing.propertyType?.toLowerCase() || '';
          const price = listing.monthlyRent?.toString() || '';
          
          return (
            barangay.includes(query) ||
            address.includes(query) ||
            location.includes(query) ||
            title.includes(query) ||
            propertyType.includes(query) ||
            price.includes(query)
          );
        });
      }

      setFilteredListings(filtered);
    });
  }, [listings, selectedFilter, searchQuery, ratingsMap]);



  const handlePropertyView = (listing: ListingDisplay) => {
    const sourceListing = listings.find(l => l.id === listing.id);
    if (!sourceListing) return;

    router.push({
      pathname: '/listing-property-details',
      params: {
        id: sourceListing.id || '',
        title: sourceListing.title || 'Property',
        location: sourceListing.address || sourceListing.barangay || 'Lopez, Quezon',
        price: sourceListing.monthlyRent?.toString() || '0',
        rooms: sourceListing.rooms?.toString() || '0',
        bathrooms: sourceListing.bathrooms?.toString() || '0',
        size: sourceListing.size?.toString() || '0',
        rating: '0',
        reviews: '0',
        image: sourceListing.coverPhoto || sourceListing.photos?.[0] || '',
        ownerUserId: sourceListing.userId || '',
        description: sourceListing.description || '',
        amenities: sourceListing.amenities ? JSON.stringify(sourceListing.amenities) : '[]',
        photos: sourceListing.photos ? JSON.stringify(sourceListing.photos) : JSON.stringify([sourceListing.coverPhoto || '']),
        propertyType: sourceListing.propertyType || '',
        rentalType: sourceListing.rentalType || '',
        availabilityStatus: sourceListing.availabilityStatus || 'available',
        leaseTerm: sourceListing.leaseTerm || '',
        monthlyRent: sourceListing.monthlyRent?.toString() || '0',
        securityDeposit: sourceListing.securityDeposit?.toString() || '',
        paymentMethods: sourceListing.paymentMethods ? JSON.stringify(sourceListing.paymentMethods) : '',
        ownerName: sourceListing.ownerName || '',
        businessName: sourceListing.businessName || '',
        contactNumber: sourceListing.contactNumber || '',
        email: sourceListing.email || '',
        emergencyContact: sourceListing.emergencyContact || '',
        rules: sourceListing.rules ? JSON.stringify(sourceListing.rules) : '',
        videos: sourceListing.videos ? JSON.stringify(sourceListing.videos) : '',
      },
    });
  };

  // Execute pending message action after successful login
  useEffect(() => {
    if (shouldExecuteAction && isAuthenticated && user?.id && pendingListing) {
      const executeMessageAction = async () => {
        try {
          const sourceListing = listings.find(l => l.id === pendingListing.id);
          if (!sourceListing) {
            console.error('❌ Source listing not found');
            setShouldExecuteAction(false);
            setPendingListing(null);
            return;
          }

          const ownerUserId = sourceListing.ownerUserId || sourceListing.userId || '';
          
          if (!ownerUserId || ownerUserId.trim() === '') {
            console.error('❌ No ownerUserId found in listing');
            setShouldExecuteAction(false);
            setPendingListing(null);
            return;
          }

          console.log('💬 Starting conversation with owner after login:', ownerUserId);
          
          // Track inquiry
          const { trackListingInquiry } = await import('@/utils/inquiry-tracking');
          await trackListingInquiry(pendingListing.id, user.id, 'message');
          
          // Get owner display name
          const ownerDisplayName = sourceListing.businessName || sourceListing.ownerName || 'Property Owner';
          
          // Create or find conversation
          const { createOrFindConversation } = await import('@/utils/conversation-utils');
          const conversationId = await createOrFindConversation({
            ownerId: ownerUserId,
            tenantId: user.id,
            ownerName: ownerDisplayName,
            tenantName: user.name || 'Tenant',
            propertyId: pendingListing.id,
            propertyTitle: pendingListing.title
          });
          
          console.log('✅ Created/found conversation:', conversationId);
          
          // Navigate to chat room
          router.push({
            pathname: '/chat-room',
            params: {
              conversationId: conversationId,
              ownerName: ownerDisplayName,
              ownerAvatar: '',
              propertyTitle: pendingListing.title
            }
          });
        } catch (error) {
          console.error('❌ Error starting conversation:', error);
        } finally {
          setShouldExecuteAction(false);
          setPendingListing(null);
        }
      };
      
      executeMessageAction();
    }
  }, [shouldExecuteAction, isAuthenticated, user?.id, pendingListing, listings, router]);

  const handleMessageOwner = (listing: ListingDisplay) => {
    console.log('🔵 handleMessageOwner called', { isAuthenticated, userId: user?.id });
    if (!isAuthenticated || !user?.id) {
      // Store the listing and show login modal
      console.log('🔐 User not authenticated, showing login modal');
      setPendingListing(listing);
      setShowLoginModal(true);
      console.log('✅ Login modal state set to true');
      return;
    }
    
    // User is authenticated, execute message action immediately
    const sourceListing = listings.find(l => l.id === listing.id);
    if (!sourceListing) return;

    const ownerUserId = sourceListing.ownerUserId || sourceListing.userId || '';
    if (!ownerUserId || ownerUserId.trim() === '') {
      console.error('❌ No ownerUserId found in listing');
      return;
    }

    const executeMessage = async () => {
      try {
        console.log('💬 Starting conversation with owner:', ownerUserId);
        
        // Track inquiry
        const { trackListingInquiry } = await import('@/utils/inquiry-tracking');
        await trackListingInquiry(listing.id, user.id, 'message');
        
        // Get owner display name
        const ownerDisplayName = sourceListing.businessName || sourceListing.ownerName || 'Property Owner';
        
        // Create or find conversation
        const { createOrFindConversation } = await import('@/utils/conversation-utils');
        const conversationId = await createOrFindConversation({
          ownerId: ownerUserId,
          tenantId: user.id,
          ownerName: ownerDisplayName,
          tenantName: user.name || 'Tenant',
          propertyId: listing.id,
          propertyTitle: listing.title
        });
        
        console.log('✅ Created/found conversation:', conversationId);
        
        // Navigate to chat room
        router.push({
          pathname: '/chat-room',
          params: {
            conversationId: conversationId,
            ownerName: ownerDisplayName,
            ownerAvatar: '',
            propertyTitle: listing.title
          }
        });
      } catch (error) {
        console.error('❌ Error starting conversation:', error);
      }
    };
    
    executeMessage();
  };

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ fontSize: 16, color: '#64748B' }}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Don't render content if user is authenticated (they should be redirected)
  if (isAuthenticated && user) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ fontSize: 16, color: '#64748B' }}>Redirecting...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <>
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      {/* Modern Professional Header */}
      <View style={styles.headerWrapper}>
        <LinearGradient
          colors={['#1E3A8A', '#3B82F6', '#60A5FA']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <View style={styles.header}>
            {/* Sign In / Sign Up Buttons - At the top of header */}
            {!isAuthenticated && (
              <View style={styles.authButtonsTopRow}>
                <TouchableOpacity 
                  style={styles.signInButton}
                  onPress={() => setShowLoginModal(true)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="log-in-outline" size={16} color="#FFFFFF" />
                  <Text style={styles.signInButtonText}>Sign In</Text>
                </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.signUpButton}
                    onPress={() => {
                      console.log('🔵 Sign Up button pressed, setting showSignUpModal to true');
                      setShowSignUpModal(true);
                    }}
                    activeOpacity={0.8}
                  >
                  <Ionicons name="person-add-outline" size={16} color="#3B82F6" />
                  <Text style={styles.signUpButtonText}>Sign Up</Text>
                </TouchableOpacity>
              </View>
            )}
            
            {/* Title Section */}
            <View style={styles.headerTop}>
              <View style={styles.headerTextContainer}>
                <View style={styles.iconTitleRow}>
                  <Ionicons name="home" size={24} color="#FFFFFF" style={styles.headerIcon} />
                  <Text style={styles.headerTitle} numberOfLines={2}>
                     Available Homes in Lopez, Quezon
                  </Text>
                </View>
                <Text style={styles.headerSubtitle}>Discover rentals in the heart of Lopez, Quezon</Text>
              </View>
            </View>
            
            {/* Simple Search Bar */}
            <View style={styles.searchBar}>
              <Ionicons name="search" size={18} color="#6B7280" style={styles.searchIcon} />
              <TextInput
                placeholder="Search by Barangay, Price, or Type..."
                placeholderTextColor="#9CA3AF"
                value={searchQuery}
                onChangeText={setSearchQuery}
                style={styles.searchInput}
                returnKeyType="search"
              />
              {!!searchQuery && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={18} color="#9CA3AF" />
                </TouchableOpacity>
              )}
            </View>

            {/* Filter Buttons */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.filterScroll}
              contentContainerStyle={styles.filterContent}
            >
              <TouchableOpacity
                style={[styles.filterButton, selectedFilter === 'all' && styles.filterButtonActive]}
                onPress={() => setSelectedFilter('all')}
              >
                <Text style={[styles.filterButtonText, selectedFilter === 'all' && styles.filterButtonTextActive]}>
                  All
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterButton, selectedFilter === 'Boarding House' && styles.filterButtonActive]}
                onPress={() => setSelectedFilter('Boarding House')}
              >
                <Text style={styles.filterEmoji}></Text>
                <Text style={[styles.filterButtonText, selectedFilter === 'Boarding House' && styles.filterButtonTextActive]}>
                  Boarding House
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterButton, selectedFilter === 'Apartment' && styles.filterButtonActive]}
                onPress={() => setSelectedFilter('Apartment')}
              >
                <Text style={styles.filterEmoji}></Text>
                <Text style={[styles.filterButtonText, selectedFilter === 'Apartment' && styles.filterButtonTextActive]}>
                  Apartment
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterButton, selectedFilter === 'House' && styles.filterButtonActive]}
                onPress={() => setSelectedFilter('House')}
              >
                <Text style={styles.filterEmoji}></Text>
                <Text style={[styles.filterButtonText, selectedFilter === 'House' && styles.filterButtonTextActive]}>
                  House
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterButton, selectedFilter === 'BedSpace' && styles.filterButtonActive]}
                onPress={() => setSelectedFilter('BedSpace')}
              >
                <Text style={styles.filterEmoji}></Text>
                <Text style={[styles.filterButtonText, selectedFilter === 'BedSpace' && styles.filterButtonTextActive]}>
                  BedSpace
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </LinearGradient>
      </View>

      {/* Guest User Notice - Positioned below header */}
      {!isAuthenticated && !noticeDismissed && (
        <View style={styles.noticeContainer}>
          <View style={styles.noticeContent}>
            <Ionicons name="information-circle-outline" size={16} color="#3B82F6" />
            <Pressable onPress={() => setShowLoginModal(true)}>
              <Text style={styles.noticeText}>
                Sign in to contact owners, save favorites, or post your listing
              </Text>
            </Pressable>
          </View>
          <TouchableOpacity 
            onPress={() => setNoticeDismissed(true)}
            style={styles.dismissButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={18} color="#64748B" />
          </TouchableOpacity>
        </View>
      )}

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* All Properties */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>All Properties</Text>
            <Text style={styles.sectionSubtitle}>
              {String(filteredListings.length) + ' ' + (filteredListings.length === 1 ? 'property' : 'properties')}
            </Text>
          </View>
          
          {filteredListings.length > 0 ? (
            filteredListings.map((listing) => {
              const sourceListing = listings.find(l => l.id === listing.id);
              const photos = sourceListing?.photos || listing.photos || [];
              const videos = sourceListing?.videos || listing.videos || [];
              
              return (
                <Pressable 
                  key={listing.id} 
                  style={styles.propertyCard}
                  onPress={() => handlePropertyView(listing)}
                >
                  <View style={styles.imageContainer}>
                    {(listing.coverPhoto || listing.image) ? (
                      <Image 
                        source={{ uri: listing.coverPhoto || listing.image }}
                        style={styles.propertyImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.noImageContainer}>
                        <Text style={styles.noImageText}>🏠 Property Image</Text>
                      </View>
                    )}
                    {/* Property Type Badge */}
                    {listing.propertyType && typeof listing.propertyType === 'string' && listing.propertyType.trim() !== '' ? (
                      <View style={styles.propertyTypeBadge}>
                        <Text style={styles.propertyTypeText}>{String(listing.propertyType)}</Text>
                      </View>
                    ) : null}
                    {/* Rating Badge */}
                    {listing.rating && listing.rating.averageRating > 0 && (
                      <View style={styles.ratingBadge}>
                        <Star size={12} color="#F59E0B" fill="#F59E0B" />
                        <Text style={styles.ratingText}>
                          {listing.rating.averageRating.toFixed(1)} ({listing.rating.totalReviews})
                        </Text>
                      </View>
                    )}
                  </View>
                    
                  <View style={styles.propertyContent}>
                    {/* List Name */}
                    <View style={styles.titleContainer}>
                      <Text style={styles.propertyTitle} numberOfLines={2}>{listing.title}</Text>
                    </View>
                    
                    {/* Barangay */}
                    {listing.barangay && typeof listing.barangay === 'string' && listing.barangay.trim() !== '' ? (
                      <View style={styles.locationRow}>
                        <Ionicons name="location" size={14} color="#64748B" />
                        <Text style={styles.locationText} numberOfLines={1}>
                          {String(listing.barangay)}
                        </Text>
                      </View>
                    ) : null}
                    
                    {/* Description */}
                    {listing.description && typeof listing.description === 'string' && listing.description.trim() !== '' ? (
                      <Text style={styles.propertyDescription} numberOfLines={2}>
                        {String(listing.description)}
                      </Text>
                    ) : null}
                    
                    {/* Capacity/Slots Information */}
                    {listing.capacity !== undefined && (
                      <View style={styles.capacityContainer}>
                        <View style={styles.capacityHeader}>
                          <Ionicons name="people" size={18} color="#10B981" />
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
                              {listing.roomCapacities.map((roomCap: number, index: number) => {
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
                    
                    {/* Action Buttons */}
                    <TouchableWithoutFeedback onPress={() => {}}>
                      <View style={styles.propertyActions}>
                        {((sourceListing?.ownerUserId && sourceListing.ownerUserId.trim() !== '') || (sourceListing?.userId && sourceListing.userId.trim() !== '')) && (
                          <TouchableOpacity 
                            style={styles.messageButton}
                            activeOpacity={0.8}
                            onPress={() => {
                              console.log('🔵 Message button pressed');
                              handleMessageOwner(listing);
                            }}
                          >
                            <Ionicons name="chatbubble-ellipses" size={18} color="#FFFFFF" />
                            <Text style={styles.messageButtonText}>Message</Text>
                          </TouchableOpacity>
                        )}
                        
                        <TouchableOpacity 
                          style={styles.viewButton}
                          activeOpacity={0.8}
                          onPress={() => handlePropertyView(listing)}
                        >
                          <Ionicons name="eye" size={18} color="#FFFFFF" />
                          <Text style={styles.viewButtonText}>View Details</Text>
                        </TouchableOpacity>
                      </View>
                    </TouchableWithoutFeedback>
                  </View>
                </Pressable>
              );
            })
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="home" size={48} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>No Properties Found</Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery || selectedFilter !== 'all'
                  ? 'Try adjusting your search or filters'
                  : 'Check back later for new property listings'}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
    
    {/* Login Modal - Outside SafeAreaView to ensure it renders on top */}
    <LoginModal
      visible={showLoginModal}
      onClose={() => {
        console.log('🔴 LoginModal onClose called');
        setShowLoginModal(false);
        setPendingListing(null);
        setShouldExecuteAction(false);
      }}
      onLoginSuccess={() => {
        console.log('✅ LoginModal onLoginSuccess called');
        // Trigger the useEffect to execute the pending action
        setShowLoginModal(false);
        setShouldExecuteAction(true);
      }}
      onSwitchToSignUp={() => {
        setShowLoginModal(false);
        setShowSignUpModal(true);
      }}
    />
    
    {/* Sign Up Modal - Outside SafeAreaView to ensure it renders on top */}
    <SignUpModal
      visible={showSignUpModal}
      onClose={() => {
        console.log('🔴 SignUpModal onClose called');
        setShowSignUpModal(false);
      }}
      onSignUpSuccess={() => {
        console.log('✅ SignUpModal onSignUpSuccess called');
        setShowSignUpModal(false);
      }}
      onSwitchToLogin={() => {
        setShowSignUpModal(false);
        setShowLoginModal(true);
      }}
    />
  </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  noticeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F0F9FF',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  noticeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  noticeText: {
    flex: 1,
    fontSize: 12,
    color: '#1E40AF',
    lineHeight: 16,
    fontWeight: '500',
  },
  dismissButton: {
    padding: 4,
    marginLeft: 8,
  },
  headerWrapper: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  headerGradient: {
    paddingBottom: 16,
    paddingTop: 16,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 28,
  },
  authButtonsTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    marginBottom: 16,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  headerTextContainer: {
    flex: 1,
    marginRight: 8,
  },
  signInButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  signInButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  signUpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  signUpButtonText: {
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  iconTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  headerIcon: {
    marginRight: 10,
    marginTop: 2,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
    flex: 1,
    flexShrink: 1,
    lineHeight: 24,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#E0E7FF',
    marginTop: 2,
    marginLeft: 36,
    fontWeight: '400',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
    padding: 0,
  },
  filterScroll: {
    marginTop: 0,
  },
  filterContent: {
    flexDirection: 'row',
    gap: 6,
    paddingBottom: 2,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    marginRight: 0,
  },
  filterButtonActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderColor: 'rgba(255, 255, 255, 0.9)',
  },
  filterEmoji: {
    fontSize: 14,
    marginRight: 6,
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  filterButtonTextActive: {
    color: '#1E3A8A',
  },
  content: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginTop: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1.5,
    borderBottomColor: '#E2E8F0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    letterSpacing: 0.3,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
    backgroundColor: '#E0E7FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  propertyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 5,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: 200,
    overflow: 'hidden',
    backgroundColor: '#F8FAFC',
  },
  propertyImage: {
    width: '100%',
    height: 200,
  },
  propertyTypeBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(59, 130, 246, 0.95)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  propertyTypeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    textTransform: 'capitalize',
  },
  ratingBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
    marginLeft: 4,
  },
  noImageContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noImageText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  propertyContent: {
    padding: 18,
  },
  titleContainer: {
    marginBottom: 10,
  },
  propertyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: 0.2,
    lineHeight: 24,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 6,
  },
  locationText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
    flex: 1,
  },
  propertyDescription: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 16,
    fontWeight: '400',
    lineHeight: 20,
  },
  capacityContainer: {
    backgroundColor: '#F0FDF4',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 16,
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
  propertyActions: {
    flexDirection: 'row',
    gap: 10,
  },
  messageButton: {
    flex: 1,
    backgroundColor: '#10B981',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  messageButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
    letterSpacing: 0.3,
  },
  viewButton: {
    flex: 1,
    backgroundColor: '#3B82F6',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  viewButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
    letterSpacing: 0.3,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#475569',
    marginTop: 20,
    marginBottom: 10,
    letterSpacing: 0.2,
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 22,
  },
});
