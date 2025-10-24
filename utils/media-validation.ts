import { db } from './db';
import { PropertyMedia } from './media-storage';
import { isValidImageUri } from './image-optimization';

/**
 * Media validation utilities
 * Provides comprehensive validation and integrity checks for media data
 */

export interface MediaValidationResult {
  isValid: boolean;
  issues: string[];
  warnings: string[];
  statistics: {
    totalMedia: number;
    validMedia: number;
    invalidMedia: number;
    totalSize: number;
    averageSize: number;
  };
}

export interface MediaIntegrityCheck {
  listingId: string;
  hasCoverPhoto: boolean;
  hasPhotos: boolean;
  hasVideos: boolean;
  coverPhotoValid: boolean;
  photosValid: boolean;
  videosValid: boolean;
  issues: string[];
  warnings: string[];
}

/**
 * Validate a single media URI
 */
export const validateMediaUri = (uri: string, type: 'image' | 'video'): {
  isValid: boolean;
  issues: string[];
  warnings: string[];
} => {
  const issues: string[] = [];
  const warnings: string[] = [];
  
  if (!uri || typeof uri !== 'string') {
    issues.push('URI is empty or not a string');
    return { isValid: false, issues, warnings };
  }
  
  const trimmedUri = uri.trim();
  
  if (trimmedUri === '' || trimmedUri === 'null' || trimmedUri === 'undefined') {
    issues.push('URI is empty, null, or undefined');
    return { isValid: false, issues, warnings };
  }
  
  // Check URI length
  if (trimmedUri.length > 10000) {
    warnings.push('URI is very long, may cause performance issues');
  }
  
  // Validate based on type
  if (type === 'image') {
    if (!isValidImageUri(trimmedUri)) {
      issues.push('Invalid image URI format');
    }
    
    // Check for data URI size
    if (trimmedUri.startsWith('data:')) {
      const sizeInBytes = (trimmedUri.length * 3) / 4; // Approximate base64 size
      if (sizeInBytes > 5 * 1024 * 1024) { // 5MB
        warnings.push('Image data URI is very large (>5MB)');
      }
    }
  } else if (type === 'video') {
    const videoExtensions = /\.(mp4|mov|avi|mkv|webm)(\?.*)?$/i;
    const dataUriPattern = /^data:video\//;
    const fileUriPattern = /^file:\/\//;
    const httpUriPattern = /^https?:\/\//;
    
    const isValidVideo = (
      videoExtensions.test(trimmedUri) ||
      dataUriPattern.test(trimmedUri) ||
      fileUriPattern.test(trimmedUri) ||
      httpUriPattern.test(trimmedUri)
    );
    
    if (!isValidVideo) {
      issues.push('Invalid video URI format');
    }
  }
  
  return {
    isValid: issues.length === 0,
    issues,
    warnings
  };
};

/**
 * Validate property media object
 */
export const validatePropertyMedia = (media: PropertyMedia): MediaValidationResult => {
  const issues: string[] = [];
  const warnings: string[] = [];
  let totalMedia = 0;
  let validMedia = 0;
  let invalidMedia = 0;
  let totalSize = 0;
  
  // Validate cover photo
  if (media.coverPhoto) {
    totalMedia++;
    const coverValidation = validateMediaUri(media.coverPhoto, 'image');
    if (coverValidation.isValid) {
      validMedia++;
      totalSize += media.coverPhoto.length;
    } else {
      invalidMedia++;
      issues.push(`Cover photo: ${coverValidation.issues.join(', ')}`);
    }
    warnings.push(...coverValidation.warnings.map(w => `Cover photo: ${w}`));
  }
  
  // Validate photos
  if (media.photos && Array.isArray(media.photos)) {
    media.photos.forEach((photo, index) => {
      totalMedia++;
      const photoValidation = validateMediaUri(photo, 'image');
      if (photoValidation.isValid) {
        validMedia++;
        totalSize += photo.length;
      } else {
        invalidMedia++;
        issues.push(`Photo ${index + 1}: ${photoValidation.issues.join(', ')}`);
      }
      warnings.push(...photoValidation.warnings.map(w => `Photo ${index + 1}: ${w}`));
    });
  } else if (media.photos) {
    issues.push('Photos property is not an array');
  }
  
  // Validate videos
  if (media.videos && Array.isArray(media.videos)) {
    media.videos.forEach((video, index) => {
      totalMedia++;
      const videoValidation = validateMediaUri(video, 'video');
      if (videoValidation.isValid) {
        validMedia++;
        totalSize += video.length;
      } else {
        invalidMedia++;
        issues.push(`Video ${index + 1}: ${videoValidation.issues.join(', ')}`);
      }
      warnings.push(...videoValidation.warnings.map(w => `Video ${index + 1}: ${w}`));
    });
  } else if (media.videos) {
    issues.push('Videos property is not an array');
  }
  
  // Check for duplicate media
  const allUris = [
    ...(media.coverPhoto ? [media.coverPhoto] : []),
    ...(media.photos || []),
    ...(media.videos || [])
  ];
  
  const uniqueUris = new Set(allUris);
  if (allUris.length !== uniqueUris.size) {
    warnings.push('Duplicate media URIs detected');
  }
  
  // Check for empty media object
  if (totalMedia === 0) {
    warnings.push('No media found in property media object');
  }
  
  const averageSize = totalMedia > 0 ? totalSize / totalMedia : 0;
  
  return {
    isValid: issues.length === 0,
    issues,
    warnings,
    statistics: {
      totalMedia,
      validMedia,
      invalidMedia,
      totalSize,
      averageSize
    }
  };
};

/**
 * Check media integrity for a specific listing
 */
export const checkMediaIntegrity = async (listingId: string): Promise<MediaIntegrityCheck> => {
  try {
    console.log('🔍 Checking media integrity for listing:', listingId);
    
    const issues: string[] = [];
    const warnings: string[] = [];
    
    // Load media from all sources
    const { loadPropertyMedia } = await import('./media-storage');
    const media = await loadPropertyMedia(listingId);
    
    const hasCoverPhoto = !!media.coverPhoto;
    const hasPhotos = media.photos && media.photos.length > 0;
    const hasVideos = media.videos && media.videos.length > 0;
    
    // Validate cover photo
    let coverPhotoValid = true;
    if (hasCoverPhoto) {
      const coverValidation = validateMediaUri(media.coverPhoto!, 'image');
      if (!coverValidation.isValid) {
        coverPhotoValid = false;
        issues.push(`Cover photo: ${coverValidation.issues.join(', ')}`);
      }
      warnings.push(...coverValidation.warnings.map(w => `Cover photo: ${w}`));
    }
    
    // Validate photos
    let photosValid = true;
    if (hasPhotos) {
      media.photos!.forEach((photo, index) => {
        const photoValidation = validateMediaUri(photo, 'image');
        if (!photoValidation.isValid) {
          photosValid = false;
          issues.push(`Photo ${index + 1}: ${photoValidation.issues.join(', ')}`);
        }
        warnings.push(...photoValidation.warnings.map(w => `Photo ${index + 1}: ${w}`));
      });
    }
    
    // Validate videos
    let videosValid = true;
    if (hasVideos) {
      media.videos!.forEach((video, index) => {
        const videoValidation = validateMediaUri(video, 'video');
        if (!videoValidation.isValid) {
          videosValid = false;
          issues.push(`Video ${index + 1}: ${videoValidation.issues.join(', ')}`);
        }
        warnings.push(...videoValidation.warnings.map(w => `Video ${index + 1}: ${w}`));
      });
    }
    
    // Check for consistency across storage systems
    try {
      const listing = await db.get('published_listings', listingId);
      if (listing) {
        const listingHasCoverPhoto = !!listing.coverPhoto;
        const listingHasPhotos = listing.photos && listing.photos.length > 0;
        const listingHasVideos = listing.videos && listing.videos.length > 0;
        
        if (hasCoverPhoto !== listingHasCoverPhoto) {
          warnings.push('Cover photo inconsistency between media storage and listing object');
        }
        
        if (hasPhotos !== listingHasPhotos) {
          warnings.push('Photos inconsistency between media storage and listing object');
        }
        
        if (hasVideos !== listingHasVideos) {
          warnings.push('Videos inconsistency between media storage and listing object');
        }
      }
    } catch (listingError) {
      warnings.push('Could not check listing object consistency');
    }
    
    const result: MediaIntegrityCheck = {
      listingId,
      hasCoverPhoto,
      hasPhotos,
      hasVideos,
      coverPhotoValid,
      photosValid,
      videosValid,
      issues,
      warnings
    };
    
    console.log('✅ Media integrity check completed:', {
      listingId,
      hasIssues: issues.length > 0,
      hasWarnings: warnings.length > 0,
      totalIssues: issues.length,
      totalWarnings: warnings.length
    });
    
    return result;
  } catch (error) {
    console.error('❌ Error checking media integrity:', error);
    return {
      listingId,
      hasCoverPhoto: false,
      hasPhotos: false,
      hasVideos: false,
      coverPhotoValid: false,
      photosValid: false,
      videosValid: false,
      issues: [`Integrity check failed: ${error}`],
      warnings: []
    };
  }
};

/**
 * Validate all media in the system
 */
export const validateAllMedia = async (): Promise<{
  totalListings: number;
  validListings: number;
  invalidListings: number;
  totalIssues: number;
  totalWarnings: number;
  results: MediaIntegrityCheck[];
}> => {
  try {
    console.log('🔍 Validating all media in the system...');
    
    const publishedListings = await db.list('published_listings');
    const results: MediaIntegrityCheck[] = [];
    let validListings = 0;
    let invalidListings = 0;
    let totalIssues = 0;
    let totalWarnings = 0;
    
    for (const listing of publishedListings) {
      const integrityCheck = await checkMediaIntegrity(listing.id);
      results.push(integrityCheck);
      
      if (integrityCheck.issues.length === 0) {
        validListings++;
      } else {
        invalidListings++;
      }
      
      totalIssues += integrityCheck.issues.length;
      totalWarnings += integrityCheck.warnings.length;
    }
    
    const summary = {
      totalListings: publishedListings.length,
      validListings,
      invalidListings,
      totalIssues,
      totalWarnings,
      results
    };
    
    console.log('✅ Media validation completed:', {
      totalListings: summary.totalListings,
      validListings: summary.validListings,
      invalidListings: summary.invalidListings,
      totalIssues: summary.totalIssues,
      totalWarnings: summary.totalWarnings
    });
    
    return summary;
  } catch (error) {
    console.error('❌ Error validating all media:', error);
    return {
      totalListings: 0,
      validListings: 0,
      invalidListings: 0,
      totalIssues: 1,
      totalWarnings: 0,
      results: []
    };
  }
};

/**
 * Repair media issues for a specific listing
 */
export const repairMediaIssues = async (listingId: string): Promise<{
  success: boolean;
  actions: string[];
  error?: string;
}> => {
  try {
    console.log('🔧 Repairing media issues for listing:', listingId);
    
    const actions: string[] = [];
    
    // Check current integrity
    const integrityCheck = await checkMediaIntegrity(listingId);
    
    if (integrityCheck.issues.length === 0) {
      actions.push('No issues found, no repair needed');
      return { success: true, actions };
    }
    
    // Try to load media and re-save it
    const { loadPropertyMedia, savePropertyMedia } = await import('./media-storage');
    const media = await loadPropertyMedia(listingId);
    
    if (media.coverPhoto || media.photos.length > 0 || media.videos.length > 0) {
      // Re-save media to fix any storage inconsistencies
      await savePropertyMedia(listingId, 'unknown', media);
      actions.push('Re-saved media to fix storage inconsistencies');
      
      // Update listing object
      const listing = await db.get('published_listings', listingId);
      if (listing) {
        const updatedListing = {
          ...listing,
          coverPhoto: media.coverPhoto,
          photos: media.photos,
          videos: media.videos,
          updatedAt: new Date().toISOString()
        };
        await db.upsert('published_listings', listingId, updatedListing);
        actions.push('Updated listing object with media data');
      }
      
      return { success: true, actions };
    } else {
      actions.push('No media found to repair');
      return { success: false, actions, error: 'No media found in any storage system' };
    }
  } catch (error) {
    console.error('❌ Error repairing media issues:', error);
    return {
      success: false,
      actions: [],
      error: error instanceof Error ? error.message : String(error)
    };
  }
};

/**
 * Get media statistics for the entire system
 */
export const getMediaStatistics = async (): Promise<{
  totalListings: number;
  listingsWithMedia: number;
  totalPhotos: number;
  totalVideos: number;
  totalSize: number;
  averagePhotosPerListing: number;
  averageVideosPerListing: number;
  averageSizePerListing: number;
}> => {
  try {
    console.log('📊 Getting media statistics...');
    
    const publishedListings = await db.list('published_listings');
    let listingsWithMedia = 0;
    let totalPhotos = 0;
    let totalVideos = 0;
    let totalSize = 0;
    
    for (const listing of publishedListings) {
      const { loadPropertyMedia } = await import('./media-storage');
      const media = await loadPropertyMedia(listing.id);
      
      if (media.coverPhoto || media.photos.length > 0 || media.videos.length > 0) {
        listingsWithMedia++;
        
        if (media.coverPhoto) {
          totalSize += media.coverPhoto.length;
        }
        
        totalPhotos += media.photos.length;
        media.photos.forEach(photo => {
          totalSize += photo.length;
        });
        
        totalVideos += media.videos.length;
        media.videos.forEach(video => {
          totalSize += video.length;
        });
      }
    }
    
    const totalListings = publishedListings.length;
    const averagePhotosPerListing = totalListings > 0 ? totalPhotos / totalListings : 0;
    const averageVideosPerListing = totalListings > 0 ? totalVideos / totalListings : 0;
    const averageSizePerListing = totalListings > 0 ? totalSize / totalListings : 0;
    
    const statistics = {
      totalListings,
      listingsWithMedia,
      totalPhotos,
      totalVideos,
      totalSize,
      averagePhotosPerListing,
      averageVideosPerListing,
      averageSizePerListing
    };
    
    console.log('✅ Media statistics:', statistics);
    return statistics;
  } catch (error) {
    console.error('❌ Error getting media statistics:', error);
    return {
      totalListings: 0,
      listingsWithMedia: 0,
      totalPhotos: 0,
      totalVideos: 0,
      totalSize: 0,
      averagePhotosPerListing: 0,
      averageVideosPerListing: 0,
      averageSizePerListing: 0
    };
  }
};
