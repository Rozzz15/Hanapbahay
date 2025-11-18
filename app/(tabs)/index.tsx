import { ScrollView, View, Pressable, Animated, Text, TouchableOpacity, Image, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db, isPublishedListingRecord, clearCache, getAll } from '../../utils/db';
import { OwnerProfileRecord, DbUserRecord, PublishedListingRecord, PropertyPhotoRecord, PropertyVideoRecord } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
// Removed favorite functionality
//
import { preloadSingleListingImages } from '../../utils/image-preloader';
import TenantSmartSearch from '@/components/search/TenantSmartSearch';
import { SmartSearchParams, filterListings } from '@/utils/search';
import { getPropertyRatingsMap } from '../../utils/property-ratings';
import { cleanupTestMessages } from '../../utils/cleanup-test-messages';
import { trackListingView } from '../../utils/view-tracking';
import { trackListingInquiry } from '../../utils/inquiry-tracking';
import { createOrFindConversation } from '../../utils/conversation-utils';
import { addCustomEventListener } from '../../utils/custom-events';
import BookingStatusModal from '@/components/BookingStatusModal';
import { getBookingsByTenant } from '../../utils/booking';
import { Heart } from 'lucide-react-native';
import { toggleFavorite, isFavorite } from '../../utils/favorites';
import { showAlert } from '../../utils/alert';
import { BookingRecord } from '../../types';
import {
  loadShownBookingNotifications,
  markBookingNotificationAsShown,
  hasBookingNotificationBeenShown,
} from '../../utils/booking-notifications-storage';

export default function DashboardScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { isAuthenticated, user } = useAuth();
  const scrollIndicatorOpacity = useRef(new Animated.Value(1)).current;
  const carouselRef = useRef<{ scrollToNext: () => void } | null>(null);
  const [filteredListings, setFilteredListings] = useState<{ id: string; image: string; coverPhoto?: string; title: string; location: string; address?: string; description?: string; rating: number; reviews: number; rooms: number; bathrooms?: number; size: number; price: number; businessName?: string; ownerName?: string; propertyType?: string; ownerUserId?: string; userId?: string; barangay?: string; capacity?: number; occupiedSlots?: number; roomCapacities?: number[]; roomAvailability?: number[] }[]>([]);
  const [owners, setOwners] = useState<(OwnerProfileRecord & { user?: DbUserRecord })[]>([]);
  const [ownerListings, setOwnerListings] = useState<{ id: string; image: string; coverPhoto?: string; title: string; location: string; address?: string; description?: string; rating: number; reviews: number; rooms: number; bathrooms?: number; size: number; price: number; businessName?: string; ownerName?: string; propertyType?: string; ownerUserId?: string; userId?: string; barangay?: string; capacity?: number; occupiedSlots?: number; roomCapacities?: number[]; roomAvailability?: number[] }[]>([]);
  const [showScrollIndicator, setShowScrollIndicator] = useState(true);
  const [isScrolling, setIsScrolling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'info' } | null>(null);
  // Removed favorite state
  const [searchParams, setSearchParams] = useState<SmartSearchParams>({});
  const [checkingActiveBooking, setCheckingActiveBooking] = useState(true);
  const [bookingStatusModal, setBookingStatusModal] = useState<{
    visible: boolean;
    booking: BookingRecord | null;
    status: 'approved' | 'rejected';
  }>({
    visible: false,
    booking: null,
    status: 'approved',
  });
  const shownBookingNotificationsRef = useRef<Set<string>>(new Set());
  const [notificationsLoaded, setNotificationsLoaded] = useState(false);
  const [favoriteStatuses, setFavoriteStatuses] = useState<Map<string, boolean>>(new Map());
  const [togglingFavorites, setTogglingFavorites] = useState<Set<string>>(new Set());

  // Load shown notifications from persistent storage
  useEffect(() => {
    if (!user?.id) return;

    const loadNotifications = async () => {
      try {
        const notifications = await loadShownBookingNotifications(user.id);
        shownBookingNotificationsRef.current = notifications;
        setNotificationsLoaded(true);
        console.log(`✅ Loaded ${notifications.size} shown booking notifications from storage`);
      } catch (error) {
        console.error('❌ Error loading booking notifications:', error);
        setNotificationsLoaded(true);
      }
    };

    loadNotifications();
  }, [user?.id]);

  // Check for active booking and redirect to main dashboard
  // Skip redirect if user explicitly wants to browse (e.g., from favorites page)
  const hasCheckedInitialRedirect = useRef(false);
  useEffect(() => {
    const checkActiveBooking = async () => {
      if (!user?.id) {
        setCheckingActiveBooking(false);
        return;
      }

      // Check if user wants to browse (set from favorites page)
      const skipRedirect = await AsyncStorage.getItem('skip_booking_redirect');
      if (skipRedirect === 'true') {
        console.log('🔍 User wants to browse properties, skipping redirect');
        await AsyncStorage.removeItem('skip_booking_redirect');
        setCheckingActiveBooking(false);
        hasCheckedInitialRedirect.current = true;
        return;
      }

      // Only auto-redirect on initial load, not when user explicitly navigates here
      // This allows users to browse properties even if they have an active booking
      if (hasCheckedInitialRedirect.current) {
        setCheckingActiveBooking(false);
        return;
      }

      try {
        const { getBookingsByTenant } = await import('../../utils/booking');
        const bookings = await getBookingsByTenant(user.id);
        const activeBooking = bookings.find(
          b => b.status === 'approved' && b.paymentStatus === 'paid'
        );

        if (activeBooking) {
          console.log('✅ Tenant has active booking, redirecting to main dashboard');
          hasCheckedInitialRedirect.current = true;
          router.replace('/(tabs)/tenant-main-dashboard');
          return;
        }
      } catch (error) {
        console.error('❌ Error checking for active booking:', error);
      } finally {
        setCheckingActiveBooking(false);
        hasCheckedInitialRedirect.current = true;
      }
    };

    checkActiveBooking();
  }, [user?.id, router]);
  
  

  // Helper function for showing alerts
  const showAlert = (title: string, message: string) => {
    Alert.alert(title, message);
  };

  // Will define clearAllPublishedListings after loadPublishedListings

  // Featured listings derived from filtered listings (first 5)
  const featuredListings = filteredListings.slice(0, 5);
  
  // Removed favorite listings functionality

  

  // Handle scroll events for the carousel
  const handleCarouselScroll = (event: any) => {
    setIsScrolling(true);
    // Hide indicator while scrolling (instant)
    scrollIndicatorOpacity.setValue(0);
    
    // Show indicator again immediately after scrolling stops
    setIsScrolling(false);
    if (featuredListings.length > 1) {
      scrollIndicatorOpacity.setValue(1);
    }
  };

  // Sync owner media to property_photos/videos tables
  const syncOwnerMediaToDatabase = useCallback(async () => {
    try {
      console.log('🔄 Syncing owner media to database tables...');
      const publishedListings = await db.list<PublishedListingRecord>('published_listings');
      const { savePropertyMedia } = await import('@/utils/media-storage');
      
      console.log(`📊 Found ${publishedListings.length} published listings to check for media sync`);
      
      let syncedCount = 0;
      for (const listing of publishedListings) {
        try {
          // Type guard to ensure this is a PublishedListingRecord
          if (!isPublishedListingRecord(listing)) {
            console.log(`⚠️ Skipping non-listing record:`, listing);
            continue;
          }

          // Check if listing has media in published_listings
          const hasMedia = listing.coverPhoto || (listing.photos && listing.photos.length > 0) || (listing.videos && listing.videos.length > 0);
          
          if (hasMedia) {
            console.log(`🔄 Syncing media for listing ${listing.id}:`, {
              title: listing.title,
              hasCoverPhoto: !!listing.coverPhoto,
              photosCount: listing.photos?.length || 0,
              videosCount: listing.videos?.length || 0,
              coverPhotoUri: listing.coverPhoto?.substring(0, 50) + '...'
            });
            
            await savePropertyMedia(listing.id, listing.userId || 'unknown', {
              coverPhoto: listing.coverPhoto,
              photos: listing.photos || [],
              videos: listing.videos || []
            });
            syncedCount++;
            console.log(`✅ Synced media for listing ${listing.id}`);
          } else {
            console.log(`ℹ️ Listing ${listing.id} has no media to sync`);
          }
        } catch (error) {
          console.log(`⚠️ Could not sync media for listing ${listing.id}:`, error);
        }
      }
      console.log(`✅ Owner media sync completed: ${syncedCount} listings synced`);
    } catch (error) {
      console.log('❌ Error syncing owner media:', error);
    }
  }, []);

  // Test media flow to ensure owner media appears for tenants
  const testMediaFlow = useCallback(async () => {
    try {
      console.log('🧪 Testing complete media flow...');
      const publishedListings = await db.list<PublishedListingRecord>('published_listings');
      console.log(`📊 Found ${publishedListings.length} published listings`);
      
      let totalMediaFound = 0;
      let listingsWithMedia = 0;
      
      for (const listing of publishedListings) {
        console.log(`🔍 Testing listing ${listing.id}:`, {
          title: listing.title || listing.propertyType,
          hasOriginalCoverPhoto: !!listing.coverPhoto,
          hasOriginalPhotos: (listing.photos?.length || 0) > 0,
          hasOriginalVideos: (listing.videos?.length || 0) > 0,
          ownerId: listing.userId
        });
        
        // Test loading media
        try {
          const { loadPropertyMedia } = await import('@/utils/media-storage');
          const media = await loadPropertyMedia(listing.id, user?.id);
          
          const hasMedia = !!media.coverPhoto || media.photos.length > 0 || media.videos.length > 0;
          if (hasMedia) {
            listingsWithMedia++;
            totalMediaFound += (media.coverPhoto ? 1 : 0) + media.photos.length + media.videos.length;
          }
          
          console.log(`✅ Media loaded for listing ${listing.id}:`, {
            hasCoverPhoto: !!media.coverPhoto,
            photosCount: media.photos.length,
            videosCount: media.videos.length,
            mediaFound: hasMedia
          });
        } catch (error) {
          console.log(`❌ Failed to load media for listing ${listing.id}:`, error);
        }
      }
      
      console.log(`🎯 Media Flow Test Results:`, {
        totalListings: publishedListings.length,
        listingsWithMedia,
        totalMediaFound,
        successRate: publishedListings.length > 0 ? `${Math.round((listingsWithMedia / publishedListings.length) * 100)}%` : '0%'
      });
      
      return {
        totalListings: publishedListings.length,
        listingsWithMedia,
        totalMediaFound,
        successRate: publishedListings.length > 0 ? (listingsWithMedia / publishedListings.length) * 100 : 0
      };
    } catch (error) {
      console.log('❌ Error testing media flow:', error);
      return null;
    }
  }, [user?.id]);

  // One-time cleanup for previously seeded default/sample listings
  const removeDefaultSeededListings = useCallback(async () => {
    try {
      if (process.env.EXPO_PUBLIC_ALLOW_DATA_CLEAR !== 'true') {
        return;
      }
      const seededOwnerIds = new Set(['owner-1', 'owner-2']);
      const seededImageHints = [
        'images.unsplash.com/photo-1564013799919-ab600027ffc6',
        'images.unsplash.com/photo-1570129477492-45c003edd2be'
      ];

      const rawListings = await db.list('published_listings');
      const publishedListings = rawListings.filter(isPublishedListingRecord);
      const toDelete = publishedListings.filter((p: PublishedListingRecord) => {
        const isSeedOwner = seededOwnerIds.has(p?.userId);
        const hasSeedImage = typeof p?.coverPhoto === 'string' && seededImageHints.some(h => (p.coverPhoto ?? '').includes(h));
        const hasSampleAddress = typeof p?.address === 'string' && /Sample/i.test(p.address);
        return isSeedOwner || hasSeedImage || hasSampleAddress;
      });

      if (toDelete.length > 0) {
        console.log(`🧹 Removing ${toDelete.length} default/sample listings...`);
        for (const listing of toDelete) {
          await db.remove('published_listings', listing.id);
          console.log(`🗑️ Removed default listing: ${listing.id}`);
        }
      }
    } catch (cleanupError) {
      console.log('⚠️ Cleanup of default listings failed (non-fatal):', cleanupError);
    }
  }, []);

  // Clean up test messages on app startup
  const cleanupTestData = useCallback(async () => {
    try {
      console.log('🧹 Cleaning up test messages and conversations...');
      const cleanupResult = await cleanupTestMessages();
      
      if (cleanupResult.success) {
        console.log(`✅ Test data cleanup completed: ${cleanupResult.removedConversations} conversations and ${cleanupResult.removedMessages} messages removed`);
      } else {
        console.log('⚠️ Test data cleanup had some issues:', cleanupResult.errors);
      }
    } catch (error) {
      console.log('⚠️ Test data cleanup failed (non-fatal):', error);
    }
  }, []);

  // Create sample listings if none exist
  const createSampleListings = useCallback(async () => {
    console.log('ℹ️ Skipping creation of sample listings (disabled).');
    return 0;
  }, []);

  // Test listing creation removed - only real owner listings will be shown

  // Clean up any existing default listings
  const clearDefaultListings = useCallback(async () => {
    try {
      console.log('🧹 Cleaning up any existing default listings...');
      
      const { db } = await import('@/utils/db');
      if (process.env.EXPO_PUBLIC_ALLOW_DATA_CLEAR !== 'true') {
        return;
      }
      const publishedListings = await db.list<PublishedListingRecord>('published_listings');
      
      // Remove default property IDs
      const defaultPropertyIds = ['property_001', 'property_002', 'property_003'];
      const defaultOwnerIds = ['owner_default_001', 'owner_default_002', 'test_owner'];
      
      let removedCount = 0;
      
      for (const listing of (publishedListings as PublishedListingRecord[])) {
        if (!listing.id) {
          continue;
        }
        if (defaultPropertyIds.includes(listing.id) || 
            defaultOwnerIds.includes(listing.userId) ||
            defaultOwnerIds.includes(listing.ownerUserId ?? '')) {
          await db.remove('published_listings', listing.id as string);
          console.log(`🗑️ Removed default listing: ${listing.id}`);
          removedCount++;
        }
      }
      
      if (removedCount > 0) {
        console.log(`✅ Cleaned up ${removedCount} default listings`);
      } else {
        console.log('✅ No default listings found to clean up');
      }
    } catch (error) {
      console.error('❌ Error cleaning up default listings:', error);
    }
  }, []);

  // Test database storage and retrieval of published listings
  const testDatabaseStorage = useCallback(async () => {
    try {
      console.log('🧪 Testing database storage and retrieval...');
      
      // Test 1: Check if published_listings collection exists and is accessible
      const rawListingsForTest = await db.list<PublishedListingRecord>('published_listings');
      const publishedListings = rawListingsForTest.filter(isPublishedListingRecord);
      console.log('📊 Database Storage Test Results:', {
        totalListings: publishedListings.length,
        collectionAccessible: true,
        listingsData: publishedListings.map(listing => ({
          id: listing.id,
          propertyType: listing.propertyType,
          address: listing.address?.substring(0, 30) + '...',
          userId: listing.userId,
          status: listing.status,
          hasCoverPhoto: !!listing.coverPhoto,
          photosCount: listing.photos?.length || 0,
          videosCount: listing.videos?.length || 0,
          publishedAt: listing.publishedAt
        }))
      });
      
      // If no listings exist, create sample listings
      if (publishedListings.length === 0) {
        console.log('⚠️ No listings found, creating sample listings...');
        const sampleCount = await createSampleListings();
        if (sampleCount > 0) {
          console.log('✅ Sample listings created successfully');
          // Re-test after creating samples
          const newListings = await db.list<PublishedListingRecord>('published_listings');
          console.log(`📊 After creating samples: ${newListings.length} listings found`);
        }
      }
      
      // Test 2: Verify individual listing retrieval
      let successfulRetrievals = 0;
      const finalListings = await db.list<PublishedListingRecord>('published_listings');
      for (const listing of finalListings) {
        try {
          const retrievedListing = await db.get<PublishedListingRecord>('published_listings', listing.id);
          if (retrievedListing && retrievedListing.id === listing.id) {
            successfulRetrievals++;
          }
        } catch (error) {
          console.log(`❌ Failed to retrieve listing ${listing.id}:`, error);
        }
      }
      
      // Test 3: Check media storage in separate tables
      const { loadPropertyMedia } = await import('@/utils/media-storage');
      let mediaStorageSuccess = 0;
      
      for (const listing of finalListings) {
        try {
          const media = await loadPropertyMedia(listing.id, user?.id);
          if (media) {
            mediaStorageSuccess++;
          }
        } catch (error) {
          console.log(`⚠️ Media storage test failed for listing ${listing.id}:`, error);
        }
      }
      
      const testResults = {
        totalListings: finalListings.length,
        successfulRetrievals,
        mediaStorageSuccess,
        retrievalSuccessRate: finalListings.length > 0 ? (successfulRetrievals / finalListings.length) * 100 : 0,
        mediaStorageSuccessRate: finalListings.length > 0 ? (mediaStorageSuccess / finalListings.length) * 100 : 0,
        databaseHealthy: successfulRetrievals === finalListings.length && finalListings.length > 0
      };
      
      console.log('🎯 Database Storage Test Summary:', testResults);
      
      if (testResults.databaseHealthy) {
        console.log('✅ Database storage test PASSED - All listings accessible and retrievable');
      } else if (testResults.totalListings > 0) {
        console.log(`⚠️ Database storage test PARTIAL - ${testResults.retrievalSuccessRate.toFixed(1)}% success rate`);
      } else {
        console.log('❌ Database storage test FAILED - No published listings found');
      }
      
      return testResults;
    } catch (error) {
      console.log('❌ Error testing database storage:', error);
      return null;
    }
  }, [user?.id, createSampleListings]);

  // Test media persistence after logout/login
  const testMediaPersistence = useCallback(async () => {
    try {
      console.log('🧪 Testing media persistence...');
      
      // Get current listings count and media status
      const publishedListings = await db.list<PublishedListingRecord>('published_listings');
      let initialMediaCount = 0;
      
      for (const listing of publishedListings) {
        try {
          const { loadPropertyMedia } = await import('@/utils/media-storage');
          const media = await loadPropertyMedia(listing.id, user?.id);
          if (media.coverPhoto || media.photos.length > 0 || media.videos.length > 0) {
            initialMediaCount++;
          }
        } catch (error) {
          console.log(`⚠️ Could not load media for listing ${listing.id}:`, error);
        }
      }
      
      console.log('📊 Media Persistence Test Results:', {
        totalListings: publishedListings.length,
        listingsWithMedia: initialMediaCount,
        persistenceReady: initialMediaCount > 0
      });
      
      return {
        totalListings: publishedListings.length,
        listingsWithMedia: initialMediaCount,
        persistenceReady: initialMediaCount > 0
      };
    } catch (error) {
      console.log('❌ Error testing media persistence:', error);
      return null;
    }
  }, [user?.id]);

  // Debug function to check app status
  const debugAppStatus = useCallback(async () => {
    try {
      console.log('🔍 DEBUG: Checking app status...');
      
      // Check user authentication
      console.log('👤 User status:', {
        isAuthenticated,
        userId: user?.id,
        userRoles: user?.roles
      });
      
      // Check database
      const publishedListings = await db.list<PublishedListingRecord>('published_listings');
      console.log('📊 Database status:', {
        totalListings: publishedListings.length,
        listingsData: publishedListings.map(l => ({
          id: l.id,
          propertyType: l.propertyType,
          address: l.address?.substring(0, 30) + '...',
          hasCoverPhoto: !!l.coverPhoto
        }))
      });
      
      // Check AsyncStorage
      try {
        const { loadPropertyMediaFromStorage } = await import('@/utils/media-storage');
        let mediaCount = 0;
        for (const listing of publishedListings) {
          const media = await loadPropertyMediaFromStorage(listing.id);
          if (media) mediaCount++;
        }
        console.log('💾 AsyncStorage status:', {
          listingsWithMedia: mediaCount,
          totalListings: publishedListings.length
        });
      } catch (storageError) {
        console.log('⚠️ AsyncStorage check failed:', storageError);
      }
      
      console.log('🎯 App Status Summary:', {
        authenticated: isAuthenticated,
        hasUser: !!user?.id,
        listingsCount: publishedListings.length,
        ready: isAuthenticated && publishedListings.length > 0
      });
      
    } catch (error) {
      console.log('❌ Debug check failed:', error);
    }
  }, [isAuthenticated, user?.id, user?.roles]);

  // Load published listings from database
  const loadPublishedListings = useCallback(async () => {
    try {
      console.log('🔄 Loading published listings...');
      console.log('👤 User authenticated:', isAuthenticated);
      console.log('👤 User ID:', user?.id);
      
      // EMERGENCY DEBUG: Check database directly first
      console.log('\n===========================================');
      console.log('🚨 EMERGENCY DIAGNOSTIC TEST - TENANT DASHBOARD');
      console.log('===========================================\n');
      
      const rawListingsForDebug = await db.list('published_listings');
      console.log(`📊 TOTAL LISTINGS IN DATABASE: ${rawListingsForDebug.length}\n`);
      
      if (rawListingsForDebug.length === 0) {
        console.log('❌ NO LISTINGS FOUND IN DATABASE!');
        console.log('   This means no owner has created any listings yet.');
        console.log('   OR listings were deleted by the old duplicate removal bug.\n');
        console.log('✅ SOLUTION: Login as owner and create listings.\n');
      } else {
        rawListingsForDebug.forEach((listing: any, index: number) => {
          console.log(`--- LISTING ${index + 1} ---`);
          console.log(`ID: ${listing.id || '❌ MISSING'}`);
          console.log(`Property Type: ${listing.propertyType || '❌ MISSING'}`);
          console.log(`Address: ${listing.address?.substring(0, 50) || '❌ MISSING'}`);
          console.log(`Status: ${listing.status || '❌ MISSING'}`);
          console.log(`Owner ID: ${listing.userId || '❌ MISSING'}`);
          console.log(`Owner Name: ${listing.ownerName || '❌ MISSING'}`);
          console.log(`Monthly Rent: ₱${listing.monthlyRent?.toLocaleString() || '❌ MISSING'}`);
          console.log(`Has Cover Photo: ${listing.coverPhoto ? '✅ YES' : '❌ NO'}`);
          console.log(`Photos: ${listing.photos?.length || 0}`);
          console.log(`Videos: ${listing.videos?.length || 0}`);
          
          // Validation check
          const hasId = !!listing.id;
          const isPublished = listing.status && listing.status.toLowerCase() === 'published';
          const willShow = hasId && isPublished;
          
          console.log(`\n🔍 Validation:`);
          console.log(`   Has ID: ${hasId ? '✅' : '❌'}`);
          console.log(`   Status = "published": ${isPublished ? '✅' : `❌ (status is "${listing.status}")`}`);
          console.log(`   Will show in tenant dashboard: ${willShow ? '✅ YES' : '❌ NO'}\n`);
        });
        
        // Count valid vs invalid
        const validCount = rawListingsForDebug.filter((l: any) => 
          l && l.id && l.status && l.status.toLowerCase() === 'published'
        ).length;
        const invalidCount = rawListingsForDebug.length - validCount;
        
        console.log('===========================================');
        console.log('📊 SUMMARY:');
        console.log('===========================================');
        console.log(`Total in database: ${rawListingsForDebug.length}`);
        console.log(`Valid (will show): ${validCount} ✅`);
        console.log(`Invalid (hidden): ${invalidCount} ❌\n`);
        
        if (invalidCount > 0) {
          console.log('⚠️  PROBLEM: Some listings have invalid status!');
          console.log('   Check the listings above marked with ❌');
          console.log('   Make sure status is "published" not "draft"\n');
        }
      }
      
      console.log('===========================================\n');

      // Clear cache to ensure fresh data
      await clearCache();
      
      // Clean up any existing default listings
      await clearDefaultListings();
      
      // Debug app status first
      await debugAppStatus();
      
      // First, test database storage and retrieval
      const dbTestResults = await testDatabaseStorage();
      if (dbTestResults) {
        console.log('📊 Database Test Results:', dbTestResults);
        if (!dbTestResults.databaseHealthy) {
          console.log('⚠️ Database storage issues detected - some listings may not be accessible');
        }
      }
      
      // Sync owner media to database tables
      await syncOwnerMediaToDatabase();
      
      // REFRESH ALL MEDIA (like owner dashboard and tenant profile pictures)
      try {
        const { refreshAllPropertyMedia } = await import('@/utils/media-storage');
        await refreshAllPropertyMedia();
        console.log('✅ Tenant dashboard media refreshed successfully (like owner dashboard)');
      } catch (mediaError) {
        console.log('⚠️ Tenant dashboard media refresh failed:', mediaError);
      }
      
      // Test the media flow to ensure everything is working
      const testResults = await testMediaFlow();
      if (testResults) {
        console.log('🎯 Final Media Test Results:', testResults);
        if (testResults.successRate === 100 && testResults.listingsWithMedia > 0) {
          console.log('✅ Media flow test PASSED - All listings have media!');
        } else if (testResults.successRate > 0) {
          console.log(`⚠️ Media flow test PARTIAL - ${testResults.successRate.toFixed(1)}% success rate`);
        } else {
          console.log('❌ Media flow test FAILED - No media found for any listings');
        }
      }

      // Test media persistence
      const persistenceResults = await testMediaPersistence();
      if (persistenceResults) {
        console.log('📊 Media Persistence Status:', persistenceResults);
        if (persistenceResults.persistenceReady) {
          console.log('✅ Media persistence test PASSED - Media is ready for logout/login');
        } else {
          console.log('⚠️ Media persistence test WARNING - No media found for persistence');
        }
      }

      // Get all published listings
      const publishedListings = await db.list<PublishedListingRecord>('published_listings');
      console.log('📋 Found published listings:', publishedListings.length);
      
      // Filter and type the listings properly
      const typedPublishedListings = publishedListings.filter(isPublishedListingRecord);
      console.log('📋 Valid published listings after filtering:', typedPublishedListings.length);
      
      // Log each listing's basic info for debugging
      typedPublishedListings.forEach((listing: PublishedListingRecord, index: number) => {
        console.log(`📋 Listing ${index + 1}:`, {
          id: listing.id,
          propertyType: listing.propertyType || 'MISSING',
          address: listing.address?.substring(0, 50) || 'MISSING',
          status: listing.status || 'MISSING',
          userId: listing.userId || 'MISSING',
          hasPhotos: !!(listing.photos && listing.photos.length > 0),
          hasCoverPhoto: !!listing.coverPhoto
        });
      });

      // No auto-creation of test listings - only show real owner listings
      if (typedPublishedListings.length === 0) {
        console.log('📋 No published listings found - showing empty state');
      }
      
      // Debug: Check if any listings have the correct structure
      if (typedPublishedListings.length > 0) {
        const firstListing = typedPublishedListings[0];
        console.log('🔍 First listing structure:', {
          id: firstListing.id,
          userId: firstListing.userId,
          ownerUserId: firstListing.ownerUserId,
          propertyType: firstListing.propertyType,
          status: firstListing.status,
          address: firstListing.address,
          monthlyRent: firstListing.monthlyRent
        });
      }
      
      // Create sample listings if none exist
      // Skip auto-generating any sample listings
      
      // Also check if there are any listings in the main listings table
      const allListings = await db.list('listings');
      console.log('📋 All listings in database:', allListings.length);
      console.log('📋 All listings data:', allListings);

      // Get all photos and videos from database
      const allPhotos = await getAll<PropertyPhotoRecord>('property_photos');
      const allVideos = await getAll<PropertyVideoRecord>('property_videos');
      console.log('📸 Database photos:', allPhotos.length);
      console.log('🎥 Database videos:', allVideos.length);
      
      // Get all users to populate missing barangay fields
      const allUsers = await db.list<DbUserRecord>('users');
      console.log('👥 Loaded users for barangay fallback:', allUsers.length);
        
        // Debug: Log some sample photos and videos
        if (allPhotos.length > 0) {
          console.log('📸 Sample photos:', allPhotos.slice(0, 3).map(photo => ({
            id: photo.id,
            listingId: photo.listingId,
            hasPhotoUri: !!photo.photoUri,
            isCoverPhoto: photo.isCoverPhoto
          })));
        }
        
        if (allVideos.length > 0) {
          console.log('🎥 Sample videos:', allVideos.slice(0, 3).map(video => ({
            id: video.id,
            listingId: video.listingId,
            hasVideoUri: !!video.videoUri
          })));
        }

      // Filter out invalid listings and map with fresh media data
      // SIMPLIFIED FILTER - Only check for ID (status check removed for debugging)
      const validListings = typedPublishedListings.filter((p: PublishedListingRecord) => {
        // Only require ID - this is the most basic check
        const hasId = p && p.id;
        const statusCheck = p && p.status;
        const isPublished = statusCheck && p.status.toLowerCase() === 'published';
        
        // Log every listing for debugging
        console.log(`🔍 Checking listing:`, {
          id: p?.id || 'NO_ID',
          propertyType: p?.propertyType || 'NO_TYPE',
          status: p?.status || 'NO_STATUS',
          statusLower: p?.status?.toLowerCase() || 'NO_STATUS',
          hasId: !!hasId,
          isPublished: !!isPublished,
          willShow: !!hasId && !!isPublished
        });
        
        if (!hasId) {
          console.error(`❌ REJECTED: Listing has no ID`, p);
          return false;
        }
        
        if (!isPublished) {
          console.warn(`⚠️ REJECTED: Status is "${p?.status}" not "published"`, {
            id: p.id,
            propertyType: p.propertyType,
            status: p.status
          });
          return false;
        }
        
        console.log(`✅ ACCEPTED: Listing ${p.id} will show`);
        return true;
      });
      
      console.log(`📋 Valid listings after filtering: ${validListings.length} out of ${typedPublishedListings.length}`);
      
      // EMERGENCY FALLBACK: If no valid listings but we have listings in DB, show them anyway
      let listingsToProcess = validListings;
      if (validListings.length === 0 && typedPublishedListings.length > 0) {
        console.warn('⚠️ EMERGENCY FALLBACK: No valid listings found, but database has listings!');
        console.warn('⚠️ Showing ALL listings regardless of status to help debug...');
        listingsToProcess = typedPublishedListings;
      }
      
      console.log(`📋 Processing ${listingsToProcess.length} listings...`);
      
      // Load rating data for all listings
      console.log('⭐ Loading rating data for all listings...');
      const listingIds = listingsToProcess.map(p => p.id);
      const ratingsMap = await getPropertyRatingsMap(listingIds);
      console.log(`⭐ Loaded ratings for ${ratingsMap.size} listings`);
      
      // Process listings with media loading and capacity check
      const mapped = await Promise.all(listingsToProcess.map(async (p: PublishedListingRecord) => {
        console.log(`🔍 Processing listing ${p.id}:`, {
          title: p.title,
          address: p.address,
          ownerUserId: p.ownerUserId,
          userId: p.userId,
          status: p.status,
          publishedAt: p.publishedAt,
          propertyType: p.propertyType,
          hasPhotos: p.photos?.length || 0,
          hasVideos: p.videos?.length || 0,
          capacity: p.capacity
        });
        
        // Check if all rooms are fully occupied
        const { areAllRoomsFullyOccupied } = await import('../../utils/listing-capacity');
        const allRoomsOccupied = await areAllRoomsFullyOccupied(p);
        
        if (allRoomsOccupied) {
          console.log(`🚫 Listing ${p.id} has all rooms fully occupied, will be filtered out`);
          return null; // Return null to filter out
        }

        // CRITICAL: Load media from database FIRST (like owner listings and tenant profile pictures)
        let coverPhotoUri = '';
        let allPhotosForListing: string[] = [];
        let allVideosForListing: string[] = [];

        try {
          const { loadPropertyMedia } = await import('@/utils/media-storage');
          const media = await loadPropertyMedia(p.id, user?.id);
          
          console.log(`🔍 Media loading result for listing ${p.id}:`, {
            userId: user?.id,
            hasCoverPhoto: !!media.coverPhoto,
            coverPhotoUri: media.coverPhoto?.substring(0, 50) + '...',
            photosCount: media.photos.length,
            videosCount: media.videos.length,
            photos: media.photos.slice(0, 2).map(photo => photo.substring(0, 30) + '...'),
            videos: media.videos.slice(0, 2).map(video => video.substring(0, 30) + '...')
          });
          
          // ALWAYS use database data if available (like owner listings and tenant profile pictures)
          if (media.coverPhoto || media.photos.length > 0 || media.videos.length > 0) {
            console.log(`📸 Using database media for listing ${p.id} (like owner listings):`, {
              hasCoverPhoto: !!media.coverPhoto,
              photosCount: media.photos.length,
              videosCount: media.videos.length
            });
            
            // Override with database data
            coverPhotoUri = media.coverPhoto || '';
            allPhotosForListing = media.photos;
            allVideosForListing = media.videos;
            
            if (media.coverPhoto) {
              console.log(`✅ Found database cover photo for listing ${p.id}`);
            }
            
            if (media.photos.length > 0) {
              if (!coverPhotoUri) {
                coverPhotoUri = media.photos[0];
              }
              console.log(`✅ Found ${media.photos.length} database photos for listing ${p.id}`);
            }
            
            if (media.videos.length > 0) {
              console.log(`✅ Found ${media.videos.length} database videos for listing ${p.id}`);
            }
          } else {
            console.log(`📸 No database media found for listing ${p.id}, will try fallbacks`);
          }
        } catch (mediaError) {
          console.log(`⚠️ Failed to load database media for listing ${p.id}:`, mediaError);
        }

        // Fallback to database photos if no cached photos
        if (allPhotosForListing.length === 0) {
          const listingPhotos = allPhotos.filter(photo => photo.listingId === p.id);
          if (listingPhotos.length > 0) {
            allPhotosForListing = listingPhotos.map(photo => photo.photoUri);
            if (!coverPhotoUri) {
              coverPhotoUri = allPhotosForListing[0];
            }
            console.log(`✅ Found ${listingPhotos.length} database photos for listing ${p.id}`);
          }
        }

        // Fallback to database videos if no cached videos
        if (allVideosForListing.length === 0) {
          const listingVideos = allVideos.filter(video => video.listingId === p.id);
          if (listingVideos.length > 0) {
            allVideosForListing = listingVideos.map(video => video.videoUri);
            console.log(`✅ Found ${listingVideos.length} database videos for listing ${p.id}`);
          }
        }

        // Fallback to original photos if no database photos
        if (!coverPhotoUri && p.photos && p.photos.length > 0) {
          coverPhotoUri = p.photos[0];
          allPhotosForListing = p.photos;
          console.log(`⚠️ Using original photos for listing ${p.id}:`, coverPhotoUri);
        }

        // Fallback to original videos if no database videos
        if (allVideosForListing.length === 0 && p.videos && p.videos.length > 0) {
          allVideosForListing = p.videos;
          console.log(`⚠️ Using original videos for listing ${p.id}`);
        }

        // No fallback to sample images - let the Image component show the home icon fallback
        if (!coverPhotoUri) {
          console.log(`📸 No cover photo found for listing ${p.id}, will show home icon fallback`);
        }
        
        // Ensure ownerUserId is always set from userId if missing
        const ownerUserId = (p.ownerUserId && p.ownerUserId.trim() !== '') 
          ? p.ownerUserId 
          : (p.userId && p.userId.trim() !== '' ? p.userId : '');
        
        // Use listing's barangay field (don't populate from owner - let filter handle fallback)
        // This ensures filtering uses the actual listing barangay, not owner's barangay
        const listingBarangay = p.barangay || '';
        
        // Log if barangay is missing (for debugging)
        if (!listingBarangay || !listingBarangay.trim()) {
          console.log(`⚠️ Listing ${p.id} has no barangay field - filter will use owner's barangay as fallback`);
        }
        
        console.log(`🔍 Listing ${p.id} owner data:`, {
          ownerUserId: p.ownerUserId,
          userId: p.userId,
          finalOwnerUserId: ownerUserId,
          businessName: p.businessName,
          ownerName: p.ownerName,
          barangay: listingBarangay || 'NOT SET'
        });
        
        // Warn if ownerUserId is still missing
        if (!ownerUserId || ownerUserId.trim() === '') {
          console.warn(`⚠️ Warning: Listing ${p.id} has no ownerUserId or userId!`);
        }
        
        const finalImage = coverPhotoUri || p.coverPhoto || '';
        
        console.log(`🔍 Final media for listing ${p.id}:`, {
          coverPhotoUri,
          originalCoverPhoto: p.coverPhoto,
          finalImage,
          hasImage: !!finalImage,
          photosCount: allPhotosForListing.length,
          videosCount: allVideosForListing.length
        });

        // Generate title from available data - always include business name if available
        const addressPart = p.address?.split(',')[0] || p.location || 'Unknown Location';
        const propertyTitle = p.businessName 
          ? `${p.businessName}'s ${p.propertyType || 'Property'} in ${addressPart}`
          : (p.title || `${p.propertyType || 'Property'} in ${addressPart}`);
        const propertyLocation = p.location || p.address?.split(',')[0] || 'Location not specified';
        
        // Get rating data for this listing
        const ratingData = ratingsMap.get(p.id) || { averageRating: 0, totalReviews: 0 };
        
        // Get capacity information
        const { getOccupiedSlots, getAvailableSlotsPerRoom } = await import('../../utils/listing-capacity');
        const occupiedSlots = await getOccupiedSlots(p.id);
        const capacity = p.capacity || 1;
        
        // Get room availability if room capacities are defined
        let roomAvailability: number[] | undefined = undefined;
        if (p.roomCapacities && p.roomCapacities.length > 0) {
          roomAvailability = await getAvailableSlotsPerRoom(p.id, p.roomCapacities);
        }
        
        return {
          id: p.id,
          image: finalImage,
          coverPhoto: finalImage,
          title: propertyTitle,
          location: propertyLocation,
          address: p.address || 'Address not specified',
          description: p.description || 'No description available',
          rating: ratingData.averageRating,
          reviews: ratingData.totalReviews,
          rooms: p.rooms || 1,
          bathrooms: p.bathrooms || 0,
          size: p.size || 0,
          price: p.price || p.monthlyRent || 0,
          businessName: p.businessName || '',
          ownerName: p.ownerName || 'Owner',
          propertyType: p.propertyType || 'Property',
          ownerUserId: ownerUserId,
          barangay: listingBarangay || '',
          capacity: capacity,
          occupiedSlots: occupiedSlots,
          roomCapacities: p.roomCapacities || undefined,
          roomAvailability: roomAvailability
        };
      }));

      // Filter out null values (listings at capacity)
      const validMappedListings = mapped.filter((listing): listing is NonNullable<typeof listing> => listing !== null);
      
      console.log('✅ Mapped listings:', validMappedListings.length, '(filtered out', mapped.length - validMappedListings.length, 'at capacity)');
      
      // Sort listings by rating (highest first), then by reviews count
      const sortedListings = validMappedListings.sort((a, b) => {
        // First, sort by rating (descending)
        if (b.rating !== a.rating) {
          return b.rating - a.rating;
        }
        // If ratings are equal, sort by number of reviews (descending)
        return b.reviews - a.reviews;
      });
      
      console.log('✅ Sorted listings by rating:', sortedListings.slice(0, 5).map(l => ({
        title: l.title,
        rating: l.rating,
        reviews: l.reviews
      })));
      
      // Ensure we have valid mapped data
      if (sortedListings.length > 0) {
        setOwnerListings(sortedListings);
        // Filtered listings will be set by useEffect that applies search and filters
        
        // Preload images for better performance
        try {
          const imageUris = sortedListings
            .map(listing => [listing.image, listing.coverPhoto])
            .flat()
            .filter(Boolean) as string[];
          
          if (imageUris.length > 0) {
            console.log(`🔄 Preloading ${imageUris.length} images for better performance...`);
            preloadSingleListingImages('dashboard', imageUris, {
              maxConcurrent: 3,
              timeout: 8000,
              retryAttempts: 1,
              enableMetrics: true
            }).catch(error => {
              console.log('⚠️ Image preloading failed:', error);
            });
          }
        } catch (preloadError) {
          console.log('⚠️ Image preloading error:', preloadError);
        }
        
        // Filtered listings will be updated by useEffect that applies search and filters
      } else {
        console.warn('⚠️ No valid listings to display');
        setOwnerListings([]);
        // Filtered listings will be set to empty by useEffect
      }
    } catch (error) {
      console.error('❌ Error loading published listings:', error);
      
      // Try to recover by clearing cache and retrying once
      try {
        console.log('🔄 Attempting recovery by clearing cache...');
        await clearCache();
        
        // Simple retry with minimal data
        const simpleListings = await db.list('published_listings');
        console.log('🔄 Recovery attempt found:', simpleListings.length, 'listings');
        
        if (simpleListings.length > 0) {
          const basicMapped = simpleListings.map((p: any) => {
            // Ensure ownerUserId is always set from userId if missing
            const ownerUserId = (p.ownerUserId && p.ownerUserId.trim() !== '') 
              ? p.ownerUserId 
              : (p.userId && p.userId.trim() !== '' ? p.userId : '');
            
            return {
              id: p.id || 'unknown',
              image: p.coverPhoto || '',
              coverPhoto: p.coverPhoto || '',
              title: p.title || p.propertyType || 'Property',
              location: p.location || p.address?.split(',')[0] || 'Unknown',
              address: p.address || '',
              description: p.description || '',
              rating: p.rating || 4.5,
              reviews: p.reviews || 0,
              rooms: p.rooms || p.bedrooms || 1,
              size: p.size || 0,
              price: p.price || p.monthlyRent || 0,
              businessName: p.businessName || '',
              ownerName: p.ownerName || '',
              propertyType: p.propertyType || 'Property',
              ownerUserId: ownerUserId,
              barangay: p.barangay || ''
            };
          });
          
          setOwnerListings(basicMapped);
          // Filtered listings will be set by useEffect that applies search and filters
          console.log('✅ Recovery successful - basic listings loaded');
        }
      } catch (recoveryError) {
        console.error('❌ Recovery attempt failed:', recoveryError);
        // Set empty state as last resort
        setOwnerListings([]);
        // Filtered listings will be set to empty by useEffect
      }
    }
  }, [isAuthenticated, user?.id]); // Remove activeFilters and applyFilters dependencies

  // Clear all published listings to remove defaults
  const clearAllPublishedListings = useCallback(async () => {
    try {
      console.log('🧹 Clearing all published listings...');
      const publishedListings = await db.list<PublishedListingRecord>('published_listings');
      console.log('📋 Found published listings to clear:', publishedListings.length);
      
      for (const listing of publishedListings) {
        await db.remove('published_listings', listing.id);
        console.log(`🗑️ Removed listing: ${listing.id}`);
      }
      
      console.log('✅ All published listings cleared');
      // Reload the listings after clearing
      await loadPublishedListings();
    } catch (error) {
      console.error('❌ Error clearing published listings:', error);
    }
  }, [isAuthenticated, user?.id]);

  // Force reload media when user logs in
  const refreshMediaData = useCallback(async () => {
    try {
      console.log('🔄 Force refreshing media data...');
      
      // Clear cache first
      await clearCache();
      console.log('🗑️ Cache cleared');

      // Get all published listings
      const publishedListings = await db.list<PublishedListingRecord>('published_listings');
      console.log('📋 Found published listings for media refresh:', publishedListings.length);

      // Get all photos and videos from database
      const allPhotos = await getAll<PropertyPhotoRecord>('property_photos');
      const allVideos = await getAll<PropertyVideoRecord>('property_videos');
      console.log('📸 Database media check - Photos:', allPhotos.length, 'Videos:', allVideos.length);

      // Log media details by listing
      publishedListings.forEach((listing) => {
        const listingPhotos = allPhotos.filter(photo => photo.listingId === listing.id);
        const listingVideos = allVideos.filter(video => video.listingId === listing.id);
        console.log(`📊 Listing ${listing.id}: ${listingPhotos.length} photos, ${listingVideos.length} videos`);
      });

      // Reload listings with fresh media
      await loadPublishedListings();
      
      // Force a second refresh to ensure media is loaded
      setTimeout(async () => {
        console.log('🔄 Second media refresh...');
        await loadPublishedListings();
      }, 500);
    } catch (error) {
      console.error('❌ Error refreshing media data:', error);
    }
  }, [isAuthenticated, user?.id]);

  // Removed favorites loading

  // Manual refresh function
  const handleManualRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      console.log('🔄 Manual refresh triggered by user...');
      
      // Debug status before refresh
      await debugAppStatus();
      
      // Clear cache first
      await clearCache();
      console.log('🗑️ General cache cleared');
      
      // Clear property media cache
      try {
        const { clearAllCachedPropertyMedia } = await import('@/utils/property-media-cache');
        await clearAllCachedPropertyMedia();
        console.log('🗑️ Property media cache cleared');
      } catch (cacheError) {
        console.log('⚠️ Could not clear property media cache:', cacheError);
      }
      
      // Sync owner media to database tables
      await syncOwnerMediaToDatabase();
      
      await loadPublishedListings();
      
      // Debug status after refresh
      console.log('🔍 Status after refresh:');
      await debugAppStatus();
    } finally {
      setIsRefreshing(false);
    }
  }, [isAuthenticated, user?.id]); // Remove function dependencies

  // Force refresh function for debugging sync issues
  const forceRefresh = useCallback(async () => {
    console.log('🔄 Force refresh triggered for sync debugging');
    try {
      setIsRefreshing(true);
      
      // Clear all caches
      await clearCache();
      
      // Clear property media cache
      try {
        const { clearAllCachedPropertyMedia } = await import('@/utils/property-media-cache');
        await clearAllCachedPropertyMedia();
        console.log('🗑️ Property media cache cleared');
      } catch (cacheError) {
        console.log('⚠️ Could not clear property media cache:', cacheError);
      }
      
      // Force reload from database
      await loadPublishedListings();
      
      console.log('✅ Force refresh completed');
    } catch (error) {
      console.error('❌ Force refresh failed:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [isAuthenticated, user?.id]);

  // Handle listing changed (enhanced with better debugging)
  const handleListingChanged = useCallback((event?: any) => {
    const eventDetail = event?.detail || {};
    console.log('🔄 Listing changed, reloading tenant dashboard...', eventDetail);
    console.log('🔄 Event details:', JSON.stringify(eventDetail, null, 2));
    
    // Show appropriate notification based on action
    let notificationMessage = '';
    switch (eventDetail.action) {
      case 'created':
        notificationMessage = 'New property listing added! 🏠';
        break;
      case 'updated':
        notificationMessage = 'Property listing updated! ✏️';
        break;
      case 'deleted':
        notificationMessage = 'Property listing removed';
        console.log('🗑️ Listing deletion detected, forcing refresh...');
        break;
      default:
        notificationMessage = 'Listings refreshed 🔄';
    }
    
    if (notificationMessage) {
      setNotification({ message: notificationMessage, type: 'success' });
      // Auto-hide notification after 3 seconds
      setTimeout(() => setNotification(null), 3000);
    }
    
    // Show refresh status
    setIsRefreshing(true);
    
    // For deletions, force a more aggressive refresh
    const refreshDelay = eventDetail.action === 'deleted' ? 200 : 100;
    
    setTimeout(async () => {
      try {
        console.log('🔄 Starting listing refresh after change...');
        
        // Clear any cached data first
        await clearCache();
        
        // Force reload from database
        await loadPublishedListings();
        
        console.log('✅ Listing refresh completed');
      } catch (error) {
        console.error('❌ Error refreshing listings after change:', error);
      } finally {
        setIsRefreshing(false);
      }
    }, refreshDelay);
  }, []); // Remove function dependencies

  // Handle booking changes that affect capacity (tenant removed)
  const handleBookingCapacityChange = useCallback(async (event?: any) => {
    const eventDetail = event?.detail || {};
    console.log('🔄 Booking capacity changed (tenant removed), refreshing listings...', eventDetail);
    
    // Refresh listings to show newly available slots
    try {
      await clearCache();
      await loadPublishedListings();
      console.log('✅ Listings refreshed after booking capacity change');
    } catch (error) {
      console.error('❌ Error refreshing listings after booking change:', error);
    }
  }, [loadPublishedListings]);

  // Check for booking status changes and show modal
  useEffect(() => {
    if (!user?.id || !isAuthenticated || !notificationsLoaded) return;

    const checkBookingStatusChanges = async () => {
      try {
        const bookings = await getBookingsByTenant(user.id);
        
        // Check for newly approved or rejected bookings that haven't been shown yet
        for (const booking of bookings) {
          // Only show modal for approved or rejected bookings that haven't been shown
          if ((booking.status === 'approved' || booking.status === 'rejected') && 
              !hasBookingNotificationBeenShown(
                booking.id,
                booking.status as 'approved' | 'rejected',
                shownBookingNotificationsRef.current
              )) {
            
            // Mark as shown and save to persistent storage
            shownBookingNotificationsRef.current = await markBookingNotificationAsShown(
              user.id,
              booking.id,
              booking.status as 'approved' | 'rejected',
              shownBookingNotificationsRef.current
            );
            
            // Show modal after a short delay to ensure UI is ready
            setTimeout(() => {
              setBookingStatusModal({
                visible: true,
                booking: booking,
                status: booking.status as 'approved' | 'rejected',
              });
            }, 500);
            
            break; // Only show one notification at a time
          }
        }
      } catch (error) {
        console.error('❌ Error checking booking status changes:', error);
      }
    };

    // Check on mount and when user changes
    checkBookingStatusChanges();

    // Also listen for booking status change events
    const handleBookingStatusChange = async (event?: any) => {
      const eventDetail = event?.detail || {};
      console.log('🔄 Booking status changed event received:', eventDetail);
      
      if (eventDetail.bookingId && user?.id) {
        // Reload bookings to get the latest status
        const bookings = await getBookingsByTenant(user.id);
        const changedBooking = bookings.find(b => b.id === eventDetail.bookingId);
        
        if (changedBooking && (changedBooking.status === 'approved' || changedBooking.status === 'rejected')) {
          if (!hasBookingNotificationBeenShown(
            changedBooking.id,
            changedBooking.status as 'approved' | 'rejected',
            shownBookingNotificationsRef.current
          )) {
            // Mark as shown and save to persistent storage
            shownBookingNotificationsRef.current = await markBookingNotificationAsShown(
              user.id,
              changedBooking.id,
              changedBooking.status as 'approved' | 'rejected',
              shownBookingNotificationsRef.current
            );
            
            setTimeout(() => {
              setBookingStatusModal({
                visible: true,
                booking: changedBooking,
                status: changedBooking.status as 'approved' | 'rejected',
              });
            }, 300);
          }
        }
      }
    };

    const removeListener = addCustomEventListener('bookingStatusChanged', handleBookingStatusChange);
    
    return () => {
      removeListener();
    };
  }, [user?.id, isAuthenticated, notificationsLoaded]);

  // Listen for listing changes to auto-refresh tenant dashboard
  useEffect(() => {
    const handlePropertyMediaRefreshed = (event: Event | any) => {
      console.log('🔄 Property media refreshed, reloading listings...', event?.detail);
      loadPublishedListings();
    };

    const handleUserLoggedIn = (event: Event | any) => {
      console.log('🔄 User logged in, reloading listings...', event?.detail);
      // Add a small delay to ensure all cache clearing is complete
      setTimeout(() => {
        loadPublishedListings();
      }, 500);
    };

    // Use cross-platform event listener utility
    const removeListingChanged = addCustomEventListener('listingChanged', handleListingChanged);
    const removeMediaRefreshed = addCustomEventListener('propertyMediaRefreshed', handlePropertyMediaRefreshed);
    const removeUserLoggedIn = addCustomEventListener('userLoggedIn', handleUserLoggedIn);
    const removeBookingCancelled = addCustomEventListener('bookingCancelled', handleBookingCapacityChange);
    const removeBookingDeleted = addCustomEventListener('bookingDeleted', handleBookingCapacityChange);
    console.log('👂 Tenant dashboard: Added listing change, media refresh, user login, and booking change listeners');
    
    return () => {
      removeListingChanged();
      removeMediaRefreshed();
      removeUserLoggedIn();
      removeBookingCancelled();
      removeBookingDeleted();
      console.log('🔇 Tenant dashboard: Removed all event listeners');
    };
  }, [isAuthenticated, user?.id, loadPublishedListings, handleListingChanged, handleBookingCapacityChange]);

  // Keep filtered listings in sync with owner listings and search params
  useEffect(() => {
    if (ownerListings.length > 0) {
      const next = filterListings(ownerListings as any, searchParams);
      setFilteredListings(next as any);
    } else {
      setFilteredListings([]);
    }
  }, [ownerListings, searchParams]);

  // Load favorite statuses for all listings
  useEffect(() => {
    const loadFavoriteStatuses = async () => {
      if (!user?.id || filteredListings.length === 0) return;
      
      try {
        const statuses = new Map<string, boolean>();
        await Promise.all(
          filteredListings.map(async (listing) => {
            if (listing.id) {
              const isFav = await isFavorite(user.id, listing.id);
              statuses.set(listing.id, isFav);
            }
          })
        );
        setFavoriteStatuses(statuses);
      } catch (error) {
        console.error('Error loading favorite statuses:', error);
      }
    };
    
    loadFavoriteStatuses();
  }, [user?.id, filteredListings]);

  // Listen for favorite changes
  useEffect(() => {
    if (!user?.id) return;
    
    const handleFavoriteChange = async () => {
      if (filteredListings.length === 0) return;
      const statuses = new Map<string, boolean>();
      await Promise.all(
        filteredListings.map(async (listing) => {
          if (listing.id) {
            const isFav = await isFavorite(user.id, listing.id);
            statuses.set(listing.id, isFav);
          }
        })
      );
      setFavoriteStatuses(statuses);
    };

    const unsubscribe = addCustomEventListener('favoriteChanged', handleFavoriteChange);
    return unsubscribe;
  }, [user?.id, filteredListings]);

  // Toggle favorite handler
  const handleToggleFavorite = async (listingId: string, e: any) => {
    e.stopPropagation(); // Prevent card click
    
    if (!user?.id) {
      showAlert('Login Required', 'Please log in to save favorites.');
      return;
    }

    if (!listingId) {
      showAlert('Error', 'Property ID not found.');
      return;
    }

    try {
      setTogglingFavorites(prev => new Set(prev).add(listingId));
      const newFavoriteStatus = await toggleFavorite(user.id, listingId);
      setFavoriteStatuses(prev => {
        const updated = new Map(prev);
        updated.set(listingId, newFavoriteStatus);
        return updated;
      });
    } catch (error) {
      console.error('Error toggling favorite:', error);
      showAlert('Error', 'Failed to update favorite. Please try again.');
    } finally {
      setTogglingFavorites(prev => {
        const updated = new Set(prev);
        updated.delete(listingId);
        return updated;
      });
    }
  };

  // Refresh listings when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log('👁️ Tenant dashboard focused, refreshing listings...');
      // Always reload when screen is focused
      if (isAuthenticated && user?.id) {
        loadPublishedListings().catch(err => {
          console.error('❌ Failed to load listings on focus:', err);
        });
      }
    }, [isAuthenticated, user?.id]) // Remove loadPublishedListings dependency
  );

  // Initial load on mount with authentication fallbacks
  useEffect(() => {
    console.log('🚀 Dashboard mounting, initial load starting...');
    const initializeDashboard = async () => {
      try {
        console.log('🔄 Initializing dashboard - loading published listings...');
        await loadPublishedListings();
        // Clean any previously seeded defaults before loading
        await removeDefaultSeededListings();
        await cleanupTestData();
        if (isAuthenticated && user?.id) {
          console.log('🚀 Initial tenant dashboard load...');
          console.log('👤 User details:', { id: user.id, roles: user.roles, name: user.name });
          await loadPublishedListings();
        } else {
          console.log('⚠️ Not authenticated or no user ID:', { isAuthenticated, userId: user?.id });
          
          // Try to load listings anyway (for demo/fallback purposes)
          console.log('🔄 Attempting fallback load without authentication...');
          try {
            await loadPublishedListings();
          } catch (fallbackError) {
            console.error('❌ Fallback load failed:', fallbackError);
          }
        }
      } catch (error) {
        console.error('❌ Error initializing dashboard:', error);
      }
    };
    
    initializeDashboard();
  }, [isAuthenticated, user?.id]);




  // Handle message owner button
  const handleMessageOwner = useCallback(async (listing: any) => {
    if (!user?.id) {
      console.log('❌ User not authenticated');
      showAlert('Error', 'Please log in to message the owner.');
      return;
    }

    // Get owner display name (business name or owner name)
    const ownerDisplayName = listing.businessName || listing.ownerName || 'Property Owner';
    
    // Get ownerUserId - try multiple fields to ensure we have it
    const ownerUserId = listing.ownerUserId || listing.userId || '';
    
    // Check if ownerUserId is valid (not empty string)
    if (!ownerUserId || ownerUserId.trim() === '') {
      console.error('❌ No ownerUserId found in listing');
      console.log('❌ Listing data:', {
        id: listing.id,
        title: listing.title,
        ownerUserId: listing.ownerUserId,
        userId: listing.userId,
        businessName: listing.businessName,
        ownerName: listing.ownerName
      });
      showAlert('Error', 'Unable to identify property owner. Please try again.');
      return;
    }
    
    try {
      console.log('💬 Starting conversation with owner:', ownerUserId);
      console.log('💬 Listing data:', listing);
      
      // Track inquiry
      await trackListingInquiry(listing.id, user.id, 'message');
      
      // Create or find conversation using utility
      const conversationId = await createOrFindConversation({
        ownerId: ownerUserId,
        tenantId: user.id,
        ownerName: ownerDisplayName,
        tenantName: user.name || 'Tenant',
        propertyId: listing.id,
        propertyTitle: listing.title
      });
      
      console.log('✅ Conversation created/found:', conversationId);
      
      // Navigate to conversation
      router.push({
        pathname: '/chat-room',
        params: {
          conversationId: conversationId,
          ownerName: ownerDisplayName,
          ownerAvatar: listing.ownerAvatar || '',
          propertyTitle: listing.title
        }
      });
    } catch (error) {
      console.error('❌ Error starting conversation:', error);
      showAlert('Error', 'Failed to start conversation. Please try again.');
    }
  }, [user, router]);

  // Handle property view
  const handlePropertyView = useCallback(async (listing: any) => {
    try {
      // Track view
      await trackListingView(listing.id, user?.id || 'anonymous');
      
      // Navigate to property preview
      router.push(`/property-preview?id=${listing.id}`);
    } catch (error) {
      console.error('❌ Error viewing property:', error);
    }
  }, [user?.id, router]);


      // Load data on component mount
  // Removed - consolidated into the main effect above

  // Refresh all property media on app startup for persistence
  useEffect(() => {
    const refreshMedia = async () => {
      try {
        const { refreshAllPropertyMedia } = await import('@/utils/media-storage');
        await refreshAllPropertyMedia();
        console.log('✅ All property media refreshed for persistence');
      } catch (error) {
        console.log('⚠️ Could not refresh property media:', error);
      }
    };
    
    refreshMedia();
  }, []);

  // Consolidated reload effect - only run when user changes
  useEffect(() => {
    if (isAuthenticated && user?.id) {
      console.log('🔄 User authenticated, loading data...', user.id);
      // Add a small delay to ensure authentication is fully processed
      const timer = setTimeout(async () => {
        try {
          // Force sync owner media first
          await syncOwnerMediaToDatabase();
          // Then reload listings
          await loadPublishedListings();
          // Refresh media data
          await refreshMediaData();
        } catch (error) {
          console.error('❌ Error loading data after authentication:', error);
        }
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, user?.id]); // Remove function dependencies to prevent loops

  // Removed favorites loading effect

  // Focus effect to reload data
  useFocusEffect(
    useCallback(() => {
      console.log('🔄 Focus effect triggered, reloading data...');
      if (isAuthenticated && user?.id) {
        loadPublishedListings();
      }
    }, [isAuthenticated, user?.id]) // Remove loadPublishedListings dependency
  );

  // Periodic database state check
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const rawListings = await db.list('published_listings');
        const publishedListings = rawListings.filter(isPublishedListingRecord);
        console.log('📊 Database state check - Total listings:', publishedListings.length);
        publishedListings.forEach((listing: PublishedListingRecord) => {
          console.log(`📋 Listing ${listing.id}: ${listing.title} (${listing.photos?.length || 0} photos, ${listing.videos?.length || 0} videos)`);
        });
      } catch (error) {
        console.error('❌ Error checking database state:', error);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Show loading while checking for active booking
  if (checkingActiveBooking) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ fontSize: 16, color: '#64748B' }}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      {/* Notification */}
      {notification && (
        <View style={[
          styles.notification,
          { backgroundColor: notification.type === 'success' ? '#D1FAE5' : '#DBEAFE' }
        ]}>
          <Text style={[
            styles.notificationText,
            { color: notification.type === 'success' ? '#065F46' : '#1E40AF' }
          ]}>
            {notification.message}
          </Text>
          <TouchableOpacity onPress={() => setNotification(null)}>
            <Text style={styles.notificationClose}>×</Text>
          </TouchableOpacity>
        </View>
      )}
      
      {/* Modern Clean Header */}
      <View style={styles.headerWrapper}>
        <View style={styles.header}>
          {/* Branding Section */}
          <View style={styles.brandingSection}>
            <Text style={styles.brandTitle}>Hanapbahay</Text>
            <Text style={styles.brandSubtitle}>Hanap Mo, Nandito na!</Text>
            <Text style={styles.brandDescription}>Discover Properties from verified owners</Text>
          </View>
          
          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <TenantSmartSearch value={searchParams} onChange={setSearchParams} />
          </View>
          
          {/* Property Count */}
          <View style={styles.propertyCountContainer}>
            <View style={styles.propertyCountBadge}>
              <Ionicons name="home" size={14} color="#10B981" />
              <Text style={styles.propertyCountText}>
                {filteredListings.length} {filteredListings.length === 1 ? 'property' : 'properties'} available
              </Text>
            </View>
            {isRefreshing && (
              <View style={styles.refreshBadge}>
                <Ionicons name="sync" size={12} color="#10B981" />
              </View>
            )}
          </View>
        </View>
      </View>


      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Featured Properties - Only show if there are filtered results */}
        {filteredListings.length > 0 && featuredListings.length > 0 && (
        <View style={styles.section}>
            <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Featured Properties</Text>
              <Text style={styles.sectionSubtitle}>
                {featuredListings.length} of {filteredListings.length} properties
              </Text>
            </View>
            
            <View style={styles.featuredScrollWrapper}>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                style={styles.featuredScroll}
                onScroll={handleCarouselScroll}
                scrollEventThrottle={16}
                decelerationRate="fast"
                contentContainerStyle={{ paddingRight: 20 }}
                nestedScrollEnabled={true}
                scrollEnabled={true}
                removeClippedSubviews={false}
              >
                {featuredListings.map((listing, index) => (
                <TouchableOpacity 
                  key={listing.id} 
                  style={styles.featuredCard}
                  onPress={() => handlePropertyView(listing)}
                  activeOpacity={0.7}
                >
                      <View style={styles.featuredImageContainer}>
                        {(listing.coverPhoto || listing.image) ? (
                          <Image 
                            source={{ uri: listing.coverPhoto || listing.image }}
                            style={styles.featuredImage}
                            onError={() => console.log('❌ Image load error for listing:', listing.id, 'URI:', listing.coverPhoto || listing.image)}
                            onLoad={() => console.log('✅ Image loaded for listing:', listing.id, 'URI:', listing.coverPhoto || listing.image)}
                            resizeMode="cover"
                          />
                        ) : (
                          <View style={styles.featuredNoImageContainer}>
                            <Text style={styles.featuredNoImageText}>🏠 Featured Property</Text>
                          </View>
                        )}
                      </View>
                  <View style={styles.featuredContent}>
                    <Text style={styles.featuredTitle} numberOfLines={2}>{listing.title}</Text>
                    <Text style={styles.featuredDescription} numberOfLines={2}>{listing.description}</Text>
                    <Text style={styles.featuredPrice}>₱{listing.price.toLocaleString()}</Text>
                    <View style={styles.featuredRating}>
                      <Ionicons name="star" size={14} color={listing.rating > 0 ? "#F59E0B" : "#D1D5DB"} />
                      <Text style={styles.ratingText}>
                        {listing.rating > 0 ? listing.rating.toFixed(1) : 'No ratings'}{listing.rating > 0 && ` (${listing.reviews})`}
                      </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
            </View>
          )}

        {/* All Properties */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>All Properties</Text>
            <Text style={styles.sectionSubtitle}>
              {filteredListings.length} {filteredListings.length === 1 ? 'property' : 'properties'}
            </Text>
          </View>
          
          {filteredListings.length > 0 ? (
            filteredListings.map((listing) => (
              <View key={listing.id} style={styles.propertyCard}>
              <View style={styles.imageContainer}>
                {(listing.coverPhoto || listing.image) ? (
                  <Image 
                    source={{ uri: listing.coverPhoto || listing.image }}
                    style={styles.propertyImage}
                    onError={(error) => {
                      console.log('❌ Image load error for listing:', listing.id, 'URI:', listing.coverPhoto || listing.image, error);
                    }}
                    onLoad={() => console.log('✅ Image loaded for listing:', listing.id, 'URI:', listing.coverPhoto || listing.image)}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.noImageContainer}>
                    <Text style={styles.noImageText}>🏠 Property Image</Text>
                  </View>
                )}
                {/* Rating Badge Overlay */}
                {listing.rating > 0 && (
                  <View style={styles.ratingBadge}>
                    <Ionicons name="star" size={14} color="#F59E0B" />
                    <Text style={styles.ratingBadgeText}>{listing.rating.toFixed(1)}</Text>
                  </View>
                )}
                {/* Property Type Badge */}
                {listing.propertyType && (
                  <View style={styles.propertyTypeBadge}>
                    <Text style={styles.propertyTypeText}>{listing.propertyType}</Text>
                  </View>
                )}
                {/* Favorite Heart Button */}
                {isAuthenticated && user?.id && listing.id && (
                  <TouchableOpacity
                    onPress={(e) => handleToggleFavorite(listing.id!, e)}
                    disabled={togglingFavorites.has(listing.id!)}
                    style={styles.favoriteButton}
                    activeOpacity={0.7}
                  >
                    <Heart 
                      size={20} 
                      color={favoriteStatuses.get(listing.id!) ? "#EF4444" : "#6B7280"} 
                      fill={favoriteStatuses.get(listing.id!) ? "#EF4444" : "none"}
                    />
                  </TouchableOpacity>
                )}
              </View>
                
              <View style={styles.propertyContent}>
                {/* Title and Price Row */}
                <View style={styles.titlePriceRow}>
                  <View style={styles.titleContainer}>
                    <Text style={styles.propertyTitle} numberOfLines={2}>{listing.title}</Text>
                  </View>
                  <Text style={styles.propertyPrice}>{'₱' + listing.price.toLocaleString()}</Text>
                </View>
                
                {/* Location */}
                {((listing.location && typeof listing.location === 'string') || (listing.address && typeof listing.address === 'string')) ? (
                  <View style={styles.locationRow}>
                    <Ionicons name="location" size={14} color="#64748B" />
                    <Text style={styles.locationText} numberOfLines={1}>
                      {String(listing.location || (listing.address?.split(',')[0] || 'Location not specified'))}
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
                {(listing.capacity !== undefined || listing.occupiedSlots !== undefined) && (
                  <View style={styles.capacityContainer}>
                    <View style={styles.capacityHeader}>
                      <Ionicons name="people" size={18} color="#10B981" />
                      <Text style={styles.capacitySectionTitle}>Capacity</Text>
                    </View>
                    {listing.occupiedSlots !== undefined && listing.capacity !== undefined
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
                      : listing.capacity !== undefined
                      ? (
                        <View style={styles.capacityInfo}>
                          <View style={styles.capacityRow}>
                            <Text style={styles.capacityLabel}>Total Capacity:</Text>
                            <Text style={styles.capacityValue}>{listing.capacity} {listing.capacity === 1 ? 'slot' : 'slots'}</Text>
                          </View>
                          <Text style={styles.capacityNote}>Ready for occupancy</Text>
                        </View>
                      )
                      : null
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
                
                {/* Property Details */}
                <View style={styles.propertyDetails}>
                  <View style={styles.detailItem}>
                    <Ionicons name="bed-outline" size={18} color="#3B82F6" />
                    <View style={styles.detailItemContent}>
                      <Text style={styles.detailText}>{listing.rooms || 0}</Text>
                      <Text style={styles.detailLabel}>{(listing.rooms || 0) === 1 ? 'Room' : 'Rooms'}</Text>
                    </View>
                  </View>
                  <View style={styles.detailDivider} />
                  <View style={styles.detailItem}>
                    <Ionicons name="water-outline" size={18} color="#3B82F6" />
                    <View style={styles.detailItemContent}>
                      <Text style={styles.detailText}>{listing.bathrooms || 0}</Text>
                      <Text style={styles.detailLabel}>Bath</Text>
                    </View>
                  </View>
                  {listing.barangay && (
                    <>
                      <View style={styles.detailDivider} />
                      <View style={styles.detailItem}>
                        <Ionicons name="map-outline" size={18} color="#3B82F6" />
                        <View style={styles.detailItemContent}>
                          <Text style={styles.detailLabel} numberOfLines={1}>{listing.barangay}</Text>
                        </View>
                      </View>
                    </>
                  )}
                </View>
                    
                {/* Action Buttons */}
                <View style={styles.propertyActions}>
                  {((listing.ownerUserId && listing.ownerUserId.trim() !== '') || (listing.userId && listing.userId.trim() !== '')) && (
                    <Pressable 
                      style={styles.messageButton}
                      onPress={() => handleMessageOwner(listing)}
                    >
                      <Ionicons name="chatbubble-ellipses" size={18} color="#FFFFFF" />
                      <Text style={styles.messageButtonText}>Message</Text>
                    </Pressable>
                  )}
                  
                  <Pressable 
                    style={styles.viewButton}
                    onPress={() => handlePropertyView(listing)}
                  >
                    <Ionicons name="eye" size={18} color="#FFFFFF" />
                    <Text style={styles.viewButtonText}>View Details</Text>
                  </Pressable>
                </View>
              </View>
            </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="home" size={48} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>No Properties Found</Text>
              <Text style={styles.emptySubtitle}>Check back later for new property listings</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Booking Status Modal */}
      <BookingStatusModal
        visible={bookingStatusModal.visible}
        booking={bookingStatusModal.booking}
        status={bookingStatusModal.status}
        onClose={() => {
          setBookingStatusModal(prev => ({ ...prev, visible: false }));
        }}
        onViewBooking={() => {
          setBookingStatusModal(prev => ({ ...prev, visible: false }));
          router.push('/(tabs)/bookings');
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  notification: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginHorizontal: 20,
    marginTop: 10,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#10B981',
  },
  notificationText: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  notificationClose: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#6B7280',
    marginLeft: 10,
  },
  headerWrapper: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 2,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
  },
  brandingSection: {
    marginBottom: 20,
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.8,
    marginBottom: 6,
  },
  brandSubtitle: {
    fontSize: 17,
    color: '#10B981',
    fontWeight: '700',
    marginBottom: 6,
    letterSpacing: 0.2,
  },
  brandDescription: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '400',
    lineHeight: 20,
  },
  searchContainer: {
    marginBottom: 16,
    marginTop: 0,
    padding: 0,
    width: '100%',
  },
  propertyCountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
  },
  propertyCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  propertyCountText: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  refreshBadge: {
    backgroundColor: '#F0FDF4',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#D1FAE5',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  content: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  section: {
    paddingHorizontal: 16, // Reduced from 20
    marginBottom: 20, // Reduced from 28
    marginTop: 16, // Reduced from 24
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14, // Reduced from 18
    paddingBottom: 10, // Reduced from 12
    borderBottomWidth: 2,
    borderBottomColor: '#E2E8F0',
  },
  sectionTitle: {
    fontSize: 18, // Reduced from 20
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
  featuredScrollWrapper: {
    width: '100%',
    height: 300, // Increased to accommodate longer titles
  },
  featuredScroll: {
    marginHorizontal: -16, // Reduced from -20
    paddingHorizontal: 16, // Reduced from 20
    flexGrow: 0,
    flexShrink: 0,
  },
  featuredCard: {
    width: 240, // Reduced from 260
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginRight: 12, // Reduced from 16
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'column',
  },
  featuredImage: {
    width: '100%',
    height: 130, // Reduced from 150
  },
  featuredContent: {
    padding: 12, // Reduced from 14
    minHeight: 140,
  },
  featuredTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 6,
    letterSpacing: 0.2,
    lineHeight: 20,
  },
  featuredDescription: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 8,
    fontWeight: '400',
    lineHeight: 16,
  },
  featuredPrice: {
    fontSize: 18,
    fontWeight: '800',
    color: '#059669',
    marginBottom: 8,
  },
  featuredRating: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  ratingText: {
    fontSize: 13,
    color: '#92400E',
    fontWeight: '600',
    lineHeight: 16,
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
  featuredImageContainer: {
    position: 'relative',
    width: '100%',
    height: 130, // Reduced from 180
    overflow: 'hidden',
  },
  propertyImage: {
    width: '100%',
    height: 200,
  },
  ratingBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  ratingBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  favoriteButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 9999,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
  featuredNoImageContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noImageText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  featuredNoImageText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  propertyContent: {
    padding: 18,
  },
  titlePriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
    gap: 12,
  },
  titleContainer: {
    flex: 1,
  },
  propertyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: 0.2,
    lineHeight: 24,
  },
  propertyPrice: {
    fontSize: 20,
    fontWeight: '800',
    color: '#059669',
    letterSpacing: 0.3,
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
  propertyDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginBottom: 16,
    paddingVertical: 14,
    paddingHorizontal: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    gap: 0,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    justifyContent: 'center',
    minWidth: 70,
    maxWidth: 120,
  },
  detailItemContent: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    justifyContent: 'center',
    gap: 2,
  },
  detailText: {
    fontSize: 16,
    color: '#1E293B',
    fontWeight: '700',
    lineHeight: 20,
  },
  detailLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
    lineHeight: 14,
  },
  detailDivider: {
    width: 1,
    height: 36,
    backgroundColor: '#E2E8F0',
    alignSelf: 'center',
    marginHorizontal: 4,
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    gap: 12,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#1F2937',
    padding: 0,
  },
  clearButton: {
    marginLeft: 8,
    padding: 4,
  },
  filterButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  filterBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  activeFiltersContainer: {
    marginTop: 12,
    paddingBottom: 4,
  },
  activeFiltersScroll: {
    flexDirection: 'row',
  },
  filterTag: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  filterTagText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  filterCountText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '400',
  },
});