import * as FileSystem from 'expo-file-system';
import { db, generateId } from './db';
import { Platform } from 'react-native';
import { optimizePhotoForStorage } from './storage-management';

/**
 * Property Listing Photo Models
 */
export interface PropertyPhotoRecord {
  id: string;
  listingId: string;
  userId: string;
  photoUri: string;
  photoData?: string; // Base64 encoded image data for persistence
  fileName: string;
  fileSize: number;
  mimeType: string;
  isCoverPhoto: boolean;
  createdAt: string;
  updatedAt: string;
}

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
 * Save property listing photo to database
 */
export async function savePropertyPhoto(
  listingId: string,
  userId: string,
  photoUri: string,
  fileName: string,
  isCoverPhoto: boolean = false,
  mimeType: string = 'image/jpeg'
): Promise<PropertyPhotoRecord> {
  try {
    console.log('📸 Saving property photo to database...');
    
    // Convert image to base64 for persistent storage
    const base64Data = await convertImageToBase64(photoUri);
    
    // Optimize the photo for storage (compress to reduce size)
    console.log('🔄 Optimizing photo for storage...');
    const optimizedBase64 = await optimizePhotoForStorage(base64Data, 200); // 200KB max
    
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
    const photoRecord: PropertyPhotoRecord = {
      id: generateId('photo'),
      listingId,
      userId,
      photoUri,
      photoData: optimizedBase64, // Use optimized data
      fileName,
      fileSize,
      mimeType,
      isCoverPhoto,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    // Save to database
    await db.upsert('property_photos', photoRecord.id, photoRecord);
    
    console.log('✅ Property photo saved to database:', {
      id: photoRecord.id,
      listingId: photoRecord.listingId,
      userId: photoRecord.userId,
      fileName: photoRecord.fileName,
      fileSize: photoRecord.fileSize,
      isCoverPhoto: photoRecord.isCoverPhoto,
      hasBase64Data: !!photoRecord.photoData,
      optimized: optimizedBase64 !== base64Data
    });
    
    return photoRecord;
  } catch (error) {
    console.error('❌ Error saving property photo:', error);
    throw error;
  }
}

/**
 * Get all photos for a property listing
 */
export async function getPropertyPhotos(listingId: string): Promise<PropertyPhotoRecord[]> {
  try {
    console.log('📂 Loading property photos from database...');
    
    // Get all photos for the listing
    const allPhotos = await db.list<PropertyPhotoRecord>('property_photos');
    const listingPhotos = allPhotos.filter(photo => photo.listingId === listingId);
    
    console.log(`✅ Found ${listingPhotos.length} photos for listing ${listingId}`);
    
    // Return photos with data URIs if we have base64 data
    return listingPhotos.map(photo => ({
      ...photo,
      photoUri: photo.photoData ? getBase64DataUri(photo.photoData, photo.mimeType) : photo.photoUri
    }));
  } catch (error) {
    console.error('❌ Error loading property photos:', error);
    return [];
  }
}

/**
 * Get cover photo for a property listing
 */
export async function getPropertyCoverPhoto(listingId: string): Promise<PropertyPhotoRecord | null> {
  try {
    console.log('📂 Loading property cover photo from database...');
    
    const allPhotos = await db.list<PropertyPhotoRecord>('property_photos');
    const coverPhoto = allPhotos.find(photo => 
      photo.listingId === listingId && photo.isCoverPhoto
    );
    
    if (coverPhoto) {
      console.log('✅ Cover photo found:', {
        id: coverPhoto.id,
        fileName: coverPhoto.fileName,
        fileSize: coverPhoto.fileSize,
        hasBase64Data: !!coverPhoto.photoData
      });
      
      // Return the photo with a data URI if we have base64 data
      if (coverPhoto.photoData) {
        return {
          ...coverPhoto,
          photoUri: getBase64DataUri(coverPhoto.photoData, coverPhoto.mimeType)
        };
      }
      
      return coverPhoto;
    }
    
    console.log('📝 No cover photo found for listing:', listingId);
    return null;
  } catch (error) {
    console.error('❌ Error loading cover photo:', error);
    return null;
  }
}

/**
 * Delete a specific property photo
 */
export async function deletePropertyPhoto(photoId: string): Promise<void> {
  try {
    console.log('🗑️ Deleting property photo:', photoId);
    
    await db.delete('property_photos', photoId);
    
    console.log('✅ Property photo deleted successfully');
  } catch (error) {
    console.error('❌ Error deleting property photo:', error);
    throw error;
  }
}

/**
 * Delete all photos for a property listing
 */
export async function deleteAllPropertyPhotos(listingId: string): Promise<void> {
  try {
    console.log('🗑️ Deleting all photos for listing:', listingId);
    
    const allPhotos = await db.list<PropertyPhotoRecord>('property_photos');
    const listingPhotos = allPhotos.filter(photo => photo.listingId === listingId);
    
    for (const photo of listingPhotos) {
      await db.delete('property_photos', photo.id);
    }
    
    console.log(`✅ Deleted ${listingPhotos.length} photos for listing ${listingId}`);
  } catch (error) {
    console.error('❌ Error deleting all property photos:', error);
    throw error;
  }
}

/**
 * Set cover photo for a property listing
 */
export async function setPropertyCoverPhoto(listingId: string, photoId: string): Promise<void> {
  try {
    console.log('⭐ Setting cover photo for listing:', listingId);
    
    // First, unset all existing cover photos for this listing
    const allPhotos = await db.list<PropertyPhotoRecord>('property_photos');
    const listingPhotos = allPhotos.filter(photo => photo.listingId === listingId);
    
    for (const photo of listingPhotos) {
      if (photo.isCoverPhoto) {
        await db.upsert('property_photos', photo.id, {
          ...photo,
          isCoverPhoto: false,
          updatedAt: new Date().toISOString()
        });
      }
    }
    
    // Set the new cover photo
    const coverPhoto = listingPhotos.find(photo => photo.id === photoId);
    if (coverPhoto) {
      await db.upsert('property_photos', photoId, {
        ...coverPhoto,
        isCoverPhoto: true,
        updatedAt: new Date().toISOString()
      });
      
      console.log('✅ Cover photo set successfully');
    } else {
      throw new Error('Photo not found');
    }
  } catch (error) {
    console.error('❌ Error setting cover photo:', error);
    throw error;
  }
}

/**
 * Save multiple photos for a property listing
 */
export async function savePropertyPhotos(
  listingId: string,
  userId: string,
  photos: string[],
  coverPhotoUri?: string
): Promise<PropertyPhotoRecord[]> {
  try {
    console.log(`📸 Saving ${photos.length} photos for listing ${listingId}`);
    
    const savedPhotos: PropertyPhotoRecord[] = [];
    
    for (let i = 0; i < photos.length; i++) {
      const photoUri = photos[i];
      const fileName = `property_${listingId}_${i + 1}_${Date.now()}.jpg`;
      const isCoverPhoto = coverPhotoUri === photoUri;
      
      const photoRecord = await savePropertyPhoto(
        listingId,
        userId,
        photoUri,
        fileName,
        isCoverPhoto
      );
      
      savedPhotos.push(photoRecord);
    }
    
    console.log(`✅ Successfully saved ${savedPhotos.length} photos`);
    return savedPhotos;
  } catch (error) {
    console.error('❌ Error saving property photos:', error);
    throw error;
  }
}

/**
 * Update property photos (replace existing photos with new ones)
 */
export async function updatePropertyPhotos(
  listingId: string,
  userId: string,
  newPhotos: string[],
  coverPhotoUri?: string
): Promise<PropertyPhotoRecord[]> {
  try {
    console.log(`🔄 Updating photos for listing ${listingId}`);
    
    // Delete existing photos
    await deleteAllPropertyPhotos(listingId);
    
    // Save new photos
    const savedPhotos = await savePropertyPhotos(listingId, userId, newPhotos, coverPhotoUri);
    
    console.log(`✅ Successfully updated photos for listing ${listingId}`);
    return savedPhotos;
  } catch (error) {
    console.error('❌ Error updating property photos:', error);
    throw error;
  }
}

/**
 * Get photo URIs for a property listing (for display purposes)
 */
export async function getPropertyPhotoUris(listingId: string): Promise<{
  photos: string[];
  coverPhoto: string | null;
}> {
  try {
    const photos = await getPropertyPhotos(listingId);
    const coverPhoto = await getPropertyCoverPhoto(listingId);
    
    return {
      photos: photos.map(photo => photo.photoUri),
      coverPhoto: coverPhoto?.photoUri || null
    };
  } catch (error) {
    console.error('❌ Error getting property photo URIs:', error);
    return {
      photos: [],
      coverPhoto: null
    };
  }
}
