/**
 * Comprehensive diagnostic to find why properties aren't showing
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { db, KEY_PREFIX } from './db';
import { PublishedListingRecord } from '../types';

export async function diagnoseMissingProperties(): Promise<{
  success: boolean;
  inAsyncStorage: number;
  inDatabase: number;
  inCache: number;
  canRead: boolean;
  issues: string[];
  rawData: any;
}> {
  const issues: string[] = [];
  let inAsyncStorage = 0;
  let inDatabase = 0;
  let inCache = 0;
  let canRead = false;
  let rawData: any = null;

  try {
    console.log('\n🔍 DIAGNOSING MISSING PROPERTIES...\n');
    console.log('═'.repeat(60));

    // Check 1: AsyncStorage directly
    console.log('1️⃣ Checking AsyncStorage directly...');
    const storageKey = KEY_PREFIX + 'published_listings';
    const raw = await AsyncStorage.getItem(storageKey);
    
    if (raw) {
      rawData = JSON.parse(raw);
      inAsyncStorage = Object.keys(rawData).length;
      console.log(`   ✅ Found ${inAsyncStorage} properties in AsyncStorage`);
      
      // Show sample property IDs
      const sampleIds = Object.keys(rawData).slice(0, 5);
      console.log(`   Sample IDs: ${sampleIds.join(', ')}`);
      
      // Check if properties have correct structure
      const sampleProp = rawData[sampleIds[0]];
      if (sampleProp) {
        console.log(`   Sample property structure:`, {
          hasId: !!sampleProp.id,
          hasStatus: !!sampleProp.status,
          status: sampleProp.status,
          hasAvailabilityStatus: !!sampleProp.availabilityStatus,
          availabilityStatus: sampleProp.availabilityStatus,
          hasAddress: !!sampleProp.address,
        });
      }
    } else {
      console.log('   ❌ NO DATA in AsyncStorage for published_listings');
      issues.push('No data in AsyncStorage');
    }

    // Check 2: Database read
    console.log('\n2️⃣ Checking database read...');
    try {
      const { clearCollectionCache } = await import('./db');
      clearCollectionCache('published_listings'); // Clear cache first
      
      const dbListings = await db.list('published_listings');
      inDatabase = dbListings.length;
      console.log(`   ✅ Found ${inDatabase} properties via db.list()`);
      
      if (inDatabase > 0) {
        const sample = dbListings[0] as PublishedListingRecord;
        console.log(`   Sample property:`, {
          id: sample.id,
          status: sample.status,
          availabilityStatus: sample.availabilityStatus,
          address: sample.address,
        });
        canRead = true;
      } else {
        issues.push('db.list() returns empty array');
      }
    } catch (error) {
      console.error('   ❌ Error reading from database:', error);
      issues.push(`Database read error: ${error instanceof Error ? error.message : 'Unknown'}`);
    }

    // Check 3: Cache
    console.log('\n3️⃣ Checking cache...');
    try {
      // Access cache directly (if possible)
      const cacheKey = KEY_PREFIX + 'published_listings';
      // Cache is internal, but we can check if db.list works
      const cachedListings = await db.list('published_listings');
      inCache = cachedListings.length;
      console.log(`   Cache check: ${inCache} properties (via db.list)`);
    } catch (error) {
      console.error('   ❌ Cache check error:', error);
    }

    // Check 4: Verify property structure
    console.log('\n4️⃣ Verifying property structure...');
    if (inDatabase > 0) {
      const listings = await db.list<PublishedListingRecord>('published_listings');
      let validCount = 0;
      let invalidCount = 0;
      
      for (const listing of listings) {
        const isValid = 
          listing.id &&
          listing.status === 'published' &&
          listing.availabilityStatus === 'available';
        
        if (isValid) {
          validCount++;
        } else {
          invalidCount++;
          issues.push(`Invalid property ${listing.id}: status=${listing.status}, availability=${listing.availabilityStatus}`);
        }
      }
      
      console.log(`   Valid properties: ${validCount}`);
      console.log(`   Invalid properties: ${invalidCount}`);
    }

    // Check 5: Test a specific property
    console.log('\n5️⃣ Testing specific property read...');
    if (inDatabase > 0) {
      const listings = await db.list('published_listings');
      const testId = listings[0]?.id;
      if (testId) {
        try {
          const testProp = await db.get('published_listings', testId);
          if (testProp) {
            console.log(`   ✅ Can read property ${testId} via db.get()`);
          } else {
            console.log(`   ❌ Cannot read property ${testId} via db.get()`);
            issues.push(`Cannot read property ${testId} via db.get()`);
          }
        } catch (error) {
          console.error(`   ❌ Error reading property ${testId}:`, error);
          issues.push(`Error reading property: ${error instanceof Error ? error.message : 'Unknown'}`);
        }
      }
    }

    // Summary
    console.log('\n📊 DIAGNOSTIC SUMMARY:');
    console.log('═'.repeat(60));
    console.log(`AsyncStorage: ${inAsyncStorage} properties`);
    console.log(`Database (db.list): ${inDatabase} properties`);
    console.log(`Can Read: ${canRead ? '✅' : '❌'}`);
    console.log(`Issues: ${issues.length}`);
    console.log('═'.repeat(60));

    if (issues.length > 0) {
      console.log('\n⚠️ ISSUES FOUND:');
      issues.forEach((issue, i) => {
        console.log(`   ${i + 1}. ${issue}`);
      });
    }

    // Recommendations
    console.log('\n💡 RECOMMENDATIONS:');
    if (inAsyncStorage > 0 && inDatabase === 0) {
      console.log('   → Properties exist in AsyncStorage but db.list() returns empty');
      console.log('   → Try: clearCache() and reload');
    } else if (inAsyncStorage === 0) {
      console.log('   → No properties in AsyncStorage - seed may not have run');
      console.log('   → Try: Run seed again');
    } else if (inDatabase > 0) {
      const listings = await db.list('published_listings');
      const valid = listings.filter((l: any) => 
        l.status === 'published' && l.availabilityStatus === 'available'
      );
      if (valid.length < listings.length) {
        console.log(`   → ${listings.length - valid.length} properties have wrong status/availability`);
        console.log('   → Try: fixPropertiesAvailability()');
      } else {
        console.log('   → Properties exist and are valid');
        console.log('   → Check app code for filtering issues');
      }
    }

    return {
      success: issues.length === 0 && inDatabase > 0,
      inAsyncStorage,
      inDatabase,
      inCache,
      canRead,
      issues,
      rawData: inAsyncStorage > 0 ? { count: inAsyncStorage, sampleIds: Object.keys(rawData).slice(0, 3) } : null,
    };
  } catch (error) {
    console.error('❌ Diagnostic error:', error);
    return {
      success: false,
      inAsyncStorage: 0,
      inDatabase: 0,
      inCache: 0,
      canRead: false,
      issues: [error instanceof Error ? error.message : 'Unknown error'],
      rawData: null,
    };
  }
}







