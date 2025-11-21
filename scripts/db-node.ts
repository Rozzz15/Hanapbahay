/**
 * Node.js-compatible database utility for scripts
 * Uses file system instead of AsyncStorage
 */

import * as fs from 'fs';
import * as path from 'path';
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
  PropertyRatingRecord,
  TenantPaymentMethod,
  RentPaymentRecord,
  TenantComplaintRecord
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
  | 'listings'
  | 'tenant_payment_methods'
  | 'rent_payments'
  | 'tenant_complaints';

type AnyRecord = DbUserRecord | TenantProfileRecord | OwnerProfileRecord | OwnerVerificationRecord | OwnerApplicationRecord | BrgyNotificationRecord | PaymentProfileRecord | PaymentAccount | UserProfilePhotoRecord | PublishedListingRecord | ConversationRecord | MessageRecord | PropertyPhotoRecord | PropertyVideoRecord | BookingRecord | FavoriteRecord | PropertyRatingRecord | TenantPaymentMethod | RentPaymentRecord | TenantComplaintRecord;

const KEY_PREFIX = 'hb_db_';
const DATA_DIR = path.join(process.cwd(), '.data');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function getFilePath(collectionName: CollectionName): string {
  return path.join(DATA_DIR, `${collectionName}.json`);
}

async function readCollection<T extends AnyRecord>(name: CollectionName): Promise<Record<string, T>> {
  const filePath = getFilePath(name);
  
  if (!fs.existsSync(filePath)) {
    return {};
  }
  
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return raw ? JSON.parse(raw) as Record<string, T> : {};
  } catch (error) {
    console.warn(`Failed to read collection ${name}, returning empty:`, error);
    return {};
  }
}

async function writeCollection<T extends AnyRecord>(name: CollectionName, data: Record<string, T>): Promise<void> {
  const filePath = getFilePath(name);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

export const db = {
  async upsert<T extends AnyRecord>(name: CollectionName, id: string, record: T): Promise<void> {
    const col = await readCollection<T>(name);
    const updatedCol = { ...col, [id]: record };
    await writeCollection<T>(name, updatedCol);
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
    const col = await readCollection<any>(name);
    const { [id]: removed, ...updatedCol } = col;
    await writeCollection<any>(name, updatedCol);
  }
};

export function generateId(prefix: string = 'rec'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

