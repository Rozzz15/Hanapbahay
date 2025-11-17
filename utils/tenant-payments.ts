import { db, generateId } from './db';
import { BookingRecord, PublishedListingRecord } from '../types';

export interface RentPayment {
  id: string;
  bookingId: string;
  tenantId: string;
  ownerId: string;
  propertyId: string;
  amount: number;
  lateFee: number;
  totalAmount: number;
  paymentMonth: string; // YYYY-MM format
  dueDate: string; // ISO date string
  paidDate?: string; // ISO date string
  status: 'pending' | 'paid' | 'overdue' | 'partial' | 'pending_owner_confirmation' | 'rejected';
  paymentMethod?: string;
  receiptNumber: string;
  notes?: string;
  ownerPaymentAccountId?: string; // Link to owner's payment account used for this payment
  // Paymongo integration fields
  paymongoPaymentIntentId?: string; // Paymongo payment intent ID
  paymongoPaymentId?: string; // Paymongo payment ID after successful payment
  paymongoStatus?: 'awaiting_payment_method' | 'awaiting_next_action' | 'processing' | 'succeeded' | 'awaiting_payment' | 'canceled' | 'failed';
  // Backup fields for restoring rejected payments
  rejectedAt?: string; // When payment was rejected
  rejectedBy?: string; // Owner ID who rejected
  originalPaidDate?: string; // Original paid date before rejection
  originalPaymentMethod?: string; // Original payment method before rejection
  originalStatus?: string; // Original status before rejection (pending_owner_confirmation or paid)
  createdAt: string;
  updatedAt: string;
}

export interface PaymentReminder {
  id: string;
  bookingId: string;
  tenantId: string;
  type: 'upcoming' | 'overdue' | 'late_fee';
  message: string;
  dueDate: string;
  amount: number;
  isRead: boolean;
  createdAt: string;
}

export interface RentHistorySummary {
  totalPaid: number;
  totalPending: number;
  totalOverdue: number;
  totalLateFees: number;
  payments: RentPayment[];
  nextDueDate?: string;
  nextDueAmount?: number;
}

/**
 * Calculate late fee based on days overdue and monthly rent
 */
export function calculateLateFee(
  monthlyRent: number,
  daysOverdue: number,
  lateFeeRate: number = 0.05 // 5% per month, or ~0.16% per day
): number {
  if (daysOverdue <= 0) return 0;
  
  // Calculate late fee: 5% of monthly rent per month overdue
  // For partial months, calculate proportionally
  const monthsOverdue = daysOverdue / 30;
  const lateFee = monthlyRent * lateFeeRate * monthsOverdue;
  
  // Round to 2 decimal places
  return Math.round(lateFee * 100) / 100;
}

/**
 * Get the next due date for rent payment
 * Payments are monthly and due on the same day of month as the start date
 */
export function getNextDueDate(startDate: string, lastPaidDate?: string): string {
  const start = new Date(startDate);
  const moveInDay = start.getDate(); // Day of month when tenant moved in
  
  // If last paid date exists, calculate from there (1 month after last payment)
  // Otherwise, calculate from start date (1 month after move-in)
  const baseDate = lastPaidDate ? new Date(lastPaidDate) : start;
  
  // Calculate next due date - exactly 1 month after base date
  const nextDue = new Date(baseDate);
  nextDue.setMonth(nextDue.getMonth() + 1);
  
  // Ensure it's on the same day of month as move-in date
  // Handle edge cases where the day doesn't exist in the target month
  const lastDayOfTargetMonth = new Date(nextDue.getFullYear(), nextDue.getMonth() + 1, 0).getDate();
  const targetDay = Math.min(moveInDay, lastDayOfTargetMonth);
  nextDue.setDate(targetDay);
  
  return nextDue.toISOString().split('T')[0];
}

/**
 * Check if a payment is overdue
 */
export function isPaymentOverdue(dueDate: string): boolean {
  const due = new Date(dueDate);
  const now = new Date();
  return now > due;
}

/**
 * Get days overdue
 */
export function getDaysOverdue(dueDate: string): number {
  const due = new Date(dueDate);
  const now = new Date();
  const diffTime = now.getTime() - due.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

/**
 * Create a monthly rent payment record
 */
export async function createRentPayment(
  bookingId: string,
  paymentMonth: string,
  dueDate: string
): Promise<RentPayment> {
  try {
    const booking = await db.get<BookingRecord>('bookings', bookingId);
    if (!booking) {
      throw new Error('Booking not found');
    }

    // Check if payment already exists for this month
    const existingPayments = await db.list<RentPayment>('rent_payments');
    const existing = existingPayments.find(
      p => p.bookingId === bookingId && p.paymentMonth === paymentMonth
    );

    if (existing) {
      return existing;
    }

    const monthlyRent = booking.monthlyRent || 0;
    const isOverdue = isPaymentOverdue(dueDate);
    const daysOverdue = isOverdue ? getDaysOverdue(dueDate) : 0;
    const lateFee = calculateLateFee(monthlyRent, daysOverdue);
    const totalAmount = monthlyRent + lateFee;

    const payment: RentPayment = {
      id: generateId('rent_payment'),
      bookingId,
      tenantId: booking.tenantId,
      ownerId: booking.ownerId,
      propertyId: booking.propertyId,
      amount: monthlyRent,
      lateFee,
      totalAmount,
      paymentMonth,
      dueDate,
      status: isOverdue ? 'overdue' : 'pending',
      receiptNumber: `RENT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await db.upsert('rent_payments', payment.id, payment);
    console.log('✅ Created rent payment:', payment.id);
    
    return payment;
  } catch (error) {
    console.error('❌ Error creating rent payment:', error);
    throw error;
  }
}

/**
 * Get all rent payments for a tenant
 */
export async function getRentPaymentsByTenant(tenantId: string): Promise<RentPayment[]> {
  try {
    const allPayments = await db.list<RentPayment>('rent_payments');
    const tenantPayments = allPayments
      .filter(p => p.tenantId === tenantId)
      .sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime());
    
    return tenantPayments;
  } catch (error) {
    console.error('❌ Error getting rent payments:', error);
    return [];
  }
}

/**
 * Get all rent payments for an owner (across all their bookings)
 */
export async function getRentPaymentsByOwner(ownerId: string): Promise<RentPayment[]> {
  try {
    const allPayments = await db.list<RentPayment>('rent_payments');
    const ownerPayments = allPayments
      .filter(p => p.ownerId === ownerId)
      .sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime());
    
    return ownerPayments;
  } catch (error) {
    console.error('❌ Error getting rent payments for owner:', error);
    return [];
  }
}

/**
 * Get rent payments for a specific booking
 */
export async function getRentPaymentsByBooking(bookingId: string): Promise<RentPayment[]> {
  try {
    const allPayments = await db.list<RentPayment>('rent_payments');
    const bookingPayments = allPayments
      .filter(p => p.bookingId === bookingId)
      .sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime());
    
    return bookingPayments;
  } catch (error) {
    console.error('❌ Error getting rent payments for booking:', error);
    return [];
  }
}

/**
 * Get rent history summary for a tenant
 */
export async function getRentHistorySummary(tenantId: string): Promise<RentHistorySummary> {
  try {
    const payments = await getRentPaymentsByTenant(tenantId);
    
    const totalPaid = payments
      .filter(p => p.status === 'paid')
      .reduce((sum, p) => sum + p.totalAmount, 0);
    
    const totalPending = payments
      .filter(p => p.status === 'pending')
      .reduce((sum, p) => sum + p.totalAmount, 0);
    
    const totalOverdue = payments
      .filter(p => p.status === 'overdue')
      .reduce((sum, p) => sum + p.totalAmount, 0);
    
    const totalLateFees = payments
      .filter(p => p.lateFee > 0)
      .reduce((sum, p) => sum + p.lateFee, 0);

    // Get next due date from active booking
    const bookings = await db.list<BookingRecord>('bookings');
    const activeBooking = bookings.find(
      b => b.tenantId === tenantId && 
      b.status === 'approved' && 
      b.paymentStatus === 'paid'
    );

    let nextDueDate: string | undefined;
    let nextDueAmount: number | undefined;

    if (activeBooking) {
      const lastPaidPayment = payments
        .filter(p => p.status === 'paid')
        .sort((a, b) => new Date(b.paidDate || '').getTime() - new Date(a.paidDate || '').getTime())[0];
      
      nextDueDate = getNextDueDate(
        activeBooking.startDate,
        lastPaidPayment?.paidDate
      );
      nextDueAmount = activeBooking.monthlyRent;
    }

    return {
      totalPaid,
      totalPending,
      totalOverdue,
      totalLateFees,
      payments,
      nextDueDate,
      nextDueAmount,
    };
  } catch (error) {
    console.error('❌ Error getting rent history summary:', error);
    return {
      totalPaid: 0,
      totalPending: 0,
      totalOverdue: 0,
      totalLateFees: 0,
      payments: [],
    };
  }
}

/**
 * Mark a rent payment as paid
 */
export async function markRentPaymentAsPaid(
  paymentId: string,
  paymentMethod?: string
): Promise<boolean> {
  try {
    const payment = await db.get<RentPayment>('rent_payments', paymentId);
    if (!payment) {
      throw new Error('Payment not found');
    }

    // Set status to 'pending_owner_confirmation' so owner can verify before confirming
    const updatedPayment: RentPayment = {
      ...payment,
      status: 'pending_owner_confirmation',
      paidDate: new Date().toISOString(),
      paymentMethod,
      updatedAt: new Date().toISOString(),
    };

    await db.upsert('rent_payments', paymentId, updatedPayment);
    console.log('✅ Marked rent payment as paid (pending owner confirmation):', paymentId);
    
    // Dispatch event to notify other parts of the app
    try {
      const { dispatchCustomEvent } = await import('./custom-events');
      dispatchCustomEvent('paymentUpdated', {
        paymentId,
        bookingId: payment.bookingId,
        ownerId: payment.ownerId,
        tenantId: payment.tenantId,
        status: 'pending_owner_confirmation',
      });
    } catch (eventError) {
      console.warn('⚠️ Could not dispatch payment update event:', eventError);
    }
    
    // Send notification to owner about the payment
    try {
      await sendPaymentNotificationToOwner(updatedPayment);
    } catch (notifError) {
      console.warn('⚠️ Could not send payment notification to owner:', notifError);
      // Don't fail the payment if notification fails
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error marking payment as paid:', error);
    return false;
  }
}

/**
 * Send payment notification to owner
 */
async function sendPaymentNotificationToOwner(payment: RentPayment): Promise<void> {
  try {
    const { BookingRecord, MessageRecord, ConversationRecord } = await import('../types');
    const { createOrFindConversation } = await import('./conversation-utils');
    const { generateId } = await import('./db');
    
    const booking = await db.get<BookingRecord>('bookings', payment.bookingId);
    if (!booking) {
      console.warn('⚠️ Booking not found for payment notification');
      return;
    }

    const messageText = `✅ Rent Payment Received!\n\n` +
      `Tenant: ${booking.tenantName}\n` +
      `Property: ${booking.propertyTitle}\n` +
      `Amount: ₱${payment.totalAmount.toLocaleString()}\n` +
      `Payment Month: ${new Date(payment.paymentMonth + '-01').toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}\n` +
      `Payment Method: ${payment.paymentMethod || 'Not specified'}\n` +
      `Paid Date: ${new Date(payment.paidDate || '').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}\n` +
      `Receipt #: ${payment.receiptNumber}\n\n` +
      `Please verify the payment and confirm receipt.`;

    const conversationId = await createOrFindConversation({
      ownerId: booking.ownerId,
      tenantId: booking.tenantId,
    });

    const messageId = generateId('msg');
    const now = new Date().toISOString();

    const messageRecord: MessageRecord = {
      id: messageId,
      conversationId,
      senderId: booking.tenantId,
      text: messageText,
      createdAt: now,
      readBy: [booking.tenantId],
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
        unreadByOwner: (conversation.unreadByOwner || 0) + 1,
        updatedAt: now,
      });
    }

    console.log('✅ Payment notification sent to owner');
  } catch (error) {
    console.error('❌ Error sending payment notification to owner:', error);
    throw error;
  }
}

/**
 * Generate payment receipt
 */
export function generatePaymentReceipt(payment: RentPayment, booking: BookingRecord): string {
  const paidDate = payment.paidDate ? new Date(payment.paidDate) : new Date();
  const dueDate = new Date(payment.dueDate);
  
  const receipt = `
═══════════════════════════════════════
         RENT PAYMENT RECEIPT
═══════════════════════════════════════

Receipt Number: ${payment.receiptNumber}
Date: ${paidDate.toLocaleDateString('en-US', { 
  year: 'numeric', 
  month: 'long', 
  day: 'numeric' 
})}
Time: ${paidDate.toLocaleTimeString('en-US', { 
  hour: '2-digit', 
  minute: '2-digit' 
})}

───────────────────────────────────────
PROPERTY INFORMATION
───────────────────────────────────────
Property: ${booking.propertyTitle}
Address: ${booking.propertyAddress}
Payment Month: ${new Date(payment.paymentMonth + '-01').toLocaleDateString('en-US', { 
  year: 'numeric', 
  month: 'long' 
})}
Due Date: ${dueDate.toLocaleDateString('en-US', { 
  year: 'numeric', 
  month: 'long', 
  day: 'numeric' 
})}

───────────────────────────────────────
PAYMENT DETAILS
───────────────────────────────────────
Monthly Rent:        ₱${payment.amount.toLocaleString('en-US', { 
  minimumFractionDigits: 2, 
  maximumFractionDigits: 2 
})}
${payment.lateFee > 0 ? `Late Fee:            ₱${payment.lateFee.toLocaleString('en-US', { 
  minimumFractionDigits: 2, 
  maximumFractionDigits: 2 
})}` : ''}
───────────────────────────────────────
Total Amount Paid:   ₱${payment.totalAmount.toLocaleString('en-US', { 
  minimumFractionDigits: 2, 
  maximumFractionDigits: 2 
})}
───────────────────────────────────────

Payment Method: ${payment.paymentMethod || 'Not specified'}
Status: ${payment.status.toUpperCase()}

───────────────────────────────────────
TENANT INFORMATION
───────────────────────────────────────
Name: ${booking.tenantName}
Email: ${booking.tenantEmail}
Phone: ${booking.tenantPhone}

───────────────────────────────────────
OWNER INFORMATION
───────────────────────────────────────
Name: ${booking.ownerName}
Email: ${booking.ownerEmail}
Phone: ${booking.ownerPhone}

═══════════════════════════════════════
Thank you for your payment!
═══════════════════════════════════════
`;

  return receipt;
}

/**
 * Get payment reminders for an owner (upcoming due dates from all tenants)
 */
export async function getPaymentRemindersForOwner(ownerId: string): Promise<PaymentReminder[]> {
  try {
    const reminders: PaymentReminder[] = [];
    
    // Get all active bookings for this owner
    const bookings = await db.list<BookingRecord>('bookings');
    const ownerBookings = bookings.filter(
      b => b.ownerId === ownerId && 
      b.status === 'approved' && 
      b.paymentStatus === 'paid'
    );

    if (ownerBookings.length === 0) {
      return [];
    }

    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Check each tenant's upcoming payment
    for (const booking of ownerBookings) {
      try {
        // Get all payments for this booking
        const payments = await getRentPaymentsByBooking(booking.id);
        const bookingPayments = payments.filter(p => p.bookingId === booking.id);

        // Get next due date
        const lastPaidPayment = bookingPayments
          .filter(p => p.status === 'paid')
          .sort((a, b) => new Date(b.paidDate || '').getTime() - new Date(a.paidDate || '').getTime())[0];
        
        const nextDueDate = getNextDueDate(
          booking.startDate,
          lastPaidPayment?.paidDate
        );
        const nextDue = new Date(nextDueDate);

        // Check if there's already a pending payment for this due date
        const existingPendingPayment = bookingPayments.find(
          p => p.dueDate === nextDueDate && (p.status === 'pending' || p.status === 'overdue')
        );

        // Upcoming payment reminder (7 days before due date)
        if (nextDue <= sevenDaysFromNow && nextDue >= now && !existingPendingPayment) {
          const daysUntilDue = Math.ceil((nextDue.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          reminders.push({
            id: generateId('reminder'),
            bookingId: booking.id,
            tenantId: booking.tenantId,
            type: 'upcoming',
            message: `Upcoming payment from ${booking.tenantName}: ₱${booking.monthlyRent.toLocaleString()} due in ${daysUntilDue} day${daysUntilDue !== 1 ? 's' : ''}`,
            dueDate: nextDueDate,
            amount: booking.monthlyRent,
            isRead: false,
            createdAt: new Date().toISOString(),
          });
        }

        // Overdue payment reminders
        const overduePayments = bookingPayments.filter(p => p.status === 'overdue');
        for (const payment of overduePayments) {
          const daysOverdue = getDaysOverdue(payment.dueDate);
          reminders.push({
            id: generateId('reminder'),
            bookingId: booking.id,
            tenantId: booking.tenantId,
            type: 'overdue',
            message: `Overdue payment from ${booking.tenantName}: ₱${payment.totalAmount.toLocaleString()} (${daysOverdue} day${daysOverdue !== 1 ? 's' : ''} overdue)`,
            dueDate: payment.dueDate,
            amount: payment.totalAmount,
            isRead: false,
            createdAt: new Date().toISOString(),
          });
        }
      } catch (error) {
        console.error(`❌ Error processing booking ${booking.id} for owner reminders:`, error);
      }
    }

    return reminders;
  } catch (error) {
    console.error('❌ Error getting payment reminders for owner:', error);
    return [];
  }
}

/**
 * Check and send payment due date notifications to owners and tenants
 * This should be called periodically (e.g., daily) to notify about upcoming payments
 */
export async function checkAndSendPaymentDueDateNotifications(): Promise<void> {
  try {
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    // Get all active bookings
    const bookings = await db.list<BookingRecord>('bookings');
    const activeBookings = bookings.filter(
      b => b.status === 'approved' && b.paymentStatus === 'paid'
    );

    for (const booking of activeBookings) {
      try {
        // Get all payments for this booking
        const payments = await getRentPaymentsByBooking(booking.id);
        const bookingPayments = payments.filter(p => p.bookingId === booking.id);

        // Get next due date
        const lastPaidPayment = bookingPayments
          .filter(p => p.status === 'paid')
          .sort((a, b) => new Date(b.paidDate || '').getTime() - new Date(a.paidDate || '').getTime())[0];
        
        const nextDueDate = getNextDueDate(
          booking.startDate,
          lastPaidPayment?.paidDate
        );
        const nextDue = new Date(nextDueDate);

        // Check if there's already a pending payment for this due date
        const existingPendingPayment = bookingPayments.find(
          p => p.dueDate === nextDueDate && (p.status === 'pending' || p.status === 'overdue')
        );

        // Only send notification if payment is within 7 days and no pending payment exists
        if (nextDue <= sevenDaysFromNow && nextDue >= now && !existingPendingPayment) {
          const daysUntilDue = Math.ceil((nextDue.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          
          // Send notification to owner (only once per day to avoid spam)
          // Check if we already sent a notification today
          const today = new Date().toISOString().split('T')[0];
          const recentMessages = await db.list('messages');
          const alreadyNotified = recentMessages.some((msg: any) => {
            const msgDate = new Date(msg.createdAt).toISOString().split('T')[0];
            return msgDate === today && 
                   msg.senderId === booking.ownerId &&
                   msg.text?.includes('Payment Reminder') &&
                   msg.text?.includes(booking.tenantName);
          });

          if (!alreadyNotified) {
            await sendPaymentDueDateNotificationToOwner(booking, nextDueDate, daysUntilDue);
          }

          // Send notification to tenant (similar check)
          const tenantNotified = recentMessages.some((msg: any) => {
            const msgDate = new Date(msg.createdAt).toISOString().split('T')[0];
            return msgDate === today && 
                   msg.senderId === booking.tenantId &&
                   msg.text?.includes('Payment Reminder') &&
                   msg.text?.includes(booking.tenantName);
          });

          if (!tenantNotified) {
            await sendPaymentDueDateNotificationToTenant(booking, nextDueDate, daysUntilDue);
          }
        }
      } catch (error) {
        console.error(`❌ Error checking notifications for booking ${booking.id}:`, error);
      }
    }

    console.log('✅ Payment due date notifications check completed');
  } catch (error) {
    console.error('❌ Error checking payment due date notifications:', error);
  }
}

/**
 * Send payment due date notification to tenant
 */
async function sendPaymentDueDateNotificationToTenant(
  booking: BookingRecord,
  dueDate: string,
  daysUntilDue: number
): Promise<void> {
  try {
    const { MessageRecord, ConversationRecord } = await import('../types');
    const { createOrFindConversation } = await import('./conversation-utils');
    
    const messageText = `📅 Payment Reminder\n\n` +
      `Your rent payment is coming up!\n\n` +
      `Property: ${booking.propertyTitle}\n` +
      `Amount: ₱${booking.monthlyRent.toLocaleString()}\n` +
      `Due Date: ${new Date(dueDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}\n` +
      `Days Until Due: ${daysUntilDue} day${daysUntilDue !== 1 ? 's' : ''}\n\n` +
      `Please make sure to submit your payment before the due date.`;

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
        lastMessageText: messageText,
        lastMessageAt: now,
        unreadByTenant: (conversation.unreadByTenant || 0) + 1,
        updatedAt: now,
      });
    }

    console.log('✅ Payment due date notification sent to tenant');
  } catch (error) {
    console.error('❌ Error sending payment due date notification to tenant:', error);
  }
}

/**
 * Send payment due date notification to owner
 */
export async function sendPaymentDueDateNotificationToOwner(
  booking: BookingRecord,
  dueDate: string,
  daysUntilDue: number
): Promise<void> {
  try {
    const { MessageRecord, ConversationRecord } = await import('../types');
    const { createOrFindConversation } = await import('./conversation-utils');
    
    const messageText = `📅 Payment Reminder\n\n` +
      `Tenant: ${booking.tenantName}\n` +
      `Property: ${booking.propertyTitle}\n` +
      `Amount: ₱${booking.monthlyRent.toLocaleString()}\n` +
      `Due Date: ${new Date(dueDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}\n` +
      `Days Until Due: ${daysUntilDue} day${daysUntilDue !== 1 ? 's' : ''}\n\n` +
      `Please remind the tenant about the upcoming payment.`;

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
        lastMessageText: messageText,
        lastMessageAt: now,
        unreadByTenant: (conversation.unreadByTenant || 0) + 1,
        updatedAt: now,
      });
    }

    console.log('✅ Payment due date notification sent to owner');
  } catch (error) {
    console.error('❌ Error sending payment due date notification to owner:', error);
  }
}

/**
 * Get payment reminders for a tenant
 */
export async function getPaymentReminders(tenantId: string): Promise<PaymentReminder[]> {
  try {
    const reminders: PaymentReminder[] = [];
    
    // Get active booking
    const bookings = await db.list<BookingRecord>('bookings');
    const activeBooking = bookings.find(
      b => b.tenantId === tenantId && 
      b.status === 'approved' && 
      b.paymentStatus === 'paid'
    );

    if (!activeBooking) {
      return [];
    }

    // Get all payments for this booking
    const payments = await getRentPaymentsByTenant(tenantId);
    const bookingPayments = payments.filter(p => p.bookingId === activeBooking.id);

    // Check for upcoming payments (7 days before due date)
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Get next due date
    const lastPaidPayment = bookingPayments
      .filter(p => p.status === 'paid')
      .sort((a, b) => new Date(b.paidDate || '').getTime() - new Date(a.paidDate || '').getTime())[0];
    
    const nextDueDate = getNextDueDate(
      activeBooking.startDate,
      lastPaidPayment?.paidDate
    );
    const nextDue = new Date(nextDueDate);

    // Upcoming payment reminder
    if (nextDue <= sevenDaysFromNow && nextDue >= now) {
      const daysUntilDue = Math.ceil((nextDue.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      reminders.push({
        id: generateId('reminder'),
        bookingId: activeBooking.id,
        tenantId,
        type: 'upcoming',
        message: `Rent payment of ₱${activeBooking.monthlyRent.toLocaleString()} is due in ${daysUntilDue} day${daysUntilDue !== 1 ? 's' : ''}`,
        dueDate: nextDueDate,
        amount: activeBooking.monthlyRent,
        isRead: false,
        createdAt: new Date().toISOString(),
      });
    }

    // Overdue payment reminders
    const overduePayments = bookingPayments.filter(p => p.status === 'overdue');
    for (const payment of overduePayments) {
      const daysOverdue = getDaysOverdue(payment.dueDate);
      reminders.push({
        id: generateId('reminder'),
        bookingId: activeBooking.id,
        tenantId,
        type: 'overdue',
        message: `Rent payment of ₱${payment.totalAmount.toLocaleString()} is ${daysOverdue} day${daysOverdue !== 1 ? 's' : ''} overdue${payment.lateFee > 0 ? ` (Late fee: ₱${payment.lateFee.toLocaleString()})` : ''}`,
        dueDate: payment.dueDate,
        amount: payment.totalAmount,
        isRead: false,
        createdAt: new Date().toISOString(),
      });
    }

    return reminders;
  } catch (error) {
    console.error('❌ Error getting payment reminders:', error);
    return [];
  }
}

/**
 * Initialize monthly payments for an active booking
 */
export async function initializeMonthlyPayments(bookingId: string): Promise<void> {
  try {
    const booking = await db.get<BookingRecord>('bookings', bookingId);
    if (!booking) {
      throw new Error('Booking not found');
    }

    if (booking.status !== 'approved' || booking.paymentStatus !== 'paid') {
      return; // Only initialize for active bookings
    }

    const startDate = new Date(booking.startDate);
    const moveInDay = startDate.getDate(); // Day of month when tenant moved in
    const now = new Date();
    
    // Create payments for each month from start date to now
    // Payments are monthly and due on the same day of month as move-in date
    let currentDate = new Date(startDate);
    currentDate.setMonth(currentDate.getMonth() + 1); // First payment is due one month after start

    while (currentDate <= now) {
      const paymentMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
      const dueDate = new Date(currentDate);
      
      // Set to the same day of month as move-in date
      // Handle edge cases where the day doesn't exist in the target month
      const lastDayOfMonth = new Date(dueDate.getFullYear(), dueDate.getMonth() + 1, 0).getDate();
      const targetDay = Math.min(moveInDay, lastDayOfMonth);
      dueDate.setDate(targetDay);
      
      await createRentPayment(bookingId, paymentMonth, dueDate.toISOString().split('T')[0]);
      
      // Move to next month
      currentDate.setMonth(currentDate.getMonth() + 1);
    }

    console.log('✅ Initialized monthly payments for booking:', bookingId);
  } catch (error) {
    console.error('❌ Error initializing monthly payments:', error);
  }
}

/**
 * Get future payment months available for advanced payment
 * Returns up to 6 months in advance
 */
export async function getFuturePaymentMonths(bookingId: string, maxMonths: number = 6): Promise<RentPayment[]> {
  try {
    const booking = await db.get<BookingRecord>('bookings', bookingId);
    if (!booking) {
      throw new Error('Booking not found');
    }

    // Get all existing payments for this booking
    const existingPayments = await getRentPaymentsByBooking(bookingId);
    const paidPayments = existingPayments.filter(p => p.status === 'paid');
    
    // Find the last paid payment to determine where to start
    const lastPaidPayment = paidPayments.sort(
      (a, b) => new Date(b.paidDate || '').getTime() - new Date(a.paidDate || '').getTime()
    )[0];
    
    // Calculate next due date
    const nextDueDate = getNextDueDate(
      booking.startDate,
      lastPaidPayment?.paidDate
    );
    
    const startDate = new Date(booking.startDate);
    const moveInDay = startDate.getDate();
    const now = new Date();
    
    // Start from 1 month AFTER next due date (for advanced payment)
    // The current next due date payment should be paid via regular "Pay Now" button
    let currentDate = new Date(nextDueDate);
    currentDate.setMonth(currentDate.getMonth() + 1); // Start from month after next due date
    
    // Ensure the day is set correctly for the first month
    const lastDayOfFirstMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    const targetDay = Math.min(moveInDay, lastDayOfFirstMonth);
    currentDate.setDate(targetDay);
    
    const futurePayments: RentPayment[] = [];
    
    // Generate future payment months (up to maxMonths)
    for (let i = 0; i < maxMonths; i++) {
      const paymentMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
      const dueDate = new Date(currentDate);
      
      // Handle edge cases where the day doesn't exist in the target month
      const lastDayOfMonth = new Date(dueDate.getFullYear(), dueDate.getMonth() + 1, 0).getDate();
      const targetDay = Math.min(moveInDay, lastDayOfMonth);
      dueDate.setDate(targetDay);
      
      // Check if payment already exists
      const existing = existingPayments.find(p => p.paymentMonth === paymentMonth);
      
      if (existing) {
        // If payment exists but is not paid, include it
        if (existing.status !== 'paid') {
          futurePayments.push(existing);
        }
      } else {
        // Create a payment record for this future month (advance payment)
        // Note: Advance payments are created but won't show as "pending" in owner's view
        // They will only appear when tenant pays them (status becomes pending_owner_confirmation)
        const monthlyRent = booking.monthlyRent || 0;
        const payment: RentPayment = {
          id: generateId('rent_payment'),
          bookingId,
          tenantId: booking.tenantId,
          ownerId: booking.ownerId,
          propertyId: booking.propertyId,
          amount: monthlyRent,
          lateFee: 0, // No late fee for future payments
          totalAmount: monthlyRent,
          paymentMonth,
          dueDate: dueDate.toISOString().split('T')[0],
          status: 'pending', // Status is pending until tenant pays, then becomes pending_owner_confirmation
          receiptNumber: `RENT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        
        futurePayments.push(payment);
      }
      
      // Move to next month
      currentDate.setMonth(currentDate.getMonth() + 1);
    }
    
    return futurePayments.filter(p => p.status !== 'paid');
  } catch (error) {
    console.error('❌ Error getting future payment months:', error);
    return [];
  }
}

