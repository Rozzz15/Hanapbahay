import { db, isPublishedListingRecord, getAllPublishedListings } from './db';
import { savePropertyMedia, loadPropertyMedia, refreshAllPropertyMedia } from './media-storage';
import { PropertyMedia } from './media-storage';

/**
 * Media persistence utilities to ensure all media is properly saved and stored
 */

/**
 * Ensure media is saved when creating or updating a listing
 * This function should be called whenever a listing is created or updated
 */
export const ensureMediaPersistence = async (
  listingId: string,
  userId: string,
  media?: PropertyMedia
): Promise<void> => {
  try {
    console.log('🔒 Ensuring media persistence for listing:', listingId);
    
    // If media is provided, save it immediately
    if (media) {
      console.log('💾 Saving provided media for listing:', listingId);
      await savePropertyMedia(listingId, userId, media);
      return;
    }
    
    // If no media provided, check if listing has media and sync it
    const listing = await db.get('published_listings', listingId);
    if (listing) {
      const hasListingMedia = listing.coverPhoto || 
                             (listing.photos && listing.photos.length > 0) || 
                             (listing.videos && listing.videos.length > 0);
      
      if (hasListingMedia) {
        console.log('🔄 Syncing existing listing media to storage systems...');
        const mediaFromListing: PropertyMedia = {
          coverPhoto: listing.coverPhoto || null,
          photos: Array.isArray(listing.photos) ? listing.photos : [],
          videos: Array.isArray(listing.videos) ? listing.videos : []
        };
        
        await savePropertyMedia(listingId, userId, mediaFromListing);
        console.log('✅ Listing media synced to all storage systems');
      } else {
        console.log('📸 No media found in listing object for:', listingId);
      }
    } else {
      console.log('❌ Listing not found for media persistence check:', listingId);
    }
  } catch (error) {
    console.error('❌ Error ensuring media persistence:', error);
    throw error;
  }
};

/**
 * Validate media integrity for a listing
 * Checks if media exists in all storage systems and reports any inconsistencies
 */
export const validateMediaIntegrity = async (listingId: string): Promise<{
  isValid: boolean;
  issues: string[];
  details: {
    hasListingMedia: boolean;
    hasDatabaseMedia: boolean;
    hasAsyncStorageMedia: boolean;
    hasCacheMedia: boolean;
    listingMediaCount: number;
    databaseMediaCount: number;
    asyncStorageMediaCount: number;
    cacheMediaCount: number;
  };
}> => {
  try {
    console.log('🔍 Validating media integrity for listing:', listingId);
    
    const issues: string[] = [];
    let hasListingMedia = false;
    let hasDatabaseMedia = false;
    let hasAsyncStorageMedia = false;
    let hasCacheMedia = false;
    let listingMediaCount = 0;
    let databaseMediaCount = 0;
    let asyncStorageMediaCount = 0;
    let cacheMediaCount = 0;
    
    // Check listing object
    try {
      const listing = await db.get('published_listings', listingId);
      if (listing) {
        const hasCoverPhoto = !!listing.coverPhoto;
        const photosCount = Array.isArray(listing.photos) ? listing.photos.length : 0;
        const videosCount = Array.isArray(listing.videos) ? listing.videos.length : 0;
        
        hasListingMedia = hasCoverPhoto || photosCount > 0 || videosCount > 0;
        listingMediaCount = (hasCoverPhoto ? 1 : 0) + photosCount + videosCount;
      }
    } catch (error) {
      issues.push(`Failed to check listing object: ${error}`);
    }
    
    // Check database media tables
    try {
      const photos = await db.list('property_photos');
      const videos = await db.list('property_videos');
      const listingPhotos = photos.filter((photo: any) => photo.listingId === listingId);
      const listingVideos = videos.filter((video: any) => video.listingId === listingId);
      
      hasDatabaseMedia = listingPhotos.length > 0 || listingVideos.length > 0;
      databaseMediaCount = listingPhotos.length + listingVideos.length;
    } catch (error) {
      issues.push(`Failed to check database media tables: ${error}`);
    }
    
    // Check AsyncStorage
    try {
      const { loadPropertyMediaFromStorage } = await import('./media-storage');
      const asyncStorageMedia = await loadPropertyMediaFromStorage(listingId);
      
      if (asyncStorageMedia) {
        const hasCoverPhoto = !!asyncStorageMedia.coverPhoto;
        const photosCount = asyncStorageMedia.photos?.length || 0;
        const videosCount = asyncStorageMedia.videos?.length || 0;
        
        hasAsyncStorageMedia = hasCoverPhoto || photosCount > 0 || videosCount > 0;
        asyncStorageMediaCount = (hasCoverPhoto ? 1 : 0) + photosCount + videosCount;
      }
    } catch (error) {
      issues.push(`Failed to check AsyncStorage: ${error}`);
    }
    
    // Check cache
    try {
      const { getCachedPropertyMedia } = await import('./property-media-cache');
      const cachedMedia = await getCachedPropertyMedia(listingId);
      
      if (cachedMedia) {
        const hasCoverPhoto = !!cachedMedia.coverPhoto;
        const photosCount = cachedMedia.photos?.length || 0;
        const videosCount = cachedMedia.videos?.length || 0;
        
        hasCacheMedia = hasCoverPhoto || photosCount > 0 || videosCount > 0;
        cacheMediaCount = (hasCoverPhoto ? 1 : 0) + photosCount + videosCount;
      }
    } catch (error) {
      issues.push(`Failed to check cache: ${error}`);
    }
    
    // Check for inconsistencies
    const mediaCounts = [listingMediaCount, databaseMediaCount, asyncStorageMediaCount, cacheMediaCount].filter(count => count > 0);
    const uniqueCounts = [...new Set(mediaCounts)];
    
    if (uniqueCounts.length > 1) {
      issues.push(`Media count mismatch: Listing(${listingMediaCount}), Database(${databaseMediaCount}), AsyncStorage(${asyncStorageMediaCount}), Cache(${cacheMediaCount})`);
    }
    
    if (!hasListingMedia && !hasDatabaseMedia && !hasAsyncStorageMedia && !hasCacheMedia) {
      issues.push('No media found in any storage system');
    }
    
    const isValid = issues.length === 0;
    
    console.log('✅ Media integrity validation completed:', {
      listingId,
      isValid,
      issuesCount: issues.length,
      hasListingMedia,
      hasDatabaseMedia,
      hasAsyncStorageMedia,
      hasCacheMedia
    });
    
    return {
      isValid,
      issues,
      details: {
        hasListingMedia,
        hasDatabaseMedia,
        hasAsyncStorageMedia,
        hasCacheMedia,
        listingMediaCount,
        databaseMediaCount,
        asyncStorageMediaCount,
        cacheMediaCount
      }
    };
  } catch (error) {
    console.error('❌ Error validating media integrity:', error);
    return {
      isValid: false,
      issues: [`Validation failed: ${error}`],
      details: {
        hasListingMedia: false,
        hasDatabaseMedia: false,
        hasAsyncStorageMedia: false,
        hasCacheMedia: false,
        listingMediaCount: 0,
        databaseMediaCount: 0,
        asyncStorageMediaCount: 0,
        cacheMediaCount: 0
      }
    };
  }
};

/**
 * Repair media integrity issues for a listing
 * Attempts to sync media across all storage systems
 */
export const repairMediaIntegrity = async (listingId: string, userId: string): Promise<{
  success: boolean;
  actions: string[];
  error?: string;
}> => {
  try {
    console.log('🔧 Repairing media integrity for listing:', listingId);
    
    const actions: string[] = [];
    
    // First, validate current state
    const validation = await validateMediaIntegrity(listingId);
    
    if (validation.isValid) {
      actions.push('Media integrity is already valid, no repair needed');
      return { success: true, actions };
    }
    
    // Try to load media from the most reliable source
    const media = await loadPropertyMedia(listingId, userId);
    
    if (media.coverPhoto || media.photos.length > 0 || media.videos.length > 0) {
      // Media found, sync it to all storage systems
      await savePropertyMedia(listingId, userId, media);
      actions.push('Synced media to all storage systems');
      
      // Update listing object
      const listing = await db.get('published_listings', listingId);
      if (listing) {
        const updatedListing = {
          ...listing,
          coverPhoto: media.coverPhoto,
          photos: media.photos,
          videos: media.videos,
          updatedAt: new Date().toISOString()
        };
        await db.upsert('published_listings', listingId, updatedListing);
        actions.push('Updated listing object with media data');
      }
      
      return { success: true, actions };
    } else {
      // No media found anywhere
      actions.push('No media found to repair');
      return { success: false, actions, error: 'No media found in any storage system' };
    }
  } catch (error) {
    console.error('❌ Error repairing media integrity:', error);
    return {
      success: false,
      actions: [],
      error: error instanceof Error ? error.message : String(error)
    };
  }
};

/**
 * Sync all property media to ensure consistency
 */
export const syncAllPropertyMedia = async (): Promise<{
  totalListings: number;
  syncedCount: number;
  errorCount: number;
  details: any;
}> => {
  try {
    console.log('🔄 Starting comprehensive media sync...');
    
    // Get all published listings
    const listings = await getAllPublishedListings();
    const totalListings = listings.length;
    let syncedCount = 0;
    let errorCount = 0;
    const details: any = {};

    for (const listing of listings) {
      try {
        await savePropertyMedia(listing.id, listing.userId, {
          coverPhoto: listing.coverPhoto,
          photos: listing.photos || [],
          videos: listing.videos || []
        });
        syncedCount++;
      } catch (error) {
        console.error(`❌ Error syncing media for listing ${listing.id}:`, error);
        errorCount++;
        details[listing.id] = error;
      }
    }

    console.log(`✅ Media sync completed: ${syncedCount}/${totalListings} listings synced`);
    
    return {
      totalListings,
      syncedCount,
      errorCount,
      details
    };
  } catch (error) {
    console.error('❌ Error in syncAllPropertyMedia:', error);
    return {
      totalListings: 0,
      syncedCount: 0,
      errorCount: 1,
      details: { error }
    };
  }
};

/**
 * Initialize media persistence system
 * Call this when the app starts to ensure all media is properly synced
 */
export const initializeMediaPersistence = async (): Promise<{
  success: boolean;
  syncedListings: number;
  errorCount: number;
  details: any;
}> => {
  try {
    console.log('🚀 Initializing media persistence system...');
    
    // Run comprehensive media synchronization
    const syncResult = await syncAllPropertyMedia();
    
    console.log('✅ Media persistence system initialized:', {
      totalListings: syncResult.totalListings,
      syncedCount: syncResult.syncedCount,
      errorCount: syncResult.errorCount
    });
    
    return {
      success: syncResult.errorCount === 0,
      syncedListings: syncResult.syncedCount,
      errorCount: syncResult.errorCount,
      details: syncResult
    };
  } catch (error) {
    console.error('❌ Error initializing media persistence system:', error);
    return {
      success: false,
      syncedListings: 0,
      errorCount: 1,
      details: { error: error instanceof Error ? error.message : String(error) }
    };
  }
};

/**
 * Hook to ensure media persistence in React components
 * Call this in useEffect when creating or updating listings
 */
export const useMediaPersistence = () => {
  const ensurePersistence = async (listingId: string, userId: string, media?: PropertyMedia) => {
    try {
      await ensureMediaPersistence(listingId, userId, media);
    } catch (error) {
      console.error('❌ Media persistence hook error:', error);
    }
  };
  
  const validateIntegrity = async (listingId: string) => {
    try {
      return await validateMediaIntegrity(listingId);
    } catch (error) {
      console.error('❌ Media integrity validation hook error:', error);
      return {
        isValid: false,
        issues: [`Validation error: ${error}`],
        details: {
          hasListingMedia: false,
          hasDatabaseMedia: false,
          hasAsyncStorageMedia: false,
          hasCacheMedia: false,
          listingMediaCount: 0,
          databaseMediaCount: 0,
          asyncStorageMediaCount: 0,
          cacheMediaCount: 0
        }
      };
    }
  };
  
  const repairIntegrity = async (listingId: string, userId: string) => {
    try {
      return await repairMediaIntegrity(listingId, userId);
    } catch (error) {
      console.error('❌ Media integrity repair hook error:', error);
      return {
        success: false,
        actions: [],
        error: error instanceof Error ? error.message : String(error)
      };
    }
  };
  
  return {
    ensurePersistence,
    validateIntegrity,
    repairIntegrity
  };
};
