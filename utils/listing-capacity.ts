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
 * Get occupied slots per room for a listing
 * Returns an array where each index represents a room and the value is the number of occupied slots
 */
export async function getOccupiedSlotsPerRoom(listingId: string, roomCapacities?: number[]): Promise<number[]> {
  try {
    if (!roomCapacities || roomCapacities.length === 0) {
      // If no room capacities, return empty array
      return [];
    }

    const bookings = await db.list<BookingRecord>('bookings');
    
    const occupiedBookings = bookings.filter(
      booking =>
        booking.propertyId === listingId &&
        booking.status === 'approved' &&
        booking.paymentStatus === 'paid' &&
        booking.selectedRoom !== undefined
    );
    
    // Initialize array with zeros for each room
    const occupiedPerRoom = new Array(roomCapacities.length).fill(0);
    
    // Count occupied slots per room
    for (const booking of occupiedBookings) {
      if (booking.selectedRoom !== undefined && booking.selectedRoom >= 0 && booking.selectedRoom < roomCapacities.length) {
        occupiedPerRoom[booking.selectedRoom]++;
      }
    }
    
    return occupiedPerRoom;
  } catch (error) {
    console.error('❌ Error getting occupied slots per room:', error);
    return [];
  }
}

/**
 * Get available slots per room for a listing
 * Returns an array where each index represents a room and the value is the number of available slots
 */
export async function getAvailableSlotsPerRoom(listingId: string, roomCapacities?: number[]): Promise<number[]> {
  try {
    if (!roomCapacities || roomCapacities.length === 0) {
      return [];
    }

    const occupiedPerRoom = await getOccupiedSlotsPerRoom(listingId, roomCapacities);
    
    // Calculate available slots per room
    return roomCapacities.map((capacity, index) => {
      const occupied = occupiedPerRoom[index] || 0;
      return Math.max(0, capacity - occupied);
    });
  } catch (error) {
    console.error('❌ Error getting available slots per room:', error);
    return [];
  }
}

/**
 * Check if a specific room has available slots
 */
export async function isRoomAvailable(listingId: string, roomIndex: number, roomCapacities?: number[]): Promise<boolean> {
  try {
    if (!roomCapacities || roomIndex < 0 || roomIndex >= roomCapacities.length) {
      return false;
    }

    const availableSlots = await getAvailableSlotsPerRoom(listingId, roomCapacities);
    return (availableSlots[roomIndex] || 0) > 0;
  } catch (error) {
    console.error('❌ Error checking room availability:', error);
    return false;
  }
}

/**
 * Check if a listing has reached its capacity
 */
export async function isListingAtCapacity(listing: PublishedListingRecord): Promise<boolean> {
  if (!listing.id) return false;
  
  // If listing has room capacities, check if all rooms are fully occupied
  if (listing.roomCapacities && listing.roomCapacities.length > 0) {
    const availableSlots = await getAvailableSlotsPerRoom(listing.id, listing.roomCapacities);
    // Check if all rooms have 0 available slots
    const allRoomsOccupied = availableSlots.every(slots => slots === 0);
    if (allRoomsOccupied) {
      return true;
    }
  }
  
  // Fallback to overall capacity check
  const capacity = listing.capacity || 1; // Default to 1 if not set
  const occupiedSlots = await getOccupiedSlots(listing.id);
  
  return occupiedSlots >= capacity;
}

/**
 * Check if all rooms in a listing are fully occupied
 * Returns true if listing has room capacities and all rooms have 0 available slots
 */
export async function areAllRoomsFullyOccupied(listing: PublishedListingRecord): Promise<boolean> {
  if (!listing.id) return false;
  
  if (!listing.roomCapacities || listing.roomCapacities.length === 0) {
    // If no room capacities, use overall capacity check
    return await isListingAtCapacity(listing);
  }
  
  const availableSlots = await getAvailableSlotsPerRoom(listing.id, listing.roomCapacities);
  // Check if all rooms have 0 available slots
  return availableSlots.every(slots => slots === 0);
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
 * Also checks room-specific capacity if roomCapacities are defined
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
    
    // Get all pending bookings for this listing
    const bookings = await db.list<BookingRecord>('bookings');
    const pendingBookings = bookings.filter(
      booking =>
        booking.propertyId === listingId &&
        booking.status === 'pending'
    );
    
    if (pendingBookings.length === 0) {
      return; // No pending bookings to check
    }
    
    let rejectedCount = 0;
    
    // If listing has room capacities, check room-specific capacity
    if (listing.roomCapacities && listing.roomCapacities.length > 0) {
      const occupiedPerRoom = await getOccupiedSlotsPerRoom(listingId, listing.roomCapacities);
      
      // Check each pending booking's selected room
      for (const booking of pendingBookings) {
        if (booking.selectedRoom !== undefined && 
            booking.selectedRoom >= 0 && 
            booking.selectedRoom < listing.roomCapacities.length) {
          const roomCapacity = listing.roomCapacities[booking.selectedRoom];
          const occupiedInRoom = occupiedPerRoom[booking.selectedRoom] || 0;
          
          // If the specific room is at capacity, reject this booking
          if (occupiedInRoom >= roomCapacity) {
            try {
              const updatedBooking: BookingRecord = {
                ...booking,
                status: 'rejected',
                updatedAt: new Date().toISOString(),
                rejectedAt: new Date().toISOString(),
              };
              
              await db.upsert('bookings', booking.id, updatedBooking);
              console.log(`✅ Rejected pending booking ${booking.id} - Room ${booking.selectedRoom + 1} is at capacity (${occupiedInRoom}/${roomCapacity})`);
              rejectedCount++;
            } catch (error) {
              console.error(`❌ Error rejecting booking ${booking.id}:`, error);
            }
          }
        }
      }
    }
    
    // Also check overall capacity (for listings without room capacities or as a fallback)
    if (occupiedSlots >= capacity) {
      console.log(`🚫 Listing ${listingId} has reached overall capacity (${occupiedSlots}/${capacity}). Rejecting remaining pending bookings...`);
      
      // Reject any remaining pending bookings that weren't already rejected
      // Re-fetch to get current status
      const currentBookings = await db.list<BookingRecord>('bookings');
      const stillPendingBookings = currentBookings.filter(
        booking =>
          booking.propertyId === listingId &&
          booking.status === 'pending'
      );
      
      for (const booking of stillPendingBookings) {
        try {
          const updatedBooking: BookingRecord = {
            ...booking,
            status: 'rejected',
            updatedAt: new Date().toISOString(),
            rejectedAt: new Date().toISOString(),
          };
          
          await db.upsert('bookings', booking.id, updatedBooking);
          console.log(`✅ Rejected pending booking ${booking.id} due to overall capacity reached`);
          rejectedCount++;
        } catch (error) {
          console.error(`❌ Error rejecting booking ${booking.id}:`, error);
        }
      }
    }
    
    if (rejectedCount > 0) {
      console.log(`✅ Rejected ${rejectedCount} pending booking(s) for listing ${listingId}`);
    }
  } catch (error) {
    console.error('❌ Error checking and rejecting pending bookings:', error);
  }
}




