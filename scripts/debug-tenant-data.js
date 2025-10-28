/**
 * Debug script to check tenant data in the app
 * Run this in the browser console while the app is running
 */

async function debugTenantData() {
  console.log('🔍 Debugging Tenant Data...\n');

  try {
    // Import the database utility
    const { db } = await import('../utils/db.js');
    
    // 1. Check users table
    console.log('1️⃣ Users Table:');
    const users = await db.list('users');
    const tenantUsers = users.filter(u => u.role === 'tenant');
    console.log(`   Total users: ${users.length}`);
    console.log(`   Tenant users: ${tenantUsers.length}`);
    
    if (tenantUsers.length > 0) {
      const sampleTenant = tenantUsers[0];
      console.log('   Sample tenant user:');
      console.log(`   - ID: ${sampleTenant.id}`);
      console.log(`   - Name: ${sampleTenant.name}`);
      console.log(`   - Email: ${sampleTenant.email}`);
      console.log(`   - Gender: ${sampleTenant.gender || 'NOT SET'}`);
      console.log(`   - Family Type: ${sampleTenant.familyType || 'NOT SET'}`);
      console.log(`   - Address: ${sampleTenant.address || 'NOT SET'}`);
    }
    console.log();

    // 2. Check tenants table
    console.log('2️⃣ Tenants Table:');
    const tenants = await db.list('tenants');
    console.log(`   Total tenant profiles: ${tenants.length}`);
    
    if (tenants.length > 0) {
      const sampleTenant = tenants[0];
      console.log('   Sample tenant profile:');
      console.log(`   - User ID: ${sampleTenant.userId}`);
      console.log(`   - Email: ${sampleTenant.email || 'NOT SET'}`);
      console.log(`   - Contact: ${sampleTenant.contactNumber || 'NOT SET'}`);
      console.log(`   - Address: ${sampleTenant.address || 'NOT SET'}`);
      console.log(`   - Gender: ${sampleTenant.gender || 'NOT SET'}`);
      console.log(`   - Family Type: ${sampleTenant.familyType || 'NOT SET'}`);
    }
    console.log();

    // 3. Check profile photos
    console.log('3️⃣ Profile Photos:');
    const photos = await db.list('user_profile_photos');
    console.log(`   Total photos: ${photos.length}`);
    
    if (photos.length > 0) {
      const samplePhoto = photos[0];
      console.log('   Sample photo:');
      console.log(`   - Photo ID: ${samplePhoto.id}`);
      console.log(`   - User ID: ${samplePhoto.userId || samplePhoto.userid || 'NOT SET'}`);
      console.log(`   - Has photoData: ${!!samplePhoto.photoData}`);
      console.log(`   - Has photoUri: ${!!samplePhoto.photoUri}`);
      if (samplePhoto.photoData) {
        console.log(`   - Photo data length: ${samplePhoto.photoData.length} chars`);
      }
    }
    console.log();

    // 4. Check bookings
    console.log('4️⃣ Bookings:');
    const bookings = await db.list('bookings');
    console.log(`   Total bookings: ${bookings.length}`);
    
    if (bookings.length > 0) {
      const sampleBooking = bookings[0];
      console.log('   Sample booking:');
      console.log(`   - Tenant ID: ${sampleBooking.tenantId}`);
      console.log(`   - Tenant Name: ${sampleBooking.tenantName}`);
      console.log(`   - Tenant Email: ${sampleBooking.tenantEmail}`);
      console.log(`   - Tenant Phone: ${sampleBooking.tenantPhone}`);
      console.log(`   - Tenant Address: ${sampleBooking.tenantAddress || 'NOT SET'}`);
    }
    console.log();

    // 5. Data sync check
    console.log('5️⃣ Data Sync Check:');
    if (tenantUsers.length > 0 && tenants.length > 0) {
      const userId = tenantUsers[0].id;
      const tenantProfile = tenants.find(t => t.userId === userId);
      
      if (tenantProfile) {
        console.log('   Comparing user vs tenant data:');
        console.log(`   - Gender match: ${tenantUsers[0].gender === tenantProfile.gender}`);
        console.log(`   - FamilyType match: ${tenantUsers[0].familyType === tenantProfile.familyType}`);
        console.log(`   - Address match: ${tenantUsers[0].address === tenantProfile.address}`);
      } else {
        console.log('   ❌ No matching tenant profile found for user');
      }
    }

    console.log('\n✅ Debug complete!');
    
  } catch (error) {
    console.error('❌ Error during debug:', error);
  }
}

// Export for use in browser console
if (typeof window !== 'undefined') {
  window.debugTenantData = debugTenantData;
  console.log('ℹ️ Debug function loaded. Run window.debugTenantData() in the console.');
}

export default debugTenantData;
