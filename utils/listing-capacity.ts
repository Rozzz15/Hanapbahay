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
 * Update listing availability status based on current capacity
 * Sets status to 'occupied' if at capacity, 'available' if slots are available
 * This ensures the barangay account can see the correct status
 */
export async function updateListingAvailabilityStatus(listingId: string): Promise<void> {
  try {
    const listing = await db.get<PublishedListingRecord>('published_listings', listingId);
    if (!listing) {
      console.log('⚠️ Listing not found for status update:', listingId);
      return;
    }

    const isAtCapacity = await isListingAtCapacity(listing);
    const newStatus: 'available' | 'occupied' | 'reserved' = isAtCapacity ? 'occupied' : 'available';
    
    // Normalize current status for comparison (handle case-insensitive and null/undefined)
    const currentStatus = listing.availabilityStatus 
      ? String(listing.availabilityStatus).toLowerCase().trim() 
      : 'available';
    const normalizedNewStatus = newStatus.toLowerCase().trim();
    
    // Only update if status has changed (case-insensitive comparison)
    if (currentStatus !== normalizedNewStatus) {
      const updatedListing: PublishedListingRecord = {
        ...listing,
        availabilityStatus: newStatus, // Store as lowercase
        updatedAt: new Date().toISOString(),
      };
      
      await db.upsert('published_listings', listingId, updatedListing);
      console.log(`✅ Updated listing ${listingId} availabilityStatus from "${listing.availabilityStatus}" to "${newStatus}"`);
      console.log(`📊 Listing capacity check: isAtCapacity=${isAtCapacity}, occupiedSlots=${await getOccupiedSlots(listingId)}, capacity=${listing.capacity || 1}`);
    } else {
      console.log(`ℹ️ Listing ${listingId} status already correct: "${currentStatus}" (isAtCapacity=${isAtCapacity})`);
    }
  } catch (error) {
    console.error('❌ Error updating listing availability status:', error);
  }
}

/**
 * Sync all listings' availability status based on current capacity
 * Useful for fixing any listings that are out of sync
 */
export async function syncAllListingStatuses(): Promise<void> {
  try {
    console.log('🔄 Syncing all listing availability statuses...');
    const allListings = await db.list<PublishedListingRecord>('published_listings');
    let updatedCount = 0;
    
    for (const listing of allListings) {
      if (!listing.id) continue;
      try {
        const isAtCapacity = await isListingAtCapacity(listing);
        const newStatus: 'available' | 'occupied' | 'reserved' = isAtCapacity ? 'occupied' : 'available';
        const currentStatus = listing.availabilityStatus 
          ? String(listing.availabilityStatus).toLowerCase().trim() 
          : 'available';
        const normalizedNewStatus = newStatus.toLowerCase().trim();
        
        if (currentStatus !== normalizedNewStatus) {
          const updatedListing: PublishedListingRecord = {
            ...listing,
            availabilityStatus: newStatus,
            updatedAt: new Date().toISOString(),
          };
          await db.upsert('published_listings', listing.id, updatedListing);
          updatedCount++;
          console.log(`✅ Synced listing ${listing.id}: ${currentStatus} → ${newStatus}`);
        }
      } catch (error) {
        console.error(`❌ Error syncing listing ${listing.id}:`, error);
      }
    }
    
    console.log(`✅ Sync complete: Updated ${updatedCount} out of ${allListings.length} listings`);
  } catch (error) {
    console.error('❌ Error syncing all listing statuses:', error);
  }
}

/**
 * Check if listing has reached capacity and auto-reject pending bookings
 * This should be called when a booking payment status is updated to 'paid'
 * Also checks room-specific capacity if roomCapacities are defined
 * Also updates the listing's availabilityStatus in the database
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
    
    // Update listing availability status based on current capacity
    // Force update even if status seems correct, to ensure database is in sync
    await updateListingAvailabilityStatus(listingId);
    
    // Double-check: verify the update was successful
    try {
      const updatedListing = await db.get<PublishedListingRecord>('published_listings', listingId);
      if (updatedListing) {
        const isStillAtCapacity = await isListingAtCapacity(updatedListing);
        const expectedStatus = isStillAtCapacity ? 'occupied' : 'available';
        const actualStatus = updatedListing.availabilityStatus?.toLowerCase().trim() || 'available';
        
        if (actualStatus !== expectedStatus) {
          console.warn(`⚠️ Status mismatch detected for listing ${listingId}: expected "${expectedStatus}", got "${actualStatus}". Forcing update...`);
          // Force update
          const forceUpdatedListing: PublishedListingRecord = {
            ...updatedListing,
            availabilityStatus: expectedStatus,
            updatedAt: new Date().toISOString(),
          };
          await db.upsert('published_listings', listingId, forceUpdatedListing);
          console.log(`✅ Force-updated listing ${listingId} to "${expectedStatus}"`);
        }
      }
    } catch (verifyError) {
      console.warn('⚠️ Could not verify listing status update:', verifyError);
    }
  } catch (error) {
    console.error('❌ Error checking and rejecting pending bookings:', error);
  }
}




