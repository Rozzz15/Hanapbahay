import { db } from './db';
import { UserProfilePhotoRecord } from '../types';

/**
 * Helper function to safely get userId from a photo record
 * Handles cases where the property might be stored as 'userid' instead of 'userId'
 */
function getPhotoUserId(photo: any): string | null {
  if (!photo) return null;
  
  // Try the correct property name first
  if (photo.userId && typeof photo.userId === 'string') {
    return photo.userId;
  }
  
  // Fallback to lowercase version if it exists
  if (photo.userid && typeof photo.userid === 'string') {
    console.warn('⚠️ Found photo with lowercase userid property, using fallback');
    return photo.userid;
  }
  
  // If neither exists, return null
  console.warn('⚠️ Photo record missing userId property:', Object.keys(photo));
  return null;
}

/**
 * Migrate existing photo records to use correct property names
 * This fixes any records that might have been stored with 'userid' instead of 'userId'
 */
export const migratePhotoRecords = async (): Promise<void> => {
  try {
    console.log('🔄 Starting photo records migration...');
    
    const photos = await db.list<UserProfilePhotoRecord>('user_profile_photos');
    let migratedCount = 0;
    
    // Filter out any undefined/null values that might come from the database
    const validPhotos = photos.filter(photo => photo != null && typeof photo === 'object');
    console.log('🔍 Debug - migration valid photos count:', validPhotos.length, 'out of', photos.length);
    
    for (const photo of validPhotos) {
      // Add safety check for photo object
      if (!photo || typeof photo !== 'object') {
        console.warn('⚠️ Invalid photo object found in migration:', photo);
        continue;
      }
      
      // Check if this record has the wrong property name
      if ((photo as any).userid && !photo.userId) {
        console.log('🔧 Migrating photo record:', photo?.id);
        
        // Create a corrected record
        const correctedPhoto: UserProfilePhotoRecord = {
          ...photo,
          userId: (photo as any).userid,
        };
        
        // Remove the incorrect property
        delete (correctedPhoto as any).userid;
        
        // Save the corrected record
        await db.upsert('user_profile_photos', photo.id, correctedPhoto);
        migratedCount++;
      }
    }
    
    if (migratedCount > 0) {
      console.log(`✅ Migrated ${migratedCount} photo records`);
    } else {
      console.log('✅ No photo records needed migration');
    }
  } catch (error) {
    console.error('❌ Error during photo records migration:', error);
  }
};

/**
 * Save user profile photo to database
 */
export const saveUserProfilePhoto = async (
  userId: string,
  photoUri: string,
  photoData?: string,
  fileName?: string,
  fileSize?: number,
  mimeType?: string
): Promise<string> => {
  try {
    console.log('💾 Saving user profile photo to database...');
    console.log('🔍 Debug - userId parameter:', userId);
    console.log('🔍 Debug - userId type:', typeof userId);
    console.log('🔍 Debug - userId is undefined?', userId === undefined);
    console.log('🔍 Debug - userId is null?', userId === null);
    
    // Validate userId parameter
    if (!userId || typeof userId !== 'string') {
      const error = new Error(`Invalid userId parameter: ${userId} (type: ${typeof userId})`);
      console.error('❌ Error saving user profile photo:', error);
      throw error;
    }
    
    // Check if user already has a profile photo
    const existingPhotos = await db.list<UserProfilePhotoRecord>('user_profile_photos');
    console.log('🔍 Debug - existingPhotos sample:', existingPhotos.slice(0, 2));
    console.log('🔍 Debug - first photo structure:', existingPhotos[0] ? Object.keys(existingPhotos[0]) : 'No photos');
    
    // Filter out any undefined/null values that might come from the database
    const validPhotos = existingPhotos.filter(photo => photo != null && typeof photo === 'object');
    console.log('🔍 Debug - valid photos count:', validPhotos.length, 'out of', existingPhotos.length);
    
    const existingPhoto = validPhotos.find(photo => {
      // Add safety check for photo object
      if (!photo || typeof photo !== 'object') {
        console.warn('⚠️ Invalid photo object found:', photo);
        return false;
      }
      
      const photoUserId = getPhotoUserId(photo);
      console.log('🔍 Debug - checking photo:', { 
        id: photo?.id, 
        hasUserId: 'userId' in photo, 
        hasUserid: 'userid' in photo,
        userId: photo?.userId,
        userid: (photo as any)?.userid,
        photoUserId,
        allKeys: photo ? Object.keys(photo) : []
      });
      return photoUserId === userId;
    });
    
    let photoId: string;
    
    if (existingPhoto) {
      // Update existing photo
      photoId = existingPhoto.id;
      const updatedPhoto: UserProfilePhotoRecord = {
        ...existingPhoto,
        photoUri,
        photoData: photoData || existingPhoto.photoData,
        fileName: fileName || existingPhoto.fileName,
        fileSize: fileSize || existingPhoto.fileSize,
        mimeType: mimeType || existingPhoto.mimeType,
        updatedAt: new Date().toISOString()
      };
      
      await db.upsert('user_profile_photos', photoId, updatedPhoto);
      console.log('✅ Updated existing profile photo:', photoId);
    } else {
      // Create new photo record
      photoId = `photo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const newPhoto: UserProfilePhotoRecord = {
        id: photoId,
        userId,
        photoUri,
        photoData: photoData || '',
        fileName: fileName || `profile_${userId}_${Date.now()}.jpg`,
        fileSize: fileSize || 0,
        mimeType: mimeType || 'image/jpeg',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      await db.upsert('user_profile_photos', photoId, newPhoto);
      console.log('✅ Created new profile photo:', photoId);
    }
    
    return photoId;
  } catch (error) {
    console.error('❌ Error saving user profile photo:', error);
    throw error;
  }
};

/**
 * Load user profile photo from database
 */
export const loadUserProfilePhoto = async (userId: string): Promise<string | null> => {
  try {
    console.log('📸 Loading user profile photo for:', userId);
    
    const photos = await db.list<UserProfilePhotoRecord>('user_profile_photos');
    console.log('🔍 Debug - loadUserProfilePhoto photos sample:', photos.slice(0, 2));
    console.log('🔍 Debug - loadUserProfilePhoto first photo structure:', photos[0] ? Object.keys(photos[0]) : 'No photos');
    
    // Filter out any undefined/null values that might come from the database
    const validPhotos = photos.filter(photo => photo != null && typeof photo === 'object');
    console.log('🔍 Debug - loadUserProfilePhoto valid photos count:', validPhotos.length, 'out of', photos.length);
    
    const userPhoto = validPhotos.find(photo => {
      // Add safety check for photo object
      if (!photo || typeof photo !== 'object') {
        console.warn('⚠️ Invalid photo object found in loadUserProfilePhoto:', photo);
        return false;
      }
      
      const photoUserId = getPhotoUserId(photo);
      console.log('🔍 Debug - loadUserProfilePhoto checking photo:', { 
        id: photo?.id, 
        hasUserId: 'userId' in photo, 
        hasUserid: 'userid' in photo,
        userId: photo?.userId,
        userid: (photo as any)?.userid,
        photoUserId,
        allKeys: photo ? Object.keys(photo) : []
      });
      return photoUserId === userId;
    });
    
    if (userPhoto) {
      console.log('✅ Found profile photo:', {
        id: userPhoto.id,
        fileName: userPhoto.fileName,
        hasPhotoData: !!userPhoto.photoData,
        photoUriLength: userPhoto.photoUri.length
      });
      
      // Return photoData if available (for persistence), otherwise photoUri
      return userPhoto.photoData || userPhoto.photoUri;
    } else {
      console.log('📸 No profile photo found for user:', userId);
      return null;
    }
  } catch (error) {
    console.error('❌ Error loading user profile photo:', error);
    return null;
  }
};

/**
 * Delete user profile photo from database
 */
export const deleteUserProfilePhoto = async (userId: string): Promise<boolean> => {
  try {
    console.log('🗑️ Deleting user profile photo for:', userId);
    
    const photos = await db.list<UserProfilePhotoRecord>('user_profile_photos');
    console.log('🔍 Debug - deleteUserProfilePhoto photos sample:', photos.slice(0, 2));
    console.log('🔍 Debug - deleteUserProfilePhoto first photo structure:', photos[0] ? Object.keys(photos[0]) : 'No photos');
    
    // Filter out any undefined/null values that might come from the database
    const validPhotos = photos.filter(photo => photo != null && typeof photo === 'object');
    console.log('🔍 Debug - deleteUserProfilePhoto valid photos count:', validPhotos.length, 'out of', photos.length);
    
    const userPhoto = validPhotos.find(photo => {
      // Add safety check for photo object
      if (!photo || typeof photo !== 'object') {
        console.warn('⚠️ Invalid photo object found in deleteUserProfilePhoto:', photo);
        return false;
      }
      
      const photoUserId = getPhotoUserId(photo);
      console.log('🔍 Debug - deleteUserProfilePhoto checking photo:', { 
        id: photo?.id, 
        hasUserId: 'userId' in photo, 
        hasUserid: 'userid' in photo,
        userId: photo?.userId,
        userid: (photo as any)?.userid,
        photoUserId,
        allKeys: photo ? Object.keys(photo) : []
      });
      return photoUserId === userId;
    });
    
    if (userPhoto) {
      await db.remove('user_profile_photos', userPhoto.id);
      console.log('✅ Deleted profile photo:', userPhoto.id);
      return true;
    } else {
      console.log('📸 No profile photo found to delete for user:', userId);
      return false;
    }
  } catch (error) {
    console.error('❌ Error deleting user profile photo:', error);
    return false;
  }
};
