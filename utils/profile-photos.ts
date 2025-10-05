import * as FileSystem from 'expo-file-system';
import { db, generateId } from './db';
import { UserProfilePhotoRecord } from '@/types';
import { optimizePhotoForStorage } from './storage-management';

/**
 * Convert image URI to base64 for persistent storage
 */
export async function convertImageToBase64(uri: string): Promise<string> {
  try {
    console.log('🔄 Converting image to base64, URI type:', uri.substring(0, 50));
    
    // If it's already a data URI, extract the base64 part
    if (uri.startsWith('data:')) {
      const base64Match = uri.match(/^data:[^;]+;base64,(.+)$/);
      if (base64Match) {
        console.log('✅ URI is already base64, extracting data');
        return base64Match[1];
      }
    }
    
    // Try FileSystem method (works on native)
    try {
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      console.log('✅ Converted using FileSystem');
      return base64;
    } catch (fsError) {
      console.log('⚠️ FileSystem method failed, trying fetch method');
      
      // Fallback for web: use fetch to get the blob and convert to base64
      const response = await fetch(uri);
      const blob = await response.blob();
      
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          const base64 = result.split(',')[1]; // Remove data:image/...;base64, prefix
          console.log('✅ Converted using fetch + FileReader');
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    }
  } catch (error) {
    console.error('❌ Error converting image to base64:', error);
    throw new Error('Failed to convert image to base64');
  }
}

/**
 * Get base64 data URI from base64 string
 */
export function getBase64DataUri(base64: string, mimeType: string): string {
  return `data:${mimeType};base64,${base64}`;
}

/**
 * Save user profile photo to database
 */
export async function saveUserProfilePhoto(
  userId: string,
  photoUri: string,
  fileName: string,
  mimeType: string = 'image/jpeg'
): Promise<UserProfilePhotoRecord> {
  try {
    console.log('📸 Saving user profile photo to database...');
    
    // Convert image to base64 for persistent storage
    const base64Data = await convertImageToBase64(photoUri);
    
    // Optimize the photo for storage (compress to reduce size)
    console.log('🔄 Optimizing profile photo for storage...');
    const optimizedBase64 = await optimizePhotoForStorage(base64Data, 150); // 150KB max for profile photos
    
    // Get file size (with web compatibility)
    let fileSize = 0;
    try {
      const fileInfo = await FileSystem.getInfoAsync(photoUri);
      fileSize = fileInfo.exists ? fileInfo.size || 0 : 0;
      console.log('📏 File size from FileSystem:', fileSize);
    } catch (error) {
      // Fallback for web: estimate size from base64 length
      fileSize = Math.round((optimizedBase64.length * 3) / 4); // Approximate size from base64
      console.log('📏 File size estimated from optimized base64:', fileSize);
    }
    
    // Create photo record
    const photoRecord: UserProfilePhotoRecord = {
      id: generateId('photo'),
      userId,
      photoUri,
      photoData: optimizedBase64, // Use optimized data
      fileName,
      fileSize,
      mimeType,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    // Save to database
    await db.upsert('user_profile_photos', photoRecord.id, photoRecord);
    
    console.log('✅ Profile photo saved to database:', {
      id: photoRecord.id,
      userId: photoRecord.userId,
      fileName: photoRecord.fileName,
      fileSize: photoRecord.fileSize,
      hasBase64Data: !!photoRecord.photoData,
      optimized: optimizedBase64 !== base64Data
    });
    
    return photoRecord;
  } catch (error) {
    console.error('❌ Error saving profile photo:', error);
    throw error;
  }
}

/**
 * Get user profile photo from database
 */
export async function getUserProfilePhoto(userId: string): Promise<UserProfilePhotoRecord | null> {
  try {
    console.log('📂 Loading user profile photo from database...');
    
    // Get all photos for the user
    const allPhotos = await db.list<UserProfilePhotoRecord>('user_profile_photos');
    const userPhoto = allPhotos.find(photo => photo.userId === userId);
    
    if (userPhoto) {
      console.log('✅ Profile photo found:', {
        id: userPhoto.id,
        fileName: userPhoto.fileName,
        fileSize: userPhoto.fileSize,
        hasBase64Data: !!userPhoto.photoData
      });
      
      // Return the photo with a data URI if we have base64 data
      if (userPhoto.photoData) {
        return {
          ...userPhoto,
          photoUri: getBase64DataUri(userPhoto.photoData, userPhoto.mimeType)
        };
      }
      
      return userPhoto;
    }
    
    console.log('📝 No profile photo found for user:', userId);
    return null;
  } catch (error) {
    console.error('❌ Error loading profile photo:', error);
    return null;
  }
}

/**
 * Delete user profile photo from database
 */
export async function deleteUserProfilePhoto(userId: string): Promise<void> {
  try {
    console.log('🗑️ Deleting user profile photo from database...');
    
    // Get all photos for the user
    const allPhotos = await db.list<UserProfilePhotoRecord>('user_profile_photos');
    const userPhotos = allPhotos.filter(photo => photo.userId === userId);
    
    // Delete all photos for the user
    for (const photo of userPhotos) {
      await db.remove('user_profile_photos', photo.id);
      console.log('✅ Deleted photo:', photo.id);
    }
    
    console.log(`✅ Deleted ${userPhotos.length} profile photos for user:`, userId);
  } catch (error) {
    console.error('❌ Error deleting profile photo:', error);
    throw error;
  }
}

/**
 * Update user profile photo in database
 */
export async function updateUserProfilePhoto(
  userId: string,
  photoUri: string,
  fileName: string,
  mimeType: string = 'image/jpeg'
): Promise<UserProfilePhotoRecord> {
  try {
    console.log('🔄 Updating user profile photo in database...');
    
    // First delete existing photos
    await deleteUserProfilePhoto(userId);
    
    // Then save the new photo
    const newPhoto = await saveUserProfilePhoto(userId, photoUri, fileName, mimeType);
    
    console.log('✅ Profile photo updated successfully');
    return newPhoto;
  } catch (error) {
    console.error('❌ Error updating profile photo:', error);
    throw error;
  }
}

