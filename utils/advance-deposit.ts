import { db } from './db';
import { BookingRecord, RentPaymentRecord } from '@/types';

/**
 * Use advance deposit months when tenant wants to leave early
 * This allows tenant to use their pre-paid advance months instead of paying monthly
 * @param bookingId - The booking ID
 * @param monthsToUse - Number of advance months to use (default: 1)
 * @returns Object with success status and remaining advance months
 */
export async function useAdvanceDepositMonths(
  bookingId: string,
  monthsToUse: number = 1
): Promise<{
  success: boolean;
  remainingAdvanceMonths?: number;
  message?: string;
  error?: string;
}> {
  try {
    const booking = await db.get<BookingRecord>('bookings', bookingId);
    if (!booking) {
      return {
        success: false,
        error: 'Booking not found'
      };
    }

    // Check if booking has advance deposit months
    if (!booking.advanceDepositMonths || booking.advanceDepositMonths === 0) {
      return {
        success: false,
        error: 'No advance deposit months available for this booking'
      };
    }

    const currentRemaining = booking.remainingAdvanceMonths || booking.advanceDepositMonths;
    
    if (currentRemaining < monthsToUse) {
      return {
        success: false,
        error: `Insufficient advance months. Available: ${currentRemaining}, Requested: ${monthsToUse}`
      };
    }

    // Deduct the advance months
    const newRemaining = currentRemaining - monthsToUse;

    // Update booking
    const updatedBooking: BookingRecord = {
      ...booking,
      remainingAdvanceMonths: newRemaining,
      updatedAt: new Date().toISOString()
    };

    await db.upsert('bookings', bookingId, updatedBooking);

    console.log(`✅ Used ${monthsToUse} advance month(s). Remaining: ${newRemaining}`);

    // Check if advance months are exhausted and auto-remove tenant
    if (newRemaining === 0) {
      await autoRemoveTenantWhenAdvanceExhausted(bookingId);
    }

    return {
      success: true,
      remainingAdvanceMonths: newRemaining,
      message: `Used ${monthsToUse} advance month(s). ${newRemaining} month(s) remaining.`
    };
  } catch (error) {
    console.error('❌ Error using advance deposit months:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Automatically remove tenant from property when advance deposit months are exhausted
 * This marks the booking as completed and updates property availability
 */
export async function autoRemoveTenantWhenAdvanceExhausted(bookingId: string): Promise<void> {
  try {
    const booking = await db.get<BookingRecord>('bookings', bookingId);
    if (!booking) {
      throw new Error('Booking not found');
    }

    // Only auto-remove if booking is active and advance months are exhausted
    if (booking.status !== 'approved' || booking.paymentStatus !== 'paid') {
      return; // Don't remove if booking is not active
    }

    if (booking.remainingAdvanceMonths !== undefined && booking.remainingAdvanceMonths > 0) {
      return; // Don't remove if there are still advance months remaining
    }

    // Mark booking as completed
    const now = new Date().toISOString();
    const updatedBooking: BookingRecord = {
      ...booking,
      status: 'completed',
      completedAt: now,
      updatedAt: now
    };

    await db.upsert('bookings', bookingId, updatedBooking);
    console.log(`✅ Auto-removed tenant from property. Booking ${bookingId} marked as completed.`);

    // Update property availability status
    try {
      const { updateListingAvailabilityStatus } = await import('./listing-capacity');
      await updateListingAvailabilityStatus(booking.propertyId);
    } catch (statusError) {
      console.warn('⚠️ Could not update listing availability status:', statusError);
    }

    // Dispatch event to notify owner and tenant
    try {
      const { dispatchCustomEvent } = await import('./custom-events');
      dispatchCustomEvent('bookingCompleted', {
        bookingId,
        propertyId: booking.propertyId,
        tenantId: booking.tenantId,
        ownerId: booking.ownerId,
        reason: 'advance_deposit_exhausted',
        timestamp: now
      });
    } catch (eventError) {
      console.warn('⚠️ Could not dispatch booking completed event:', eventError);
    }
  } catch (error) {
    console.error('❌ Error auto-removing tenant:', error);
    throw error;
  }
}

/**
 * Check and update advance months when a monthly payment is made
 * If tenant has advance months, use them instead of creating a new payment record
 * @param bookingId - The booking ID
 * @param paymentMonth - The payment month in YYYY-MM format
 * @returns Object indicating if advance month was used
 */
export async function checkAndUseAdvanceMonthForPayment(
  bookingId: string,
  paymentMonth: string
): Promise<{
  usedAdvanceMonth: boolean;
  remainingAdvanceMonths?: number;
}> {
  try {
    const booking = await db.get<BookingRecord>('bookings', bookingId);
    if (!booking) {
      return { usedAdvanceMonth: false };
    }

    // Check if booking has remaining advance months
    if (!booking.remainingAdvanceMonths || booking.remainingAdvanceMonths === 0) {
      return { usedAdvanceMonth: false };
    }

    // Check if payment for this month already exists and is paid
    const { getRentPaymentsByBooking } = await import('./tenant-payments');
    const existingPayments = await getRentPaymentsByBooking(bookingId);
    const existingPayment = existingPayments.find(
      p => p.paymentMonth === paymentMonth && p.status === 'paid'
    );

    // If payment already exists and is paid, don't use advance month
    if (existingPayment) {
      return { usedAdvanceMonth: false };
    }

    // Use one advance month for this payment
    const result = await useAdvanceDepositMonths(bookingId, 1);
    
    if (result.success) {
      // Mark the payment month as covered by advance deposit
      // Create a payment record with status 'paid' to track that this month is covered
      const { generateId } = await import('./db');
      const advancePayment: RentPaymentRecord = {
        id: generateId('rent_payment'),
        bookingId,
        tenantId: booking.tenantId,
        ownerId: booking.ownerId,
        propertyId: booking.propertyId,
        amount: booking.monthlyRent,
        lateFee: 0,
        totalAmount: booking.monthlyRent,
        paymentMonth,
        dueDate: new Date(paymentMonth + '-01').toISOString().split('T')[0],
        paidDate: new Date().toISOString(),
        status: 'paid',
        receiptNumber: `ADVANCE-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
        notes: `Paid using advance deposit month`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await db.upsert('rent_payments', advancePayment.id, advancePayment);
      console.log(`✅ Created payment record for ${paymentMonth} using advance deposit`);

      return {
        usedAdvanceMonth: true,
        remainingAdvanceMonths: result.remainingAdvanceMonths
      };
    }

    return { usedAdvanceMonth: false };
  } catch (error) {
    console.error('❌ Error checking advance month for payment:', error);
    return { usedAdvanceMonth: false };
  }
}

/**
 * Get advance deposit information for a booking
 */
export async function getAdvanceDepositInfo(bookingId: string): Promise<{
  advanceDepositMonths?: number;
  remainingAdvanceMonths?: number;
  hasAdvanceDeposit: boolean;
}> {
  try {
    const booking = await db.get<BookingRecord>('bookings', bookingId);
    if (!booking) {
      return { hasAdvanceDeposit: false };
    }

    const advanceMonths = booking.advanceDepositMonths || 0;
    const remaining = booking.remainingAdvanceMonths ?? advanceMonths;

    return {
      advanceDepositMonths: advanceMonths > 0 ? advanceMonths : undefined,
      remainingAdvanceMonths: remaining > 0 ? remaining : undefined,
      hasAdvanceDeposit: advanceMonths > 0
    };
  } catch (error) {
    console.error('❌ Error getting advance deposit info:', error);
    return { hasAdvanceDeposit: false };
  }
}

/**
 * End rental stay and use all remaining advance deposit months
 * This allows tenants to end their rental stay early by using their pre-paid advance months
 * Only works for listings that have advance deposit set
 * @param bookingId - The booking ID
 * @param tenantId - The tenant ID (for authorization)
 * @param immediateLeave - If true, immediately remove tenant. If false, start countdown based on remaining months
 * @returns Object with success status and details
 */
export async function endRentalStayWithAdvanceDeposit(
  bookingId: string,
  tenantId: string,
  immediateLeave: boolean = false
): Promise<{
  success: boolean;
  monthsUsed?: number;
  remainingAdvanceMonths?: number;
  terminationEndDate?: string;
  daysRemaining?: number;
  message?: string;
  error?: string;
}> {
  try {
    console.log('🔄 Ending rental stay with advance deposit:', { bookingId, tenantId });
    
    const booking = await db.get<BookingRecord>('bookings', bookingId);
    if (!booking) {
      return {
        success: false,
        error: 'Booking not found'
      };
    }

    // Verify tenant authorization
    if (booking.tenantId !== tenantId) {
      return {
        success: false,
        error: 'Unauthorized: You can only end your own rental stay'
      };
    }

    // Check if booking is active
    if (booking.status !== 'approved' || booking.paymentStatus !== 'paid') {
      return {
        success: false,
        error: 'Can only end rental stay for active approved bookings'
      };
    }

    // Check if listing has advance deposit
    if (!booking.advanceDepositMonths || booking.advanceDepositMonths === 0) {
      return {
        success: false,
        error: 'This property does not have advance deposit. You cannot end your rental stay using this feature.'
      };
    }

    const currentRemaining = booking.remainingAdvanceMonths ?? booking.advanceDepositMonths;
    
    if (currentRemaining === 0) {
      return {
        success: false,
        error: 'No remaining advance deposit months available'
      };
    }

    // Check if termination is already initiated
    if (booking.terminationInitiatedAt && !immediateLeave) {
      return {
        success: false,
        error: 'Termination already initiated. Use "Leave Immediately" to end your stay now.'
      };
    }

    const monthsToUse = currentRemaining;
    
    if (monthsToUse === 0) {
      return {
        success: false,
        error: 'No remaining advance deposit months available'
      };
    }

    // If immediate leave, process immediately
    if (immediateLeave) {
      return await processImmediateLeave(bookingId, booking, monthsToUse);
    }

    // Otherwise, start countdown mode
    console.log(`⏳ Starting countdown mode with ${monthsToUse} advance month(s)`);
    
    const now = new Date();
    const terminationEndDate = new Date(now);
    terminationEndDate.setMonth(terminationEndDate.getMonth() + monthsToUse);
    
    // Calculate days remaining
    const daysRemaining = Math.ceil((terminationEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    // Update booking with termination info but keep it as approved/paid
    // Don't deduct remainingAdvanceMonths yet - it will be deducted when countdown reaches 0 or immediate leave
    const updatedBooking: BookingRecord = {
      ...booking,
      terminationInitiatedAt: now.toISOString(),
      terminationEndDate: terminationEndDate.toISOString(),
      terminationMode: 'countdown',
      // Keep remainingAdvanceMonths as is - don't deduct until countdown ends or immediate leave
      updatedAt: now.toISOString()
    };
    
    await db.upsert('bookings', bookingId, updatedBooking);
    console.log(`✅ Started termination countdown. End date: ${terminationEndDate.toISOString()}, Days remaining: ${daysRemaining}`);
    
    // Send notification to owner
    try {
      const { createOrFindConversation } = await import('./conversation-utils');
      const { MessageRecord } = await import('../types');
      const { generateId } = await import('./db');
      const conversationId = await createOrFindConversation({
        ownerId: booking.ownerId,
        tenantId: booking.tenantId,
        ownerName: booking.ownerName,
        tenantName: booking.tenantName,
        propertyId: booking.propertyId,
        propertyTitle: booking.propertyTitle,
      });

      const messageId = generateId('msg');
      const messageText = `🏠 Rental Stay Termination Initiated\n\n${booking.tenantName} has initiated ending their rental stay at ${booking.propertyTitle}.\n\n${monthsToUse} advance deposit month(s) will be used over the next ${daysRemaining} days.\n\nThe tenant will be automatically removed on ${terminationEndDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}.`;

      const messageRecord: MessageRecord = {
        id: messageId,
        conversationId,
        senderId: booking.tenantId,
        senderName: booking.tenantName,
        text: messageText,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      };

      await db.upsert('messages', messageId, messageRecord);
      console.log('✅ Sent notification to owner about termination initiation');
    } catch (messageError) {
      console.warn('⚠️ Could not send notification to owner:', messageError);
    }
    
    return {
      success: true,
      monthsUsed: 0, // No months used yet in countdown mode
      remainingAdvanceMonths: currentRemaining, // Return current remaining, not monthsToUse
      terminationEndDate: terminationEndDate.toISOString(),
      daysRemaining,
      message: `Termination countdown started. You have ${daysRemaining} days (${monthsToUse} months) remaining. You can leave immediately anytime.`
    };
  } catch (error) {
    console.error('❌ Error ending rental stay with advance deposit:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Process immediate leave - immediately remove tenant and use all advance months
 */
async function processImmediateLeave(
  bookingId: string,
  booking: BookingRecord,
  monthsToUse: number
): Promise<{
  success: boolean;
  monthsUsed?: number;
  remainingAdvanceMonths?: number;
  message?: string;
  error?: string;
}> {
  try {
    console.log(`💰 Processing immediate leave with ${monthsToUse} advance month(s)`);

    // Get all upcoming unpaid payments
    const { getRentPaymentsByBooking, getNextDueDate } = await import('./tenant-payments');
    const existingPayments = await getRentPaymentsByBooking(bookingId);
    const unpaidPayments = existingPayments.filter(
      p => p.status === 'pending' || p.status === 'overdue' || p.status === 'rejected'
    );

    const { generateId } = await import('./db');
    const now = new Date().toISOString();
    let paymentsCovered = 0;

    // Step 1: Cover existing unpaid payments first
    // Sort unpaid payments by due date to cover them in order
    const sortedUnpaidPayments = unpaidPayments.sort((a, b) => 
      new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
    );

    // Cover up to monthsToUse existing unpaid payments
    const paymentsToCover = Math.min(monthsToUse, sortedUnpaidPayments.length);
    for (let i = 0; i < paymentsToCover; i++) {
      const payment = sortedUnpaidPayments[i];
      
      // Mark payment as paid using advance deposit
      const updatedPayment: RentPaymentRecord = {
        ...payment,
        status: 'paid',
        paidDate: now,
        paymentMethod: 'Advance Deposit',
        receiptNumber: payment.receiptNumber?.startsWith('ADVANCE-') 
          ? payment.receiptNumber 
          : `ADVANCE-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
        notes: `Paid using advance deposit month (rental stay ended)`,
        updatedAt: now
      };

      await db.upsert('rent_payments', payment.id, updatedPayment);
      paymentsCovered++;
      console.log(`✅ Covered existing payment ${payment.paymentMonth} with advance deposit`);
    }

    // Step 2: Create payment records for future months if there are remaining advance months
    const remainingMonths = monthsToUse - paymentsCovered;
    if (remainingMonths > 0) {
      // Get the last paid payment to determine where to start future payments
      const allPaymentsAfterCovering = await getRentPaymentsByBooking(bookingId);
      const lastPaidPayment = allPaymentsAfterCovering
        .filter(p => p.status === 'paid')
        .sort((a, b) => new Date(b.paidDate || '').getTime() - new Date(a.paidDate || '').getTime())[0];
      
      const nextDueDate = getNextDueDate(booking.startDate, lastPaidPayment?.paidDate);
      let currentDate = new Date(nextDueDate);
      const startDate = new Date(booking.startDate);
      const moveInDay = startDate.getDate();

      console.log(`📅 Creating ${remainingMonths} future payment record(s) starting from ${nextDueDate}`);

      let futurePaymentsCreated = 0;
      let attempts = 0;
      const maxAttempts = remainingMonths * 2; // Safety limit to prevent infinite loop

      // Create exactly remainingMonths payment records, skipping months that are already paid
      while (futurePaymentsCreated < remainingMonths && attempts < maxAttempts) {
        attempts++;
        
        // Move to next month
        currentDate.setMonth(currentDate.getMonth() + 1);
        const paymentMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
        
        // Check if payment already exists
        const existingPaymentIndex = allPaymentsAfterCovering.findIndex(p => p.paymentMonth === paymentMonth);
        const existingPayment = existingPaymentIndex >= 0 ? allPaymentsAfterCovering[existingPaymentIndex] : null;
        
        if (existingPayment) {
          // If payment exists and is already paid, skip it
          if (existingPayment.status === 'paid') {
            console.log(`⏭️ Skipping ${paymentMonth} - already paid`);
            continue; // Skip this month and try the next one
          }
          // If payment exists but is not paid, update it instead of creating a new one
          const updatedPayment: RentPaymentRecord = {
            ...existingPayment,
            status: 'paid',
            paidDate: now,
            paymentMethod: 'Advance Deposit',
            receiptNumber: existingPayment.receiptNumber?.startsWith('ADVANCE-') 
              ? existingPayment.receiptNumber 
              : `ADVANCE-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
            notes: `Paid using advance deposit month (rental stay ended)`,
            updatedAt: now
          };
          await db.upsert('rent_payments', existingPayment.id, updatedPayment);
          paymentsCovered++;
          futurePaymentsCreated++;
          console.log(`✅ Updated existing payment ${paymentMonth} to paid using advance deposit`);
          // Update the existing entry in the array instead of pushing a new one
          if (existingPaymentIndex >= 0) {
            allPaymentsAfterCovering[existingPaymentIndex] = updatedPayment;
          }
          continue;
        }

        // Calculate due date for this month
        const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
        const targetDay = Math.min(moveInDay, lastDayOfMonth);
        const dueDate = new Date(currentDate);
        dueDate.setDate(targetDay);

        const advancePayment: RentPaymentRecord = {
          id: generateId('rent_payment'),
          bookingId,
          tenantId: booking.tenantId,
          ownerId: booking.ownerId,
          propertyId: booking.propertyId,
          amount: booking.monthlyRent,
          lateFee: 0,
          totalAmount: booking.monthlyRent,
          paymentMonth,
          dueDate: dueDate.toISOString().split('T')[0],
          paidDate: now,
          status: 'paid',
          paymentMethod: 'Advance Deposit',
          receiptNumber: `ADVANCE-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
          notes: `Paid using advance deposit month (rental stay ended)`,
          createdAt: now,
          updatedAt: now
        };

        await db.upsert('rent_payments', advancePayment.id, advancePayment);
        paymentsCovered++;
        futurePaymentsCreated++;
        console.log(`✅ Created future payment record for ${paymentMonth} using advance deposit`);
        
        // Update the payments list to include the newly created payment
        allPaymentsAfterCovering.push(advancePayment);
      }

      if (futurePaymentsCreated < remainingMonths) {
        console.warn(`⚠️ Only created ${futurePaymentsCreated} of ${remainingMonths} future payment records`);
      }
    }

    console.log(`✅ Covered ${paymentsCovered} payment(s) with ${monthsToUse} advance month(s)`);

    // Step 3: Mark booking as completed and clear termination fields
    const finalBooking: BookingRecord = {
      ...booking,
      remainingAdvanceMonths: 0,
      status: 'completed',
      completedAt: now,
      terminationInitiatedAt: undefined,
      terminationEndDate: undefined,
      terminationMode: undefined,
      updatedAt: now
    };

    await db.upsert('bookings', bookingId, finalBooking);
    console.log(`✅ Immediate leave processed. Deducted ${monthsToUse} advance month(s) and marked booking as completed`);

    // Update property availability
    try {
      const { updateListingAvailabilityStatus } = await import('./listing-capacity');
      await updateListingAvailabilityStatus(booking.propertyId);
      console.log(`✅ Updated property availability for ${booking.propertyId}`);
    } catch (statusError) {
      console.warn('⚠️ Could not update listing availability status:', statusError);
    }

    // Send notification to owner
    try {
      const { createOrFindConversation } = await import('./conversation-utils');
      const { MessageRecord } = await import('../types');
      const { generateId } = await import('./db');
      const conversationId = await createOrFindConversation({
        ownerId: booking.ownerId,
        tenantId: booking.tenantId,
        ownerName: booking.ownerName,
        tenantName: booking.tenantName,
        propertyId: booking.propertyId,
        propertyTitle: booking.propertyTitle,
      });

      const messageId = generateId('msg');
      const messageText = `🏠 Rental Stay Ended Immediately\n\n${booking.tenantName} has ended their rental stay at ${booking.propertyTitle}.\n\n${monthsToUse} advance deposit month(s) were used to cover remaining payments.\n\nThe property is now available for new tenants.`;

      const messageRecord: MessageRecord = {
        id: messageId,
        conversationId,
        senderId: booking.tenantId,
        senderName: booking.tenantName,
        text: messageText,
        createdAt: now,
        updatedAt: now,
      };

      await db.upsert('messages', messageId, messageRecord);
      console.log('✅ Sent notification to owner about immediate leave');
    } catch (messageError) {
      console.warn('⚠️ Could not send notification to owner:', messageError);
    }

    // Dispatch event
    try {
      const { dispatchCustomEvent } = await import('./custom-events');
      dispatchCustomEvent('bookingCompleted', {
        bookingId,
        propertyId: booking.propertyId,
        tenantId: booking.tenantId,
        ownerId: booking.ownerId,
        reason: 'tenant_ended_rental_immediate',
        monthsUsed: monthsToUse,
        timestamp: now
      });
    } catch (eventError) {
      console.warn('⚠️ Could not dispatch booking completed event:', eventError);
    }

    // Dispatch event
    try {
      const { dispatchCustomEvent } = await import('./custom-events');
      dispatchCustomEvent('bookingCompleted', {
        bookingId,
        propertyId: booking.propertyId,
        tenantId: booking.tenantId,
        ownerId: booking.ownerId,
        reason: 'tenant_ended_rental_immediate',
        monthsUsed: monthsToUse,
        timestamp: now
      });
    } catch (eventError) {
      console.warn('⚠️ Could not dispatch booking completed event:', eventError);
    }

    return {
      success: true,
      monthsUsed: monthsToUse,
      remainingAdvanceMonths: 0,
      message: `Successfully ended rental stay immediately. ${monthsToUse} advance deposit month(s) were used to cover ${paymentsCovered} payment(s).`
    };
  } catch (error) {
    console.error('❌ Error processing immediate leave:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Process termination countdown for bookings
 * This should be called daily to check if countdown has reached 0 and automatically remove tenants
 * @returns Object with processed count and any errors
 */
export async function processTerminationCountdown(): Promise<{
  processed: number;
  removed: number;
  errors: number;
}> {
  try {
    console.log('🔄 Processing termination countdowns...');
    
    const allBookings = await db.list<BookingRecord>('bookings');
    const now = new Date();
    let processed = 0;
    let removed = 0;
    let errors = 0;
    
    // Find all bookings with active termination countdown
    const bookingsWithCountdown = allBookings.filter(
      b => b.terminationInitiatedAt && 
           b.terminationEndDate && 
           b.terminationMode === 'countdown' &&
           b.status === 'approved' && 
           b.paymentStatus === 'paid'
    );
    
    console.log(`📋 Found ${bookingsWithCountdown.length} booking(s) with active countdown`);
    
    for (const booking of bookingsWithCountdown) {
      try {
        processed++;
        const endDate = new Date(booking.terminationEndDate!);
        
        // Check if countdown has reached 0
        if (now >= endDate) {
          console.log(`⏰ Countdown reached 0 for booking ${booking.id}, removing tenant...`);
          
          // Get remaining advance months
          const remainingMonths = booking.remainingAdvanceMonths ?? booking.advanceDepositMonths ?? 0;
          
          if (remainingMonths > 0) {
            // Process immediate leave with remaining months
            const result = await processImmediateLeave(booking.id, booking, remainingMonths);
            if (result.success) {
              removed++;
              console.log(`✅ Automatically removed tenant from booking ${booking.id}`);
            } else {
              errors++;
              console.error(`❌ Failed to remove tenant from booking ${booking.id}:`, result.error);
            }
          } else {
            // No remaining months, just mark as completed
            const updatedBooking: BookingRecord = {
              ...booking,
              status: 'completed',
              completedAt: now.toISOString(),
              terminationInitiatedAt: undefined,
              terminationEndDate: undefined,
              terminationMode: undefined,
              updatedAt: now.toISOString()
            };
            await db.upsert('bookings', booking.id, updatedBooking);
            
            // Update property availability
            try {
              const { updateListingAvailabilityStatus } = await import('./listing-capacity');
              await updateListingAvailabilityStatus(booking.propertyId);
            } catch (statusError) {
              console.warn('⚠️ Could not update listing availability status:', statusError);
            }
            
            removed++;
            console.log(`✅ Marked booking ${booking.id} as completed (no remaining advance months)`);
          }
        } else {
          // Countdown still active, calculate days remaining
          const daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          console.log(`⏳ Booking ${booking.id} has ${daysRemaining} days remaining in countdown`);
        }
      } catch (error) {
        errors++;
        console.error(`❌ Error processing countdown for booking ${booking.id}:`, error);
      }
    }
    
    console.log(`✅ Processed ${processed} countdown(s), removed ${removed} tenant(s), ${errors} error(s)`);
    return { processed, removed, errors };
  } catch (error) {
    console.error('❌ Error processing termination countdowns:', error);
    return { processed: 0, removed: 0, errors: 1 };
  }
}

/**
 * Get termination countdown information for a booking
 */
export async function getTerminationCountdownInfo(bookingId: string): Promise<{
  hasCountdown: boolean;
  daysRemaining?: number;
  terminationEndDate?: string;
  remainingMonths?: number;
}> {
  try {
    const booking = await db.get<BookingRecord>('bookings', bookingId);
    if (!booking || !booking.terminationInitiatedAt || !booking.terminationEndDate) {
      return { hasCountdown: false };
    }
    
    const endDate = new Date(booking.terminationEndDate);
    const now = new Date();
    const daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const remainingMonths = booking.remainingAdvanceMonths ?? booking.advanceDepositMonths ?? 0;
    
    return {
      hasCountdown: true,
      daysRemaining: Math.max(0, daysRemaining),
      terminationEndDate: booking.terminationEndDate,
      remainingMonths
    };
  } catch (error) {
    console.error('❌ Error getting termination countdown info:', error);
    return { hasCountdown: false };
  }
}

