/**
 * Test to verify data is actually being saved and can be retrieved
 */

import { db } from './db';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PublishedListingRecord } from '../types';

export async function testDataPersistence(): Promise<{
  success: boolean;
  canWrite: boolean;
  canRead: boolean;
  canList: boolean;
  testPropertyId?: string;
  errors: string[];
}> {
  const errors: string[] = [];
  let canWrite = false;
  let canRead = false;
  let canList = false;
  let testPropertyId: string | undefined;

  try {
    console.log('\n🧪 TESTING DATA PERSISTENCE...\n');

    // Test 1: Write a test property
    console.log('1️⃣ Testing write...');
    testPropertyId = `test_listing_${Date.now()}`;
    const testProperty: PublishedListingRecord = {
      id: testPropertyId,
      userId: 'test_user',
      propertyType: 'apartment',
      rentalType: 'entire-place',
      address: '123 Test Street, Test City',
      barangay: 'RIZAL',
      rooms: 2,
      bathrooms: 1,
      monthlyRent: 10000,
      amenities: ['wifi'],
      rules: ['no-smoking'],
      photos: [],
      videos: [],
      coverPhoto: null,
      securityDeposit: 0, // Security deposit feature removed
      paymentMethods: ['cash'],
      ownerName: 'Test Owner',
      businessName: 'Test Business',
      contactNumber: '+639101234567',
      email: 'test@test.com',
      emergencyContact: '+639101234567',
      availabilityStatus: 'available',
      leaseTerm: 'long-term',
      status: 'published',
      publishedAt: new Date().toISOString(),
      title: 'Test Property',
      location: 'Test Location',
      size: 50,
      price: 10000,
      ownerUserId: 'test_user',
      capacity: 2,
    };

    try {
      await db.upsert('published_listings', testPropertyId, testProperty);
      console.log('✅ Write test: PASSED');
      canWrite = true;
    } catch (error) {
      console.error('❌ Write test: FAILED', error);
      errors.push(`Write failed: ${error instanceof Error ? error.message : 'Unknown'}`);
    }

    // Test 2: Read the test property
    console.log('2️⃣ Testing read...');
    if (testPropertyId) {
      try {
        const retrieved = await db.get('published_listings', testPropertyId);
        if (retrieved && retrieved.id === testPropertyId) {
          console.log('✅ Read test: PASSED');
          canRead = true;
        } else {
          console.error('❌ Read test: FAILED - Property not found or ID mismatch');
          errors.push('Read failed: Property not found after write');
        }
      } catch (error) {
        console.error('❌ Read test: FAILED', error);
        errors.push(`Read failed: ${error instanceof Error ? error.message : 'Unknown'}`);
      }
    }

    // Test 3: List all properties
    console.log('3️⃣ Testing list...');
    try {
      const allListings = await db.list('published_listings');
      console.log(`✅ List test: PASSED (found ${allListings.length} properties)`);
      canList = true;
      
      // Check if test property is in the list
      const foundTest = allListings.find((l: any) => l.id === testPropertyId);
      if (foundTest) {
        console.log('✅ Test property found in list');
      } else {
        console.warn('⚠️ Test property not found in list (but write/read worked)');
      }
    } catch (error) {
      console.error('❌ List test: FAILED', error);
      errors.push(`List failed: ${error instanceof Error ? error.message : 'Unknown'}`);
    }

    // Test 4: Check AsyncStorage directly
    console.log('4️⃣ Testing AsyncStorage directly...');
    try {
      const key = 'hb_db_published_listings';
      const raw = await AsyncStorage.getItem(key);
      if (raw) {
        const data = JSON.parse(raw);
        const count = Object.keys(data).length;
        console.log(`✅ AsyncStorage test: PASSED (found ${count} properties in storage)`);
        
        // Check if test property is in AsyncStorage
        if (data[testPropertyId]) {
          console.log('✅ Test property found in AsyncStorage');
        } else {
          console.warn('⚠️ Test property not in AsyncStorage (but db.get worked)');
        }
      } else {
        console.warn('⚠️ AsyncStorage is empty for published_listings');
        errors.push('AsyncStorage is empty');
      }
    } catch (error) {
      console.error('❌ AsyncStorage test: FAILED', error);
      errors.push(`AsyncStorage check failed: ${error instanceof Error ? error.message : 'Unknown'}`);
    }

    // Clean up test property
    if (testPropertyId) {
      try {
        await db.remove('published_listings', testPropertyId);
        console.log('✅ Test property cleaned up');
      } catch (error) {
        console.warn('⚠️ Could not clean up test property:', error);
      }
    }

    const success = canWrite && canRead && canList && errors.length === 0;

    console.log('\n📊 PERSISTENCE TEST SUMMARY:');
    console.log('═'.repeat(60));
    console.log(`Write: ${canWrite ? '✅' : '❌'}`);
    console.log(`Read: ${canRead ? '✅' : '❌'}`);
    console.log(`List: ${canList ? '✅' : '❌'}`);
    console.log(`Overall: ${success ? '✅ PASSED' : '❌ FAILED'}`);
    console.log('═'.repeat(60));

    return {
      success,
      canWrite,
      canRead,
      canList,
      testPropertyId,
      errors,
    };
  } catch (error) {
    console.error('❌ Persistence test error:', error);
    return {
      success: false,
      canWrite: false,
      canRead: false,
      canList: false,
      errors: [error instanceof Error ? error.message : 'Unknown error'],
    };
  }
}


