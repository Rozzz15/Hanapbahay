import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  DbUserRecord,
  TenantProfileRecord,
  OwnerProfileRecord,
  OwnerVerificationRecord,
  ListingDraftRecord,
  PaymentProfileRecord,
  UserProfilePhotoRecord,
  PublishedListingRecord,
  ConversationRecord,
  MessageRecord,
  PropertyPhotoRecord
} from '@/types';

type CollectionName =
  | 'users'
  | 'tenants'
  | 'owners'
  | 'owner_profiles'
  | 'owner_verifications'
  | 'listing_drafts'
  | 'draft_listings'
  | 'payment_profiles'
  | 'conversations'
  | 'messages'
  | 'user_profile_photos'
  | 'property_photos'
  | 'published_listings';

type AnyRecord = DbUserRecord | TenantProfileRecord | OwnerProfileRecord | OwnerVerificationRecord | ListingDraftRecord | PaymentProfileRecord | UserProfilePhotoRecord | PublishedListingRecord | ConversationRecord | MessageRecord | PropertyPhotoRecord;

export const KEY_PREFIX = 'hb_db_';

async function readCollection<T extends AnyRecord>(name: CollectionName): Promise<Record<string, T>> {
  const key = KEY_PREFIX + name;
  const raw = await AsyncStorage.getItem(key);
  return raw ? JSON.parse(raw) as Record<string, T> : {};
}

async function writeCollection<T extends AnyRecord>(name: CollectionName, data: Record<string, T>): Promise<void> {
  const key = KEY_PREFIX + name;
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

// Remove duplicate published listings based on unique properties
export async function removeDuplicateListings(): Promise<void> {
  try {
    const publishedListings = await readCollection<PublishedListingRecord>('published_listings');
    const uniqueListings = new Map<string, PublishedListingRecord>();
    
    // Group by unique key (address + propertyType + userId)
    Object.values(publishedListings).forEach(listing => {
      const key = `${listing.address}_${listing.propertyType}_${listing.userId}`;
      if (!uniqueListings.has(key)) {
        uniqueListings.set(key, listing);
      } else {
        // Keep the most recent one if there are duplicates
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
    
    console.log(`🧹 Cleaned published listings: ${originalCount} → ${cleanedCount} (removed ${removedCount} duplicates)`);
  } catch (error) {
    console.error('❌ Error removing duplicate listings:', error);
  }
}


