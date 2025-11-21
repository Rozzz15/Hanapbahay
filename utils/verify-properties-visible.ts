/**
 * Comprehensive verification to check if all properties are visible
 */

import { db } from './db';
import { PublishedListingRecord } from '../types';
import { areAllRoomsFullyOccupied } from './listing-capacity';

export async function verifyPropertiesVisible(): Promise<{
  totalProperties: number;
  visibleProperties: number;
  hiddenProperties: number;
  issues: Array<{
    propertyId: string;
    address: string;
    reason: string;
  }>;
}> {
  const issues: Array<{ propertyId: string; address: string; reason: string }> = [];
  let visibleCount = 0;
  let hiddenCount = 0;

  try {
    console.log('\n🔍 VERIFYING PROPERTIES VISIBILITY...\n');

    const allListings = await db.list<PublishedListingRecord>('published_listings');
    console.log(`📊 Total properties in database: ${allListings.length}`);

    for (const listing of allListings) {
      const reasons: string[] = [];

      // Check 1: Has ID
      if (!listing.id) {
        reasons.push('No ID');
      }

      // Check 2: Status is 'published'
      if (listing.status !== 'published') {
        reasons.push(`Status is "${listing.status}" not "published"`);
      }

      // Check 3: availabilityStatus is 'available'
      if (listing.availabilityStatus !== 'available') {
        reasons.push(`availabilityStatus is "${listing.availabilityStatus}" not "available"`);
      }

      // Check 4: Not all rooms fully occupied
      try {
        const allRoomsOccupied = await areAllRoomsFullyOccupied(listing);
        if (allRoomsOccupied) {
          reasons.push('All rooms fully occupied');
        }
      } catch (error) {
        reasons.push(`Capacity check failed: ${error instanceof Error ? error.message : 'Unknown'}`);
      }

      if (reasons.length > 0) {
        hiddenCount++;
        issues.push({
          propertyId: listing.id || 'NO_ID',
          address: listing.address || 'NO_ADDRESS',
          reason: reasons.join(', '),
        });
        console.log(`❌ Property ${listing.id} will be HIDDEN: ${reasons.join(', ')}`);
      } else {
        visibleCount++;
        console.log(`✅ Property ${listing.id} will be VISIBLE`);
      }
    }

    console.log('\n📊 SUMMARY:');
    console.log('═'.repeat(60));
    console.log(`Total Properties: ${allListings.length}`);
    console.log(`Visible: ${visibleCount} ✅`);
    console.log(`Hidden: ${hiddenCount} ❌`);
    console.log('═'.repeat(60));

    if (issues.length > 0) {
      console.log('\n⚠️ HIDDEN PROPERTIES:');
      issues.slice(0, 10).forEach((issue, i) => {
        console.log(`${i + 1}. ${issue.propertyId}`);
        console.log(`   Address: ${issue.address}`);
        console.log(`   Reason: ${issue.reason}`);
      });
      if (issues.length > 10) {
        console.log(`   ... and ${issues.length - 10} more`);
      }
    }

    return {
      totalProperties: allListings.length,
      visibleProperties: visibleCount,
      hiddenProperties: hiddenCount,
      issues,
    };
  } catch (error) {
    console.error('❌ Error verifying properties:', error);
    return {
      totalProperties: 0,
      visibleProperties: 0,
      hiddenProperties: 0,
      issues: [{
        propertyId: 'ERROR',
        address: 'Error occurred',
        reason: error instanceof Error ? error.message : 'Unknown error',
      }],
    };
  }
}







