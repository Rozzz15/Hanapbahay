import { db } from './db';
import { BookingRecord, PublishedListingRecord } from '@/types';

export type TimePeriod = 'today' | 'weekly' | 'monthly' | 'yearly';

export interface OwnerFinancialAnalytics {
  totalRevenue: number;
  averageBookingValue: number;
  averageMonthlyRent: number;
  conversionRate: number; // Percentage of inquiries/bookings that converted to approved bookings
  period: TimePeriod;
  periodLabel: string;
  startDate: string;
  endDate: string;
  // Additional breakdown data
  totalBookings: number;
  approvedBookings: number;
  paidBookings: number;
  totalInquiries: number;
  totalListings: number;
}

/**
 * Get date range for a specific time period
 */
function getDateRange(period: TimePeriod): { startDate: Date; endDate: Date; label: string } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let startDate: Date;
  let endDate = new Date(today);
  endDate.setHours(23, 59, 59, 999); // End of today

  switch (period) {
    case 'today':
      startDate = new Date(today);
      startDate.setHours(0, 0, 0, 0);
      return {
        startDate,
        endDate,
        label: 'Today'
      };

    case 'weekly':
      // Last 7 days
      startDate = new Date(today);
      startDate.setDate(startDate.getDate() - 6); // Include today, so 6 days ago
      startDate.setHours(0, 0, 0, 0);
      return {
        startDate,
        endDate,
        label: 'Last 7 Days'
      };

    case 'monthly':
      // Current month
      startDate = new Date(today.getFullYear(), today.getMonth(), 1);
      startDate.setHours(0, 0, 0, 0);
      return {
        startDate,
        endDate,
        label: 'This Month'
      };

    case 'yearly':
      // Current year
      startDate = new Date(today.getFullYear(), 0, 1);
      startDate.setHours(0, 0, 0, 0);
      return {
        startDate,
        endDate,
        label: 'This Year'
      };

    default:
      startDate = new Date(today);
      startDate.setHours(0, 0, 0, 0);
      return {
        startDate,
        endDate,
        label: 'Today'
      };
  }
}

/**
 * Check if a date falls within a date range
 */
function isDateInRange(dateString: string, startDate: Date, endDate: Date): boolean {
  const date = new Date(dateString);
  return date >= startDate && date <= endDate;
}

/**
 * Get financial analytics for an owner for a specific time period
 */
export async function getOwnerFinancialAnalytics(
  ownerId: string,
  period: TimePeriod = 'monthly'
): Promise<OwnerFinancialAnalytics> {
  try {
    const { startDate, endDate, label } = getDateRange(period);

    // Get all bookings for this owner
    const allBookings = await db.list<BookingRecord>('bookings');
    const ownerBookings = allBookings.filter(booking => booking.ownerId === ownerId);

    // Filter bookings by time period
    const periodBookings = ownerBookings.filter(booking =>
      isDateInRange(booking.createdAt, startDate, endDate)
    );

    // Get all listings for this owner
    const allListings = await db.list<PublishedListingRecord>('published_listings');
    const ownerListings = allListings.filter(listing => listing.userId === ownerId);

    // Calculate metrics
    const totalBookings = periodBookings.length;
    const approvedBookings = periodBookings.filter(b => b.status === 'approved');
    const paidBookings = periodBookings.filter(
      b => b.status === 'approved' && b.paymentStatus === 'paid'
    );

    // Total Revenue: Sum of totalAmount from paid bookings in the period
    const totalRevenue = paidBookings.reduce((sum, booking) => sum + (booking.totalAmount || 0), 0);

    // Average Booking Value: Average of totalAmount from paid bookings
    const averageBookingValue =
      paidBookings.length > 0
        ? paidBookings.reduce((sum, booking) => sum + (booking.totalAmount || 0), 0) /
          paidBookings.length
        : 0;

    // Average Monthly Rent: Average of monthlyRent from all listings (active listings)
    const averageMonthlyRent =
      ownerListings.length > 0
        ? ownerListings.reduce((sum, listing) => sum + (listing.monthlyRent || 0), 0) /
          ownerListings.length
        : 0;

    // Total Inquiries: Sum of inquiries from all listings (inquiries are tracked per listing)
    // We need to count inquiries that happened in the period
    // For now, we'll use the listing inquiries count as a proxy
    // In a more sophisticated system, we'd track inquiry timestamps
    const totalInquiries = ownerListings.reduce((sum, listing) => sum + (listing.inquiries || 0), 0);

    // Conversion Rate: (Approved Bookings / Total Bookings) * 100
    // If there are no bookings, we can also consider: (Approved Bookings / (Total Bookings + Inquiries)) * 100
    // But the simpler metric is: Approved Bookings / Total Bookings
    let conversionRate = 0;
    if (totalBookings > 0) {
      conversionRate = (approvedBookings.length / totalBookings) * 100;
    } else if (totalInquiries > 0) {
      // If no bookings but there are inquiries, calculate based on inquiries
      // This is a fallback metric
      conversionRate = (approvedBookings.length / totalInquiries) * 100;
    }

    const analytics: OwnerFinancialAnalytics = {
      totalRevenue,
      averageBookingValue,
      averageMonthlyRent,
      conversionRate: Math.round(conversionRate * 100) / 100, // Round to 2 decimal places
      period,
      periodLabel: label,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      totalBookings,
      approvedBookings: approvedBookings.length,
      paidBookings: paidBookings.length,
      totalInquiries,
      totalListings: ownerListings.length
    };

    console.log(`📊 Financial analytics for owner ${ownerId} (${period}):`, analytics);

    return analytics;
  } catch (error) {
    console.error('Error fetching owner financial analytics:', error);
    // Return empty analytics
    const { startDate, endDate, label } = getDateRange(period);
    return {
      totalRevenue: 0,
      averageBookingValue: 0,
      averageMonthlyRent: 0,
      conversionRate: 0,
      period,
      periodLabel: label,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      totalBookings: 0,
      approvedBookings: 0,
      paidBookings: 0,
      totalInquiries: 0,
      totalListings: 0
    };
  }
}

/**
 * Get financial analytics for multiple periods (for comparison)
 */
export async function getOwnerFinancialAnalyticsComparison(
  ownerId: string
): Promise<{
  today: OwnerFinancialAnalytics;
  weekly: OwnerFinancialAnalytics;
  monthly: OwnerFinancialAnalytics;
  yearly: OwnerFinancialAnalytics;
}> {
  const [today, weekly, monthly, yearly] = await Promise.all([
    getOwnerFinancialAnalytics(ownerId, 'today'),
    getOwnerFinancialAnalytics(ownerId, 'weekly'),
    getOwnerFinancialAnalytics(ownerId, 'monthly'),
    getOwnerFinancialAnalytics(ownerId, 'yearly')
  ]);

  return {
    today,
    weekly,
    monthly,
    yearly
  };
}

