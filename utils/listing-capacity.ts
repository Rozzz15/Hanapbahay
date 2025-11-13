import { db } from './db';
import { BookingRecord } from '../types/index';
import { PublishedListingRecord } from '../types/index';
import { updateBookingStatus } from './booking';

/**
 * Get the number of occupied slots for a listing
 * Counts bookings with status 'approved' and paymentStatus 'paid'
 */
export async function getOccupiedSlots(listingId: string): Promise<number> {
  try {
    const bookings = await db.list<BookingRecord>('bookings');
    
    const occupiedBookings = bookings.filter(
      booking =>
        booking.propertyId === listingId &&
        booking.status === 'approved' &&
        booking.paymentStatus === 'paid'
    );
    
    return occupiedBookings.length;
  } catch (error) {
    console.error('❌ Error getting occupied slots:', error);
    return 0;
  }
}

/**
 * Check if a listing has reached its capacity
 */
export async function isListingAtCapacity(listing: PublishedListingRecord): Promise<boolean> {
  if (!listing.id) return false;
  
  const capacity = listing.capacity || 1; // Default to 1 if not set
  const occupiedSlots = await getOccupiedSlots(listing.id);
  
  return occupiedSlots >= capacity;
}

/**
 * Get available slots for a listing
 */
export async function getAvailableSlots(listing: PublishedListingRecord): Promise<number> {
  if (!listing.id) return 0;
  
  const capacity = listing.capacity || 1;
  const occupiedSlots = await getOccupiedSlots(listing.id);
  
  return Math.max(0, capacity - occupiedSlots);
}

/**
 * Check if listing has reached capacity and auto-reject pending bookings
 * This should be called when a booking payment status is updated to 'paid'
 */
export async function checkAndRejectPendingBookings(listingId: string): Promise<void> {
  try {
    const listing = await db.get<PublishedListingRecord>('published_listings', listingId);
    if (!listing) {
      console.log('⚠️ Listing not found:', listingId);
      return;
    }

    const capacity = listing.capacity || 1;
    const occupiedSlots = await getOccupiedSlots(listingId);
    
    // If capacity is reached, reject all pending bookings
    if (occupiedSlots >= capacity) {
      console.log(`🚫 Listing ${listingId} has reached capacity (${occupiedSlots}/${capacity}). Rejecting pending bookings...`);
      
      const bookings = await db.list<BookingRecord>('bookings');
      const pendingBookings = bookings.filter(
        booking =>
          booking.propertyId === listingId &&
          booking.status === 'pending'
      );
      
      // Reject all pending bookings
      for (const booking of pendingBookings) {
        try {
          const updatedBooking: BookingRecord = {
            ...booking,
            status: 'rejected',
            updatedAt: new Date().toISOString(),
            rejectedAt: new Date().toISOString(),
          };
          
          await db.upsert('bookings', booking.id, updatedBooking);
          console.log(`✅ Rejected pending booking ${booking.id} due to capacity reached`);
        } catch (error) {
          console.error(`❌ Error rejecting booking ${booking.id}:`, error);
        }
      }
      
      if (pendingBookings.length > 0) {
        console.log(`✅ Rejected ${pendingBookings.length} pending booking(s) for listing ${listingId}`);
      }
    }
  } catch (error) {
    console.error('❌ Error checking and rejecting pending bookings:', error);
  }
}




