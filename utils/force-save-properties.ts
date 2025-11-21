/**
 * Force save properties to ensure they're actually persisted
 * This bypasses cache and writes directly to AsyncStorage
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { db, KEY_PREFIX } from './db';
import { PublishedListingRecord } from '../types';

export async function forceSaveAllProperties(): Promise<{
  success: boolean;
  totalProperties: number;
  savedProperties: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let savedProperties = 0;

  try {
    console.log('\n💾 FORCE SAVING ALL PROPERTIES TO ASYNCSTORAGE...\n');

    // Get all properties from database
    const allListings = await db.list<PublishedListingRecord>('published_listings');
    console.log(`📊 Found ${allListings.length} properties to save`);

    // Read current AsyncStorage data
    const storageKey = KEY_PREFIX + 'published_listings';
    const existingRaw = await AsyncStorage.getItem(storageKey);
    const existingData = existingRaw ? JSON.parse(existingRaw) : {};

    // Add/update all properties
    for (const listing of allListings) {
      if (!listing.id) {
        errors.push(`Property missing ID: ${listing.address || 'Unknown'}`);
        continue;
      }

      try {
        // Ensure property has all required fields
        const propertyToSave: PublishedListingRecord = {
          ...listing,
          status: 'published', // Ensure status is published
          availabilityStatus: 'available', // Ensure availability is available
          publishedAt: listing.publishedAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        // Add to existing data
        existingData[listing.id] = propertyToSave;
        savedProperties++;
        console.log(`✅ Prepared property ${listing.id} for save`);
      } catch (error) {
        errors.push(`Failed to prepare property ${listing.id}: ${error instanceof Error ? error.message : 'Unknown'}`);
      }
    }

    // Write entire collection to AsyncStorage
    console.log(`\n💾 Writing ${Object.keys(existingData).length} properties to AsyncStorage...`);
    const jsonData = JSON.stringify(existingData);
    await AsyncStorage.setItem(storageKey, jsonData);

    // Verify write
    const verifyRaw = await AsyncStorage.getItem(storageKey);
    if (verifyRaw === jsonData) {
      console.log('✅ AsyncStorage write verified successfully');
    } else {
      console.error('❌ AsyncStorage write verification failed');
      errors.push('AsyncStorage write verification failed');
    }

    // Clear cache to force fresh read
    const { clearCollectionCache } = await import('./db');
    clearCollectionCache('published_listings');

    // Verify via db.list
    const verifyListings = await db.list('published_listings');
    console.log(`✅ Verified: ${verifyListings.length} properties can be read from database`);

    console.log('\n📊 FORCE SAVE SUMMARY:');
    console.log('═'.repeat(60));
    console.log(`Total Properties: ${allListings.length}`);
    console.log(`Saved: ${savedProperties} ✅`);
    console.log(`Errors: ${errors.length} ${errors.length > 0 ? '❌' : '✅'}`);
    console.log('═'.repeat(60));

    return {
      success: errors.length === 0,
      totalProperties: allListings.length,
      savedProperties,
      errors,
    };
  } catch (error) {
    console.error('❌ Error force saving properties:', error);
    return {
      success: false,
      totalProperties: 0,
      savedProperties: 0,
      errors: [error instanceof Error ? error.message : 'Unknown error'],
    };
  }
}







