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
    
    // Filter users in this barangay
    const residentsInBarangay = allUsers.filter(
      u => (u as any).barangay === barangayName
    );
    
    // Get all listings
    const allListings = await db.list<PublishedListingRecord>('published_listings');
    
    // Get listings in this barangay
    const listingsInBarangay = allListings.filter(listing => {
      const listingUser = allUsers.find(u => u.id === listing.userId);
      return listingUser && (listingUser as any).barangay === barangayName;
    });
    
    // Get all bookings
    const allBookings = await db.list<BookingRecord>('bookings');
    
    // Get active bookings in this barangay
    const activeBookingsInBarangay = allBookings.filter(booking => {
      const property = allListings.find(l => l.id === booking.propertyId);
      if (!property) return false;
      const propertyUser = allUsers.find(u => u.id === property.userId);
      return propertyUser && (propertyUser as any).barangay === barangayName && booking.status === 'approved';
    });
    
    return {
      totalResidents: residentsInBarangay.length,
      totalProperties: listingsInBarangay.length,
      totalListings: listingsInBarangay.length,
      activeBookings: activeBookingsInBarangay.length
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
    // Get all listings
    const allListings = await db.list<PublishedListingRecord>('published_listings');
    
    // Filter listings by barangay - now using explicit barangay field
    const listingsInBarangay = allListings.filter(listing => {
      if (listing.barangay) {
        return listing.barangay.toUpperCase() === barangayName.toUpperCase();
      }
      return false;
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

