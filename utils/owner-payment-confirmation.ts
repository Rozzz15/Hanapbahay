/**
 * Owner Payment Confirmation Utilities
 * Handles owner confirmation/rejection of tenant payments
 */

import { db, generateId } from './db';
import { RentPaymentRecord, BookingRecord, MessageRecord, ConversationRecord } from '../types';
import { createOrFindConversation } from './conversation-utils';
import { isPaymentOverdue, getDaysOverdue, calculateLateFee } from './tenant-payments';

/**
 * Confirm payment receipt by owner
 * Changes status from 'pending_owner_confirmation' to 'paid'
 */
export async function confirmPaymentByOwner(
  paymentId: string,
  ownerId: string
): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  try {
    const payment = await db.get<RentPaymentRecord>('rent_payments', paymentId);
    if (!payment) {
      return {
        success: false,
        error: 'Payment not found',
      };
    }

    if (payment.ownerId !== ownerId) {
      return {
        success: false,
        error: 'Unauthorized: You can only confirm payments for your own properties',
      };
    }

    // Allow confirmation for both 'pending_owner_confirmation' and 'pending' statuses
    // This allows owners to manually mark pending payments as paid (e.g., cash payments)
    if (payment.status !== 'pending_owner_confirmation' && payment.status !== 'pending') {
      return {
        success: false,
        error: `Payment cannot be confirmed. Current status: ${payment.status}`,
      };
    }

    // Get booking to check if this is the first payment and needs advance deposit
    const booking = await db.get<BookingRecord>('bookings', payment.bookingId);
    if (!booking) {
      return {
        success: false,
        error: 'Booking not found',
      };
    }

    // Check if this is the first payment and ensure it includes advance deposit
    // When owner confirms payment, the first payment MUST include advance deposit
    // This is the first payment of the tenant for the owner and must include advance deposit
    let paymentAmount = payment.amount;
    let needsAmountUpdate = false;
    let isFirstPayment = false;
    
    try {
      const { getRentPaymentsByBooking } = await import('./tenant-payments');
      const existingPayments = await getRentPaymentsByBooking(payment.bookingId);
      const paidPayments = existingPayments.filter(p => p.status === 'paid' && p.id !== paymentId);
      isFirstPayment = paidPayments.length === 0;
      
      const hasAdvanceDeposit = booking.advanceDepositMonths && booking.advanceDepositMonths > 0;
      const monthlyRent = booking.monthlyRent || 0;
      
      // CRITICAL: First payment MUST include advance deposit (totalAmount)
      // This is the first payment of the tenant for the owner and must include advance deposit
      // Subsequent payments use monthlyRent only
      if (isFirstPayment) {
        let expectedAmount: number;
        
        // Calculate expected amount for first payment
        if (booking.totalAmount && booking.totalAmount > 0) {
          expectedAmount = booking.totalAmount;
        } else if (hasAdvanceDeposit && booking.advanceDepositMonths) {
          // Calculate: first month + advance months
          expectedAmount = monthlyRent + (booking.advanceDepositMonths * monthlyRent);
        } else {
          // No advance deposit, just first month's rent
          expectedAmount = monthlyRent;
        }
        
        // Update payment amount if it doesn't match expected amount with advance deposit
        if (payment.amount !== expectedAmount) {
          console.log('🔄 Updating first payment amount to include advance deposit:', {
            paymentId,
            currentAmount: payment.amount,
            expectedAmount,
            advanceDepositMonths: booking.advanceDepositMonths,
            monthlyRent,
            bookingTotalAmount: booking.totalAmount,
            isFirstPayment: true
          });
          paymentAmount = expectedAmount;
          needsAmountUpdate = true;
        }
      }
    } catch (paymentCheckError) {
      console.warn('⚠️ Could not check if this is first payment:', paymentCheckError);
    }

    // Update payment status to paid
    // If payment doesn't have a paidDate, set it to now
    // If this is the first payment, ensure amount includes advance deposit
    const updatedPayment: RentPaymentRecord = {
      ...payment,
      amount: paymentAmount, // Use correct amount with advance deposit for first payment
      totalAmount: paymentAmount + (payment.lateFee || 0),
      status: 'paid',
      paidDate: payment.paidDate || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Update notes if this is the first payment with advance deposit
    if (isFirstPayment && booking.advanceDepositMonths && booking.advanceDepositMonths > 0) {
      updatedPayment.notes = `First payment (includes ${booking.advanceDepositMonths} month${booking.advanceDepositMonths !== 1 ? 's' : ''} advance deposit) - before tenant added to owner's list`;
    } else if (isFirstPayment && needsAmountUpdate) {
      updatedPayment.notes = `First payment - before tenant added to owner's list`;
    }

    await db.upsert('rent_payments', paymentId, updatedPayment);
    console.log('✅ Owner confirmed payment:', paymentId, needsAmountUpdate ? '(updated amount to include advance deposit)' : '', isFirstPayment ? '(first payment)' : '');

    // Update booking's paymentStatus to 'paid' if this is the first payment or booking is not yet paid
    // Also ensure remainingAdvanceMonths is properly initialized for the first payment
    try {
      if (booking.status === 'approved' && booking.paymentStatus !== 'paid') {
        const updatedBooking: BookingRecord = {
          ...booking,
          paymentStatus: 'paid',
          updatedAt: new Date().toISOString(),
        };
        
        // If this is the first payment and booking has advance deposit, ensure remainingAdvanceMonths is set
        if (isFirstPayment && booking.advanceDepositMonths && booking.advanceDepositMonths > 0) {
          // Initialize remainingAdvanceMonths if not already set
          if (updatedBooking.remainingAdvanceMonths === undefined || updatedBooking.remainingAdvanceMonths === null) {
            updatedBooking.remainingAdvanceMonths = booking.advanceDepositMonths;
            console.log('✅ Initialized remainingAdvanceMonths for first payment:', updatedBooking.remainingAdvanceMonths);
          }
        }
        
        await db.upsert('bookings', booking.id, updatedBooking);
        console.log('✅ Updated booking paymentStatus to paid:', booking.id);
        
        // Check if listing has reached capacity and update availability status
        try {
          const { checkAndRejectPendingBookings } = await import('./listing-capacity');
          await checkAndRejectPendingBookings(booking.propertyId);
        } catch (capacityError) {
          console.warn('⚠️ Could not check listing capacity:', capacityError);
        }
      } else if (isFirstPayment && booking.advanceDepositMonths && booking.advanceDepositMonths > 0) {
        // Even if booking is already marked as paid, ensure remainingAdvanceMonths is set for first payment
        if (booking.remainingAdvanceMonths === undefined || booking.remainingAdvanceMonths === null) {
          const updatedBooking: BookingRecord = {
            ...booking,
            remainingAdvanceMonths: booking.advanceDepositMonths,
            updatedAt: new Date().toISOString(),
          };
          await db.upsert('bookings', booking.id, updatedBooking);
          console.log('✅ Initialized remainingAdvanceMonths for first payment:', updatedBooking.remainingAdvanceMonths);
        }
      }
    } catch (bookingError) {
      console.warn('⚠️ Could not update booking paymentStatus:', bookingError);
      // Don't fail the payment confirmation if booking update fails
    }

    // Send confirmation message to tenant
    await sendPaymentConfirmedNotification(updatedPayment);

    // Dispatch event
    try {
      const { dispatchCustomEvent } = await import('./custom-events');
      dispatchCustomEvent('paymentUpdated', {
        paymentId,
        bookingId: payment.bookingId,
        ownerId: payment.ownerId,
        tenantId: payment.tenantId,
        status: 'paid',
      });
      
      // Also dispatch revenue update event to refresh dashboard
      dispatchCustomEvent('revenueUpdated', {
        ownerId: payment.ownerId,
        paymentId,
        amount: updatedPayment.totalAmount,
        paymentMonth: updatedPayment.paymentMonth,
      });
    } catch (eventError) {
      console.warn('⚠️ Could not dispatch payment update event:', eventError);
    }

    return {
      success: true,
      message: 'Payment confirmed successfully and added to rental income',
    };
  } catch (error) {
    console.error('❌ Error confirming payment by owner:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to confirm payment',
    };
  }
}

/**
 * Reject payment by owner (if payment was not received)
 * Changes status back to 'pending'
 */
export async function rejectPaymentByOwner(
  paymentId: string,
  ownerId: string,
  reason?: string
): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  try {
    const payment = await db.get<RentPaymentRecord>('rent_payments', paymentId);
    if (!payment) {
      return {
        success: false,
        error: 'Payment not found',
      };
    }

    if (payment.ownerId !== ownerId) {
      return {
        success: false,
        error: 'Unauthorized: You can only reject payments for your own properties',
      };
    }

    // Allow rejection for both pending_owner_confirmation and paid statuses
    // This allows owner to remove payments even after they've been confirmed (for fraud/scam cases)
    if (payment.status !== 'pending_owner_confirmation' && payment.status !== 'paid') {
      return {
        success: false,
        error: `Payment cannot be rejected. Current status: ${payment.status}`,
      };
    }

    const now = new Date();

    // Store original payment data before rejection (for potential restoration)
    const originalPaidDate = payment.paidDate;
    const originalPaymentMethod = payment.paymentMethod;
    const originalStatus = payment.status;

    // Determine the new status based on due date
    // If payment is overdue, set to 'overdue', otherwise set to 'pending'
    // This allows the tenant to see and pay the rejected payment again
    const isOverdue = isPaymentOverdue(payment.dueDate);
    const newStatus = isOverdue ? 'overdue' : 'pending';
    
    // Recalculate late fee if payment is overdue
    let lateFee = payment.lateFee || 0;
    let totalAmount = payment.totalAmount;
    
    if (isOverdue) {
      // Get booking to calculate late fee
      const booking = await db.get<BookingRecord>('bookings', payment.bookingId);
      if (booking) {
        const daysOverdue = getDaysOverdue(payment.dueDate);
        const monthlyRent = booking.monthlyRent || payment.amount || 0;
        lateFee = calculateLateFee(monthlyRent, daysOverdue);
        totalAmount = payment.amount + lateFee;
      }
    }

    // Update payment status back to 'pending' or 'overdue' so tenant can pay again
    // Store backup data to track that it was rejected
    const updatedPayment: RentPaymentRecord = {
      ...payment,
      status: newStatus,
      paidDate: undefined, // Clear paid date so payment shows as unpaid
      paymentMethod: undefined, // Clear payment method
      lateFee: lateFee,
      totalAmount: totalAmount,
      notes: reason ? `Rejected by owner: ${reason}` : 'Payment not received - rejected by owner',
      // Store backup data for potential restoration
      rejectedAt: now.toISOString(),
      rejectedBy: ownerId,
      originalPaidDate: originalPaidDate,
      originalPaymentMethod: originalPaymentMethod,
      originalStatus: originalStatus,
      updatedAt: now.toISOString(),
    };

    await db.upsert('rent_payments', paymentId, updatedPayment);
    console.log('❌ Owner rejected payment:', paymentId);

    // Send rejection message to tenant
    await sendPaymentRejectedNotification(updatedPayment, reason);

    // Dispatch event
    try {
      const { dispatchCustomEvent } = await import('./custom-events');
      dispatchCustomEvent('paymentUpdated', {
        paymentId,
        bookingId: payment.bookingId,
        ownerId: payment.ownerId,
        tenantId: payment.tenantId,
        status: newStatus,
      });
    } catch (eventError) {
      console.warn('⚠️ Could not dispatch payment update event:', eventError);
    }

    return {
      success: true,
      message: 'Payment rejected. Tenant has been notified.',
    };
  } catch (error) {
    console.error('❌ Error rejecting payment by owner:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to reject payment',
    };
  }
}

/**
 * Remove/reject a payment that was already confirmed as paid
 * This is for cases where payment was fraudulent or not actually received
 */
export async function removePaidPayment(
  paymentId: string,
  ownerId: string,
  reason?: string
): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  try {
    const payment = await db.get<RentPaymentRecord>('rent_payments', paymentId);
    if (!payment) {
      return {
        success: false,
        error: 'Payment not found',
      };
    }

    if (payment.ownerId !== ownerId) {
      return {
        success: false,
        error: 'Unauthorized: You can only remove payments for your own properties',
      };
    }

    // Only allow removal of payments that are marked as 'paid'
    if (payment.status !== 'paid') {
      return {
        success: false,
        error: `Payment cannot be removed. Current status: ${payment.status}. Use reject payment instead.`,
      };
    }

    const now = new Date();

    // Store original payment data before removal
    const originalPaidDate = payment.paidDate;
    const originalPaymentMethod = payment.paymentMethod;
    const originalStatus = payment.status;

    // Determine the new status based on due date
    // If payment is overdue, set to 'overdue', otherwise set to 'pending'
    // This allows the tenant to see and pay the removed payment again
    const isOverdue = isPaymentOverdue(payment.dueDate);
    const newStatus = isOverdue ? 'overdue' : 'pending';
    
    // Recalculate late fee if payment is overdue
    let lateFee = payment.lateFee || 0;
    let totalAmount = payment.totalAmount;
    
    if (isOverdue) {
      // Get booking to calculate late fee
      const booking = await db.get<BookingRecord>('bookings', payment.bookingId);
      if (booking) {
        const daysOverdue = getDaysOverdue(payment.dueDate);
        const monthlyRent = booking.monthlyRent || payment.amount || 0;
        lateFee = calculateLateFee(monthlyRent, daysOverdue);
        totalAmount = payment.amount + lateFee;
      }
    }

    // Update payment status back to 'pending' or 'overdue' so tenant can pay again
    // Store backup data to track that it was removed
    const updatedPayment: RentPaymentRecord = {
      ...payment,
      status: newStatus,
      paidDate: undefined, // Clear paid date so payment shows as unpaid
      paymentMethod: undefined, // Clear payment method
      lateFee: lateFee,
      totalAmount: totalAmount,
      notes: reason ? `Payment removed by owner: ${reason}` : 'Payment removed by owner - payment not received or fraudulent',
      // Store backup data for potential restoration
      rejectedAt: now.toISOString(),
      rejectedBy: ownerId,
      originalPaidDate: originalPaidDate,
      originalPaymentMethod: originalPaymentMethod,
      originalStatus: originalStatus,
      updatedAt: now.toISOString(),
    };

    await db.upsert('rent_payments', paymentId, updatedPayment);
    console.log('❌ Owner removed paid payment:', paymentId);

    // Send notification to tenant
    const rejectionReason = reason || 'Payment was not received or was fraudulent';
    await sendPaymentRejectedNotification(updatedPayment, rejectionReason);

    // Dispatch event
    try {
      const { dispatchCustomEvent } = await import('./custom-events');
      dispatchCustomEvent('paymentUpdated', {
        paymentId,
        bookingId: payment.bookingId,
        ownerId: payment.ownerId,
        tenantId: payment.tenantId,
        status: newStatus,
      });
    } catch (eventError) {
      console.warn('⚠️ Could not dispatch payment update event:', eventError);
    }

    return {
      success: true,
      message: 'Payment removed. Tenant has been notified.',
    };
  } catch (error) {
    console.error('❌ Error removing paid payment:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to remove payment',
    };
  }
}

/**
 * Get all payments pending owner confirmation
 */
export async function getPaymentsPendingConfirmation(ownerId: string): Promise<RentPaymentRecord[]> {
  try {
    const allPayments = await db.list<RentPaymentRecord>('rent_payments');
    return allPayments.filter(
      payment => payment.ownerId === ownerId && 
                 payment.status === 'pending_owner_confirmation'
    );
  } catch (error) {
    console.error('❌ Error getting payments pending confirmation:', error);
    return [];
  }
}

/**
 * Restore a rejected payment (undo accidental rejection)
 * Only restores if payment was actually received - prevents restoring scam/fake payments
 * Restores payment back to pending_owner_confirmation status (not directly to paid)
 */
export async function restoreRejectedPayment(
  paymentId: string,
  ownerId: string,
  confirmPaymentReceived: boolean = false
): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  try {
    const payment = await db.get<RentPaymentRecord>('rent_payments', paymentId);
    if (!payment) {
      return {
        success: false,
        error: 'Payment not found',
      };
    }

    if (payment.ownerId !== ownerId) {
      return {
        success: false,
        error: 'Unauthorized: You can only restore payments for your own properties',
      };
    }

    // Only allow restoration of payments that were rejected
    // Check for rejectedAt field instead of status, since rejected payments now have status 'pending' or 'overdue'
    if (!payment.rejectedAt || !payment.originalStatus) {
      return {
        success: false,
        error: 'This payment cannot be restored. It was not previously rejected or backup data is missing.',
      };
    }
    
    // Only allow restoration if payment is currently pending or overdue (rejected payments are set to these statuses)
    // This prevents restoring payments that are already paid or in other states
    if (payment.status !== 'pending' && payment.status !== 'overdue' && payment.status !== 'rejected') {
      return {
        success: false,
        error: 'This payment cannot be restored. It is not in a restorable state.',
      };
    }

    // IMPORTANT: Only restore if owner confirms they actually received the payment
    // This prevents restoring scam/fake payments
    if (!confirmPaymentReceived) {
      return {
        success: false,
        error: 'You must confirm that you actually received this payment before restoring it.',
      };
    }

    // Add time limit: only allow restoration within 7 days of rejection
    // This prevents restoring very old rejections that might be scams
    const now = new Date();
    const rejectedDate = new Date(payment.rejectedAt);
    const daysSinceRejection = (now.getTime() - rejectedDate.getTime()) / (1000 * 60 * 60 * 24);
    
    if (daysSinceRejection > 7) {
      return {
        success: false,
        error: 'This payment cannot be restored. Restoration is only allowed within 7 days of rejection. If you received this payment, please contact support.',
      };
    }

    // Always restore to pending_owner_confirmation (not directly to paid)
    // This requires owner to verify again before confirming
    const restoredStatus = 'pending_owner_confirmation';

    const restoredPayment: RentPaymentRecord = {
      ...payment,
      status: restoredStatus,
      paidDate: payment.originalPaidDate, // Keep original paid date if available
      paymentMethod: payment.originalPaymentMethod, // Restore original payment method
      notes: (payment.notes?.replace(/^Rejected by owner:.*$/, '') || '') + 
             ' (Restored by owner - awaiting confirmation)',
      // Clear rejection backup data
      rejectedAt: undefined,
      rejectedBy: undefined,
      originalPaidDate: undefined,
      originalPaymentMethod: undefined,
      originalStatus: undefined,
      updatedAt: now.toISOString(),
    };

    await db.upsert('rent_payments', paymentId, restoredPayment);
    console.log('✅ Owner restored rejected payment:', paymentId);

    // Send restoration notification to tenant
    await sendPaymentRestoredNotification(restoredPayment);

    // Dispatch event
    try {
      const { dispatchCustomEvent } = await import('./custom-events');
      dispatchCustomEvent('paymentUpdated', {
        paymentId,
        bookingId: payment.bookingId,
        ownerId: payment.ownerId,
        tenantId: payment.tenantId,
        status: restoredStatus,
      });
    } catch (eventError) {
      console.warn('⚠️ Could not dispatch payment update event:', eventError);
    }

    return {
      success: true,
      message: 'Payment restored successfully. Please verify the payment in your account and confirm it.',
    };
  } catch (error) {
    console.error('❌ Error restoring rejected payment:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to restore payment',
    };
  }
}

/**
 * Permanently delete a rejected payment (for scam/fake payments)
 * This is a permanent action and cannot be undone
 */
export async function deleteRejectedPayment(
  paymentId: string,
  ownerId: string,
  reason?: string
): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  try {
    const payment = await db.get<RentPaymentRecord>('rent_payments', paymentId);
    if (!payment) {
      return {
        success: false,
        error: 'Payment not found',
      };
    }

    if (payment.ownerId !== ownerId) {
      return {
        success: false,
        error: 'Unauthorized: You can only delete payments for your own properties',
      };
    }

    // Only allow deletion of rejected payments
    // Check for rejectedAt field instead of status, since rejected payments now have status 'pending' or 'overdue'
    if (!payment.rejectedAt) {
      return {
        success: false,
        error: 'Only rejected payments can be permanently deleted. This payment was not previously rejected.',
      };
    }
    
    // Only allow deletion if payment is currently pending, overdue, or rejected
    if (payment.status !== 'pending' && payment.status !== 'overdue' && payment.status !== 'rejected') {
      return {
        success: false,
        error: 'This payment cannot be deleted. It is not in a deletable state.',
      };
    }

    // Delete the payment record permanently
    await db.remove('rent_payments', paymentId);
    console.log('🗑️ Owner permanently deleted rejected payment:', paymentId);

    // Send notification to tenant about the deletion
    await sendPaymentDeletedNotification(payment, reason);

    // Dispatch event
    try {
      const { dispatchCustomEvent } = await import('./custom-events');
      dispatchCustomEvent('paymentUpdated', {
        paymentId,
        bookingId: payment.bookingId,
        ownerId: payment.ownerId,
        tenantId: payment.tenantId,
        status: 'deleted',
      });
    } catch (eventError) {
      console.warn('⚠️ Could not dispatch payment update event:', eventError);
    }

    return {
      success: true,
      message: 'Payment permanently deleted. Tenant has been notified.',
    };
  } catch (error) {
    console.error('❌ Error deleting rejected payment:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete payment',
    };
  }
}

/**
 * Send payment deleted notification to tenant
 */
async function sendPaymentDeletedNotification(
  payment: RentPaymentRecord,
  reason?: string
): Promise<void> {
  try {
    const booking = await db.get<BookingRecord>('bookings', payment.bookingId);
    if (!booking) return;

    const reasonText = reason ? `\nReason: ${reason}\n` : '\n';
    
    const messageText = `🗑️ Payment Deleted\n\n` +
      `The owner has permanently deleted your payment of ₱${payment.totalAmount.toLocaleString()}.\n\n` +
      `Payment Details:\n` +
      `- Amount: ₱${payment.totalAmount.toLocaleString()}\n` +
      `- Payment Month: ${new Date(payment.paymentMonth + '-01').toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}\n` +
      `- Receipt #: ${payment.receiptNumber}\n` +
      `${reasonText}` +
      `\n⚠️ IMPORTANT: This payment has been permanently deleted from the system.\n\n` +
      `If you believe this was done in error, please contact the owner directly.`;

    const conversationId = await createOrFindConversation({
      ownerId: booking.ownerId,
      tenantId: booking.tenantId,
    });

    const messageId = generateId('msg');
    const now = new Date().toISOString();

    const messageRecord: MessageRecord = {
      id: messageId,
      conversationId,
      senderId: booking.ownerId,
      text: messageText,
      createdAt: now,
      readBy: [booking.ownerId],
      type: 'notification',
    };

    await db.upsert('messages', messageId, messageRecord);

    // Update conversation - but don't update lastMessageText for notifications
    // Notifications should not appear in conversation preview
    const conversation = await db.get<ConversationRecord>('conversations', conversationId);
    if (conversation) {
      // Get the last non-notification message to use as lastMessageText
      const allMessages = await db.list<MessageRecord>('messages');
      const conversationMessages = allMessages
        .filter(msg => 
          msg.conversationId === conversationId && 
          msg.type !== 'notification'
        )
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      const lastRegularMessage = conversationMessages[0];
      const lastMessageText = lastRegularMessage 
        ? (lastRegularMessage.type === 'image' ? '📷 Image' : lastRegularMessage.text.substring(0, 100))
        : conversation.lastMessageText;
      const lastMessageAt = lastRegularMessage?.createdAt || conversation.lastMessageAt || now;
      
      await db.upsert('conversations', conversationId, {
        ...conversation,
        lastMessageText: lastMessageText,
        lastMessageAt: lastMessageAt,
        unreadByTenant: (conversation.unreadByTenant || 0) + 1,
        updatedAt: now,
      });
    }

    console.log('✅ Payment deleted notification sent to tenant');
  } catch (error) {
    console.error('❌ Error sending payment deleted notification:', error);
  }
}

/**
 * Auto-delete rejected payments that are older than 2 days
 * This cleans up scam/fake payments that owners haven't restored
 */
export async function autoDeleteOldRejectedPayments(): Promise<{
  deletedCount: number;
  errors: string[];
}> {
  try {
    const allPayments = await db.list<RentPaymentRecord>('rent_payments');
    const now = new Date();
    const twoDaysAgo = new Date(now.getTime() - (2 * 24 * 60 * 60 * 1000)); // 2 days ago
    
    // Find payments that were rejected (check rejectedAt field instead of status)
    // Rejected payments now have status 'pending' or 'overdue' but are marked by rejectedAt
    const rejectedPayments = allPayments.filter(
      payment => payment.rejectedAt
    );
    
    const paymentsToDelete = rejectedPayments.filter(payment => {
      if (!payment.rejectedAt) return false;
      const rejectedDate = new Date(payment.rejectedAt);
      return rejectedDate < twoDaysAgo; // Older than 2 days
    });
    
    let deletedCount = 0;
    const errors: string[] = [];
    
    for (const payment of paymentsToDelete) {
      try {
        // Delete the payment
        await db.remove('rent_payments', payment.id);
        deletedCount++;
        console.log(`🗑️ Auto-deleted rejected payment older than 2 days: ${payment.id}`);
        
        // Send notification to tenant
        await sendPaymentAutoDeletedNotification(payment);
        
        // Dispatch event
        try {
          const { dispatchCustomEvent } = await import('./custom-events');
          dispatchCustomEvent('paymentUpdated', {
            paymentId: payment.id,
            bookingId: payment.bookingId,
            ownerId: payment.ownerId,
            tenantId: payment.tenantId,
            status: 'deleted',
          });
        } catch (eventError) {
          console.warn('⚠️ Could not dispatch payment update event:', eventError);
        }
      } catch (error) {
        const errorMsg = `Failed to delete payment ${payment.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        console.error('❌', errorMsg);
        errors.push(errorMsg);
      }
    }
    
    if (paymentsToDelete.length > 0) {
      console.log(`✅ Auto-deleted ${paymentsToDelete.length} rejected payment(s) older than 2 days`);
    }
    
    return {
      deletedCount: paymentsToDelete.length,
      errors,
    };
  } catch (error) {
    console.error('❌ Error auto-deleting old rejected payments:', error);
    return {
      deletedCount: 0,
      errors: [error instanceof Error ? error.message : 'Unknown error'],
    };
  }
}

/**
 * Send auto-deletion notification to tenant
 */
async function sendPaymentAutoDeletedNotification(payment: RentPaymentRecord): Promise<void> {
  try {
    const booking = await db.get<BookingRecord>('bookings', payment.bookingId);
    if (!booking) return;
    
    const messageText = `🗑️ Payment Auto-Deleted\n\n` +
      `Your rejected payment of ₱${payment.totalAmount.toLocaleString()} has been automatically deleted after 2 days.\n\n` +
      `Payment Details:\n` +
      `- Amount: ₱${payment.totalAmount.toLocaleString()}\n` +
      `- Payment Month: ${new Date(payment.paymentMonth + '-01').toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}\n` +
      `- Receipt #: ${payment.receiptNumber}\n` +
      `- Rejected Date: ${payment.rejectedAt ? new Date(payment.rejectedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Unknown'}\n\n` +
      `⚠️ IMPORTANT: Rejected payments are automatically deleted after 2 days if not restored by the owner.\n\n` +
      `If you believe this payment was legitimate, please contact the owner directly.`;

    const conversationId = await createOrFindConversation({
      ownerId: booking.ownerId,
      tenantId: booking.tenantId,
    });

    const messageId = generateId('msg');
    const now = new Date().toISOString();

    const messageRecord: MessageRecord = {
      id: messageId,
      conversationId,
      senderId: booking.ownerId,
      text: messageText,
      createdAt: now,
      readBy: [booking.ownerId],
      type: 'notification',
    };

    await db.upsert('messages', messageId, messageRecord);

    // Update conversation - but don't update lastMessageText for notifications
    // Notifications should not appear in conversation preview
    const conversation = await db.get<ConversationRecord>('conversations', conversationId);
    if (conversation) {
      // Get the last non-notification message to use as lastMessageText
      const allMessages = await db.list<MessageRecord>('messages');
      const conversationMessages = allMessages
        .filter(msg => 
          msg.conversationId === conversationId && 
          msg.type !== 'notification'
        )
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      const lastRegularMessage = conversationMessages[0];
      const lastMessageText = lastRegularMessage 
        ? (lastRegularMessage.type === 'image' ? '📷 Image' : lastRegularMessage.text.substring(0, 100))
        : conversation.lastMessageText;
      const lastMessageAt = lastRegularMessage?.createdAt || conversation.lastMessageAt || now;
      
      await db.upsert('conversations', conversationId, {
        ...conversation,
        lastMessageText: lastMessageText,
        lastMessageAt: lastMessageAt,
        unreadByTenant: (conversation.unreadByTenant || 0) + 1,
        updatedAt: now,
      });
    }

    console.log('✅ Payment auto-deleted notification sent to tenant');
  } catch (error) {
    console.error('❌ Error sending payment auto-deleted notification:', error);
  }
}

/**
 * Send payment restored notification to tenant
 */
async function sendPaymentRestoredNotification(payment: RentPaymentRecord): Promise<void> {
  try {
    const booking = await db.get<BookingRecord>('bookings', payment.bookingId);
    if (!booking) return;

    const messageText = `✅ Payment Restored!\n\n` +
      `The owner has restored your payment of ₱${payment.totalAmount.toLocaleString()}.\n\n` +
      `Payment Details:\n` +
      `- Amount: ₱${payment.totalAmount.toLocaleString()}\n` +
      `- Payment Month: ${new Date(payment.paymentMonth + '-01').toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}\n` +
      `- Payment Method: ${payment.paymentMethod || 'Not specified'}\n` +
      `- Receipt #: ${payment.receiptNumber}\n` +
      `- Status: ${payment.status === 'pending_owner_confirmation' ? 'Awaiting Owner Confirmation' : 'Paid'}\n\n` +
      `The payment has been restored and is now ${payment.status === 'pending_owner_confirmation' ? 'awaiting owner confirmation' : 'confirmed as paid'}.`;

    const conversationId = await createOrFindConversation({
      ownerId: booking.ownerId,
      tenantId: booking.tenantId,
    });

    const messageId = generateId('msg');
    const now = new Date().toISOString();

    const messageRecord: MessageRecord = {
      id: messageId,
      conversationId,
      senderId: booking.ownerId,
      text: messageText,
      createdAt: now,
      readBy: [booking.ownerId],
      type: 'notification',
    };

    await db.upsert('messages', messageId, messageRecord);

    // Update conversation - but don't update lastMessageText for notifications
    // Notifications should not appear in conversation preview
    const conversation = await db.get<ConversationRecord>('conversations', conversationId);
    if (conversation) {
      // Get the last non-notification message to use as lastMessageText
      const allMessages = await db.list<MessageRecord>('messages');
      const conversationMessages = allMessages
        .filter(msg => 
          msg.conversationId === conversationId && 
          msg.type !== 'notification'
        )
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      const lastRegularMessage = conversationMessages[0];
      const lastMessageText = lastRegularMessage 
        ? (lastRegularMessage.type === 'image' ? '📷 Image' : lastRegularMessage.text.substring(0, 100))
        : conversation.lastMessageText;
      const lastMessageAt = lastRegularMessage?.createdAt || conversation.lastMessageAt || now;
      
      await db.upsert('conversations', conversationId, {
        ...conversation,
        lastMessageText: lastMessageText,
        lastMessageAt: lastMessageAt,
        unreadByTenant: (conversation.unreadByTenant || 0) + 1,
        updatedAt: now,
      });
    }

    console.log('✅ Payment restored notification sent to tenant');
  } catch (error) {
    console.error('❌ Error sending payment restored notification:', error);
  }
}

/**
 * Send payment confirmed notification to tenant
 */
async function sendPaymentConfirmedNotification(payment: RentPaymentRecord): Promise<void> {
  try {
    const booking = await db.get<BookingRecord>('bookings', payment.bookingId);
    if (!booking) return;

    const messageText = `✅ Payment Confirmed!\n\n` +
      `Your payment of ₱${payment.totalAmount.toLocaleString()} has been confirmed by the owner.\n\n` +
      `Payment Details:\n` +
      `- Amount: ₱${payment.totalAmount.toLocaleString()}\n` +
      `- Payment Month: ${new Date(payment.paymentMonth + '-01').toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}\n` +
      `- Payment Method: ${payment.paymentMethod || 'Not specified'}\n` +
      `- Receipt #: ${payment.receiptNumber}\n` +
      `- Confirmed Date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}\n\n` +
      `Thank you for your payment!`;

    const conversationId = await createOrFindConversation({
      ownerId: booking.ownerId,
      tenantId: booking.tenantId,
    });

    const messageId = generateId('msg');
    const now = new Date().toISOString();

    const messageRecord: MessageRecord = {
      id: messageId,
      conversationId,
      senderId: booking.ownerId,
      text: messageText,
      createdAt: now,
      readBy: [booking.ownerId],
      type: 'notification',
    };

    await db.upsert('messages', messageId, messageRecord);

    // Update conversation - but don't update lastMessageText for notifications
    // Notifications should not appear in conversation preview
    const conversation = await db.get<ConversationRecord>('conversations', conversationId);
    if (conversation) {
      // Get the last non-notification message to use as lastMessageText
      const allMessages = await db.list<MessageRecord>('messages');
      const conversationMessages = allMessages
        .filter(msg => 
          msg.conversationId === conversationId && 
          msg.type !== 'notification'
        )
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      const lastRegularMessage = conversationMessages[0];
      const lastMessageText = lastRegularMessage 
        ? (lastRegularMessage.type === 'image' ? '📷 Image' : lastRegularMessage.text.substring(0, 100))
        : conversation.lastMessageText;
      const lastMessageAt = lastRegularMessage?.createdAt || conversation.lastMessageAt || now;
      
      await db.upsert('conversations', conversationId, {
        ...conversation,
        lastMessageText: lastMessageText,
        lastMessageAt: lastMessageAt,
        unreadByTenant: (conversation.unreadByTenant || 0) + 1,
        updatedAt: now,
      });
    }

    console.log('✅ Payment confirmed notification sent to tenant');
  } catch (error) {
    console.error('❌ Error sending payment confirmed notification:', error);
  }
}

/**
 * Send payment rejected notification to tenant
 */
async function sendPaymentRejectedNotification(
  payment: RentPaymentRecord,
  reason?: string
): Promise<void> {
  try {
    const booking = await db.get<BookingRecord>('bookings', payment.bookingId);
    if (!booking) return;

    const reasonText = reason ? `\nReason: ${reason}\n` : '\n';
    
    // Check if payment is overdue
    const currentDate = new Date();
    const dueDate = new Date(payment.dueDate);
    const isOverdue = currentDate > dueDate;
    const statusText = isOverdue ? 'OVERDUE' : 'PENDING';

    const messageText = `⚠️ Payment Rejected - Action Required\n\n` +
      `The owner has indicated that they did not receive your payment of ₱${payment.totalAmount.toLocaleString()}.\n\n` +
      `Payment Details:\n` +
      `- Amount: ₱${payment.totalAmount.toLocaleString()}\n` +
      `- Payment Month: ${new Date(payment.paymentMonth + '-01').toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}\n` +
      `- Due Date: ${new Date(payment.dueDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}\n` +
      `${reasonText}` +
      `\n⚠️ IMPORTANT: This payment has been REJECTED by the owner.\n\n` +
      `Please make the payment again through your dashboard. The payment will appear in your payment list as ${isOverdue ? 'overdue' : 'pending'} and you can select your preferred payment method to pay it again.`;

    const conversationId = await createOrFindConversation({
      ownerId: booking.ownerId,
      tenantId: booking.tenantId,
    });

    const messageId = generateId('msg');
    const now = new Date().toISOString();

    const messageRecord: MessageRecord = {
      id: messageId,
      conversationId,
      senderId: booking.ownerId,
      text: messageText,
      createdAt: now,
      readBy: [booking.ownerId],
      type: 'notification',
    };

    await db.upsert('messages', messageId, messageRecord);

    // Update conversation - but don't update lastMessageText for notifications
    // Notifications should not appear in conversation preview
    const conversation = await db.get<ConversationRecord>('conversations', conversationId);
    if (conversation) {
      // Get the last non-notification message to use as lastMessageText
      const allMessages = await db.list<MessageRecord>('messages');
      const conversationMessages = allMessages
        .filter(msg => 
          msg.conversationId === conversationId && 
          msg.type !== 'notification'
        )
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      const lastRegularMessage = conversationMessages[0];
      const lastMessageText = lastRegularMessage 
        ? (lastRegularMessage.type === 'image' ? '📷 Image' : lastRegularMessage.text.substring(0, 100))
        : conversation.lastMessageText;
      const lastMessageAt = lastRegularMessage?.createdAt || conversation.lastMessageAt || now;
      
      await db.upsert('conversations', conversationId, {
        ...conversation,
        lastMessageText: lastMessageText,
        lastMessageAt: lastMessageAt,
        unreadByTenant: (conversation.unreadByTenant || 0) + 1,
        updatedAt: now,
      });
    }

    console.log('✅ Payment rejected notification sent to tenant');
  } catch (error) {
    console.error('❌ Error sending payment rejected notification:', error);
  }
}

