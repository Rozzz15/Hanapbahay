/**
 * Simple Media Persistence Test for React Native Environment
 * This test can be run in the browser console or as a React Native test
 */

// Test data
const testData = {
  listingId: 'test_listing_' + Date.now(),
  userId: 'test_user_' + Date.now(),
  media: {
    coverPhoto: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=',
    photos: [
      'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k='
    ],
    videos: ['https://example.com/test-video.mp4']
  }
};

console.log('🧪 Media Persistence Test Data:', testData);

// Test functions that can be called from browser console
window.testMediaPersistence = {
  data: testData,
  
  // Test saving media
  async testSave() {
    try {
      console.log('📝 Testing media save...');
      const { savePropertyMedia } = await import('../utils/media-storage');
      await savePropertyMedia(this.data.listingId, this.data.userId, this.data.media);
      console.log('✅ Media saved successfully');
      return true;
    } catch (error) {
      console.error('❌ Media save failed:', error);
      return false;
    }
  },
  
  // Test loading media
  async testLoad() {
    try {
      console.log('📖 Testing media load...');
      const { loadPropertyMedia } = await import('../utils/media-storage');
      const loadedMedia = await loadPropertyMedia(this.data.listingId, this.data.userId);
      console.log('✅ Media loaded successfully:', loadedMedia);
      return loadedMedia;
    } catch (error) {
      console.error('❌ Media load failed:', error);
      return null;
    }
  },
  
  // Test persistence verification
  async testPersistence() {
    try {
      console.log('🔍 Testing media persistence...');
      const { verifyMediaPersistence } = await import('../utils/media-storage');
      const result = await verifyMediaPersistence(this.data.listingId);
      console.log('✅ Persistence verification:', result);
      return result;
    } catch (error) {
      console.error('❌ Persistence verification failed:', error);
      return null;
    }
  },
  
  // Test media synchronization
  async testSync() {
    try {
      console.log('🔄 Testing media synchronization...');
      const { syncAllPropertyMedia } = await import('../utils/media-storage');
      const result = await syncAllPropertyMedia();
      console.log('✅ Media synchronization:', result);
      return result;
    } catch (error) {
      console.error('❌ Media synchronization failed:', error);
      return null;
    }
  },
  
  // Run all tests
  async runAllTests() {
    console.log('🚀 Running all media persistence tests...');
    
    const results = {
      save: await this.testSave(),
      load: await this.testLoad(),
      persistence: await this.testPersistence(),
      sync: await this.testSync()
    };
    
    const passed = Object.values(results).filter(Boolean).length;
    const total = Object.keys(results).length;
    
    console.log('📊 Test Results:', {
      ...results,
      passed,
      total,
      successRate: `${((passed / total) * 100).toFixed(1)}%`
    });
    
    return results;
  },
  
  // Cleanup test data
  async cleanup() {
    try {
      console.log('🧹 Cleaning up test data...');
      const { db } = await import('../utils/db');
      
      // Remove test listing
      await db.remove('published_listings', this.data.listingId);
      
      // Remove test media
      const photos = await db.getAll('property_photos');
      const videos = await db.getAll('property_videos');
      
      const testPhotos = photos.filter(photo => photo.listingId === this.data.listingId);
      const testVideos = videos.filter(video => video.listingId === this.data.listingId);
      
      for (const photo of testPhotos) {
        await db.remove('property_photos', photo.id);
      }
      
      for (const video of testVideos) {
        await db.remove('property_videos', video.id);
      }
      
      console.log('✅ Test data cleaned up');
    } catch (error) {
      console.error('❌ Cleanup failed:', error);
    }
  }
};

console.log('🎯 Media persistence test functions loaded!');
console.log('📋 Available commands:');
console.log('  - testMediaPersistence.testSave()');
console.log('  - testMediaPersistence.testLoad()');
console.log('  - testMediaPersistence.testPersistence()');
console.log('  - testMediaPersistence.testSync()');
console.log('  - testMediaPersistence.runAllTests()');
console.log('  - testMediaPersistence.cleanup()');
