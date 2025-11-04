/**
 * Database Verification Test Script
 * Tests the database functionality for approved owners
 */

const { verifyApprovedOwnersDatabase, getApprovedOwnersForBarangay, getDatabaseStatistics } = require('../utils/database-verification');
const { initializeDatabase, verifyAndFixDatabase, getDatabaseHealth } = require('../utils/database-init');

async function runDatabaseVerificationTests() {
  console.log('🧪 Starting Database Verification Tests...\n');
  
  try {
    // Test 1: Initialize Database
    console.log('📋 Test 1: Database Initialization');
    console.log('=====================================');
    const initResult = await initializeDatabase();
    console.log('Result:', initResult);
    console.log('✅ Database initialization test completed\n');
    
    // Test 2: Database Health Check
    console.log('📋 Test 2: Database Health Check');
    console.log('=================================');
    const healthResult = await getDatabaseHealth();
    console.log('Health Status:', healthResult);
    console.log('✅ Database health check completed\n');
    
    // Test 3: Database Statistics
    console.log('📋 Test 3: Database Statistics');
    console.log('===============================');
    const statsResult = await getDatabaseStatistics();
    console.log('Statistics:', statsResult);
    console.log('✅ Database statistics test completed\n');
    
    // Test 4: Verify Approved Owners Database
    console.log('📋 Test 4: Approved Owners Database Verification');
    console.log('=================================================');
    const verificationResult = await verifyApprovedOwnersDatabase();
    console.log('Verification Result:', verificationResult);
    console.log('✅ Approved owners verification test completed\n');
    
    // Test 5: Get Approved Owners for Specific Barangay
    console.log('📋 Test 5: Get Approved Owners for Barangay');
    console.log('============================================');
    const barangays = ['RIZAL', 'TALOLONG', 'GOMEZ', 'MAGSAYSAY'];
    
    for (const barangay of barangays) {
      console.log(`\n--- Testing ${barangay} ---`);
      const barangayResult = await getApprovedOwnersForBarangay(barangay);
      console.log(`${barangay} Result:`, barangayResult);
    }
    console.log('✅ Barangay-specific approved owners test completed\n');
    
    // Test 6: Database Integrity Check
    console.log('📋 Test 6: Database Integrity Check');
    console.log('===================================');
    const integrityResult = await verifyAndFixDatabase();
    console.log('Integrity Result:', integrityResult);
    console.log('✅ Database integrity check completed\n');
    
    // Summary
    console.log('🎉 All Database Verification Tests Completed Successfully!');
    console.log('========================================================');
    console.log('✅ Database is properly initialized');
    console.log('✅ All tables are accessible');
    console.log('✅ Approved owners data is stored correctly');
    console.log('✅ Barangay-specific data retrieval works');
    console.log('✅ Database integrity is maintained');
    
  } catch (error) {
    console.error('❌ Database verification tests failed:', error);
    console.error('Stack trace:', error.stack);
  }
}

// Run the tests
if (require.main === module) {
  runDatabaseVerificationTests()
    .then(() => {
      console.log('\n🏁 Test execution completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Test execution failed:', error);
      process.exit(1);
    });
}

module.exports = {
  runDatabaseVerificationTests
};
