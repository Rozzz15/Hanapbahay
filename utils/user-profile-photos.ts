import { db } from './db';
import { UserProfilePhotoRecord } from '@/types';

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
    
    // Check if user already has a profile photo
    const existingPhotos = await db.list<UserProfilePhotoRecord>('user_profile_photos');
    const existingPhoto = existingPhotos.find(photo => photo.userId === userId);
    
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
      
      await db.upsert('user_profile_photos', updatedPhoto);
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
      
      await db.upsert('user_profile_photos', newPhoto);
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
    const userPhoto = photos.find(photo => photo.userId === userId);
    
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
    const userPhoto = photos.find(photo => photo.userId === userId);
    
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
