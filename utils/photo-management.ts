import { db } from './db';
import { PropertyPhotoRecord } from './property-photos';
import { UserProfilePhotoRecord } from './profile-photos';

/**
 * Photo Management Utilities
 * 
 * This module provides comprehensive photo management functions
 * to ensure all user-uploaded photos are properly stored and persist
 * until explicitly deleted by the user.
 */

export interface PhotoStats {
  totalPhotos: number;
  totalSize: number;
  photosByType: {
    profile: number;
    property: number;
  };
  oldestPhoto: string | null;
  newestPhoto: string | null;
}

/**
 * Get comprehensive photo statistics for a user
 */
export async function getUserPhotoStats(userId: string): Promise<PhotoStats> {
  try {
    console.log('📊 Calculating photo statistics for user:', userId);
    
    // Get all profile photos
    const profilePhotos = await db.list<UserProfilePhotoRecord>('user_profile_photos');
    const userProfilePhotos = profilePhotos.filter(photo => photo.userId === userId);
    
    // Get all property photos
    const propertyPhotos = await db.list<PropertyPhotoRecord>('property_photos');
    const userPropertyPhotos = propertyPhotos.filter(photo => photo.userId === userId);
    
    // Calculate total size
    const totalSize = [
      ...userProfilePhotos.map(photo => photo.fileSize),
      ...userPropertyPhotos.map(photo => photo.fileSize)
    ].reduce((sum, size) => sum + size, 0);
    
    // Find oldest and newest photos
    const allPhotos = [
      ...userProfilePhotos.map(photo => ({ date: photo.createdAt, type: 'profile' })),
      ...userPropertyPhotos.map(photo => ({ date: photo.createdAt, type: 'property' }))
    ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    const oldestPhoto = allPhotos.length > 0 ? allPhotos[0].date : null;
    const newestPhoto = allPhotos.length > 0 ? allPhotos[allPhotos.length - 1].date : null;
    
    const stats: PhotoStats = {
      totalPhotos: userProfilePhotos.length + userPropertyPhotos.length,
      totalSize,
      photosByType: {
        profile: userProfilePhotos.length,
        property: userPropertyPhotos.length
      },
      oldestPhoto,
      newestPhoto
    };
    
    console.log('📊 Photo statistics calculated:', stats);
    return stats;
  } catch (error) {
    console.error('❌ Error calculating photo statistics:', error);
    return {
      totalPhotos: 0,
      totalSize: 0,
      photosByType: { profile: 0, property: 0 },
      oldestPhoto: null,
      newestPhoto: null
    };
  }
}

/**
 * Clean up orphaned photos (photos that reference non-existent listings)
 */
export async function cleanupOrphanedPhotos(): Promise<{ cleaned: number; errors: number }> {
  try {
    console.log('🧹 Starting orphaned photo cleanup...');
    
    const propertyPhotos = await db.list<PropertyPhotoRecord>('property_photos');
    const publishedListings = await db.list('published_listings');
    const draftListings = await db.list('draft_listings');
    
    // Create a set of all existing listing IDs
    const existingListingIds = new Set([
      ...publishedListings.map(listing => listing.id),
      ...draftListings.map(listing => listing.id)
    ]);
    
    let cleaned = 0;
    let errors = 0;
    
    for (const photo of propertyPhotos) {
      if (!existingListingIds.has(photo.listingId)) {
        try {
          await db.delete('property_photos', photo.id);
          cleaned++;
          console.log(`🗑️ Cleaned orphaned photo: ${photo.id} (listing: ${photo.listingId})`);
        } catch (error) {
          console.error(`❌ Error cleaning photo ${photo.id}:`, error);
          errors++;
        }
      }
    }
    
    console.log(`✅ Orphaned photo cleanup completed: ${cleaned} cleaned, ${errors} errors`);
    return { cleaned, errors };
  } catch (error) {
    console.error('❌ Error during orphaned photo cleanup:', error);
    return { cleaned: 0, errors: 1 };
  }
}

/**
 * Clean up photos for deleted users
 */
export async function cleanupDeletedUserPhotos(): Promise<{ cleaned: number; errors: number }> {
  try {
    console.log('🧹 Starting deleted user photo cleanup...');
    
    const users = await db.list('users');
    const existingUserIds = new Set(users.map(user => user.id));
    
    // Clean up profile photos
    const profilePhotos = await db.list<UserProfilePhotoRecord>('user_profile_photos');
    let profileCleaned = 0;
    let profileErrors = 0;
    
    for (const photo of profilePhotos) {
      if (!existingUserIds.has(photo.userId)) {
        try {
          await db.delete('user_profile_photos', photo.id);
          profileCleaned++;
          console.log(`🗑️ Cleaned profile photo for deleted user: ${photo.userId}`);
        } catch (error) {
          console.error(`❌ Error cleaning profile photo ${photo.id}:`, error);
          profileErrors++;
        }
      }
    }
    
    // Clean up property photos
    const propertyPhotos = await db.list<PropertyPhotoRecord>('property_photos');
    let propertyCleaned = 0;
    let propertyErrors = 0;
    
    for (const photo of propertyPhotos) {
      if (!existingUserIds.has(photo.userId)) {
        try {
          await db.delete('property_photos', photo.id);
          propertyCleaned++;
          console.log(`🗑️ Cleaned property photo for deleted user: ${photo.userId}`);
        } catch (error) {
          console.error(`❌ Error cleaning property photo ${photo.id}:`, error);
          propertyErrors++;
        }
      }
    }
    
    const totalCleaned = profileCleaned + propertyCleaned;
    const totalErrors = profileErrors + propertyErrors;
    
    console.log(`✅ Deleted user photo cleanup completed: ${totalCleaned} cleaned, ${totalErrors} errors`);
    return { cleaned: totalCleaned, errors: totalErrors };
  } catch (error) {
    console.error('❌ Error during deleted user photo cleanup:', error);
    return { cleaned: 0, errors: 1 };
  }
}

/**
 * Get all photos for a specific user (both profile and property photos)
 */
export async function getAllUserPhotos(userId: string): Promise<{
  profilePhotos: UserProfilePhotoRecord[];
  propertyPhotos: PropertyPhotoRecord[];
}> {
  try {
    console.log('📂 Loading all photos for user:', userId);
    
    const profilePhotos = await db.list<UserProfilePhotoRecord>('user_profile_photos');
    const propertyPhotos = await db.list<PropertyPhotoRecord>('property_photos');
    
    const userProfilePhotos = profilePhotos.filter(photo => photo.userId === userId);
    const userPropertyPhotos = propertyPhotos.filter(photo => photo.userId === userId);
    
    console.log(`✅ Loaded ${userProfilePhotos.length} profile photos and ${userPropertyPhotos.length} property photos`);
    
    return {
      profilePhotos: userProfilePhotos,
      propertyPhotos: userPropertyPhotos
    };
  } catch (error) {
    console.error('❌ Error loading user photos:', error);
    return {
      profilePhotos: [],
      propertyPhotos: []
    };
  }
}

/**
 * Delete all photos for a specific user
 */
export async function deleteAllUserPhotos(userId: string): Promise<{ deleted: number; errors: number }> {
  try {
    console.log('🗑️ Deleting all photos for user:', userId);
    
    const { profilePhotos, propertyPhotos } = await getAllUserPhotos(userId);
    
    let deleted = 0;
    let errors = 0;
    
    // Delete profile photos
    for (const photo of profilePhotos) {
      try {
        await db.delete('user_profile_photos', photo.id);
        deleted++;
      } catch (error) {
        console.error(`❌ Error deleting profile photo ${photo.id}:`, error);
        errors++;
      }
    }
    
    // Delete property photos
    for (const photo of propertyPhotos) {
      try {
        await db.delete('property_photos', photo.id);
        deleted++;
      } catch (error) {
        console.error(`❌ Error deleting property photo ${photo.id}:`, error);
        errors++;
      }
    }
    
    console.log(`✅ Deleted ${deleted} photos for user ${userId}, ${errors} errors`);
    return { deleted, errors };
  } catch (error) {
    console.error('❌ Error deleting all user photos:', error);
    return { deleted: 0, errors: 1 };
  }
}

/**
 * Export all photos for a user (for backup purposes)
 */
export async function exportUserPhotos(userId: string): Promise<{
  profilePhotos: UserProfilePhotoRecord[];
  propertyPhotos: PropertyPhotoRecord[];
  exportDate: string;
  userId: string;
}> {
  try {
    console.log('📤 Exporting all photos for user:', userId);
    
    const { profilePhotos, propertyPhotos } = await getAllUserPhotos(userId);
    
    const exportData = {
      profilePhotos,
      propertyPhotos,
      exportDate: new Date().toISOString(),
      userId
    };
    
    console.log(`✅ Exported ${profilePhotos.length} profile photos and ${propertyPhotos.length} property photos`);
    return exportData;
  } catch (error) {
    console.error('❌ Error exporting user photos:', error);
    throw error;
  }
}

/**
 * Validate photo integrity (check if photos still exist and are accessible)
 */
export async function validatePhotoIntegrity(): Promise<{
  valid: number;
  invalid: number;
  errors: string[];
}> {
  try {
    console.log('🔍 Validating photo integrity...');
    
    const profilePhotos = await db.list<UserProfilePhotoRecord>('user_profile_photos');
    const propertyPhotos = await db.list<PropertyPhotoRecord>('property_photos');
    
    let valid = 0;
    let invalid = 0;
    const errors: string[] = [];
    
    // Validate profile photos
    for (const photo of profilePhotos) {
      try {
        if (photo.photoData && photo.photoData.length > 0) {
          valid++;
        } else if (photo.photoUri && photo.photoUri.length > 0) {
          // Check if URI is accessible (basic check)
          if (photo.photoUri.startsWith('data:') || photo.photoUri.startsWith('http')) {
            valid++;
          } else {
            invalid++;
            errors.push(`Profile photo ${photo.id} has invalid URI: ${photo.photoUri.substring(0, 50)}...`);
          }
        } else {
          invalid++;
          errors.push(`Profile photo ${photo.id} has no data or URI`);
        }
      } catch (error) {
        invalid++;
        errors.push(`Profile photo ${photo.id} validation error: ${error}`);
      }
    }
    
    // Validate property photos
    for (const photo of propertyPhotos) {
      try {
        if (photo.photoData && photo.photoData.length > 0) {
          valid++;
        } else if (photo.photoUri && photo.photoUri.length > 0) {
          // Check if URI is accessible (basic check)
          if (photo.photoUri.startsWith('data:') || photo.photoUri.startsWith('http')) {
            valid++;
          } else {
            invalid++;
            errors.push(`Property photo ${photo.id} has invalid URI: ${photo.photoUri.substring(0, 50)}...`);
          }
        } else {
          invalid++;
          errors.push(`Property photo ${photo.id} has no data or URI`);
        }
      } catch (error) {
        invalid++;
        errors.push(`Property photo ${photo.id} validation error: ${error}`);
      }
    }
    
    console.log(`✅ Photo integrity validation completed: ${valid} valid, ${invalid} invalid`);
    return { valid, invalid, errors };
  } catch (error) {
    console.error('❌ Error validating photo integrity:', error);
    return { valid: 0, invalid: 0, errors: [`Validation error: ${error}`] };
  }
}

/**
 * Run comprehensive photo maintenance
 */
export async function runPhotoMaintenance(): Promise<{
  orphanedCleaned: number;
  deletedUserCleaned: number;
  integrityValid: number;
  integrityInvalid: number;
  totalErrors: number;
}> {
  try {
    console.log('🔧 Starting comprehensive photo maintenance...');
    
    // Clean up orphaned photos
    const orphanedResult = await cleanupOrphanedPhotos();
    
    // Clean up deleted user photos
    const deletedUserResult = await cleanupDeletedUserPhotos();
    
    // Validate photo integrity
    const integrityResult = await validatePhotoIntegrity();
    
    const totalErrors = orphanedResult.errors + deletedUserResult.errors + integrityResult.errors.length;
    
    console.log('✅ Photo maintenance completed:', {
      orphanedCleaned: orphanedResult.cleaned,
      deletedUserCleaned: deletedUserResult.cleaned,
      integrityValid: integrityResult.valid,
      integrityInvalid: integrityResult.invalid,
      totalErrors
    });
    
    return {
      orphanedCleaned: orphanedResult.cleaned,
      deletedUserCleaned: deletedUserResult.cleaned,
      integrityValid: integrityResult.valid,
      integrityInvalid: integrityResult.invalid,
      totalErrors
    };
  } catch (error) {
    console.error('❌ Error during photo maintenance:', error);
    return {
      orphanedCleaned: 0,
      deletedUserCleaned: 0,
      integrityValid: 0,
      integrityInvalid: 0,
      totalErrors: 1
    };
  }
}
