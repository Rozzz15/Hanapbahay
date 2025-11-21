/**
 * Utility to fix properties that have wrong availabilityStatus
 * This ensures all seeded properties show up in the listings
 */

import { db } from './db';
import { PublishedListingRecord } from '../types';

export async function fixPropertiesAvailability(): Promise<{
  success: boolean;
  totalProperties: number;
  fixedProperties: number;
  alreadyAvailable: number;
  fixedStatus: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let fixedProperties = 0;
  let alreadyAvailable = 0;
  let fixedStatus = 0;

  try {
    console.log('🔧 Fixing properties availability status...');
    
    const allListings = await db.list<PublishedListingRecord>('published_listings');
    console.log(`📊 Found ${allListings.length} properties in database`);
    
    for (const listing of allListings) {
      try {
        let needsUpdate = false;
        const updatedListing: PublishedListingRecord = { ...listing };
        
        // Fix 1: Ensure status is 'published'
        if (listing.status !== 'published') {
          updatedListing.status = 'published';
          updatedListing.publishedAt = listing.publishedAt || new Date().toISOString();
          needsUpdate = true;
          fixedStatus++;
          console.log(`✅ Fixed property ${listing.id} status: "${listing.status}" → "published"`);
        }
        
        // Fix 2: Ensure availabilityStatus is 'available' (for published properties)
        if (updatedListing.status === 'published' && updatedListing.availabilityStatus !== 'available') {
          updatedListing.availabilityStatus = 'available'; // Set to available so it shows up
          needsUpdate = true;
          fixedProperties++;
          console.log(`✅ Fixed property ${listing.id} availability: "${listing.availabilityStatus}" → "available"`);
        } else if (listing.availabilityStatus === 'available') {
          alreadyAvailable++;
        }
        
        if (needsUpdate) {
          updatedListing.updatedAt = new Date().toISOString();
          await db.upsert('published_listings', listing.id, updatedListing);
        }
      } catch (error) {
        errors.push(`Failed to fix property ${listing.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        console.error(`❌ Error fixing property ${listing.id}:`, error);
      }
    }
    
    console.log('\n📊 Fix Summary:');
    console.log(`   Total Properties: ${allListings.length}`);
    console.log(`   Fixed Availability: ${fixedProperties}`);
    console.log(`   Fixed Status: ${fixedStatus}`);
    console.log(`   Already Available: ${alreadyAvailable}`);
    console.log(`   Errors: ${errors.length}`);
    
    return {
      success: errors.length === 0,
      totalProperties: allListings.length,
      fixedProperties,
      alreadyAvailable,
      fixedStatus,
      errors,
    };
  } catch (error) {
    console.error('❌ Error fixing properties:', error);
    return {
      success: false,
      totalProperties: 0,
      fixedProperties: 0,
      alreadyAvailable: 0,
      fixedStatus: 0,
      errors: [error instanceof Error ? error.message : 'Unknown error'],
    };
  }
}

