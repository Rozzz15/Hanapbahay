import { db } from './db';
import { BookingRecord, DbUserRecord } from '../types';

export interface GenderAnalytics {
  total: number;
  male: number;
  female: number;
  unknown: number;
  malePercentage: number;
  femalePercentage: number;
}

/**
 * Get gender analytics for tenants with approved bookings in a barangay
 * This counts tenants by gender based on approved bookings (when owner accepts payment)
 */
export async function getTenantGenderAnalytics(barangay: string): Promise<GenderAnalytics> {
  try {
    console.log('📊 Getting gender analytics for barangay:', barangay);
    
    // Get all approved bookings
    const allBookings = await db.list<BookingRecord>('bookings');
    console.log(`📋 Total bookings in database: ${allBookings.length}`);
    
    const approvedBookings = allBookings.filter(
      booking => booking.status === 'approved'
    );
    
    console.log(`✅ Found ${approvedBookings.length} approved bookings`);
    
    // Log booking status breakdown
    const statusBreakdown = allBookings.reduce((acc, b) => {
      acc[b.status] = (acc[b.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    console.log('📊 Booking status breakdown:', statusBreakdown);
    
    // Get all published listings in this barangay
    const allListings = await db.list('published_listings');
    console.log(`📋 Total listings in database: ${allListings.length}`);
    
    const barangayListings = allListings.filter(
      listing => listing.barangay === barangay
    );
    
    console.log(`✅ Found ${barangayListings.length} listings in ${barangay}`);
    
    // Get property IDs for this barangay
    const barangayPropertyIds = barangayListings.map(listing => listing.id);
    console.log(`📍 Property IDs in ${barangay}:`, barangayPropertyIds);
    
    // Filter bookings for properties in this barangay
    const barangayBookings = approvedBookings.filter(
      booking => barangayPropertyIds.includes(booking.propertyId)
    );
    
    console.log(`✅ Found ${barangayBookings.length} approved bookings for properties in ${barangay}`);
    
    // If no matches, log why
    if (barangayBookings.length === 0 && approvedBookings.length > 0) {
      console.log('⚠️  No bookings match barangay filter. Checking...');
      approvedBookings.forEach(booking => {
        console.log(`  Booking for property ${booking.propertyId} (${booking.propertyTitle})`);
      });
    }
    
    // Get all users to look up tenant genders
    const allUsers = await db.list<DbUserRecord>('users');
    
    // Count genders
    const genderCounts = {
      total: 0,
      male: 0,
      female: 0,
      unknown: 0,
    };
    
    // Track unique tenants to avoid double counting
    const processedTenants = new Set<string>();
    
    for (const booking of barangayBookings) {
      if (processedTenants.has(booking.tenantId)) {
        continue; // Skip if we've already counted this tenant
      }
      
      processedTenants.add(booking.tenantId);
      
      // Find the tenant user record
      const tenantUser = allUsers.find(user => user.id === booking.tenantId);
      
      if (tenantUser && tenantUser.gender) {
        genderCounts.total++;
        if (tenantUser.gender === 'male') {
          genderCounts.male++;
        } else if (tenantUser.gender === 'female') {
          genderCounts.female++;
        }
      } else {
        genderCounts.unknown++;
      }
    }
    
    // Calculate percentages
    const malePercentage = genderCounts.total > 0 
      ? Math.round((genderCounts.male / genderCounts.total) * 100) 
      : 0;
    const femalePercentage = genderCounts.total > 0 
      ? Math.round((genderCounts.female / genderCounts.total) * 100) 
      : 0;
    
    const analytics: GenderAnalytics = {
      total: genderCounts.total,
      male: genderCounts.male,
      female: genderCounts.female,
      unknown: genderCounts.unknown,
      malePercentage,
      femalePercentage,
    };
    
    console.log('📊 Gender Analytics:', analytics);
    
    return analytics;
    
  } catch (error) {
    console.error('❌ Error getting gender analytics:', error);
    
    // Return empty analytics on error
    return {
      total: 0,
      male: 0,
      female: 0,
      unknown: 0,
      malePercentage: 0,
      femalePercentage: 0,
    };
  }
}

/**
 * Get detailed tenant list with approved bookings in a barangay
 */
export async function getTenantDetailsByBarangay(barangay: string): Promise<Array<{
  tenantId: string;
  tenantName: string;
  tenantEmail: string;
  gender: 'male' | 'female' | undefined;
  propertyTitle: string;
  approvedDate: string;
}>> {
  try {
    console.log('📋 Getting tenant details for barangay:', barangay);
    
    // Get all approved bookings
    const allBookings = await db.list<BookingRecord>('bookings');
    const approvedBookings = allBookings.filter(
      booking => booking.status === 'approved'
    );
    
    // Get all published listings in this barangay
    const allListings = await db.list('published_listings');
    const barangayListings = allListings.filter(
      listing => listing.barangay === barangay
    );
    
    // Get property IDs for this barangay
    const barangayPropertyIds = barangayListings.map(listing => listing.id);
    
    // Filter bookings for properties in this barangay
    const barangayBookings = approvedBookings.filter(
      booking => barangayPropertyIds.includes(booking.propertyId)
    );
    
    // Get all users
    const allUsers = await db.list<DbUserRecord>('users');
    
    // Map bookings to tenant details
    const tenantDetails = barangayBookings.map(booking => {
      const tenantUser = allUsers.find(user => user.id === booking.tenantId);
      
      return {
        tenantId: booking.tenantId,
        tenantName: booking.tenantName,
        tenantEmail: booking.tenantEmail,
        gender: tenantUser?.gender,
        propertyTitle: booking.propertyTitle,
        approvedDate: booking.approvedAt || booking.createdAt,
      };
    });
    
    console.log(`✅ Found ${tenantDetails.length} tenant details`);
    
    return tenantDetails;
    
  } catch (error) {
    console.error('❌ Error getting tenant details:', error);
    return [];
  }
}
