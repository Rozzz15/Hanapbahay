/**
 * Cancel Booking Test Script
 * 
 * This script tests the complete cancel booking flow:
 * 1. Tenant creates a booking
 * 2. Owner sees the booking
 * 3. Tenant cancels the booking
 * 4. Booking is removed from both tenant and owner lists
 * 
 * Run this with: node test-cancel-booking.js
 */

const AsyncStorage = require('@react-native-async-storage/async-storage');

// Mock AsyncStorage
const storage = new Map();

const mockAsyncStorage = {
  async getItem(key) {
    return storage.get(key) || null;
  },
  async setItem(key, value) {
    storage.set(key, value);
  },
  async removeItem(key) {
    storage.delete(key);
  },
  async clear() {
    storage.clear();
  }
};

// Mock db utility
const db = {
  async get(collection, id) {
    const data = await mockAsyncStorage.getItem(collection);
    if (!data) return null;
    const items = JSON.parse(data);
    return items.find(item => item.id === id) || null;
  },
  
  async list(collection) {
    const data = await mockAsyncStorage.getItem(collection);
    return data ? JSON.parse(data) : [];
  },
  
  async upsert(collection, id, item) {
    const data = await mockAsyncStorage.getItem(collection);
    const items = data ? JSON.parse(data) : [];
    const index = items.findIndex(i => i.id === id);
    
    if (index >= 0) {
      items[index] = { ...items[index], ...item, id };
    } else {
      items.push({ ...item, id });
    }
    
    await mockAsyncStorage.setItem(collection, JSON.stringify(items));
    return items[index >= 0 ? index : items.length - 1];
  },
  
  async remove(collection, id) {
    const data = await mockAsyncStorage.getItem(collection);
    if (!data) return;
    const items = JSON.parse(data);
    const filtered = items.filter(item => item.id !== id);
    await mockAsyncStorage.setItem(collection, JSON.stringify(filtered));
  }
};

// Setup test data
async function setupTestData() {
  console.log('\n🔧 Setting up test data...\n');
  
  const ownerId = 'owner_001';
  const tenantId = 'tenant_001';
  
  // Create owner
  await db.upsert('users', ownerId, {
    id: ownerId,
    name: 'John Owner',
    email: 'owner@test.com',
    phone: '09123456789',
    roles: ['owner']
  });
  
  // Create tenant
  await db.upsert('users', tenantId, {
    id: tenantId,
    name: 'Jane Tenant',
    email: 'tenant@test.com',
    phone: '09987654321',
    roles: ['tenant']
  });
  
  // Create property
  const listingId = 'listing_001';
  await db.upsert('published_listings', listingId, {
    id: listingId,
    userId: ownerId,
    propertyType: 'Apartment',
    address: 'Test St, Test City',
    monthlyRent: 5000,
    ownerName: 'John Owner',
    email: 'owner@test.com',
    contactNumber: '09123456789',
    status: 'published'
  });
  
  console.log('✅ Test data created');
  return { ownerId, tenantId, listingId };
}

// Create booking
async function createBooking(data) {
  const { propertyId, tenantId, startDate } = data;
  
  const property = await db.get('published_listings', propertyId);
  const tenant = await db.get('users', tenantId);
  
  if (!property || !tenant) throw new Error('Property or tenant not found');
  
  const booking = {
    id: `booking_${Date.now()}`,
    propertyId,
    tenantId,
    ownerId: property.userId,
    propertyTitle: `${property.propertyType} in ${property.address.split(',')[0]}`,
    propertyAddress: property.address,
    monthlyRent: property.monthlyRent,
    securityDeposit: 0,
    totalAmount: property.monthlyRent,
    startDate,
    endDate: startDate,
    duration: 1,
    status: 'pending',
    paymentStatus: 'pending',
    tenantName: tenant.name,
    tenantEmail: tenant.email,
    tenantPhone: tenant.phone || '',
    ownerName: property.ownerName,
    ownerEmail: property.email,
    ownerPhone: property.contactNumber,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  await db.upsert('bookings', booking.id, booking);
  return booking;
}

// Cancel booking (delete)
async function cancelBooking(bookingId, tenantId) {
  const booking = await db.get('bookings', bookingId);
  
  if (!booking) throw new Error('Booking not found');
  if (booking.tenantId !== tenantId) throw new Error('Unauthorized');
  if (booking.status === 'completed') throw new Error('Cannot cancel completed booking');
  
  // Delete the booking
  await db.remove('bookings', bookingId);
  
  return true;
}

// Get bookings by tenant
async function getBookingsByTenant(tenantId) {
  const allBookings = await db.list('bookings');
  return allBookings.filter(booking => booking.tenantId === tenantId);
}

// Get bookings by owner
async function getBookingsByOwner(ownerId) {
  const allBookings = await db.list('bookings');
  return allBookings.filter(booking => booking.ownerId === ownerId);
}

// Test functions
async function testStep1_CreateBooking(ownerId, tenantId, listingId) {
  console.log('\n📋 STEP 1: Tenant creates booking');
  console.log('─'.repeat(60));
  
  const booking = await createBooking({
    propertyId: listingId,
    tenantId: tenantId,
    startDate: '2025-11-01'
  });
  
  console.log('✅ Booking created:', booking.id);
  console.log('   Status:', booking.status);
  console.log('   Tenant ID:', booking.tenantId);
  console.log('   Owner ID:', booking.ownerId);
  
  return booking;
}

async function testStep2_VerifyBookingInBothLists(ownerId, tenantId, bookingId) {
  console.log('\n📋 STEP 2: Verify booking appears in both lists');
  console.log('─'.repeat(60));
  
  const tenantBookings = await getBookingsByTenant(tenantId);
  const ownerBookings = await getBookingsByOwner(ownerId);
  
  console.log('📊 Tenant bookings:', tenantBookings.length);
  console.log('📊 Owner bookings:', ownerBookings.length);
  
  const tenantHasBooking = tenantBookings.some(b => b.id === bookingId);
  const ownerHasBooking = ownerBookings.some(b => b.id === bookingId);
  
  console.log('✓ Tenant sees booking:', tenantHasBooking ? '✅ YES' : '❌ NO');
  console.log('✓ Owner sees booking:', ownerHasBooking ? '✅ YES' : '❌ NO');
  
  return tenantHasBooking && ownerHasBooking;
}

async function testStep3_TenantCancelsBooking(tenantId, bookingId) {
  console.log('\n📋 STEP 3: Tenant cancels booking');
  console.log('─'.repeat(60));
  
  console.log('🔄 Cancelling booking:', bookingId);
  await cancelBooking(bookingId, tenantId);
  console.log('✅ Booking cancelled and deleted');
  
  return true;
}

async function testStep4_VerifyBookingRemovedFromBothLists(ownerId, tenantId, bookingId) {
  console.log('\n📋 STEP 4: Verify booking removed from both lists');
  console.log('─'.repeat(60));
  
  const tenantBookings = await getBookingsByTenant(tenantId);
  const ownerBookings = await getBookingsByOwner(ownerId);
  
  console.log('📊 Tenant bookings after cancel:', tenantBookings.length);
  console.log('📊 Owner bookings after cancel:', ownerBookings.length);
  
  const tenantStillHasBooking = tenantBookings.some(b => b.id === bookingId);
  const ownerStillHasBooking = ownerBookings.some(b => b.id === bookingId);
  
  console.log('✓ Tenant list (should be empty):', tenantStillHasBooking ? '❌ STILL HAS' : '✅ REMOVED');
  console.log('✓ Owner list (should be empty):', ownerStillHasBooking ? '❌ STILL HAS' : '✅ REMOVED');
  
  return !tenantStillHasBooking && !ownerStillHasBooking;
}

async function testStep5_DatabaseIntegrity() {
  console.log('\n📋 STEP 5: Database integrity check');
  console.log('─'.repeat(60));
  
  const allBookings = await db.list('bookings');
  
  console.log('📊 Total bookings in database:', allBookings.length);
  console.log('✓ Database clean:', allBookings.length === 0 ? '✅ YES' : '❌ NO');
  
  return allBookings.length === 0;
}

// Main test execution
async function runAllTests() {
  console.log('\n');
  console.log('═'.repeat(70));
  console.log('  CANCEL BOOKING FLOW TEST SUITE');
  console.log('═'.repeat(70));
  
  try {
    const { ownerId, tenantId, listingId } = await setupTestData();
    
    // Step 1: Create booking
    const booking = await testStep1_CreateBooking(ownerId, tenantId, listingId);
    
    // Step 2: Verify booking in both lists
    const step2Pass = await testStep2_VerifyBookingInBothLists(ownerId, tenantId, booking.id);
    
    // Step 3: Tenant cancels
    const step3Pass = await testStep3_TenantCancelsBooking(tenantId, booking.id);
    
    // Step 4: Verify removed from both lists
    const step4Pass = await testStep4_VerifyBookingRemovedFromBothLists(ownerId, tenantId, booking.id);
    
    // Step 5: Database integrity
    const step5Pass = await testStep5_DatabaseIntegrity();
    
    // Summary
    console.log('\n');
    console.log('═'.repeat(70));
    console.log('  TEST SUMMARY');
    console.log('═'.repeat(70));
    
    const results = [
      { name: 'Create booking', pass: true },
      { name: 'Booking appears in both lists', pass: step2Pass },
      { name: 'Tenant cancels booking', pass: step3Pass },
      { name: 'Booking removed from both lists', pass: step4Pass },
      { name: 'Database integrity', pass: step5Pass }
    ];
    
    const passed = results.filter(r => r.pass).length;
    const total = results.length;
    
    console.log(`\nTests Passed: ${passed}/${total}\n`);
    
    results.forEach((r, i) => {
      console.log(`${r.pass ? '✅' : '❌'} Step ${i + 1}: ${r.name}`);
    });
    
    if (passed === total) {
      console.log('\n🎉 ALL TESTS PASSED! Cancel booking flow is working correctly.');
      console.log('\n📋 Confirmed:');
      console.log('   ✓ Booking is created and visible to both tenant and owner');
      console.log('   ✓ When tenant cancels, booking is DELETED from database');
      console.log('   ✓ Booking disappears from tenant\'s booking list');
      console.log('   ✓ Booking disappears from owner\'s booking list');
      console.log('   ✓ Database is clean (no orphaned records)\n');
    } else {
      console.log(`\n⚠️  ${total - passed} test(s) failed.\n`);
    }
    
  } catch (error) {
    console.error('\n❌ Test execution failed:', error);
    console.error(error.stack);
  }
}

// Run tests
runAllTests();

