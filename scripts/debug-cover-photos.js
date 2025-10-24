/**
 * Debug Cover Photos Script
 * 
 * This script helps debug why cover photos are not showing in listing cards.
 * It checks the database for media and provides detailed logging.
 */

const { db } = require('../utils/db');
const { loadPropertyMedia } = require('../utils/media-storage');

async function debugCoverPhotos() {
  console.log('🔍 Debugging Cover Photos...');
  console.log('=' .repeat(60));
  
  try {
    // Get all published listings
    const publishedListings = await db.list('published_listings');
    console.log(`📋 Found ${publishedListings.length} published listings`);
    
    if (publishedListings.length === 0) {
      console.log('❌ No published listings found!');
      return;
    }
    
    // Check each listing's media
    for (const listing of publishedListings) {
      console.log(`\n📸 Checking listing: ${listing.id}`);
      console.log(`   Property Type: ${listing.propertyType}`);
      console.log(`   Address: ${listing.address?.substring(0, 50)}...`);
      console.log(`   Status: ${listing.status}`);
      
      // Check listing object media
      console.log(`   Listing Object Media:`);
      console.log(`     Cover Photo: ${listing.coverPhoto ? '✅ Yes' : '❌ No'}`);
      console.log(`     Photos Count: ${listing.photos?.length || 0}`);
      console.log(`     Videos Count: ${listing.videos?.length || 0}`);
      
      if (listing.coverPhoto) {
        console.log(`     Cover Photo Preview: ${listing.coverPhoto.substring(0, 50)}...`);
      }
      
      // Check database media tables
      try {
        const media = await loadPropertyMedia(listing.id);
        console.log(`   Database Media:`);
        console.log(`     Cover Photo: ${media.coverPhoto ? '✅ Yes' : '❌ No'}`);
        console.log(`     Photos Count: ${media.photos.length}`);
        console.log(`     Videos Count: ${media.videos.length}`);
        
        if (media.coverPhoto) {
          console.log(`     Cover Photo Preview: ${media.coverPhoto.substring(0, 50)}...`);
        }
        
        // Check if media is valid
        if (media.coverPhoto && media.coverPhoto.startsWith('data:image/')) {
          console.log(`     ✅ Cover photo is valid base64 data`);
        } else if (media.coverPhoto && media.coverPhoto.startsWith('http')) {
          console.log(`     ✅ Cover photo is valid URL`);
        } else if (media.coverPhoto) {
          console.log(`     ⚠️ Cover photo format unknown: ${media.coverPhoto.substring(0, 20)}...`);
        }
        
      } catch (mediaError) {
        console.log(`   ❌ Error loading media: ${mediaError.message}`);
      }
      
      // Check property_photos table directly
      const photos = await db.list('property_photos');
      const listingPhotos = photos.filter(photo => photo.listingId === listing.id);
      console.log(`   Property Photos Table: ${listingPhotos.length} records`);
      
      if (listingPhotos.length > 0) {
        const coverPhoto = listingPhotos.find(photo => photo.isCoverPhoto);
        if (coverPhoto) {
          console.log(`     ✅ Cover photo found in table: ${coverPhoto.id}`);
          console.log(`     Cover Photo Data: ${coverPhoto.photoData ? '✅ Yes' : '❌ No'}`);
          console.log(`     Cover Photo URI: ${coverPhoto.photoUri ? '✅ Yes' : '❌ No'}`);
        } else {
          console.log(`     ❌ No cover photo found in table`);
        }
      }
      
      console.log('   ' + '-'.repeat(40));
    }
    
    // Summary
    console.log('\n📊 Summary:');
    console.log('=' .repeat(60));
    
    const listingsWithCoverPhotos = publishedListings.filter(listing => 
      listing.coverPhoto || (listing.photos && listing.photos.length > 0)
    );
    
    console.log(`Total Listings: ${publishedListings.length}`);
    console.log(`Listings with Media: ${listingsWithCoverPhotos.length}`);
    console.log(`Coverage: ${((listingsWithCoverPhotos.length / publishedListings.length) * 100).toFixed(1)}%`);
    
    if (listingsWithCoverPhotos.length === 0) {
      console.log('\n❌ ISSUE: No listings have cover photos!');
      console.log('   This means:');
      console.log('   1. Owners haven\'t uploaded photos yet');
      console.log('   2. Media isn\'t being saved properly');
      console.log('   3. Media loading is failing');
    } else {
      console.log('\n✅ Some listings have media - check individual listings above for details');
    }
    
  } catch (error) {
    console.error('❌ Error debugging cover photos:', error);
  }
}

// Run the script if called directly
if (require.main === module) {
  debugCoverPhotos()
    .then(() => {
      console.log('\n✅ Debug completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Debug failed:', error);
      process.exit(1);
    });
}

module.exports = {
  debugCoverPhotos
};