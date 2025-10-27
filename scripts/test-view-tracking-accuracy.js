/**
 * Test script to verify view tracking accuracy
 * Tests:
 * 1. Total views across all listings
 * 2. Per-listing view counts
 * 3. Owner views are not counted
 * 4. Tenant views are properly counted
 */

const { execSync } = require('child_process');
const path = require('path');

// Navigate to project root
process.chdir(path.resolve(__dirname, '..'));

console.log('🧪 Testing View Tracking Accuracy\n');
console.log('=' .repeat(80));

async function testViewTracking() {
  try {
    console.log('\n📊 Test 1: Checking View Count Accuracy');
    console.log('-'.repeat(80));
    
    // Import required modules
    const { db } = await import('../utils/db.ts');
    const { trackListingView, incrementListingViews, getListingViews } = await import('../utils/view-tracking.ts');
    
    // Get all published listings
    console.log('\n1️⃣ Getting all published listings...');
    const allListings = await db.list('published_listings');
    console.log(`✅ Found ${allListings.length} published listings`);
    
    if (allListings.length === 0) {
      console.log('⚠️  No listings found. Create some listings first to test view tracking.');
      return;
    }
    
    // Test each listing's view count
    console.log('\n2️⃣ Checking view counts for each listing...');
    let totalViewsFromDashboard = 0;
    let listingsWithViews = 0;
    let listingsWithZeroViews = 0;
    
    const listingViewDetails = [];
    
    for (const listing of allListings) {
      const currentViews = listing.views || 0;
      totalViewsFromDashboard += currentViews;
      
      if (currentViews > 0) {
        listingsWithViews++;
      } else {
        listingsWithZeroViews++;
      }
      
      listingViewDetails.push({
        id: listing.id,
        propertyType: listing.propertyType,
        address: listing.address,
        views: currentViews,
        ownerId: listing.userId
      });
    }
    
    console.log(`\n📊 View Count Summary:`);
    console.log(`   - Total Listings: ${allListings.length}`);
    console.log(`   - Listings with views: ${listingsWithViews}`);
    console.log(`   - Listings with zero views: ${listingsWithZeroViews}`);
    console.log(`   - Total Views (sum of all listings): ${totalViewsFromDashboard}`);
    
    // Test incrementing views
    console.log('\n3️⃣ Testing view increment functionality...');
    
    if (allListings.length > 0) {
      const testListing = allListings[0];
      const listingId = testListing.id;
      const initialViews = testListing.views || 0;
      
      console.log(`\n   Testing with listing: ${testListing.propertyType} (${listingId})`);
      console.log(`   Initial view count: ${initialViews}`);
      
      // Test increment
      const incrementResult = await incrementListingViews(listingId);
      
      if (incrementResult.success) {
        console.log(`   ✅ View increment successful: ${initialViews} → ${incrementResult.newViewCount}`);
        
        // Verify the increment
        const verifyResult = await getListingViews(listingId);
        console.log(`   Verification view count: ${verifyResult}`);
        
        if (verifyResult === incrementResult.newViewCount) {
          console.log(`   ✅ View count verified: Database matches increment result`);
        } else {
          console.log(`   ❌ View count mismatch! Database: ${verifyResult}, Expected: ${incrementResult.newViewCount}`);
        }
      } else {
        console.log(`   ❌ View increment failed: ${incrementResult.message}`);
      }
    }
    
    // Test owner view blocking
    console.log('\n4️⃣ Testing owner view blocking...');
    
    if (allListings.length > 0) {
      const testListing = allListings[0];
      const ownerId = testListing.userId;
      const listingId = testListing.id;
      const beforeOwnerView = testListing.views || 0;
      
      console.log(`\n   Testing with listing owned by: ${ownerId}`);
      console.log(`   View count before owner view: ${beforeOwnerView}`);
      
      // Simulate owner viewing their own listing
      const ownerViewResult = await trackListingView(listingId, ownerId, {
        isOwnerView: true
      });
      
      console.log(`   Result: ${ownerViewResult.message}`);
      
      // Get current views
      const afterOwnerView = await getListingViews(listingId);
      console.log(`   View count after owner view: ${afterOwnerView}`);
      
      if (afterOwnerView === beforeOwnerView) {
        console.log(`   ✅ Owner view blocked correctly - view count unchanged`);
      } else {
        console.log(`   ❌ Owner view should not have incremented count!`);
      }
    }
    
    // Test tenant view tracking
    console.log('\n5️⃣ Testing tenant view tracking...');
    
    if (allListings.length > 0) {
      const testListing = allListings[0];
      const listingId = testListing.id;
      const tenantId = 'tenant_test_123'; // Fake tenant ID for testing
      
      const beforeTenantView = await getListingViews(listingId);
      console.log(`   View count before tenant view: ${beforeTenantView}`);
      
      // Simulate tenant viewing the listing
      const tenantViewResult = await trackListingView(listingId, tenantId, {
        isOwnerView: false,
        source: 'test_script'
      });
      
      console.log(`   Result: ${tenantViewResult.message}`);
      
      // Get current views
      const afterTenantView = await getListingViews(listingId);
      console.log(`   View count after tenant view: ${afterTenantView}`);
      
      if (afterTenantView === beforeTenantView + 1) {
        console.log(`   ✅ Tenant view tracked correctly - view count incremented by 1`);
      } else {
        console.log(`   ❌ Tenant view should have incremented count! Expected: ${beforeTenantView + 1}, Got: ${afterTenantView}`);
      }
    }
    
    // Detailed listing report
    console.log('\n6️⃣ Detailed View Report by Listing:');
    console.log('-'.repeat(80));
    
    const sortedListings = listingViewDetails.sort((a, b) => b.views - a.views);
    
    sortedListings.forEach((listing, index) => {
      console.log(`\n   Listing ${index + 1}:`);
      console.log(`   - Property: ${listing.propertyType}`);
      console.log(`   - Address: ${listing.address}`);
      console.log(`   - Views: ${listing.views}`);
      console.log(`   - Owner ID: ${listing.ownerId}`);
    });
    
    // Summary statistics
    console.log('\n\n📈 Summary Statistics:');
    console.log('='.repeat(80));
    console.log(`   Total Listings: ${allListings.length}`);
    console.log(`   Total Views (Sum): ${totalViewsFromDashboard}`);
    console.log(`   Average Views per Listing: ${(totalViewsFromDashboard / allListings.length).toFixed(2)}`);
    console.log(`   Highest Views: ${sortedListings[0]?.views || 0}`);
    console.log(`   Lowest Views: ${sortedListings[sortedListings.length - 1]?.views || 0}`);
    
    // Check for consistency
    console.log('\n\n✅ Test Results:');
    console.log('='.repeat(80));
    
    let allTestsPassed = true;
    
    // Check if view increment works
    const testListingForCheck = allListings[0];
    if (testListingForCheck) {
      const beforeCheck = testListingForCheck.views || 0;
      const incrementCheck = await incrementListingViews(testListingForCheck.id);
      const afterCheck = await getListingViews(testListingForCheck.id);
      
      if (incrementCheck.success && afterCheck === beforeCheck + 1) {
        console.log('✅ View increment functionality: PASSED');
      } else {
        console.log('❌ View increment functionality: FAILED');
        allTestsPassed = false;
      }
      
      // Restore original count
      const restoreListing = {
        ...testListingForCheck,
        views: beforeCheck,
        updatedAt: testListingForCheck.updatedAt
      };
      await db.upsert('published_listings', testListingForCheck.id, restoreListing);
      console.log(`   (Restored original view count: ${beforeCheck})`);
    }
    
    // Check owner view blocking
    if (allListings.length > 0) {
      const ownerListing = allListings.find(l => l.userId);
      if (ownerListing) {
        const beforeOwnerCheck = await getListingViews(ownerListing.id);
        const ownerResult = await trackListingView(ownerListing.id, ownerListing.userId, {
          isOwnerView: true
        });
        const afterOwnerCheck = await getListingViews(ownerListing.id);
        
        if (ownerResult.message.includes('skipped') && afterOwnerCheck === beforeOwnerCheck) {
          console.log('✅ Owner view blocking: PASSED');
        } else {
          console.log('❌ Owner view blocking: FAILED');
          allTestsPassed = false;
        }
      }
    }
    
    console.log('\n' + '='.repeat(80));
    if (allTestsPassed) {
      console.log('🎉 ALL TESTS PASSED! View tracking is working correctly.');
    } else {
      console.log('⚠️  SOME TESTS FAILED. Please review the output above.');
    }
    console.log('='.repeat(80) + '\n');
    
  } catch (error) {
    console.error('❌ Test Error:', error);
    console.error(error.stack);
  }
}

// Run the test
testViewTracking().then(() => {
  console.log('🏁 Test script completed\n');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Test script failed:', error);
  process.exit(1);
});

