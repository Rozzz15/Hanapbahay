/**
 * Test Script for Last 7 Days Analytics
 * This verifies that the "Last 7 days" feature is working correctly
 * 
 * Usage: Run in browser console when logged in as Brgy Official
 */

async function testLast7DaysAnalytics() {
  console.log('🧪 Testing Last 7 Days Analytics');
  console.log('='.repeat(60));
  
  try {
    const { getComprehensiveAnalytics } = await import('../utils/brgy-analytics');
    const { db } = await import('../utils/db');
    
    // Get barangay from prompt or use default
    const barangayName = prompt('Enter barangay name to test (e.g., TALOLONG, RIZAL):') || 'TALOLONG';
    
    console.log(`\n📊 Testing Last 7 Days for: "${barangayName}"`);
    console.log('-'.repeat(60));
    
    // Calculate date range
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    console.log('\n📅 Date Range:');
    console.log('  Today:', now.toISOString().split('T')[0]);
    console.log('  7 Days Ago:', sevenDaysAgo.toISOString().split('T')[0]);
    console.log('  Range:', `${sevenDaysAgo.toISOString().split('T')[0]} to ${now.toISOString().split('T')[0]}`);
    
    // Get analytics
    const analytics = await getComprehensiveAnalytics(barangayName);
    
    if (!analytics) {
      throw new Error('Analytics returned null/undefined');
    }
    
    console.log('\n📊 Recent Activity (Last 7 Days) Results:');
    console.log('-'.repeat(60));
    console.log('  New Bookings:', analytics.recentActivity.newBookings);
    console.log('  New Properties:', analytics.recentActivity.newProperties);
    console.log('  New Owners:', analytics.recentActivity.newOwners);
    console.log('  New Tenants:', analytics.recentActivity.newTenants);
    console.log('  New Inquiries:', analytics.recentActivity.newInquiries);
    
    // Verify with actual data
    console.log('\n🔍 Verifying with Database:');
    console.log('-'.repeat(60));
    
    const allBookings = await db.list('bookings');
    const allListings = await db.list('published_listings');
    const allApplications = await db.list('owner_applications');
    const allUsers = await db.list('users');
    
    // Get barangay listings
    const barangayListings = allListings.filter(listing => {
      if (listing.barangay) {
        return listing.barangay.trim().toUpperCase() === barangayName.trim().toUpperCase();
      }
      const listingUser = allUsers.find(u => u.id === listing.userId);
      return listingUser?.barangay?.trim().toUpperCase() === barangayName.trim().toUpperCase();
    });
    
    const barangayPropertyIds = barangayListings.map(l => l.id);
    const barangayBookings = allBookings.filter(b => barangayPropertyIds.includes(b.propertyId));
    
    // Manual calculations
    const manualRecentBookings = barangayBookings.filter(b => {
      const bookingDate = new Date(b.createdAt);
      return bookingDate >= sevenDaysAgo;
    }).length;
    
    const manualRecentProperties = barangayListings.filter(l => {
      const propertyDate = new Date(l.publishedAt || l.createdAt);
      return propertyDate >= sevenDaysAgo;
    }).length;
    
    const approvedApplications = allApplications.filter(app => 
      app.status === 'approved' && 
      app.barangay?.toUpperCase() === barangayName.toUpperCase()
    );
    
    const manualRecentOwners = approvedApplications.filter(app => {
      const approvalDate = new Date(app.reviewedAt || app.createdAt);
      return approvalDate >= sevenDaysAgo;
    }).length;
    
    // For tenants, we need to check paid bookings
    const paidBookings = barangayBookings.filter(b => 
      b.status === 'approved' && b.paymentStatus === 'paid'
    );
    
    const manualRecentTenants = paidBookings.filter(b => {
      const bookingDate = new Date(b.createdAt);
      return bookingDate >= sevenDaysAgo;
    }).length;
    
    console.log('\n📋 Manual Verification:');
    console.log('-'.repeat(60));
    console.log('  Manual Recent Bookings:', manualRecentBookings);
    console.log('  Analytics Recent Bookings:', analytics.recentActivity.newBookings);
    console.log('  ✅ Match:', manualRecentBookings === analytics.recentActivity.newBookings ? 'YES' : '❌ NO');
    
    console.log('\n  Manual Recent Properties:', manualRecentProperties);
    console.log('  Analytics Recent Properties:', analytics.recentActivity.newProperties);
    console.log('  ✅ Match:', manualRecentProperties === analytics.recentActivity.newProperties ? 'YES' : '❌ NO');
    
    console.log('\n  Manual Recent Owners:', manualRecentOwners);
    console.log('  Analytics Recent Owners:', analytics.recentActivity.newOwners);
    console.log('  ✅ Match:', manualRecentOwners === analytics.recentActivity.newOwners ? 'YES' : '❌ NO');
    
    console.log('\n  Manual Recent Tenants:', manualRecentTenants);
    console.log('  Analytics Recent Tenants:', analytics.recentActivity.newTenants);
    console.log('  ✅ Match:', manualRecentTenants === analytics.recentActivity.newTenants ? 'YES' : '❌ NO');
    
    // Day-by-day breakdown
    console.log('\n📅 Day-by-Day Breakdown (Last 7 Days):');
    console.log('-'.repeat(60));
    
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const dayDate = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dayStart = new Date(dayDate.setHours(0, 0, 0, 0));
      const dayEnd = new Date(dayDate.setHours(23, 59, 59, 999));
      
      const dayBookings = barangayBookings.filter(b => {
        const bookingDate = new Date(b.createdAt);
        return bookingDate >= dayStart && bookingDate <= dayEnd;
      }).length;
      
      const dayProperties = barangayListings.filter(l => {
        const propertyDate = new Date(l.publishedAt || l.createdAt);
        return propertyDate >= dayStart && propertyDate <= dayEnd;
      }).length;
      
      const dayOwners = approvedApplications.filter(app => {
        const approvalDate = new Date(app.reviewedAt || app.createdAt);
        return approvalDate >= dayStart && approvalDate <= dayEnd;
      }).length;
      
      const dayTenants = paidBookings.filter(b => {
        const bookingDate = new Date(b.createdAt);
        return bookingDate >= dayStart && bookingDate <= dayEnd;
      }).length;
      
      days.push({
        date: dayDate.toISOString().split('T')[0],
        dayName: dayDate.toLocaleDateString('en-US', { weekday: 'short' }),
        bookings: dayBookings,
        properties: dayProperties,
        owners: dayOwners,
        tenants: dayTenants
      });
    }
    
    days.forEach(day => {
      console.log(`  ${day.date} (${day.dayName}): Bookings: ${day.bookings}, Properties: ${day.properties}, Owners: ${day.owners}, Tenants: ${day.tenants}`);
    });
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(60));
    
    const allMatch = 
      manualRecentBookings === analytics.recentActivity.newBookings &&
      manualRecentProperties === analytics.recentActivity.newProperties &&
      manualRecentOwners === analytics.recentActivity.newOwners &&
      manualRecentTenants === analytics.recentActivity.newTenants;
    
    if (allMatch) {
      console.log('✅ ALL TESTS PASSED!');
      console.log('✅ Last 7 Days Analytics is working correctly!');
    } else {
      console.log('⚠️ SOME MISMATCHES DETECTED');
      console.log('Please check the manual verification above.');
    }
    
    return {
      success: allMatch,
      analytics,
      manual: {
        bookings: manualRecentBookings,
        properties: manualRecentProperties,
        owners: manualRecentOwners,
        tenants: manualRecentTenants
      },
      dayByDay: days
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
window.testLast7DaysAnalytics = testLast7DaysAnalytics;

console.log('✅ Last 7 Days Test script loaded!');
console.log('Run: testLast7DaysAnalytics()');

