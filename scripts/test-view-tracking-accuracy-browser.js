/**
 * View Tracking Accuracy Test (Browser-based)
 * Run this in the browser console to test view tracking
 */

console.log('🧪 View Tracking Accuracy Test');
console.log('='.repeat(80));

// Test function that can be called from browser console
window.testViewTracking = async function() {
  console.log('\n📊 Starting View Tracking Tests...\n');
  
  try {
    // Import required modules
    const { db } = await import('../utils/db.ts');
    const { trackListingView, incrementListingViews, getListingViews } = await import('../utils/view-tracking.ts');
    
    console.log('✅ Modules loaded successfully\n');
    
    // Test 1: Get all listings and their view counts
    console.log('📊 Test 1: Getting all listings and their view counts...');
    console.log('-'.repeat(80));
    
    const allListings = await db.list('published_listings');
    console.log(`✅ Found ${allListings.length} published listings\n`);
    
    if (allListings.length === 0) {
      console.log('⚠️  No listings found. Create some listings first.');
      return;
    }
    
    // Calculate total views
    let totalViews = 0;
    const listingDetails = [];
    
    for (const listing of allListings) {
      const views = listing.views || 0;
      totalViews += views;
      
      listingDetails.push({
        id: listing.id,
        propertyType: listing.propertyType,
        address: listing.address?.substring(0, 30) || 'N/A',
        views: views,
        ownerId: listing.userId
      });
    }
    
    console.log('\n📊 View Count Summary:');
    console.log(`   Total Listings: ${allListings.length}`);
    console.log(`   Total Views (Sum): ${totalViews}`);
    console.log(`   Average Views per Listing: ${(totalViews / allListings.length).toFixed(2)}`);
    
    // Show listings sorted by view count
    const sortedListings = listingDetails.sort((a, b) => b.views - a.views);
    
    console.log('\n📋 Listings (sorted by view count):');
    sortedListings.slice(0, 10).forEach((listing, index) => {
      console.log(`   ${index + 1}. ${listing.propertyType} - ${listing.views} views`);
      console.log(`      Address: ${listing.address}`);
      console.log(`      ID: ${listing.id}`);
    });
    
    if (allListings.length > 10) {
      console.log(`   ... and ${allListings.length - 10} more listings`);
    }
    
    // Test 2: Test view increment functionality
    console.log('\n\n📊 Test 2: Testing view increment functionality...');
    console.log('-'.repeat(80));
    
    if (allListings.length > 0) {
      const testListing = allListings[0];
      console.log(`\nTesting with listing: ${testListing.propertyType} (${testListing.id})`);
      console.log(`Initial view count: ${testListing.views || 0}`);
      
      const beforeIncrement = await getListingViews(testListing.id);
      console.log(`Views before increment: ${beforeIncrement}`);
      
      // Increment views
      const incrementResult = await incrementListingViews(testListing.id);
      
      if (incrementResult.success) {
        console.log(`✅ Increment successful: ${incrementResult.message}`);
        console.log(`New view count: ${incrementResult.newViewCount}`);
        
        // Verify
        const afterIncrement = await getListingViews(testListing.id);
        console.log(`Views after increment (verified): ${afterIncrement}`);
        
        if (afterIncrement === incrementResult.newViewCount && afterIncrement === beforeIncrement + 1) {
          console.log('✅ View increment verified: Database matches expected value');
          
          // Restore original count
          const restoreListing = {
            ...testListing,
            views: beforeIncrement,
            updatedAt: testListing.updatedAt
          };
          await db.upsert('published_listings', testListing.id, restoreListing);
          console.log(`🔄 Restored original view count: ${beforeIncrement}`);
        } else {
          console.log('❌ View increment verification failed!');
          console.log(`Expected: ${beforeIncrement + 1}, Got: ${afterIncrement}`);
        }
      } else {
        console.log(`❌ Increment failed: ${incrementResult.message}`);
      }
    }
    
    // Test 3: Test owner view blocking
    console.log('\n\n📊 Test 3: Testing owner view blocking...');
    console.log('-'.repeat(80));
    
    if (allListings.length > 0) {
      const ownerListing = allListings.find(l => l.userId);
      if (ownerListing) {
        console.log(`\nTesting with listing owned by: ${ownerListing.userId}`);
        
        const beforeOwnerView = await getListingViews(ownerListing.id);
        console.log(`View count before owner viewing own listing: ${beforeOwnerView}`);
        
        // Simulate owner viewing their own listing
        const ownerViewResult = await trackListingView(ownerListing.id, ownerListing.userId, {
          isOwnerView: true
        });
        
        console.log(`Tracking result: ${ownerViewResult.message}`);
        
        const afterOwnerView = await getListingViews(ownerListing.id);
        console.log(`View count after owner viewing own listing: ${afterOwnerView}`);
        
        if (afterOwnerView === beforeOwnerView) {
          console.log('✅ Owner view blocking: PASSED - View count unchanged');
        } else {
          console.log('❌ Owner view blocking: FAILED - View count changed');
          console.log(`Expected: ${beforeOwnerView}, Got: ${afterOwnerView}`);
        }
      }
    }
    
    // Test 4: Test tenant view tracking
    console.log('\n\n📊 Test 4: Testing tenant view tracking...');
    console.log('-'.repeat(80));
    
    if (allListings.length > 0) {
      const testListing = allListings[0];
      const tenantId = `tenant_test_${Date.now()}`;
      
      const beforeTenantView = await getListingViews(testListing.id);
      console.log(`View count before tenant view: ${beforeTenantView}`);
      
      // Simulate tenant viewing the listing
      const tenantViewResult = await trackListingView(testListing.id, tenantId, {
        isOwnerView: false,
        source: 'test_script'
      });
      
      console.log(`Tracking result: ${tenantViewResult.message}`);
      
      const afterTenantView = await getListingViews(testListing.id);
      console.log(`View count after tenant view: ${afterTenantView}`);
      
      if (afterTenantView === beforeTenantView + 1) {
        console.log('✅ Tenant view tracking: PASSED - View count incremented by 1');
        
        // Restore
        const restoreListing = {
          ...testListing,
          views: beforeTenantView,
          updatedAt: testListing.updatedAt
        };
        await db.upsert('published_listings', testListing.id, restoreListing);
        console.log(`🔄 Restored original view count: ${beforeTenantView}`);
      } else {
        console.log('❌ Tenant view tracking: FAILED');
        console.log(`Expected: ${beforeTenantView + 1}, Got: ${afterTenantView}`);
      }
    }
    
    // Summary
    console.log('\n\n📈 Summary Report:');
    console.log('='.repeat(80));
    console.log(`Total Listings: ${allListings.length}`);
    console.log(`Total Views Across All Listings: ${totalViews}`);
    console.log(`Average Views per Listing: ${(totalViews / allListings.length).toFixed(2)}`);
    console.log(`Highest View Count: ${sortedListings[0]?.views || 0}`);
    console.log(`Lowest View Count: ${sortedListings[sortedListings.length - 1]?.views || 0}`);
    console.log(`Listings with Views: ${listingDetails.filter(l => l.views > 0).length}`);
    console.log(`Listings with Zero Views: ${listingDetails.filter(l => l.views === 0).length}`);
    
    console.log('\n✅ View tracking test completed successfully!\n');
    
    return {
      totalListings: allListings.length,
      totalViews: totalViews,
      averageViews: (totalViews / allListings.length).toFixed(2),
      listingDetails: listingDetails
    };
    
  } catch (error) {
    console.error('❌ Test Error:', error);
    console.error(error.stack);
    return null;
  }
};

console.log('✅ Test function loaded. Run testViewTracking() in console to start testing.');

