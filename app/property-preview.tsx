import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ScrollView, View, Text, TouchableOpacity, Image, Alert, Modal, Dimensions, Platform, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Video, ResizeMode } from 'expo-av';
import { ArrowLeft, MapPin, Bed, Bath, Star, Calendar, CheckCircle, X, ChevronLeft, ChevronRight, Play, Pause, MessageCircle } from 'lucide-react-native';
// Removed video components import - functionality removed
import { useAuth } from '@/context/AuthContext';
import { db, clearCache } from '@/utils/db';
// Removed favorite functionality
import { trackListingView } from '@/utils/view-tracking';
import { trackListingInquiry } from '@/utils/inquiry-tracking';
import { loadPropertyMedia } from '@/utils/media-storage';
import StarRating from '@/components/ratings/StarRating';
import { rateProperty, getUserRatingForProperty, calculatePropertyRating } from '@/utils/property-ratings';

export default function PropertyPreviewScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user, isAuthenticated } = useAuth();
  const { width: screenWidth } = Dimensions.get('window');

  // Photo viewer modal state
  const [photoViewerVisible, setPhotoViewerVisible] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  
  
  // Photo scroll state
  const [currentPhotoScrollIndex, setCurrentPhotoScrollIndex] = useState(0);
  const photoScrollRef = useRef<any>(null);
  
  // Video player state
  const [videoViewerVisible, setVideoViewerVisible] = useState(false);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const videoRef = useRef<Video>(null);
  
  // Loading state for media (now handled in loadPropertyData)
  const [isLoadingMedia, setIsLoadingMedia] = useState(false);
  
  // Removed favorite state
  
  // Rating state
  const [userRating, setUserRating] = useState(0);
  const [calculatedRating, setCalculatedRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);
  


  // Property data state
  const [propertyData, setPropertyData] = useState({
    id: params.id as string || 'unknown',
    title: "Loading...",
    address: "Loading...",
    price: 0,
    rooms: 1,
    bedrooms: 0,
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
    securityDeposit: undefined as number | undefined,
    propertyType: 'Property',
    rentalType: 'Not specified',
    availabilityStatus: 'Available',
    leaseTerm: 'Not specified',
    paymentMethods: [] as string[],
    emergencyContact: '',
    videos: [] as string[],
    coverPhoto: '',
    publishedAt: ''
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
        videosCount: media.videos.length
      });
      
      // Fallback to listing data if no media found in separate tables
      const fallbackPhotos = Array.isArray(listing.photos) ? listing.photos : [];
      const fallbackVideos = Array.isArray(listing.videos) ? listing.videos : [];
      const fallbackCoverPhoto = listing.coverPhoto || (fallbackPhotos.length > 0 ? fallbackPhotos[0] : null);
      
      console.log('📸 Fallback media from listing:', {
        coverPhoto: !!fallbackCoverPhoto,
        photosCount: fallbackPhotos.length,
        videosCount: fallbackVideos.length
      });
      
      // Update property data with actual listing data
      setPropertyData({
        id: listing.id,
        title: listing.title || 'Property',
        address: listing.address || 'Address not provided',
        price: listing.price || 0,
        rooms: listing.rooms || 1,
        bedrooms: listing.bedrooms || 0,
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
        securityDeposit: listing.securityDeposit || undefined,
        propertyType: listing.propertyType || 'Property',
        rentalType: listing.rentalType || 'Not specified',
        availabilityStatus: listing.availabilityStatus || 'Available',
        leaseTerm: listing.leaseTerm || 'Not specified',
        paymentMethods: Array.isArray(listing.paymentMethods) ? listing.paymentMethods : [],
        emergencyContact: listing.emergencyContact || '',
        videos: media.videos.length > 0 ? media.videos : fallbackVideos,
        coverPhoto: media.coverPhoto || fallbackCoverPhoto || (fallbackPhotos.length > 0 ? fallbackPhotos[0] : ''),
        publishedAt: listing.publishedAt || ''
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
  
  // Handle rating submission
  const handleRatingSubmit = async (newRating: number) => {
    if (!isAuthenticated || !user?.id) {
      Alert.alert('Login Required', 'Please login to rate this property');
      return;
    }
    
    if (isOwnerView) {
      Alert.alert('Not Allowed', 'Owners cannot rate their own properties');
      return;
    }
    
    setIsSubmittingRating(true);
    
    try {
      const result = await rateProperty(params.id as string, user.id, newRating);
      
      if (result.success) {
        setUserRating(newRating);
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
    const handlePropertyMediaRefreshed = (event: Event) => {
      console.log('🔄 Property media refreshed, reloading property details...', (event as any).detail);
      refreshPropertyMedia();
    };

    const handleUserLoggedIn = (event: Event) => {
      console.log('🔄 User logged in event, refreshing property media...', (event as any).detail);
      // Add a small delay to ensure all cache clearing is complete
      setTimeout(() => {
        refreshPropertyMedia();
      }, 500);
    };

    if (typeof window !== 'undefined') {
      if (typeof window !== 'undefined' && window.addEventListener) {
        window.addEventListener('propertyMediaRefreshed', handlePropertyMediaRefreshed);
        window.addEventListener('userLoggedIn', handleUserLoggedIn);
      }
      console.log('👂 Property preview: Added media refresh and user login listeners');
      
      return () => {
        if (typeof window !== 'undefined' && window.removeEventListener) {
          window.removeEventListener('propertyMediaRefreshed', handlePropertyMediaRefreshed);
          window.removeEventListener('userLoggedIn', handleUserLoggedIn);
          console.log('👂 Property preview: Removed media refresh and user login listeners');
        }
      };
    }
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
};

const closePhotoViewer = () => {
  setPhotoViewerVisible(false);
};

const goToPreviousPhoto = () => {
  if (propertyData.photos && propertyData.photos.length > 0) {
    setCurrentPhotoIndex((prev) => 
      prev === 0 ? propertyData.photos.length - 1 : prev - 1
    );
  }
};

const goToNextPhoto = () => {
  if (propertyData.photos && propertyData.photos.length > 0) {
    setCurrentPhotoIndex((prev) =>
      prev === propertyData.photos.length - 1 ? 0 : prev + 1
    );
  }
};

// Video player functions
const openVideoViewer = (index: number) => {
  setCurrentVideoIndex(index);
  setVideoViewerVisible(true);
  setIsVideoPlaying(true);
};

const closeVideoViewer = () => {
  setVideoViewerVisible(false);
  setIsVideoPlaying(false);
  if (videoRef.current) {
    videoRef.current.pauseAsync();
  }
};

const goToPreviousVideo = () => {
  if (propertyData.videos && propertyData.videos.length > 0) {
    setCurrentVideoIndex((prev) => 
      prev === 0 ? propertyData.videos.length - 1 : prev - 1
    );
  }
};

const goToNextVideo = () => {
  if (propertyData.videos && propertyData.videos.length > 0) {
    setCurrentVideoIndex((prev) =>
      prev === propertyData.videos.length - 1 ? 0 : prev + 1
    );
  }
};

const toggleVideoPlayback = async () => {
  if (videoRef.current) {
    if (isVideoPlaying) {
      await videoRef.current.pauseAsync();
      setIsVideoPlaying(false);
    } else {
      await videoRef.current.playAsync();
      setIsVideoPlaying(true);
    }
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



  // Keyboard navigation
  useEffect(() => {
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
                  return imageUri;
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
              
              {/* Rating Badge */}
              <View style={styles.ratingBadge}>
                <Star size={14} color="#F59E0B" fill="#F59E0B" />
                <Text style={styles.ratingText}>
                  {calculatedRating > 0 ? calculatedRating.toFixed(1) : 'No ratings'} {calculatedRating > 0 && <Text style={styles.ratingCount}>({totalReviews})</Text>}
                </Text>
              </View>
              
              {/* Removed favorite button */}
            </View>
          </View>

          {/* Property Info Card */}
          <View style={styles.propertyInfoCard}>
            <View style={styles.propertyHeader}>
              <Text style={styles.propertyTitle}>{displayTitle}</Text>
              {(() => {
                const monthlyRent = (propertyData.monthlyRent && propertyData.monthlyRent > 0) ? propertyData.monthlyRent : propertyData.price;
                return monthlyRent && monthlyRent > 0;
              })() && (
                <Text style={styles.propertyPrice}>
                  ₱{(() => {
                    const monthlyRent = (propertyData.monthlyRent && propertyData.monthlyRent > 0) ? propertyData.monthlyRent : propertyData.price;
                    return monthlyRent.toLocaleString();
                  })()}
                </Text>
              )}
            </View>
            
            <View style={styles.locationRow}>
              <MapPin size={16} color="#6B7280" />
              <Text style={styles.locationText}>{propertyData.address}</Text>
            </View>

            {/* Property Specifications */}
            <View style={styles.specificationsRow}>
              <View style={styles.specItem}>
                <Bed size={16} color="#10B981" />
                <Text style={styles.specText}>{propertyData.bedrooms || 0} bed{(propertyData.bedrooms || 0) !== 1 ? 's' : ''}</Text>
              </View>
              <View style={styles.specItem}>
                <Bath size={16} color="#10B981" />
                <Text style={styles.specText}>{propertyData.bathrooms || 0} bath{(propertyData.bathrooms || 0) !== 1 ? 's' : ''}</Text>
              </View>
            </View>
          </View>
          
          {/* Description Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.descriptionText}>{propertyData.description}</Text>
          </View>

          {/* Amenities Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Amenities</Text>
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
            <View style={styles.section}>
              <View style={styles.ratingSection}>
                <View style={styles.ratingHeader}>
                  <Text style={styles.sectionTitle}>Rating & Reviews</Text>
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
                    onRatingChange={handleRatingSubmit}
                    color="#F59E0B"
                    inactiveColor="#D1D5DB"
                    style={styles.starRatingContainer}
                  />
                  {userRating > 0 && (
                    <Text style={styles.ratingFeedback}>
                      You rated this property {userRating} star{userRating !== 1 ? 's' : ''}
                    </Text>
                  )}
                  {isSubmittingRating && (
                    <Text style={styles.submittingText}>Submitting your rating...</Text>
                  )}
                </View>
              </View>
            </View>
          )}

          {/* Display overall rating for owner view or non-authenticated users */}
          {(isOwnerView || !isAuthenticated) && totalReviews > 0 && (
            <View style={styles.section}>
              <View style={styles.ratingSection}>
                <View style={styles.ratingHeader}>
                  <Text style={styles.sectionTitle}>Rating & Reviews</Text>
                  <View style={styles.averageRatingBadge}>
                    <Star size={18} color="#F59E0B" fill="#F59E0B" />
                    <Text style={styles.averageRatingText}>{calculatedRating.toFixed(1)}</Text>
                    <Text style={styles.totalReviewsText}>({totalReviews} {totalReviews === 1 ? 'review' : 'reviews'})</Text>
                  </View>
                </View>
                <StarRating
                  rating={calculatedRating}
                  size={28}
                  interactive={false}
                  showCount={false}
                  color="#F59E0B"
                  inactiveColor="#D1D5DB"
                  style={styles.starRatingContainer}
                />
              </View>
            </View>
          )}

          {/* House Rules Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>House Rules</Text>
            <View style={styles.rulesList}>
              {propertyData.rules.map((rule: string, index: number) => (
                <View key={index} style={styles.ruleItem}>
                  <Text style={styles.ruleBullet}>•</Text>
                  <Text style={styles.ruleText}>{rule}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Rental Details Section */}
          {(() => {
            const monthlyRent = (propertyData.monthlyRent && propertyData.monthlyRent > 0) ? propertyData.monthlyRent : propertyData.price;
            return (monthlyRent && monthlyRent > 0) ||
              (propertyData.securityDeposit && propertyData.securityDeposit > 0) ||
              (propertyData.availabilityStatus && propertyData.availabilityStatus.trim() !== '') ||
              (propertyData.paymentMethods && propertyData.paymentMethods.length > 0);
          })() && (
            <View style={styles.rentalDetailsCard}>
              <Text style={styles.sectionTitle}>Rental Details</Text>
              <View style={styles.rentalDetailsList}>
                {(() => {
                  const monthlyRent = (propertyData.monthlyRent && propertyData.monthlyRent > 0) ? propertyData.monthlyRent : propertyData.price;
                  return monthlyRent && monthlyRent > 0;
                })() && (
                  <View style={styles.rentalDetailItem}>
                    <Text style={styles.rentalDetailLabel}>Monthly Rent:</Text>
                    <Text style={styles.rentalDetailValue}>
                      ₱{(() => {
                        const monthlyRent = (propertyData.monthlyRent && propertyData.monthlyRent > 0) ? propertyData.monthlyRent : propertyData.price;
                        return monthlyRent.toLocaleString();
                      })()}
                    </Text>
                  </View>
                )}
                {propertyData.securityDeposit && propertyData.securityDeposit > 0 && (
                  <View style={styles.rentalDetailItem}>
                    <Text style={styles.rentalDetailLabel}>Security Deposit:</Text>
                    <Text style={styles.rentalDetailValue}>₱{propertyData.securityDeposit!.toLocaleString()}</Text>
                  </View>
                )}
                {propertyData.availabilityStatus && propertyData.availabilityStatus.trim() !== '' && (
                  <View style={styles.rentalDetailItem}>
                    <Text style={styles.rentalDetailLabel}>Availability:</Text>
                    <Text style={styles.availabilityStatus}>{propertyData.availabilityStatus}</Text>
                  </View>
                )}
                {propertyData.paymentMethods && propertyData.paymentMethods.length > 0 && (
                  <View style={styles.rentalDetailItem}>
                    <Text style={styles.rentalDetailLabel}>Payment Methods:</Text>
                    <Text style={styles.rentalDetailValue}>{propertyData.paymentMethods.join(', ')}</Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Enhanced Photo Gallery */}
          {isLoadingMedia ? (
            <View style={styles.section}>
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
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
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
                  snapToInterval={screenWidth * 0.6 + 16}
                  snapToAlignment="start"
                  pagingEnabled={false}
                  bounces={true}
                  alwaysBounceHorizontal={true}
                  scrollEventThrottle={16}
                  directionalLockEnabled={true}
                  disableIntervalMomentum={false}
                  onScroll={(event) => {
                    const scrollX = event.nativeEvent.contentOffset.x;
                    const photoWidth = screenWidth * 0.6 + 16;
                    const currentIndex = Math.round(scrollX / photoWidth);
                    setCurrentPhotoScrollIndex(Math.min(currentIndex, propertyData.photos.length - 1));
                  }}
                  onScrollEndDrag={(event) => {
                    const scrollX = event.nativeEvent.contentOffset.x;
                    const photoWidth = screenWidth * 0.6 + 16;
                    const currentIndex = Math.round(scrollX / photoWidth);
                    const targetX = currentIndex * photoWidth;
                    photoScrollRef.current?.scrollTo({ x: targetX, animated: true });
                  }}
                >
                  {propertyData.photos.map((photo: string, index: number) => (
                    <TouchableOpacity 
                      key={index} 
                      style={styles.photoItem}
                      onPress={() => openPhotoViewer(index)}
                      activeOpacity={0.7}
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
            <View style={styles.section}>
              <View style={styles.noPhotosCard}>
                <Text style={styles.noPhotosTitle}>📸 No Photos Available</Text>
                <Text style={styles.noPhotosText}>
                  Photos for this property are currently being processed or may not have been uploaded yet.
                </Text>
              </View>
            </View>
          )}

          {/* Enhanced Video Gallery with Thumbnails - Same Style as Photos */}
          {propertyData.videos && propertyData.videos.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                🎥 Property Videos ({propertyData.videos.length})
              </Text>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                style={styles.videoScrollView}
                contentContainerStyle={styles.videoScrollContent}
                decelerationRate="fast"
                snapToInterval={screenWidth * 0.6 + 16}
                snapToAlignment="start"
                pagingEnabled={false}
                bounces={true}
                alwaysBounceHorizontal={true}
                scrollEventThrottle={16}
              >
                {propertyData.videos.map((video: string, index: number) => (
                  <TouchableOpacity 
                    key={index} 
                    style={styles.videoThumbnailItem}
                    onPress={() => openVideoViewer(index)}
                    activeOpacity={0.7}
                  >
                    <Video
                      source={{ uri: video }}
                      style={styles.videoThumbnailImage}
                      resizeMode={ResizeMode.COVER}
                      shouldPlay={false}
                      isMuted={true}
                      useNativeControls={false}
                      positionMillis={1000}
                    />
                    <View style={styles.videoThumbnailOverlay}>
                      <View style={styles.videoPlayIconCircle}>
                        <Play size={24} color="#FFFFFF" fill="#FFFFFF" />
                      </View>
                    </View>
                    <View style={styles.videoThumbnailIndicator}>
                      <Text style={styles.videoThumbnailIndicatorText}>{index + 1}/{propertyData.videos.length}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          ) : (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🎥 Property Videos</Text>
              <Text style={styles.descriptionText}>No videos available for this property.</Text>
            </View>
          )}

          {/* Contact Info */}
          <View style={styles.contactCard}>
            <Text style={styles.contactTitle}>Contact Information</Text>
            <View style={styles.contactInfo}>
              <View style={styles.contactInfoCard}>
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
            <View style={styles.actionButtonsContainer}>
              <TouchableOpacity 
                style={styles.messageButton}
                onPress={async () => {
                  if (!user?.id) {
                    Alert.alert('Please log in', 'You need to be logged in to message the owner.');
                    return;
                  }
                  
                  try {
                    await trackListingInquiry(propertyData.id, user.id, 'message');
                    const displayName = propertyData.businessName || propertyData.ownerName;
                    router.push(`/chat-room?name=${displayName}&otherUserId=${propertyData.ownerUserId}&propertyId=${propertyData.id}&propertyTitle=${propertyData.title}`);
                  } catch (error) {
                    console.error('Error tracking inquiry:', error);
                    const displayName = propertyData.businessName || propertyData.ownerName;
                    router.push(`/chat-room?name=${displayName}&otherUserId=${propertyData.ownerUserId}&propertyId=${propertyData.id}&propertyTitle=${propertyData.title}`);
                  }
                }}
              >
                <MessageCircle size={20} color="#FFFFFF" />
                <Text style={styles.messageButtonText}>Message Owner</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.bookButton}
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
                <Text style={styles.bookButtonText}>Book Now</Text>
              </TouchableOpacity>
            </View>
          )}
            </>
          )}
        </ScrollView>

      {/* Professional Photo Viewer Modal */}
      <Modal
        visible={photoViewerVisible}
        transparent={true}
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

          {/* Professional Photo Display with Enhanced Swipe */}
          <View 
            style={styles.modalPhotoContent}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {propertyData.photos && propertyData.photos[currentPhotoIndex] && (
              <Image
                source={{ uri: propertyData.photos[currentPhotoIndex] }}
                style={styles.modalImage}
                resizeMode="contain"
              />
            )}
          </View>

          {/* Modern Navigation Controls */}
          {propertyData.photos && propertyData.photos.length > 1 && (
            <View style={styles.modalControls}>
              <TouchableOpacity 
                style={styles.modalControlButton}
                onPress={goToPreviousPhoto}
              >
                <ChevronLeft size={24} color="white" />
              </TouchableOpacity>
              
              <View style={styles.modalDotsContainer}>
                {propertyData.photos.map((_: string, index: number) => (
                  <TouchableOpacity
                    key={index}
                    onPress={() => setCurrentPhotoIndex(index)}
                    style={[
                      styles.modalDot,
                      index === currentPhotoIndex && styles.modalDotActive
                    ]}
                  />
                ))}
              </View>
              
              <TouchableOpacity 
                style={styles.modalControlButton}
                onPress={goToNextPhoto}
              >
                <ChevronRight size={24} color="white" />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>

      {/* Video Player Modal */}
      {videoViewerVisible && propertyData.videos && propertyData.videos.length > 0 && (
        <Modal
          visible={videoViewerVisible}
          transparent={true}
          animationType="fade"
          presentationStyle="fullScreen"
          onRequestClose={closeVideoViewer}
        >
          <SafeAreaView style={styles.videoModalContainer}>
            <View style={styles.videoModalHeader}>
              <TouchableOpacity 
                style={styles.videoModalCloseButton}
                onPress={closeVideoViewer}
              >
                <X size={24} color="white" />
              </TouchableOpacity>
              
              <View style={styles.videoModalCounter}>
                <Text style={styles.videoModalCounterText}>
                  {currentVideoIndex + 1} / {propertyData.videos.length}
                </Text>
              </View>
              
              <View style={styles.videoModalSpacer} />
            </View>

            <View style={styles.videoModalContent}>
              <Video
                ref={videoRef}
                source={{ uri: propertyData.videos[currentVideoIndex] }}
                style={styles.videoPlayer}
                useNativeControls={false}
                resizeMode={ResizeMode.CONTAIN}
                shouldPlay={isVideoPlaying}
                onPlaybackStatusUpdate={(status: any) => {
                  if (status.isLoaded) {
                    setIsVideoPlaying(status.isPlaying);
                  }
                }}
              />
            </View>
              
              {/* Custom Video Controls */}
              <View style={styles.videoControls}>
                <TouchableOpacity 
                  style={styles.videoControlButton}
                  onPress={goToPreviousVideo}
                  disabled={propertyData.videos.length <= 1}
                >
                  <ChevronLeft size={24} color="white" />
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.videoPlayButton}
                  onPress={toggleVideoPlayback}
                >
                  {isVideoPlaying ? (
                    <Pause size={32} color="white" />
                  ) : (
                    <Play size={32} color="white" />
                  )}
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.videoControlButton}
                  onPress={goToNextVideo}
                  disabled={propertyData.videos.length <= 1}
                >
                  <ChevronRight size={24} color="white" />
                </TouchableOpacity>
              </View>

            {/* Video Dots Indicator */}
            {propertyData.videos.length > 1 && (
              <View style={styles.videoDotsContainer}>
                {propertyData.videos.map((_, index) => (
                  <View
                    key={index}
                    style={[
                      styles.videoDot,
                      index === currentVideoIndex && styles.videoDotActive
                    ]}
                  />
                ))}
              </View>
            )}
          </SafeAreaView>
        </Modal>
      )}

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
  propertyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  propertyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
    marginRight: 12,
  },
  propertyPrice: {
    fontSize: 24,
    fontWeight: '700',
    color: '#10B981',
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  descriptionText: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 24,
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
  rentalDetailsList: {
    gap: 12,
  },
  rentalDetailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rentalDetailLabel: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
  },
  rentalDetailValue: {
    fontSize: 16,
    color: '#10B981',
    fontWeight: '600',
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
  messageButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
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
  bookButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
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
    zIndex: 10,
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCounter: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
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
  modalImage: {
    width: '90%',
    height: '90%',
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
    paddingVertical: 32,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    gap: 24,
  },
  modalControlButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
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
  videoScrollView: {
    flexDirection: 'row',
  },
  videoScrollContent: {
    paddingRight: 16,
    paddingLeft: 4,
  },
  videoThumbnailItem: {
    marginRight: 16,
    position: 'relative',
    width: 240,
    height: 200,
  },
  videoThumbnailImage: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
    backgroundColor: '#000000',
  },
  videoThumbnailOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
  },
  videoPlayIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(59, 130, 246, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  videoThumbnailIndicator: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  videoThumbnailIndicatorText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  videoModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
  },
  videoModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    zIndex: 10,
  },
  videoModalCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoModalCounter: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  videoModalCounterText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  videoModalSpacer: {
    width: 40,
  },
  videoModalContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  videoPlayer: {
    width: '100%',
    height: '100%',
    alignSelf: 'center',
  },
  videoControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    gap: 32,
  },
  videoControlButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  videoPlayButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  videoDotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    paddingBottom: 8,
    gap: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  videoDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  videoDotActive: {
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
});


