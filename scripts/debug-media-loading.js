/**
 * Debug Media Loading Script
 * 
 * This script can be run in the browser console to debug media loading issues.
 * It checks what's in the database and tests the media loading functions.
 */

// This script is designed to be run in the browser console
// Copy and paste this code into the browser console when on the owner listings page

window.debugMediaLoading = async function() {
  console.log('🔍 Debugging Media Loading...');
  console.log('=' .repeat(60));
  
  try {
    // Check if we're in the right context
    if (typeof window === 'undefined' || !window.ReactNativeWebView) {
      console.log('❌ This script must be run in the browser console');
      return;
    }
    
    // Get the database instance
    const { db } = await import('../utils/db');
    
    // Check published listings
    const publishedListings = await db.list('published_listings');
    console.log(`📋 Published Listings: ${publishedListings.length}`);
    
    if (publishedListings.length === 0) {
      console.log('❌ No published listings found!');
      return;
    }
    
    // Check property photos
    const propertyPhotos = await db.list('property_photos');
    console.log(`📸 Property Photos: ${propertyPhotos.length}`);
    
    // Check each listing
    for (const listing of publishedListings) {
      console.log(`\n📋 Listing: ${listing.id}`);
      console.log(`   Property Type: ${listing.propertyType}`);
      console.log(`   Address: ${listing.address?.substring(0, 50)}...`);
      
      // Check listing object media
      console.log(`   Listing Object Media:`);
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
      } else {
        console.log(`     ❌ No photos found in database for this listing`);
      }
      
      // Test loadPropertyMedia function
      try {
        const { loadPropertyMedia } = await import('../utils/media-storage');
        const media = await loadPropertyMedia(listing.id);
        
        console.log(`   loadPropertyMedia Result:`);
        console.log(`     Cover Photo: ${media.coverPhoto ? '✅ Yes' : '❌ No'}`);
        console.log(`     Photos: ${media.photos.length}`);
        console.log(`     Videos: ${media.videos.length}`);
        
        if (media.coverPhoto) {
          console.log(`     Cover Photo Preview: ${media.coverPhoto.substring(0, 50)}...`);
        }
      } catch (mediaError) {
        console.log(`     ❌ Error loading media: ${mediaError.message}`);
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
      console.log('   This means media is not being saved to the database properly.');
    } else {
      console.log('\n✅ Some listings have cover photos in database');
      console.log('   The issue might be in the loading/display logic');
    }
    
  } catch (error) {
    console.error('❌ Error debugging media loading:', error);
  }
};

console.log('🔧 Debug function loaded! Run debugMediaLoading() in the console to debug media loading issues.');
