import { getRentPaymentsByOwner, RentPayment } from './tenant-payments';

export interface MonthlyRevenueOverview {
  totalRentalIncome: number; // Total amount received from all paid payments
  pendingPayments: number; // Total amount of pending payments
  completedPayments: number; // Count of completed (paid) payments
  overduePayments: number; // Total amount of overdue payments
  month: string; // YYYY-MM format
  paymentCounts: {
    total: number;
    paid: number;
    pending: number;
    overdue: number;
  };
}

/**
 * Get monthly revenue overview for an owner
 * @param ownerId - The owner's user ID
 * @param month - Optional month in YYYY-MM format. Defaults to current month
 * @returns Monthly revenue breakdown by payment status
 */
export async function getMonthlyRevenueOverview(
  ownerId: string,
  month?: string
): Promise<MonthlyRevenueOverview> {
  try {
    // Default to current month if not provided
    const targetMonth = month || new Date().toISOString().slice(0, 7); // YYYY-MM format

    // Get all rent payments for this owner
    const allPayments = await getRentPaymentsByOwner(ownerId);
    
    // Get all bookings to verify payments are from active tenants (approved and paid bookings only)
    const { db } = await import('./db');
    const allBookings = await db.list<any>('bookings');
    const activeBookings = allBookings.filter(
      b => b.ownerId === ownerId && 
      b.status === 'approved' && 
      b.paymentStatus === 'paid'
    );
    const activeBookingIds = new Set(activeBookings.map(b => b.id));
    
    // Filter payments to only include those from active tenants (approved and paid bookings)
    const activePayments = allPayments.filter(p => activeBookingIds.has(p.bookingId));

    // Filter payments for the target month (for pending/overdue calculations)
    const monthPayments = activePayments.filter(
      (payment) => payment.paymentMonth === targetMonth
    );

    // Calculate total rental income (sum of ALL paid payments, regardless of month)
    // This shows all confirmed/accepted payments the owner has received
    const allPaidPayments = activePayments.filter(
      (p) => p.status === 'paid'
    );
    const totalRentalIncome = allPaidPayments.reduce(
      (sum, p) => sum + (p.totalAmount || 0),
      0
    );
    
    // For month-specific metrics, use only payments for the target month
    const paidPayments = monthPayments.filter(
      (p) => p.status === 'paid'
    );

    // Calculate pending payments (pending or pending_owner_confirmation)
    // Include current month and next month, but exclude advance payments (beyond next month) and rejected payments
    const now = new Date();
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const twoMonthsFromNow = new Date(now.getFullYear(), now.getMonth() + 2, 1);
    
    const allPendingPayments = activePayments.filter(
      (p) => {
        // Don't count rejected payments as pending
        if (p.status === 'rejected') return false;
        
        // Only count pending or pending_owner_confirmation statuses
        if (p.status === 'pending' || p.status === 'pending_owner_confirmation') {
          // Check payment month
          const paymentMonth = new Date(p.paymentMonth + '-01');
          // Include current month and next month, exclude advance payments (beyond next month)
          const isCurrentOrNextMonth = paymentMonth >= currentMonth && paymentMonth < twoMonthsFromNow;
          return isCurrentOrNextMonth;
        }
        
        return false;
      }
    );
    const pendingPayments = allPendingPayments.reduce(
      (sum, p) => sum + (p.totalAmount || 0),
      0
    );
    
    // For month-specific pending count, use only payments for the target month
    const pendingPaymentList = monthPayments.filter(
      (p) =>
        p.status === 'pending' || p.status === 'pending_owner_confirmation'
    );

    // Completed payments count (number of ALL paid payments, not just current month)
    // This shows the total count of all confirmed/accepted payments
    const completedPayments = allPaidPayments.length;

    // Calculate overdue payments (only from active tenants)
    const allOverduePayments = activePayments.filter(
      (p) => p.status === 'overdue'
    );
    const overduePaymentList = monthPayments.filter(
      (p) => p.status === 'overdue'
    );
    const overduePayments = overduePaymentList.reduce(
      (sum, p) => sum + (p.totalAmount || 0),
      0
    );

    // Payment counts for additional insights
    const paymentCounts = {
      total: monthPayments.length,
      paid: paidPayments.length,
      pending: pendingPaymentList.length,
      overdue: overduePaymentList.length,
    };

    console.log(`💰 Monthly revenue overview for owner ${ownerId} (${targetMonth}):`, {
      totalRentalIncome,
      allPaidPaymentsCount: allPaidPayments.length,
      monthPaidPaymentsCount: paidPayments.length,
      allPendingPaymentsCount: allPendingPayments.length,
      monthPendingPaymentsCount: pendingPaymentList.length,
      pendingPayments,
      completedPayments,
      overduePayments,
      paymentCounts,
    });

    return {
      totalRentalIncome,
      pendingPayments,
      completedPayments,
      overduePayments,
      month: targetMonth,
      paymentCounts,
    };
  } catch (error) {
    console.error('❌ Error getting monthly revenue overview:', error);
    // Return empty overview on error
    const targetMonth = month || new Date().toISOString().slice(0, 7);
    return {
      totalRentalIncome: 0,
      pendingPayments: 0,
      completedPayments: 0,
      overduePayments: 0,
      month: targetMonth,
      paymentCounts: {
        total: 0,
        paid: 0,
        pending: 0,
        overdue: 0,
      },
    };
  }
}

