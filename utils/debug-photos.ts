/**
 * Debug utility to check if tenant photos are saved correctly
 * This can be called from the console or used in development
 */
import { db } from './db';
import { loadUserProfilePhoto } from './user-profile-photos';

export const debugTenantPhotos = async (tenantId?: string) => {
  try {
    console.log('🔍 DEBUG: Checking tenant photos in database...');
    
    const allPhotos = await db.list('user_profile_photos');
    console.log('📊 Total photos in database:', allPhotos.length);
    
    if (tenantId) {
      console.log('🔍 Looking for photos for tenant:', tenantId);
      const tenantPhoto = await loadUserProfilePhoto(tenantId);
      console.log('📸 Photo result for tenant:', {
        tenantId,
        hasPhoto: !!tenantPhoto,
        photoLength: tenantPhoto?.length || 0,
        photoPreview: tenantPhoto?.substring(0, 50) || 'none'
      });
    }
    
    // List all photos with their userIds
    const photoList = allPhotos.map((photo: any) => ({
      id: photo?.id,
      userId: photo?.userId || photo?.userid,
      hasPhotoData: !!(photo?.photoData && photo.photoData.trim()),
      hasPhotoUri: !!(photo?.photoUri && photo.photoUri.trim()),
      photoDataLength: photo?.photoData?.length || 0,
      photoUriLength: photo?.photoUri?.length || 0,
      mimeType: photo?.mimeType
    }));
    
    console.log('📋 All photos in database:', photoList);
    return photoList;
  } catch (error) {
    console.error('❌ Error debugging photos:', error);
    return null;
  }
};

// Make it available globally for debugging
if (typeof window !== 'undefined') {
  (window as any).debugTenantPhotos = debugTenantPhotos;
}





