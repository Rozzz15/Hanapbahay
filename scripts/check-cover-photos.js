/**
 * Check Cover Photos Script
 * 
 * This script checks what's actually in the database for cover photos
 * and helps debug why they're not showing in the owner listings.
 */

const { db } = require('../utils/db');

async function checkCoverPhotos() {
  console.log('🔍 Checking Cover Photos in Database...');
  console.log('=' .repeat(60));
  
  try {
    // Check published listings
    const publishedListings = await db.list('published_listings');
    console.log(`📋 Published Listings: ${publishedListings.length}`);
    
    if (publishedListings.length === 0) {
      console.log('❌ No published listings found!');
      return;
    }
    
    // Check property photos table
    const propertyPhotos = await db.list('property_photos');
    console.log(`📸 Property Photos in Database: ${propertyPhotos.length}`);
    
    if (propertyPhotos.length === 0) {
      console.log('❌ No property photos in database!');
      console.log('   This means media is not being saved to the database.');
      return;
    }
    
    // Check each listing
    for (const listing of publishedListings) {
      console.log(`\n📋 Listing: ${listing.id}`);
      console.log(`   Property Type: ${listing.propertyType}`);
      console.log(`   Address: ${listing.address?.substring(0, 50)}...`);
      console.log(`   Status: ${listing.status}`);
      
      // Check listing object
      console.log(`   Listing Object:`);
      console.log(`     Cover Photo: ${listing.coverPhoto ? '✅ Yes' : '❌ No'}`);
      console.log(`     Photos: ${listing.photos?.length || 0}`);
      console.log(`     Videos: ${listing.videos?.length || 0}`);
      
      if (listing.coverPhoto) {
        console.log(`     Cover Photo Preview: ${listing.coverPhoto.substring(0, 50)}...`);
      }
      
      // Check database photos
      const listingPhotos = propertyPhotos.filter(photo => photo.listingId === listing.id);
      console.log(`   Database Photos: ${listingPhotos.length}`);
      
      if (listingPhotos.length > 0) {
        const coverPhoto = listingPhotos.find(photo => photo.isCoverPhoto);
        if (coverPhoto) {
          console.log(`     ✅ Cover Photo Found:`);
          console.log(`       ID: ${coverPhoto.id}`);
          console.log(`       Has Photo Data: ${!!coverPhoto.photoData}`);
          console.log(`       Has Photo URI: ${!!coverPhoto.photoUri}`);
          console.log(`       Photo Data Length: ${coverPhoto.photoData?.length || 0}`);
          console.log(`       Photo URI Length: ${coverPhoto.photoUri?.length || 0}`);
          
          if (coverPhoto.photoData) {
            console.log(`       Photo Data Preview: ${coverPhoto.photoData.substring(0, 50)}...`);
          }
          if (coverPhoto.photoUri) {
            console.log(`       Photo URI Preview: ${coverPhoto.photoUri.substring(0, 50)}...`);
          }
        } else {
          console.log(`     ❌ No cover photo found in database`);
        }
        
        // Show all photos for this listing
        listingPhotos.forEach((photo, index) => {
          console.log(`     Photo ${index + 1}: ${photo.isCoverPhoto ? 'COVER' : 'regular'}`);
          console.log(`       ID: ${photo.id}`);
          console.log(`       Has Data: ${!!photo.photoData}`);
          console.log(`       Has URI: ${!!photo.photoUri}`);
        });
      } else {
        console.log(`     ❌ No photos found in database for this listing`);
      }
      
      console.log('   ' + '-'.repeat(40));
    }
    
    // Summary
    console.log('\n📊 Summary:');
    console.log('=' .repeat(60));
    
    const listingsWithPhotos = publishedListings.filter(listing => {
      const listingPhotos = propertyPhotos.filter(photo => photo.listingId === listing.id);
      return listingPhotos.length > 0;
    });
    
    const listingsWithCoverPhotos = publishedListings.filter(listing => {
      const listingPhotos = propertyPhotos.filter(photo => photo.listingId === listing.id);
      const coverPhoto = listingPhotos.find(photo => photo.isCoverPhoto);
      return !!coverPhoto;
    });
    
    console.log(`Total Listings: ${publishedListings.length}`);
    console.log(`Listings with Photos: ${listingsWithPhotos.length}`);
    console.log(`Listings with Cover Photos: ${listingsWithCoverPhotos.length}`);
    console.log(`Cover Photo Coverage: ${((listingsWithCoverPhotos.length / publishedListings.length) * 100).toFixed(1)}%`);
    
    if (listingsWithCoverPhotos.length === 0) {
      console.log('\n❌ ISSUE: No listings have cover photos in database!');
      console.log('   Possible causes:');
      console.log('   1. Media is not being saved to database when creating listings');
      console.log('   2. Cover photo flag (isCoverPhoto) is not being set');
      console.log('   3. Media is being saved but not marked as cover photo');
    } else {
      console.log('\n✅ Some listings have cover photos in database');
      console.log('   The issue might be in the loading/display logic');
    }
    
  } catch (error) {
    console.error('❌ Error checking cover photos:', error);
  }
}

// Run the script if called directly
if (require.main === module) {
  checkCoverPhotos()
    .then(() => {
      console.log('\n✅ Check completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Check failed:', error);
      process.exit(1);
    });
}

module.exports = {
  checkCoverPhotos
};