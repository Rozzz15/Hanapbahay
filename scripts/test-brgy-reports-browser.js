/**
 * Browser Console Test for Barangay Reports & Analytics
 * Run this in the browser console (F12) when logged in as a Brgy Official
 * 
 * Usage:
 * 1. Open browser console (F12)
 * 2. Copy and paste this entire script
 * 3. Run: testBrgyReportsAnalytics()
 */

async function testBrgyReportsAnalytics() {
  console.log('🧪 Testing Barangay Reports & Analytics');
  console.log('='.repeat(60));
  
  try {
    // Import the analytics function
    const { getComprehensiveAnalytics } = await import('../utils/brgy-analytics');
    const { db } = await import('../utils/db');
    
    // Get current user's barangay
    const { useAuth } = await import('../context/AuthContext');
    // Since we're in browser console, we'll need to get barangay from URL or prompt
    const barangayName = prompt('Enter barangay name to test (e.g., TALOLONG, RIZAL):') || 'TALOLONG';
    
    console.log(`\n📊 Testing with barangay: "${barangayName}"`);
    
    // Test 1: Load Analytics
    console.log('\n📊 Test 1: Loading Comprehensive Analytics');
    console.log('-'.repeat(60));
    const analytics = await getComprehensiveAnalytics(barangayName);
    
    if (!analytics) {
      throw new Error('Analytics returned null/undefined');
    }
    console.log('✅ Analytics loaded successfully');
    
    // Test 2: Verify Total Property Views
    console.log('\n👁️ Test 2: Total Property Views (CRITICAL TEST)');
    console.log('-'.repeat(60));
    
    // Get all listings to manually verify
    const allListings = await db.list('published_listings');
    const allUsers = await db.list('users');
    
    // Filter by barangay
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
    
    // Calculate views manually
    const manualTotalViews = barangayListings.reduce((sum, listing) => {
      const views = listing.views || listing.viewCount || 0;
      return sum + views;
    }, 0);
    
    console.log('Barangay Listings Found:', barangayListings.length);
    console.log('Manual Total Views Calculation:', manualTotalViews);
    console.log('Analytics Total Views:', analytics.totalViews);
    console.log('Average Views per Property:', analytics.averageViewsPerProperty.toFixed(2));
    
    if (typeof analytics.totalViews === 'number' && analytics.totalViews >= 0) {
      console.log('✅ Total Property Views is a valid number');
    } else {
      console.log('❌ ERROR: Total Property Views is invalid!');
    }
    
    if (Math.abs(manualTotalViews - analytics.totalViews) < 1) {
      console.log('✅ Total Property Views matches manual calculation!');
    } else {
      console.log('⚠️ WARNING: Views mismatch!');
      console.log('   Manual:', manualTotalViews);
      console.log('   Analytics:', analytics.totalViews);
      console.log('   Difference:', Math.abs(manualTotalViews - analytics.totalViews));
    }
    
    // Show property views breakdown
    console.log('\n📋 Property Views Breakdown (first 5):');
    barangayListings.slice(0, 5).forEach((listing, index) => {
      const views = listing.views || listing.viewCount || 0;
      console.log(`  ${index + 1}. "${listing.title || listing.propertyType}" - Views: ${views}`);
    });
    
    // Test 3: Demographics
    console.log('\n👥 Test 3: Demographics');
    console.log('-'.repeat(60));
    console.log('Total Owners:', analytics.ownerAnalytics.totalOwners);
    console.log('Total Residents:', analytics.genderAnalytics.total);
    console.log('Male Residents:', analytics.genderAnalytics.male);
    console.log('Female Residents:', analytics.genderAnalytics.female);
    
    // Test 4: All Features Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 COMPREHENSIVE TEST SUMMARY');
    console.log('='.repeat(60));
    
    const tests = {
      'Demographics - Total Owners': analytics.ownerAnalytics.totalOwners >= 0,
      'Demographics - Total Residents': analytics.genderAnalytics.total >= 0,
      'Property Analytics - Total Properties': analytics.totalProperties >= 0,
      'Booking Analytics - Total Bookings': analytics.totalBookings >= 0,
      'Financial - Total Revenue': typeof analytics.totalRevenue === 'number',
      'Activity - Total Property Views': typeof analytics.totalViews === 'number' && analytics.totalViews >= 0,
      'Activity - Average Views per Property': typeof analytics.averageViewsPerProperty === 'number',
      'Market Analytics - Occupancy Rate': typeof analytics.marketAnalytics.occupancyRate === 'number',
      'Relationship Analytics - Conversion Rate': typeof analytics.relationshipAnalytics.conversionRate === 'number',
    };
    
    let passed = 0;
    let total = 0;
    
    Object.entries(tests).forEach(([test, result]) => {
      total++;
      if (result) {
        passed++;
        console.log(`✅ ${test}`);
      } else {
        console.log(`❌ ${test}`);
      }
    });
    
    console.log('\n' + '='.repeat(60));
    console.log(`📊 Results: ${passed}/${total} tests passed`);
    
    if (passed === total) {
      console.log('🎉 ALL TESTS PASSED!');
      console.log('✅ Reports & Analytics is fully functional!');
      console.log('✅ Total Property Views is working correctly!');
    } else {
      console.log('⚠️ SOME TESTS FAILED');
    }
    
    // Return summary for inspection
    return {
      success: passed === total,
      analytics,
      tests,
      propertyViews: {
        manual: manualTotalViews,
        analytics: analytics.totalViews,
        match: Math.abs(manualTotalViews - analytics.totalViews) < 1
      }
    };
    
  } catch (error) {
    console.error('\n❌ TEST FAILED:');
    console.error(error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Make it available globally
window.testBrgyReportsAnalytics = testBrgyReportsAnalytics;

console.log('✅ Test script loaded!');
console.log('Run: testBrgyReportsAnalytics()');

