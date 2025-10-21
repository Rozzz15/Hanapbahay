import { db } from './db';
import { BookingRecord } from '@/types';

/**
 * Remove all cancelled bookings from the database
 * This cleans up any old cancelled bookings that were created
 * before we changed the cancel function to delete bookings completely
 */
export async function cleanupCancelledBookings(): Promise<{
  success: boolean;
  deletedCount: number;
  message: string;
}> {
  try {
    console.log('🧹 Starting cleanup of cancelled bookings...');
    
    // Get all bookings
    const allBookings = await db.list<BookingRecord>('bookings');
    console.log(`📋 Total bookings found: ${allBookings.length}`);
    
    // Find cancelled bookings
    const cancelledBookings = allBookings.filter(
      booking => booking.status === 'cancelled'
    );
    
    console.log(`🔍 Found ${cancelledBookings.length} cancelled bookings to remove`);
    
    if (cancelledBookings.length === 0) {
      console.log('✅ No cancelled bookings found. Database is clean!');
      return {
        success: true,
        deletedCount: 0,
        message: 'No cancelled bookings found'
      };
    }
    
    // Delete each cancelled booking
    for (const booking of cancelledBookings) {
      console.log(`🗑️ Deleting cancelled booking: ${booking.id}`);
      await db.remove('bookings', booking.id);
    }
    
    console.log(`✅ Successfully deleted ${cancelledBookings.length} cancelled bookings`);
    
    return {
      success: true,
      deletedCount: cancelledBookings.length,
      message: `Deleted ${cancelledBookings.length} cancelled booking(s)`
    };
    
  } catch (error) {
    console.error('❌ Error cleaning up cancelled bookings:', error);
    return {
      success: false,
      deletedCount: 0,
      message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Remove cancelled bookings for a specific user
 */
export async function cleanupCancelledBookingsForUser(
  userId: string,
  userType: 'tenant' | 'owner'
): Promise<{
  success: boolean;
  deletedCount: number;
  message: string;
}> {
  try {
    console.log(`🧹 Cleaning up cancelled bookings for ${userType}: ${userId}`);
    
    const allBookings = await db.list<BookingRecord>('bookings');
    
    // Filter by user type and cancelled status
    const cancelledBookings = allBookings.filter(booking => {
      const isUserMatch = userType === 'tenant' 
        ? booking.tenantId === userId 
        : booking.ownerId === userId;
      return isUserMatch && booking.status === 'cancelled';
    });
    
    console.log(`🔍 Found ${cancelledBookings.length} cancelled bookings for user`);
    
    if (cancelledBookings.length === 0) {
      return {
        success: true,
        deletedCount: 0,
        message: 'No cancelled bookings found for this user'
      };
    }
    
    // Delete each cancelled booking
    for (const booking of cancelledBookings) {
      await db.remove('bookings', booking.id);
    }
    
    console.log(`✅ Deleted ${cancelledBookings.length} cancelled bookings for user`);
    
    return {
      success: true,
      deletedCount: cancelledBookings.length,
      message: `Deleted ${cancelledBookings.length} cancelled booking(s)`
    };
    
  } catch (error) {
    console.error('❌ Error cleaning up user cancelled bookings:', error);
    return {
      success: false,
      deletedCount: 0,
      message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

