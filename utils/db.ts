import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  DbUserRecord,
  TenantProfileRecord,
  OwnerProfileRecord,
  OwnerVerificationRecord,
  OwnerApplicationRecord,
  BrgyNotificationRecord,
  PaymentProfileRecord,
  PaymentAccount,
  UserProfilePhotoRecord,
  PublishedListingRecord,
  ConversationRecord,
  MessageRecord,
  PropertyPhotoRecord,
  PropertyVideoRecord,
  BookingRecord,
  FavoriteRecord,
  PropertyRatingRecord
} from '../types';

type CollectionName =
  | 'users'
  | 'tenants'
  | 'owners'
  | 'owner_profiles'
  | 'owner_verifications'
  | 'owner_applications'
  | 'brgy_notifications'
  | 'payment_profiles'
  | 'payment_accounts'
  | 'conversations'
  | 'messages'
  | 'user_profile_photos'
  | 'property_photos'
  | 'property_videos'
  | 'published_listings'
  | 'bookings'
  | 'favorites'
  | 'property_ratings'
  | 'personal_details'
  | 'listing_inquiries'
  | 'media_backups'
  | 'user_favorites'
  | 'listings';

type AnyRecord = DbUserRecord | TenantProfileRecord | OwnerProfileRecord | OwnerVerificationRecord | OwnerApplicationRecord | BrgyNotificationRecord | PaymentProfileRecord | PaymentAccount | UserProfilePhotoRecord | PublishedListingRecord | ConversationRecord | MessageRecord | PropertyPhotoRecord | PropertyVideoRecord | BookingRecord | FavoriteRecord | PropertyRatingRecord;

// Type guards for better type safety
export function isPublishedListingRecord(record: AnyRecord): record is PublishedListingRecord {
  return 'propertyType' in record && 'rentalType' in record && 'monthlyRent' in record;
}

export function isConversationRecord(record: AnyRecord): record is ConversationRecord {
  return 'ownerId' in record && 'tenantId' in record && 'participantIds' in record;
}

export function isMessageRecord(record: AnyRecord): record is MessageRecord {
  return 'conversationId' in record && 'senderId' in record && 'text' in record;
}

export function isPropertyPhotoRecord(record: AnyRecord): record is PropertyPhotoRecord {
  return 'listingId' in record && 'photoUri' in record && 'isCoverPhoto' in record;
}

export function isPropertyVideoRecord(record: AnyRecord): record is PropertyVideoRecord {
  return 'listingId' in record && 'videoUri' in record && 'duration' in record;
}

export function isUserProfilePhotoRecord(record: AnyRecord): record is UserProfilePhotoRecord {
  return 'userId' in record && 'photoUri' in record && 'fileName' in record;
}

export function isBookingRecord(record: AnyRecord): record is BookingRecord {
  return 'propertyId' in record && 'tenantId' in record && 'ownerId' in record && 'status' in record;
}

export function isFavoriteRecord(record: AnyRecord): record is FavoriteRecord {
  return 'userId' in record && 'propertyId' in record && 'createdAt' in record;
}

export function isPropertyRatingRecord(record: AnyRecord): record is PropertyRatingRecord {
  return 'propertyId' in record && 'userId' in record && 'rating' in record;
}

export const KEY_PREFIX = 'hb_db_';

// Cache for frequently accessed collections to reduce AsyncStorage calls
const collectionCache = new Map<string, any>();

async function readCollection<T extends AnyRecord>(name: CollectionName): Promise<Record<string, T>> {
  const key = KEY_PREFIX + name;
  
  // Check cache first for better performance
  if (collectionCache.has(key)) {
    return collectionCache.get(key);
  }
  
  const raw = await AsyncStorage.getItem(key);
  const result = raw ? JSON.parse(raw) as Record<string, T> : {};
  
  // Cache the result for future calls
  collectionCache.set(key, result);
  
  return result;
}

async function writeCollection<T extends AnyRecord>(name: CollectionName, data: Record<string, T>): Promise<void> {
  const key = KEY_PREFIX + name;
  
  // Update cache immediately for consistency
  collectionCache.set(key, data);
  
  await AsyncStorage.setItem(key, JSON.stringify(data));
}

export const db = {
  async upsert<T extends AnyRecord>(name: CollectionName, id: string, record: T): Promise<void> {
    const col = await readCollection<T>(name);
    col[id] = record;
    await writeCollection<T>(name, col);
  },
  async get<T extends AnyRecord>(name: CollectionName, id: string): Promise<T | null> {
    const col = await readCollection<T>(name);
    return col[id] ?? null;
  },
  async list<T extends AnyRecord>(name: CollectionName): Promise<T[]> {
    const col = await readCollection<T>(name);
    return Object.values(col);
  },
  async getAll<T extends AnyRecord>(name: CollectionName): Promise<T[]> {
    const col = await readCollection<T>(name);
    return Object.values(col);
  },
  async remove(name: CollectionName, id: string): Promise<void> {
    // Safety guard: never allow deleting users in non-dev environments
    const isDev = process.env.NODE_ENV !== 'production' && process.env.EXPO_PUBLIC_ALLOW_DATA_CLEAR === 'true';
    if (name === 'users' && !isDev) {
      console.warn('[db.remove] Blocked attempt to delete from users collection');
      return;
    }
    const col = await readCollection<any>(name);
    delete col[id];
    await writeCollection<any>(name, col);
  }
};

export function generateId(prefix: string = 'rec'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// Danger: Clears all collections stored with KEY_PREFIX.
export async function clearAllCollections(): Promise<void> {
  const isDev = process.env.NODE_ENV !== 'production' && process.env.EXPO_PUBLIC_ALLOW_DATA_CLEAR === 'true';
  if (!isDev) {
    console.warn('[clearAllCollections] Blocked in this environment');
    return;
  }
  const keys = await AsyncStorage.getAllKeys();
  const targets = keys.filter(k => k.startsWith(KEY_PREFIX));
  if (targets.length > 0) {
    await AsyncStorage.multiRemove(targets);
  }
}

// Check if an owner has any existing published listings
export async function hasOwnerListings(ownerId: string): Promise<boolean> {
  try {
    console.log('🔍 Checking if owner has existing listings:', ownerId);
    
    // Check published listings only
    const publishedListings = await db.list<PublishedListingRecord>('published_listings');
    const hasPublishedListings = publishedListings.some(listing => listing.userId === ownerId);
    
    console.log(`📊 Owner listing check results:`, {
      ownerId,
      publishedListings: publishedListings.length,
      hasPublishedListings
    });
    
    return hasPublishedListings;
  } catch (error) {
    console.error('❌ Error checking owner listings:', error);
    return false; // Default to false if there's an error
  }
}

// Remove duplicate published listings based on unique properties
// IMPORTANT: Only removes listings with EXACT same ID (true duplicates)
export async function removeDuplicateListings(): Promise<void> {
  try {
    const publishedListings = await readCollection<PublishedListingRecord>('published_listings');
    const uniqueListings = new Map<string, PublishedListingRecord>();
    
    // Group by listing ID only (not by address/propertyType) 
    // This prevents removing valid different listings at the same address
    Object.values(publishedListings).forEach(listing => {
      const key = listing.id; // Only use ID as unique key
      if (!uniqueListings.has(key)) {
        uniqueListings.set(key, listing);
      } else {
        // Keep the most recent one if there are true duplicates (same ID)
        const existing = uniqueListings.get(key)!;
        if (listing.publishedAt && existing.publishedAt) {
          if (new Date(listing.publishedAt) > new Date(existing.publishedAt)) {
            uniqueListings.set(key, listing);
          }
        }
      }
    });
    
    // Convert back to object format
    const cleanedListings: Record<string, PublishedListingRecord> = {};
    Array.from(uniqueListings.values()).forEach(listing => {
      cleanedListings[listing.id] = listing;
    });
    
    // Write back the cleaned data
    await writeCollection('published_listings', cleanedListings);
    
    const originalCount = Object.keys(publishedListings).length;
    const cleanedCount = Object.keys(cleanedListings).length;
    const removedCount = originalCount - cleanedCount;
    
    if (removedCount > 0) {
      console.log(`🧹 Cleaned published listings: ${originalCount} → ${cleanedCount} (removed ${removedCount} true duplicates with same ID)`);
    } else {
      console.log(`✅ No duplicate listings found - all ${originalCount} listings are unique`);
    }
  } catch (error) {
    console.error('❌ Error removing duplicate listings:', error);
  }
}

// Verify listing persistence for a specific user
export async function verifyUserListingsPersistence(userId: string): Promise<{
  success: boolean;
  listingsCount: number;
  listings: PublishedListingRecord[];
  message: string;
}> {
  try {
    console.log(`🔍 Verifying listing persistence for user: ${userId}`);
    
    const allListings = await db.list<PublishedListingRecord>('published_listings');
    const userListings = allListings.filter(listing => listing.userId === userId);
    
    console.log(`📊 Found ${userListings.length} listings for user ${userId}`);
    
    // Log listing details for verification
    userListings.forEach((listing, index) => {
      console.log(`📋 Listing ${index + 1}:`, {
        id: listing.id,
        propertyType: listing.propertyType,
        address: listing.address?.substring(0, 50) + '...',
        monthlyRent: listing.monthlyRent,
        publishedAt: listing.publishedAt,
        hasPhotos: !!(listing.photos && listing.photos.length > 0),
        photosCount: listing.photos?.length || 0
      });
    });
    
    return {
      success: true,
      listingsCount: userListings.length,
      listings: userListings,
      message: `Successfully verified ${userListings.length} listings for user ${userId}`
    };
  } catch (error) {
    console.error('❌ Error verifying user listings persistence:', error);
    return {
      success: false,
      listingsCount: 0,
      listings: [],
      message: `Failed to verify listings: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

// Get all records from a collection
export async function getAll<T extends AnyRecord>(name: CollectionName): Promise<T[]> {
  const collection = await readCollection<T>(name);
  return Object.values(collection);
}

// Clear cache function
export async function clearCache(): Promise<void> {
  collectionCache.clear();
  console.log('🗑️ Database cache cleared');
}

// Get all published listings with proper typing
export async function getAllPublishedListings(): Promise<PublishedListingRecord[]> {
  const rawListings = await db.list('published_listings');
  return rawListings.filter(isPublishedListingRecord);
}
