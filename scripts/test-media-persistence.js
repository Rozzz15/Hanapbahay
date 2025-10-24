/**
 * Comprehensive Media Persistence Test Script
 * Tests all aspects of media storage and persistence
 */

const { db } = require('../utils/db');
const { 
  savePropertyMedia, 
  loadPropertyMedia, 
  verifyMediaPersistence,
  syncAllPropertyMedia 
} = require('../utils/media-storage');
const { 
  createMediaBackup, 
  restoreFromLatestBackup,
  getBackupSummary 
} = require('../utils/media-backup');
const { 
  validateAllMedia, 
  getMediaStatistics,
  checkMediaIntegrity 
} = require('../utils/media-validation');

// Test data
const testListingId = 'test_listing_' + Date.now();
const testUserId = 'test_user_' + Date.now();
const testMedia = {
  coverPhoto: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=',
  photos: [
    'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=',
    'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k='
  ],
  videos: [
    'https://example.com/video1.mp4',
    'https://example.com/video2.mp4'
  ]
};

async function runMediaPersistenceTests() {
  console.log('🧪 Starting Comprehensive Media Persistence Tests...\n');
  
  let passedTests = 0;
  let totalTests = 0;
  
  // Test 1: Save Media
  console.log('📝 Test 1: Saving Media to Database');
  totalTests++;
  try {
    await savePropertyMedia(testListingId, testUserId, testMedia);
    console.log('✅ Media saved successfully');
    passedTests++;
  } catch (error) {
    console.log('❌ Failed to save media:', error.message);
  }
  
  // Test 2: Load Media
  console.log('\n📖 Test 2: Loading Media from Database');
  totalTests++;
  try {
    const loadedMedia = await loadPropertyMedia(testListingId, testUserId);
    const isEqual = JSON.stringify(loadedMedia) === JSON.stringify(testMedia);
    if (isEqual) {
      console.log('✅ Media loaded successfully and matches original');
      passedTests++;
    } else {
      console.log('❌ Loaded media does not match original');
      console.log('Expected:', JSON.stringify(testMedia, null, 2));
      console.log('Got:', JSON.stringify(loadedMedia, null, 2));
    }
  } catch (error) {
    console.log('❌ Failed to load media:', error.message);
  }
  
  // Test 3: Verify Persistence
  console.log('\n🔍 Test 3: Verifying Media Persistence');
  totalTests++;
  try {
    const persistenceCheck = await verifyMediaPersistence(testListingId);
    if (persistenceCheck.hasAsyncStorage && persistenceCheck.hasDatabase) {
      console.log('✅ Media persistence verified across all storage systems');
      passedTests++;
    } else {
      console.log('❌ Media persistence verification failed:', persistenceCheck);
    }
  } catch (error) {
    console.log('❌ Failed to verify persistence:', error.message);
  }
  
  // Test 4: Create Backup
  console.log('\n💾 Test 4: Creating Media Backup');
  totalTests++;
  try {
    const backup = await createMediaBackup(testListingId, testUserId, testMedia);
    if (backup && backup.id) {
      console.log('✅ Media backup created successfully');
      passedTests++;
    } else {
      console.log('❌ Media backup creation failed');
    }
  } catch (error) {
    console.log('❌ Failed to create backup:', error.message);
  }
  
  // Test 5: Restore from Backup
  console.log('\n🔄 Test 5: Restoring from Backup');
  totalTests++;
  try {
    const restoredMedia = await restoreFromLatestBackup(testListingId);
    if (restoredMedia) {
      const isEqual = JSON.stringify(restoredMedia) === JSON.stringify(testMedia);
      if (isEqual) {
        console.log('✅ Media restored from backup successfully');
        passedTests++;
      } else {
        console.log('❌ Restored media does not match original');
      }
    } else {
      console.log('❌ No backup found to restore from');
    }
  } catch (error) {
    console.log('❌ Failed to restore from backup:', error.message);
  }
  
  // Test 6: Media Validation
  console.log('\n✅ Test 6: Media Validation');
  totalTests++;
  try {
    const validationResult = await checkMediaIntegrity(testListingId);
    if (validationResult.issues.length === 0) {
      console.log('✅ Media validation passed');
      passedTests++;
    } else {
      console.log('❌ Media validation failed:', validationResult.issues);
    }
  } catch (error) {
    console.log('❌ Failed to validate media:', error.message);
  }
  
  // Test 7: Media Synchronization
  console.log('\n🔄 Test 7: Media Synchronization');
  totalTests++;
  try {
    const syncResult = await syncAllPropertyMedia();
    if (syncResult.syncedCount > 0) {
      console.log('✅ Media synchronization completed successfully');
      passedTests++;
    } else {
      console.log('⚠️ No media to synchronize');
      passedTests++; // This is not a failure
    }
  } catch (error) {
    console.log('❌ Failed to synchronize media:', error.message);
  }
  
  // Test 8: Media Statistics
  console.log('\n📊 Test 8: Media Statistics');
  totalTests++;
  try {
    const stats = await getMediaStatistics();
    console.log('✅ Media statistics retrieved:', {
      totalListings: stats.totalListings,
      listingsWithMedia: stats.listingsWithMedia,
      totalPhotos: stats.totalPhotos,
      totalVideos: stats.totalVideos
    });
    passedTests++;
  } catch (error) {
    console.log('❌ Failed to get media statistics:', error.message);
  }
  
  // Test 9: Backup Summary
  console.log('\n📋 Test 9: Backup Summary');
  totalTests++;
  try {
    const backupSummary = await getBackupSummary();
    console.log('✅ Backup summary retrieved:', backupSummary);
    passedTests++;
  } catch (error) {
    console.log('❌ Failed to get backup summary:', error.message);
  }
  
  // Test 10: Cross-Session Persistence (Simulated)
  console.log('\n🔄 Test 10: Cross-Session Persistence (Simulated)');
  totalTests++;
  try {
    // Clear memory cache to simulate app restart
    const { clearCache } = require('../utils/db');
    await clearCache();
    
    // Try to load media again
    const reloadedMedia = await loadPropertyMedia(testListingId, testUserId);
    const isEqual = JSON.stringify(reloadedMedia) === JSON.stringify(testMedia);
    if (isEqual) {
      console.log('✅ Media persisted across simulated app restart');
      passedTests++;
    } else {
      console.log('❌ Media did not persist across simulated app restart');
    }
  } catch (error) {
    console.log('❌ Failed to test cross-session persistence:', error.message);
  }
  
  // Cleanup
  console.log('\n🧹 Cleaning up test data...');
  try {
    await db.remove('published_listings', testListingId);
    
    // Remove media records
    const photos = await db.getAll('property_photos');
    const videos = await db.getAll('property_videos');
    const testPhotos = photos.filter(photo => photo.listingId === testListingId);
    const testVideos = videos.filter(video => video.listingId === testListingId);
    
    for (const photo of testPhotos) {
      await db.remove('property_photos', photo.id);
    }
    
    for (const video of testVideos) {
      await db.remove('property_videos', video.id);
    }
    
    // Remove backups
    const backups = await db.getAll('media_backups');
    const testBackups = backups.filter(backup => backup.listingId === testListingId);
    
    for (const backup of testBackups) {
      await db.remove('media_backups', backup.id);
    }
    
    console.log('✅ Test data cleaned up');
  } catch (error) {
    console.log('⚠️ Error cleaning up test data:', error.message);
  }
  
  // Results
  console.log('\n📊 Test Results Summary:');
  console.log(`✅ Passed: ${passedTests}/${totalTests}`);
  console.log(`❌ Failed: ${totalTests - passedTests}/${totalTests}`);
  console.log(`📈 Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
  
  if (passedTests === totalTests) {
    console.log('\n🎉 All tests passed! Media persistence is working correctly.');
  } else {
    console.log('\n⚠️ Some tests failed. Please check the implementation.');
  }
  
  return {
    passed: passedTests,
    total: totalTests,
    successRate: (passedTests / totalTests) * 100
  };
}

// Run tests if this script is executed directly
if (require.main === module) {
  runMediaPersistenceTests()
    .then(results => {
      console.log('\n🏁 Test execution completed');
      process.exit(results.successRate === 100 ? 0 : 1);
    })
    .catch(error => {
      console.error('💥 Test execution failed:', error);
      process.exit(1);
    });
}

module.exports = { runMediaPersistenceTests };
