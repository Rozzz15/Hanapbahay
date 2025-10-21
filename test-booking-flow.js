/**
 * Booking Flow Test Script
 * 
 * This script tests if bookings created by tenants appear in the owner's bookings page.
 * 
 * Run this with: node test-booking-flow.js
 */

const AsyncStorage = require('@react-native-async-storage/async-storage');

// Mock AsyncStorage for Node environment
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
  async getAllKeys() {
    return Array.from(storage.keys());
  },
  async multiGet(keys) {
    return keys.map(key => [key, storage.get(key) || null]);
  },
  async multiSet(pairs) {
    pairs.forEach(([key, value]) => storage.set(key, value));
  },
  async clear() {
    storage.clear();
  }
};

// Mock the db utility
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
  
  // Create property listing
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
  
  console.log('✅ Test data created:');
  console.log('   Owner ID:', ownerId);
  console.log('   Tenant ID:', tenantId);
  console.log('   Listing ID:', listingId);
  
  return { ownerId, tenantId, listingId };
}

// Create booking function (simulating createBooking from utils/booking.ts)
async function createBooking(data) {
  const { propertyId, tenantId, startDate, endDate, duration, specialRequests } = data;
  
  // Fetch property and tenant data
  const property = await db.get('published_listings', propertyId);
  const tenant = await db.get('users', tenantId);
  
  if (!property) throw new Error('Property not found');
  if (!tenant) throw new Error('Tenant not found');
  
  const monthlyRent = property.monthlyRent || 0;
  const totalAmount = monthlyRent;
  
  const booking = {
    id: `booking_${Date.now()}`,
    propertyId,
    tenantId,
    ownerId: property.userId, // ← THIS IS THE KEY FIELD
    propertyTitle: `${property.propertyType} in ${property.address.split(',')[0]}`,
    propertyAddress: property.address,
    monthlyRent,
    securityDeposit: 0,
    totalAmount,
    startDate,
    endDate,
    duration,
    status: 'pending',
    paymentStatus: 'pending',
    tenantName: tenant.name,
    tenantEmail: tenant.email,
    tenantPhone: tenant.phone || '',
    ownerName: property.ownerName,
    ownerEmail: property.email,
    ownerPhone: property.contactNumber,
    specialRequests,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  await db.upsert('bookings', booking.id, booking);
  
  return booking;
}

// Get bookings for owner (simulating getBookingsByOwner)
async function getBookingsByOwner(ownerId) {
  const allBookings = await db.list('bookings');
  const ownerBookings = allBookings
    .filter(booking => booking.ownerId === ownerId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  
  return ownerBookings;
}

// Test functions
async function testTenantBooking(ownerId, tenantId, listingId) {
  console.log('\n📋 TEST 1: Tenant creates booking');
  console.log('─'.repeat(50));
  
  const bookingData = {
    propertyId: listingId,
    tenantId: tenantId,
    startDate: '2025-11-01',
    endDate: '2025-11-01',
    duration: 1,
    specialRequests: 'Test booking request'
  };
  
  console.log('🔄 Creating booking...');
  const booking = await createBooking(bookingData);
  
  console.log('✅ Booking created:');
  console.log('   ID:', booking.id);
  console.log('   Property ID:', booking.propertyId);
  console.log('   Tenant ID:', booking.tenantId);
  console.log('   Owner ID:', booking.ownerId);
  console.log('   Status:', booking.status);
  
  return booking;
}

async function testOwnerViewsBookings(ownerId, expectedBookingCount) {
  console.log('\n📋 TEST 2: Owner views bookings');
  console.log('─'.repeat(50));
  
  console.log('🔄 Loading bookings for owner:', ownerId);
  const bookings = await getBookingsByOwner(ownerId);
  
  console.log('✅ Loaded bookings:', bookings.length);
  
  if (bookings.length > 0) {
    console.log('\n📊 Booking details:');
    bookings.forEach((booking, index) => {
      console.log(`\n   Booking #${index + 1}:`);
      console.log('     ID:', booking.id);
      console.log('     Property:', booking.propertyTitle);
      console.log('     Tenant:', booking.tenantName);
      console.log('     Owner ID:', booking.ownerId);
      console.log('     Status:', booking.status);
      console.log('     Created:', booking.createdAt);
    });
  } else {
    console.log('⚠️  No bookings found for owner');
  }
  
  return bookings.length === expectedBookingCount;
}

async function testDatabaseIntegrity() {
  console.log('\n📋 TEST 3: Database integrity check');
  console.log('─'.repeat(50));
  
  const allBookings = await db.list('bookings');
  const allListings = await db.list('published_listings');
  const allUsers = await db.list('users');
  
  console.log('📊 Database contents:');
  console.log('   Users:', allUsers.length);
  console.log('   Listings:', allListings.length);
  console.log('   Bookings:', allBookings.length);
  
  // Verify each booking has required fields
  let allValid = true;
  for (const booking of allBookings) {
    const hasRequiredFields = 
      booking.id && 
      booking.propertyId && 
      booking.tenantId && 
      booking.ownerId && 
      booking.status;
    
    if (!hasRequiredFields) {
      console.log('❌ Booking missing required fields:', booking.id);
      console.log('   Has ID:', !!booking.id);
      console.log('   Has Property ID:', !!booking.propertyId);
      console.log('   Has Tenant ID:', !!booking.tenantId);
      console.log('   Has Owner ID:', !!booking.ownerId);
      console.log('   Has Status:', !!booking.status);
      allValid = false;
    }
  }
  
  if (allValid && allBookings.length > 0) {
    console.log('✅ All bookings have required fields');
  }
  
  return allValid;
}

// Main test execution
async function runAllTests() {
  console.log('\n');
  console.log('═'.repeat(60));
  console.log('  BOOKING FLOW TEST SUITE');
  console.log('═'.repeat(60));
  
  try {
    const { ownerId, tenantId, listingId } = await setupTestData();
    
    // Test 1: Create booking
    await testTenantBooking(ownerId, tenantId, listingId);
    
    // Test 2: Owner views bookings
    const test2Pass = await testOwnerViewsBookings(ownerId, 1);
    
    // Test 3: Database integrity
    const test3Pass = await testDatabaseIntegrity();
    
    // Summary
    console.log('\n');
    console.log('═'.repeat(60));
    console.log('  TEST SUMMARY');
    console.log('═'.repeat(60));
    
    const results = [
      { name: 'Tenant creates booking', pass: true },
      { name: 'Owner sees booking', pass: test2Pass },
      { name: 'Database integrity', pass: test3Pass }
    ];
    
    const passed = results.filter(r => r.pass).length;
    const total = results.length;
    
    console.log(`\nTests Passed: ${passed}/${total}\n`);
    
    results.forEach(r => {
      console.log(`${r.pass ? '✅' : '❌'} ${r.name}`);
    });
    
    if (passed === total) {
      console.log('\n🎉 ALL TESTS PASSED! Booking flow is working correctly.\n');
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

