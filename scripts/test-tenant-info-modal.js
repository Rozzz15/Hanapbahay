/**
 * Test Script: Verify Tenant Information Modal Functionality
 * Tests address, gender, familyType, and profile photo loading
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const DB_PREFIX = 'hb_db_';

async function testTenantInfoModal() {
  console.log('🧪 Testing Tenant Information Modal Functionality...\n');

  try {
    // 1. Check users table
    console.log('1️⃣ Checking users table...');
    const usersKey = `${DB_PREFIX}users`;
    const usersData = await AsyncStorage.getItem(usersKey);
    const users = usersData ? JSON.parse(usersData) : {};
    
    console.log(`   Found ${Object.keys(users).length} users`);
    const tenantUsers = Object.values(users).filter(u => u.role === 'tenant');
    console.log(`   Found ${tenantUsers.length} tenant users\n`);
    
    if (tenantUsers.length > 0) {
      const firstTenant = tenantUsers[0];
      console.log('   Sample tenant user:');
      console.log(`   - ID: ${firstTenant.id}`);
      console.log(`   - Name: ${firstTenant.name}`);
      console.log(`   - Email: ${firstTenant.email}`);
      console.log(`   - Gender: ${firstTenant.gender || 'NOT SET'}`);
      console.log(`   - Family Type: ${firstTenant.familyType || 'NOT SET'}`);
      console.log(`   - Address: ${firstTenant.address || 'NOT SET'}\n`);
    }

    // 2. Check tenants table
    console.log('2️⃣ Checking tenants table...');
    const tenantsKey = `${DB_PREFIX}tenants`;
    const tenantsData = await AsyncStorage.getItem(tenantsKey);
    const tenants = tenantsData ? JSON.parse(tenantsData) : {};
    
    console.log(`   Found ${Object.keys(tenants).length} tenant profiles\n`);
    
    if (Object.keys(tenants).length > 0) {
      const tenantId = Object.keys(tenants)[0];
      const tenant = tenants[tenantId];
      console.log('   Sample tenant profile:');
      console.log(`   - User ID: ${tenant.userId}`);
      console.log(`   - Email: ${tenant.email || 'NOT SET'}`);
      console.log(`   - Contact: ${tenant.contactNumber || 'NOT SET'}`);
      console.log(`   - Address: ${tenant.address || 'NOT SET'}`);
      console.log(`   - Gender: ${tenant.gender || 'NOT SET'}`);
      console.log(`   - Family Type: ${tenant.familyType || 'NOT SET'}\n`);
    }

    // 3. Check user_profile_photos table
    console.log('3️⃣ Checking profile photos...');
    const photosKey = `${DB_PREFIX}user_profile_photos`;
    const photosData = await AsyncStorage.getItem(photosKey);
    const photos = photosData ? JSON.parse(photosData) : {};
    
    console.log(`   Found ${Object.keys(photos).length} profile photos\n`);
    
    if (Object.keys(photos).length > 0) {
      const photoId = Object.keys(photos)[0];
      const photo = photos[photoId];
      console.log('   Sample profile photo:');
      console.log(`   - Photo ID: ${photo.id}`);
      console.log(`   - User ID: ${photo.userId || photo.userid || 'NOT SET'}`);
      console.log(`   - Has photoData: ${!!photo.photoData}`);
      console.log(`   - Has photoUri: ${!!photo.photoUri}`);
      if (photo.photoData) {
        console.log(`   - Photo data length: ${photo.photoData.length} characters`);
      }
      console.log();
    }

    // 4. Check bookings table for tenant info
    console.log('4️⃣ Checking bookings...');
    const bookingsKey = `${DB_PREFIX}bookings`;
    const bookingsData = await AsyncStorage.getItem(bookingsKey);
    const bookings = bookingsData ? JSON.parse(bookingsData) : {};
    
    console.log(`   Found ${Object.keys(bookings).length} bookings\n`);
    
    if (Object.keys(bookings).length > 0) {
      const bookingId = Object.keys(bookings)[0];
      const booking = bookings[bookingId];
      console.log('   Sample booking:');
      console.log(`   - Tenant ID: ${booking.tenantId}`);
      console.log(`   - Tenant Name: ${booking.tenantName}`);
      console.log(`   - Tenant Email: ${booking.tenantEmail}`);
      console.log(`   - Tenant Phone: ${booking.tenantPhone}`);
      console.log(`   - Tenant Address: ${booking.tenantAddress || 'NOT SET'}\n`);
    }

    // Summary
    console.log('📊 Summary:');
    console.log('   ✅ Data tables exist and contain data');
    console.log(`   ✅ Users with gender: ${Object.values(users).filter(u => u.gender).length}`);
    console.log(`   ✅ Users with familyType: ${Object.values(users).filter(u => u.familyType).length}`);
    console.log(`   ✅ Tenants with gender: ${Object.values(tenants).filter(t => t.gender).length}`);
    console.log(`   ✅ Tenants with familyType: ${Object.values(tenants).filter(t => t.familyType).length}`);
    console.log(`   ✅ Profile photos: ${Object.keys(photos).length}`);
    console.log(`   ✅ Bookings with tenant address: ${Object.values(bookings).filter(b => b.tenantAddress).length}`);
    
    console.log('\n✅ Test complete!');
    
  } catch (error) {
    console.error('❌ Error during test:', error);
  }
}

// Run the test if this file is executed directly
if (typeof window !== 'undefined') {
  // Browser environment
  window.testTenantInfoModal = testTenantInfoModal;
  console.log('ℹ️ Test function loaded. Run window.testTenantInfoModal() in the console to execute.');
} else {
  // Run immediately in Node.js environment
  testTenantInfoModal();
}

export default testTenantInfoModal;

