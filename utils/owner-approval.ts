import { db } from './db';
import { OwnerApplicationRecord, DbUserRecord } from '../types';

// Cache for owner applications to avoid repeated database queries
let ownerApplicationsCache: { data: OwnerApplicationRecord[] | null; timestamp: number } = {
  data: null,
  timestamp: 0
};
const CACHE_DURATION = 5000; // 5 seconds cache

/**
 * Get owner applications with caching to reduce database calls
 */
async function getOwnerApplicationsCached(): Promise<OwnerApplicationRecord[]> {
  const now = Date.now();
  if (ownerApplicationsCache.data && (now - ownerApplicationsCache.timestamp) < CACHE_DURATION) {
    return ownerApplicationsCache.data;
  }
  
  const allApplications = await db.list<OwnerApplicationRecord>('owner_applications');
  ownerApplicationsCache = {
    data: allApplications,
    timestamp: now
  };
  return allApplications;
}

/**
 * Find owner application for a user with efficient matching
 */
function findOwnerApplication(applications: OwnerApplicationRecord[], userId: string): OwnerApplicationRecord | null {
  // Try exact match first (most common case)
  let application = applications.find(app => app.userId === userId);
  if (application) return application;
  
  // Try string comparison (in case of type mismatch)
  application = applications.find(app => String(app.userId) === String(userId));
  if (application) return application;
  
  // Try case-insensitive string comparison
  const normalizedUserId = String(userId).toLowerCase().trim();
  application = applications.find(app => 
    String(app.userId).toLowerCase().trim() === normalizedUserId
  );
  
  return application || null;
}

/**
 * Check if an owner's application has been approved by Barangay officials
 * @param userId - The user ID to check
 * @returns Promise<boolean> - true if approved, false if pending/rejected
 */
export async function isOwnerApproved(userId: string): Promise<boolean> {
  try {
    const allApplications = await getOwnerApplicationsCached();
    const application = findOwnerApplication(allApplications, userId);
    
    if (!application) {
      return false;
    }
    
    return application.status === 'approved';
  } catch (error) {
    console.error('❌ Error checking owner approval status:', error);
    return false;
  }
}

/**
 * Get owner application details
 * @param userId - The user ID to check
 * @returns Promise<OwnerApplicationRecord | null>
 */
export async function getOwnerApplication(userId: string): Promise<OwnerApplicationRecord | null> {
  try {
    const allApplications = await getOwnerApplicationsCached();
    return findOwnerApplication(allApplications, userId);
  } catch (error) {
    console.error('❌ Error getting owner application:', error);
    return null;
  }
}

/**
 * Check if user has pending owner application
 * @param userId - The user ID to check
 * @returns Promise<boolean>
 */
export async function hasPendingOwnerApplication(userId: string): Promise<boolean> {
  try {
    const allApplications = await getOwnerApplicationsCached();
    const application = findOwnerApplication(allApplications, userId);
    
    if (!application) {
      return false;
    }
    
    // Include applications that are pending or have reapplication requested
    return application.status === 'pending' || application.reapplicationRequested === true;
  } catch (error) {
    console.error('❌ Error checking pending owner application:', error);
    return false;
  }
}

// Cache for users to avoid repeated database queries
let usersCache: { data: DbUserRecord[] | null; timestamp: number } = {
  data: null,
  timestamp: 0
};

/**
 * Get users with caching to reduce database calls
 */
async function getUsersCached(): Promise<DbUserRecord[]> {
  const now = Date.now();
  if (usersCache.data && (now - usersCache.timestamp) < CACHE_DURATION) {
    return usersCache.data;
  }
  
  const allUsers = await db.list<DbUserRecord>('users');
  usersCache = {
    data: allUsers,
    timestamp: now
  };
  return allUsers;
}

/**
 * Get Barangay official contact information by barangay name
 * @param barangay - The barangay name
 * @returns Promise with official contact info or null
 */
export async function getBarangayOfficialContact(barangay: string): Promise<{
  name: string;
  email: string;
  phone: string;
  logo?: string | null;
} | null> {
  try {
    const allUsers = await getUsersCached();
    const normalizedBarangay = barangay.toUpperCase();
    const official = allUsers.find(
      user => user.role === 'brgy_official' && 
      user.barangay?.toUpperCase() === normalizedBarangay
    );
    
    if (!official) {
      return null;
    }
    
    // Get barangay logo from user record
    const logo = (official as any)?.barangayLogo || null;
    
    return {
      name: official.name || `Barangay ${barangay} Official`,
      email: official.email || '',
      phone: official.phone || '',
      logo: logo
    };
  } catch (error) {
    console.error('❌ Error getting barangay official contact:', error);
    return null;
  }
}

/**
 * Clear caches - useful when data is updated
 */
export function clearOwnerApprovalCache() {
  ownerApplicationsCache = { data: null, timestamp: 0 };
  usersCache = { data: null, timestamp: 0 };
}
