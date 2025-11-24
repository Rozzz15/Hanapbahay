import { db } from './db';
import { BookingRecord, RentPaymentRecord } from '../types';
import { RentPayment, getRentPaymentsByOwner, getRentPaymentsByTenant, getRentPaymentsByBooking } from './tenant-payments';
import { getBookingsByOwner } from './booking';
import { getBookingsByTenant } from './booking';

/**
 * Extract potential receipt numbers and booking IDs from user message
 * Receipt numbers can be: INITIAL-*, RENT-*, ADVANCE-*, REC-*, or any alphanumeric string
 * Booking IDs follow pattern: booking_* or any ID that exists in bookings
 */
export function extractSearchIdentifiers(message: string): {
  receiptNumbers: string[];
  bookingIds: string[];
} {
  const receiptNumbers: string[] = [];
  const bookingIds: string[] = [];
  
  // Common receipt number patterns
  const receiptPatterns = [
    /(INITIAL|RENT|ADVANCE|REC)[-_]?[A-Z0-9]+/gi,
    /receipt[:\s#]+([A-Z0-9\-_]+)/gi,
    /ref[:\s#]+([A-Z0-9\-_]+)/gi,
  ];
  
  // Extract receipt numbers
  for (const pattern of receiptPatterns) {
    const matches = message.matchAll(pattern);
    for (const match of matches) {
      const receiptNum = match[1] || match[0];
      if (receiptNum && receiptNum.length > 5) {
        receiptNumbers.push(receiptNum.toUpperCase());
      }
    }
  }
  
  // Booking ID patterns - look for "booking" followed by ID or just ID patterns
  const bookingPatterns = [
    /booking[:\s#]+([a-z0-9_]+)/gi,
    /(booking_[a-z0-9_]+)/gi,
  ];
  
  for (const pattern of bookingPatterns) {
    const matches = message.matchAll(pattern);
    for (const match of matches) {
      const bookingId = match[1] || match[0];
      if (bookingId && bookingId.length > 5) {
        bookingIds.push(bookingId);
      }
    }
  }
  
  // Also look for any long alphanumeric strings that might be IDs
  const longIdPattern = /\b([a-z0-9_]{15,})\b/gi;
  const longMatches = message.matchAll(longIdPattern);
  for (const match of longMatches) {
    const potentialId = match[1];
    // Check if it looks like a booking ID
    if (potentialId.startsWith('booking_')) {
      bookingIds.push(potentialId);
    }
    // Check if it looks like a receipt number (contains dashes and uppercase)
    else if (/^[A-Z0-9\-_]{10,}$/.test(potentialId)) {
      receiptNumbers.push(potentialId.toUpperCase());
    }
  }
  
  // Remove duplicates
  return {
    receiptNumbers: [...new Set(receiptNumbers)],
    bookingIds: [...new Set(bookingIds)],
  };
}

/**
 * Search for payment by receipt number
 */
export async function searchPaymentByReceipt(
  receiptNumber: string,
  userId: string,
  userRole: 'owner' | 'tenant'
): Promise<RentPayment | null> {
  try {
    const allPayments = await db.list<RentPayment>('rent_payments');
    
    // Find payment by receipt number
    let payment = allPayments.find(
      p => p.receiptNumber?.toUpperCase() === receiptNumber.toUpperCase()
    );
    
    if (!payment) {
      return null;
    }
    
    // Verify user has access to this payment
    if (userRole === 'owner' && payment.ownerId !== userId) {
      return null;
    }
    if (userRole === 'tenant' && payment.tenantId !== userId) {
      return null;
    }
    
    return payment;
  } catch (error) {
    console.error('❌ Error searching payment by receipt:', error);
    return null;
  }
}

/**
 * Search for booking by ID
 */
export async function searchBookingById(
  bookingId: string,
  userId: string,
  userRole: 'owner' | 'tenant'
): Promise<BookingRecord | null> {
  try {
    const booking = await db.get<BookingRecord>('bookings', bookingId);
    
    if (!booking) {
      return null;
    }
    
    // Verify user has access to this booking
    if (userRole === 'owner' && booking.ownerId !== userId) {
      return null;
    }
    if (userRole === 'tenant' && booking.tenantId !== userId) {
      return null;
    }
    
    return booking;
  } catch (error) {
    console.error('❌ Error searching booking by ID:', error);
    return null;
  }
}

/**
 * Format payment information for AI response
 */
export function formatPaymentInfo(payment: RentPayment, booking?: BookingRecord): string {
  const statusEmoji = {
    'paid': '✅',
    'pending': '⏳',
    'pending_owner_confirmation': '⏳',
    'overdue': '⚠️',
    'partial': '📊',
    'rejected': '❌',
  };
  
  const emoji = statusEmoji[payment.status] || '📄';
  const statusText = payment.status.replace(/_/g, ' ').toUpperCase();
  const amount = `₱${payment.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const dueDate = new Date(payment.dueDate).toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  const paidDate = payment.paidDate 
    ? new Date(payment.paidDate).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })
    : 'Not paid yet';
  
  let info = `${emoji} **Receipt: ${payment.receiptNumber}**\n\n`;
  info += `**Status:** ${statusText}\n`;
  info += `**Amount:** ${amount}\n`;
  if (payment.lateFee > 0) {
    info += `**Late Fee:** ₱${payment.lateFee.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`;
  }
  info += `**Payment Month:** ${payment.paymentMonth}\n`;
  info += `**Due Date:** ${dueDate}\n`;
  info += `**Paid Date:** ${paidDate}\n`;
  
  if (payment.paymentMethod) {
    info += `**Payment Method:** ${payment.paymentMethod}\n`;
  }
  
  if (booking) {
    info += `\n**Related Booking:**\n`;
    info += `• Property: ${booking.propertyTitle}\n`;
    info += `• Address: ${booking.propertyAddress}\n`;
    info += `• Tenant: ${booking.tenantName}\n`;
    info += `• Booking ID: ${booking.id}\n`;
  }
  
  if (payment.notes) {
    info += `\n**Notes:** ${payment.notes}`;
  }
  
  return info;
}

/**
 * Format booking information for AI response
 */
export function formatBookingInfo(booking: BookingRecord, payments?: RentPayment[]): string {
  const statusEmoji = {
    'pending': '⏳',
    'approved': '✅',
    'rejected': '❌',
    'cancelled': '🚫',
    'completed': '🏁',
  };
  
  const emoji = statusEmoji[booking.status] || '📄';
  const statusText = booking.status.toUpperCase();
  const startDate = new Date(booking.startDate).toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  const endDate = new Date(booking.endDate).toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  const totalAmount = `₱${booking.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const monthlyRent = `₱${booking.monthlyRent.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  
  let info = `${emoji} **Booking ID: ${booking.id}**\n\n`;
  info += `**Status:** ${statusText}\n`;
  info += `**Payment Status:** ${booking.paymentStatus.toUpperCase()}\n`;
  info += `**Property:** ${booking.propertyTitle}\n`;
  info += `**Address:** ${booking.propertyAddress}\n`;
  info += `**Monthly Rent:** ${monthlyRent}\n`;
  info += `**Total Amount:** ${totalAmount}\n`;
  info += `**Duration:** ${booking.duration} months\n`;
  info += `**Start Date:** ${startDate}\n`;
  info += `**End Date:** ${endDate}\n`;
  
  if (booking.tenantName) {
    info += `\n**Tenant:** ${booking.tenantName}\n`;
    if (booking.tenantEmail) info += `**Email:** ${booking.tenantEmail}\n`;
    if (booking.tenantPhone) info += `**Phone:** ${booking.tenantPhone}\n`;
  }
  
  if (booking.ownerName) {
    info += `\n**Owner:** ${booking.ownerName}\n`;
    if (booking.ownerEmail) info += `**Email:** ${booking.ownerEmail}\n`;
    if (booking.ownerPhone) info += `**Phone:** ${booking.ownerPhone}\n`;
  }
  
  if (payments && payments.length > 0) {
    const paidPayments = payments.filter(p => p.status === 'paid');
    const pendingPayments = payments.filter(p => p.status === 'pending' || p.status === 'pending_owner_confirmation');
    const overduePayments = payments.filter(p => p.status === 'overdue');
    
    info += `\n**Payment History:**\n`;
    info += `• Paid: ${paidPayments.length} payment(s)\n`;
    if (pendingPayments.length > 0) {
      info += `• Pending: ${pendingPayments.length} payment(s)\n`;
    }
    if (overduePayments.length > 0) {
      info += `• Overdue: ${overduePayments.length} payment(s)\n`;
    }
    
    // Show recent payments
    const recentPayments = payments.slice(0, 3);
    if (recentPayments.length > 0) {
      info += `\n**Recent Payments:**\n`;
      for (const payment of recentPayments) {
        const statusEmoji = payment.status === 'paid' ? '✅' : payment.status === 'overdue' ? '⚠️' : '⏳';
        info += `${statusEmoji} ${payment.receiptNumber} - ${payment.paymentMonth} (${payment.status})\n`;
      }
    }
  }
  
  if (booking.notes) {
    info += `\n**Notes:** ${booking.notes}`;
  }
  
  return info;
}

/**
 * Main function to search for receipt numbers and booking IDs in help & support
 */
export async function searchHelpSupportData(
  message: string,
  userId: string,
  userRole: 'owner' | 'tenant'
): Promise<{
  foundReceipts: RentPayment[];
  foundBookings: BookingRecord[];
  responseText?: string;
}> {
  const { receiptNumbers, bookingIds } = extractSearchIdentifiers(message);
  
  const foundReceipts: RentPayment[] = [];
  const foundBookings: BookingRecord[] = [];
  const responseParts: string[] = [];
  
  // Search for receipt numbers
  if (receiptNumbers.length > 0) {
    for (const receiptNum of receiptNumbers) {
      const payment = await searchPaymentByReceipt(receiptNum, userId, userRole);
      if (payment) {
        foundReceipts.push(payment);
        
        // Get booking info for context
        const booking = await db.get<BookingRecord>('bookings', payment.bookingId);
        const formattedInfo = formatPaymentInfo(payment, booking || undefined);
        responseParts.push(formattedInfo);
      } else {
        responseParts.push(`❌ Receipt number "${receiptNum}" not found or you don't have access to it.`);
      }
    }
  }
  
  // Search for booking IDs
  if (bookingIds.length > 0) {
    for (const bookingId of bookingIds) {
      const booking = await searchBookingById(bookingId, userId, userRole);
      if (booking) {
        foundBookings.push(booking);
        
        // Get payment history for context
        const payments = await getRentPaymentsByBooking(bookingId);
        const formattedInfo = formatBookingInfo(booking, payments);
        responseParts.push(formattedInfo);
      } else {
        responseParts.push(`❌ Booking ID "${bookingId}" not found or you don't have access to it.`);
      }
    }
  }
  
  // If we found data, combine the responses
  let responseText: string | undefined;
  if (responseParts.length > 0) {
    if (responseParts.length === 1) {
      responseText = responseParts[0];
    } else {
      responseText = `I found ${responseParts.length} result(s):\n\n${responseParts.join('\n\n---\n\n')}`;
    }
  }
  
  return {
    foundReceipts,
    foundBookings,
    responseText,
  };
}



