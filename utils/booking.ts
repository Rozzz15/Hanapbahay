import { db, generateId } from './db';
import { BookingRecord, PublishedListingRecord, DbUserRecord, RentPaymentRecord } from '@/types';

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
): Promise<{
  hasDuplicate: boolean;
  existingBooking?: BookingRecord;
  message?: string;
}> {
  try {
    console.log('🔍 Checking for duplicate booking:', { propertyId, tenantId });
    
    const bookings = await db.list<BookingRecord>('bookings');
    console.log('📋 Total bookings found:', bookings.length);
    
    // Check for active bookings (pending or approved, not deleted)
    const activeBooking = bookings.find(booking => 
      booking.propertyId === propertyId &&
      booking.tenantId === tenantId &&
      !booking.isDeleted &&
      (booking.status === 'pending' || booking.status === 'approved')
    );
    
    // Also check for deleted bookings to provide better error message
    const deletedBooking = bookings.find(booking => 
      booking.propertyId === propertyId &&
      booking.tenantId === tenantId &&
      booking.isDeleted &&
      (booking.status === 'pending' || booking.status === 'approved' || booking.status === 'rejected')
    );
    
    if (activeBooking) {
      console.log('🔍 Found active duplicate booking:', {
        id: activeBooking.id,
        status: activeBooking.status,
        paymentStatus: activeBooking.paymentStatus,
        isDeleted: activeBooking.isDeleted
      });
      
      const statusMessage = activeBooking.status === 'pending' 
        ? 'pending approval' 
        : activeBooking.paymentStatus === 'paid' 
          ? 'approved and paid' 
          : 'approved';
      
      return {
        hasDuplicate: true,
        existingBooking: activeBooking,
        message: `You already have a ${statusMessage} booking for this property. Each tenant can only have one active booking per property.`
      };
    }
    
    if (deletedBooking) {
      console.log('🔍 Found deleted booking for this property:', {
        id: deletedBooking.id,
        status: deletedBooking.status,
        isDeleted: deletedBooking.isDeleted,
        deletedAt: deletedBooking.deletedAt
      });
      
      return {
        hasDuplicate: true,
        existingBooking: deletedBooking,
        message: `You previously had a booking for this property that was removed. Please contact the property owner if you wish to book again.`
      };
    }
    
    console.log('🔍 No duplicate booking found');
    return { hasDuplicate: false };
  } catch (error) {
    console.error('❌ Error checking for duplicate booking:', error);
    return { hasDuplicate: false }; // Allow booking if check fails
  }
}

// Create a new booking
export async function createBooking(data: CreateBookingData): Promise<BookingRecord> {
  try {
    console.log('🔄 Creating booking with data:', data);
    
    // Check for duplicates
    const duplicateCheck = await checkDuplicateBooking(data.propertyId, data.tenantId);
    if (duplicateCheck.hasDuplicate) {
      throw new Error(duplicateCheck.message || 'You already have a booking for this property. Each tenant can only have one active booking per property.');
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

    // Calculate total amount (advance deposit = first month's rent + advance months if set)
    const monthlyRent = property.monthlyRent || 0;
    const advanceDepositMonths = property.advanceDepositMonths || 0; // Optional advance months (e.g., 3 months)
    
    // Total = first month + (advance months * monthly rent)
    // If advanceDepositMonths is 3, tenant pays: 1st month + 3 months advance = 4 months total
    const advanceAmount = advanceDepositMonths > 0 ? advanceDepositMonths * monthlyRent : 0;
    const totalAmount = monthlyRent + advanceAmount; // Security deposit feature removed

    console.log('💰 Booking calculations:', {
      monthlyRent,
      advanceDepositMonths,
      advanceAmount,
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
      securityDeposit: 0, // Security deposit feature removed
      advanceDepositMonths: advanceDepositMonths > 0 ? advanceDepositMonths : undefined,
      remainingAdvanceMonths: advanceDepositMonths > 0 ? advanceDepositMonths : undefined, // Track remaining advance months
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
    
    // When booking is approved, create the first payment with advance deposit
    if (status === 'approved') {
      try {
        await createInitialPaymentForApprovedBooking(bookingId, updatedBooking);
      } catch (paymentError) {
        console.error('❌ Error creating initial payment for approved booking:', paymentError);
        // Don't fail the approval if payment creation fails, but log the error
      }
    }
    
    // If a paid booking is rejected, update listing availability status (slot may have become available)
    // Also update if approving a booking (though it won't be occupied until paid)
    try {
      const { checkAndRejectPendingBookings } = await import('./listing-capacity');
      await checkAndRejectPendingBookings(booking.propertyId);
    } catch (statusError) {
      console.warn('⚠️ Could not update listing availability status:', statusError);
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error updating booking status:', error);
    return false;
  }
}

/**
 * Create or update the first payment record when owner marks booking as paid
 * This ensures the first payment always includes the advance deposit
 * This is the first payment from tenant to owner and happens BEFORE tenant is added to owner's list
 */
export async function createOrUpdateFirstPaymentForPaidBooking(
  bookingId: string,
  ownerId: string
): Promise<{
  success: boolean;
  paymentId?: string;
  error?: string;
}> {
  try {
    console.log('💰 Creating/updating first payment for paid booking:', bookingId);
    
    const booking = await db.get<BookingRecord>('bookings', bookingId);
    if (!booking) {
      return {
        success: false,
        error: 'Booking not found'
      };
    }
    
    if (booking.ownerId !== ownerId) {
      return {
        success: false,
        error: 'Unauthorized: You can only update payments for your own properties'
      };
    }
    
    // Get existing payments
    const { getRentPaymentsByBooking, getCurrentMonth } = await import('./tenant-payments');
    const existingPayments = await getRentPaymentsByBooking(bookingId);
    
    // Check if there are any paid payments to determine if this is the first payment
    // When owner marks booking as paid, this is the first payment from tenant to owner
    const paidPayments = existingPayments.filter(p => p.status === 'paid');
    const isFirstPayment = paidPayments.length === 0;
    
    const hasAdvanceDeposit = booking.advanceDepositMonths && booking.advanceDepositMonths > 0;
    const monthlyRent = booking.monthlyRent || 0;
    
    // CRITICAL: First payment MUST include advance deposit (totalAmount)
    // This is the first payment of the tenant for the owner and must include advance deposit
    // Subsequent payments use monthlyRent only
    let paymentAmount: number;
    if (isFirstPayment) {
      // For first payment, always use totalAmount which includes advance deposit
      // If totalAmount is not set, calculate it: monthlyRent + (advanceDepositMonths * monthlyRent)
      if (booking.totalAmount && booking.totalAmount > 0) {
        paymentAmount = booking.totalAmount;
      } else if (hasAdvanceDeposit && booking.advanceDepositMonths) {
        // Calculate totalAmount if not set: first month + advance months
        paymentAmount = monthlyRent + (booking.advanceDepositMonths * monthlyRent);
      } else {
        // No advance deposit, just first month's rent
        paymentAmount = monthlyRent;
      }
    } else {
      // Subsequent payments are monthly rent only
      paymentAmount = monthlyRent;
    }
    
    // Determine payment month
    const currentMonth = getCurrentMonth();
    const startDate = new Date(booking.startDate);
    const startMonth = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}`;
    const paymentMonth = startMonth <= currentMonth ? startMonth : currentMonth;
    
    const now = new Date();
    const paidDate = now.toISOString();
    
    // Look for existing payment for the first payment month
    const existingPayment = existingPayments.find(
      p => p.paymentMonth === paymentMonth || p.paymentMonth === startMonth
    ) || existingPayments[0]; // Fallback to first payment if no match
    
    if (existingPayment) {
      // When owner marks booking as paid, we MUST ensure the first payment includes advance deposit
      // Update existing payment to ensure it has correct amount with advance deposit
      const needsUpdate = existingPayment.status !== 'paid' || 
                         (isFirstPayment && existingPayment.amount !== paymentAmount) ||
                         (isFirstPayment && hasAdvanceDeposit && existingPayment.amount < paymentAmount);
      
      if (needsUpdate) {
        console.log('🔄 Updating existing first payment to include advance deposit:', {
          paymentId: existingPayment.id,
          currentAmount: existingPayment.amount,
          expectedAmount: paymentAmount,
          isFirstPayment,
          hasAdvanceDeposit,
          advanceDepositMonths: booking.advanceDepositMonths,
          monthlyRent: booking.monthlyRent,
          bookingTotalAmount: booking.totalAmount
        });
        
        const updatedPayment: RentPaymentRecord = {
          ...existingPayment,
          amount: paymentAmount, // CRITICAL: Ensure it has the correct amount with advance deposit for first payment
          totalAmount: paymentAmount + (existingPayment.lateFee || 0),
          paidDate: existingPayment.status === 'paid' ? existingPayment.paidDate : paidDate,
          status: 'paid',
          paymentMethod: booking.selectedPaymentMethod || existingPayment.paymentMethod || 'Manual',
          notes: isFirstPayment && hasAdvanceDeposit
            ? `First payment (includes ${booking.advanceDepositMonths} month${booking.advanceDepositMonths !== 1 ? 's' : ''} advance deposit) - before tenant added to owner's list`
            : isFirstPayment 
              ? 'First payment - before tenant added to owner\'s list'
              : existingPayment.notes || 'Rent payment',
          receiptNumber: isFirstPayment && existingPayment.receiptNumber?.startsWith('RENT-')
            ? `INITIAL-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`
            : existingPayment.receiptNumber,
          updatedAt: paidDate,
        };
        
        await db.upsert('rent_payments', existingPayment.id, updatedPayment);
        console.log('✅ Updated existing first payment with advance deposit:', {
          paymentId: existingPayment.id,
          amount: paymentAmount,
          includesAdvanceDeposit: hasAdvanceDeposit
        });
        
        return {
          success: true,
          paymentId: existingPayment.id
        };
      } else {
        console.log('ℹ️ Existing payment already has correct amount with advance deposit:', {
          paymentId: existingPayment.id,
          amount: existingPayment.amount,
          expectedAmount: paymentAmount
        });
        return {
          success: true,
          paymentId: existingPayment.id
        };
      }
    } else {
      // Create new first payment record with advance deposit
      // This is the first payment from tenant to owner and MUST include advance deposit
      console.log('🆕 Creating new first payment with advance deposit:', {
        paymentAmount,
        isFirstPayment,
        hasAdvanceDeposit,
        advanceDepositMonths: booking.advanceDepositMonths,
        monthlyRent: booking.monthlyRent,
        bookingTotalAmount: booking.totalAmount,
        calculatedAmount: hasAdvanceDeposit && booking.advanceDepositMonths 
          ? monthlyRent + (booking.advanceDepositMonths * monthlyRent) 
          : monthlyRent
      });
      
      const firstPaymentRecord: RentPaymentRecord = {
        id: generateId('rent_payment'),
        bookingId: booking.id,
        tenantId: booking.tenantId,
        ownerId: booking.ownerId,
        propertyId: booking.propertyId,
        amount: paymentAmount, // CRITICAL: First payment includes advance deposit (totalAmount)
        lateFee: 0,
        totalAmount: paymentAmount,
        paymentMonth: paymentMonth,
        dueDate: booking.startDate,
        paidDate: paidDate,
        status: 'paid',
        paymentMethod: booking.selectedPaymentMethod || 'Manual',
        receiptNumber: `INITIAL-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
        notes: isFirstPayment && hasAdvanceDeposit
          ? `First payment (includes ${booking.advanceDepositMonths} month${booking.advanceDepositMonths !== 1 ? 's' : ''} advance deposit) - before tenant added to owner's list` 
          : isFirstPayment
            ? 'First payment - before tenant added to owner\'s list'
            : 'Rent payment',
        createdAt: paidDate,
        updatedAt: paidDate,
      };
      
      await db.upsert('rent_payments', firstPaymentRecord.id, firstPaymentRecord);
      console.log('✅ Created first payment record with advance deposit:', {
        paymentId: firstPaymentRecord.id,
        amount: paymentAmount,
        includesAdvanceDeposit: hasAdvanceDeposit,
        advanceDepositMonths: booking.advanceDepositMonths
      });
      
      return {
        success: true,
        paymentId: firstPaymentRecord.id
      };
    }
  } catch (error) {
    console.error('❌ Error creating/updating first payment for paid booking:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create/update first payment'
    };
  }
}

/**
 * Create the initial payment for an approved booking
 * This payment includes the advance deposit and is the first payment of the tenant to the owner
 * The advance payment is applied immediately upon approval and will be the first payment
 */
async function createInitialPaymentForApprovedBooking(
  bookingId: string,
  booking: BookingRecord
): Promise<void> {
  try {
    console.log('💰 Creating initial payment for approved booking:', bookingId);
    
    // Check if payment already exists for this booking
    const { getRentPaymentsByBooking } = await import('./tenant-payments');
    const existingPayments = await getRentPaymentsByBooking(bookingId);
    
    // Check if there are any existing payments
    // If there are existing payments, check if the first payment already has the correct amount
    if (existingPayments.length > 0) {
      // Sort payments by due date to find the first payment
      const sortedPayments = [...existingPayments].sort(
        (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
      );
      const firstPayment = sortedPayments[0];
      
      // Update the first payment to ensure it has the correct amount with advance deposit
      const monthlyRent = booking.monthlyRent || 0;
      const hasAdvanceDeposit = booking.advanceDepositMonths && booking.advanceDepositMonths > 0;
      
      // Calculate expected amount for first payment (must include advance deposit)
      let expectedAmount: number;
      if (booking.totalAmount && booking.totalAmount > 0) {
        expectedAmount = booking.totalAmount;
      } else if (hasAdvanceDeposit && booking.advanceDepositMonths) {
        // Calculate: first month + advance months
        expectedAmount = monthlyRent + (booking.advanceDepositMonths * monthlyRent);
      } else {
        // No advance deposit, just first month's rent
        expectedAmount = monthlyRent;
      }
      
      if (firstPayment.amount !== expectedAmount) {
        console.log('🔄 Updating first payment to include advance deposit:', {
          paymentId: firstPayment.id,
          currentAmount: firstPayment.amount,
          expectedAmount,
          bookingTotalAmount: booking.totalAmount,
          advanceDepositMonths: booking.advanceDepositMonths,
          monthlyRent
        });
        
        const updatedPayment = {
          ...firstPayment,
          amount: expectedAmount,
          totalAmount: expectedAmount + (firstPayment.lateFee || 0),
          notes: booking.advanceDepositMonths && booking.advanceDepositMonths > 0
            ? `First payment (includes ${booking.advanceDepositMonths} month${booking.advanceDepositMonths !== 1 ? 's' : ''} advance deposit)`
            : 'First payment',
          receiptNumber: firstPayment.receiptNumber?.startsWith('RENT-')
            ? `INITIAL-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`
            : firstPayment.receiptNumber,
          updatedAt: new Date().toISOString()
        };
        
        await db.upsert('rent_payments', firstPayment.id, updatedPayment);
        console.log('✅ Updated first payment with advance deposit amount');
      } else {
        console.log('ℹ️ First payment already has correct advance deposit amount');
      }
      return;
    }
    
    // No existing payments - create the first payment with advance deposit
    // This is the first payment from tenant to owner and MUST include advance deposit
    const monthlyRent = booking.monthlyRent || 0;
    const hasAdvanceDeposit = booking.advanceDepositMonths && booking.advanceDepositMonths > 0;
    
    // Calculate payment amount - must include advance deposit for first payment
    let paymentAmount: number;
    if (booking.totalAmount && booking.totalAmount > 0) {
      paymentAmount = booking.totalAmount; // Use totalAmount which includes advance deposit
    } else if (hasAdvanceDeposit && booking.advanceDepositMonths) {
      // Calculate: first month + advance months
      paymentAmount = monthlyRent + (booking.advanceDepositMonths * monthlyRent);
    } else {
      // No advance deposit, just first month's rent
      paymentAmount = monthlyRent;
    }
    
    // Use start date for the first payment
    const startDate = new Date(booking.startDate);
    const paymentMonth = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}`;
    const dueDate = booking.startDate;
    
    const payment: RentPaymentRecord = {
      id: generateId('rent_payment'),
      bookingId: booking.id,
      tenantId: booking.tenantId,
      ownerId: booking.ownerId,
      propertyId: booking.propertyId,
      amount: paymentAmount, // Includes advance deposit - this is the first payment
      lateFee: 0,
      totalAmount: paymentAmount,
      paymentMonth: paymentMonth,
      dueDate: dueDate,
      status: 'pending', // Will be marked as paid when owner confirms payment
      paymentMethod: booking.selectedPaymentMethod || undefined,
      receiptNumber: `INITIAL-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
      notes: hasAdvanceDeposit
        ? `First payment (includes ${booking.advanceDepositMonths} month${booking.advanceDepositMonths !== 1 ? 's' : ''} advance deposit)`
        : 'First payment',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    await db.upsert('rent_payments', payment.id, payment);
    console.log('✅ Created initial payment for approved booking (first payment with advance deposit):', {
      paymentId: payment.id,
      amount: paymentAmount,
      paymentMonth,
      dueDate,
      hasAdvanceDeposit,
      advanceDepositMonths: booking.advanceDepositMonths,
      monthlyRent
    });
  } catch (error) {
    console.error('❌ Error creating initial payment for approved booking:', error);
    throw error;
  }
}

// Cancel booking (for tenants) - Soft deletes the booking (preserves for analytics)
// If tenant has advance deposit months, they can use them when leaving early
export async function cancelBooking(
  bookingId: string, 
  tenantId: string,
  useAdvanceMonths: boolean = false
): Promise<{
  success: boolean;
  usedAdvanceMonths?: boolean;
  remainingAdvanceMonths?: number;
  message?: string;
  error?: string;
}> {
  try {
    console.log('🔄 Cancelling (soft deleting) booking:', { bookingId, tenantId, useAdvanceMonths });
    
    const booking = await db.get<BookingRecord>('bookings', bookingId);
    if (!booking) {
      return {
        success: false,
        error: 'Booking not found'
      };
    }
    
    if (booking.tenantId !== tenantId) {
      return {
        success: false,
        error: 'Unauthorized: You can only cancel your own bookings'
      };
    }
    
    if (booking.status === 'cancelled') {
      return {
        success: false,
        error: 'Booking is already cancelled'
      };
    }
    
    if (booking.status === 'completed') {
      return {
        success: false,
        error: 'Cannot cancel a completed booking'
      };
    }

    // If tenant wants to use advance months and has them available
    let advanceResult = null;
    if (useAdvanceMonths && booking.remainingAdvanceMonths && booking.remainingAdvanceMonths > 0) {
      try {
        const { useAdvanceDepositMonths } = await import('./advance-deposit');
        advanceResult = await useAdvanceDepositMonths(bookingId, 1); // Use 1 month at a time
        
        if (advanceResult.success) {
          // Update booking with new remaining months
          booking.remainingAdvanceMonths = advanceResult.remainingAdvanceMonths;
          
          // If advance months are exhausted, booking will be auto-completed
          // Otherwise, just mark as cancelled
          if (advanceResult.remainingAdvanceMonths === 0) {
            // Booking will be auto-completed by advance-deposit.ts
            return {
              success: true,
              usedAdvanceMonths: true,
              remainingAdvanceMonths: 0,
              message: 'Used advance deposit month. All advance months exhausted. You will be automatically removed from the property.'
            };
          }
        }
      } catch (advanceError) {
        console.warn('⚠️ Could not use advance months:', advanceError);
        // Continue with regular cancellation
      }
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
      const { checkAndRejectPendingBookings } = await import('./listing-capacity');
      await checkAndRejectPendingBookings(booking.propertyId);
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
    
    return {
      success: true,
      usedAdvanceMonths: advanceResult?.success || false,
      remainingAdvanceMonths: advanceResult?.remainingAdvanceMonths,
      message: advanceResult?.success 
        ? `Used advance deposit month. ${advanceResult.remainingAdvanceMonths} month(s) remaining.`
        : 'Booking cancelled successfully.'
    };
  } catch (error) {
    console.error('❌ Error cancelling booking:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
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
      const { checkAndRejectPendingBookings } = await import('./listing-capacity');
      await checkAndRejectPendingBookings(booking.propertyId);
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
      securityDeposit: 0, // Security deposit feature removed
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
