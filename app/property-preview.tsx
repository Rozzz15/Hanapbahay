import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ScrollView, View, Text, TouchableOpacity, Image, Alert, Modal, Dimensions, Platform, StyleSheet, TextInput, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { ArrowLeft, MapPin, Bed, Bath, Star, Calendar, CheckCircle, X, MessageCircle, EyeOff, Users } from 'lucide-react-native';
import { PropertyVideoPlayer, VideoGallery } from '@/components/video';
// Removed video components import - functionality removed
import { useAuth } from '@/context/AuthContext';
import { db, clearCache } from '@/utils/db';
// Removed favorite functionality
import { trackListingView } from '@/utils/view-tracking';
import { trackListingInquiry } from '@/utils/inquiry-tracking';
import { loadPropertyMedia } from '@/utils/media-storage';
import StarRating from '@/components/ratings/StarRating';
import { rateProperty, getUserRatingForProperty, calculatePropertyRating } from '@/utils/property-ratings';
import { addCustomEventListener } from '@/utils/custom-events';

export default function PropertyPreviewScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user, isAuthenticated } = useAuth();
  const [dimensions, setDimensions] = useState(Dimensions.get('window'));
  const { width: screenWidth, height: screenHeight } = dimensions;
  const isMobile = Platform.OS !== 'web' || screenWidth < 768;
  const isSmallScreen = screenWidth < 375;

  // Listen for dimension changes
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions(window);
    });
    return () => subscription?.remove();
  }, []);

  // Photo viewer modal state
  const [photoViewerVisible, setPhotoViewerVisible] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  
  // Video player state
  const [videoPlayerVisible, setVideoPlayerVisible] = useState(false);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  
  
  // Photo scroll state
  const [currentPhotoScrollIndex, setCurrentPhotoScrollIndex] = useState(0);
  const photoScrollRef = useRef<any>(null);
  const modalPhotoScrollRef = useRef<any>(null);
  
  


  
  // Loading state for media (now handled in loadPropertyData)
  const [isLoadingMedia, setIsLoadingMedia] = useState(false);
  
  // Removed favorite state
  
  // Rating state
  const [userRating, setUserRating] = useState(0);
  const [userReview, setUserReview] = useState('');
  const [calculatedRating, setCalculatedRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);
  const [ratingModalVisible, setRatingModalVisible] = useState(false);
  const [tempRating, setTempRating] = useState(0);
  const [tempReview, setTempReview] = useState('');
  const [tempIsAnonymous, setTempIsAnonymous] = useState(false);
  


  // Property data state
  const [propertyData, setPropertyData] = useState({
    id: params.id as string || 'unknown',
    title: "Loading...",
    address: "Loading...",
    price: 0,
    rooms: 1,
    bathrooms: 0,
    size: 0,
    rating: 0,
    reviews: 0,
    amenities: [] as string[],
    photos: [] as string[],
    description: "Loading...",
    rules: [] as string[],
    ownerName: 'Loading...',
    businessName: '',
    contactNumber: 'Loading...',
    email: 'Loading...',
    ownerUserId: '',
    monthlyRent: 0,
    securityDeposit: 0,
    advanceDepositMonths: undefined as number | undefined,
    propertyType: 'Property',
    rentalType: 'Not specified',
    availabilityStatus: 'Available',
    leaseTerm: 'Not specified',
    paymentMethods: [] as string[],
    emergencyContact: '',
    videos: [] as string[],
    coverPhoto: '',
    publishedAt: '',
    capacity: undefined as number | undefined,
    occupiedSlots: undefined as number | undefined
  });

  // Loading state for property data
  const [isLoadingProperty, setIsLoadingProperty] = useState(true);

  // Check if this is an owner viewing their own listing
  const isOwnerView = params.isOwnerView === 'true';

  // Refresh property media when user logs in or media is refreshed
  const refreshPropertyMedia = useCallback(async () => {
    if (!params.id || params.id === 'unknown') return;
    
    try {
      console.log('🔄 Refreshing property media for listing:', params.id);
      
      // Clear expired cache first
      try {
        const { clearExpiredCachedPropertyMedia } = await import('@/utils/property-media-cache');
        await clearExpiredCachedPropertyMedia();
        console.log('✅ Cleared expired property media cache');
      } catch (cacheError) {
        console.log('⚠️ Could not clear expired cache:', cacheError);
      }
      
      // Reload property data with fresh media
      await loadPropertyData();
    } catch (error) {
      console.error('❌ Error refreshing property media:', error);
    }
  }, [params.id]);

  // Refresh all media on component mount for persistence
  useEffect(() => {
    const refreshAllMedia = async () => {
      try {
        const { refreshAllPropertyMedia } = await import('@/utils/media-storage');
        await refreshAllPropertyMedia();
        console.log('✅ All property media refreshed for persistence in preview');
      } catch (error) {
        console.log('⚠️ Could not refresh property media in preview:', error);
      }
    };
    
    refreshAllMedia();
  }, []);

  // Load property data from database
  const loadPropertyData = async () => {
    const propertyId = params.id as string;
    
    if (!propertyId || propertyId === 'unknown') {
      console.log('⚠️ No valid property ID, using fallback data');
      setIsLoadingProperty(false);
      return;
    }
    
    try {
      setIsLoadingProperty(true);
      console.log('🔍 Loading property data for ID:', propertyId);
      
      // Load the listing from published_listings table
      const listing = await db.get('published_listings', propertyId) as any;
      
      if (!listing) {
        console.log('❌ No listing found for ID:', propertyId);
        setIsLoadingProperty(false);
        return;
      }
      
      console.log('✅ Found listing:', {
        id: listing.id,
        title: listing.title,
        businessName: listing.businessName,
        address: listing.address,
        price: listing.price
      });
      
      // Load media data with caching
      const media = await loadPropertyMedia(propertyId, user?.id);
      console.log('📸 Loaded media:', {
        coverPhoto: !!media.coverPhoto,
        photosCount: media.photos.length,
        videosCount: media.videos.length,
        videos: media.videos
      });
      
      // Load capacity information
      const { getOccupiedSlots } = await import('@/utils/listing-capacity');
      const occupiedSlots = await getOccupiedSlots(propertyId);
      const capacity = listing.capacity || undefined;
      
      // Fallback to listing data if no media found in separate tables
      const fallbackPhotos = Array.isArray(listing.photos) ? listing.photos : [];
      const fallbackVideos = Array.isArray(listing.videos) ? listing.videos : [];
      const fallbackCoverPhoto = listing.coverPhoto || (fallbackPhotos.length > 0 ? fallbackPhotos[0] : null);
      
      console.log('📸 Fallback media from listing:', {
        coverPhoto: !!fallbackCoverPhoto,
        photosCount: fallbackPhotos.length
      });
      
      // Update property data with actual listing data
      setPropertyData({
        id: listing.id,
        title: listing.title || 'Property',
        address: listing.address || 'Address not provided',
        price: listing.price || 0,
        rooms: listing.rooms || listing.bedrooms || 1,
        bathrooms: listing.bathrooms || 0,
        size: listing.size || 0,
        rating: listing.rating || 0,
        reviews: listing.reviews || 0,
        amenities: Array.isArray(listing.amenities) ? listing.amenities : [],
        photos: media.photos.length > 0 ? media.photos : fallbackPhotos,
        description: listing.description || 'Property details not provided.',
        rules: Array.isArray(listing.rules) ? listing.rules : [],
        ownerName: listing.ownerName || 'Property Owner',
        businessName: listing.businessName || '',
        contactNumber: listing.contactNumber || 'Contact not provided',
        email: listing.email || 'Email not provided',
        ownerUserId: listing.ownerUserId || listing.userId || '',
        monthlyRent: listing.monthlyRent || listing.price || 0,
        securityDeposit: 0, // Security deposit feature removed
        advanceDepositMonths: listing.advanceDepositMonths || undefined,
        propertyType: listing.propertyType || 'Property',
        rentalType: listing.rentalType || 'Not specified',
        availabilityStatus: listing.availabilityStatus || 'Available',
        leaseTerm: listing.leaseTerm || 'Not specified',
        paymentMethods: Array.isArray(listing.paymentMethods) ? listing.paymentMethods : [],
        emergencyContact: listing.emergencyContact || '',
        videos: media.videos.length > 0 ? media.videos : fallbackVideos,
        coverPhoto: media.coverPhoto || fallbackCoverPhoto || (fallbackPhotos.length > 0 ? fallbackPhotos[0] : ''),
        publishedAt: listing.publishedAt || '',
        capacity: capacity,
        occupiedSlots: occupiedSlots
      });
      
      console.log('✅ Property data loaded successfully');
      
    } catch (error) {
      console.error('❌ Error loading property data:', error);
    } finally {
      setIsLoadingProperty(false);
    }
  };

  // Load rating data
  const loadRatingData = async () => {
    const propertyId = params.id as string;
    
    if (!propertyId || propertyId === 'unknown') {
      return;
    }
    
    try {
      // Calculate overall rating for the property
      const ratingData = await calculatePropertyRating(propertyId);
      setCalculatedRating(ratingData.averageRating);
      setTotalReviews(ratingData.totalReviews);
      
      // Get user's rating if authenticated
      if (isAuthenticated && user?.id) {
        const userRatingData = await getUserRatingForProperty(propertyId, user.id);
        if (userRatingData) {
          setUserRating(userRatingData.rating);
          setUserReview(userRatingData.review || '');
        }
      }
      
      console.log('✅ Rating data loaded:', {
        averageRating: ratingData.averageRating,
        totalReviews: ratingData.totalReviews,
        userRating: userRating
      });
    } catch (error) {
      console.error('❌ Error loading rating data:', error);
    }
  };
  
  // Handle star click - open rating modal
  const handleStarClick = async (newRating: number) => {
    if (!isAuthenticated || !user?.id) {
      Alert.alert('Login Required', 'Please login to rate this property');
      return;
    }
    
    if (isOwnerView) {
      Alert.alert('Not Allowed', 'Owners cannot rate their own properties');
      return;
    }
    
    // Set temp rating and review
    setTempRating(newRating);
    setTempReview(userReview || '');
    
    // Load existing anonymous preference if available
    try {
      const userRatingData = await getUserRatingForProperty(params.id as string, user.id);
      setTempIsAnonymous(userRatingData?.isAnonymous || false);
    } catch (error) {
      console.error('Error loading existing rating:', error);
      setTempIsAnonymous(false);
    }
    
    setRatingModalVisible(true);
  };

  // Handle rating submission with comment
  const handleRatingSubmit = async () => {
    if (!isAuthenticated || !user?.id) {
      Alert.alert('Login Required', 'Please login to rate this property');
      return;
    }
    
    if (isOwnerView) {
      Alert.alert('Not Allowed', 'Owners cannot rate their own properties');
      return;
    }
    
    if (tempRating === 0) {
      Alert.alert('Error', 'Please select a rating');
      return;
    }
    
    setIsSubmittingRating(true);
    
    try {
      const result = await rateProperty(
        params.id as string, 
        user.id, 
        tempRating,
        tempReview.trim() || undefined,
        tempIsAnonymous
      );
      
      if (result.success) {
        setUserRating(tempRating);
        setUserReview(tempReview.trim());
        setRatingModalVisible(false);
        Alert.alert('Success', result.message);
        // Reload rating data to update average
        await loadRatingData();
      } else {
        Alert.alert('Error', result.message);
      }
    } catch (error) {
      console.error('❌ Error submitting rating:', error);
      Alert.alert('Error', 'Failed to submit rating. Please try again.');
    } finally {
      setIsSubmittingRating(false);
    }
  };

  // Load property data when component mounts
  useEffect(() => {
    console.log('🔄 Property preview mounted - loading property data...');
    loadPropertyData();
    loadRatingData();
  }, [params.id]);

  // Force reload media when user logs in
  useEffect(() => {
    if (isAuthenticated && user?.id && params.id) {
      console.log('🔄 User logged in - force reloading property media...');
      // Clear cache and reload media
      clearCache().then(() => {
        loadPropertyData();
      });
    }
  }, [isAuthenticated, user?.id, params.id]);

  // Listen for property media refresh events
  useEffect(() => {
    const handlePropertyMediaRefreshed = (event: Event | any) => {
      console.log('🔄 Property media refreshed, reloading property details...', event?.detail);
      refreshPropertyMedia();
    };

    const handleUserLoggedIn = (event: Event | any) => {
      console.log('🔄 User logged in event, refreshing property media...', event?.detail);
      // Add a small delay to ensure all cache clearing is complete
      setTimeout(() => {
        refreshPropertyMedia();
      }, 500);
    };

    // Use cross-platform event listener utility
    const removeMediaRefreshed = addCustomEventListener('propertyMediaRefreshed', handlePropertyMediaRefreshed);
    const removeUserLoggedIn = addCustomEventListener('userLoggedIn', handleUserLoggedIn);
    console.log('👂 Property preview: Added media refresh and user login listeners');
    
    return () => {
      removeMediaRefreshed();
      removeUserLoggedIn();
      console.log('👂 Property preview: Removed media refresh and user login listeners');
    };
  }, [refreshPropertyMedia]);

  // Track view when component mounts (only for tenant views)
  useEffect(() => {
    const trackView = async () => {
      // Don't track views when owner is viewing their own listing
      if (isOwnerView) {
        console.log('👁️ Skipping view tracking - owner viewing own listing');
        return;
      }
      
      if (propertyData.id && propertyData.id !== 'unknown') {
        try {
          console.log('👁️ Tracking view for property:', propertyData.id);
          const result = await trackListingView(propertyData.id, user?.id, {
            source: 'property_preview',
            timestamp: new Date().toISOString(),
            isOwnerView: isOwnerView
          });
          
          if (result.success) {
            console.log('✅ View tracked successfully:', result.message);
          } else {
            console.log('⚠️ View tracking failed:', result.message);
          }
        } catch (error) {
          console.error('❌ Error tracking view:', error);
        }
      }
    };
    
    trackView();
  }, [propertyData.id, user?.id, isOwnerView]);


// Removed favorite status checking

// Reload media data when screen comes into focus (after login/logout)
useFocusEffect(
  useCallback(() => {
    if (params.id && params.id !== 'unknown') {
      console.log('🔄 Property preview focused - refreshing media data...');
      refreshPropertyMedia();
    }
  }, [params.id, refreshPropertyMedia])
);

// Listen for media refresh events

const ownerViewTitle = isOwnerView ? 'Your Property Preview' : 'Property Details';

// Debug: Log property data to see what's being passed
console.log('🔍 Property Preview Data:', {
  id: propertyData.id,
  coverPhoto: propertyData.coverPhoto,
  photos: propertyData.photos,
  title: propertyData.title,
  businessName: propertyData.businessName,
  propertyType: propertyData.propertyType,
  isOwnerView: isOwnerView
});

// Generate dynamic title showing business name or just property type and address
const displayTitle = propertyData.businessName 
  ? `${propertyData.businessName}'s ${propertyData.propertyType} in ${(propertyData.address || '').split(',')[0] || 'Property'}`
  : `${propertyData.propertyType} in ${(propertyData.address || '').split(',')[0] || 'Property'}`;

// Removed favorite toggle handler

const handleBooking = useCallback(async () => {
  console.log('🔴 Book Now button clicked!');
  
  if (!isAuthenticated || !user) {
    Alert.alert(
      'Authentication Required',
      'Please log in to book this property.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Login', onPress: () => router.push('/login') }
      ]
    );
    return;
  }

  // Check if user is trying to book their own property
  if (user.id === propertyData.ownerUserId) {
    Alert.alert('Cannot Book', 'You cannot book your own property.');
    return;
  }

  // Navigate to booking screen with property ID
  router.push(`/book-now?id=${propertyData.id}`);
}, [isAuthenticated, user, propertyData, router]);

// Photo viewer functions
const openPhotoViewer = (index: number) => {
  setCurrentPhotoIndex(index);
  setPhotoViewerVisible(true);
  // Scroll to the selected photo when modal opens
  setTimeout(() => {
    modalPhotoScrollRef.current?.scrollTo({
      x: index * dimensions.width,
      animated: false
    });
  }, 100);
};

const closePhotoViewer = () => {
  setPhotoViewerVisible(false);
};

const goToPreviousPhoto = () => {
  if (propertyData.photos && propertyData.photos.length > 0) {
    const newIndex = currentPhotoIndex === 0 ? propertyData.photos.length - 1 : currentPhotoIndex - 1;
    setCurrentPhotoIndex(newIndex);
    modalPhotoScrollRef.current?.scrollTo({
      x: newIndex * dimensions.width,
      animated: true
    });
  }
};

const goToNextPhoto = () => {
  if (propertyData.photos && propertyData.photos.length > 0) {
    const newIndex = currentPhotoIndex === propertyData.photos.length - 1 ? 0 : currentPhotoIndex + 1;
    setCurrentPhotoIndex(newIndex);
    modalPhotoScrollRef.current?.scrollTo({
      x: newIndex * dimensions.width,
      animated: true
    });
  }
};



  // Enhanced touch handlers for mobile swipe (photos)
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const [isSwipeActive, setIsSwipeActive] = useState(false);


  const handleTouchStart = (e: any) => {
    const touch = e.touches ? e.touches[0] : e;
    setTouchEnd(0);
    setTouchStart(touch.clientX);
    setIsSwipeActive(true);
  };

  const handleTouchMove = (e: any) => {
    if (!isSwipeActive) return;
    const touch = e.touches ? e.touches[0] : e;
    setTouchEnd(touch.clientX);
  };

  const handleTouchEnd = () => {
    if (!isSwipeActive || !touchStart || !touchEnd) {
      setIsSwipeActive(false);
      return;
    }
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe) {
      goToNextPhoto();
    }
    if (isRightSwipe) {
      goToPreviousPhoto();
    }
    
    setIsSwipeActive(false);
  };



  // Keyboard navigation (web only)
  useEffect(() => {
    // Only add keyboard listeners on web platform
    if (Platform.OS !== 'web') return;

    const handleKeyPress = (e: KeyboardEvent) => {
      if (!photoViewerVisible) return;
      
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          goToPreviousPhoto();
          break;
        case 'ArrowRight':
          e.preventDefault();
          goToNextPhoto();
          break;
        case 'Escape':
          e.preventDefault();
          closePhotoViewer();
          break;
      }
    };

    if (photoViewerVisible) {
      document.addEventListener('keydown', handleKeyPress);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, [photoViewerVisible]);

  return (
    <>
      <SafeAreaView style={styles.container}>
        {/* Modern Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ArrowLeft size={24} color="#374151" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{ownerViewTitle}</Text>
          <View style={styles.headerActions}>
            {isOwnerView && (
              <View style={styles.ownerBadge}>
                <Text style={styles.ownerBadgeText}>Owner</Text>
              </View>
            )}
          </View>
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Loading State */}
          {isLoadingProperty ? (
            <View style={styles.section}>
              <View style={styles.loadingCard}>
                <Text style={styles.loadingTitle}>🔄 Loading Property Details...</Text>
                <Text style={styles.loadingText}>
                  Please wait while we load the property information and photos.
                </Text>
              </View>
            </View>
          ) : (
            <>
              {/* Hero Image Section */}
              <View style={styles.heroSection}>
            <Image
              source={{ 
                uri: (() => {
                  let imageUri = propertyData.coverPhoto;
                  if (!imageUri && propertyData.photos && propertyData.photos.length > 0) {
                    imageUri = propertyData.photos[0];
                  }
                  // Ensure we return a string, not an array
                  return Array.isArray(imageUri) ? imageUri[0] : imageUri || '';
                })()
              }}
              style={styles.heroImage}
              resizeMode="cover"
            />
            
            {/* Image Overlay */}
            <View style={styles.imageOverlay}>
              {/* Status Badge */}
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>Available</Text>
              </View>
              
              {/* Rating Badge - Only show if there are ratings */}
              {calculatedRating > 0 && (
                <View style={styles.ratingBadge}>
                  <Star size={14} color="#F59E0B" fill="#F59E0B" />
                  <Text style={styles.ratingText}>
                    {calculatedRating.toFixed(1)} ({totalReviews})
                  </Text>
                </View>
              )}
              
              {/* Removed favorite button */}
            </View>
          </View>

          {/* Property Info Card */}
          <View style={[styles.propertyInfoCard, isMobile && styles.propertyInfoCardMobile]}>
            <View style={[styles.propertyHeader, isMobile && styles.propertyHeaderMobile]}>
              <Text style={[styles.propertyTitle, isMobile && styles.propertyTitleMobile]}>{displayTitle}</Text>
              {(() => {
                const monthlyRent = (propertyData.monthlyRent && propertyData.monthlyRent > 0) ? propertyData.monthlyRent : propertyData.price;
                return monthlyRent && monthlyRent > 0;
              })() && (
                <Text style={[styles.propertyPrice, isMobile && styles.propertyPriceMobile]}>
                  ₱{(() => {
                    const monthlyRent = (propertyData.monthlyRent && propertyData.monthlyRent > 0) ? propertyData.monthlyRent : propertyData.price;
                    return monthlyRent.toLocaleString();
                  })()}/month
                </Text>
              )}
            </View>
            
            <View style={styles.locationRow}>
              <MapPin size={16} color="#6B7280" />
              <Text style={[styles.locationText, isMobile && styles.locationTextMobile]}>{propertyData.address}</Text>
            </View>

            {/* Property Specifications */}
            <View style={styles.specificationsRow}>
              <View style={styles.specItem}>
                <Bed size={16} color="#10B981" />
                <Text style={styles.specText}>{propertyData.rooms || 0} room{(propertyData.rooms || 0) !== 1 ? 's' : ''}</Text>
              </View>
              <View style={styles.specItem}>
                <Bath size={16} color="#10B981" />
                <Text style={styles.specText}>{propertyData.bathrooms || 0} bath{(propertyData.bathrooms || 0) !== 1 ? 's' : ''}</Text>
              </View>
              {propertyData.capacity !== undefined && (
                <View style={styles.specItem}>
                  <Users size={16} color="#10B981" />
                  <Text style={styles.specText}>
                    {propertyData.occupiedSlots !== undefined 
                      ? `${propertyData.occupiedSlots}/${propertyData.capacity} slots`
                      : `${propertyData.capacity} slot${propertyData.capacity !== 1 ? 's' : ''}`
                    }
                  </Text>
                </View>
              )}
            </View>
          </View>
          
          {/* Description Section */}
          <View style={[styles.section, isMobile && styles.sectionMobile]}>
            <Text style={[styles.sectionTitle, isMobile && styles.sectionTitleMobile]}>Description</Text>
            <Text style={[styles.descriptionText, isMobile && styles.descriptionTextMobile]}>{propertyData.description}</Text>
          </View>

          {/* Amenities Section */}
          <View style={[styles.section, isMobile && styles.sectionMobile]}>
            <Text style={[styles.sectionTitle, isMobile && styles.sectionTitleMobile]}>Amenities</Text>
            <View style={styles.amenitiesGrid}>
              {propertyData.amenities.map((amenity: string, index: number) => (
                <View key={index} style={styles.amenityTag}>
                  <Text style={styles.amenityText}>{amenity}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Rating Section - Only show for tenants, not owners viewing their own listing */}
          {!isOwnerView && isAuthenticated && (
            <View style={[styles.section, isMobile && styles.sectionMobile]}>
              <View style={styles.ratingSection}>
                <View style={styles.ratingHeader}>
                  <Text style={[styles.sectionTitle, isMobile && styles.sectionTitleMobile]}>Rating & Reviews</Text>
                  {calculatedRating > 0 && (
                    <View style={styles.averageRatingBadge}>
                      <Star size={18} color="#F59E0B" fill="#F59E0B" />
                      <Text style={styles.averageRatingText}>{calculatedRating.toFixed(1)}</Text>
                      <Text style={styles.totalReviewsText}>({totalReviews} {totalReviews === 1 ? 'review' : 'reviews'})</Text>
                    </View>
                  )}
                </View>
                
                <View style={styles.ratingContent}>
                  <Text style={styles.ratingLabel}>
                    {userRating > 0 ? 'Your Rating:' : 'Rate this property:'}
                  </Text>
                  <StarRating
                    rating={userRating}
                    size={32}
                    interactive={true}
                    onRatingChange={handleStarClick}
                    color="#F59E0B"
                    inactiveColor="#D1D5DB"
                    style={styles.starRatingContainer}
                  />
                  {userRating === 0 && calculatedRating === 0 && (
                    <Text style={styles.noRatingText}>(No Rating)</Text>
                  )}
                  {userRating > 0 && (
                    <View style={styles.userRatingInfo}>
                      <Text style={styles.ratingFeedback}>
                        You rated this property {userRating} star{userRating !== 1 ? 's' : ''}
                      </Text>
                      {userReview && (
                        <View style={styles.userReviewContainer}>
                          <Text style={styles.userReviewLabel}>Your comment:</Text>
                          <Text style={styles.userReviewText}>{userReview}</Text>
                        </View>
                      )}
                      <TouchableOpacity 
                        onPress={async () => {
                          setTempRating(userRating);
                          setTempReview(userReview);
                          // Load existing anonymous preference
                          const userRatingData = await getUserRatingForProperty(params.id as string, user?.id || '');
                          setTempIsAnonymous(userRatingData?.isAnonymous || false);
                          setRatingModalVisible(true);
                        }}
                        style={styles.editRatingButton}
                      >
                        <Text style={styles.editRatingText}>Edit Rating</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                  {isSubmittingRating && (
                    <Text style={styles.submittingText}>Submitting your rating...</Text>
                  )}
                </View>
              </View>
            </View>
          )}

          {/* Display overall rating for owner view or non-authenticated users */}
          {(isOwnerView || !isAuthenticated) && (
            <View style={[styles.section, isMobile && styles.sectionMobile]}>
              <View style={styles.ratingSection}>
                <View style={styles.ratingHeader}>
                  <Text style={[styles.sectionTitle, isMobile && styles.sectionTitleMobile]}>Rating & Reviews</Text>
                  {totalReviews > 0 && (
                    <View style={styles.averageRatingBadge}>
                      <Star size={18} color="#F59E0B" fill="#F59E0B" />
                      <Text style={styles.averageRatingText}>{calculatedRating.toFixed(1)}</Text>
                      <Text style={styles.totalReviewsText}>({totalReviews} {totalReviews === 1 ? 'review' : 'reviews'})</Text>
                    </View>
                  )}
                </View>
                {totalReviews > 0 ? (
                  <StarRating
                    rating={calculatedRating}
                    size={28}
                    interactive={false}
                    showCount={false}
                    color="#F59E0B"
                    inactiveColor="#D1D5DB"
                    style={styles.starRatingContainer}
                  />
                ) : (
                  <Text style={styles.noRatingText}>(No Rating)</Text>
                )}
              </View>
            </View>
          )}

          {/* House Rules Section - Only show if rules exist */}
          {propertyData.rules && Array.isArray(propertyData.rules) && propertyData.rules.length > 0 && propertyData.rules.some((rule: string) => rule && rule.trim() !== '') && (
            <View style={[styles.section, isMobile && styles.sectionMobile]}>
              <Text style={[styles.sectionTitle, isMobile && styles.sectionTitleMobile]}>House Rules</Text>
              <View style={styles.rulesList}>
                {propertyData.rules
                  .filter((rule: string) => rule && rule.trim() !== '')
                  .map((rule: string, index: number) => (
                    <View key={index} style={styles.ruleItem}>
                      <Text style={styles.ruleBullet}>•</Text>
                      <Text style={styles.ruleText}>{rule}</Text>
                    </View>
                  ))}
              </View>
            </View>
          )}

          {/* Rental Details Section */}
          {(() => {
            const monthlyRent = (propertyData.monthlyRent && propertyData.monthlyRent > 0) ? propertyData.monthlyRent : propertyData.price;
            return (monthlyRent && monthlyRent > 0) ||
              (propertyData.advanceDepositMonths && propertyData.advanceDepositMonths > 0) ||
              (propertyData.availabilityStatus && propertyData.availabilityStatus.trim() !== '') ||
              (propertyData.paymentMethods && propertyData.paymentMethods.length > 0);
          })() && (
            <View style={[styles.rentalDetailsCard, isMobile && styles.rentalDetailsCardMobile]}>
              <Text style={[styles.sectionTitle, isMobile && styles.sectionTitleMobile]}>Rental Details</Text>
              <View style={styles.rentalDetailsList}>
                {(() => {
                  const monthlyRent = (propertyData.monthlyRent && propertyData.monthlyRent > 0) ? propertyData.monthlyRent : propertyData.price;
                  return monthlyRent && monthlyRent > 0;
                })() && (
                  <View style={[styles.rentalDetailItem, isMobile && styles.rentalDetailItemMobile]}>
                    <Text style={[styles.rentalDetailLabel, isMobile && styles.rentalDetailLabelMobile]}>Monthly Rent:</Text>
                    <Text style={[styles.rentalDetailValue, isMobile && styles.rentalDetailValueMobile]}>
                      ₱{(() => {
                        const monthlyRent = (propertyData.monthlyRent && propertyData.monthlyRent > 0) ? propertyData.monthlyRent : propertyData.price;
                        return monthlyRent.toLocaleString();
                      })()}
                    </Text>
                  </View>
                )}
                {propertyData.advanceDepositMonths && propertyData.advanceDepositMonths > 0 && (
                  <View style={[styles.rentalDetailItem, isMobile && styles.rentalDetailItemMobile]}>
                    <Text style={[styles.rentalDetailLabel, isMobile && styles.rentalDetailLabelMobile]}>
                      Advance Deposit ({propertyData.advanceDepositMonths} {propertyData.advanceDepositMonths === 1 ? 'month' : 'months'}):
                    </Text>
                    <Text style={[styles.rentalDetailValue, isMobile && styles.rentalDetailValueMobile]}>
                      ₱{((propertyData.advanceDepositMonths || 0) * ((propertyData.monthlyRent && propertyData.monthlyRent > 0) ? propertyData.monthlyRent : propertyData.price || 0)).toLocaleString()}
                    </Text>
                  </View>
                )}
                {propertyData.advanceDepositMonths && propertyData.advanceDepositMonths > 0 && (
                  <View style={[styles.rentalDetailItem, isMobile && styles.rentalDetailItemMobile]}>
                    <Text style={[styles.rentalDetailLabel, isMobile && styles.rentalDetailLabelMobile]}>Total First Payment:</Text>
                    <Text style={[styles.rentalDetailValue, isMobile && styles.rentalDetailValueMobile]}>
                      ₱{(((propertyData.monthlyRent && propertyData.monthlyRent > 0) ? propertyData.monthlyRent : propertyData.price || 0) + ((propertyData.advanceDepositMonths || 0) * ((propertyData.monthlyRent && propertyData.monthlyRent > 0) ? propertyData.monthlyRent : propertyData.price || 0))).toLocaleString()}
                    </Text>
                  </View>
                )}
                {propertyData.availabilityStatus && propertyData.availabilityStatus.trim() !== '' && (
                  <View style={[styles.rentalDetailItem, isMobile && styles.rentalDetailItemMobile]}>
                    <Text style={[styles.rentalDetailLabel, isMobile && styles.rentalDetailLabelMobile]}>Availability:</Text>
                    <Text style={[styles.availabilityStatus, isMobile && styles.rentalDetailValueMobile]}>{propertyData.availabilityStatus}</Text>
                  </View>
                )}
                {propertyData.paymentMethods && propertyData.paymentMethods.length > 0 && (
                  <View style={[styles.rentalDetailItem, isMobile && styles.rentalDetailItemMobile]}>
                    <Text style={[styles.rentalDetailLabel, isMobile && styles.rentalDetailLabelMobile]}>Payment Methods:</Text>
                    <Text style={[styles.rentalDetailValue, isMobile && styles.rentalDetailValueMobile]}>
                      {propertyData.paymentMethods.join(', ')}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Enhanced Photo Gallery */}
          {isLoadingMedia ? (
            <View style={[styles.section, isMobile && styles.sectionMobile]}>
              <View style={styles.loadingCard}>
                <Text style={styles.loadingTitle}>📸 Loading Photos...</Text>
                <Text style={styles.loadingText}>
                  Loading photos from the database. Please wait...
                </Text>
              </View>
            </View>
          ) : (() => {
            console.log('🔍 Photo gallery condition check:', {
              isLoadingMedia,
              photosCount: propertyData.photos?.length || 0,
              photos: propertyData.photos,
              coverPhoto: propertyData.coverPhoto
            });
            return propertyData.photos && propertyData.photos.length > 0;
          })() ? (
            <View style={[styles.section, isMobile && styles.sectionMobile]}>
              <Text style={[styles.sectionTitle, isMobile && styles.sectionTitleMobile]}>
                📸 Property Photos ({propertyData.photos.length})
              </Text>
              <View style={styles.photoGalleryContainer}>
                <ScrollView 
                  ref={photoScrollRef}
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  style={styles.photoScrollView}
                  contentContainerStyle={styles.photoScrollContent}
                  decelerationRate="fast"
                  snapToInterval={isMobile ? screenWidth * 0.75 + 16 : screenWidth * 0.6 + 16}
                  snapToAlignment="start"
                  pagingEnabled={false}
                  bounces={true}
                  alwaysBounceHorizontal={true}
                  scrollEventThrottle={16}
                  directionalLockEnabled={true}
                  disableIntervalMomentum={false}
                  scrollEnabled={true}
                  nestedScrollEnabled={true}
                  onScroll={(event) => {
                    const scrollX = event.nativeEvent.contentOffset.x;
                    const photoWidth = isMobile ? screenWidth * 0.75 + 16 : screenWidth * 0.6 + 16;
                    const currentIndex = Math.round(scrollX / photoWidth);
                    setCurrentPhotoScrollIndex(Math.min(currentIndex, propertyData.photos.length - 1));
                  }}
                  onScrollEndDrag={(event) => {
                    const scrollX = event.nativeEvent.contentOffset.x;
                    const photoWidth = isMobile ? screenWidth * 0.75 + 16 : screenWidth * 0.6 + 16;
                    const currentIndex = Math.round(scrollX / photoWidth);
                    const targetX = currentIndex * photoWidth;
                    photoScrollRef.current?.scrollTo({ x: targetX, animated: true });
                  }}
                >
                  {propertyData.photos.map((photo: string, index: number) => (
                    <TouchableOpacity 
                      key={index} 
                      style={[styles.photoItem, isMobile && styles.photoItemMobile]}
                      onPress={() => openPhotoViewer(index)}
                      activeOpacity={0.7}
                      delayPressIn={200}
                    >
                      <Image
                        source={{ uri: photo }}
                        style={styles.photoImage}
                        resizeMode="cover"
                      />
                      <View style={styles.photoIndicator}>
                        <Text style={styles.photoIndicatorText}>{index + 1}/{propertyData.photos.length}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
          ) : (
            <View style={[styles.section, isMobile && styles.sectionMobile]}>
              <View style={styles.noPhotosCard}>
                <Text style={styles.noPhotosTitle}>📸 No Photos Available</Text>
                <Text style={styles.noPhotosText}>
                  Photos for this property are currently being processed or may not have been uploaded yet.
                </Text>
              </View>
            </View>
          )}

          {/* Video Gallery */}
          <VideoGallery 
            videos={propertyData.videos}
            onVideoPress={(index) => {
              console.log('Opening video at index:', index, 'Video URL:', propertyData.videos[index]);
              setCurrentVideoIndex(index);
              setVideoPlayerVisible(true);
            }}
          />

          {/* Contact Info */}
          <View style={[styles.contactCard, isMobile && styles.contactCardMobile]}>
            <Text style={styles.contactTitle}>Contact Information</Text>
            <View style={styles.contactInfo}>
              <View style={[styles.contactInfoCard, isMobile && styles.contactInfoCardMobile]}>
                <Text style={styles.contactTextBold}>Owner: {propertyData.ownerName}</Text>
                {propertyData.businessName && (
                  <Text style={styles.contactText}>Business: {propertyData.businessName}</Text>
                )}
                <Text style={styles.contactText}>Phone: {propertyData.contactNumber}</Text>
                <Text style={styles.contactText}>Email: {propertyData.email}</Text>
                {propertyData.emergencyContact && (
                  <Text style={styles.contactText}>Emergency Contact: {propertyData.emergencyContact}</Text>
                )}
              </View>
            </View>
          </View>

          {/* Action Buttons */}
          {!isOwnerView && (
            <View style={[styles.actionButtonsContainer, isMobile && styles.actionButtonsContainerMobile]}>
              <TouchableOpacity 
                style={[styles.messageButton, isMobile && styles.messageButtonMobile]}
                onPress={async () => {
                  if (!user?.id) {
                    Alert.alert('Please log in', 'You need to be logged in to message the owner.');
                    return;
                  }
                  
                  try {
                    console.log('💬 Starting conversation with owner from property preview:', propertyData.ownerUserId);
                    
                    // Check if ownerUserId is valid
                    if (!propertyData.ownerUserId) {
                      console.error('❌ No ownerUserId found in property data');
                      Alert.alert('Error', 'Unable to identify property owner. Please try again.');
                      return;
                    }
                    
                    // Track inquiry
                    await trackListingInquiry(propertyData.id, user.id, 'message');
                    
                    // Get owner display name (business name or owner name)
                    const ownerDisplayName = propertyData.businessName || propertyData.ownerName || 'Property Owner';
                    
                    // Import conversation utility
                    const { createOrFindConversation } = await import('@/utils/conversation-utils');
                    
                    // Create or find conversation using utility
                    const conversationId = await createOrFindConversation({
                      ownerId: propertyData.ownerUserId,
                      tenantId: user.id,
                      ownerName: ownerDisplayName,
                      tenantName: user.name || 'Tenant',
                      propertyId: propertyData.id,
                      propertyTitle: propertyData.title
                    });
                    
                    console.log('✅ Created/found conversation:', conversationId);
                    
                    // Navigate to conversation with correct parameters
                    router.push({
                      pathname: '/chat-room',
                      params: {
                        conversationId: conversationId,
                        ownerName: ownerDisplayName,
                        ownerAvatar: '', // We don't have owner avatar in property data
                        propertyTitle: propertyData.title
                      }
                    });
                  } catch (error) {
                    console.error('❌ Error starting conversation:', error);
                    Alert.alert('Error', 'Failed to start conversation. Please try again.');
                  }
                }}
              >
                <MessageCircle size={20} color="#FFFFFF" />
                <Text style={[styles.messageButtonText, isMobile && styles.messageButtonTextMobile]}>Message Owner</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.bookButton, isMobile && styles.bookButtonMobile]}
                onPress={async () => {
                  if (!user?.id) {
                    Alert.alert('Please log in', 'You need to be logged in to book this property.');
                    return;
                  }
                  
                  try {
                    await trackListingInquiry(propertyData.id, user.id, 'booking_request');
                    router.push(`/book-now?id=${propertyData.id}`);
                  } catch (error) {
                    console.error('Error tracking inquiry:', error);
                    router.push(`/book-now?id=${propertyData.id}`);
                  }
                }}
              >
                <Calendar size={20} color="#FFFFFF" />
                <Text style={[styles.bookButtonText, isMobile && styles.bookButtonTextMobile]}>Book Now</Text>
              </TouchableOpacity>
            </View>
          )}
            </>
          )}
        </ScrollView>

      {/* Professional Photo Viewer Modal */}
      <Modal
        visible={photoViewerVisible}
        transparent={false}
        animationType="fade"
        presentationStyle="fullScreen"
        onRequestClose={closePhotoViewer}
      >
        <View style={styles.modalContainer}>
          {/* Clean Professional Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={closePhotoViewer}
              style={styles.modalCloseButton}
            >
              <X size={20} color="white" />
            </TouchableOpacity>
            
            <View style={styles.modalCounter}>
              <Text style={styles.modalCounterText}>
                {currentPhotoIndex + 1} / {propertyData.photos?.length || 0}
              </Text>
            </View>
            
            <View style={styles.modalSpacer} />
          </View>

          {/* Professional Photo Display with ScrollView */}
          <ScrollView
            ref={modalPhotoScrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            style={styles.modalPhotoScrollView}
            contentContainerStyle={styles.modalPhotoScrollContent}
            onMomentumScrollEnd={(event) => {
              const offsetX = event.nativeEvent.contentOffset.x;
              const index = Math.round(offsetX / dimensions.width);
              setCurrentPhotoIndex(index);
            }}
          >
            {propertyData.photos && Array.isArray(propertyData.photos) && propertyData.photos.map((photo: string, index: number) => (
              <View key={index} style={[styles.modalPhotoItem, { width: dimensions.width, height: dimensions.height }]}>
                <Image
                  source={{ uri: photo }}
                  style={styles.modalImage}
                  resizeMode="contain"
                />
              </View>
            ))}
          </ScrollView>

          {/* Modern Navigation Dots */}
          {propertyData.photos && propertyData.photos.length > 1 && (
            <View style={styles.modalControls}>
              <View style={styles.modalDotsContainer}>
                {propertyData.photos.map((_: string, index: number) => (
                  <TouchableOpacity
                    key={index}
                    onPress={() => {
                      setCurrentPhotoIndex(index);
                      modalPhotoScrollRef.current?.scrollTo({
                        x: index * dimensions.width,
                        animated: true
                      });
                    }}
                    style={[
                      styles.modalDot,
                      index === currentPhotoIndex && styles.modalDotActive
                    ]}
                  />
                ))}
              </View>
            </View>
          )}
        </View>
      </Modal>

      {/* Video Player */}
      <PropertyVideoPlayer
        videos={propertyData.videos}
        visible={videoPlayerVisible}
        onClose={() => setVideoPlayerVisible(false)}
        initialIndex={currentVideoIndex}
      />

      {/* Rating Modal with Comment */}
      <Modal
        visible={ratingModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setRatingModalVisible(false)}
      >
        <View style={styles.ratingModalOverlay}>
          <View style={[styles.ratingModalContent, isMobile && styles.ratingModalContentMobile]}>
            <View style={styles.ratingModalHeader}>
              <Text style={styles.ratingModalTitle}>Rate this Property</Text>
              <TouchableOpacity
                onPress={() => setRatingModalVisible(false)}
                style={styles.ratingModalCloseButton}
              >
                <X size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.ratingModalBody}>
              <Text style={styles.ratingModalLabel}>Your Rating:</Text>
              <StarRating
                rating={tempRating}
                size={40}
                interactive={true}
                onRatingChange={setTempRating}
                color="#F59E0B"
                inactiveColor="#D1D5DB"
                style={styles.ratingModalStars}
              />

              <Text style={[styles.ratingModalLabel, styles.ratingModalLabelTop]}>
                Add a comment (optional):
              </Text>
              <TextInput
                style={styles.ratingModalTextInput}
                multiline
                numberOfLines={4}
                placeholder="Share your experience with this property..."
                placeholderTextColor="#9CA3AF"
                value={tempReview}
                onChangeText={(text) => {
                  if (text.length <= 500) {
                    setTempReview(text);
                  }
                }}
                maxLength={500}
                textAlignVertical="top"
              />
              <Text style={styles.ratingModalCharCount}>
                {tempReview.length} / 500 characters
              </Text>

              {/* Anonymous Option */}
              <View style={styles.anonymousOptionContainer}>
                <View style={styles.anonymousOptionContent}>
                  <View style={styles.anonymousOptionInfo}>
                    <EyeOff size={20} color="#6B7280" />
                    <View style={styles.anonymousOptionTextContainer}>
                      <Text style={styles.anonymousOptionLabel}>Post as Anonymous</Text>
                      <Text style={styles.anonymousOptionDescription}>
                        Your name will not be shown with this rating
                      </Text>
                    </View>
                  </View>
                  <Switch
                    value={tempIsAnonymous}
                    onValueChange={setTempIsAnonymous}
                    trackColor={{ false: '#D1D5DB', true: '#3B82F6' }}
                    thumbColor="#FFFFFF"
                    ios_backgroundColor="#D1D5DB"
                  />
                </View>
              </View>
            </View>

            <View style={styles.ratingModalFooter}>
              <TouchableOpacity
                onPress={() => setRatingModalVisible(false)}
                style={[styles.ratingModalButton, styles.ratingModalCancelButton]}
                disabled={isSubmittingRating}
              >
                <Text style={styles.ratingModalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleRatingSubmit}
                style={[styles.ratingModalButton, styles.ratingModalSubmitButton]}
                disabled={isSubmittingRating || tempRating === 0}
              >
                {isSubmittingRating ? (
                  <Text style={styles.ratingModalSubmitText}>Submitting...</Text>
                ) : (
                  <Text style={styles.ratingModalSubmitText}>Submit Rating</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

        </SafeAreaView>
      </>
    );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerActionButton: {
    padding: 8,
    marginLeft: 4,
  },
  ownerBadge: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  ownerBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  heroSection: {
    height: 300,
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    padding: 16,
  },
  statusBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-end',
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  ratingBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginLeft: 4,
  },
  ratingCount: {
    color: '#6B7280',
  },
  // Removed favorite button styles
  propertyInfoCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  propertyInfoCardMobile: {
    margin: 12,
    padding: 16,
  },
  propertyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  propertyHeaderMobile: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 8,
  },
  propertyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
    marginRight: 12,
  },
  propertyTitleMobile: {
    fontSize: 18,
    flex: 0,
    marginRight: 0,
    lineHeight: 26,
  },
  propertyPrice: {
    fontSize: 24,
    fontWeight: '700',
    color: '#10B981',
  },
  propertyPriceMobile: {
    fontSize: 20,
    alignSelf: 'flex-start',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  locationText: {
    fontSize: 16,
    color: '#6B7280',
    marginLeft: 8,
    flex: 1,
    flexWrap: 'wrap',
  },
  locationTextMobile: {
    fontSize: 14,
  },
  specificationsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  specItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  specText: {
    fontSize: 14,
    color: '#374151',
    marginLeft: 6,
    fontWeight: '500',
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionMobile: {
    padding: 16,
    marginHorizontal: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  sectionTitleMobile: {
    fontSize: 16,
    marginBottom: 10,
  },
  descriptionText: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 24,
  },
  descriptionTextMobile: {
    fontSize: 14,
    lineHeight: 22,
  },
  amenitiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  amenityTag: {
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  amenityText: {
    fontSize: 14,
    color: '#10B981',
    fontWeight: '500',
  },
  rulesList: {
    gap: 8,
  },
  ruleItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  ruleBullet: {
    fontSize: 16,
    color: '#6B7280',
    marginRight: 8,
    marginTop: 2,
  },
  ruleText: {
    fontSize: 16,
    color: '#374151',
    flex: 1,
    lineHeight: 22,
  },
  rentalDetailsCard: {
    backgroundColor: '#F0F9FF',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E0F2FE',
  },
  rentalDetailsCardMobile: {
    marginHorizontal: 12,
    padding: 16,
  },
  rentalDetailsList: {
    gap: 12,
  },
  rentalDetailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
  },
  rentalDetailItemMobile: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 4,
  },
  rentalDetailLabel: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
    flexShrink: 0,
    marginRight: 8,
  },
  rentalDetailLabelMobile: {
    fontSize: 14,
    marginRight: 0,
  },
  rentalDetailValue: {
    fontSize: 16,
    color: '#10B981',
    fontWeight: '600',
    flex: 1,
    flexShrink: 1,
    textAlign: 'right',
  },
  rentalDetailValueMobile: {
    fontSize: 14,
    flex: 0,
    flexShrink: 1,
    textAlign: 'left',
    width: '100%',
  },
  availabilityStatus: {
    fontSize: 16,
    color: '#10B981',
    fontWeight: '600',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 24,
    gap: 12,
  },
  actionButtonsContainerMobile: {
    marginHorizontal: 12,
    marginBottom: 20,
    gap: 8,
  },
  messageButton: {
    flex: 1,
    backgroundColor: '#10B981',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  messageButtonMobile: {
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  messageButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  messageButtonTextMobile: {
    fontSize: 14,
    marginLeft: 6,
  },
  bookButton: {
    flex: 1,
    backgroundColor: '#3B82F6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  bookButtonMobile: {
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  bookButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  bookButtonTextMobile: {
    fontSize: 14,
    marginLeft: 6,
  },
  loadingCard: {
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 12,
    padding: 16,
  },
  loadingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E40AF',
    marginBottom: 8,
  },
  loadingText: {
    fontSize: 14,
    color: '#1D4ED8',
  },
  photoGalleryContainer: {
    position: 'relative',
  },
  photoScrollView: {
    flexDirection: 'row',
  },
  photoScrollContent: {
    paddingRight: 16,
    paddingLeft: 4,
  },
  photoItem: {
    marginRight: 16,
    position: 'relative',
    width: 240,
    height: 200,
  },
  photoItemMobile: {
    width: 280,
    height: 220,
  },
  photoImage: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
  },
  photoIndicator: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  photoIndicatorText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  noPhotosCard: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
  },
  noPhotosTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 8,
  },
  noPhotosText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  contactCard: {
    backgroundColor: '#F9FAFB',
    padding: 24,
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  contactCardMobile: {
    padding: 16,
    marginHorizontal: 12,
  },
  contactTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
    textAlign: 'center',
  },
  contactInfo: {
    alignItems: 'center',
  },
  contactInfoCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    width: '100%',
    maxWidth: 400,
  },
  contactInfoCardMobile: {
    padding: 12,
    maxWidth: '100%',
  },
  contactText: {
    fontSize: 16,
    color: '#374151',
    marginBottom: 12,
    textAlign: 'center',
  },
  contactTextBold: {
    fontSize: 16,
    color: '#374151',
    marginBottom: 12,
    textAlign: 'center',
    fontWeight: '500',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
  },
  modalHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 16,
    zIndex: 1000,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 8,
  },
  modalCloseButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    zIndex: 1001,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  modalCounter: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    zIndex: 1001,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  modalCounterText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  modalSpacer: {
    width: 40,
  },
  modalPhotoContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 80,
    marginBottom: 120,
  },
  modalPhotoScrollView: {
    flex: 1,
    width: '100%',
  },
  modalPhotoScrollContent: {
    alignItems: 'center',
  },
  modalPhotoItem: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalImage: {
    width: '90%',
    height: '90%',
    maxWidth: '100%',
    maxHeight: '100%',
  },
  modalControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    zIndex: 1000,
  },
  modalDotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 0,
  },
  modalDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  modalDotActive: {
    width: 36,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  ratingSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  ratingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  averageRatingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  averageRatingText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#92400E',
    marginLeft: 4,
  },
  totalReviewsText: {
    fontSize: 14,
    color: '#92400E',
    marginLeft: 4,
  },
  ratingContent: {
    alignItems: 'flex-start',
  },
  ratingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  starRatingContainer: {
    marginVertical: 8,
  },
  ratingFeedback: {
    fontSize: 14,
    color: '#059669',
    marginTop: 8,
    fontWeight: '500',
  },
  submittingText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
    fontStyle: 'italic',
  },
  noRatingText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
    fontStyle: 'italic',
  },
  userRatingInfo: {
    marginTop: 12,
    width: '100%',
  },
  userReviewContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  userReviewLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
    marginBottom: 6,
  },
  userReviewText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  editRatingButton: {
    marginTop: 12,
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  editRatingText: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '600',
  },
  // Rating Modal Styles
  ratingModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  ratingModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '100%',
    maxWidth: 500,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  ratingModalContentMobile: {
    maxWidth: '100%',
    maxHeight: '90%',
  },
  ratingModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  ratingModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  ratingModalCloseButton: {
    padding: 4,
  },
  ratingModalBody: {
    padding: 20,
  },
  ratingModalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  ratingModalLabelTop: {
    marginTop: 24,
  },
  ratingModalStars: {
    marginBottom: 8,
  },
  ratingModalTextInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#111827',
    minHeight: 120,
    backgroundColor: '#F9FAFB',
    marginTop: 8,
  },
  ratingModalCharCount: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 6,
    textAlign: 'right',
  },
  anonymousOptionContainer: {
    marginTop: 24,
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  anonymousOptionContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  anonymousOptionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  anonymousOptionTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  anonymousOptionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  anonymousOptionDescription: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 16,
  },
  ratingModalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  ratingModalButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  ratingModalCancelButton: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  ratingModalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  ratingModalSubmitButton: {
    backgroundColor: '#3B82F6',
  },
  ratingModalSubmitText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});


