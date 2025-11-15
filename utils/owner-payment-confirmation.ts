/**
 * Owner Payment Confirmation Utilities
 * Handles owner confirmation/rejection of tenant payments
 */

import { db, generateId } from './db';
import { RentPaymentRecord, BookingRecord, MessageRecord, ConversationRecord } from '../types';
import { createOrFindConversation } from './conversation-utils';

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

    // Update payment status to paid
    // If payment doesn't have a paidDate, set it to now
    const updatedPayment: RentPaymentRecord = {
      ...payment,
      status: 'paid',
      paidDate: payment.paidDate || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await db.upsert('rent_payments', paymentId, updatedPayment);
    console.log('✅ Owner confirmed payment:', paymentId);

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
    } catch (eventError) {
      console.warn('⚠️ Could not dispatch payment update event:', eventError);
    }

    return {
      success: true,
      message: 'Payment confirmed successfully',
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

    // Check if payment is overdue based on due date
    const now = new Date();
    const dueDate = new Date(payment.dueDate);
    const isOverdue = now > dueDate;
    const finalStatus = isOverdue ? 'overdue' : 'pending';

    // Update payment status back to pending/overdue and clear all payment-related fields
    // This ensures the payment shows up again on tenant's account and can be paid again
    const updatedPayment: RentPaymentRecord = {
      ...payment,
      status: finalStatus,
      paidDate: undefined, // Clear paid date so tenant knows it needs to be paid again
      paymentMethod: undefined, // Clear payment method so tenant can choose again
      payMongoPaymentIntentId: undefined, // Clear PayMongo payment intent ID
      notes: reason ? `Rejected by owner: ${reason}` : 'Payment not received - rejected by owner',
      updatedAt: new Date().toISOString(),
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
        status: 'pending',
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

    // Check if payment is overdue based on due date
    const now = new Date();
    const dueDate = new Date(payment.dueDate);
    const isOverdue = now > dueDate;
    const finalStatus = isOverdue ? 'overdue' : 'pending';

    // Update payment status back to pending/overdue and clear all payment-related fields
    // This ensures the payment shows up again on tenant's account and can be paid again
    const updatedPayment: RentPaymentRecord = {
      ...payment,
      status: finalStatus,
      paidDate: undefined, // Clear paid date so tenant knows it needs to be paid again
      paymentMethod: undefined, // Clear payment method so tenant can choose again
      payMongoPaymentIntentId: undefined, // Clear PayMongo payment intent ID
      notes: reason ? `Payment removed by owner: ${reason}` : 'Payment removed by owner - payment not received or fraudulent',
      updatedAt: new Date().toISOString(),
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
        status: 'pending',
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
      type: 'message',
    };

    await db.upsert('messages', messageId, messageRecord);

    // Update conversation
    const conversation = await db.get<ConversationRecord>('conversations', conversationId);
    if (conversation) {
      await db.upsert('conversations', conversationId, {
        ...conversation,
        lastMessageText: messageText.substring(0, 100),
        lastMessageAt: now,
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

    const messageText = `⚠️ Payment Not Received - Action Required\n\n` +
      `The owner has indicated that they did not receive your payment of ₱${payment.totalAmount.toLocaleString()}.\n\n` +
      `Payment Details:\n` +
      `- Amount: ₱${payment.totalAmount.toLocaleString()}\n` +
      `- Payment Month: ${new Date(payment.paymentMonth + '-01').toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}\n` +
      `- Due Date: ${new Date(payment.dueDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}\n` +
      `${reasonText}` +
      `\n⚠️ IMPORTANT: This payment has been reset and is now showing as ${statusText} in your account.\n\n` +
      `Please make the payment again through your dashboard. The payment will appear in your payment list and you can select your preferred payment method.`;

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
      type: 'message',
    };

    await db.upsert('messages', messageId, messageRecord);

    // Update conversation
    const conversation = await db.get<ConversationRecord>('conversations', conversationId);
    if (conversation) {
      await db.upsert('conversations', conversationId, {
        ...conversation,
        lastMessageText: messageText.substring(0, 100),
        lastMessageAt: now,
        unreadByTenant: (conversation.unreadByTenant || 0) + 1,
        updatedAt: now,
      });
    }

    console.log('✅ Payment rejected notification sent to tenant');
  } catch (error) {
    console.error('❌ Error sending payment rejected notification:', error);
  }
}

