import { db } from './db';
import { dispatchCustomEvent } from './custom-events';

/**
 * Media Refresh Utilities
 * 
 * This module provides utilities to refresh property media data
 * when tenants relogin to ensure they see the latest photos and videos.
 */

export interface MediaRefreshOptions {
  forceRefresh?: boolean; // Force refresh even if recently loaded
  includeVideos?: boolean; // Include video refresh
  includePhotos?: boolean; // Include photo refresh
  maxAge?: number; // Maximum age in milliseconds before refresh is needed
}

/**
 * Refresh media data for all published listings
 */
export async function refreshAllPropertyMedia(options: MediaRefreshOptions = {}): Promise<void> {
  const {
    forceRefresh = false,
    includeVideos = true,
    includePhotos = true,
    maxAge = 5 * 60 * 1000 // 5 minutes default
  } = options;

  try {
    console.log('🔄 Starting media refresh for all published listings...');
    
    // Get all published listings
    const publishedListings = await db.list('published_listings');
    console.log(`📊 Found ${publishedListings.length} published listings to refresh`);
    
    // Refresh media for each listing
    const refreshPromises = publishedListings.map(async (listing) => {
      try {
        console.log(`🔄 Refreshing media for listing: ${listing.id}`);
        
        // Simple media data - just use existing listing data
        const mediaData = {
          photos: listing.photos || [],
          videos: listing.videos || [],
          coverPhoto: listing.coverPhoto || null
        };
        
        // Update the listing with fresh media data - preserve existing cover photo
        const updatedListing = {
          ...listing,
          photos: includePhotos ? mediaData.photos : listing.photos,
          videos: includeVideos ? mediaData.videos : listing.videos,
          coverPhoto: includePhotos ? (listing.coverPhoto || mediaData.coverPhoto) : listing.coverPhoto, // Preserve existing cover photo
          lastMediaRefresh: new Date().toISOString()
        };
        
        // Save updated listing
        await db.upsert('published_listings', listing.id, updatedListing);
        
        console.log(`✅ Refreshed media for listing ${listing.id}:`, {
          photos: mediaData.photos.length,
          videos: mediaData.videos.length,
          hasCoverPhoto: !!mediaData.coverPhoto,
          preservedCoverPhoto: !!listing.coverPhoto,
          finalCoverPhoto: !!updatedListing.coverPhoto
        });
        
        return {
          listingId: listing.id,
          success: true,
          photosCount: mediaData.photos.length,
          videosCount: mediaData.videos.length
        };
      } catch (error) {
        console.error(`❌ Failed to refresh media for listing ${listing.id}:`, error);
        return {
          listingId: listing.id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    });
    
    // Wait for all refreshes to complete
    const results = await Promise.all(refreshPromises);
    
    // Log summary
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    console.log(`✅ Media refresh completed:`, {
      total: results.length,
      successful,
      failed,
      totalPhotos: results.reduce((sum, r) => sum + (r.photosCount || 0), 0),
      totalVideos: results.reduce((sum, r) => sum + (r.videosCount || 0), 0)
    });
    
    // Dispatch media refresh event
    dispatchCustomEvent('mediaRefreshed', { 
      total: results.length,
      successful,
      failed,
      totalPhotos: results.reduce((sum, r) => sum + (r.photosCount || 0), 0),
      totalVideos: results.reduce((sum, r) => sum + (r.videosCount || 0), 0)
    });
    
    // If no media was found, log a message
    if (successful === 0 && failed === results.length) {
      console.log('⚠️ No media found for any listings');
    }
    
  } catch (error) {
    console.error('❌ Error refreshing all property media:', error);
    throw error;
  }
}

/**
 * Refresh media data for a specific listing
 */
export async function refreshListingMedia(listingId: string, options: MediaRefreshOptions = {}): Promise<boolean> {
  const {
    forceRefresh = false,
    includeVideos = true,
    includePhotos = true
  } = options;

  try {
    console.log(`🔄 Refreshing media for listing: ${listingId}`);
    
    // Get current listing
    const listing = await db.get('published_listings', listingId);
    if (!listing) {
      console.error(`❌ Listing ${listingId} not found`);
      return false;
    }
    
    // Simple media data - just use existing listing data
    const mediaData = {
      photos: listing.photos || [],
      videos: listing.videos || [],
      coverPhoto: listing.coverPhoto || null
    };
    
    // Update the listing with fresh media data - preserve existing cover photo
    const updatedListing = {
      ...listing,
      photos: includePhotos ? mediaData.photos : listing.photos,
      videos: includeVideos ? mediaData.videos : listing.videos,
      coverPhoto: includePhotos ? (listing.coverPhoto || mediaData.coverPhoto) : listing.coverPhoto, // Preserve existing cover photo
      lastMediaRefresh: new Date().toISOString()
    };
    
    // Save updated listing
    await db.upsert('published_listings', listingId, updatedListing);
    
    console.log(`✅ Refreshed media for listing ${listingId}:`, {
      photos: mediaData.photos.length,
      videos: mediaData.videos.length,
      hasCoverPhoto: !!mediaData.coverPhoto,
      preservedCoverPhoto: !!listing.coverPhoto,
      finalCoverPhoto: !!updatedListing.coverPhoto
    });
    
    return true;
  } catch (error) {
    console.error(`❌ Failed to refresh media for listing ${listingId}:`, error);
    return false;
  }
}

/**
 * Check if media refresh is needed for a listing
 */
export function isMediaRefreshNeeded(listing: any, maxAge: number = 5 * 60 * 1000): boolean {
  if (!listing.lastMediaRefresh) {
    return true; // Never refreshed
  }
  
  const lastRefresh = new Date(listing.lastMediaRefresh);
  const now = new Date();
  const age = now.getTime() - lastRefresh.getTime();
  
  return age > maxAge;
}

/**
 * Get media refresh status for all listings
 */
export async function getMediaRefreshStatus(): Promise<{
  total: number;
  needsRefresh: number;
  recentlyRefreshed: number;
  neverRefreshed: number;
}> {
  try {
    const publishedListings = await db.list('published_listings');
    
    let needsRefresh = 0;
    let recentlyRefreshed = 0;
    let neverRefreshed = 0;
    
    publishedListings.forEach(listing => {
      if (!listing.lastMediaRefresh) {
        neverRefreshed++;
      } else if (isMediaRefreshNeeded(listing)) {
        needsRefresh++;
      } else {
        recentlyRefreshed++;
      }
    });
    
    return {
      total: publishedListings.length,
      needsRefresh,
      recentlyRefreshed,
      neverRefreshed
    };
  } catch (error) {
    console.error('❌ Error getting media refresh status:', error);
    return {
      total: 0,
      needsRefresh: 0,
      recentlyRefreshed: 0,
      neverRefreshed: 0
    };
  }
}
