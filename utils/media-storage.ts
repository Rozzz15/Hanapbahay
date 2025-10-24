import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from './db';
import { PropertyMedia } from './property-media-cache';

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
    console.log('💾 Saving property media to AsyncStorage for listing:', listingId);
    
    const mediaKey = MEDIA_STORAGE_KEYS.PROPERTY_MEDIA(listingId);
    const timestampKey = MEDIA_STORAGE_KEYS.MEDIA_TIMESTAMP(listingId);
    
    // Save media data
    await AsyncStorage.setItem(mediaKey, JSON.stringify(media));
    
    // Save timestamp for cache management
    await AsyncStorage.setItem(timestampKey, new Date().toISOString());
    
    console.log('✅ Property media saved to AsyncStorage:', {
      listingId,
      hasCoverPhoto: !!media.coverPhoto,
      photosCount: media.photos?.length || 0,
      videosCount: media.videos?.length || 0
    });
  } catch (error) {
    console.error('❌ Error saving property media to storage:', error);
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
    console.log('📸 Loading property media from AsyncStorage for listing:', listingId);
    
    const mediaKey = MEDIA_STORAGE_KEYS.PROPERTY_MEDIA(listingId);
    const storedMedia = await AsyncStorage.getItem(mediaKey);
    
    if (storedMedia) {
      const media = JSON.parse(storedMedia) as PropertyMedia;
      console.log('✅ Property media loaded from AsyncStorage:', {
        listingId,
        hasCoverPhoto: !!media.coverPhoto,
        photosCount: media.photos?.length || 0,
        videosCount: media.videos?.length || 0
      });
      return media;
    } else {
      console.log('📸 No property media found in AsyncStorage for listing:', listingId);
      return null;
    }
  } catch (error) {
    console.error('❌ Error loading property media from storage:', error);
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
    console.log('🗑️ Clearing property media from AsyncStorage for listing:', listingId);
    
    const mediaKey = MEDIA_STORAGE_KEYS.PROPERTY_MEDIA(listingId);
    const timestampKey = MEDIA_STORAGE_KEYS.MEDIA_TIMESTAMP(listingId);
    
    await AsyncStorage.removeItem(mediaKey);
    await AsyncStorage.removeItem(timestampKey);
    
    console.log('✅ Property media cleared from AsyncStorage for listing:', listingId);
  } catch (error) {
    console.error('❌ Error clearing property media from storage:', error);
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
    console.log('💾 Saving property media for listing:', listingId);
    console.log('📊 Media data:', {
      hasCoverPhoto: !!media.coverPhoto,
      photosCount: media.photos?.length || 0,
      videosCount: media.videos?.length || 0
    });
    
    // Save cover photo if exists
    if (media.coverPhoto) {
      console.log('💾 Saving cover photo...');
      await db.upsert('property_photos', `cover_${listingId}`, {
        id: `cover_${listingId}`,
        listingId,
        userId,
        photoUri: media.coverPhoto,
        photoData: media.coverPhoto, // Store base64 data for persistence
        fileName: `cover_photo_${Date.now()}.jpg`,
        fileSize: 0, // Will be calculated if needed
        mimeType: 'image/jpeg',
        isCoverPhoto: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      console.log('✅ Cover photo saved with data persistence');
    }

    // Save property photos
    if (media.photos && media.photos.length > 0) {
      console.log('💾 Saving property photos...');
      for (let i = 0; i < media.photos.length; i++) {
        const photoUri = media.photos[i];
        await db.upsert('property_photos', `photo_${listingId}_${i}`, {
          id: `photo_${listingId}_${i}`,
          listingId,
          userId,
          photoUri,
          photoData: photoUri, // Store base64 data for persistence
          fileName: `property_photo_${i}_${Date.now()}.jpg`,
          fileSize: 0,
          mimeType: 'image/jpeg',
          isCoverPhoto: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
      console.log(`✅ ${media.photos.length} property photos saved`);
    }

    // Save property videos
    if (media.videos && media.videos.length > 0) {
      console.log('💾 Saving property videos...');
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
      console.log(`✅ ${media.videos.length} property videos saved`);
    }

    // ALSO save to AsyncStorage for persistence (like profile photos)
    await savePropertyMediaToStorage(listingId, media);

    console.log('✅ Property media saved successfully to both database and AsyncStorage');
  } catch (error) {
    console.error('❌ Error saving property media:', error);
    throw error;
  }
};

/**
 * Load media from database with caching
 */
export const loadPropertyMedia = async (listingId: string, userId?: string): Promise<PropertyMedia> => {
  try {
    console.log('📸 Loading property media for listing:', listingId);
    
    // First, try to get from AsyncStorage (like profile photos) - ALWAYS check this first
    try {
      const storedMedia = await loadPropertyMediaFromStorage(listingId);
      if (storedMedia && (storedMedia.coverPhoto || storedMedia.photos.length > 0 || storedMedia.videos.length > 0)) {
        console.log('✅ Using AsyncStorage property media for listing:', listingId, {
          hasCoverPhoto: !!storedMedia.coverPhoto,
          photosCount: storedMedia.photos.length,
          videosCount: storedMedia.videos.length
        });
        return storedMedia;
      } else {
        console.log('📸 AsyncStorage media found but empty for listing:', listingId);
      }
    } catch (storageError) {
      console.log('⚠️ AsyncStorage not available, trying cache:', storageError);
    }
    
    // Second, try to get from cache
    try {
      const { getCachedPropertyMedia, cachePropertyMedia } = await import('./property-media-cache');
      const cachedMedia = await getCachedPropertyMedia(listingId);
      
      if (cachedMedia && (cachedMedia.coverPhoto || cachedMedia.photos.length > 0 || cachedMedia.videos.length > 0)) {
        console.log('✅ Using cached property media for listing:', listingId);
        // Also save to AsyncStorage for future persistence
        await savePropertyMediaToStorage(listingId, cachedMedia);
        return cachedMedia;
      } else {
        console.log('📸 Cache media found but empty for listing:', listingId);
      }
    } catch (cacheError) {
      console.log('⚠️ Cache system not available, loading from database:', cacheError);
    }
    
    // Third, load from media tables (property_photos and property_videos)
    const photos = await db.list('property_photos');
    console.log('📸 All photos in database:', photos.length);
    const listingPhotos = photos.filter((photo: any) => photo.listingId === listingId);
    console.log('📸 Photos for this listing:', listingPhotos.length);
    
    // Load videos
    const videos = await db.list('property_videos');
    console.log('🎥 All videos in database:', videos.length);
    const listingVideos = videos.filter((video: any) => video.listingId === listingId);
    console.log('🎥 Videos for this listing:', listingVideos.length);
    
    // Find cover photo - prefer photoData for persistence
    const coverPhotoRecord = listingPhotos.find((photo: any) => photo.isCoverPhoto);
    let coverPhoto = coverPhotoRecord ? (coverPhotoRecord.photoData || coverPhotoRecord.photoUri) : null;
    console.log('🖼️ Cover photo found in media tables:', !!coverPhoto);
    
    // Get all non-cover photos - prefer photoData for persistence
    let propertyPhotos = listingPhotos
      .filter((photo: any) => !photo.isCoverPhoto)
      .map((photo: any) => photo.photoData || photo.photoUri);
    console.log('📸 Non-cover photos from media tables:', propertyPhotos.length);
    
    // Get all videos
    let propertyVideos = listingVideos.map((video: any) => video.videoUri);
    console.log('🎥 Property videos from media tables:', propertyVideos.length);
    
    // CRITICAL FIX: If no media found in media tables, fall back to the listing object itself
    if (!coverPhoto && propertyPhotos.length === 0 && propertyVideos.length === 0) {
      console.log('⚠️ No media found in media tables, checking listing object itself...');
      try {
        const listing = await db.get('published_listings', listingId);
        if (listing) {
          coverPhoto = listing.coverPhoto || null;
          propertyPhotos = Array.isArray(listing.photos) ? listing.photos : [];
          propertyVideos = Array.isArray(listing.videos) ? listing.videos : [];
          
          console.log('✅ Loaded media from listing object:', {
            hasCoverPhoto: !!coverPhoto,
            photosCount: propertyPhotos.length,
            videosCount: propertyVideos.length
          });
          
          // Re-sync this media back to media tables for future use
          if (coverPhoto || propertyPhotos.length > 0 || propertyVideos.length > 0) {
            console.log('🔄 Re-syncing media from listing to media tables...');
            await savePropertyMedia(listingId, listing.userId || userId || 'unknown', {
              coverPhoto,
              photos: propertyPhotos,
              videos: propertyVideos
            });
          }
        } else {
          console.log('❌ Listing not found in database:', listingId);
        }
      } catch (listingError) {
        console.error('❌ Error loading media from listing object:', listingError);
      }
    }
    
    const media: PropertyMedia = {
      coverPhoto,
      photos: propertyPhotos,
      videos: propertyVideos
    };
    
    console.log('✅ Property media loaded successfully:', {
      coverPhoto: !!media.coverPhoto,
      photosCount: media.photos.length,
      videosCount: media.videos.length,
      coverPhotoUri: media.coverPhoto?.substring(0, 50) + '...'
    });
    
    // Cache the loaded media for future use
    try {
      const { cachePropertyMedia } = await import('./property-media-cache');
      await cachePropertyMedia(listingId, media, userId);
      console.log('💾 Property media cached for listing:', listingId);
    } catch (cacheError) {
      console.log('⚠️ Failed to cache property media:', cacheError);
    }

    // ALWAYS save to AsyncStorage for persistence (like profile photos) - this is critical
    try {
      await savePropertyMediaToStorage(listingId, media);
      console.log('💾 Property media saved to AsyncStorage for listing:', listingId, {
        hasCoverPhoto: !!media.coverPhoto,
        photosCount: media.photos.length,
        videosCount: media.videos.length
      });
    } catch (storageError) {
      console.error('❌ CRITICAL: Failed to save property media to AsyncStorage:', storageError);
      // Don't throw here, but log as critical since this affects persistence
    }
    
    return media;
  } catch (error) {
    console.error('❌ Error loading property media:', error);
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
    console.log('🗑️ Deleting property media for listing:', listingId);
    
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
    
    console.log('✅ Property media deleted successfully');
  } catch (error) {
    console.error('❌ Error deleting property media:', error);
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
    console.log('🔄 Updating property media for listing:', listingId);
    
    // First delete existing media
    await deletePropertyMedia(listingId);
    
    // Then save new media
    await savePropertyMedia(listingId, userId, media);
    
    console.log('✅ Property media updated successfully');
  } catch (error) {
    console.error('❌ Error updating property media:', error);
    throw error;
  }
};

/**
 * Refresh all media for app startup - ensures persistence across login/logout
 * This function re-syncs all media from listing objects to AsyncStorage and media tables
 */
export const refreshAllPropertyMedia = async (): Promise<void> => {
  try {
    console.log('🔄 Refreshing all property media for persistence...');
    
    // Get all published listings
    const publishedListings = await db.list('published_listings');
    console.log(`📋 Found ${publishedListings.length} published listings to refresh`);
    
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
          console.log(`🔄 Re-syncing media for listing ${listing.id} from listing object...`);
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
          console.log(`✅ Re-synced media for listing ${listing.id}:`, {
            hasCoverPhoto: !!mediaFromListing.coverPhoto,
            photosCount: mediaFromListing.photos.length,
            videosCount: mediaFromListing.videos.length
          });
        }
        
        // Then load media using the standard flow (will use the re-synced data)
        const media = await loadPropertyMedia(listing.id);
        
        if (media.coverPhoto || media.photos.length > 0 || media.videos.length > 0) {
          refreshedCount++;
          console.log(`✅ Refreshed media for listing ${listing.id}:`, {
            hasCoverPhoto: !!media.coverPhoto,
            photosCount: media.photos.length,
            videosCount: media.videos.length
          });
        }
      } catch (error) {
        console.log(`⚠️ Could not refresh media for listing ${listing.id}:`, error);
      }
    }
    
    console.log(`✅ Media refresh completed:`, {
      totalListings: publishedListings.length,
      resyncedFromListing: resyncedCount,
      refreshedTotal: refreshedCount
    });
  } catch (error) {
    console.error('❌ Error refreshing all property media:', error);
  }
};
