import { db } from './db';
import { BookingRecord, PublishedListingRecord } from '../types';
import { getOccupiedSlots } from './listing-capacity';

export interface TenantInfo {
  bookingId: string;
  tenantId: string;
  tenantName: string;
  tenantEmail: string;
  tenantPhone: string;
  tenantAddress?: string;
  slotNumber: number; // 1-based slot number
  propertyId: string;
  propertyTitle: string;
  propertyAddress: string;
  monthlyRent: number;
  startDate: string;
  endDate: string;
  status: string;
  paymentStatus: string;
  createdAt: string;
}

export interface ListingWithTenants {
  listingId: string;
  propertyTitle: string;
  propertyAddress: string;
  capacity: number;
  occupiedSlots: number;
  availableSlots: number;
  tenants: TenantInfo[];
}

/**
 * Get all tenants grouped by listing for an owner
 * Only includes approved and paid bookings (active tenants)
 */
export async function getTenantsByOwner(ownerId: string): Promise<ListingWithTenants[]> {
  try {
    console.log('📋 Loading tenants for owner:', ownerId);
    
    // Get all bookings for this owner
    const allBookings = await db.list<BookingRecord>('bookings');
    const ownerBookings = allBookings.filter(
      booking => 
        booking.ownerId === ownerId &&
        booking.status === 'approved' &&
        booking.paymentStatus === 'paid'
    );
    
    console.log(`✅ Found ${ownerBookings.length} active tenant bookings`);
    
    // Get all listings for this owner
    const allListings = await db.list<PublishedListingRecord>('published_listings');
    const ownerListings = allListings.filter(listing => listing.userId === ownerId);
    
    // Group bookings by listing
    const listingMap = new Map<string, ListingWithTenants>();
    
    // Initialize map with all owner listings
    for (const listing of ownerListings) {
      if (!listing.id) continue;
      
      const capacity = listing.capacity || 1;
      const occupiedSlots = await getOccupiedSlots(listing.id);
      const availableSlots = Math.max(0, capacity - occupiedSlots);
      
      listingMap.set(listing.id, {
        listingId: listing.id,
        propertyTitle: `${listing.propertyType} in ${listing.address.split(',')[0]}`,
        propertyAddress: listing.address,
        capacity,
        occupiedSlots,
        availableSlots,
        tenants: []
      });
    }
    
    // Sort bookings by creation date (oldest first) to assign slot numbers
    const sortedBookings = ownerBookings.sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    
    // Track slot numbers per listing
    const slotCounters = new Map<string, number>();
    
    // Add tenants to their respective listings
    for (const booking of sortedBookings) {
      const listing = listingMap.get(booking.propertyId);
      if (!listing) continue;
      
      // Get or initialize slot counter for this listing
      const currentSlot = (slotCounters.get(booking.propertyId) || 0) + 1;
      slotCounters.set(booking.propertyId, currentSlot);
      
      // Try to get tenant address
      let tenantAddress = booking.tenantAddress;
      if (!tenantAddress) {
        try {
          const tenantProfile = await db.get('tenants', booking.tenantId);
          if (tenantProfile) {
            tenantAddress = (tenantProfile as any).address || '';
          }
        } catch (error) {
          console.log('⚠️ Could not load tenant address:', error);
        }
      }
      
      const tenantInfo: TenantInfo = {
        bookingId: booking.id,
        tenantId: booking.tenantId,
        tenantName: booking.tenantName,
        tenantEmail: booking.tenantEmail,
        tenantPhone: booking.tenantPhone,
        tenantAddress,
        slotNumber: currentSlot,
        propertyId: booking.propertyId,
        propertyTitle: booking.propertyTitle,
        propertyAddress: booking.propertyAddress,
        monthlyRent: booking.monthlyRent,
        startDate: booking.startDate,
        endDate: booking.endDate,
        status: booking.status,
        paymentStatus: booking.paymentStatus,
        createdAt: booking.createdAt
      };
      
      listing.tenants.push(tenantInfo);
    }
    
    // Convert map to array and filter out listings with no tenants
    const result = Array.from(listingMap.values())
      .filter(listing => listing.tenants.length > 0)
      .sort((a, b) => {
        // Sort by number of tenants (descending), then by property title
        if (b.tenants.length !== a.tenants.length) {
          return b.tenants.length - a.tenants.length;
        }
        return a.propertyTitle.localeCompare(b.propertyTitle);
      });
    
    console.log(`✅ Grouped ${result.length} listings with tenants`);
    return result;
  } catch (error) {
    console.error('❌ Error loading tenants by owner:', error);
    return [];
  }
}

/**
 * Get total number of active tenants for an owner
 */
export async function getTotalActiveTenants(ownerId: string): Promise<number> {
  try {
    const allBookings = await db.list<BookingRecord>('bookings');
    const activeTenants = allBookings.filter(
      booking => 
        booking.ownerId === ownerId &&
        booking.status === 'approved' &&
        booking.paymentStatus === 'paid'
    );
    return activeTenants.length;
  } catch (error) {
    console.error('❌ Error getting total active tenants:', error);
    return 0;
  }
}

