import AsyncStorage from '@react-native-async-storage/async-storage';

export interface PropertyMedia {
  coverPhoto: string | null;
  photos: string[];
  videos: string[];
}

const PROPERTY_MEDIA_CACHE_KEY = 'hb_property_media_cache';
const CACHE_EXPIRY_TIME = 24 * 60 * 60 * 1000; // 24 hours

export interface CachedPropertyMedia {
  listingId: string;
  media: PropertyMedia;
  timestamp: number;
  userId?: string; // Track which user cached this data
}

/**
 * Cache property media data for faster loading
 */
export const cachePropertyMedia = async (
  listingId: string, 
  media: PropertyMedia,
  userId?: string
): Promise<void> => {
  try {
    console.log('💾 Caching property media for listing:', listingId);
    
    const cachedData: CachedPropertyMedia = {
      listingId,
      media,
      timestamp: Date.now(),
      userId
    };
    
    // Get existing cache
    const existingCache = await getCachedPropertyMedia(listingId);
    const allCachedData = existingCache ? await getAllCachedPropertyMedia() : [];
    
    // Update or add to cache
    const existingIndex = allCachedData.findIndex(item => item.listingId === listingId);
    if (existingIndex >= 0) {
      allCachedData[existingIndex] = cachedData;
    } else {
      allCachedData.push(cachedData);
    }
    
    // Save to AsyncStorage
    await AsyncStorage.setItem(PROPERTY_MEDIA_CACHE_KEY, JSON.stringify(allCachedData));
    console.log('✅ Property media cached successfully for listing:', listingId);
  } catch (error) {
    console.error('❌ Error caching property media:', error);
  }
};

/**
 * Get cached property media data
 */
export const getCachedPropertyMedia = async (listingId: string): Promise<PropertyMedia | null> => {
  try {
    console.log('📸 Getting cached property media for listing:', listingId);
    
    const cachedData = await AsyncStorage.getItem(PROPERTY_MEDIA_CACHE_KEY);
    if (!cachedData) {
      console.log('📸 No cached property media found');
      return null;
    }
    
    const allCachedData: CachedPropertyMedia[] = JSON.parse(cachedData);
    const listingCache = allCachedData.find(item => item.listingId === listingId);
    
    if (!listingCache) {
      console.log('📸 No cached data found for listing:', listingId);
      return null;
    }
    
    // Check if cache is expired
    const isExpired = Date.now() - listingCache.timestamp > CACHE_EXPIRY_TIME;
    if (isExpired) {
      console.log('📸 Cached property media expired for listing:', listingId);
      // Remove expired cache
      await removeCachedPropertyMedia(listingId);
      return null;
    }
    
    console.log('✅ Found valid cached property media for listing:', listingId);
    return listingCache.media;
  } catch (error) {
    console.error('❌ Error getting cached property media:', error);
    return null;
  }
};

/**
 * Get all cached property media data
 */
export const getAllCachedPropertyMedia = async (): Promise<CachedPropertyMedia[]> => {
  try {
    const cachedData = await AsyncStorage.getItem(PROPERTY_MEDIA_CACHE_KEY);
    if (!cachedData) {
      return [];
    }
    
    return JSON.parse(cachedData);
  } catch (error) {
    console.error('❌ Error getting all cached property media:', error);
    return [];
  }
};

/**
 * Remove cached property media for a specific listing
 */
export const removeCachedPropertyMedia = async (listingId: string): Promise<void> => {
  try {
    console.log('🗑️ Removing cached property media for listing:', listingId);
    
    const allCachedData = await getAllCachedPropertyMedia();
    const filteredData = allCachedData.filter(item => item.listingId !== listingId);
    
    await AsyncStorage.setItem(PROPERTY_MEDIA_CACHE_KEY, JSON.stringify(filteredData));
    console.log('✅ Cached property media removed for listing:', listingId);
  } catch (error) {
    console.error('❌ Error removing cached property media:', error);
  }
};

/**
 * Clear all cached property media data
 */
export const clearAllCachedPropertyMedia = async (): Promise<void> => {
  try {
    console.log('🗑️ Clearing all cached property media');
    await AsyncStorage.removeItem(PROPERTY_MEDIA_CACHE_KEY);
    console.log('✅ All cached property media cleared');
  } catch (error) {
    console.error('❌ Error clearing cached property media:', error);
  }
};

/**
 * Clear expired cached property media
 */
export const clearExpiredCachedPropertyMedia = async (): Promise<void> => {
  try {
    console.log('🗑️ Clearing expired cached property media');
    
    const allCachedData = await getAllCachedPropertyMedia();
    const validData = allCachedData.filter(item => 
      Date.now() - item.timestamp <= CACHE_EXPIRY_TIME
    );
    
    await AsyncStorage.setItem(PROPERTY_MEDIA_CACHE_KEY, JSON.stringify(validData));
    console.log(`✅ Cleared ${allCachedData.length - validData.length} expired cached property media`);
  } catch (error) {
    console.error('❌ Error clearing expired cached property media:', error);
  }
};
