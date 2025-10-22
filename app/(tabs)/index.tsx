import { ScrollView, View, Pressable, Animated, Text, SafeAreaView, TouchableOpacity, Image, StyleSheet, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useEffect, useRef, useState, useCallback } from 'react';
import { RefreshCw } from 'lucide-react-native';
import { db, clearCache, getAll } from '../../utils/db';
import { OwnerProfileRecord, DbUserRecord, PublishedListingRecord } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
// Removed favorite functionality
import { loadPropertyMedia } from '../../utils/media-storage';
import { trackListingView } from '../../utils/view-tracking';
import { trackListingInquiry } from '../../utils/inquiry-tracking';
import { getPropertyRatingsMap } from '../../utils/property-ratings';

export default function DashboardScreen() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();
  const scrollIndicatorOpacity = useRef(new Animated.Value(1)).current;
  const carouselRef = useRef<{ scrollToNext: () => void } | null>(null);
  const [searchText, setSearchText] = useState('');
  const [filteredListings, setFilteredListings] = useState<{ id: string; image: string; coverPhoto?: string; title: string; location: string; address?: string; description?: string; rating: number; reviews: number; rooms: number; bathrooms?: number; size: number; price: number; businessName?: string; ownerName?: string; propertyType?: string; ownerUserId?: string }[]>([]);
  const [owners, setOwners] = useState<(OwnerProfileRecord & { user?: DbUserRecord })[]>([]);
  const [ownerListings, setOwnerListings] = useState<{ id: string; image: string; coverPhoto?: string; title: string; location: string; address?: string; description?: string; rating: number; reviews: number; rooms: number; bathrooms?: number; size: number; price: number; businessName?: string; ownerName?: string; propertyType?: string; ownerUserId?: string }[]>([]);
  const [showScrollIndicator, setShowScrollIndicator] = useState(true);
  const [isScrolling, setIsScrolling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'info' } | null>(null);
  const [activeFilters, setActiveFilters] = useState<{
    propertyType?: string;
    priceRange?: { min: number; max: number };
    barangay?: string;
  }>({});
  // Removed favorite state

  // Helper function for showing alerts
  const showAlert = (title: string, message: string) => {
    Alert.alert(title, message);
  };

  // Will define clearAllPublishedListings after loadPublishedListings

  // Featured listings derived from latest owner listings
  const featuredListings = ownerListings.slice(0, 5);
  
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
      const publishedListings = await db.list('published_listings');
      const { savePropertyMedia } = await import('@/utils/media-storage');
      
      console.log(`📊 Found ${publishedListings.length} published listings to check for media sync`);
      
      let syncedCount = 0;
      for (const listing of publishedListings) {
        try {
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
      const publishedListings = await db.list('published_listings');
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
      const seededOwnerIds = new Set(['owner-1', 'owner-2']);
      const seededImageHints = [
        'images.unsplash.com/photo-1564013799919-ab600027ffc6',
        'images.unsplash.com/photo-1570129477492-45c003edd2be'
      ];

      const publishedListings = await db.list('published_listings');
      const toDelete = publishedListings.filter((p: any) => {
        const isSeedOwner = seededOwnerIds.has(p?.userId);
        const hasSeedImage = typeof p?.coverPhoto === 'string' && seededImageHints.some(h => p.coverPhoto.includes(h));
        const hasSampleAddress = typeof p?.address === 'string' && /Sample/i.test(p.address);
        return isSeedOwner || hasSeedImage || hasSampleAddress;
      });

      if (toDelete.length > 0) {
        console.log(`🧹 Removing ${toDelete.length} default/sample listings...`);
        for (const listing of toDelete) {
          await db.remove('published_listings', listing.id);
        }
      }
    } catch (cleanupError) {
      console.log('⚠️ Cleanup of default listings failed (non-fatal):', cleanupError);
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
      const publishedListings = await db.list('published_listings');
      
      // Remove default property IDs
      const defaultPropertyIds = ['property_001', 'property_002', 'property_003'];
      const defaultOwnerIds = ['owner_default_001', 'owner_default_002', 'test_owner'];
      
      let removedCount = 0;
      
      for (const listing of publishedListings) {
        if (defaultPropertyIds.includes(listing.id) || 
            defaultOwnerIds.includes(listing.userId) ||
            defaultOwnerIds.includes(listing.ownerUserId)) {
          await db.remove('published_listings', listing.id);
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
      const publishedListings = await db.list('published_listings');
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
          const newListings = await db.list('published_listings');
          console.log(`📊 After creating samples: ${newListings.length} listings found`);
        }
      }
      
      // Test 2: Verify individual listing retrieval
      let successfulRetrievals = 0;
      const finalListings = await db.list('published_listings');
      for (const listing of finalListings) {
        try {
          const retrievedListing = await db.get('published_listings', listing.id);
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
      const publishedListings = await db.list('published_listings');
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
      const publishedListings = await db.list('published_listings');
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
      
      const rawListings = await db.list('published_listings');
      console.log(`📊 TOTAL LISTINGS IN DATABASE: ${rawListings.length}\n`);
      
      if (rawListings.length === 0) {
        console.log('❌ NO LISTINGS FOUND IN DATABASE!');
        console.log('   This means no owner has created any listings yet.');
        console.log('   OR listings were deleted by the old duplicate removal bug.\n');
        console.log('✅ SOLUTION: Login as owner and create listings.\n');
      } else {
        rawListings.forEach((listing: any, index: number) => {
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
        const validCount = rawListings.filter((l: any) => 
          l && l.id && l.status && l.status.toLowerCase() === 'published'
        ).length;
        const invalidCount = rawListings.length - validCount;
        
        console.log('===========================================');
        console.log('📊 SUMMARY:');
        console.log('===========================================');
        console.log(`Total in database: ${rawListings.length}`);
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
      let publishedListings = await db.list('published_listings');
      console.log('📋 Found published listings:', publishedListings.length);
      
      // Log each listing's basic info for debugging
      publishedListings.forEach((listing: PublishedListingRecord, index: number) => {
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
      if (publishedListings.length === 0) {
        console.log('📋 No published listings found - showing empty state');
      }
      
      // Debug: Check if any listings have the correct structure
      if (publishedListings.length > 0) {
        const firstListing = publishedListings[0];
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
        const allPhotos = await getAll('property_photos');
        const allVideos = await getAll('property_videos');
        console.log('📸 Database photos:', allPhotos.length);
        console.log('🎥 Database videos:', allVideos.length);
        
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
      const validListings = publishedListings.filter((p: PublishedListingRecord) => {
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
      
      console.log(`📋 Valid listings after filtering: ${validListings.length} out of ${publishedListings.length}`);
      
      // EMERGENCY FALLBACK: If no valid listings but we have listings in DB, show them anyway
      let listingsToProcess = validListings;
      if (validListings.length === 0 && publishedListings.length > 0) {
        console.warn('⚠️ EMERGENCY FALLBACK: No valid listings found, but database has listings!');
        console.warn('⚠️ Showing ALL listings regardless of status to help debug...');
        listingsToProcess = publishedListings;
      }
      
      console.log(`📋 Processing ${listingsToProcess.length} listings...`);
      
      // Load rating data for all listings
      console.log('⭐ Loading rating data for all listings...');
      const listingIds = listingsToProcess.map(p => p.id);
      const ratingsMap = await getPropertyRatingsMap(listingIds);
      console.log(`⭐ Loaded ratings for ${ratingsMap.size} listings`);
      
      // Process listings with media loading
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
          hasVideos: p.videos?.length || 0
        });

        // Try to get fresh media from database with caching
        let coverPhotoUri = '';
        let allPhotosForListing: string[] = [];
        let allVideosForListing: string[] = [];

        // Try to load media with caching first
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
          
          // Use media from the storage system
          coverPhotoUri = media.coverPhoto || '';
          allPhotosForListing = media.photos;
          allVideosForListing = media.videos;
          
          if (media.coverPhoto) {
            coverPhotoUri = media.coverPhoto;
            console.log(`✅ Found cached cover photo for listing ${p.id}`);
          }
          
          if (media.photos.length > 0) {
            allPhotosForListing = media.photos;
            if (!coverPhotoUri) {
              coverPhotoUri = media.photos[0];
            }
            console.log(`✅ Found ${media.photos.length} cached photos for listing ${p.id}`);
          }
          
          if (media.videos.length > 0) {
            allVideosForListing = media.videos;
            console.log(`✅ Found ${media.videos.length} cached videos for listing ${p.id}`);
          }
        } catch (mediaError) {
          console.log(`⚠️ Failed to load cached media for listing ${p.id}:`, mediaError);
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

        // Final fallback - use sample image if still no cover photo
        if (!coverPhotoUri) {
          coverPhotoUri = 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400&h=300&fit=crop';
          console.log(`⚠️ No cover photo found for listing ${p.id}, using fallback image`);
        }

        // No default placeholder images - only show real media
        
        const ownerUserId = p.ownerUserId || p.userId || '';
        console.log(`🔍 Listing ${p.id} owner data:`, {
          ownerUserId: p.ownerUserId,
          userId: p.userId,
          finalOwnerUserId: ownerUserId,
          businessName: p.businessName,
          ownerName: p.ownerName
        });
        
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
          rooms: p.rooms || p.bedrooms || 1,
          bathrooms: p.bathrooms || 0,
          size: p.size || 0,
          price: p.price || p.monthlyRent || 0,
          businessName: p.businessName || '',
          ownerName: p.ownerName || 'Owner',
          propertyType: p.propertyType || 'Property',
          ownerUserId: ownerUserId
        };
      }));

      console.log('✅ Mapped listings:', mapped.length);
      
      // Sort listings by rating (highest first), then by reviews count
      const sortedListings = mapped.sort((a, b) => {
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
        setFilteredListings(sortedListings);
        
        // Force a re-render to ensure media is displayed
        setTimeout(() => {
          setFilteredListings([...sortedListings]);
        }, 100);
      } else {
        console.warn('⚠️ No valid listings to display');
        setOwnerListings([]);
        setFilteredListings([]);
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
          const basicMapped = simpleListings.map((p: any) => ({
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
            ownerUserId: p.ownerUserId || p.userId || ''
          }));
          
          setOwnerListings(basicMapped);
          setFilteredListings(basicMapped);
          console.log('✅ Recovery successful - basic listings loaded');
        }
      } catch (recoveryError) {
        console.error('❌ Recovery attempt failed:', recoveryError);
        // Set empty state as last resort
        setOwnerListings([]);
        setFilteredListings([]);
      }
    }
  }, [isAuthenticated, user?.id]);

  // Clear all published listings to remove defaults
  const clearAllPublishedListings = useCallback(async () => {
    try {
      console.log('🧹 Clearing all published listings...');
      const publishedListings = await db.list('published_listings');
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
  }, [loadPublishedListings]);

  // Force reload media when user logs in
  const refreshMediaData = useCallback(async () => {
    try {
      console.log('🔄 Force refreshing media data...');
      
      // Clear cache first
      await clearCache();
      console.log('🗑️ Cache cleared');

      // Get all published listings
      const publishedListings = await db.list('published_listings');
      console.log('📋 Found published listings for media refresh:', publishedListings.length);

      // Get all photos and videos from database
      const allPhotos = await getAll('property_photos');
      const allVideos = await getAll('property_videos');
      console.log('📸 Database media check - Photos:', allPhotos.length, 'Videos:', allVideos.length);

      // Log media details by listing
      publishedListings.forEach((listing: PublishedListingRecord) => {
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
  }, [loadPublishedListings]);

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
  }, [loadPublishedListings, syncOwnerMediaToDatabase, debugAppStatus]);

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
  }, [loadPublishedListings]);

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
  }, [loadPublishedListings]);

  // Listen for listing changes to auto-refresh tenant dashboard
  useEffect(() => {
    const handlePropertyMediaRefreshed = (event: CustomEvent) => {
      console.log('🔄 Property media refreshed, reloading listings...', event.detail);
      loadPublishedListings();
    };

    const handleUserLoggedIn = (event: CustomEvent) => {
      console.log('🔄 User logged in, reloading listings...', event.detail);
      // Add a small delay to ensure all cache clearing is complete
      setTimeout(() => {
        loadPublishedListings();
      }, 500);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('listingChanged', handleListingChanged);
      window.addEventListener('propertyMediaRefreshed', handlePropertyMediaRefreshed);
      window.addEventListener('userLoggedIn', handleUserLoggedIn);
      console.log('👂 Tenant dashboard: Added listing change, media refresh, and user login listeners');
      
      return () => {
        window.removeEventListener('listingChanged', handleListingChanged);
        window.removeEventListener('propertyMediaRefreshed', handlePropertyMediaRefreshed);
        window.removeEventListener('userLoggedIn', handleUserLoggedIn);
        console.log('🔇 Tenant dashboard: Removed listing change, media refresh, and user login listeners');
      };
    }
  }, [handleListingChanged, loadPublishedListings]);

  // Refresh listings when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log('👁️ Tenant dashboard focused, refreshing listings...');
      // Always reload when screen is focused
      loadPublishedListings().catch(err => {
        console.error('❌ Failed to load listings on focus:', err);
      });
    }, [])
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
  }, [isAuthenticated, user?.id, loadPublishedListings]);




  // Handle message owner button
  const handleMessageOwner = useCallback(async (listing: any) => {
    if (!user?.id) {
      console.log('❌ User not authenticated');
      return;
    }

    try {
      console.log('💬 Starting conversation with owner:', listing.ownerUserId);
      console.log('💬 Listing data:', listing);
      
      // Check if ownerUserId is valid
      if (!listing.ownerUserId) {
        console.error('❌ No ownerUserId found in listing');
        console.log('❌ Listing data:', listing);
        showAlert('Error', 'Unable to identify property owner. Please try again.');
        return;
      }
      
      // For testing purposes, if no ownerUserId, use a default owner
      const actualOwnerId = listing.ownerUserId || 'default_owner_123';
      console.log('💬 Using owner ID:', actualOwnerId);
      
      // Track inquiry
      await trackListingInquiry(listing.id, user.id, 'message');
      
      // Check if conversation already exists
      const existingConversations = await db.list('conversations');
      console.log('💬 All existing conversations:', existingConversations);
      
      const existingConversation = existingConversations.find(conv => 
        conv.tenant_id === user.id && conv.owner_id === actualOwnerId
      );

      // Get owner display name (business name or owner name)
      const ownerDisplayName = listing.businessName || listing.ownerName || 'Property Owner';
      
      if (existingConversation) {
        // Navigate to existing conversation
        console.log('📱 Navigating to existing conversation:', existingConversation.id);
        router.push({
          pathname: '/chat-room',
          params: {
            name: ownerDisplayName,
            otherUserId: actualOwnerId,
            conversationId: existingConversation.id,
            propertyId: listing.id,
            propertyTitle: listing.title
          }
        });
      } else {
        // Create new conversation
        const conversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const conversationData = {
          id: conversationId,
          tenant_id: user.id,
          owner_id: actualOwnerId,
          participant_ids: [user.id, actualOwnerId],
          tenantName: user.name || 'Tenant',
          ownerName: ownerDisplayName,
          last_message_text: '',
          last_message_at: new Date().toISOString(),
          unread_by_owner: 0,
          unread_by_tenant: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        console.log('💬 Creating conversation with data:', conversationData);
        await db.upsert('conversations', conversationId, conversationData);
        console.log('💬 Created new conversation:', conversationId);
        router.push({
          pathname: '/chat-room',
          params: {
            name: ownerDisplayName,
            otherUserId: actualOwnerId,
            conversationId: conversationId,
            propertyId: listing.id,
            propertyTitle: listing.title
          }
        });
      }
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

  // Handle search
  const handleSearch = useCallback((text: string) => {
    setSearchText(text);
    if (!text.trim()) {
      setFilteredListings(ownerListings);
      return;
    }

    const filtered = ownerListings.filter(listing =>
      listing.title.toLowerCase().includes(text.toLowerCase()) ||
      listing.location.toLowerCase().includes(text.toLowerCase()) ||
      listing.description?.toLowerCase().includes(text.toLowerCase())
    );
    setFilteredListings(filtered);
  }, [ownerListings]);

  // Handle filter
  const handleFilter = useCallback(() => {
    router.push('/filter');
  }, [router]);

      // Load data on component mount
  useEffect(() => {
    loadPublishedListings();
  }, [loadPublishedListings]);

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

  // Force reload on login
  useEffect(() => {
    if (isAuthenticated && user?.id) {
      console.log('🔄 User logged in, force reloading media...');
      // Add a small delay to ensure authentication is fully processed
      const timer = setTimeout(() => {
        refreshMediaData();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, user?.id, refreshMediaData]);

  // Force reload when user changes (login/logout)
  useEffect(() => {
    if (user?.id) {
      console.log('🔄 User changed, force reloading listings...', user.id);
      // Add a delay to ensure all cache clearing is complete
      const timer = setTimeout(async () => {
        try {
          // Force sync owner media first
          await syncOwnerMediaToDatabase();
          // Then reload listings
          await loadPublishedListings();
        } catch (error) {
          console.error('❌ Error reloading after user change:', error);
        }
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [user?.id, loadPublishedListings, syncOwnerMediaToDatabase]);

  // Removed favorites loading effect

  // Focus effect to reload data
  useFocusEffect(
    useCallback(() => {
      console.log('🔄 Focus effect triggered, reloading data...');
      loadPublishedListings();
      if (isAuthenticated && user?.id) {
        // Removed favorites loading
      }
    }, [isAuthenticated, user?.id, loadPublishedListings])
  );

  // Periodic database state check
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const publishedListings = await db.list('published_listings');
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

  return (
    <SafeAreaView style={styles.container}>
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
      
      {/* Modern Professional Header */}
      <View style={styles.headerWrapper}>
        <LinearGradient
          colors={['#1E3A8A', '#3B82F6', '#60A5FA']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <View style={styles.header}>
            <View style={styles.headerTop}>
              <View style={styles.headerTextContainer}>
                <View style={styles.iconTitleRow}>
                  <Ionicons name="home" size={28} color="#FFFFFF" style={styles.headerIcon} />
                  <Text style={styles.headerTitle}>Find Your Perfect Home</Text>
                </View>
                <Text style={styles.headerSubtitle}>Discover rentals in the heart of Lopez, Quezon</Text>
              </View>
              {isRefreshing && (
                <View style={styles.refreshBadge}>
                  <Ionicons name="sync" size={12} color="#3B82F6" />
                </View>
              )}
            </View>

            {/* Modern Search Bar */}
            <View style={styles.searchWrapper}>
              <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color="#3B82F6" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search by location, type, or price..."
                  value={searchText}
                  onChangeText={handleSearch}
                  placeholderTextColor="#9CA3AF"
                />
                <Pressable
                  onPress={handleFilter}
                  accessibilityRole="button"
                  accessibilityLabel="Open filters"
                  style={styles.searchFilterButton}
                >
                  <LinearGradient
                    colors={['#3B82F6', '#2563EB']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.filterGradient}
                  >
                    <Ionicons name="options" size={18} color="#FFFFFF" />
                  </LinearGradient>
                </Pressable>
              </View>
            </View>
          </View>
        </LinearGradient>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Featured Properties */}
        {featuredListings.length > 0 && (
        <View style={styles.section}>
            <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Featured Properties</Text>
              <Text style={styles.sectionSubtitle}>{featuredListings.length} properties</Text>
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
                    <Text style={styles.featuredTitle}>{listing.title}</Text>
                    <Text style={styles.featuredDescription} numberOfLines={2}>{listing.description}</Text>
                    <Text style={styles.featuredPrice}>₱{listing.price.toLocaleString()}</Text>
                    <View style={styles.featuredRating}>
                      <Ionicons name="star" size={14} color={listing.rating > 0 ? "#F59E0B" : "#D1D5DB"} />
                      <Text style={styles.ratingText}>
                        {listing.rating > 0 ? listing.rating.toFixed(1) : 'No ratings'} 
                        {listing.rating > 0 && ` (${listing.reviews})`}
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
            <Text style={styles.sectionSubtitle}>{filteredListings.length} properties</Text>
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
                      </View>
                
                <View style={styles.propertyContent}>
                  <Text style={styles.propertyTitle}>{listing.title}</Text>
                  <Text style={styles.propertyDescription} numberOfLines={2}>{listing.description}</Text>
                  <Text style={styles.propertyPrice}>₱{listing.price.toLocaleString()}</Text>
                  
                  <View style={styles.propertyDetails}>
                    <View style={styles.detailItem}>
                      <Ionicons name="bed" size={16} color="#6B7280" />
                      <Text style={styles.detailText}>{listing.rooms} rooms</Text>
                    </View>
                    <View style={styles.detailItem}>
                      <Ionicons name="water" size={16} color="#6B7280" />
                      <Text style={styles.detailText}>{listing.bathrooms || 0} {(listing.bathrooms || 0) === 1 ? 'Bathroom' : 'Bathrooms'}</Text>
                    </View>
                    <View style={styles.detailItem}>
                      <Ionicons name="star" size={16} color={listing.rating > 0 ? "#F59E0B" : "#D1D5DB"} />
                      <Text style={styles.detailText}>
                        {listing.rating > 0 ? listing.rating.toFixed(1) : 'No ratings'} 
                        {listing.rating > 0 && ` (${listing.reviews})`}
                      </Text>
                    </View>
                  </View>
                    
                  <View style={styles.propertyActions}>
                    <Pressable 
                        style={styles.messageButton}
                        onPress={() => handleMessageOwner(listing)}
                      >
                      <Ionicons name="chatbubble" size={16} color="#FFFFFF" />
                        <Text style={styles.messageButtonText}>Message Owner</Text>
                    </Pressable>
                    
                    <Pressable 
                      style={styles.viewButton}
                      onPress={() => handlePropertyView(listing)}
                    >
                      <Ionicons name="eye" size={16} color="#FFFFFF" />
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
              <Text style={styles.emptySubtitle}>Try adjusting your search or filters</Text>
            </View>
          )}
        </View>
      </ScrollView>
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  headerGradient: {
    paddingBottom: 24,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  headerTextContainer: {
    flex: 1,
  },
  iconTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerIcon: {
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 15,
    color: '#E0E7FF',
    marginTop: 4,
    marginLeft: 40,
    fontWeight: '400',
  },
  refreshBadge: {
    backgroundColor: '#FFFFFF',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  searchWrapper: {
    paddingBottom: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
    marginLeft: 12,
    marginRight: 12,
  },
  searchFilterButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  filterGradient: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 28,
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: '#E2E8F0',
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1E293B',
    letterSpacing: 0.3,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
    backgroundColor: '#E0E7FF',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  featuredScrollWrapper: {
    width: '100%',
    height: 380,
  },
  featuredScroll: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
    flexGrow: 0,
    flexShrink: 0,
  },
  featuredCard: {
    width: 300,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginRight: 18,
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  featuredImage: {
    width: '100%',
    height: 180,
  },
  featuredContent: {
    padding: 18,
  },
  featuredTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 6,
    letterSpacing: 0.2,
  },
  featuredDescription: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 12,
    fontWeight: '400',
    lineHeight: 20,
  },
  featuredPrice: {
    fontSize: 20,
    fontWeight: '800',
    color: '#059669',
    marginBottom: 10,
  },
  featuredRating: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  ratingText: {
    fontSize: 13,
    color: '#92400E',
    marginLeft: 4,
    fontWeight: '600',
  },
  propertyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    marginBottom: 20,
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 6,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: 220,
    overflow: 'hidden',
  },
  featuredImageContainer: {
    position: 'relative',
    width: '100%',
    height: 180,
    overflow: 'hidden',
  },
  propertyImage: {
    width: '100%',
    height: 220,
  },
  noImageContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#6366F1',
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
    padding: 20,
  },
  propertyTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 6,
    letterSpacing: 0.2,
  },
  propertyDescription: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 12,
    fontWeight: '400',
    lineHeight: 20,
  },
  propertyPrice: {
    fontSize: 22,
    fontWeight: '800',
    color: '#059669',
    marginBottom: 16,
  },
  propertyDetails: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 18,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  detailText: {
    fontSize: 13,
    color: '#475569',
    marginLeft: 6,
    fontWeight: '600',
  },
  propertyActions: {
    flexDirection: 'row',
    gap: 12,
  },
  messageButton: {
    flex: 1,
    backgroundColor: '#059669',
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  messageButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    marginLeft: 8,
    fontSize: 14,
    letterSpacing: 0.3,
  },
  viewButton: {
    flex: 1,
    backgroundColor: '#3B82F6',
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  viewButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    marginLeft: 8,
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