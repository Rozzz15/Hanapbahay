/**
 * BROWSER-BASED MEDIA PERSISTENCE TEST
 * Run this in your app's browser console or create a test page
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from './db';
import { loadPropertyMedia } from './media-storage';

const KEY_PREFIX = 'hb_db_';

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
  data?: any;
}

interface TestResults {
  passed: number;
  failed: number;
  total: number;
  details: TestResult[];
}

// Helper to read collection
async function readCollection(name: string): Promise<Record<string, any>> {
  const key = KEY_PREFIX + name;
  const raw = await AsyncStorage.getItem(key);
  return raw ? JSON.parse(raw) : {};
}

// Main test function
export async function testMediaPersistence(): Promise<TestResults> {
  console.log('\n' + '='.repeat(80));
  console.log('  MEDIA PERSISTENCE TEST - STARTED');
  console.log('='.repeat(80) + '\n');
  console.log('ℹ️ Test started at:', new Date().toLocaleString());
  
  const testResults: TestResults = {
    passed: 0,
    failed: 0,
    total: 0,
    details: []
  };
  
  function addTestResult(name: string, passed: boolean, message: string, data?: any) {
    testResults.total++;
    if (passed) {
      testResults.passed++;
      console.log(`✅ ${name}: ${message}`);
    } else {
      testResults.failed++;
      console.error(`❌ ${name}: ${message}`);
    }
    
    testResults.details.push({ name, passed, message, data });
  }
  
  try {
    // STEP 1: Check Database Structure
    console.log('\n📋 STEP 1: Checking Database Structure');
    console.log('-'.repeat(80));
    
    const publishedListings = await readCollection('published_listings');
    const propertyPhotos = await readCollection('property_photos');
    const propertyVideos = await readCollection('property_videos');
    
    const listingsArray = Object.values(publishedListings);
    const photosArray = Object.values(propertyPhotos);
    const videosArray = Object.values(propertyVideos);
    
    console.log(`ℹ️ Found ${listingsArray.length} published listings`);
    console.log(`ℹ️ Found ${photosArray.length} property photos`);
    console.log(`ℹ️ Found ${videosArray.length} property videos`);
    
    addTestResult(
      'Database Structure',
      true,
      'All database collections accessible',
      { listingsCount: listingsArray.length, photosCount: photosArray.length, videosCount: videosArray.length }
    );
    
    if (listingsArray.length === 0) {
      console.warn('⚠️ No listings found in database!');
      console.log('ℹ️ Please create a listing as an owner first, then run this test again.');
      return testResults;
    }
    
    // STEP 2: Verify Media Storage in Published Listings
    console.log('\n📋 STEP 2: Verifying Media in Published Listings Table');
    console.log('-'.repeat(80));
    
    let listingsWithMedia = 0;
    let listingsWithoutMedia = 0;
    const mediaDetails: any[] = [];
    
    for (const listing of listingsArray as any[]) {
      const hasMedia = listing.coverPhoto || 
                      (listing.photos && listing.photos.length > 0) || 
                      (listing.videos && listing.videos.length > 0);
      
      if (hasMedia) {
        listingsWithMedia++;
        const detail = {
          id: listing.id,
          propertyType: listing.propertyType,
          address: listing.address?.substring(0, 50) + '...',
          hasCoverPhoto: !!listing.coverPhoto,
          photosCount: listing.photos?.length || 0,
          videosCount: listing.videos?.length || 0,
          coverPhotoType: listing.coverPhoto?.substring(0, 20) + '...',
          status: 'HAS_MEDIA'
        };
        mediaDetails.push(detail);
        console.log(`✅ ${listing.propertyType}: Cover=${!!listing.coverPhoto}, Photos=${listing.photos?.length || 0}, Videos=${listing.videos?.length || 0}`);
      } else {
        listingsWithoutMedia++;
        mediaDetails.push({
          id: listing.id,
          propertyType: listing.propertyType,
          status: 'NO_MEDIA'
        });
        console.warn(`⚠️ ${listing.propertyType}: NO MEDIA`);
      }
    }
    
    console.log(`\nℹ️ Listings with media: ${listingsWithMedia}`);
    console.log(`ℹ️ Listings without media: ${listingsWithoutMedia}`);
    
    addTestResult(
      'Media in Published Listings',
      listingsWithMedia > 0,
      `${listingsWithMedia}/${listingsArray.length} listings have media`,
      mediaDetails
    );
    
    // STEP 3: Verify Media Storage in Separate Tables
    console.log('\n📋 STEP 3: Verifying Media in Property Photos/Videos Tables');
    console.log('-'.repeat(80));
    
    const photosByListing: Record<string, any[]> = {};
    const videosByListing: Record<string, any[]> = {};
    
    photosArray.forEach((photo: any) => {
      if (!photosByListing[photo.listingId]) {
        photosByListing[photo.listingId] = [];
      }
      photosByListing[photo.listingId].push(photo);
    });
    
    videosArray.forEach((video: any) => {
      if (!videosByListing[video.listingId]) {
        videosByListing[video.listingId] = [];
      }
      videosByListing[video.listingId].push(video);
    });
    
    let syncedListings = 0;
    let unsyncedListings = 0;
    
    for (const listing of listingsArray as any[]) {
      const hasMediaInListing = listing.coverPhoto || 
                               (listing.photos && listing.photos.length > 0) || 
                               (listing.videos && listing.videos.length > 0);
      const hasMediaInTables = photosByListing[listing.id] || videosByListing[listing.id];
      
      if (hasMediaInListing && hasMediaInTables) {
        syncedListings++;
        console.log(`✅ Listing ${listing.id}: Media synced`);
      } else if (hasMediaInListing && !hasMediaInTables) {
        unsyncedListings++;
        console.warn(`⚠️ Listing ${listing.id}: Media in published_listings but NOT in tables`);
      } else if (!hasMediaInListing && hasMediaInTables) {
        unsyncedListings++;
        console.warn(`⚠️ Listing ${listing.id}: Media in tables but NOT in published_listings`);
      }
    }
    
    addTestResult(
      'Media Sync Between Tables',
      unsyncedListings === 0,
      `${syncedListings} synced, ${unsyncedListings} out of sync`,
      { syncedListings, unsyncedListings }
    );
    
    // STEP 4: Test AsyncStorage Persistence
    console.log('\n📋 STEP 4: Testing AsyncStorage Persistence');
    console.log('-'.repeat(80));
    
    let persistedMedia = 0;
    let notPersistedMedia = 0;
    
    for (const listing of listingsArray as any[]) {
      try {
        const mediaKey = `property_media_${listing.id}`;
        const storedMedia = await AsyncStorage.getItem(mediaKey);
        
        if (storedMedia) {
          const media = JSON.parse(storedMedia);
          const hasMedia = !!media.coverPhoto || media.photos.length > 0 || media.videos.length > 0;
          
          if (hasMedia) {
            persistedMedia++;
            console.log(`✅ ${listing.id}: AsyncStorage has media (Cover: ${!!media.coverPhoto}, Photos: ${media.photos.length}, Videos: ${media.videos.length})`);
          }
        } else {
          notPersistedMedia++;
          console.warn(`⚠️ ${listing.id}: No media in AsyncStorage`);
        }
      } catch (error) {
        console.error(`❌ ${listing.id}: Error reading AsyncStorage`);
        notPersistedMedia++;
      }
    }
    
    addTestResult(
      'AsyncStorage Persistence',
      persistedMedia > 0,
      `${persistedMedia} listings with AsyncStorage media, ${notPersistedMedia} without`,
      { persistedMedia, notPersistedMedia }
    );
    
    // STEP 5: Test Media Loading Function
    console.log('\n📋 STEP 5: Testing Media Loading Function');
    console.log('-'.repeat(80));
    
    let successfulLoads = 0;
    let failedLoads = 0;
    
    for (const listing of listingsArray as any[]) {
      try {
        const media = await loadPropertyMedia(listing.id);
        const hasMedia = !!media.coverPhoto || media.photos.length > 0 || media.videos.length > 0;
        
        if (hasMedia) {
          successfulLoads++;
          console.log(`✅ ${listing.id}: loadPropertyMedia() returned media`);
        } else {
          failedLoads++;
          console.warn(`⚠️ ${listing.id}: loadPropertyMedia() returned no media`);
        }
      } catch (error) {
        failedLoads++;
        console.error(`❌ ${listing.id}: loadPropertyMedia() failed - ${error}`);
      }
    }
    
    addTestResult(
      'Media Loading Function',
      successfulLoads > 0,
      `${successfulLoads} successful loads, ${failedLoads} failed`,
      { successfulLoads, failedLoads }
    );
    
    // STEP 6: Verify Owner Visibility
    console.log('\n📋 STEP 6: Verifying Owner Can See Their Media');
    console.log('-'.repeat(80));
    
    const ownerGroups: Record<string, any[]> = {};
    (listingsArray as any[]).forEach(listing => {
      if (!ownerGroups[listing.userId]) {
        ownerGroups[listing.userId] = [];
      }
      ownerGroups[listing.userId].push(listing);
    });
    
    let ownersWithMedia = 0;
    Object.keys(ownerGroups).forEach(ownerId => {
      const ownerListings = ownerGroups[ownerId];
      const listingsWithMediaCount = ownerListings.filter(l => 
        l.coverPhoto || (l.photos && l.photos.length > 0) || (l.videos && l.videos.length > 0)
      ).length;
      
      if (listingsWithMediaCount > 0) {
        ownersWithMedia++;
        console.log(`✅ Owner ${ownerId}: ${listingsWithMediaCount}/${ownerListings.length} listings have media`);
      } else {
        console.warn(`⚠️ Owner ${ownerId}: No media in ${ownerListings.length} listings`);
      }
    });
    
    addTestResult(
      'Owner Media Visibility',
      ownersWithMedia > 0,
      `${ownersWithMedia}/${Object.keys(ownerGroups).length} owners have media`,
      ownerGroups
    );
    
    // STEP 7: Verify Tenant Visibility
    console.log('\n📋 STEP 7: Verifying Tenant Can See Media');
    console.log('-'.repeat(80));
    
    const publishedWithMedia = (listingsArray as any[]).filter(listing => 
      listing.status === 'published' && 
      (listing.coverPhoto || (listing.photos && listing.photos.length > 0) || (listing.videos && listing.videos.length > 0))
    );
    
    const publishedWithoutMedia = (listingsArray as any[]).filter(listing => 
      listing.status === 'published' && 
      !(listing.coverPhoto || (listing.photos && listing.photos.length > 0) || (listing.videos && listing.videos.length > 0))
    );
    
    console.log(`ℹ️ Published with media: ${publishedWithMedia.length}`);
    console.log(`ℹ️ Published without media: ${publishedWithoutMedia.length}`);
    
    publishedWithMedia.forEach(listing => {
      console.log(`✅ ${listing.propertyType} - Media available for tenants`);
    });
    
    publishedWithoutMedia.forEach(listing => {
      console.warn(`⚠️ ${listing.propertyType} - NO media for tenants`);
    });
    
    addTestResult(
      'Tenant Media Visibility',
      publishedWithMedia.length > 0,
      `${publishedWithMedia.length} published listings have media for tenants`,
      { withMedia: publishedWithMedia.length, withoutMedia: publishedWithoutMedia.length }
    );
    
  } catch (error: any) {
    console.error('❌ Test execution failed:', error.message);
    addTestResult('Test Execution', false, error.message);
  }
  
  // FINAL SUMMARY
  console.log('\n' + '='.repeat(80));
  console.log('  TEST SUMMARY');
  console.log('='.repeat(80) + '\n');
  
  const passRate = testResults.total > 0 ? Math.round((testResults.passed / testResults.total) * 100) : 0;
  
  console.log(`ℹ️ Total Tests: ${testResults.total}`);
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`📊 Pass Rate: ${passRate}%`);
  
  if (passRate === 100) {
    console.log('\n🎉 ALL TESTS PASSED! Media persistence is working perfectly!');
  } else if (passRate >= 70) {
    console.log(`\n⚠️ MOSTLY PASSING (${passRate}%) - Some issues need attention`);
  } else {
    console.log(`\n❌ TESTS FAILING (${passRate}%) - Significant issues detected`);
  }
  
  // Recommendations
  console.log('\n' + '='.repeat(80));
  console.log('  RECOMMENDATIONS');
  console.log('='.repeat(80) + '\n');
  
  if (testResults.details.some(t => t.name === 'Media in Published Listings' && !t.passed)) {
    console.warn('⚠️ 1. Some listings have no media - add photos when creating listings');
  }
  
  if (testResults.details.some(t => t.name === 'Media Sync Between Tables' && !t.passed)) {
    console.warn('⚠️ 2. Media not synced - run refreshAllPropertyMedia() on app startup');
  }
  
  if (testResults.details.some(t => t.name === 'AsyncStorage Persistence' && !t.passed)) {
    console.warn('⚠️ 3. Media not in AsyncStorage - check savePropertyMediaToStorage()');
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('  TEST COMPLETED');
  console.log('='.repeat(80));
  console.log('ℹ️ Test completed at:', new Date().toLocaleString());
  console.log('\n');
  
  return testResults;
}

// Expose to window for easy console access
if (typeof window !== 'undefined') {
  (window as any).testMediaPersistence = testMediaPersistence;
}

