import { db } from './db';
import { DbUserRecord, PublishedListingRecord, BookingRecord, OwnerApplicationRecord } from '../types';
import { verifyApprovedOwnersDatabase, getApprovedOwnersForBarangay } from './database-verification';

export interface BrgyDashboardStats {
  totalResidents: number;
  totalProperties: number;
  totalListings: number;
  activeBookings: number;
  totalApprovedOwners: number;
}

export async function getBrgyDashboardStats(
  barangayName: string
): Promise<BrgyDashboardStats> {
  try {
    // Get all users
    const allUsers = await db.list<DbUserRecord>('users');
    
    // Get all listings
    const allListings = await db.list<PublishedListingRecord>('published_listings');
    
    // Get ACTIVE listings in this barangay (only available, not occupied or reserved)
    const listingsInBarangay = allListings.filter(listing => {
      // First check if listing is active (only 'available' status)
      const isActive = listing.availabilityStatus === 'available';
      
      // Check barangay match
      let isInBarangay = false;
      if (listing.barangay) {
        const listingBarangay = listing.barangay.trim().toUpperCase();
        const targetBarangay = barangayName.trim().toUpperCase();
        console.log(`🔍 Comparing listing barangay "${listingBarangay}" with target "${targetBarangay}"`);
        isInBarangay = listingBarangay === targetBarangay;
      } else {
        // Fallback: if barangay field not set, check via user
        const listingUser = allUsers.find(u => u.id === listing.userId);
        const userBarangay = listingUser && (listingUser as any).barangay;
        isInBarangay = userBarangay ? userBarangay.trim().toUpperCase() === barangayName.trim().toUpperCase() : false;
      }
      
      return isActive && isInBarangay;
    });
    
    // Get all bookings
    const allBookings = await db.list<BookingRecord>('bookings');
    
    // Get approved bookings in this barangay - only count tenants with approved bookings
    const approvedBookingsInBarangay = allBookings.filter(booking => {
      const property = allListings.find(l => l.id === booking.propertyId);
      if (!property) return false;
      
      // Check property's barangay field
      if (property.barangay) {
        return property.barangay.trim().toUpperCase() === barangayName.trim().toUpperCase() && booking.status === 'approved';
      }
      
      // Fallback: check via property user
      const propertyUser = allUsers.find(u => u.id === property.userId);
      const userBarangay = propertyUser && (propertyUser as any).barangay;
      return userBarangay && userBarangay.trim().toUpperCase() === barangayName.trim().toUpperCase() && booking.status === 'approved';
    });
    
    // Count unique tenants (residents) with approved bookings in this barangay
    const uniqueTenantIds = new Set(approvedBookingsInBarangay.map(booking => booking.tenantId));
    const totalResidents = uniqueTenantIds.size;
    
    // Count approved owners in this barangay by checking owner_applications table
    // This ensures accuracy by only counting owners who have been officially approved
    const allApplications = await db.list<OwnerApplicationRecord>('owner_applications');
    const approvedApplicationsInBarangay = allApplications.filter(
      app => app.status === 'approved' && app.barangay?.toUpperCase() === barangayName.toUpperCase()
    );
    const totalApprovedOwners = approvedApplicationsInBarangay.length;
    
    console.log('📊 Approved owners count (utility):', {
      barangay: barangayName,
      totalApprovedOwners,
      approvedApplications: approvedApplicationsInBarangay.map(app => ({
        userId: app.userId,
        name: app.name,
        status: app.status,
        reviewedAt: app.reviewedAt
      }))
    });
    
    return {
      totalResidents,
      totalProperties: listingsInBarangay.length,
      totalListings: listingsInBarangay.length,
      activeBookings: approvedBookingsInBarangay.length,
      totalApprovedOwners
    };
  } catch (error) {
    console.error('Error getting barangay stats:', error);
    return {
      totalResidents: 0,
      totalProperties: 0,
      totalListings: 0,
      activeBookings: 0,
      totalApprovedOwners: 0
    };
  }
}

export async function getBrgyListings(barangayName: string): Promise<PublishedListingRecord[]> {
  try {
    // Get all listings and users
    const allListings = await db.list<PublishedListingRecord>('published_listings');
    const allUsers = await db.list<DbUserRecord>('users');
    
    // Filter ACTIVE listings by barangay (only available, not occupied or reserved)
    const listingsInBarangay = allListings.filter(listing => {
      // First check if listing is active (only 'available' status)
      const isActive = listing.availabilityStatus === 'available';
      
      // Check barangay match
      let isInBarangay = false;
      if (listing.barangay) {
        const listingBarangay = listing.barangay.trim().toUpperCase();
        const targetBarangay = barangayName.trim().toUpperCase();
        console.log(`🔍 Comparing listing barangay "${listingBarangay}" with target "${targetBarangay}"`);
        isInBarangay = listingBarangay === targetBarangay;
      } else {
        // Fallback: check via listing's user barangay field
        const listingUser = allUsers.find(u => u.id === listing.userId);
        const userBarangay = listingUser && (listingUser as any).barangay;
        if (userBarangay) {
          isInBarangay = userBarangay.trim().toUpperCase() === barangayName.trim().toUpperCase();
        }
      }
      
      return isActive && isInBarangay;
    });
    
    // Sort by published date (newest first)
    listingsInBarangay.sort((a, b) => {
      const dateA = new Date(a.publishedAt || '').getTime();
      const dateB = new Date(b.publishedAt || '').getTime();
      return dateB - dateA;
    });
    
    console.log(`📋 Found ${listingsInBarangay.length} listings in ${barangayName} (barangay filter applied)`);
    
    return listingsInBarangay;
  } catch (error) {
    console.error('Error getting barangay listings:', error);
    return [];
  }
}

/**
 * Comprehensive database verification for approved owners
 * This function ensures all approved owners are properly stored and accessible
 */
export async function verifyApprovedOwnersDatabaseIntegrity(): Promise<{
  success: boolean;
  verification: any;
  message: string;
}> {
  try {
    console.log('🔍 Verifying approved owners database integrity...');
    
    const verification = await verifyApprovedOwnersDatabase();
    
    if (verification.success) {
      console.log('✅ Database verification successful:', {
        totalUsers: verification.totalUsers,
        approvedOwners: verification.approvedOwners,
        approvedApplications: verification.approvedApplications,
        barangayBreakdown: Object.keys(verification.barangayBreakdown).length
      });
    } else {
      console.warn('⚠️ Database verification found issues:', verification.message);
    }
    
    return {
      success: verification.success,
      verification,
      message: verification.message
    };
    
  } catch (error) {
    console.error('❌ Database verification failed:', error);
    return {
      success: false,
      verification: null,
      message: `Database verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Get detailed approved owners data for a specific barangay
 */
export async function getDetailedApprovedOwnersData(barangay: string): Promise<{
  success: boolean;
  data: any;
  message: string;
}> {
  try {
    console.log(`🔍 Getting detailed approved owners data for ${barangay}...`);
    
    const result = await getApprovedOwnersForBarangay(barangay);
    
    if (result.success) {
      console.log(`✅ Retrieved ${result.count} approved owners for ${barangay}`);
    } else {
      console.warn(`⚠️ Failed to get approved owners for ${barangay}:`, result.message);
    }
    
    return {
      success: result.success,
      data: result,
      message: result.message
    };
    
  } catch (error) {
    console.error(`❌ Failed to get detailed approved owners data for ${barangay}:`, error);
    return {
      success: false,
      data: null,
      message: `Failed to get detailed data: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

