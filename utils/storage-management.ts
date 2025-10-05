import { db } from './db';

/**
 * Storage Management Utilities
 * 
 * This module handles localStorage quota issues by implementing
 * data compression, cleanup, and optimization strategies.
 */

export interface StorageStats {
  totalSize: number;
  availableSpace: number;
  collections: {
    [key: string]: {
      count: number;
      size: number;
    };
  };
}

/**
 * Get current storage usage statistics
 */
export async function getStorageStats(): Promise<StorageStats> {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return { totalSize: 0, availableSpace: 0, collections: {} };
    }

    let totalSize = 0;
    const collections: { [key: string]: { count: number; size: number } } = {};

    // Calculate size for each collection
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key && key.startsWith('hb_db_')) {
        const value = window.localStorage.getItem(key);
        if (value) {
          const size = new Blob([value]).size;
          totalSize += size;
          
          const collectionName = key.replace('hb_db_', '');
          if (!collections[collectionName]) {
            collections[collectionName] = { count: 0, size: 0 };
          }
          collections[collectionName].count++;
          collections[collectionName].size += size;
        }
      }
    }

    // Estimate available space (most browsers have 5-10MB limit)
    const estimatedLimit = 5 * 1024 * 1024; // 5MB
    const availableSpace = Math.max(0, estimatedLimit - totalSize);

    return {
      totalSize,
      availableSpace,
      collections
    };
  } catch (error) {
    console.error('❌ Error getting storage stats:', error);
    return { totalSize: 0, availableSpace: 0, collections: {} };
  }
}

/**
 * Compress base64 image data by reducing quality
 */
export function compressBase64Image(base64: string, quality: number = 0.7): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      // Create an image element
      const img = new Image();
      img.onload = () => {
        try {
          // Create a canvas
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            reject(new Error('Could not get canvas context'));
            return;
          }

          // Calculate new dimensions (reduce by quality factor)
          const newWidth = Math.floor(img.width * quality);
          const newHeight = Math.floor(img.height * quality);
          
          canvas.width = newWidth;
          canvas.height = newHeight;

          // Draw and compress
          ctx.drawImage(img, 0, 0, newWidth, newHeight);
          
          // Convert to base64 with compression
          const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
          resolve(compressedBase64);
        } catch (error) {
          reject(error);
        }
      };
      
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = base64;
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Optimize photo data for storage
 */
export async function optimizePhotoForStorage(photoData: string, maxSizeKB: number = 200): Promise<string> {
  try {
    // If it's already a data URI, extract the base64 part
    let base64 = photoData;
    if (photoData.startsWith('data:')) {
      const match = photoData.match(/^data:[^;]+;base64,(.+)$/);
      if (match) {
        base64 = match[1];
      }
    }

    // Calculate current size
    const currentSizeKB = (base64.length * 3) / 4 / 1024;
    
    if (currentSizeKB <= maxSizeKB) {
      console.log(`✅ Photo already optimized (${currentSizeKB.toFixed(1)}KB)`);
      return photoData;
    }

    console.log(`🔄 Compressing photo from ${currentSizeKB.toFixed(1)}KB to target ${maxSizeKB}KB`);
    
    // Try different quality levels
    const qualities = [0.8, 0.6, 0.4, 0.3, 0.2];
    
    for (const quality of qualities) {
      try {
        const compressed = await compressBase64Image(photoData, quality);
        const compressedSizeKB = (compressed.length * 3) / 4 / 1024;
        
        console.log(`📏 Quality ${quality}: ${compressedSizeKB.toFixed(1)}KB`);
        
        if (compressedSizeKB <= maxSizeKB) {
          console.log(`✅ Photo compressed successfully to ${compressedSizeKB.toFixed(1)}KB`);
          return compressed;
        }
      } catch (error) {
        console.warn(`⚠️ Compression failed for quality ${quality}:`, error);
      }
    }

    // If all compression attempts failed, return original
    console.warn('⚠️ Could not compress photo, using original');
    return photoData;
  } catch (error) {
    console.error('❌ Error optimizing photo:', error);
    return photoData;
  }
}

/**
 * Clean up old and large data to free up space
 */
export async function cleanupStorageData(): Promise<{ cleaned: number; freedSpace: number }> {
  try {
    console.log('🧹 Starting storage cleanup...');
    
    const stats = await getStorageStats();
    let cleaned = 0;
    let freedSpace = 0;

    // Clean up old published listings (keep only last 50)
    try {
      const publishedListings = await db.list('published_listings');
      if (publishedListings.length > 50) {
        // Sort by publishedAt and keep only the newest 50
        const sorted = publishedListings.sort((a, b) => 
          new Date(b.publishedAt || b.createdAt || 0).getTime() - 
          new Date(a.publishedAt || a.createdAt || 0).getTime()
        );
        
        const toDelete = sorted.slice(50);
        for (const listing of toDelete) {
          await db.delete('published_listings', listing.id);
          cleaned++;
        }
        console.log(`🗑️ Cleaned ${cleaned} old published listings`);
      }
    } catch (error) {
      console.error('❌ Error cleaning published listings:', error);
    }

    // Clean up old draft listings (keep only last 20)
    try {
      const draftListings = await db.list('draft_listings');
      if (draftListings.length > 20) {
        const sorted = draftListings.sort((a, b) => 
          new Date(b.updatedAt || b.createdAt || 0).getTime() - 
          new Date(a.updatedAt || a.createdAt || 0).getTime()
        );
        
        const toDelete = sorted.slice(20);
        for (const listing of toDelete) {
          await db.delete('draft_listings', listing.id);
          cleaned++;
        }
        console.log(`🗑️ Cleaned ${toDelete.length} old draft listings`);
      }
    } catch (error) {
      console.error('❌ Error cleaning draft listings:', error);
    }

    // Clean up orphaned photos
    try {
      const propertyPhotos = await db.list('property_photos');
      const publishedListings = await db.list('published_listings');
      const draftListings = await db.list('draft_listings');
      
      const existingListingIds = new Set([
        ...publishedListings.map(l => l.id),
        ...draftListings.map(l => l.id)
      ]);

      for (const photo of propertyPhotos) {
        if (!existingListingIds.has(photo.listingId)) {
          await db.delete('property_photos', photo.id);
          cleaned++;
        }
      }
      
      if (cleaned > 0) {
        console.log(`🗑️ Cleaned ${cleaned} orphaned photos`);
      }
    } catch (error) {
      console.error('❌ Error cleaning orphaned photos:', error);
    }

    // Calculate freed space
    const newStats = await getStorageStats();
    freedSpace = stats.totalSize - newStats.totalSize;

    console.log(`✅ Storage cleanup completed: ${cleaned} items cleaned, ${freedSpace} bytes freed`);
    return { cleaned, freedSpace };
  } catch (error) {
    console.error('❌ Error during storage cleanup:', error);
    return { cleaned: 0, freedSpace: 0 };
  }
}

/**
 * Check if we have enough storage space for new data
 */
export async function checkStorageSpace(estimatedSize: number): Promise<{
  hasSpace: boolean;
  availableSpace: number;
  needsCleanup: boolean;
}> {
  try {
    const stats = await getStorageStats();
    const hasSpace = stats.availableSpace > estimatedSize;
    const needsCleanup = stats.availableSpace < estimatedSize * 2; // Need 2x space for safety

    return {
      hasSpace,
      availableSpace: stats.availableSpace,
      needsCleanup
    };
  } catch (error) {
    console.error('❌ Error checking storage space:', error);
    return {
      hasSpace: false,
      availableSpace: 0,
      needsCleanup: true
    };
  }
}

/**
 * Optimize listing data before saving to reduce storage usage
 */
export async function optimizeListingForStorage(listingData: any): Promise<any> {
  try {
    console.log('🔄 Optimizing listing data for storage...');
    
    const optimized = { ...listingData };

    // Optimize photos if they exist
    if (optimized.photos && Array.isArray(optimized.photos)) {
      console.log(`📸 Optimizing ${optimized.photos.length} photos...`);
      
      const optimizedPhotos = [];
      for (let i = 0; i < optimized.photos.length; i++) {
        const photo = optimized.photos[i];
        try {
          const optimizedPhoto = await optimizePhotoForStorage(photo, 150); // 150KB max per photo
          optimizedPhotos.push(optimizedPhoto);
          console.log(`✅ Photo ${i + 1} optimized`);
        } catch (error) {
          console.warn(`⚠️ Failed to optimize photo ${i + 1}, using original:`, error);
          optimizedPhotos.push(photo);
        }
      }
      optimized.photos = optimizedPhotos;
    }

    // Optimize cover photo
    if (optimized.coverPhoto) {
      try {
        optimized.coverPhoto = await optimizePhotoForStorage(optimized.coverPhoto, 200); // 200KB max for cover
        console.log('✅ Cover photo optimized');
      } catch (error) {
        console.warn('⚠️ Failed to optimize cover photo, using original:', error);
      }
    }

    // Remove unnecessary fields to save space
    delete optimized.tempData;
    delete optimized._temp;
    delete optimized.debugInfo;

    console.log('✅ Listing data optimized for storage');
    return optimized;
  } catch (error) {
    console.error('❌ Error optimizing listing data:', error);
    return listingData;
  }
}

/**
 * Safe save with storage management
 */
export async function safeSaveToStorage(
  collection: string, 
  key: string, 
  data: any, 
  options: {
    optimizePhotos?: boolean;
    maxRetries?: number;
    cleanupOnFailure?: boolean;
  } = {}
): Promise<{ success: boolean; error?: string }> {
  const { optimizePhotos = true, maxRetries = 3, cleanupOnFailure = true } = options;
  
  try {
    console.log(`💾 Attempting to save to ${collection}:${key}`);
    
    let dataToSave = data;
    
    // Optimize data if requested
    if (optimizePhotos && data.photos) {
      dataToSave = await optimizeListingForStorage(data);
    }
    
    // Estimate data size
    const dataString = JSON.stringify(dataToSave);
    const estimatedSize = new Blob([dataString]).size;
    
    console.log(`📏 Estimated data size: ${(estimatedSize / 1024).toFixed(1)}KB`);
    
    // Check storage space
    const spaceCheck = await checkStorageSpace(estimatedSize);
    
    if (!spaceCheck.hasSpace) {
      console.log('⚠️ Insufficient storage space, attempting cleanup...');
      
      if (cleanupOnFailure) {
        const cleanupResult = await cleanupStorageData();
        console.log(`🧹 Cleanup freed ${cleanupResult.freedSpace} bytes`);
        
        // Check space again after cleanup
        const newSpaceCheck = await checkStorageSpace(estimatedSize);
        if (!newSpaceCheck.hasSpace) {
          throw new Error(`Insufficient storage space. Available: ${newSpaceCheck.availableSpace} bytes, Required: ${estimatedSize} bytes`);
        }
      } else {
        throw new Error(`Insufficient storage space. Available: ${spaceCheck.availableSpace} bytes, Required: ${estimatedSize} bytes`);
      }
    }
    
    // Attempt to save with retries
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`💾 Save attempt ${attempt}/${maxRetries}`);
        await db.upsert(collection, key, dataToSave);
        console.log(`✅ Successfully saved to ${collection}:${key}`);
        return { success: true };
      } catch (error) {
        lastError = error as Error;
        console.warn(`⚠️ Save attempt ${attempt} failed:`, error);
        
        if (attempt < maxRetries) {
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          
          // Try cleanup before next attempt
          if (cleanupOnFailure) {
            await cleanupStorageData();
          }
        }
      }
    }
    
    throw lastError || new Error('All save attempts failed');
    
  } catch (error) {
    console.error(`❌ Failed to save to ${collection}:${key}:`, error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}
