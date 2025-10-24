import { db } from './db';
import { PublishedListingRecord } from '../types';

/**
 * Increment the view count for a specific listing
 * This function should be called when a user views a property listing
 */
export async function incrementListingViews(listingId: string): Promise<{
  success: boolean;
  newViewCount: number;
  message: string;
}> {
  try {
    console.log(`👁️ Incrementing views for listing: ${listingId}`);
    
    // Get the current listing
    const listing = await db.get<PublishedListingRecord>('published_listings', listingId);
    
    if (!listing) {
      console.log(`❌ Listing not found: ${listingId}`);
      return {
        success: false,
        newViewCount: 0,
        message: 'Listing not found'
      };
    }
    
    // Increment the view count
    const currentViews = (listing as any).views || 0;
    const newViewCount = currentViews + 1;
    
    // Update the listing with the new view count
    const updatedListing = {
      ...listing,
      views: newViewCount,
      updatedAt: new Date().toISOString()
    } as PublishedListingRecord;
    
    await db.upsert('published_listings', listingId, updatedListing);
    
    console.log(`✅ Views incremented for listing ${listingId}: ${currentViews} → ${newViewCount}`);
    
    return {
      success: true,
      newViewCount,
      message: `Views incremented from ${currentViews} to ${newViewCount}`
    };
    
  } catch (error) {
    console.error(`❌ Error incrementing views for listing ${listingId}:`, error);
    return {
      success: false,
      newViewCount: 0,
      message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Get the current view count for a specific listing
 */
export async function getListingViews(listingId: string): Promise<number> {
  try {
    const listing = await db.get<PublishedListingRecord>('published_listings', listingId);
    return (listing as any)?.views || 0;
  } catch (error) {
    console.error(`❌ Error getting views for listing ${listingId}:`, error);
    return 0;
  }
}

/**
 * Track a view with additional metadata (optional)
 * This can be used for analytics purposes
 * Note: Owner views are not tracked to prevent self-inflation of view counts
 */
export async function trackListingView(
  listingId: string, 
  viewerId?: string,
  metadata?: {
    source?: string; // 'tenant_dashboard', 'search', 'favorites', etc.
    timestamp?: string;
    userAgent?: string;
    isOwnerView?: boolean; // Flag to indicate if this is an owner viewing their own listing
  }
): Promise<{
  success: boolean;
  newViewCount: number;
  message: string;
}> {
  try {
    console.log(`📊 Tracking view for listing: ${listingId}`, {
      viewerId,
      metadata
    });
    
    // Don't track views if this is an owner viewing their own listing
    if (metadata?.isOwnerView) {
      console.log(`👁️ Skipping view tracking - owner viewing own listing: ${listingId}`);
      return {
        success: true,
        newViewCount: 0,
        message: 'View tracking skipped - owner viewing own listing'
      };
    }
    
    // Check if viewer is the owner of this listing
    if (viewerId) {
      try {
        const listing = await db.get<PublishedListingRecord>('published_listings', listingId);
        if (listing && listing.userId === viewerId) {
          console.log(`👁️ Skipping view tracking - viewer is owner of listing: ${listingId}`);
          return {
            success: true,
            newViewCount: (listing as any).views || 0,
            message: 'View tracking skipped - viewer is owner of listing'
          };
        }
      } catch (error) {
        console.warn('⚠️ Could not check listing ownership, proceeding with tracking');
      }
    }
    
    // Increment the basic view count
    const result = await incrementListingViews(listingId);
    
    // TODO: In the future, you could store detailed view analytics
    // in a separate 'listing_views' collection for more detailed tracking
    
    return result;
    
  } catch (error) {
    console.error(`❌ Error tracking view for listing ${listingId}:`, error);
    return {
      success: false,
      newViewCount: 0,
      message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}
