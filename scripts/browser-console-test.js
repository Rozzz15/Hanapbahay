/**
 * Browser console test to check cover photos
 * Run this in the browser console when the app is running
 */

// Function to check cover photos in the browser
const testCoverPhotos = () => {
  console.log('🔍 Testing cover photos in browser...');
  
  // Check if we're in a browser environment
  if (typeof window === 'undefined') {
    console.log('❌ This test must be run in a browser environment');
    return;
  }
  
  // Check localStorage for database data
  const keys = Object.keys(localStorage);
  const dbKeys = keys.filter(key => 
    key.includes('published_listings') || 
    key.includes('property_photos') ||
    key.includes('property_videos')
  );
  
  console.log('📊 Found database keys:', dbKeys);
  
  if (dbKeys.length === 0) {
    console.log('❌ No database keys found in localStorage');
    return;
  }
  
  // Check each database key
  dbKeys.forEach(key => {
    try {
      const data = localStorage.getItem(key);
      if (!data) {
        console.log(`📋 ${key}: No data`);
        return;
      }
      
      const parsedData = JSON.parse(data);
      console.log(`\n📋 ${key}:`, {
        type: typeof parsedData,
        isArray: Array.isArray(parsedData),
        length: Array.isArray(parsedData) ? parsedData.length : Object.keys(parsedData).length
      });
      
      if (Array.isArray(parsedData) && parsedData.length > 0) {
        // Check first few items for cover photos
        parsedData.slice(0, 3).forEach((item, index) => {
          if (item && typeof item === 'object') {
            console.log(`  📸 Item ${index}:`, {
              id: item.id,
              hasCoverPhoto: !!item.coverPhoto,
              coverPhotoType: typeof item.coverPhoto,
              coverPhotoLength: item.coverPhoto?.length || 0,
              coverPhotoPreview: item.coverPhoto?.substring(0, 50) + '...',
              isDataUri: item.coverPhoto?.startsWith('data:'),
              isHttpUri: item.coverPhoto?.startsWith('http'),
              isFileUri: item.coverPhoto?.startsWith('file://'),
              photosCount: item.photos?.length || 0,
              videosCount: item.videos?.length || 0
            });
          }
        });
      } else if (parsedData && typeof parsedData === 'object') {
        // Check object data
        Object.keys(parsedData).slice(0, 3).forEach(key => {
          const item = parsedData[key];
          if (item && typeof item === 'object') {
            console.log(`  📸 ${key}:`, {
              id: item.id,
              hasCoverPhoto: !!item.coverPhoto,
              coverPhotoType: typeof item.coverPhoto,
              coverPhotoLength: item.coverPhoto?.length || 0,
              coverPhotoPreview: item.coverPhoto?.substring(0, 50) + '...',
              isDataUri: item.coverPhoto?.startsWith('data:'),
              isHttpUri: item.coverPhoto?.startsWith('http'),
              isFileUri: item.coverPhoto?.startsWith('file://'),
              photosCount: item.photos?.length || 0,
              videosCount: item.videos?.length || 0
            });
          }
        });
      }
    } catch (error) {
      console.log(`❌ Error parsing ${key}:`, error);
    }
  });
  
  console.log('\n✅ Cover photo test completed');
};

// Function to test image loading
const testImageLoading = (imageUri) => {
  if (!imageUri) {
    console.log('❌ No image URI provided');
    return;
  }
  
  console.log('🖼️ Testing image loading for:', imageUri.substring(0, 100) + '...');
  
  const img = new Image();
  
  img.onload = () => {
    console.log('✅ Image loaded successfully:', {
      width: img.naturalWidth,
      height: img.naturalHeight,
      uri: imageUri.substring(0, 50) + '...'
    });
  };
  
  img.onerror = (error) => {
    console.log('❌ Image failed to load:', {
      error,
      uri: imageUri.substring(0, 50) + '...',
      uriType: typeof imageUri,
      uriLength: imageUri.length,
      isDataUri: imageUri.startsWith('data:'),
      isHttpUri: imageUri.startsWith('http'),
      isFileUri: imageUri.startsWith('file://')
    });
  };
  
  img.src = imageUri;
};

// Export functions to global scope
if (typeof window !== 'undefined') {
  window.testCoverPhotos = testCoverPhotos;
  window.testImageLoading = testImageLoading;
  console.log('✅ Test functions available:');
  console.log('  - testCoverPhotos() - Check cover photos in database');
  console.log('  - testImageLoading(uri) - Test loading a specific image URI');
}

module.exports = { testCoverPhotos, testImageLoading };