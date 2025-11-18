import { getOwnerFinancialAnalytics, OwnerFinancialAnalytics } from './owner-analytics';
import type { TimePeriod } from './owner-analytics';
import { getMonthlyRevenueOverview, MonthlyRevenueOverview } from './owner-revenue';
import { getOwnerDashboardStats } from './owner-dashboard';
import { getOwnerListings } from './owner-dashboard';
import { getBookingsByOwner } from './booking';
import { getRentPaymentsByOwner } from './tenant-payments';
import { getTotalActiveTenants } from './tenant-management';
import { BookingRecord, PublishedListingRecord } from '../types';
import { db } from './db';

export interface OwnerAnalyticsExport {
  summary: string;
  csvData: string;
  jsonData: any;
  htmlContent: string;
}

/**
 * Get date range for custom period
 */
export function getCustomDateRange(startDate: Date, endDate: Date): { startDate: Date; endDate: Date; label: string } {
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);
  
  const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const label = `Custom Range (${daysDiff} days)`;
  
  return { startDate: start, endDate: end, label };
}

/**
 * Get financial analytics for custom date range
 */
export async function getOwnerFinancialAnalyticsCustom(
  ownerId: string,
  startDate: Date,
  endDate: Date
): Promise<OwnerFinancialAnalytics> {
  try {
    const { startDate: rangeStart, endDate: rangeEnd } = getCustomDateRange(startDate, endDate);
    
    // Get all bookings for this owner
    const allBookings = await db.list<BookingRecord>('bookings');
    const ownerBookings = allBookings.filter(booking => booking.ownerId === ownerId);
    
    // Filter bookings by custom date range
    const periodBookings = ownerBookings.filter(booking => {
      const bookingDate = new Date(booking.createdAt);
      return bookingDate >= rangeStart && bookingDate <= rangeEnd;
    });
    
    // Get all listings for this owner
    const allListings = await db.list<PublishedListingRecord>('published_listings');
    const ownerListings = allListings.filter(listing => listing.userId === ownerId);
    
    // Calculate metrics (same logic as getOwnerFinancialAnalytics)
    const totalBookings = periodBookings.length;
    const approvedBookings = periodBookings.filter(b => b.status === 'approved');
    const paidBookings = periodBookings.filter(
      b => b.status === 'approved' && b.paymentStatus === 'paid'
    );
    
    // Get rent payments for this owner
    const { getRentPaymentsByOwner } = await import('./tenant-payments');
    const allRentPayments = await getRentPaymentsByOwner(ownerId);
    
    // Filter rent payments by custom date range
    const periodRentPayments = allRentPayments.filter(payment => {
      const paymentDate = payment.paidDate || payment.createdAt;
      const paymentDateObj = new Date(paymentDate);
      return paymentDateObj >= rangeStart && paymentDateObj <= rangeEnd;
    });
    
    // Get paid rent payments in the period
    const paidRentPayments = periodRentPayments.filter(p => p.status === 'paid');
    
    // Calculate revenue from booking deposits (initial payments)
    const bookingDepositRevenue = paidBookings.reduce((sum, booking) => sum + (booking.totalAmount || 0), 0);
    
    // Calculate revenue from monthly rent payments
    const rentPaymentRevenue = paidRentPayments.reduce((sum, payment) => sum + (payment.totalAmount || 0), 0);
    
    // Total Revenue: Sum of booking deposits + monthly rent payments
    const totalRevenue = bookingDepositRevenue + rentPaymentRevenue;
    const averageBookingValue = paidBookings.length > 0
      ? paidBookings.reduce((sum, booking) => sum + (booking.totalAmount || 0), 0) / paidBookings.length
      : 0;
    const averageMonthlyRent = ownerListings.length > 0
      ? ownerListings.reduce((sum, listing) => sum + (listing.monthlyRent || 0), 0) / ownerListings.length
      : 0;
    const totalInquiries = ownerListings.reduce((sum, listing) => sum + (listing.inquiries || 0), 0);
    
    let conversionRate = 0;
    if (totalBookings > 0) {
      conversionRate = (approvedBookings.length / totalBookings) * 100;
    } else if (totalInquiries > 0) {
      conversionRate = (approvedBookings.length / totalInquiries) * 100;
    }
    
    return {
      totalRevenue,
      averageBookingValue,
      averageMonthlyRent,
      conversionRate: Math.round(conversionRate * 100) / 100,
      period: 'monthly' as TimePeriod, // Custom period
      periodLabel: getCustomDateRange(startDate, endDate).label,
      startDate: rangeStart.toISOString(),
      endDate: rangeEnd.toISOString(),
      totalBookings,
      approvedBookings: approvedBookings.length,
      paidBookings: paidBookings.length,
      totalInquiries,
      totalListings: ownerListings.length
    };
  } catch (error) {
    console.error('Error getting custom financial analytics:', error);
    throw error;
  }
}

/**
 * Export comprehensive owner analytics report
 */
export async function exportOwnerAnalytics(
  ownerId: string,
  period: TimePeriod | 'custom',
  customStartDate?: Date,
  customEndDate?: Date,
  ownerName?: string
): Promise<OwnerAnalyticsExport> {
  try {
    console.log('📊 Exporting analytics for owner:', ownerId, period);
    
    // Get analytics based on period
    let financialAnalytics: OwnerFinancialAnalytics;
    if (period === 'custom' && customStartDate && customEndDate) {
      financialAnalytics = await getOwnerFinancialAnalyticsCustom(ownerId, customStartDate, customEndDate);
    } else {
      financialAnalytics = await getOwnerFinancialAnalytics(ownerId, period as TimePeriod);
    }
    
    // Get additional data
    const [dashboardStats, listings, bookings, payments, totalTenants] = await Promise.all([
      getOwnerDashboardStats(ownerId),
      getOwnerListings(ownerId),
      getBookingsByOwner(ownerId),
      getRentPaymentsByOwner(ownerId),
      getTotalActiveTenants(ownerId)
    ]);
    
    // Filter payments by date range
    const periodStart = new Date(financialAnalytics.startDate);
    const periodEnd = new Date(financialAnalytics.endDate);
    const periodPayments = payments.filter(payment => {
      const paymentDate = new Date(payment.paidDate || payment.createdAt);
      return paymentDate >= periodStart && paymentDate <= periodEnd;
    });
    
    // Calculate payment breakdown
    const paidPayments = periodPayments.filter(p => p.status === 'paid');
    const pendingPayments = periodPayments.filter(p => p.status === 'pending' || p.status === 'pending_owner_confirmation');
    const overduePayments = periodPayments.filter(p => p.status === 'overdue');
    
    const totalRentalIncome = paidPayments.reduce((sum, p) => sum + (p.totalAmount || 0), 0);
    const pendingPaymentsAmount = pendingPayments.reduce((sum, p) => sum + (p.totalAmount || 0), 0);
    const overduePaymentsAmount = overduePayments.reduce((sum, p) => sum + (p.totalAmount || 0), 0);
    
    // Get top viewed listings
    const topListings = [...listings]
      .sort((a, b) => (b.views || 0) - (a.views || 0))
      .slice(0, 5);
    
    // Generate summary report
    const periodLabel = financialAnalytics.periodLabel;
    const startDateStr = new Date(financialAnalytics.startDate).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    const endDateStr = new Date(financialAnalytics.endDate).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    
    const summary = `
OWNER ANALYTICS REPORT
======================
Owner: ${ownerName || 'Property Owner'}
Period: ${periodLabel}
Date Range: ${startDateStr} to ${endDateStr}
Generated: ${new Date().toLocaleString()}

OVERVIEW
--------
Total Listings: ${dashboardStats.totalListings}
Total Views: ${dashboardStats.totalViews}
Total Bookings: ${dashboardStats.totalBookings}
Active Tenants: ${totalTenants}

FINANCIAL SUMMARY
-----------------
Total Revenue: ₱${financialAnalytics.totalRevenue.toLocaleString()}
Average Booking Value: ₱${financialAnalytics.averageBookingValue.toLocaleString()}
Average Monthly Rent: ₱${financialAnalytics.averageMonthlyRent.toLocaleString()}
Conversion Rate: ${financialAnalytics.conversionRate.toFixed(2)}%

BOOKING BREAKDOWN
-----------------
Total Bookings: ${financialAnalytics.totalBookings}
Approved Bookings: ${financialAnalytics.approvedBookings}
Paid Bookings: ${financialAnalytics.paidBookings}
Total Inquiries: ${financialAnalytics.totalInquiries}

PAYMENT BREAKDOWN
-----------------
Total Rental Income: ₱${totalRentalIncome.toLocaleString()}
Pending Payments: ₱${pendingPaymentsAmount.toLocaleString()} (${pendingPayments.length} payments)
Overdue Payments: ₱${overduePaymentsAmount.toLocaleString()} (${overduePayments.length} payments)
Completed Payments: ${paidPayments.length} payments

TOP PERFORMING LISTINGS
------------------------
${topListings.length > 0 ? topListings.map((listing, index) => 
  `${index + 1}. ${listing.propertyType} - ${listing.address.substring(0, 40)}...\n   Views: ${listing.views || 0} | Rent: ₱${listing.monthlyRent?.toLocaleString() || '0'}/month`
).join('\n') : 'No listings available'}

PROPERTY PERFORMANCE
--------------------
Average Views per Listing: ${listings.length > 0 ? Math.round(dashboardStats.totalViews / listings.length) : 0}
Average Inquiries per Listing: ${listings.length > 0 ? Math.round(financialAnalytics.totalInquiries / listings.length) : 0}
Total Property Value: ₱${listings.reduce((sum, l) => sum + (l.monthlyRent || 0), 0).toLocaleString()}/month

BOOKING STATUS DISTRIBUTION
----------------------------
${(() => {
  const statusCounts: Record<string, number> = {};
  bookings.forEach(b => {
    statusCounts[b.status] = (statusCounts[b.status] || 0) + 1;
  });
  return Object.entries(statusCounts)
    .map(([status, count]) => `${status.charAt(0).toUpperCase() + status.slice(1)}: ${count}`)
    .join('\n');
})()}

END OF REPORT
=============
`;

    // Generate CSV data
    const csvHeaders = ['Category', 'Metric', 'Value', 'Details'];
    const csvRows = [
      ['Overview', 'Total Listings', dashboardStats.totalListings.toString(), ''],
      ['Overview', 'Total Views', dashboardStats.totalViews.toString(), ''],
      ['Overview', 'Total Bookings', dashboardStats.totalBookings.toString(), ''],
      ['Overview', 'Active Tenants', totalTenants.toString(), ''],
      ['Financial', 'Total Revenue', `₱${financialAnalytics.totalRevenue.toLocaleString()}`, ''],
      ['Financial', 'Average Booking Value', `₱${financialAnalytics.averageBookingValue.toLocaleString()}`, ''],
      ['Financial', 'Average Monthly Rent', `₱${financialAnalytics.averageMonthlyRent.toLocaleString()}`, ''],
      ['Financial', 'Conversion Rate', `${financialAnalytics.conversionRate.toFixed(2)}%`, ''],
      ['Bookings', 'Total Bookings', financialAnalytics.totalBookings.toString(), ''],
      ['Bookings', 'Approved Bookings', financialAnalytics.approvedBookings.toString(), ''],
      ['Bookings', 'Paid Bookings', financialAnalytics.paidBookings.toString(), ''],
      ['Bookings', 'Total Inquiries', financialAnalytics.totalInquiries.toString(), ''],
      ['Payments', 'Total Rental Income', `₱${totalRentalIncome.toLocaleString()}`, ''],
      ['Payments', 'Pending Payments', `₱${pendingPaymentsAmount.toLocaleString()}`, `${pendingPayments.length} payments`],
      ['Payments', 'Overdue Payments', `₱${overduePaymentsAmount.toLocaleString()}`, `${overduePayments.length} payments`],
      ['Payments', 'Completed Payments', paidPayments.length.toString(), 'payments'],
      ...topListings.map((listing, index) => [
        'Top Listings',
        `#${index + 1} ${listing.propertyType}`,
        `${listing.views || 0} views`,
        `₱${listing.monthlyRent?.toLocaleString() || '0'}/month`
      ])
    ];
    
    const csvData = [csvHeaders, ...csvRows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    // Generate JSON data
    const jsonData = {
      ownerId,
      ownerName: ownerName || 'Property Owner',
      period,
      periodLabel: financialAnalytics.periodLabel,
      startDate: financialAnalytics.startDate,
      endDate: financialAnalytics.endDate,
      generatedAt: new Date().toISOString(),
      analytics: {
        overview: {
          totalListings: dashboardStats.totalListings,
          totalViews: dashboardStats.totalViews,
          totalBookings: dashboardStats.totalBookings,
          activeTenants: totalTenants
        },
        financial: financialAnalytics,
        payments: {
          totalRentalIncome,
          pendingPayments: pendingPaymentsAmount,
          overduePayments: overduePaymentsAmount,
          completedPayments: paidPayments.length,
          paymentCounts: {
            pending: pendingPayments.length,
            overdue: overduePayments.length,
            paid: paidPayments.length
          }
        },
        topListings: topListings.map(l => ({
          id: l.id,
          propertyType: l.propertyType,
          address: l.address,
          views: l.views || 0,
          monthlyRent: l.monthlyRent || 0,
          inquiries: l.inquiries || 0
        }))
      },
      exportMetadata: {
        totalRecords: bookings.length + listings.length + payments.length,
        dataTypes: ['bookings', 'listings', 'payments', 'analytics'],
        version: '1.0'
      }
    };

    // Generate HTML content for PDF
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Owner Analytics Report</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 20px;
      color: #333;
    }
    .header {
      text-align: center;
      border-bottom: 3px solid #3B82F6;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .header h1 {
      color: #1E40AF;
      margin: 0;
      font-size: 24px;
    }
    .header p {
      color: #666;
      margin: 5px 0;
    }
    .section {
      margin-bottom: 30px;
      page-break-inside: avoid;
    }
    .section-title {
      background-color: #3B82F6;
      color: white;
      padding: 10px 15px;
      font-size: 18px;
      font-weight: bold;
      margin-bottom: 15px;
      border-radius: 5px;
    }
    .metric-row {
      display: flex;
      justify-content: space-between;
      padding: 10px;
      border-bottom: 1px solid #E5E7EB;
    }
    .metric-row:last-child {
      border-bottom: none;
    }
    .metric-label {
      font-weight: 600;
      color: #4B5563;
    }
    .metric-value {
      color: #1F2937;
      font-weight: 600;
    }
    .highlight {
      color: #10B981;
      font-weight: bold;
    }
    .warning {
      color: #F59E0B;
      font-weight: bold;
    }
    .error {
      color: #EF4444;
      font-weight: bold;
    }
    .list-item {
      padding: 8px 0;
      border-bottom: 1px solid #F3F4F6;
    }
    .list-item:last-child {
      border-bottom: none;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
    }
    th, td {
      padding: 10px;
      text-align: left;
      border-bottom: 1px solid #E5E7EB;
    }
    th {
      background-color: #F9FAFB;
      font-weight: bold;
      color: #374151;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 2px solid #E5E7EB;
      text-align: center;
      color: #6B7280;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>OWNER ANALYTICS REPORT</h1>
    <p><strong>Owner:</strong> ${ownerName || 'Property Owner'}</p>
    <p><strong>Period:</strong> ${periodLabel}</p>
    <p><strong>Date Range:</strong> ${startDateStr} to ${endDateStr}</p>
    <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
  </div>

  <div class="section">
    <div class="section-title">OVERVIEW</div>
    <div class="metric-row">
      <span class="metric-label">Total Listings</span>
      <span class="metric-value">${dashboardStats.totalListings}</span>
    </div>
    <div class="metric-row">
      <span class="metric-label">Total Views</span>
      <span class="metric-value">${dashboardStats.totalViews.toLocaleString()}</span>
    </div>
    <div class="metric-row">
      <span class="metric-label">Total Bookings</span>
      <span class="metric-value">${dashboardStats.totalBookings}</span>
    </div>
    <div class="metric-row">
      <span class="metric-label">Active Tenants</span>
      <span class="metric-value">${totalTenants}</span>
    </div>
  </div>

  <div class="section">
    <div class="section-title">FINANCIAL SUMMARY</div>
    <div class="metric-row">
      <span class="metric-label">Total Revenue</span>
      <span class="metric-value highlight">₱${financialAnalytics.totalRevenue.toLocaleString()}</span>
    </div>
    <div class="metric-row">
      <span class="metric-label">Average Booking Value</span>
      <span class="metric-value">₱${financialAnalytics.averageBookingValue.toLocaleString()}</span>
    </div>
    <div class="metric-row">
      <span class="metric-label">Average Monthly Rent</span>
      <span class="metric-value">₱${financialAnalytics.averageMonthlyRent.toLocaleString()}</span>
    </div>
    <div class="metric-row">
      <span class="metric-label">Conversion Rate</span>
      <span class="metric-value">${financialAnalytics.conversionRate.toFixed(2)}%</span>
    </div>
  </div>

  <div class="section">
    <div class="section-title">BOOKING BREAKDOWN</div>
    <div class="metric-row">
      <span class="metric-label">Total Bookings</span>
      <span class="metric-value">${financialAnalytics.totalBookings}</span>
    </div>
    <div class="metric-row">
      <span class="metric-label">Approved Bookings</span>
      <span class="metric-value">${financialAnalytics.approvedBookings}</span>
    </div>
    <div class="metric-row">
      <span class="metric-label">Paid Bookings</span>
      <span class="metric-value highlight">${financialAnalytics.paidBookings}</span>
    </div>
    <div class="metric-row">
      <span class="metric-label">Total Inquiries</span>
      <span class="metric-value">${financialAnalytics.totalInquiries}</span>
    </div>
  </div>

  <div class="section">
    <div class="section-title">PAYMENT BREAKDOWN</div>
    <div class="metric-row">
      <span class="metric-label">Total Rental Income</span>
      <span class="metric-value highlight">₱${totalRentalIncome.toLocaleString()}</span>
    </div>
    <div class="metric-row">
      <span class="metric-label">Pending Payments</span>
      <span class="metric-value warning">₱${pendingPaymentsAmount.toLocaleString()} (${pendingPayments.length} payments)</span>
    </div>
    <div class="metric-row">
      <span class="metric-label">Overdue Payments</span>
      <span class="metric-value error">₱${overduePaymentsAmount.toLocaleString()} (${overduePayments.length} payments)</span>
    </div>
    <div class="metric-row">
      <span class="metric-label">Completed Payments</span>
      <span class="metric-value highlight">${paidPayments.length} payments</span>
    </div>
  </div>

  ${topListings.length > 0 ? `
  <div class="section">
    <div class="section-title">TOP PERFORMING LISTINGS</div>
    <table>
      <thead>
        <tr>
          <th>Rank</th>
          <th>Property Type</th>
          <th>Address</th>
          <th>Views</th>
          <th>Monthly Rent</th>
        </tr>
      </thead>
      <tbody>
        ${topListings.map((listing, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${listing.propertyType}</td>
          <td>${listing.address.substring(0, 50)}${listing.address.length > 50 ? '...' : ''}</td>
          <td>${listing.views || 0}</td>
          <td>₱${listing.monthlyRent?.toLocaleString() || '0'}/month</td>
        </tr>
        `).join('')}
      </tbody>
    </table>
  </div>
  ` : ''}

  <div class="section">
    <div class="section-title">PROPERTY PERFORMANCE</div>
    <div class="metric-row">
      <span class="metric-label">Average Views per Listing</span>
      <span class="metric-value">${listings.length > 0 ? Math.round(dashboardStats.totalViews / listings.length) : 0}</span>
    </div>
    <div class="metric-row">
      <span class="metric-label">Average Inquiries per Listing</span>
      <span class="metric-value">${listings.length > 0 ? Math.round(financialAnalytics.totalInquiries / listings.length) : 0}</span>
    </div>
    <div class="metric-row">
      <span class="metric-label">Total Property Value</span>
      <span class="metric-value highlight">₱${listings.reduce((sum, l) => sum + (l.monthlyRent || 0), 0).toLocaleString()}/month</span>
    </div>
  </div>

  <div class="footer">
    <p>Report generated on ${new Date().toLocaleString()}</p>
    <p>HanapBahay - Property Management Analytics</p>
  </div>
</body>
</html>
    `;

    console.log('✅ Owner analytics export completed');
    
    return {
      summary,
      csvData,
      jsonData,
      htmlContent
    };
    
  } catch (error) {
    console.error('❌ Error exporting owner analytics:', error);
    throw error;
  }
}

