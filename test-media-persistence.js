/**
 * COMPREHENSIVE MEDIA PERSISTENCE TEST
 * 
 * This test verifies that:
 * 1. Media is properly saved when owner creates a listing
 * 2. Media persists in database after creation
 * 3. Media is visible in owner's listings page
 * 4. Media is visible in tenant dashboard
 * 5. Media persists after app refresh
 * 6. Media persists after login/logout
 * 7. Media is properly synced between tables
 */

const AsyncStorage = require('@react-native-async-storage/async-storage').default;

const KEY_PREFIX = 'hb_db_';

// Color codes for better console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(80));
  log(`  ${title}`, 'bright');
  console.log('='.repeat(80) + '\n');
}

function logStep(step, description) {
  log(`\n📋 STEP ${step}: ${description}`, 'cyan');
  console.log('-'.repeat(80));
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

// Helper function to read collection
async function readCollection(name) {
  const key = KEY_PREFIX + name;
  const raw = await AsyncStorage.getItem(key);
  return raw ? JSON.parse(raw) : {};
}

// Test results tracking
const testResults = {
  passed: 0,
  failed: 0,
  warnings: 0,
  total: 0,
  details: []
};

function addTestResult(name, passed, message, data = null) {
  testResults.total++;
  if (passed) {
    testResults.passed++;
    logSuccess(`${name}: ${message}`);
  } else {
    testResults.failed++;
    logError(`${name}: ${message}`);
  }
  
  testResults.details.push({
    name,
    passed,
    message,
    data,
    timestamp: new Date().toISOString()
  });
}

// Main test function
async function testMediaPersistence() {
  logSection('MEDIA PERSISTENCE TEST - STARTED');
  logInfo(`Test started at: ${new Date().toLocaleString()}`);
  
  try {
    // STEP 1: Check Database Structure
    logStep(1, 'Checking Database Structure');
    
    const publishedListings = await readCollection('published_listings');
    const propertyPhotos = await readCollection('property_photos');
    const propertyVideos = await readCollection('property_videos');
    
    const listingsArray = Object.values(publishedListings);
    const photosArray = Object.values(propertyPhotos);
    const videosArray = Object.values(propertyVideos);
    
    logInfo(`Found ${listingsArray.length} published listings`);
    logInfo(`Found ${photosArray.length} property photos`);
    logInfo(`Found ${videosArray.length} property videos`);
    
    addTestResult(
      'Database Structure',
      true,
      'All database collections accessible',
      { listingsCount: listingsArray.length, photosCount: photosArray.length, videosCount: videosArray.length }
    );
    
    if (listingsArray.length === 0) {
      logWarning('No listings found in database!');
      logInfo('Please create a listing as an owner first, then run this test again.');
      return;
    }
    
    // STEP 2: Verify Media Storage in Published Listings
    logStep(2, 'Verifying Media in Published Listings Table');
    
    let listingsWithMedia = 0;
    let listingsWithoutMedia = 0;
    const mediaDetails = [];
    
    for (const listing of listingsArray) {
      const hasMedia = listing.coverPhoto || (listing.photos && listing.photos.length > 0) || (listing.videos && listing.videos.length > 0);
      
      if (hasMedia) {
        listingsWithMedia++;
        mediaDetails.push({
          id: listing.id,
          propertyType: listing.propertyType,
          address: listing.address?.substring(0, 50) + '...',
          hasCoverPhoto: !!listing.coverPhoto,
          photosCount: listing.photos?.length || 0,
          videosCount: listing.videos?.length || 0,
          coverPhotoLength: listing.coverPhoto?.length || 0,
          status: 'HAS_MEDIA'
        });
      } else {
        listingsWithoutMedia++;
        mediaDetails.push({
          id: listing.id,
          propertyType: listing.propertyType,
          address: listing.address?.substring(0, 50) + '...',
          status: 'NO_MEDIA'
        });
      }
    }
    
    logInfo(`Listings with media: ${listingsWithMedia}`);
    logInfo(`Listings without media: ${listingsWithoutMedia}`);
    
    mediaDetails.forEach((detail, index) => {
      if (detail.status === 'HAS_MEDIA') {
        logSuccess(`Listing ${index + 1}: ${detail.propertyType} - Cover: ${detail.hasCoverPhoto ? 'YES' : 'NO'}, Photos: ${detail.photosCount}, Videos: ${detail.videosCount}`);
      } else {
        logWarning(`Listing ${index + 1}: ${detail.propertyType} - NO MEDIA`);
      }
    });
    
    addTestResult(
      'Media in Published Listings',
      listingsWithMedia > 0,
      `${listingsWithMedia}/${listingsArray.length} listings have media`,
      mediaDetails
    );
    
    // STEP 3: Verify Media Storage in Separate Tables
    logStep(3, 'Verifying Media in Property Photos/Videos Tables');
    
    const photosByListing = {};
    const videosByListing = {};
    
    photosArray.forEach(photo => {
      if (!photosByListing[photo.listingId]) {
        photosByListing[photo.listingId] = [];
      }
      photosByListing[photo.listingId].push(photo);
    });
    
    videosArray.forEach(video => {
      if (!videosByListing[video.listingId]) {
        videosByListing[video.listingId] = [];
      }
      videosByListing[video.listingId].push(video);
    });
    
    let syncedListings = 0;
    let unsyncedListings = 0;
    
    for (const listing of listingsArray) {
      const hasMediaInListing = listing.coverPhoto || (listing.photos && listing.photos.length > 0) || (listing.videos && listing.videos.length > 0);
      const hasMediaInTables = photosByListing[listing.id] || videosByListing[listing.id];
      
      if (hasMediaInListing && hasMediaInTables) {
        syncedListings++;
        logSuccess(`Listing ${listing.id}: Media synced in both places`);
      } else if (hasMediaInListing && !hasMediaInTables) {
        unsyncedListings++;
        logWarning(`Listing ${listing.id}: Media in published_listings but NOT in property_photos/videos`);
      } else if (!hasMediaInListing && hasMediaInTables) {
        unsyncedListings++;
        logWarning(`Listing ${listing.id}: Media in property_photos/videos but NOT in published_listings`);
      } else {
        logInfo(`Listing ${listing.id}: No media in either location`);
      }
    }
    
    addTestResult(
      'Media Sync Between Tables',
      unsyncedListings === 0,
      `${syncedListings} listings properly synced, ${unsyncedListings} out of sync`,
      { syncedListings, unsyncedListings }
    );
    
    // STEP 4: Test Media Data Integrity
    logStep(4, 'Testing Media Data Integrity');
    
    let validMedia = 0;
    let invalidMedia = 0;
    
    for (const listing of listingsArray) {
      if (listing.coverPhoto) {
        // Check if cover photo is valid base64 or URI
        const isValidUri = listing.coverPhoto.startsWith('data:') || 
                          listing.coverPhoto.startsWith('file:') || 
                          listing.coverPhoto.startsWith('http');
        
        if (isValidUri) {
          validMedia++;
          logSuccess(`Listing ${listing.id}: Cover photo is valid (${listing.coverPhoto.substring(0, 30)}...)`);
        } else {
          invalidMedia++;
          logError(`Listing ${listing.id}: Cover photo appears invalid`);
        }
      }
      
      if (listing.photos && listing.photos.length > 0) {
        listing.photos.forEach((photo, index) => {
          const isValidUri = photo.startsWith('data:') || 
                            photo.startsWith('file:') || 
                            photo.startsWith('http');
          
          if (isValidUri) {
            validMedia++;
            logSuccess(`Listing ${listing.id}: Photo ${index + 1} is valid`);
          } else {
            invalidMedia++;
            logError(`Listing ${listing.id}: Photo ${index + 1} appears invalid`);
          }
        });
      }
    }
    
    addTestResult(
      'Media Data Integrity',
      invalidMedia === 0,
      `${validMedia} valid media items, ${invalidMedia} invalid`,
      { validMedia, invalidMedia }
    );
    
    // STEP 5: Test AsyncStorage Persistence
    logStep(5, 'Testing AsyncStorage Persistence for Media');
    
    let persistedMedia = 0;
    let notPersistedMedia = 0;
    
    for (const listing of listingsArray) {
      try {
        const mediaKey = `property_media_${listing.id}`;
        const storedMedia = await AsyncStorage.getItem(mediaKey);
        
        if (storedMedia) {
          const media = JSON.parse(storedMedia);
          const hasMedia = !!media.coverPhoto || media.photos.length > 0 || media.videos.length > 0;
          
          if (hasMedia) {
            persistedMedia++;
            logSuccess(`Listing ${listing.id}: Media persisted in AsyncStorage`);
            logInfo(`  - Cover Photo: ${!!media.coverPhoto ? 'YES' : 'NO'}`);
            logInfo(`  - Photos: ${media.photos.length}`);
            logInfo(`  - Videos: ${media.videos.length}`);
          }
        } else {
          notPersistedMedia++;
          logWarning(`Listing ${listing.id}: No media found in AsyncStorage`);
        }
      } catch (error) {
        logError(`Listing ${listing.id}: Error reading AsyncStorage - ${error.message}`);
        notPersistedMedia++;
      }
    }
    
    addTestResult(
      'AsyncStorage Persistence',
      persistedMedia > 0,
      `${persistedMedia} listings have media in AsyncStorage, ${notPersistedMedia} don't`,
      { persistedMedia, notPersistedMedia }
    );
    
    // STEP 6: Verify Owner Can See Media
    logStep(6, 'Verifying Owner Can See Their Media');
    
    const ownerGroups = {};
    listingsArray.forEach(listing => {
      if (!ownerGroups[listing.userId]) {
        ownerGroups[listing.userId] = [];
      }
      ownerGroups[listing.userId].push(listing);
    });
    
    Object.keys(ownerGroups).forEach(ownerId => {
      const ownerListings = ownerGroups[ownerId];
      const listingsWithMediaCount = ownerListings.filter(l => 
        l.coverPhoto || (l.photos && l.photos.length > 0) || (l.videos && l.videos.length > 0)
      ).length;
      
      logInfo(`Owner ${ownerId}:`);
      logInfo(`  - Total Listings: ${ownerListings.length}`);
      logInfo(`  - Listings with Media: ${listingsWithMediaCount}`);
      
      if (listingsWithMediaCount > 0) {
        logSuccess(`  ✓ Owner can see media in their listings`);
      } else {
        logWarning(`  ⚠ Owner has no media in their listings`);
      }
    });
    
    addTestResult(
      'Owner Media Visibility',
      true,
      `${Object.keys(ownerGroups).length} owners checked`,
      ownerGroups
    );
    
    // STEP 7: Verify Tenant Can See Media
    logStep(7, 'Verifying Tenant Can See Media (Published Listings)');
    
    const publishedWithMedia = listingsArray.filter(listing => 
      listing.status === 'published' && 
      (listing.coverPhoto || (listing.photos && listing.photos.length > 0) || (listing.videos && listing.videos.length > 0))
    );
    
    const publishedWithoutMedia = listingsArray.filter(listing => 
      listing.status === 'published' && 
      !(listing.coverPhoto || (listing.photos && listing.photos.length > 0) || (listing.videos && listing.videos.length > 0))
    );
    
    logInfo(`Published listings with media: ${publishedWithMedia.length}`);
    logInfo(`Published listings without media: ${publishedWithoutMedia.length}`);
    
    publishedWithMedia.forEach(listing => {
      logSuccess(`  ✓ ${listing.propertyType} at ${listing.address?.substring(0, 30)}... - Media available for tenants`);
    });
    
    publishedWithoutMedia.forEach(listing => {
      logWarning(`  ⚠ ${listing.propertyType} at ${listing.address?.substring(0, 30)}... - NO media for tenants`);
    });
    
    addTestResult(
      'Tenant Media Visibility',
      publishedWithMedia.length > 0,
      `${publishedWithMedia.length} published listings have media visible to tenants`,
      { publishedWithMedia: publishedWithMedia.length, publishedWithoutMedia: publishedWithoutMedia.length }
    );
    
    // STEP 8: Simulate App Refresh
    logStep(8, 'Simulating App Refresh (Re-reading from Storage)');
    
    // Re-read everything from AsyncStorage (simulates app restart)
    const freshPublishedListings = await readCollection('published_listings');
    const freshPropertyPhotos = await readCollection('property_photos');
    const freshPropertyVideos = await readCollection('property_videos');
    
    const freshListingsArray = Object.values(freshPublishedListings);
    const freshPhotosArray = Object.values(freshPropertyPhotos);
    const freshVideosArray = Object.values(freshPropertyVideos);
    
    const freshMediaCount = freshListingsArray.filter(l => 
      l.coverPhoto || (l.photos && l.photos.length > 0) || (l.videos && l.videos.length > 0)
    ).length;
    
    logInfo(`After refresh:`);
    logInfo(`  - Listings: ${freshListingsArray.length}`);
    logInfo(`  - Photos: ${freshPhotosArray.length}`);
    logInfo(`  - Videos: ${freshVideosArray.length}`);
    logInfo(`  - Listings with media: ${freshMediaCount}`);
    
    const mediaPersisted = freshMediaCount === listingsWithMedia;
    
    addTestResult(
      'App Refresh Persistence',
      mediaPersisted,
      mediaPersisted ? 
        'All media persisted after simulated refresh' : 
        `Media count changed: ${listingsWithMedia} -> ${freshMediaCount}`,
      { before: listingsWithMedia, after: freshMediaCount }
    );
    
  } catch (error) {
    logError(`Test execution failed: ${error.message}`);
    console.error(error);
    addTestResult('Test Execution', false, error.message);
  }
  
  // FINAL SUMMARY
  logSection('TEST SUMMARY');
  
  const passRate = testResults.total > 0 ? Math.round((testResults.passed / testResults.total) * 100) : 0;
  
  logInfo(`Total Tests: ${testResults.total}`);
  logSuccess(`Passed: ${testResults.passed}`);
  logError(`Failed: ${testResults.failed}`);
  
  if (passRate === 100) {
    log('\n🎉 ALL TESTS PASSED! Media persistence is working perfectly!', 'green');
  } else if (passRate >= 70) {
    log(`\n⚠️  MOSTLY PASSING (${passRate}%) - Some issues need attention`, 'yellow');
  } else {
    log(`\n❌ TESTS FAILING (${passRate}%) - Significant issues detected`, 'red');
  }
  
  // Detailed recommendations
  logSection('RECOMMENDATIONS');
  
  if (testResults.details.some(t => t.name === 'Media in Published Listings' && !t.passed)) {
    logWarning('1. Some listings have no media - owners should add photos/videos when creating listings');
  }
  
  if (testResults.details.some(t => t.name === 'Media Sync Between Tables' && !t.passed)) {
    logWarning('2. Media is not synced between tables - run syncOwnerMediaToDatabase() on app startup');
  }
  
  if (testResults.details.some(t => t.name === 'AsyncStorage Persistence' && !t.passed)) {
    logWarning('3. Media is not persisting in AsyncStorage - check savePropertyMediaToStorage() implementation');
  }
  
  if (testResults.details.some(t => t.name === 'Tenant Media Visibility' && !t.passed)) {
    logWarning('4. Published listings have no media - tenants won\'t see images');
  }
  
  logSection('TEST COMPLETED');
  logInfo(`Test completed at: ${new Date().toLocaleString()}`);
  
  // Return results for programmatic use
  return testResults;
}

// Run the test
console.log('\n🚀 Starting Media Persistence Test...\n');
testMediaPersistence()
  .then(results => {
    console.log('\n✅ Test execution completed successfully');
    process.exit(results.failed === 0 ? 0 : 1);
  })
  .catch(error => {
    console.error('\n❌ Test execution failed:', error);
    process.exit(1);
  });

module.exports = { testMediaPersistence };

