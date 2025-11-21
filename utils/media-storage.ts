import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from './db';
import { PropertyMedia } from './property-media-cache';
import logger from './logger';

export interface MediaItem {
  uri: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  data?: string; // Base64 encoded data for persistence
}

// AsyncStorage keys for property media persistence
const MEDIA_STORAGE_KEYS = {
  PROPERTY_MEDIA: (listingId: string) => `property_media_${listingId}`,
  PROPERTY_MEDIA_CACHE: (listingId: string) => `property_media_cache_${listingId}`,
  ALL_MEDIA_CACHE: 'all_property_media_cache',
  MEDIA_TIMESTAMP: (listingId: string) => `media_timestamp_${listingId}`
};

/**
 * Save property media to AsyncStorage for persistence (like profile photos)
 */
export const savePropertyMediaToStorage = async (
  listingId: string,
  media: PropertyMedia
): Promise<void> => {
  try {
    logger.debug('💾 Saving property media to AsyncStorage for listing:', listingId);
    
    const mediaKey = MEDIA_STORAGE_KEYS.PROPERTY_MEDIA(listingId);
    const timestampKey = MEDIA_STORAGE_KEYS.MEDIA_TIMESTAMP(listingId);
    
    // Save media data
    await AsyncStorage.setItem(mediaKey, JSON.stringify(media));
    
    // Save timestamp for cache management
    await AsyncStorage.setItem(timestampKey, new Date().toISOString());
    
    logger.debug('✅ Property media saved to AsyncStorage:', {
      listingId,
      hasCoverPhoto: !!media.coverPhoto,
      photosCount: media.photos?.length || 0,
      videosCount: media.videos?.length || 0
    });
  } catch (error) {
    logger.error('❌ Error saving property media to storage:', error);
    throw error;
  }
};

/**
 * Load property media from AsyncStorage (like profile photos)
 */
export const loadPropertyMediaFromStorage = async (
  listingId: string
): Promise<PropertyMedia | null> => {
  try {
    logger.debug('📸 Loading property media from AsyncStorage for listing:', listingId);
    
    const mediaKey = MEDIA_STORAGE_KEYS.PROPERTY_MEDIA(listingId);
    const storedMedia = await AsyncStorage.getItem(mediaKey);
    
    if (storedMedia) {
      const media = JSON.parse(storedMedia) as PropertyMedia;
      logger.debug('✅ Property media loaded from AsyncStorage:', {
        listingId,
        hasCoverPhoto: !!media.coverPhoto,
        photosCount: media.photos?.length || 0,
        videosCount: media.videos?.length || 0
      });
      return media;
    } else {
      logger.debug('📸 No property media found in AsyncStorage for listing:', listingId);
      return null;
    }
  } catch (error) {
    logger.error('❌ Error loading property media from storage:', error);
    return null;
  }
};

/**
 * Clear property media from AsyncStorage
 */
export const clearPropertyMediaFromStorage = async (
  listingId: string
): Promise<void> => {
  try {
    logger.debug('🗑️ Clearing property media from AsyncStorage for listing:', listingId);
    
    const mediaKey = MEDIA_STORAGE_KEYS.PROPERTY_MEDIA(listingId);
    const timestampKey = MEDIA_STORAGE_KEYS.MEDIA_TIMESTAMP(listingId);
    
    await AsyncStorage.removeItem(mediaKey);
    await AsyncStorage.removeItem(timestampKey);
    
    logger.debug('✅ Property media cleared from AsyncStorage for listing:', listingId);
  } catch (error) {
    logger.error('❌ Error clearing property media from storage:', error);
  }
};

/**
 * Save media to database with proper persistence
 */
export const savePropertyMedia = async (
  listingId: string, 
  userId: string, 
  media: PropertyMedia
): Promise<void> => {
  try {
    logger.debug('💾 Saving property media for listing:', listingId);
    logger.debug('📊 Media data:', {
      hasCoverPhoto: !!media.coverPhoto,
      photosCount: media.photos?.length || 0,
      videosCount: media.videos?.length || 0
    });
    
    // Save cover photo if exists
    if (media.coverPhoto) {
      logger.debug('💾 Saving cover photo...');
      await db.upsert('property_photos', `cover_${listingId}`, {
        id: `cover_${listingId}`,
        listingId,
        userId,
        photoUri: media.coverPhoto,
        // Don't store photoData to avoid AsyncStorage size issues - URIs are sufficient
        fileName: `cover_photo_${Date.now()}.jpg`,
        fileSize: 0, // Will be calculated if needed
        mimeType: 'image/jpeg',
        isCoverPhoto: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      logger.debug('✅ Cover photo saved with data persistence');
    }

    // Save property photos
    if (media.photos && media.photos.length > 0) {
      logger.debug('💾 Saving property photos...');
      for (let i = 0; i < media.photos.length; i++) {
        const photoUri = media.photos[i];
        await db.upsert('property_photos', `photo_${listingId}_${i}`, {
          id: `photo_${listingId}_${i}`,
          listingId,
          userId,
          photoUri,
          // Don't store photoData to avoid AsyncStorage size issues - URIs are sufficient
          fileName: `property_photo_${i}_${Date.now()}.jpg`,
          fileSize: 0,
          mimeType: 'image/jpeg',
          isCoverPhoto: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
      logger.debug(`✅ ${media.photos.length} property photos saved`);
    }

    // Save property videos
    if (media.videos && media.videos.length > 0) {
      logger.debug('💾 Saving property videos...');
      for (let i = 0; i < media.videos.length; i++) {
        const videoUri = media.videos[i];
        await db.upsert('property_videos', `video_${listingId}_${i}`, {
          id: `video_${listingId}_${i}`,
          listingId,
          userId,
          videoUri,
          fileName: `property_video_${i}_${Date.now()}.mp4`,
          fileSize: 0,
          mimeType: 'video/mp4',
          duration: 0,
          thumbnailUri: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
      logger.debug(`✅ ${media.videos.length} property videos saved`);
    }

    // ALSO save to AsyncStorage for persistence (like profile photos)
    await savePropertyMediaToStorage(listingId, media);

    logger.debug('✅ Property media saved successfully to both database and AsyncStorage');
  } catch (error) {
    logger.error('❌ Error saving property media:', error);
    throw error;
  }
};

/**
 * Load media from database with caching
 */
export const loadPropertyMedia = async (listingId: string, userId?: string): Promise<PropertyMedia> => {
  try {
    logger.debug('📸 Loading property media for listing:', listingId);
    
    // First, try to get from AsyncStorage (like profile photos) - ALWAYS check this first
    try {
      const storedMedia = await loadPropertyMediaFromStorage(listingId);
      if (storedMedia && (storedMedia.coverPhoto || storedMedia.photos.length > 0 || storedMedia.videos.length > 0)) {
        logger.debug('✅ Using AsyncStorage property media for listing:', listingId, {
          hasCoverPhoto: !!storedMedia.coverPhoto,
          photosCount: storedMedia.photos.length,
          videosCount: storedMedia.videos.length
        });
        return storedMedia;
      } else {
        logger.debug('📸 AsyncStorage media found but empty for listing:', listingId);
      }
    } catch (storageError) {
      logger.debug('⚠️ AsyncStorage not available, trying cache:', storageError);
    }
    
    // Second, try to get from cache
    try {
      const { getCachedPropertyMedia, cachePropertyMedia } = await import('./property-media-cache');
      const cachedMedia = await getCachedPropertyMedia(listingId);
      
      if (cachedMedia && (cachedMedia.coverPhoto || cachedMedia.photos.length > 0 || cachedMedia.videos.length > 0)) {
        logger.debug('✅ Using cached property media for listing:', listingId);
        // Also save to AsyncStorage for future persistence
        await savePropertyMediaToStorage(listingId, cachedMedia);
        return cachedMedia;
      } else {
        logger.debug('📸 Cache media found but empty for listing:', listingId);
      }
    } catch (cacheError) {
      logger.debug('⚠️ Cache system not available, loading from database:', cacheError);
    }
    
    // Third, load from media tables (property_photos and property_videos)
    const photos = await db.list('property_photos');
    logger.debug('📸 All photos in database:', photos.length);
    const listingPhotos = photos.filter((photo: any) => photo.listingId === listingId);
    logger.debug('📸 Photos for this listing:', listingPhotos.length);
    
    // Load videos
    const videos = await db.list('property_videos');
    logger.debug('🎥 All videos in database:', videos.length);
    const listingVideos = videos.filter((video: any) => video.listingId === listingId);
    logger.debug('🎥 Videos for this listing:', listingVideos.length);
    
    // Find cover photo - prefer photoData for persistence
    const coverPhotoRecord = listingPhotos.find((photo: any) => photo.isCoverPhoto);
    let coverPhoto = coverPhotoRecord ? (coverPhotoRecord.photoData || coverPhotoRecord.photoUri) : null;
    logger.debug('🖼️ Cover photo found in media tables:', !!coverPhoto);
    
    // Get all non-cover photos - prefer photoData for persistence
    let propertyPhotos = listingPhotos
      .filter((photo: any) => !photo.isCoverPhoto)
      .map((photo: any) => photo.photoData || photo.photoUri);
    logger.debug('📸 Non-cover photos from media tables:', propertyPhotos.length);
    
    // Get all videos
    let propertyVideos = listingVideos.map((video: any) => video.videoUri);
    logger.debug('🎥 Property videos from media tables:', propertyVideos.length);
    
    // CRITICAL FIX: If no media found in media tables, fall back to the listing object itself
    if (!coverPhoto && propertyPhotos.length === 0 && propertyVideos.length === 0) {
      logger.debug('⚠️ No media found in media tables, checking listing object itself...');
      try {
        const listing = await db.get('published_listings', listingId);
        if (listing) {
          coverPhoto = listing.coverPhoto || null;
          propertyPhotos = Array.isArray(listing.photos) ? listing.photos : [];
          propertyVideos = Array.isArray(listing.videos) ? listing.videos : [];
          
          logger.debug('✅ Loaded media from listing object:', {
            hasCoverPhoto: !!coverPhoto,
            photosCount: propertyPhotos.length,
            videosCount: propertyVideos.length
          });
          
          // Re-sync this media back to media tables for future use
          if (coverPhoto || propertyPhotos.length > 0 || propertyVideos.length > 0) {
            logger.debug('🔄 Re-syncing media from listing to media tables...');
            await savePropertyMedia(listingId, listing.userId || userId || 'unknown', {
              coverPhoto,
              photos: propertyPhotos,
              videos: propertyVideos
            });
          }
        } else {
          logger.debug('❌ Listing not found in database:', listingId);
        }
      } catch (listingError) {
        logger.error('❌ Error loading media from listing object:', listingError);
      }
    }
    
    const media: PropertyMedia = {
      coverPhoto,
      photos: propertyPhotos,
      videos: propertyVideos
    };
    
    logger.debug('✅ Property media loaded successfully:', {
      coverPhoto: !!media.coverPhoto,
      photosCount: media.photos.length,
      videosCount: media.videos.length,
      coverPhotoUri: media.coverPhoto?.substring(0, 50) + '...'
    });
    
    // Cache the loaded media for future use
    try {
      const { cachePropertyMedia } = await import('./property-media-cache');
      await cachePropertyMedia(listingId, media, userId);
      logger.debug('💾 Property media cached for listing:', listingId);
    } catch (cacheError) {
      logger.debug('⚠️ Failed to cache property media:', cacheError);
    }

    // ALWAYS save to AsyncStorage for persistence (like profile photos) - this is critical
    try {
      await savePropertyMediaToStorage(listingId, media);
      logger.debug('💾 Property media saved to AsyncStorage for listing:', listingId, {
        hasCoverPhoto: !!media.coverPhoto,
        photosCount: media.photos.length,
        videosCount: media.videos.length
      });
    } catch (storageError) {
      logger.error('❌ CRITICAL: Failed to save property media to AsyncStorage:', storageError);
      // Don't throw here, but log as critical since this affects persistence
    }
    
    return media;
  } catch (error) {
    logger.error('❌ Error loading property media:', error);
    return {
      coverPhoto: null,
      photos: [],
      videos: []
    };
  }
};

/**
 * Delete media from database
 */
export const deletePropertyMedia = async (listingId: string): Promise<void> => {
  try {
    logger.debug('🗑️ Deleting property media for listing:', listingId);
    
    // Delete photos
    const photos = await db.list('property_photos');
    const listingPhotos = photos.filter((photo: any) => photo.listingId === listingId);
    
    for (const photo of listingPhotos) {
      await db.remove('property_photos', photo.id);
    }
    
    // Delete videos
    const videos = await db.list('property_videos');
    const listingVideos = videos.filter((video: any) => video.listingId === listingId);
    
    for (const video of listingVideos) {
      await db.remove('property_videos', video.id);
    }
    
    logger.debug('✅ Property media deleted successfully');
  } catch (error) {
    logger.error('❌ Error deleting property media:', error);
    throw error;
  }
};

/**
 * Update media in database (replace existing)
 */
export const updatePropertyMedia = async (
  listingId: string, 
  userId: string, 
  media: PropertyMedia
): Promise<void> => {
  try {
    logger.debug('🔄 Updating property media for listing:', listingId);
    
    // First delete existing media
    await deletePropertyMedia(listingId);
    
    // Then save new media
    await savePropertyMedia(listingId, userId, media);
    
    logger.debug('✅ Property media updated successfully');
  } catch (error) {
    logger.error('❌ Error updating property media:', error);
    throw error;
  }
};

/**
 * Refresh all media for app startup - ensures persistence across login/logout
 * This function re-syncs all media from listing objects to AsyncStorage and media tables
 */
export const refreshAllPropertyMedia = async (): Promise<void> => {
  try {
    logger.debug('🔄 Refreshing all property media for persistence...');
    
    // Get all published listings
    const publishedListings = await db.list('published_listings');
    logger.debug(`📋 Found ${publishedListings.length} published listings to refresh`);
    
    let refreshedCount = 0;
    let resyncedCount = 0;
    
    for (const listing of publishedListings) {
      try {
        // First, check if media exists in the listing object itself
        const hasListingMedia = listing.coverPhoto || 
                               (listing.photos && listing.photos.length > 0) || 
                               (listing.videos && listing.videos.length > 0);
        
        if (hasListingMedia) {
          // Force re-sync media from listing to all storage locations
          logger.debug(`🔄 Re-syncing media for listing ${listing.id} from listing object...`);
          const mediaFromListing = {
            coverPhoto: listing.coverPhoto || null,
            photos: Array.isArray(listing.photos) ? listing.photos : [],
            videos: Array.isArray(listing.videos) ? listing.videos : []
          };
          
          // Save to media tables
          await savePropertyMedia(listing.id, listing.userId || 'unknown', mediaFromListing);
          
          // Save to AsyncStorage
          await savePropertyMediaToStorage(listing.id, mediaFromListing);
          
          resyncedCount++;
          logger.debug(`✅ Re-synced media for listing ${listing.id}:`, {
            hasCoverPhoto: !!mediaFromListing.coverPhoto,
            photosCount: mediaFromListing.photos.length,
            videosCount: mediaFromListing.videos.length
          });
        }
        
        // Then load media using the standard flow (will use the re-synced data)
        const media = await loadPropertyMedia(listing.id);
        
        if (media.coverPhoto || media.photos.length > 0 || media.videos.length > 0) {
          refreshedCount++;
          logger.debug(`✅ Refreshed media for listing ${listing.id}:`, {
            hasCoverPhoto: !!media.coverPhoto,
            photosCount: media.photos.length,
            videosCount: media.videos.length
          });
        }
      } catch (error) {
        logger.debug(`⚠️ Could not refresh media for listing ${listing.id}:`, error);
      }
    }
    
    logger.debug(`✅ Media refresh completed:`, {
      totalListings: publishedListings.length,
      resyncedFromListing: resyncedCount,
      refreshedTotal: refreshedCount
    });
  } catch (error) {
    logger.error('❌ Error refreshing all property media:', error);
  }
};
