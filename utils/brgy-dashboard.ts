import { db } from './db';
import { DbUserRecord, PublishedListingRecord, BookingRecord } from '../types';

export interface BrgyDashboardStats {
  totalResidents: number;
  totalProperties: number;
  totalListings: number;
  activeBookings: number;
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
    
    return {
      totalResidents,
      totalProperties: listingsInBarangay.length,
      totalListings: listingsInBarangay.length,
      activeBookings: approvedBookingsInBarangay.length
    };
  } catch (error) {
    console.error('Error getting barangay stats:', error);
    return {
      totalResidents: 0,
      totalProperties: 0,
      totalListings: 0,
      activeBookings: 0
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

