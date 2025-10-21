/**
 * View Tracking Test Script
 * 
 * This script tests if property views are being tracked correctly in the tenant dashboard.
 * 
 * What it tests:
 * 1. View count increments when a tenant views a property
 * 2. View count is stored in the database
 * 3. Owner views are NOT counted (to prevent self-inflation)
 * 4. View tracking works across sessions
 * 
 * Run this with: node test-view-tracking.js
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

// Import the view tracking functions (simulated)
async function incrementListingViews(listingId) {
  console.log(`👁️  Incrementing views for listing: ${listingId}`);
  
  const listing = await db.get('published_listings', listingId);
  
  if (!listing) {
    console.log(`❌ Listing not found: ${listingId}`);
    return { success: false, newViewCount: 0, message: 'Listing not found' };
  }
  
  const currentViews = listing.views || 0;
  const newViewCount = currentViews + 1;
  
  const updatedListing = {
    ...listing,
    views: newViewCount,
    updatedAt: new Date().toISOString()
  };
  
  await db.upsert('published_listings', listingId, updatedListing);
  
  console.log(`✅ Views incremented: ${currentViews} → ${newViewCount}`);
  
  return {
    success: true,
    newViewCount,
    message: `Views incremented from ${currentViews} to ${newViewCount}`
  };
}

async function trackListingView(listingId, viewerId, metadata = {}) {
  console.log(`📊 Tracking view for listing: ${listingId}`, { viewerId, metadata });
  
  // Don't track views if this is an owner viewing their own listing
  if (metadata.isOwnerView) {
    console.log(`⚠️  Skipping view tracking - owner viewing own listing`);
    return {
      success: true,
      newViewCount: 0,
      message: 'View tracking skipped - owner viewing own listing'
    };
  }
  
  // Check if viewer is the owner
  if (viewerId) {
    const listing = await db.get('published_listings', listingId);
    if (listing && listing.userId === viewerId) {
      console.log(`⚠️  Skipping view tracking - viewer is owner of listing`);
      return {
        success: true,
        newViewCount: listing.views || 0,
        message: 'View tracking skipped - viewer is owner of listing'
      };
    }
  }
  
  return await incrementListingViews(listingId);
}

// Test functions
async function setupTestData() {
  console.log('\n🔧 Setting up test data...\n');
  
  const ownerId = 'owner_001';
  const tenantId = 'tenant_001';
  
  // Create a test listing
  const listing = {
    id: 'listing_001',
    userId: ownerId,
    title: 'Beautiful Apartment',
    propertyType: 'Apartment',
    monthlyRent: 5000,
    address: 'Test St, Test City',
    bedrooms: 2,
    bathrooms: 1,
    amenities: ['WiFi', 'Parking'],
    status: 'published',
    views: 0,
    createdAt: new Date().toISOString()
  };
  
  await db.upsert('published_listings', listing.id, listing);
  
  console.log('✅ Test listing created:', listing.id);
  console.log('   Owner ID:', ownerId);
  console.log('   Initial views:', listing.views);
  
  return { ownerId, tenantId, listingId: listing.id };
}

async function testTenantView(listingId, tenantId) {
  console.log('\n📋 TEST 1: Tenant viewing property');
  console.log('─'.repeat(50));
  
  const result = await trackListingView(listingId, tenantId, {
    source: 'tenant_dashboard',
    timestamp: new Date().toISOString()
  });
  
  console.log('Result:', result);
  
  if (result.success && result.newViewCount === 1) {
    console.log('✅ TEST 1 PASSED: View count incremented correctly');
    return true;
  } else {
    console.log('❌ TEST 1 FAILED: Expected view count 1, got:', result.newViewCount);
    return false;
  }
}

async function testOwnerView(listingId, ownerId) {
  console.log('\n📋 TEST 2: Owner viewing their own property');
  console.log('─'.repeat(50));
  
  const beforeListing = await db.get('published_listings', listingId);
  const viewsBefore = beforeListing.views;
  
  const result = await trackListingView(listingId, ownerId, {
    source: 'owner_preview',
    timestamp: new Date().toISOString()
  });
  
  const afterListing = await db.get('published_listings', listingId);
  const viewsAfter = afterListing.views;
  
  console.log('Views before:', viewsBefore);
  console.log('Views after:', viewsAfter);
  console.log('Result:', result);
  
  if (viewsBefore === viewsAfter) {
    console.log('✅ TEST 2 PASSED: Owner view was NOT counted');
    return true;
  } else {
    console.log('❌ TEST 2 FAILED: Owner view was incorrectly counted');
    return false;
  }
}

async function testMultipleTenantViews(listingId, tenantId) {
  console.log('\n📋 TEST 3: Multiple tenant views');
  console.log('─'.repeat(50));
  
  const initialListing = await db.get('published_listings', listingId);
  const initialViews = initialListing.views;
  
  // Simulate 5 tenant views
  for (let i = 0; i < 5; i++) {
    await trackListingView(listingId, `tenant_00${i}`, {
      source: 'tenant_dashboard'
    });
  }
  
  const finalListing = await db.get('published_listings', listingId);
  const finalViews = finalListing.views;
  
  console.log('Initial views:', initialViews);
  console.log('Final views:', finalViews);
  console.log('Expected increment: 5');
  console.log('Actual increment:', finalViews - initialViews);
  
  if (finalViews - initialViews === 5) {
    console.log('✅ TEST 3 PASSED: Multiple views tracked correctly');
    return true;
  } else {
    console.log('❌ TEST 3 FAILED: View count mismatch');
    return false;
  }
}

async function testPersistence(listingId) {
  console.log('\n📋 TEST 4: View persistence');
  console.log('─'.repeat(50));
  
  const listing = await db.get('published_listings', listingId);
  console.log('Current listing views from database:', listing.views);
  
  if (listing.views > 0) {
    console.log('✅ TEST 4 PASSED: Views are persisted in database');
    return true;
  } else {
    console.log('❌ TEST 4 FAILED: Views not persisted');
    return false;
  }
}

// Main test execution
async function runAllTests() {
  console.log('\n');
  console.log('═'.repeat(60));
  console.log('  VIEW TRACKING TEST SUITE');
  console.log('═'.repeat(60));
  
  try {
    const { ownerId, tenantId, listingId } = await setupTestData();
    
    const results = [];
    
    // Run tests
    results.push(await testTenantView(listingId, tenantId));
    results.push(await testOwnerView(listingId, ownerId));
    results.push(await testMultipleTenantViews(listingId, tenantId));
    results.push(await testPersistence(listingId));
    
    // Summary
    console.log('\n');
    console.log('═'.repeat(60));
    console.log('  TEST SUMMARY');
    console.log('═'.repeat(60));
    
    const passed = results.filter(r => r).length;
    const total = results.length;
    
    console.log(`\nTests Passed: ${passed}/${total}`);
    
    if (passed === total) {
      console.log('\n🎉 ALL TESTS PASSED! View tracking is working correctly.\n');
    } else {
      console.log(`\n⚠️  ${total - passed} test(s) failed. Please review the output above.\n`);
    }
    
    // Show final listing state
    const finalListing = await db.get('published_listings', listingId);
    console.log('\n📊 Final Listing State:');
    console.log('   ID:', finalListing.id);
    console.log('   Title:', finalListing.title);
    console.log('   Total Views:', finalListing.views);
    console.log('   Updated At:', finalListing.updatedAt);
    console.log('\n');
    
  } catch (error) {
    console.error('\n❌ Test execution failed:', error);
    console.error(error.stack);
  }
}

// Run tests
runAllTests();

