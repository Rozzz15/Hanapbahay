import { db } from './db';
import { PropertyMedia } from './media-storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Media backup and recovery utilities
 * Provides comprehensive backup and restore functionality for media data
 */

export interface MediaBackup {
  id: string;
  timestamp: string;
  listingId: string;
  userId: string;
  media: PropertyMedia;
  metadata: {
    coverPhotoSize: number;
    photosCount: number;
    videosCount: number;
    totalSize: number;
  };
}

export interface BackupSummary {
  totalBackups: number;
  totalListings: number;
  totalSize: number;
  lastBackup: string | null;
  oldestBackup: string | null;
}

/**
 * Create a backup of media for a specific listing
 */
export const createMediaBackup = async (
  listingId: string,
  userId: string,
  media: PropertyMedia
): Promise<MediaBackup> => {
  try {
    console.log('💾 Creating media backup for listing:', listingId);
    
    const backupId = `backup_${listingId}_${Date.now()}`;
    const timestamp = new Date().toISOString();
    
    // Calculate metadata
    const coverPhotoSize = media.coverPhoto ? media.coverPhoto.length : 0;
    const photosSize = media.photos.reduce((total, photo) => total + photo.length, 0);
    const videosSize = media.videos.reduce((total, video) => total + video.length, 0);
    const totalSize = coverPhotoSize + photosSize + videosSize;
    
    const backup: MediaBackup = {
      id: backupId,
      timestamp,
      listingId,
      userId,
      media,
      metadata: {
        coverPhotoSize,
        photosCount: media.photos.length,
        videosCount: media.videos.length,
        totalSize
      }
    };
    
    // Save backup to AsyncStorage
    const backupKey = `media_backup_${backupId}`;
    await AsyncStorage.setItem(backupKey, JSON.stringify(backup));
    
    // Also save to database for redundancy
    await db.upsert('media_backups', backupId, backup);
    
    console.log('✅ Media backup created:', {
      backupId,
      listingId,
      totalSize,
      photosCount: media.photos.length,
      videosCount: media.videos.length
    });
    
    return backup;
  } catch (error) {
    console.error('❌ Error creating media backup:', error);
    throw error;
  }
};

/**
 * Restore media from a backup
 */
export const restoreMediaFromBackup = async (
  backupId: string,
  targetListingId?: string
): Promise<PropertyMedia | null> => {
  try {
    console.log('🔄 Restoring media from backup:', backupId);
    
    // Try to get backup from AsyncStorage first
    const backupKey = `media_backup_${backupId}`;
    let backup: MediaBackup | null = null;
    
    try {
      const backupData = await AsyncStorage.getItem(backupKey);
      if (backupData) {
        backup = JSON.parse(backupData) as MediaBackup;
      }
    } catch (storageError) {
      console.log('⚠️ Could not load backup from AsyncStorage, trying database:', storageError);
    }
    
    // If not found in AsyncStorage, try database
    if (!backup) {
      try {
        backup = await db.get('media_backups', backupId) as MediaBackup;
      } catch (dbError) {
        console.error('❌ Could not load backup from database:', dbError);
        return null;
      }
    }
    
    if (!backup) {
      console.log('❌ Backup not found:', backupId);
      return null;
    }
    
    // Use target listing ID if provided, otherwise use original
    const listingId = targetListingId || backup.listingId;
    
    // Restore media to all storage systems
    const { savePropertyMedia } = await import('./media-storage');
    await savePropertyMedia(listingId, backup.userId, backup.media);
    
    console.log('✅ Media restored from backup:', {
      backupId,
      listingId,
      photosCount: backup.media.photos.length,
      videosCount: backup.media.videos.length
    });
    
    return backup.media;
  } catch (error) {
    console.error('❌ Error restoring media from backup:', error);
    return null;
  }
};

/**
 * Get all backups for a specific listing
 */
export const getListingBackups = async (listingId: string): Promise<MediaBackup[]> => {
  try {
    console.log('📋 Getting backups for listing:', listingId);
    
    // Get from database
    const allBackups = await db.list('media_backups');
    const listingBackups = allBackups
      .filter((backup: any) => backup.listingId === listingId)
      .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    console.log(`✅ Found ${listingBackups.length} backups for listing ${listingId}`);
    return listingBackups;
  } catch (error) {
    console.error('❌ Error getting listing backups:', error);
    return [];
  }
};

/**
 * Get backup summary statistics
 */
export const getBackupSummary = async (): Promise<BackupSummary> => {
  try {
    console.log('📊 Getting backup summary...');
    
    const allBackups = await db.list('media_backups');
    const totalBackups = allBackups.length;
    
    if (totalBackups === 0) {
      return {
        totalBackups: 0,
        totalListings: 0,
        totalSize: 0,
        lastBackup: null,
        oldestBackup: null
      };
    }
    
    const uniqueListings = new Set(allBackups.map((backup: any) => backup.listingId));
    const totalSize = allBackups.reduce((sum: number, backup: any) => sum + (backup.metadata?.totalSize || 0), 0);
    
    const timestamps = allBackups.map((backup: any) => backup.timestamp).sort();
    const lastBackup = timestamps[timestamps.length - 1];
    const oldestBackup = timestamps[0];
    
    const summary: BackupSummary = {
      totalBackups,
      totalListings: uniqueListings.size,
      totalSize,
      lastBackup,
      oldestBackup
    };
    
    console.log('✅ Backup summary:', summary);
    return summary;
  } catch (error) {
    console.error('❌ Error getting backup summary:', error);
    return {
      totalBackups: 0,
      totalListings: 0,
      totalSize: 0,
      lastBackup: null,
      oldestBackup: null
    };
  }
};

/**
 * Clean up old backups (keep only the most recent N backups per listing)
 */
export const cleanupOldBackups = async (keepCount: number = 5): Promise<{
  deletedCount: number;
  keptCount: number;
}> => {
  try {
    console.log(`🧹 Cleaning up old backups (keeping ${keepCount} per listing)...`);
    
    const allBackups = await db.list('media_backups');
    const backupsByListing = new Map<string, any[]>();
    
    // Group backups by listing
    allBackups.forEach((backup: any) => {
      if (!backupsByListing.has(backup.listingId)) {
        backupsByListing.set(backup.listingId, []);
      }
      backupsByListing.get(backup.listingId)!.push(backup);
    });
    
    let deletedCount = 0;
    let keptCount = 0;
    
    // For each listing, keep only the most recent backups
    for (const [listingId, backups] of backupsByListing) {
      // Sort by timestamp (newest first)
      const sortedBackups = backups.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      
      const toKeep = sortedBackups.slice(0, keepCount);
      const toDelete = sortedBackups.slice(keepCount);
      
      // Delete old backups
      for (const backup of toDelete) {
        try {
          await db.remove('media_backups', backup.id);
          
          // Also remove from AsyncStorage
          const backupKey = `media_backup_${backup.id}`;
          await AsyncStorage.removeItem(backupKey);
          
          deletedCount++;
        } catch (deleteError) {
          console.log(`⚠️ Could not delete backup ${backup.id}:`, deleteError);
        }
      }
      
      keptCount += toKeep.length;
    }
    
    console.log(`✅ Backup cleanup completed:`, {
      deletedCount,
      keptCount,
      totalListings: backupsByListing.size
    });
    
    return { deletedCount, keptCount };
  } catch (error) {
    console.error('❌ Error cleaning up old backups:', error);
    return { deletedCount: 0, keptCount: 0 };
  }
};

/**
 * Create automatic backup before making changes
 * This should be called before any destructive media operations
 */
export const createAutomaticBackup = async (
  listingId: string,
  userId: string
): Promise<MediaBackup | null> => {
  try {
    console.log('🤖 Creating automatic backup for listing:', listingId);
    
    // Load current media
    const { loadPropertyMedia } = await import('./media-storage');
    const currentMedia = await loadPropertyMedia(listingId, userId);
    
    // Only create backup if there's actual media
    if (!currentMedia.coverPhoto && currentMedia.photos.length === 0 && currentMedia.videos.length === 0) {
      console.log('📸 No media to backup for listing:', listingId);
      return null;
    }
    
    // Create backup
    const backup = await createMediaBackup(listingId, userId, currentMedia);
    
    // Clean up old backups to prevent storage bloat
    await cleanupOldBackups(5);
    
    return backup;
  } catch (error) {
    console.error('❌ Error creating automatic backup:', error);
    return null;
  }
};

/**
 * Restore from the most recent backup
 */
export const restoreFromLatestBackup = async (
  listingId: string
): Promise<PropertyMedia | null> => {
  try {
    console.log('🔄 Restoring from latest backup for listing:', listingId);
    
    const backups = await getListingBackups(listingId);
    
    if (backups.length === 0) {
      console.log('❌ No backups found for listing:', listingId);
      return null;
    }
    
    // Get the most recent backup (first in the sorted array)
    const latestBackup = backups[0];
    
    return await restoreMediaFromBackup(latestBackup.id, listingId);
  } catch (error) {
    console.error('❌ Error restoring from latest backup:', error);
    return null;
  }
};

/**
 * Validate backup integrity
 */
export const validateBackupIntegrity = async (backupId: string): Promise<{
  isValid: boolean;
  issues: string[];
  backup?: MediaBackup;
}> => {
  try {
    console.log('🔍 Validating backup integrity:', backupId);
    
    const backup = await db.get('media_backups', backupId) as MediaBackup;
    
    if (!backup) {
      return {
        isValid: false,
        issues: ['Backup not found']
      };
    }
    
    const issues: string[] = [];
    
    // Validate backup structure
    if (!backup.id || !backup.listingId || !backup.userId || !backup.media) {
      issues.push('Invalid backup structure');
    }
    
    // Validate media data
    if (backup.media) {
      if (backup.media.coverPhoto && typeof backup.media.coverPhoto !== 'string') {
        issues.push('Invalid cover photo data');
      }
      
      if (!Array.isArray(backup.media.photos)) {
        issues.push('Invalid photos array');
      }
      
      if (!Array.isArray(backup.media.videos)) {
        issues.push('Invalid videos array');
      }
    }
    
    // Validate metadata
    if (backup.metadata) {
      if (typeof backup.metadata.totalSize !== 'number' || backup.metadata.totalSize < 0) {
        issues.push('Invalid total size metadata');
      }
      
      if (typeof backup.metadata.photosCount !== 'number' || backup.metadata.photosCount < 0) {
        issues.push('Invalid photos count metadata');
      }
      
      if (typeof backup.metadata.videosCount !== 'number' || backup.metadata.videosCount < 0) {
        issues.push('Invalid videos count metadata');
      }
    }
    
    const isValid = issues.length === 0;
    
    console.log('✅ Backup integrity validation completed:', {
      backupId,
      isValid,
      issuesCount: issues.length
    });
    
    return {
      isValid,
      issues,
      backup: isValid ? backup : undefined
    };
  } catch (error) {
    console.error('❌ Error validating backup integrity:', error);
    return {
      isValid: false,
      issues: [`Validation error: ${error}`]
    };
  }
};
