import { db, generateId } from './db';
import { BookingRecord, PublishedListingRecord, DbUserRecord } from '@/types';

export interface CreateBookingData {
  propertyId: string;
  tenantId: string;
  startDate: string;
  endDate: string;
  duration: number; // in months
  specialRequests?: string;
  selectedRoom?: number; // Room index (0-based) that the tenant selected
  tenantType?: 'individual' | 'family' | 'couple' | 'group';
  numberOfPeople?: number; // Number of people for family or group bookings
  selectedPaymentMethod?: string;
  paymentMethodDetails?: {
    type: string;
    accountName: string;
    accountNumber: string;
    accountDetails?: string;
  };
}

export interface BookingSummary {
  id: string;
  propertyTitle: string;
  propertyAddress: string;
  startDate: string;
  endDate: string;
  duration: number;
  monthlyRent: number;
  securityDeposit: number;
  totalAmount: number;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'completed';
  createdAt: string;
}

// Check for existing bookings to prevent duplicates
export async function checkDuplicateBooking(
  propertyId: string, 
  tenantId: string
): Promise<boolean> {
  try {
    console.log('🔍 Checking for duplicate booking:', { propertyId, tenantId });
    
    const bookings = await db.list<BookingRecord>('bookings');
    console.log('📋 Total bookings found:', bookings.length);
    
    const existingBooking = bookings.find(booking => 
      booking.propertyId === propertyId &&
      booking.tenantId === tenantId &&
      (booking.status === 'pending' || booking.status === 'approved')
    );
    
    const hasDuplicate = !!existingBooking;
    console.log('🔍 Duplicate check result:', hasDuplicate ? 'Found duplicate' : 'No duplicate');
    
    if (hasDuplicate && existingBooking) {
      console.log('📋 Existing booking details:', {
        id: existingBooking.id,
        status: existingBooking.status,
        propertyId: existingBooking.propertyId,
        tenantId: existingBooking.tenantId
      });
    }
    
    return hasDuplicate;
  } catch (error) {
    console.error('❌ Error checking for duplicate booking:', error);
    return false; // Allow booking if check fails
  }
}

// Create a new booking
export async function createBooking(data: CreateBookingData): Promise<BookingRecord> {
  try {
    console.log('🔄 Creating booking with data:', data);
    
    // Check for duplicates
    const isDuplicate = await checkDuplicateBooking(data.propertyId, data.tenantId);
    if (isDuplicate) {
      throw new Error('You already have a pending or approved booking for this property. Each tenant can only have one active booking per property.');
    }
    
    // Fetch property and tenant data
    const [property, tenant] = await Promise.all([
      db.get<PublishedListingRecord>('published_listings', data.propertyId),
      db.get<DbUserRecord>('users', data.tenantId)
    ]);
    
    if (!property) {
      throw new Error('Property not found');
    }
    
    if (!tenant) {
      throw new Error('Tenant not found');
    }

    // Calculate total amount (only monthly rent)
    const monthlyRent = property.monthlyRent || 0;
    const totalAmount = monthlyRent;

    console.log('💰 Booking calculations:', {
      monthlyRent,
      duration: data.duration,
      totalAmount
    });

    // Create booking record
    const booking: BookingRecord = {
      id: generateId('booking'),
      propertyId: data.propertyId,
      tenantId: data.tenantId,
      ownerId: property.userId,
      propertyTitle: `${property.propertyType} in ${property.address.split(',')[0]}`,
      propertyAddress: property.address,
      monthlyRent,
      securityDeposit: 0, // No security deposit for monthly rental
      totalAmount,
      startDate: data.startDate,
      endDate: data.endDate,
      duration: data.duration,
      status: 'pending',
      paymentStatus: 'pending',
      tenantName: tenant.name,
      tenantEmail: tenant.email,
      tenantPhone: tenant.phone || '',
      ownerName: property.ownerName,
      ownerEmail: property.email,
      ownerPhone: property.contactNumber,
      specialRequests: data.specialRequests,
      selectedRoom: data.selectedRoom,
      tenantType: data.tenantType,
      numberOfPeople: data.numberOfPeople,
      selectedPaymentMethod: data.selectedPaymentMethod,
      paymentMethodDetails: data.paymentMethodDetails,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    console.log('📝 Created booking record:', booking);

    // Save to database
    await db.upsert('bookings', booking.id, booking);
    console.log('✅ Booking saved successfully');

    // Dispatch event to notify owner dashboard
    const { dispatchCustomEvent } = await import('./custom-events');
    dispatchCustomEvent('bookingCreated', {
      bookingId: booking.id,
      propertyId: booking.propertyId,
      tenantId: booking.tenantId,
      ownerId: booking.ownerId,
      propertyTitle: booking.propertyTitle,
      tenantName: booking.tenantName,
      status: booking.status,
      timestamp: booking.createdAt
    });

    return booking;
  } catch (error) {
    console.error('❌ Error creating booking:', error);
    throw error;
  }
}

// Get bookings for a tenant
export async function getBookingsByTenant(tenantId: string): Promise<BookingRecord[]> {
  try {
    console.log('📋 Loading bookings for tenant:', tenantId);
    
    const allBookings = await db.list<BookingRecord>('bookings');
    // Exclude soft-deleted bookings from normal views (but they're preserved for analytics)
    const tenantBookings = allBookings
      .filter(booking => booking.tenantId === tenantId && !booking.isDeleted)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    console.log(`✅ Loaded ${tenantBookings.length} bookings for tenant (excluding deleted)`);
    return tenantBookings;
  } catch (error) {
    console.error('❌ Error loading tenant bookings:', error);
    return [];
  }
}

// Get bookings for an owner
export async function getBookingsByOwner(ownerId: string): Promise<BookingRecord[]> {
  try {
    console.log('📋 Loading bookings for owner:', ownerId);
    
    const allBookings = await db.list<BookingRecord>('bookings');
    // Exclude soft-deleted bookings from normal views (but they're preserved for analytics)
    const ownerBookings = allBookings
      .filter(booking => booking.ownerId === ownerId && !booking.isDeleted)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    // Load tenant addresses for each booking
    const bookingsWithTenantAddresses = await Promise.all(
      ownerBookings.map(async (booking) => {
        try {
          // Try to get tenant address from tenants table
          const tenantProfile = await db.get('tenants', booking.tenantId);
          if (tenantProfile) {
            const address = (tenantProfile as any).address || '';
            return {
              ...booking,
              tenantAddress: address
            };
          }
        } catch (error) {
          console.log('⚠️ Could not load tenant address:', error);
        }
        return booking;
      })
    );
    
    console.log(`✅ Loaded ${bookingsWithTenantAddresses.length} bookings for owner with tenant addresses`);
    return bookingsWithTenantAddresses;
  } catch (error) {
    console.error('❌ Error loading owner bookings:', error);
    return [];
  }
}

// Update booking status (for owners)
export async function updateBookingStatus(
  bookingId: string,
  status: 'approved' | 'rejected',
  ownerId: string
): Promise<boolean> {
  try {
    console.log('🔄 Updating booking status:', { bookingId, status, ownerId });
    
    const booking = await db.get<BookingRecord>('bookings', bookingId);
    if (!booking) {
      throw new Error('Booking not found');
    }
    
    if (booking.ownerId !== ownerId) {
      throw new Error('Unauthorized: You can only update your own property bookings');
    }
    
    const updatedBooking: BookingRecord = {
      ...booking,
      status,
      updatedAt: new Date().toISOString(),
      ...(status === 'approved' && { approvedAt: new Date().toISOString() }),
      ...(status === 'rejected' && { rejectedAt: new Date().toISOString() }),
    };
    
    await db.upsert('bookings', bookingId, updatedBooking);
    console.log('✅ Booking status updated successfully');
    
    // If a paid booking is rejected, update listing availability status (slot may have become available)
    // Also update if approving a booking (though it won't be occupied until paid)
    try {
      const { updateListingAvailabilityStatus } = await import('./listing-capacity');
      await updateListingAvailabilityStatus(booking.propertyId);
    } catch (statusError) {
      console.warn('⚠️ Could not update listing availability status:', statusError);
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error updating booking status:', error);
    return false;
  }
}

// Cancel booking (for tenants) - Soft deletes the booking (preserves for analytics)
export async function cancelBooking(bookingId: string, tenantId: string): Promise<boolean> {
  try {
    console.log('🔄 Cancelling (soft deleting) booking:', { bookingId, tenantId });
    
    const booking = await db.get<BookingRecord>('bookings', bookingId);
    if (!booking) {
      throw new Error('Booking not found');
    }
    
    if (booking.tenantId !== tenantId) {
      throw new Error('Unauthorized: You can only cancel your own bookings');
    }
    
    if (booking.status === 'cancelled') {
      throw new Error('Booking is already cancelled');
    }
    
    if (booking.status === 'completed') {
      throw new Error('Cannot cancel a completed booking');
    }
    
    // Soft delete: Mark as cancelled and deleted instead of removing from database
    // This preserves the booking for barangay analytics
    const now = new Date().toISOString();
    const updatedBooking: BookingRecord = {
      ...booking,
      status: 'cancelled',
      cancelledAt: now,
      isDeleted: true,
      deletedAt: now,
      updatedAt: now
    };
    
    await db.upsert('bookings', bookingId, updatedBooking);
    console.log('✅ Booking soft-deleted successfully (preserved for analytics)');
    
    // Update listing availability status in case slots became available
    try {
      const { updateListingAvailabilityStatus } = await import('./listing-capacity');
      await updateListingAvailabilityStatus(booking.propertyId);
    } catch (statusError) {
      console.warn('⚠️ Could not update listing availability status:', statusError);
    }
    
    // Dispatch event to notify owner dashboard that booking was cancelled
    const { dispatchCustomEvent } = await import('./custom-events');
    dispatchCustomEvent('bookingCancelled', {
      bookingId,
      propertyId: booking.propertyId,
      tenantId: booking.tenantId,
      ownerId: booking.ownerId,
      timestamp: now
    });
    
    return true;
  } catch (error) {
    console.error('❌ Error cancelling booking:', error);
    throw error;
  }
}

// Delete booking (for owners) - Soft deletes the booking (preserves for analytics)
export async function deleteBookingByOwner(bookingId: string, ownerId: string): Promise<boolean> {
  try {
    console.log('🔄 Soft deleting booking by owner:', { bookingId, ownerId });
    
    const booking = await db.get<BookingRecord>('bookings', bookingId);
    if (!booking) {
      throw new Error('Booking not found');
    }
    
    if (booking.ownerId !== ownerId) {
      throw new Error('Unauthorized: You can only delete bookings for your own properties');
    }
    
    // Soft delete: Mark as deleted instead of removing from database
    // This preserves the booking for barangay analytics
    const now = new Date().toISOString();
    const updatedBooking: BookingRecord = {
      ...booking,
      isDeleted: true,
      deletedAt: now,
      updatedAt: now
    };
    
    await db.upsert('bookings', bookingId, updatedBooking);
    console.log('✅ Booking soft-deleted successfully by owner (preserved for analytics)');
    
    // Update listing availability status in case slots became available
    try {
      const { updateListingAvailabilityStatus } = await import('./listing-capacity');
      await updateListingAvailabilityStatus(booking.propertyId);
    } catch (statusError) {
      console.warn('⚠️ Could not update listing availability status:', statusError);
    }
    
    // Dispatch event to notify tenant dashboard that booking was deleted
    // Wrapped in try-catch to prevent event errors from breaking the deletion
    try {
      const { dispatchCustomEvent } = await import('./custom-events');
      dispatchCustomEvent('bookingDeleted', {
        bookingId,
        propertyId: booking.propertyId,
        tenantId: booking.tenantId,
        ownerId: booking.ownerId,
        timestamp: now
      });
    } catch (eventError) {
      console.warn('⚠️ Could not dispatch bookingDeleted event:', eventError);
      // Don't fail the deletion if event dispatch fails
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error deleting booking:', error);
    throw error;
  }
}

// Get booking summary for display
export async function getBookingSummary(bookingId: string): Promise<BookingSummary | null> {
  try {
    const booking = await db.get<BookingRecord>('bookings', bookingId);
    if (!booking) {
      return null;
    }
    
    return {
      id: booking.id,
      propertyTitle: booking.propertyTitle,
      propertyAddress: booking.propertyAddress,
      startDate: booking.startDate,
      endDate: booking.endDate,
      duration: booking.duration,
      monthlyRent: booking.monthlyRent,
      securityDeposit: booking.securityDeposit,
      totalAmount: booking.totalAmount,
      status: booking.status,
      createdAt: booking.createdAt,
    };
  } catch (error) {
    console.error('❌ Error getting booking summary:', error);
    return null;
  }
}

// Get status color for UI
export function getStatusColor(status: string): string {
  switch (status) {
    case 'pending':
      return '#F59E0B'; // amber
    case 'approved':
      return '#10B981'; // emerald
    case 'rejected':
      return '#EF4444'; // red
    case 'cancelled':
      return '#6B7280'; // gray
    case 'completed':
      return '#3B82F6'; // blue
    default:
      return '#6B7280'; // gray
  }
}

// Get status icon for UI
export function getStatusIcon(status: string): string {
  switch (status) {
    case 'pending':
      return '⏳';
    case 'approved':
      return '✅';
    case 'rejected':
      return '❌';
    case 'cancelled':
      return '🚫';
    case 'completed':
      return '🏠';
    default:
      return '❓';
  }
}

// Get payment accounts by owner (for payment methods)
export async function getPaymentAccountsByOwner(ownerId: string): Promise<any[]> {
  try {
    // For now, return empty array - payment accounts can be implemented later
    console.log('💳 Loading payment accounts for owner:', ownerId);
    return [];
  } catch (error) {
    console.error('❌ Error loading payment accounts:', error);
    return [];
  }
}

// Get unviewed booking notifications count for tenant
export async function getUnviewedBookingNotificationsCount(tenantId: string): Promise<number> {
  try {
    console.log('🔔 Getting unviewed booking notifications for tenant:', tenantId);
    
    const allBookings = await db.list<BookingRecord>('bookings');
    const tenantBookings = allBookings.filter(booking => booking.tenantId === tenantId);
    
    // Count bookings that have been updated but not viewed by tenant
    const unviewedCount = tenantBookings.filter(booking => {
      // Check if booking was updated after last view
      const wasUpdated = booking.updatedAt && booking.createdAt && 
                        new Date(booking.updatedAt) > new Date(booking.createdAt);
      const wasViewed = booking.notificationViewedByTenant === true;
      
      return wasUpdated && !wasViewed;
    }).length;
    
    console.log(`📊 Found ${unviewedCount} unviewed booking notifications for tenant`);
    return unviewedCount;
  } catch (error) {
    console.error('❌ Error getting unviewed booking notifications:', error);
    return 0;
  }
}

// Mark booking notifications as viewed by tenant
export async function markBookingNotificationsAsViewed(tenantId: string): Promise<void> {
  try {
    console.log('✅ Marking booking notifications as viewed for tenant:', tenantId);
    
    const allBookings = await db.list<BookingRecord>('bookings');
    const tenantBookings = allBookings.filter(booking => booking.tenantId === tenantId);
    
    for (const booking of tenantBookings) {
      if (!booking.notificationViewedByTenant) {
        const updatedBooking: BookingRecord = {
          ...booking,
          notificationViewedByTenant: true,
          notificationViewedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        await db.upsert('bookings', booking.id, updatedBooking);
      }
    }
    
    console.log('✅ All booking notifications marked as viewed');
  } catch (error) {
    console.error('❌ Error marking booking notifications as viewed:', error);
  }
}
