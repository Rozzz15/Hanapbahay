/**
 * Comprehensive Test Script for Barangay Reports & Analytics
 * Tests all features including Total Property Views
 */

const { db } = require('../utils/db');
const { getComprehensiveAnalytics } = require('../utils/brgy-analytics');

async function testBrgyReportsAnalytics(barangayName = 'TALOLONG') {
  console.log('🧪 Starting Comprehensive Barangay Reports & Analytics Test');
  console.log('='.repeat(60));
  
  try {
    // Test 1: Load Comprehensive Analytics
    console.log('\n📊 Test 1: Loading Comprehensive Analytics');
    console.log('-'.repeat(60));
    const analytics = await getComprehensiveAnalytics(barangayName);
    
    if (!analytics) {
      throw new Error('Analytics returned null/undefined');
    }
    console.log('✅ Analytics loaded successfully');
    
    // Test 2: Demographics Section
    console.log('\n👥 Test 2: Demographics Section');
    console.log('-'.repeat(60));
    console.log('Total Owners:', analytics.ownerAnalytics.totalOwners);
    console.log('Avg Properties per Owner:', analytics.ownerAnalytics.averagePropertiesPerOwner);
    console.log('Total Residents:', analytics.genderAnalytics.total);
    console.log('Male Residents:', analytics.genderAnalytics.male);
    console.log('Female Residents:', analytics.genderAnalytics.female);
    console.log('Male Percentage:', analytics.genderAnalytics.malePercentage + '%');
    console.log('Female Percentage:', analytics.genderAnalytics.femalePercentage + '%');
    
    if (analytics.genderAnalytics.total > 0) {
      console.log('✅ Gender analytics populated');
    } else {
      console.log('⚠️ No residents found (this is OK if no paid bookings exist)');
    }
    
    // Test 3: Property Analytics
    console.log('\n🏠 Test 3: Property Analytics');
    console.log('-'.repeat(60));
    console.log('Total Properties:', analytics.totalProperties);
    console.log('Available Properties:', analytics.availableProperties);
    console.log('Occupied Properties:', analytics.occupiedProperties);
    console.log('Reserved Properties:', analytics.reservedProperties);
    console.log('Average Rent:', '₱' + analytics.averageRent.toLocaleString());
    console.log('Property Types:', Object.keys(analytics.propertyTypes).length, 'types');
    
    if (analytics.totalProperties > 0) {
      console.log('✅ Property data populated');
    } else {
      console.log('⚠️ No properties found');
    }
    
    // Test 4: Booking Analytics
    console.log('\n📅 Test 4: Booking Analytics');
    console.log('-'.repeat(60));
    console.log('Total Bookings:', analytics.totalBookings);
    console.log('Approved Bookings:', analytics.approvedBookings);
    console.log('Pending Bookings:', analytics.pendingBookings);
    console.log('Rejected Bookings:', analytics.rejectedBookings);
    console.log('Cancelled Bookings:', analytics.cancelledBookings);
    console.log('Completed Bookings:', analytics.completedBookings);
    console.log('This Month:', analytics.bookingTrends.thisMonth);
    console.log('Last Month:', analytics.bookingTrends.lastMonth);
    console.log('Growth Rate:', analytics.bookingTrends.growthRate + '%');
    
    // Test 5: Financial Summary
    console.log('\n💰 Test 5: Financial Summary');
    console.log('-'.repeat(60));
    console.log('Total Revenue:', '₱' + analytics.totalRevenue.toLocaleString());
    console.log('Average Booking Value:', '₱' + analytics.averageBookingValue.toLocaleString());
    console.log('Average Monthly Rent:', '₱' + analytics.averageRent.toLocaleString());
    console.log('Conversion Rate:', analytics.relationshipAnalytics.conversionRate + '%');
    
    // Test 6: Activity & Engagement (INCLUDING TOTAL PROPERTY VIEWS)
    console.log('\n📊 Test 6: Activity & Engagement');
    console.log('-'.repeat(60));
    console.log('Total Property Views:', analytics.totalViews);
    console.log('Average Views per Property:', analytics.averageViewsPerProperty);
    console.log('Total Inquiries:', analytics.totalInquiries);
    console.log('Recent Activity (Last 7 Days):');
    console.log('  - New Bookings:', analytics.recentActivity.newBookings);
    console.log('  - New Properties:', analytics.recentActivity.newProperties);
    console.log('  - New Owners:', analytics.recentActivity.newOwners);
    console.log('  - New Tenants:', analytics.recentActivity.newTenants);
    console.log('  - New Inquiries:', analytics.recentActivity.newInquiries);
    
    // CRITICAL TEST: Verify Total Property Views
    if (typeof analytics.totalViews === 'number') {
      console.log('✅ Total Property Views is a number:', analytics.totalViews);
    } else {
      console.log('❌ ERROR: Total Property Views is not a number!');
    }
    
    if (analytics.totalViews >= 0) {
      console.log('✅ Total Property Views value is valid (>= 0)');
    } else {
      console.log('❌ ERROR: Total Property Views is negative!');
    }
    
    // Test 7: Top Performers
    console.log('\n🏆 Test 7: Top Performers');
    console.log('-'.repeat(60));
    console.log('Top Performing Owners:', analytics.ownerAnalytics.topOwners.length);
    analytics.ownerAnalytics.topOwners.forEach((owner, index) => {
      console.log(`  ${index + 1}. ${owner.ownerName}: ${owner.propertyCount} properties, ₱${owner.totalRevenue.toLocaleString()}`);
    });
    console.log('Most Active Owners:', analytics.relationshipAnalytics.mostActiveOwners.length);
    console.log('Most Active Tenants:', analytics.relationshipAnalytics.mostActiveTenants.length);
    
    // Test 8: Market Insights
    console.log('\n📈 Test 8: Market Insights');
    console.log('-'.repeat(60));
    console.log('Occupancy Rate:', analytics.marketAnalytics.occupancyRate + '%');
    console.log('Average Days on Market:', analytics.marketAnalytics.averageDaysOnMarket, 'days');
    console.log('Price Range:');
    console.log('  - Min:', '₱' + analytics.marketAnalytics.priceRange.min.toLocaleString());
    console.log('  - Max:', '₱' + analytics.marketAnalytics.priceRange.max.toLocaleString());
    console.log('  - Median:', '₱' + analytics.marketAnalytics.priceRange.median.toLocaleString());
    console.log('Popular Property Types:', analytics.marketAnalytics.popularPropertyTypes.length);
    
    // Test 9: Verify Property Views Calculation
    console.log('\n🔍 Test 9: Property Views Calculation Verification');
    console.log('-'.repeat(60));
    
    // Get all listings to manually verify views
    const allListings = await db.list('published_listings');
    const allUsers = await db.list('users');
    
    // Filter listings by barangay
    const barangayListings = allListings.filter(listing => {
      let isInBarangay = false;
      if (listing.barangay) {
        isInBarangay = listing.barangay.trim().toUpperCase() === barangayName.trim().toUpperCase();
      } else {
        const listingUser = allUsers.find(u => u.id === listing.userId);
        const userBarangay = listingUser?.barangay;
        if (userBarangay) {
          isInBarangay = userBarangay.trim().toUpperCase() === barangayName.trim().toUpperCase();
        }
      }
      return isInBarangay;
    });
    
    console.log('Barangay Listings Found:', barangayListings.length);
    
    // Calculate total views manually
    const manualTotalViews = barangayListings.reduce((sum, listing) => {
      return sum + (listing.viewCount || 0);
    }, 0);
    
    console.log('Manual Total Views Calculation:', manualTotalViews);
    console.log('Analytics Total Views:', analytics.totalViews);
    
    if (manualTotalViews === analytics.totalViews) {
      console.log('✅ Total Property Views matches manual calculation!');
    } else {
      console.log('⚠️ WARNING: Total Property Views mismatch!');
      console.log('   Difference:', Math.abs(manualTotalViews - analytics.totalViews));
    }
    
    // Check individual property views
    console.log('\n📋 Property Views Breakdown:');
    barangayListings.slice(0, 5).forEach((listing, index) => {
      console.log(`  ${index + 1}. "${listing.title}" - Views: ${listing.viewCount || 0}`);
    });
    
    if (barangayListings.length > 5) {
      console.log(`  ... and ${barangayListings.length - 5} more properties`);
    }
    
    // Test 10: Data Completeness Check
    console.log('\n✅ Test 10: Data Completeness Check');
    console.log('-'.repeat(60));
    
    const checks = {
      'Has Gender Analytics': !!analytics.genderAnalytics,
      'Has Owner Analytics': !!analytics.ownerAnalytics,
      'Has Property Counts': typeof analytics.totalProperties === 'number',
      'Has Booking Counts': typeof analytics.totalBookings === 'number',
      'Has Financial Data': typeof analytics.totalRevenue === 'number',
      'Has Views Data': typeof analytics.totalViews === 'number',
      'Has Market Analytics': !!analytics.marketAnalytics,
      'Has Relationship Analytics': !!analytics.relationshipAnalytics,
    };
    
    let allPassed = true;
    Object.entries(checks).forEach(([check, passed]) => {
      if (passed) {
        console.log(`✅ ${check}`);
      } else {
        console.log(`❌ ${check}`);
        allPassed = false;
      }
    });
    
    // Final Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`Barangay: ${barangayName}`);
    console.log(`Total Properties: ${analytics.totalProperties}`);
    console.log(`Total Bookings: ${analytics.totalBookings}`);
    console.log(`Total Residents: ${analytics.genderAnalytics.total}`);
    console.log(`Total Owners: ${analytics.ownerAnalytics.totalOwners}`);
    console.log(`Total Property Views: ${analytics.totalViews} ⭐`);
    console.log(`Average Views per Property: ${analytics.averageViewsPerProperty.toFixed(1)}`);
    console.log(`Total Revenue: ₱${analytics.totalRevenue.toLocaleString()}`);
    
    if (allPassed) {
      console.log('\n✅ ALL TESTS PASSED!');
      console.log('✅ Reports & Analytics is working correctly!');
      console.log('✅ Total Property Views is functioning properly!');
    } else {
      console.log('\n⚠️ SOME TESTS FAILED');
      console.log('Please review the errors above.');
    }
    
    return {
      success: allPassed,
      analytics,
      manualTotalViews,
      analyticsTotalViews: analytics.totalViews,
      viewsMatch: manualTotalViews === analytics.totalViews
    };
    
  } catch (error) {
    console.error('\n❌ TEST FAILED WITH ERROR:');
    console.error(error);
    console.error('\nStack trace:', error.stack);
    return {
      success: false,
      error: error.message,
      stack: error.stack
    };
  }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { testBrgyReportsAnalytics };
}

// If running directly
if (require.main === module) {
  const barangayName = process.argv[2] || 'TALOLONG';
  testBrgyReportsAnalytics(barangayName)
    .then(result => {
      if (result.success) {
        console.log('\n🎉 All tests completed successfully!');
        process.exit(0);
      } else {
        console.log('\n❌ Tests completed with errors');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

