/**
 * Utility to migrate business names from published listings to owner profiles
 * This is a one-time migration to update existing owner profiles with business names
 */

import { db } from './db';

export async function migrateBusinessNamesToProfiles() {
  try {
    console.log('🔄 Starting business name migration...');
    
    // Get all published listings
    const allListings = await db.list('published_listings') as any[];
    console.log(`📋 Found ${allListings.length} published listings`);
    
    // Group listings by owner
    const ownerListingsMap = new Map<string, any[]>();
    for (const listing of allListings) {
      if (listing.userId) {
        if (!ownerListingsMap.has(listing.userId)) {
          ownerListingsMap.set(listing.userId, []);
        }
        ownerListingsMap.get(listing.userId)!.push(listing);
      }
    }
    
    console.log(`👥 Found ${ownerListingsMap.size} unique owners`);
    
    let updatedCount = 0;
    let createdCount = 0;
    let skippedCount = 0;
    
    // Update each owner's profile
    for (const [ownerId, listings] of ownerListingsMap.entries()) {
      try {
        // Find the first listing with a business name
        const listingWithBusinessName = listings.find(l => l.businessName && l.businessName.trim() !== '');
        
        if (!listingWithBusinessName) {
          console.log(`⚠️ No business name found for owner ${ownerId}`);
          skippedCount++;
          continue;
        }
        
        const businessName = listingWithBusinessName.businessName.trim();
        
        // Check if owner profile exists
        try {
          const existingProfile = await db.get('owner_profiles', ownerId) as any;
          
          if (existingProfile) {
            // Only update if business name is not already set
            if (!existingProfile.businessName || existingProfile.businessName.trim() === '') {
              await db.upsert('owner_profiles', ownerId, {
                ...existingProfile,
                businessName: businessName,
                updatedAt: new Date().toISOString()
              });
              console.log(`✅ Updated owner profile for ${ownerId} with business name: ${businessName}`);
              updatedCount++;
            } else {
              console.log(`ℹ️ Owner ${ownerId} already has business name: ${existingProfile.businessName}`);
              skippedCount++;
            }
          } else {
            // Create new owner profile
            await db.upsert('owner_profiles', ownerId, {
              userId: ownerId,
              businessName: businessName,
              contactNumber: listingWithBusinessName.contactNumber || '',
              email: listingWithBusinessName.email || '',
              createdAt: new Date().toISOString()
            });
            console.log(`✅ Created new owner profile for ${ownerId} with business name: ${businessName}`);
            createdCount++;
          }
        } catch (profileError) {
          console.error(`❌ Error processing owner ${ownerId}:`, profileError);
        }
      } catch (error) {
        console.error(`❌ Error processing owner ${ownerId}:`, error);
      }
    }
    
    console.log('✅ Migration completed!');
    console.log(`   - Created: ${createdCount} profiles`);
    console.log(`   - Updated: ${updatedCount} profiles`);
    console.log(`   - Skipped: ${skippedCount} owners`);
    
    return {
      success: true,
      created: createdCount,
      updated: updatedCount,
      skipped: skippedCount,
      total: ownerListingsMap.size
    };
  } catch (error) {
    console.error('❌ Migration failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      created: 0,
      updated: 0,
      skipped: 0,
      total: 0
    };
  }
}

// Export for use in debug/development
if (typeof window !== 'undefined') {
  (window as any).migrateBusinessNames = migrateBusinessNamesToProfiles;
}

