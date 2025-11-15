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

    // Filter payments for the target month
    const monthPayments = allPayments.filter(
      (payment) => payment.paymentMonth === targetMonth
    );

    // Calculate total rental income (sum of all paid payments)
    const paidPayments = monthPayments.filter(
      (p) => p.status === 'paid'
    );
    const totalRentalIncome = paidPayments.reduce(
      (sum, p) => sum + (p.totalAmount || 0),
      0
    );

    // Calculate pending payments (pending or pending_owner_confirmation)
    const pendingPaymentList = monthPayments.filter(
      (p) =>
        p.status === 'pending' || p.status === 'pending_owner_confirmation'
    );
    const pendingPayments = pendingPaymentList.reduce(
      (sum, p) => sum + (p.totalAmount || 0),
      0
    );

    // Completed payments count (number of paid payments, not the amount)
    const completedPayments = paidPayments.length;

    // Calculate overdue payments
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

