// Test script to verify Brgy. Talolong analytics fix
// This script can be run in the browser console to test the analytics

async function testTalolongAnalytics() {
  console.log('🧪 Testing Brgy. Talolong Analytics Fix');
  
  try {
    // Import the analytics function
    const { getComprehensiveAnalytics } = await import('./utils/brgy-analytics');
    
    // Test with different possible barangay name formats
    const testNames = [
      'Brgy. Talolong',
      'TALOLONG',
      'Talolong',
      'brgy. talolong',
      'BRGY. TALOLONG'
    ];
    
    for (const barangayName of testNames) {
      console.log(`\n📊 Testing with barangay name: "${barangayName}"`);
      try {
        const analytics = await getComprehensiveAnalytics(barangayName);
        console.log('✅ Analytics loaded successfully:', {
          totalProperties: analytics.totalProperties,
          totalBookings: analytics.totalBookings,
          totalOwners: analytics.ownerAnalytics.totalOwners,
          totalTenants: analytics.genderAnalytics.total
        });
        
        if (analytics.totalProperties > 0 || analytics.totalBookings > 0) {
          console.log('🎉 SUCCESS: Found data for', barangayName);
          return barangayName;
        }
      } catch (error) {
        console.log('❌ Error with', barangayName, ':', error.message);
      }
    }
    
    console.log('⚠️ No data found for any barangay name format');
    return null;
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    return null;
  }
}

// Run the test
testTalolongAnalytics().then(result => {
  if (result) {
    console.log('✅ Fix verified! Working barangay name:', result);
  } else {
    console.log('❌ Fix needs more work - no data found');
  }
});

// Export for manual testing
window.testTalolongAnalytics = testTalolongAnalytics;
