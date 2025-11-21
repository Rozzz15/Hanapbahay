/**
 * Utility to clear all seeded/default data from the app
 * This removes:
 * - Seeded owners (users with role 'owner' created by seed)
 * - Seeded properties (published_listings)
 * - Seeded owner applications
 * - Mock auth entries for seeded owners
 */

import { db, clearCache } from './db';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DbUserRecord, PublishedListingRecord, OwnerApplicationRecord } from '../types';

export async function clearAllSeedData(): Promise<{
  success: boolean;
  removedOwners: number;
  removedProperties: number;
  removedApplications: number;
  removedMockAuth: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let removedOwners = 0;
  let removedProperties = 0;
  let removedApplications = 0;
  let removedMockAuth = 0;

  try {
    console.log('\n🗑️ CLEARING ALL SEED DATA...\n');
    console.log('═'.repeat(60));

    // Step 1: Get all seeded owners (owners created by seed script)
    // We'll identify them by checking if they have a seeded email pattern
    console.log('1️⃣ Finding seeded owners...');
    const allUsers = await db.list<DbUserRecord>('users');
    const seededOwnerEmails = new Set<string>();
    
    // Seed emails follow pattern: firstname@gmail.com or firstname{number}@gmail.com
    const seededOwners = allUsers.filter(user => {
      if (user.role !== 'owner') return false;
      if (!user.email) return false;
      
      const email = user.email.toLowerCase();
      // Check if email matches seed pattern (name@gmail.com or name{number}@gmail.com)
      const isSeededEmail = /^[a-z]+(\d+)?@gmail\.com$/.test(email);
      
      if (isSeededEmail) {
        seededOwnerEmails.add(email);
        return true;
      }
      return false;
    });

    console.log(`   Found ${seededOwners.length} seeded owners`);

    // Step 2: Remove seeded owners from users collection
    console.log('\n2️⃣ Removing seeded owners from database...');
    for (const owner of seededOwners) {
      try {
        if (owner.id) {
          await db.remove('users', owner.id);
          removedOwners++;
          console.log(`   ✅ Removed owner: ${owner.email}`);
        }
      } catch (error) {
        errors.push(`Failed to remove owner ${owner.email}: ${error instanceof Error ? error.message : 'Unknown'}`);
        console.error(`   ❌ Error removing owner ${owner.email}:`, error);
      }
    }

    // Step 3: Remove all properties (we'll remove all since seed creates all of them)
    // Or we can be more selective and only remove properties owned by seeded owners
    console.log('\n3️⃣ Removing seeded properties...');
    const allProperties = await db.list<PublishedListingRecord>('published_listings');
    
    // Remove properties owned by seeded owners
    const seededOwnerIds = new Set(seededOwners.map(o => o.id).filter(Boolean));
    const propertiesToRemove = allProperties.filter(prop => {
      return seededOwnerIds.has(prop.userId) || seededOwnerIds.has(prop.ownerUserId);
    });

    console.log(`   Found ${propertiesToRemove.length} properties to remove`);
    
    for (const property of propertiesToRemove) {
      try {
        if (property.id) {
          await db.remove('published_listings', property.id);
          removedProperties++;
        }
      } catch (error) {
        errors.push(`Failed to remove property ${property.id}: ${error instanceof Error ? error.message : 'Unknown'}`);
        console.error(`   ❌ Error removing property ${property.id}:`, error);
      }
    }

    // Step 4: Remove seeded owner applications
    console.log('\n4️⃣ Removing seeded owner applications...');
    const allApplications = await db.list<OwnerApplicationRecord>('owner_applications');
    const applicationsToRemove = allApplications.filter(app => {
      return seededOwnerEmails.has(app.email?.toLowerCase() || '');
    });

    console.log(`   Found ${applicationsToRemove.length} applications to remove`);
    
    for (const app of applicationsToRemove) {
      try {
        if (app.id) {
          await db.remove('owner_applications', app.id);
          removedApplications++;
        }
      } catch (error) {
        errors.push(`Failed to remove application ${app.id}: ${error instanceof Error ? error.message : 'Unknown'}`);
        console.error(`   ❌ Error removing application ${app.id}:`, error);
      }
    }

    // Step 5: Remove seeded owners from mock auth
    console.log('\n5️⃣ Removing seeded owners from mock auth...');
    const MOCK_USERS_KEY = 'mock_users_database';
    const mockAuthData = await AsyncStorage.getItem(MOCK_USERS_KEY);
    
    if (mockAuthData) {
      const authData = JSON.parse(mockAuthData);
      const originalCount = Object.keys(authData).length;
      
      // Remove seeded email entries
      for (const email of seededOwnerEmails) {
        const normalizedEmail = email.toLowerCase();
        if (authData[normalizedEmail]) {
          delete authData[normalizedEmail];
          removedMockAuth++;
          console.log(`   ✅ Removed from mock auth: ${normalizedEmail}`);
        }
      }
      
      // Save updated mock auth data
      if (removedMockAuth > 0) {
        await AsyncStorage.setItem(MOCK_USERS_KEY, JSON.stringify(authData));
        console.log(`   ✅ Updated mock auth (removed ${removedMockAuth} entries)`);
      }
    }

    // Step 6: Clear cache
    console.log('\n6️⃣ Clearing database cache...');
    await clearCache();

    // Summary
    console.log('\n📊 CLEAR SUMMARY:');
    console.log('═'.repeat(60));
    console.log(`Owners Removed: ${removedOwners}`);
    console.log(`Properties Removed: ${removedProperties}`);
    console.log(`Applications Removed: ${removedApplications}`);
    console.log(`Mock Auth Entries Removed: ${removedMockAuth}`);
    console.log(`Errors: ${errors.length}`);
    console.log('═'.repeat(60));

    if (errors.length > 0) {
      console.log('\n⚠️ ERRORS:');
      errors.forEach((error, i) => {
        console.log(`   ${i + 1}. ${error}`);
      });
    }

    return {
      success: errors.length === 0,
      removedOwners,
      removedProperties,
      removedApplications,
      removedMockAuth,
      errors,
    };
  } catch (error) {
    console.error('❌ Error clearing seed data:', error);
    return {
      success: false,
      removedOwners: 0,
      removedProperties: 0,
      removedApplications: 0,
      removedMockAuth: 0,
      errors: [error instanceof Error ? error.message : 'Unknown error'],
    };
  }
}

/**
 * Nuclear option: Clear ALL data (use with caution!)
 * This removes everything from the database
 */
export async function clearAllData(): Promise<{
  success: boolean;
  errors: string[];
}> {
  const errors: string[] = [];

  try {
    console.log('\n⚠️ NUCLEAR OPTION: CLEARING ALL DATA...\n');
    console.log('═'.repeat(60));
    console.log('⚠️ WARNING: This will remove ALL data from the app!');
    console.log('═'.repeat(60));

    // Clear all collections
    const collections = [
      'users',
      'published_listings',
      'owner_applications',
      'owner_profiles',
      'bookings',
      'messages',
      'conversations',
      'property_photos',
      'property_videos',
      'property_ratings',
    ];

    for (const collection of collections) {
      try {
        const { KEY_PREFIX } = await import('./db');
        const key = KEY_PREFIX + collection;
        await AsyncStorage.removeItem(key);
        console.log(`   ✅ Cleared: ${collection}`);
      } catch (error) {
        errors.push(`Failed to clear ${collection}: ${error instanceof Error ? error.message : 'Unknown'}`);
        console.error(`   ❌ Error clearing ${collection}:`, error);
      }
    }

    // Clear mock auth
    try {
      await AsyncStorage.removeItem('mock_users_database');
      console.log(`   ✅ Cleared: mock_users_database`);
    } catch (error) {
      errors.push(`Failed to clear mock auth: ${error instanceof Error ? error.message : 'Unknown'}`);
    }

    // Clear cache
    await clearCache();

    console.log('\n✅ ALL DATA CLEARED');
    return {
      success: errors.length === 0,
      errors,
    };
  } catch (error) {
    console.error('❌ Error clearing all data:', error);
    return {
      success: false,
      errors: [error instanceof Error ? error.message : 'Unknown error'],
    };
  }
}







