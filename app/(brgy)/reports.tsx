import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity, Modal, Pressable, Platform, Alert, Share } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'expo-router';
import { sharedStyles, designTokens } from '../../styles/owner-dashboard-styles';
import { getComprehensiveAnalytics, ComprehensiveAnalytics, exportBarangayAnalytics } from '../../utils/brgy-analytics';
import PieChart from '../../components/ui/PieChart';
import * as FileSystem from 'expo-file-system';
import type { BookingRecord, PublishedListingRecord, OwnerApplicationRecord, DbUserRecord } from '../../types';
import { 
  Users, 
  TrendingUp, 
  Home, 
  Eye, 
  MessageSquare,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
  Building2,
  Target,
  Award,
  TrendingDown,
  Clock,
  MapPin,
  Download,
  FileText,
  RefreshCw,
  Percent,
  ArrowUp,
  ArrowDown,
  Minus,
  Printer,
  FileDown
} from 'lucide-react-native';

// Helper component for progress bars
const ProgressBar = ({ percentage, color = '#3B82F6', height = 8 }: { percentage: number; color?: string; height?: number }) => (
  <View style={{
    height,
    backgroundColor: '#E5E7EB',
    borderRadius: height / 2,
    overflow: 'hidden',
  }}>
    <View style={{
      height: '100%',
      width: `${Math.min(100, Math.max(0, percentage))}%`,
      backgroundColor: color,
    }} />
  </View>
);

// Helper component for trend indicators
const TrendIndicator = ({ value, isPercentage = false }: { value: number; isPercentage?: boolean }) => {
  if (value === 0) return <Minus size={16} color="#6B7280" />;
  if (value > 0) return <ArrowUp size={16} color="#10B981" />;
  return <ArrowDown size={16} color="#EF4444" />;
};

// Helper component for status badges
const StatusBadge = ({ status, count }: { status: string; count: number }) => {
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved': return '#10B981';
      case 'pending': return '#F59E0B';
      case 'rejected': return '#EF4444';
      case 'cancelled': return '#6B7280';
      case 'completed': return '#10B981';
      case 'available': return '#10B981';
      case 'occupied': return '#3B82F6';
      case 'reserved': return '#F59E0B';
      default: return '#6B7280';
    }
  };

  return (
    <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: getStatusColor(status) + '20',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
      marginRight: 8,
      marginBottom: 8,
    }}>
      <View style={{
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: getStatusColor(status),
        marginRight: 6,
      }} />
      <Text style={{
        fontSize: 12,
        fontWeight: '600',
        color: getStatusColor(status),
      }}>
        {status}: {count}
      </Text>
    </View>
  );
};

export default function ReportsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [analytics, setAnalytics] = useState<ComprehensiveAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [userBarangay, setUserBarangay] = useState<string | null>(null);
  const [dayByDayData, setDayByDayData] = useState<Array<{
    date: string;
    dayName: string;
    bookings: number;
    properties: number;
    owners: number;
    tenants: number;
    inquiries: number;
  }>>([]);
  const [timePeriod, setTimePeriod] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('weekly');
  const [showTimePeriodModal, setShowTimePeriodModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [activityData, setActivityData] = useState<{
    newBookings: number;
    newProperties: number;
    newOwners: number;
    newTenants: number;
    newInquiries: number;
  }>({
    newBookings: 0,
    newProperties: 0,
    newOwners: 0,
    newTenants: 0,
    newInquiries: 0
  });

  useEffect(() => {
    if (user?.id) {
    loadAnalytics();
    }
  }, [user?.id]);

  useEffect(() => {
    if (user?.id && analytics) {
      const loadUserBarangay = async () => {
        try {
          const { db } = await import('../../utils/db');
          const userRecord = await db.get<DbUserRecord>('users', user.id);
          const actualBarangay = (userRecord as DbUserRecord)?.barangay;
          if (actualBarangay) {
            await calculateActivityForPeriod(actualBarangay, timePeriod);
            await calculateDayByDayHistory(actualBarangay);
          }
        } catch (error) {
          console.error('Error updating activity for period:', error);
        }
      };
      loadUserBarangay();
    }
  }, [timePeriod, user?.id]);

  const getDateRange = (period: 'daily' | 'weekly' | 'monthly' | 'yearly') => {
    const now = new Date();
    let startDate: Date;
    
    switch (period) {
      case 'daily':
        startDate = new Date(now);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'weekly':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'monthly':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'yearly':
        startDate = new Date(now.getFullYear(), 0, 1);
        startDate.setHours(0, 0, 0, 0);
        break;
    }
    
    return { startDate, endDate: now };
  };

  const calculateActivityForPeriod = async (barangay: string, period: 'daily' | 'weekly' | 'monthly' | 'yearly') => {
    try {
      const { db } = await import('../../utils/db');
      
      const { startDate, endDate } = getDateRange(period);
      const allBookings = await db.list<BookingRecord>('bookings');
      const allListings = await db.list<PublishedListingRecord>('published_listings');
      const allApplications = await db.list<OwnerApplicationRecord>('owner_applications');
      const allUsers = await db.list<DbUserRecord>('users');
      const allInquiries = await db.list('listing_inquiries');
      
      // Filter by barangay
      const barangayListings = allListings.filter(listing => {
        if (listing.barangay) {
          return listing.barangay.trim().toUpperCase() === barangay.trim().toUpperCase();
        }
        const listingUser = allUsers.find(u => u.id === listing.userId);
        return listingUser?.barangay?.trim().toUpperCase() === barangay.trim().toUpperCase();
      });
      
      const barangayPropertyIds = barangayListings.map(l => l.id);
      const barangayBookings = allBookings.filter(b => barangayPropertyIds.includes(b.propertyId));
      const paidBarangayBookings = barangayBookings.filter(b => 
        b.status === 'approved' && b.paymentStatus === 'paid'
      );
      
      const approvedApplications = allApplications.filter(app => 
        app.status === 'approved' && 
        app.barangay?.toUpperCase() === barangay.toUpperCase()
      );
      
      const barangayInquiries = allInquiries.filter((inquiry: any) => 
        inquiry?.listingId && barangayPropertyIds.includes(inquiry.listingId)
      );
      
      // Calculate activity for the period
      const newBookings = barangayBookings.filter(b => {
        const bookingDate = new Date(b.createdAt);
        return bookingDate >= startDate && bookingDate <= endDate;
      }).length;
      
      const newProperties = barangayListings.filter(l => {
        const propertyDate = new Date(l.publishedAt);
        return propertyDate >= startDate && propertyDate <= endDate;
      }).length;
      
      const newOwners = approvedApplications.filter(app => {
        const approvalDate = new Date(app.reviewedAt || app.createdAt);
        return approvalDate >= startDate && approvalDate <= endDate;
      }).length;
      
      const newTenants = paidBarangayBookings.filter(b => {
        const bookingDate = new Date(b.createdAt);
        return bookingDate >= startDate && bookingDate <= endDate;
      }).length;
      
      const newInquiries = barangayInquiries.filter((inquiry: any) => {
        const inquiryDateStr = inquiry?.createdAt || inquiry?.timestamp;
        if (!inquiryDateStr) return false;
        try {
          const inquiryDate = new Date(inquiryDateStr);
          if (isNaN(inquiryDate.getTime())) return false;
          return inquiryDate >= startDate && inquiryDate <= endDate;
        } catch (error) {
          return false;
        }
      }).length;
      
      setActivityData({
        newBookings,
        newProperties,
        newOwners,
        newTenants,
        newInquiries
      });
    } catch (error) {
      console.error('Error calculating activity for period:', error);
      setActivityData({
        newBookings: 0,
        newProperties: 0,
        newOwners: 0,
        newTenants: 0,
        newInquiries: 0
      });
    }
  };

  const calculateDayByDayHistory = async (barangay: string) => {
    try {
      const { db } = await import('../../utils/db');
      
      const now = new Date();
      const allBookings = await db.list<BookingRecord>('bookings');
      const allListings = await db.list<PublishedListingRecord>('published_listings');
      const allApplications = await db.list<OwnerApplicationRecord>('owner_applications');
      const allUsers = await db.list<DbUserRecord>('users');
      const allInquiries = await db.list('listing_inquiries');
      
      // Filter by barangay
      const barangayListings = allListings.filter(listing => {
        if (listing.barangay) {
          return listing.barangay.trim().toUpperCase() === barangay.trim().toUpperCase();
        }
        const listingUser = allUsers.find(u => u.id === listing.userId);
        return listingUser?.barangay?.trim().toUpperCase() === barangay.trim().toUpperCase();
      });
      
      const barangayPropertyIds = barangayListings.map(l => l.id);
      const barangayBookings = allBookings.filter(b => barangayPropertyIds.includes(b.propertyId));
      const paidBarangayBookings = barangayBookings.filter(b => 
        b.status === 'approved' && b.paymentStatus === 'paid'
      );
      
      const approvedApplications = allApplications.filter(app => 
        app.status === 'approved' && 
        app.barangay?.toUpperCase() === barangay.toUpperCase()
      );
      
      const barangayInquiries = allInquiries.filter((inquiry: any) => 
        inquiry?.listingId && barangayPropertyIds.includes(inquiry.listingId)
      );
      
      // Calculate day-by-day based on time period
      const days = [];
      const { startDate, endDate } = getDateRange(timePeriod);
      
      if (timePeriod === 'daily') {
        // For daily, show today's activity
        const dayStart = new Date(now);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(now);
        dayEnd.setHours(23, 59, 59, 999);
        
        const dayBookings = barangayBookings.filter(b => {
          const bookingDate = new Date(b.createdAt);
          return bookingDate >= dayStart && bookingDate <= dayEnd;
        }).length;
        
        const dayProperties = barangayListings.filter(l => {
          const propertyDate = new Date(l.publishedAt);
          return propertyDate >= dayStart && propertyDate <= dayEnd;
        }).length;
        
        const dayOwners = approvedApplications.filter(app => {
          const approvalDate = new Date(app.reviewedAt || app.createdAt);
          return approvalDate >= dayStart && approvalDate <= dayEnd;
        }).length;
        
        const dayTenants = paidBarangayBookings.filter(b => {
          const bookingDate = new Date(b.createdAt);
          return bookingDate >= dayStart && bookingDate <= dayEnd;
        }).length;
        
        const dayInquiries = barangayInquiries.filter((inquiry: any) => {
          const inquiryDateStr = inquiry?.createdAt || inquiry?.timestamp;
          if (!inquiryDateStr) return false;
          try {
            const inquiryDate = new Date(inquiryDateStr);
            if (isNaN(inquiryDate.getTime())) return false;
            return inquiryDate >= dayStart && inquiryDate <= dayEnd;
          } catch (error) {
            return false;
          }
        }).length;
        
        days.push({
          date: now.toISOString().split('T')[0],
          dayName: now.toLocaleDateString('en-US', { weekday: 'short' }),
          bookings: dayBookings,
          properties: dayProperties,
          owners: dayOwners,
          tenants: dayTenants,
          inquiries: dayInquiries
        });
      } else if (timePeriod === 'weekly') {
        // For weekly, show last 7 days
        for (let i = 6; i >= 0; i--) {
          const dayDate = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
          const dayStart = new Date(dayDate);
          dayStart.setHours(0, 0, 0, 0);
          const dayEnd = new Date(dayDate);
          dayEnd.setHours(23, 59, 59, 999);
          
          const dayBookings = barangayBookings.filter(b => {
            const bookingDate = new Date(b.createdAt);
            return bookingDate >= dayStart && bookingDate <= dayEnd;
          }).length;
          
          const dayProperties = barangayListings.filter(l => {
            const propertyDate = new Date(l.publishedAt);
            return propertyDate >= dayStart && propertyDate <= dayEnd;
          }).length;
          
          const dayOwners = approvedApplications.filter(app => {
            const approvalDate = new Date(app.reviewedAt || app.createdAt);
            return approvalDate >= dayStart && approvalDate <= dayEnd;
          }).length;
          
          const dayTenants = paidBarangayBookings.filter(b => {
            const bookingDate = new Date(b.createdAt);
            return bookingDate >= dayStart && bookingDate <= dayEnd;
          }).length;
          
          const dayInquiries = barangayInquiries.filter((inquiry: any) => {
            const inquiryDateStr = inquiry?.createdAt || inquiry?.timestamp;
            if (!inquiryDateStr) return false;
            try {
              const inquiryDate = new Date(inquiryDateStr);
              if (isNaN(inquiryDate.getTime())) return false;
              return inquiryDate >= dayStart && inquiryDate <= dayEnd;
            } catch (error) {
              return false;
            }
          }).length;
          
          days.push({
            date: dayDate.toISOString().split('T')[0],
            dayName: dayDate.toLocaleDateString('en-US', { weekday: 'short' }),
            bookings: dayBookings,
            properties: dayProperties,
            owners: dayOwners,
            tenants: dayTenants,
            inquiries: dayInquiries
          });
        }
      } else if (timePeriod === 'monthly') {
        // For monthly, show last 30 days grouped by week
        const weeks: { [key: string]: { start: Date; end: Date; bookings: number; properties: number; owners: number; tenants: number; inquiries: number } } = {};
        
        for (let i = 29; i >= 0; i--) {
          const dayDate = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
          const weekStart = new Date(dayDate);
          weekStart.setDate(dayDate.getDate() - dayDate.getDay());
          weekStart.setHours(0, 0, 0, 0);
          const weekKey = weekStart.toISOString().split('T')[0];
          
          if (!weeks[weekKey]) {
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 6);
            weekEnd.setHours(23, 59, 59, 999);
            weeks[weekKey] = { start: weekStart, end: weekEnd, bookings: 0, properties: 0, owners: 0, tenants: 0, inquiries: 0 };
          }
          
          const dayStart = new Date(dayDate);
          dayStart.setHours(0, 0, 0, 0);
          const dayEnd = new Date(dayDate);
          dayEnd.setHours(23, 59, 59, 999);
          
          weeks[weekKey].bookings += barangayBookings.filter(b => {
            const bookingDate = new Date(b.createdAt);
            return bookingDate >= dayStart && bookingDate <= dayEnd;
          }).length;
          
          weeks[weekKey].properties += barangayListings.filter(l => {
            const propertyDate = new Date(l.publishedAt);
            return propertyDate >= dayStart && propertyDate <= dayEnd;
          }).length;
          
          weeks[weekKey].owners += approvedApplications.filter(app => {
            const approvalDate = new Date(app.reviewedAt || app.createdAt);
            return approvalDate >= dayStart && approvalDate <= dayEnd;
          }).length;
          
          weeks[weekKey].tenants += paidBarangayBookings.filter(b => {
            const bookingDate = new Date(b.createdAt);
            return bookingDate >= dayStart && bookingDate <= dayEnd;
          }).length;
          
          weeks[weekKey].inquiries += barangayInquiries.filter((inquiry: any) => {
            const inquiryDateStr = inquiry?.createdAt || inquiry?.timestamp;
            if (!inquiryDateStr) return false;
            try {
              const inquiryDate = new Date(inquiryDateStr);
              if (isNaN(inquiryDate.getTime())) return false;
              return inquiryDate >= dayStart && inquiryDate <= dayEnd;
            } catch (error) {
              return false;
            }
          }).length;
        }
        
        Object.keys(weeks).sort().forEach(weekKey => {
          const week = weeks[weekKey];
          const weekEnd = new Date(week.end);
          days.push({
            date: `${week.start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
            dayName: 'Week',
            bookings: week.bookings,
            properties: week.properties,
            owners: week.owners,
            tenants: week.tenants,
            inquiries: week.inquiries
          });
        });
      } else if (timePeriod === 'yearly') {
        // For yearly, show last 12 months
        for (let i = 11; i >= 0; i--) {
          const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const monthStart = new Date(monthDate);
          monthStart.setHours(0, 0, 0, 0);
          const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
          monthEnd.setHours(23, 59, 59, 999);
          
          const monthBookings = barangayBookings.filter(b => {
            const bookingDate = new Date(b.createdAt);
            return bookingDate >= monthStart && bookingDate <= monthEnd;
          }).length;
          
          const monthProperties = barangayListings.filter(l => {
            const propertyDate = new Date(l.publishedAt);
            return propertyDate >= monthStart && propertyDate <= monthEnd;
          }).length;
          
          const monthOwners = approvedApplications.filter(app => {
            const approvalDate = new Date(app.reviewedAt || app.createdAt);
            return approvalDate >= monthStart && approvalDate <= monthEnd;
          }).length;
          
          const monthTenants = paidBarangayBookings.filter(b => {
            const bookingDate = new Date(b.createdAt);
            return bookingDate >= monthStart && bookingDate <= monthEnd;
          }).length;
          
          const monthInquiries = barangayInquiries.filter((inquiry: any) => {
            const inquiryDateStr = inquiry?.createdAt || inquiry?.timestamp;
            if (!inquiryDateStr) return false;
            try {
              const inquiryDate = new Date(inquiryDateStr);
              if (isNaN(inquiryDate.getTime())) return false;
              return inquiryDate >= monthStart && inquiryDate <= monthEnd;
            } catch (error) {
              return false;
            }
          }).length;
          
          days.push({
            date: monthDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
            dayName: monthDate.toLocaleDateString('en-US', { month: 'long' }),
            bookings: monthBookings,
            properties: monthProperties,
            owners: monthOwners,
            tenants: monthTenants,
            inquiries: monthInquiries
          });
        }
      }
      
      setDayByDayData(days);
    } catch (error) {
      console.error('Error calculating day-by-day history:', error);
      setDayByDayData([]);
    }
  };

  const loadAnalytics = async () => {
    if (!user?.id) {
      console.log('❌ No user ID found');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Get the actual barangay name from the database (same as dashboard)
      const { db } = await import('../../utils/db');
      const userRecord = await db.get('users', user.id);
      
      if (!userRecord) {
        console.error('❌ User record not found');
        setAnalytics(null);
        setLoading(false);
        return;
      }
      
      const actualBarangay = (userRecord as DbUserRecord)?.barangay;
      
      if (!actualBarangay) {
        console.error('❌ No barangay found in user record');
        setAnalytics(null);
        setLoading(false);
        return;
      }
      
      // Store barangay in state for use in other functions
      setUserBarangay(actualBarangay);
      
      console.log('📊 Loading analytics for barangay:', actualBarangay);
      console.log('📊 Using barangay name:', actualBarangay);
      console.log('📊 Trimmed barangay name:', actualBarangay.trim());
      console.log('📊 Uppercase barangay name:', actualBarangay.trim().toUpperCase());
      
      const data = await getComprehensiveAnalytics(actualBarangay);
      
      // Verify data was returned (should never be null from getComprehensiveAnalytics)
      if (!data) {
        console.error('❌ getComprehensiveAnalytics returned null/undefined');
        throw new Error('Analytics data is null');
      }
      
      console.log('✅ Analytics loaded successfully:', {
        totalProperties: data.totalProperties,
        totalBookings: data.totalBookings,
        totalResidents: data.genderAnalytics.total,
        totalOwners: data.ownerAnalytics.totalOwners,
        totalPropertyViews: data.totalViews, // ⭐ Critical: Verify views are loaded
        averageViewsPerProperty: data.averageViewsPerProperty,
        hasData: data.totalProperties > 0 || data.totalBookings > 0 || data.ownerAnalytics.totalOwners > 0
      });
      
      // Validation: Verify Total Property Views is working
      if (typeof data.totalViews === 'number' && data.totalViews >= 0) {
        console.log('✅ Total Property Views is valid:', data.totalViews);
      } else {
        console.warn('⚠️ Total Property Views may be invalid:', data.totalViews);
      }
      
      // Always set analytics, even if all values are zero (this is valid data)
      setAnalytics(data);
      
      // Calculate day-by-day breakdown and activity for current period
      await calculateDayByDayHistory(actualBarangay);
      await calculateActivityForPeriod(actualBarangay, timePeriod);
    } catch (error) {
      console.error('❌ Error loading analytics:', error);
      console.error('❌ Error details:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      
      // Even on error, try to get empty analytics data (function always returns data)
      try {
        const { db } = await import('../../utils/db');
        const fallbackUserRecord = await db.get<DbUserRecord>('users', user?.id || '');
        const fallbackBarangay = (fallbackUserRecord as DbUserRecord)?.barangay || '';
        console.log('🔄 Attempting fallback with barangay:', fallbackBarangay);
        if (fallbackBarangay) {
          setUserBarangay(fallbackBarangay);
        }
        const emptyData = await getComprehensiveAnalytics(fallbackBarangay);
        if (emptyData) {
          console.log('✅ Fallback analytics loaded');
          setAnalytics(emptyData);
        } else {
          console.error('❌ Fallback also returned null');
          setAnalytics(null);
        }
      } catch (fallbackError) {
        console.error('❌ Error getting fallback analytics:', fallbackError);
        // Last resort: create minimal empty analytics object
        setAnalytics(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = async () => {
    if (!userBarangay || !analytics) return;

    try {
      const exportData = await exportBarangayAnalytics(userBarangay);

      // Web platform: Use browser print
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        // Create a print-friendly HTML page
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
          Alert.alert('Print Error', 'Please allow popups to print the report.');
          return;
        }

        const printContent = generatePrintHTML(exportData, userBarangay, analytics);
        printWindow.document.write(printContent);
        printWindow.document.close();
        
        // Wait for content to load, then print
        printWindow.onload = () => {
          setTimeout(() => {
            printWindow.print();
          }, 250);
        };
        return;
      }

      // Mobile platform: Share the report as text
      const printText = `BARANGAY ANALYTICS REPORT\n${'='.repeat(50)}\nBarangay: ${userBarangay}\nGenerated: ${new Date().toLocaleString()}\n\n${exportData.summary}`;
      
      try {
        await Share.share({
          message: printText,
          title: `Analytics Report - ${userBarangay}`,
        });
      } catch (shareError) {
        console.error('Share error:', shareError);
        // Fallback: Try to save as file and share
        await handleMobileShare(exportData.summary, `${userBarangay}_analytics_report.txt`, 'text/plain');
      }
      
    } catch (error) {
      console.error('Error printing analytics:', error);
      Alert.alert('Print Error', 'Failed to print analytics. Please try again.');
    }
  };

  const generatePrintHTML = (exportData: any, barangay: string, analytics: ComprehensiveAnalytics) => {
    return `
<!DOCTYPE html>
<html>
<head>
  <title>Barangay Analytics Report - ${barangay}</title>
  <style>
    @media print {
      @page {
        margin: 1cm;
        size: A4;
      }
      body { margin: 0; }
      .no-print { display: none; }
    }
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 900px;
      margin: 0 auto;
      padding: 20px;
    }
    h1 {
      color: #1F2937;
      border-bottom: 3px solid #3B82F6;
      padding-bottom: 10px;
      margin-bottom: 30px;
    }
    h2 {
      color: #3B82F6;
      margin-top: 30px;
      margin-bottom: 15px;
      border-bottom: 2px solid #E5E7EB;
      padding-bottom: 5px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
    }
    th, td {
      border: 1px solid #E5E7EB;
      padding: 10px;
      text-align: left;
    }
    th {
      background-color: #F3F4F6;
      font-weight: bold;
      color: #1F2937;
    }
    tr:nth-child(even) {
      background-color: #F9FAFB;
    }
    .stat-box {
      display: inline-block;
      margin: 10px 15px 10px 0;
      padding: 15px;
      background-color: #F3F4F6;
      border-left: 4px solid #3B82F6;
      min-width: 200px;
    }
    .stat-label {
      font-size: 12px;
      color: #6B7280;
      text-transform: uppercase;
      margin-bottom: 5px;
    }
    .stat-value {
      font-size: 24px;
      font-weight: bold;
      color: #1F2937;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 2px solid #E5E7EB;
      text-align: center;
      color: #6B7280;
      font-size: 12px;
    }
    .button-container {
      margin: 20px 0;
      text-align: center;
    }
    button {
      background-color: #3B82F6;
      color: white;
      border: none;
      padding: 12px 24px;
      font-size: 16px;
      border-radius: 6px;
      cursor: pointer;
      margin: 0 10px;
    }
    button:hover {
      background-color: #2563EB;
    }
  </style>
</head>
<body>
  <div class="button-container no-print">
    <button onclick="window.print()">🖨️ Print Report</button>
    <button onclick="window.close()">Close</button>
  </div>
  
  <h1>📊 Barangay Analytics Report</h1>
  <p><strong>Barangay:</strong> ${barangay}</p>
  <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>

  <h2>Overview</h2>
  <div class="stat-box">
    <div class="stat-label">Total Properties</div>
    <div class="stat-value">${analytics.totalProperties}</div>
  </div>
  <div class="stat-box">
    <div class="stat-label">Total Bookings</div>
    <div class="stat-value">${analytics.totalBookings}</div>
  </div>
  <div class="stat-box">
    <div class="stat-label">Total Views</div>
    <div class="stat-value">${analytics.totalViews}</div>
  </div>

  <h2>Owner Demographics</h2>
  <table>
    <tr>
      <th>Metric</th>
      <th>Value</th>
      <th>Percentage</th>
    </tr>
    <tr>
      <td>Total Owners</td>
      <td>${analytics.ownerAnalytics.totalOwners}</td>
      <td>100%</td>
    </tr>
    <tr>
      <td>Male Owners</td>
      <td>${analytics.ownerAnalytics.maleOwners}</td>
      <td>${analytics.ownerAnalytics.maleOwnerPercentage}%</td>
    </tr>
    <tr>
      <td>Female Owners</td>
      <td>${analytics.ownerAnalytics.femaleOwners}</td>
      <td>${analytics.ownerAnalytics.femaleOwnerPercentage}%</td>
    </tr>
    <tr>
      <td>Average Properties per Owner</td>
      <td colspan="2">${analytics.ownerAnalytics.averagePropertiesPerOwner}</td>
    </tr>
  </table>

  <h2>Tenant Demographics</h2>
  <table>
    <tr>
      <th>Metric</th>
      <th>Value</th>
      <th>Percentage</th>
    </tr>
    <tr>
      <td>Total Tenants</td>
      <td>${analytics.genderAnalytics.total}</td>
      <td>100%</td>
    </tr>
    <tr>
      <td>Male Tenants</td>
      <td>${analytics.genderAnalytics.male}</td>
      <td>${analytics.genderAnalytics.malePercentage}%</td>
    </tr>
    <tr>
      <td>Female Tenants</td>
      <td>${analytics.genderAnalytics.female}</td>
      <td>${analytics.genderAnalytics.femalePercentage}%</td>
    </tr>
  </table>

  <h2>Property Status</h2>
  <table>
    <tr>
      <th>Status</th>
      <th>Count</th>
      <th>Percentage</th>
    </tr>
    <tr>
      <td>Available</td>
      <td>${analytics.availableProperties}</td>
      <td>${analytics.totalProperties > 0 ? Math.round((analytics.availableProperties / analytics.totalProperties) * 100) : 0}%</td>
    </tr>
    <tr>
      <td>Occupied</td>
      <td>${analytics.occupiedProperties}</td>
      <td>${analytics.totalProperties > 0 ? Math.round((analytics.occupiedProperties / analytics.totalProperties) * 100) : 0}%</td>
    </tr>
    <tr>
      <td>Reserved</td>
      <td>${analytics.reservedProperties}</td>
      <td>${analytics.totalProperties > 0 ? Math.round((analytics.reservedProperties / analytics.totalProperties) * 100) : 0}%</td>
    </tr>
  </table>

  <h2>Booking Status</h2>
  <table>
    <tr>
      <th>Status</th>
      <th>Count</th>
      <th>Percentage</th>
    </tr>
    <tr>
      <td>Approved</td>
      <td>${analytics.approvedBookings}</td>
      <td>${analytics.totalBookings > 0 ? Math.round((analytics.approvedBookings / analytics.totalBookings) * 100) : 0}%</td>
    </tr>
    <tr>
      <td>Pending</td>
      <td>${analytics.pendingBookings}</td>
      <td>${analytics.totalBookings > 0 ? Math.round((analytics.pendingBookings / analytics.totalBookings) * 100) : 0}%</td>
    </tr>
    <tr>
      <td>Rejected</td>
      <td>${analytics.rejectedBookings}</td>
      <td>${analytics.totalBookings > 0 ? Math.round((analytics.rejectedBookings / analytics.totalBookings) * 100) : 0}%</td>
    </tr>
    <tr>
      <td>Cancelled</td>
      <td>${analytics.cancelledBookings}</td>
      <td>${analytics.totalBookings > 0 ? Math.round((analytics.cancelledBookings / analytics.totalBookings) * 100) : 0}%</td>
    </tr>
    <tr>
      <td>Completed</td>
      <td>${analytics.completedBookings}</td>
      <td>${analytics.totalBookings > 0 ? Math.round((analytics.completedBookings / analytics.totalBookings) * 100) : 0}%</td>
    </tr>
  </table>

  <h2>Market Analytics</h2>
  <table>
    <tr>
      <th>Metric</th>
      <th>Value</th>
    </tr>
    <tr>
      <td>Occupancy Rate</td>
      <td>${analytics.marketAnalytics.occupancyRate}%</td>
    </tr>
    <tr>
      <td>Average Days on Market</td>
      <td>${analytics.marketAnalytics.averageDaysOnMarket} days</td>
    </tr>
  </table>

  <h2>Recent Activity (Last 7 Days)</h2>
  <table>
    <tr>
      <th>Activity</th>
      <th>Count</th>
    </tr>
    <tr>
      <td>New Bookings</td>
      <td>${analytics.recentActivity.newBookings}</td>
    </tr>
    <tr>
      <td>New Properties</td>
      <td>${analytics.recentActivity.newProperties}</td>
    </tr>
    <tr>
      <td>New Owners</td>
      <td>${analytics.recentActivity.newOwners}</td>
    </tr>
    <tr>
      <td>New Tenants</td>
      <td>${analytics.recentActivity.newTenants}</td>
    </tr>
    <tr>
      <td>New Inquiries</td>
      <td>${analytics.recentActivity.newInquiries}</td>
    </tr>
  </table>

  ${analytics.ownerAnalytics.topOwners.length > 0 ? `
  <h2>Top Performing Owners</h2>
  <table>
    <tr>
      <th>Rank</th>
      <th>Owner Name</th>
      <th>Properties</th>
    </tr>
    ${analytics.ownerAnalytics.topOwners.map((owner, index) => `
    <tr>
      <td>${index + 1}</td>
      <td>${owner.ownerName}</td>
      <td>${owner.propertyCount}</td>
    </tr>
    `).join('')}
  </table>
  ` : ''}

  ${analytics.relationshipAnalytics.mostActiveOwners.length > 0 ? `
  <h2>Most Active Owners</h2>
  <table>
    <tr>
      <th>Rank</th>
      <th>Owner Name</th>
      <th>Bookings</th>
    </tr>
    ${analytics.relationshipAnalytics.mostActiveOwners.map((owner, index) => `
    <tr>
      <td>${index + 1}</td>
      <td>${owner.ownerName}</td>
      <td>${owner.bookingCount}</td>
    </tr>
    `).join('')}
  </table>
  ` : ''}

  ${analytics.relationshipAnalytics.mostActiveTenants.length > 0 ? `
  <h2>Most Active Tenants</h2>
  <table>
    <tr>
      <th>Rank</th>
      <th>Tenant Name</th>
      <th>Bookings</th>
    </tr>
    ${analytics.relationshipAnalytics.mostActiveTenants.map((tenant, index) => `
    <tr>
      <td>${index + 1}</td>
      <td>${tenant.tenantName}</td>
      <td>${tenant.bookingCount}</td>
    </tr>
    `).join('')}
  </table>
  ` : ''}

  ${analytics.marketAnalytics.popularPropertyTypes.length > 0 ? `
  <h2>Popular Property Types</h2>
  <table>
    <tr>
      <th>Property Type</th>
      <th>Count</th>
    </tr>
    ${analytics.marketAnalytics.popularPropertyTypes.map(type => `
    <tr>
      <td>${type.type}</td>
      <td>${type.count}</td>
    </tr>
    `).join('')}
  </table>
  ` : ''}

  <div class="footer">
    <p>Report generated on ${new Date().toLocaleString()}</p>
    <p>Barangay Analytics System v1.0</p>
  </div>
</body>
</html>
    `;
  };

  const handleMobileShare = async (content: string, filename: string, mimeType: string) => {
    try {
      // Check if expo-sharing is available
      let Sharing: any;
      try {
        Sharing = await import('expo-sharing');
      } catch (e) {
        console.log('expo-sharing not available, using Share API');
      }

      // Create file path
      // Use the correct FileSystem API based on expo-file-system version
      const baseDir = (FileSystem as any).documentDirectory || (FileSystem as any).cacheDirectory || '';
      const fileUri = baseDir + filename;
      
      // Write file
      await FileSystem.writeAsStringAsync(fileUri, content);

      // Share file if expo-sharing is available
      if (Sharing && Sharing.isAvailableAsync && await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri);
        Alert.alert('Success', 'Report shared successfully!');
      } else {
        // Fallback: Use React Native Share API with file URI
        try {
          await Share.share({
            message: content,
            title: filename,
            url: fileUri, // iOS supports file URLs
          });
        } catch (shareError) {
          // If file sharing fails, just share text content
          await Share.share({
            message: content,
            title: filename,
          });
        }
      }
    } catch (error) {
      console.error('Error sharing file:', error);
      // Final fallback: Just share the text content
      try {
        await Share.share({
          message: content,
          title: filename,
        });
      } catch (shareError) {
        Alert.alert('Share Error', 'Unable to share the report. Please try again.');
      }
    }
  };

  const handleExport = async (format: 'all' | 'summary' | 'csv' | 'json' = 'all') => {
    if (!userBarangay) return;

    try {
      setExporting(true);
      const exportData = await exportBarangayAnalytics(userBarangay);
      
      // Web platform: Use browser download
      if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof document !== 'undefined' && typeof Blob !== 'undefined') {
        const downloadFile = (content: string, filename: string, mimeType: string) => {
          try {
            const blob = new Blob([content], { type: mimeType });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setTimeout(() => URL.revokeObjectURL(url), 1000);
          } catch (error) {
            console.error('Error downloading file:', error);
            // Fallback: Try to copy to clipboard
            if (navigator.clipboard && navigator.clipboard.writeText) {
              navigator.clipboard.writeText(content).then(() => {
                Alert.alert('Copied to Clipboard', 'Data has been copied to your clipboard.');
              }).catch(() => {
                Alert.alert('Download Failed', 'Unable to download file. Please try again.');
              });
            } else {
              Alert.alert('Download Failed', 'Unable to download file. Please try again.');
            }
          }
        };
        
        if (format === 'all' || format === 'summary') {
          downloadFile(exportData.summary, `${userBarangay}_analytics_report.txt`, 'text/plain');
        }
        
        if (format === 'all' || format === 'csv') {
          if (format === 'all') await new Promise(resolve => setTimeout(resolve, 500));
          downloadFile(exportData.csvData, `${userBarangay}_analytics_data.csv`, 'text/csv');
        }
        
        if (format === 'all' || format === 'json') {
          if (format === 'all') await new Promise(resolve => setTimeout(resolve, 500));
          downloadFile(JSON.stringify(exportData.jsonData, null, 2), `${userBarangay}_analytics_data.json`, 'application/json');
        }
        
        setShowExportModal(false);
        Alert.alert('Export Successful', 'Analytics data exported successfully! Check your downloads folder.');
        return;
      }

      // Mobile platform: Use file system and sharing
      const filesToShare: Array<{ content: string; filename: string; mimeType: string }> = [];
      
      if (format === 'all' || format === 'summary') {
        filesToShare.push({
          content: exportData.summary,
          filename: `${userBarangay}_analytics_report.txt`,
          mimeType: 'text/plain'
        });
      }
      
      if (format === 'all' || format === 'csv') {
        filesToShare.push({
          content: exportData.csvData,
          filename: `${userBarangay}_analytics_data.csv`,
          mimeType: 'text/csv'
        });
      }
      
      if (format === 'all' || format === 'json') {
        filesToShare.push({
          content: JSON.stringify(exportData.jsonData, null, 2),
          filename: `${userBarangay}_analytics_data.json`,
          mimeType: 'application/json'
        });
      }

      // Share files one by one on mobile
      for (let i = 0; i < filesToShare.length; i++) {
        const file = filesToShare[i];
        await handleMobileShare(file.content, file.filename, file.mimeType);
        
        // Small delay between shares
        if (i < filesToShare.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      setShowExportModal(false);
      Alert.alert('Export Successful', `${filesToShare.length} file(s) shared successfully!`);
      
    } catch (error) {
      console.error('Error exporting analytics:', error);
      Alert.alert('Export Failed', 'Failed to export analytics data. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <View style={sharedStyles.container}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={{ marginTop: 12, color: '#6B7280' }}>Loading analytics...</Text>
        </View>
      </View>
    );
  }

  if (!analytics && !loading) {
    return (
      <View style={sharedStyles.container}>
        <ScrollView style={sharedStyles.scrollView}>
          <View style={sharedStyles.pageContainer}>
            <View style={sharedStyles.pageHeader}>
              <View style={sharedStyles.headerLeft}>
                <Text style={sharedStyles.pageTitle}>Reports & Analytics</Text>
                <Text style={sharedStyles.pageSubtitle}>
                  Comprehensive data for {userBarangay || 'your barangay'}
                </Text>
              </View>
            </View>

            <View style={[sharedStyles.card, { marginTop: designTokens.spacing.lg }]}>
              <Text style={[sharedStyles.sectionTitle, { fontSize: 20, marginBottom: 12 }]}>
                📊 No Data Available
              </Text>
              <Text style={{ fontSize: 15, color: '#6B7280', marginBottom: 16, lineHeight: 22 }}>
                Unable to load analytics data. Please try refreshing or check if your barangay is set correctly.
                </Text>
              <TouchableOpacity
                onPress={loadAnalytics}
                style={[sharedStyles.primaryButton, { marginTop: 16 }]}
                activeOpacity={0.8}
              >
                <RefreshCw size={20} color="white" />
                <Text style={[sharedStyles.primaryButtonText, { marginLeft: 8 }]}>
                  Retry
                </Text>
              </TouchableOpacity>
              </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  // Early return if analytics is null - after this point analytics is guaranteed to be non-null
  if (!analytics) {
    return null; // This case should be handled by the earlier check
  }

  return (
    <View style={sharedStyles.container}>
      <ScrollView style={sharedStyles.scrollView}>
        <View style={sharedStyles.pageContainer}>
          {/* Header */}
          <View style={sharedStyles.pageHeader}>
            <View style={sharedStyles.headerLeft}>
              <Text style={sharedStyles.pageTitle}>📊 Reports & Analytics</Text>
              <Text style={sharedStyles.pageSubtitle}>
                Comprehensive data for {userBarangay || 'your barangay'}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity
                onPress={loadAnalytics}
                style={[sharedStyles.primaryButton, { paddingHorizontal: 12, paddingVertical: 8 }]}
                activeOpacity={0.8}
              >
                <RefreshCw size={16} color="white" />
                <Text style={[sharedStyles.primaryButtonText, { fontSize: 12, marginLeft: 4 }]}>Refresh</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* 1. DEMOGRAPHICS */}
          <View style={[sharedStyles.section, { marginBottom: designTokens.spacing.lg }]}>
            <Text style={[sharedStyles.sectionTitle, { fontSize: designTokens.typography.lg, marginBottom: designTokens.spacing.md }]}>
              👥 Demographics
            </Text>
            
            {/* Summary Stats */}
            <View style={[sharedStyles.card, { marginBottom: designTokens.spacing.md }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                  <View style={[sharedStyles.statIcon, { backgroundColor: '#3B82F6' }]}>
                  <Users size={20} color="white" />
                  </View>
                <Text style={[sharedStyles.sectionTitle, { marginBottom: 0, fontSize: designTokens.typography.base }]}>
                  Overview
                </Text>
              </View>

              <View style={{ gap: 16 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={sharedStyles.statLabel}>Total Owners</Text>
                  <Text style={[sharedStyles.statLabel, { color: '#3B82F6', fontSize: 18 }]}>
                    {analytics?.ownerAnalytics?.totalOwners ?? 0}
                </Text>
              </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={sharedStyles.statLabel}>Avg Properties per Owner</Text>
                  <Text style={[sharedStyles.statLabel, { color: '#10B981', fontSize: 18 }]}>
                    {analytics?.ownerAnalytics?.averagePropertiesPerOwner ?? 0}
                </Text>
              </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={sharedStyles.statLabel}>Total Residents (Tenants)</Text>
                  <Text style={[sharedStyles.statLabel, { color: '#EC4899', fontSize: 18 }]}>
                    {analytics?.genderAnalytics?.total ?? 0}
                </Text>
              </View>
            </View>
          </View>

            {/* Tenant Demographics with Pie Chart */}
              <View style={[sharedStyles.card, { marginBottom: designTokens.spacing.md }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                  <View style={[sharedStyles.statIcon, { backgroundColor: '#EC4899' }]}>
                    <Users size={20} color="white" />
                  </View>
                  <Text style={[sharedStyles.sectionTitle, { marginBottom: 0, fontSize: designTokens.typography.base }]}>
                  Resident Gender Distribution
                  </Text>
                </View>

                <View style={{ marginBottom: 16 }}>
                  <Text style={[sharedStyles.statLabel, { fontSize: 18, marginBottom: 8 }]}>
                  Total Residents: {analytics?.genderAnalytics?.total ?? 0}
                </Text>
                <Text style={[sharedStyles.statSubtitle, { fontSize: 12, color: '#6B7280', marginTop: 4 }]}>
                  Only tenants with completed payments are counted as residents
                  </Text>
                </View>

              {/* Pie Chart - Enhanced Design */}
              <View style={{ 
                alignItems: 'center', 
                marginBottom: 24, 
                paddingVertical: 24,
                paddingHorizontal: 16,
                backgroundColor: '#F9FAFB',
                borderRadius: 16,
                borderWidth: 1,
                borderColor: '#E5E7EB'
              }}>
                  <PieChart
                    data={[
                      {
                        label: 'Male',
                      value: analytics?.genderAnalytics?.male || 0,
                        color: '#3B82F6',
                      },
                      {
                        label: 'Female',
                      value: analytics?.genderAnalytics?.female || 0,
                        color: '#EC4899',
                      },
                    ...((analytics?.genderAnalytics?.unknown || 0) > 0 ? [{
                      label: 'Not Specified',
                      value: analytics?.genderAnalytics?.unknown ?? 0,
                      color: '#9CA3AF',
                    }] : []),
                  ].filter(item => item.value > 0)}
                  size={280}
                    showLabels={true}
                    showLegend={true}
                  />
                </View>

              {analytics?.genderAnalytics?.total && analytics.genderAnalytics.total > 0 ? (
                <View style={{ gap: 16 }}>
                  <View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                      <Text style={sharedStyles.statLabel}>👨 Male</Text>
                      <Text style={sharedStyles.statLabel}>
                        {analytics?.genderAnalytics?.male ?? 0} ({analytics?.genderAnalytics?.malePercentage ?? 0}%)
                      </Text>
                    </View>
                    <ProgressBar percentage={analytics?.genderAnalytics?.malePercentage ?? 0} color="#3B82F6" height={12} />
                  </View>

                  <View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                      <Text style={sharedStyles.statLabel}>👩 Female</Text>
                      <Text style={sharedStyles.statLabel}>
                        {analytics?.genderAnalytics?.female ?? 0} ({analytics?.genderAnalytics?.femalePercentage ?? 0}%)
                      </Text>
                    </View>
                    <ProgressBar percentage={analytics?.genderAnalytics?.femalePercentage ?? 0} color="#EC4899" height={12} />
                  </View>

                  {(analytics?.genderAnalytics?.unknown ?? 0) > 0 && (
                    <View>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                        <Text style={sharedStyles.statLabel}>❓ Not Specified</Text>
                        <Text style={sharedStyles.statLabel}>{analytics?.genderAnalytics?.unknown ?? 0}</Text>
                      </View>
                      <ProgressBar 
                        percentage={analytics?.genderAnalytics?.total ? Math.round(((analytics.genderAnalytics.unknown ?? 0) / analytics.genderAnalytics.total) * 100) : 0} 
                        color="#9CA3AF" 
                        height={12} 
                      />
                    </View>
                  )}
                </View>
              ) : (
                <View style={{ padding: 20, alignItems: 'center' }}>
                  <Text style={[sharedStyles.statSubtitle, { fontSize: 14, color: '#6B7280', textAlign: 'center' }]}>
                    No resident data available. Residents will appear here once tenants with completed payments are registered.
                  </Text>
                    </View>
                  )}
                </View>
          </View>

          {/* 3. PROPERTY ANALYTICS */}
          <View style={[sharedStyles.section, { marginBottom: designTokens.spacing.lg }]}>
            <Text style={[sharedStyles.sectionTitle, { fontSize: designTokens.typography.lg, marginBottom: designTokens.spacing.md }]}>
              🏠 Property Analytics
            </Text>
            
            {/* Property Status */}
            <View style={[sharedStyles.card, { marginBottom: designTokens.spacing.md }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                <View style={[sharedStyles.statIcon, { backgroundColor: '#10B981' }]}>
                  <BarChart3 size={20} color="white" />
                </View>
                <Text style={[sharedStyles.sectionTitle, { marginBottom: 0, fontSize: designTokens.typography.base }]}>
                  Property Status Breakdown
                </Text>
              </View>

              <View style={{ gap: 16 }}>
                <View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                    <Text style={sharedStyles.statLabel}>🏠 Available</Text>
                    <Text style={sharedStyles.statLabel}>
                      {analytics.availableProperties} ({analytics.totalProperties > 0 ? Math.round((analytics.availableProperties / analytics.totalProperties) * 100) : 0}%)
                    </Text>
                  </View>
                  <ProgressBar 
                    percentage={analytics.totalProperties > 0 ? (analytics.availableProperties / analytics.totalProperties) * 100 : 0} 
                    color="#10B981" 
                    height={12} 
                  />
                </View>

                <View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                    <Text style={sharedStyles.statLabel}>👥 Occupied</Text>
                    <Text style={sharedStyles.statLabel}>
                      {analytics.occupiedProperties} ({analytics.totalProperties > 0 ? Math.round((analytics.occupiedProperties / analytics.totalProperties) * 100) : 0}%)
                    </Text>
                  </View>
                  <ProgressBar 
                    percentage={analytics.totalProperties > 0 ? (analytics.occupiedProperties / analytics.totalProperties) * 100 : 0} 
                    color="#3B82F6" 
                    height={12} 
                  />
                </View>

                <View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                    <Text style={sharedStyles.statLabel}>🔒 Reserved</Text>
                    <Text style={sharedStyles.statLabel}>
                      {analytics.reservedProperties} ({analytics.totalProperties > 0 ? Math.round((analytics.reservedProperties / analytics.totalProperties) * 100) : 0}%)
                    </Text>
                  </View>
                  <ProgressBar 
                    percentage={analytics.totalProperties > 0 ? (analytics.reservedProperties / analytics.totalProperties) * 100 : 0} 
                    color="#F59E0B" 
                    height={12} 
                  />
                </View>
              </View>
            </View>

            {/* Property Types */}
            {Object.keys(analytics.propertyTypes).length > 0 && (
              <View style={[sharedStyles.card, { marginBottom: designTokens.spacing.md }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                  <View style={[sharedStyles.statIcon, { backgroundColor: '#8B5CF6' }]}>
                    <Home size={20} color="white" />
                  </View>
                  <Text style={[sharedStyles.sectionTitle, { marginBottom: 0, fontSize: designTokens.typography.base }]}>
                    Property Types Distribution
                  </Text>
                </View>

                <View style={{ gap: 12 }}>
                  {Object.entries(analytics.propertyTypes).map(([type, count]) => (
                    <View key={type} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={sharedStyles.statLabel}>{type}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={[sharedStyles.statLabel, { color: '#3B82F6', marginRight: 8 }]}>{count}</Text>
                        <Text style={[sharedStyles.statSubtitle, { fontSize: 12, color: '#6B7280' }]}>
                          ({analytics.totalProperties > 0 ? Math.round((count / analytics.totalProperties) * 100) : 0}%)
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>

          {/* 4. BOOKING ANALYTICS */}
          <View style={[sharedStyles.section, { marginBottom: designTokens.spacing.lg }]}>
            <Text style={[sharedStyles.sectionTitle, { fontSize: designTokens.typography.lg, marginBottom: designTokens.spacing.md }]}>
              📅 Booking Analytics
            </Text>
            
            {/* Booking Status */}
            <View style={[sharedStyles.card, { marginBottom: designTokens.spacing.md }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                <View style={[sharedStyles.statIcon, { backgroundColor: '#8B5CF6' }]}>
                  <PieChartIcon size={20} color="white" />
                </View>
                <Text style={[sharedStyles.sectionTitle, { marginBottom: 0, fontSize: designTokens.typography.base }]}>
                  Booking Status Breakdown
                </Text>
              </View>

              <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16 }}>
                <StatusBadge status="Approved" count={analytics.approvedBookings} />
                <StatusBadge status="Pending" count={analytics.pendingBookings} />
                <StatusBadge status="Rejected" count={analytics.rejectedBookings} />
                <StatusBadge status="Cancelled" count={analytics.cancelledBookings} />
                <StatusBadge status="Completed" count={analytics.completedBookings} />
              </View>

              <View style={{ gap: 12 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={sharedStyles.statLabel}>✅ Approved</Text>
                  <Text style={[sharedStyles.statLabel, { color: '#10B981' }]}>{analytics.approvedBookings}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={sharedStyles.statLabel}>⏳ Pending</Text>
                  <Text style={[sharedStyles.statLabel, { color: '#F59E0B' }]}>{analytics.pendingBookings}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={sharedStyles.statLabel}>❌ Rejected</Text>
                  <Text style={[sharedStyles.statLabel, { color: '#EF4444' }]}>{analytics.rejectedBookings}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={sharedStyles.statLabel}>🚫 Cancelled</Text>
                  <Text style={[sharedStyles.statLabel, { color: '#6B7280' }]}>{analytics.cancelledBookings}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={sharedStyles.statLabel}>✅ Completed</Text>
                  <Text style={[sharedStyles.statLabel, { color: '#10B981' }]}>{analytics.completedBookings}</Text>
                </View>
              </View>
            </View>

            {/* Booking Trends */}
            <View style={[sharedStyles.card, { marginBottom: designTokens.spacing.md }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                <View style={[sharedStyles.statIcon, { backgroundColor: '#10B981' }]}>
                  <TrendingUp size={20} color="white" />
                </View>
                <Text style={[sharedStyles.sectionTitle, { marginBottom: 0, fontSize: designTokens.typography.base }]}>
                  Booking Trends
                </Text>
              </View>

              <View style={{ gap: 12 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={sharedStyles.statLabel}>This Month</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={[sharedStyles.statLabel, { color: '#10B981', marginRight: 8 }]}>
                      {analytics?.bookingTrends?.thisMonth ?? 0}
                    </Text>
                    <TrendIndicator value={analytics?.bookingTrends?.thisMonth ?? 0} />
                  </View>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={sharedStyles.statLabel}>Last Month</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={[sharedStyles.statLabel, { color: '#6B7280', marginRight: 8 }]}>
                      {analytics?.bookingTrends?.lastMonth ?? 0}
                    </Text>
                    <TrendIndicator value={analytics?.bookingTrends?.lastMonth ?? 0} />
                  </View>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={sharedStyles.statLabel}>Growth Rate</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={[
                      sharedStyles.statLabel, 
                      { 
                        color: (analytics?.bookingTrends?.growthRate ?? 0) >= 0 ? '#10B981' : '#EF4444',
                        marginRight: 8 
                      }
                    ]}>
                      {(analytics?.bookingTrends?.growthRate ?? 0) >= 0 ? '+' : ''}{analytics?.bookingTrends?.growthRate ?? 0}%
                    </Text>
                    <TrendIndicator value={analytics?.bookingTrends?.growthRate ?? 0} />
                  </View>
                </View>
              </View>
            </View>
          </View>

          {/* 5. ACTIVITY & ENGAGEMENT */}
          <View style={[sharedStyles.section, { marginBottom: designTokens.spacing.lg }]}>
            <Text style={[sharedStyles.sectionTitle, { fontSize: designTokens.typography.lg, marginBottom: designTokens.spacing.md }]}>
              📊 Activity & Engagement
            </Text>
            
            {/* Time Period Selector Button */}
            <TouchableOpacity
              onPress={() => setShowTimePeriodModal(true)}
              style={[sharedStyles.card, { marginBottom: designTokens.spacing.md }]}
              activeOpacity={0.8}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={[sharedStyles.statIcon, { backgroundColor: '#6366F1' }]}>
                    <Clock size={20} color="white" />
                  </View>
                  <View style={{ marginLeft: 12 }}>
                    <Text style={[sharedStyles.statLabel, { fontSize: 12, color: '#6B7280', marginBottom: 2 }]}>
                      Time Period
                    </Text>
                    <Text style={[sharedStyles.sectionTitle, { marginBottom: 0, fontSize: designTokens.typography.base, textTransform: 'capitalize' }]}>
                      {timePeriod === 'daily' ? 'Today' : timePeriod === 'weekly' ? 'Last 7 Days' : timePeriod === 'monthly' ? 'This Month' : 'This Year'}
                    </Text>
                  </View>
                </View>
                <Text style={[sharedStyles.statLabel, { color: '#6366F1', fontSize: 14 }]}>
                  Change
                </Text>
              </View>
            </TouchableOpacity>

            {/* Time Period Modal */}
            <Modal
              visible={showTimePeriodModal}
              transparent={true}
              animationType="fade"
              onRequestClose={() => setShowTimePeriodModal(false)}
            >
              <Pressable
                style={{
                  flex: 1,
                  backgroundColor: 'rgba(0, 0, 0, 0.5)',
                  justifyContent: 'center',
                  alignItems: 'center',
                  padding: 20,
                }}
                onPress={() => setShowTimePeriodModal(false)}
              >
                <Pressable
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: 16,
                    padding: 24,
                    width: '100%',
                    maxWidth: 400,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 8,
                    elevation: 8,
                  }}
                  onPress={(e) => e.stopPropagation()}
                >
                  <View style={{ marginBottom: 20 }}>
                    <Text style={[sharedStyles.sectionTitle, { fontSize: designTokens.typography.lg, marginBottom: 8 }]}>
                      Select Time Period
                    </Text>
                    <Text style={[sharedStyles.statSubtitle, { fontSize: 14, color: '#6B7280' }]}>
                      Choose how you want to view activity data
                    </Text>
                  </View>

                  <View style={{ gap: 12 }}>
                    {(['daily', 'weekly', 'monthly', 'yearly'] as const).map((period) => (
                      <View key={period} style={{ gap: 8 }}>
                        <TouchableOpacity
                          onPress={() => {
                            setTimePeriod(period);
                          }}
                          style={{
                            paddingVertical: 16,
                            paddingHorizontal: 20,
                            borderRadius: 12,
                            backgroundColor: timePeriod === period ? '#6366F1' : '#F9FAFB',
                            borderWidth: 2,
                            borderColor: timePeriod === period ? '#6366F1' : '#E5E7EB',
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}
                          activeOpacity={0.7}
                        >
                          <View style={{ flex: 1 }}>
                            <Text style={{
                              fontSize: 16,
                              fontWeight: timePeriod === period ? '600' : '500',
                              color: timePeriod === period ? '#FFFFFF' : '#1F2937',
                              textTransform: 'capitalize',
                              marginBottom: 4,
                            }}>
                              {period === 'daily' ? 'Today' : period === 'weekly' ? 'Last 7 Days' : period === 'monthly' ? 'This Month' : 'This Year'}
                            </Text>
                            <Text style={{
                              fontSize: 12,
                              color: timePeriod === period ? 'rgba(255, 255, 255, 0.8)' : '#6B7280',
                            }}>
                              {period === 'daily' ? 'View today\'s activity' : 
                               period === 'weekly' ? 'View activity for the past week' : 
                               period === 'monthly' ? 'View activity for this month' : 
                               'View activity for this year'}
                            </Text>
                          </View>
                          {timePeriod === period && (
                            <View style={{
                              width: 24,
                              height: 24,
                              borderRadius: 12,
                              backgroundColor: '#FFFFFF',
                              justifyContent: 'center',
                              alignItems: 'center',
                            }}>
                              <Text style={{ color: '#6366F1', fontSize: 16, fontWeight: 'bold' }}>✓</Text>
                            </View>
                          )}
                        </TouchableOpacity>
                        {timePeriod === period && (period === 'weekly' || period === 'monthly' || period === 'yearly') && (
                          <TouchableOpacity
                            onPress={() => {
                              setShowTimePeriodModal(false);
                              setTimeout(() => setShowHistoryModal(true), 300); // Small delay for smooth transition
                            }}
                            style={{
                              paddingVertical: 12,
                              paddingHorizontal: 16,
                              borderRadius: 8,
                              backgroundColor: '#F0F4FF',
                              borderWidth: 1,
                              borderColor: '#6366F1',
                              flexDirection: 'row',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: 8,
                            }}
                            activeOpacity={0.7}
                          >
                            <Clock size={16} color="#6366F1" />
                            <Text style={{
                              fontSize: 14,
                              fontWeight: '600',
                              color: '#6366F1',
                            }}>
                              View {period === 'weekly' ? 'Day-by-Day' : period === 'monthly' ? 'Weekly' : 'Monthly'} History
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    ))}
                  </View>

                  <TouchableOpacity
                    onPress={() => setShowTimePeriodModal(false)}
                    style={{
                      marginTop: 20,
                      paddingVertical: 12,
                      paddingHorizontal: 20,
                      borderRadius: 8,
                      backgroundColor: '#F3F4F6',
                      alignItems: 'center',
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={{
                      fontSize: 14,
                      fontWeight: '500',
                      color: '#6B7280',
                    }}>
                      Close
                    </Text>
                  </TouchableOpacity>
                </Pressable>
              </Pressable>
            </Modal>

            {/* History Modal - Full Screen */}
            <Modal
              visible={showHistoryModal}
              transparent={false}
              animationType="slide"
              onRequestClose={() => setShowHistoryModal(false)}
            >
              <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
                {/* Header */}
                <View style={{
                  paddingTop: 60,
                  paddingBottom: 20,
                  paddingHorizontal: 20,
                  backgroundColor: '#FFFFFF',
                  borderBottomWidth: 1,
                  borderBottomColor: '#E5E7EB',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 4,
                  elevation: 4,
                }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flex: 1 }}>
                      <Text style={[sharedStyles.sectionTitle, { fontSize: designTokens.typography.xl, marginBottom: 4 }]}>
                        {timePeriod === 'weekly' ? 'Day-by-Day History' : timePeriod === 'monthly' ? 'Weekly History' : 'Monthly History'}
                      </Text>
                      <Text style={[sharedStyles.statSubtitle, { fontSize: 14, color: '#6B7280' }]}>
                        {timePeriod === 'weekly' ? 'Last 7 Days' : timePeriod === 'monthly' ? 'Last 30 Days' : 'Last 12 Months'}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => setShowHistoryModal(false)}
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 20,
                        backgroundColor: '#F3F4F6',
                        justifyContent: 'center',
                        alignItems: 'center',
                        marginLeft: 16,
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={{ fontSize: 24, color: '#6B7280', fontWeight: '300' }}>×</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Scrollable Content */}
                <ScrollView 
                  style={{ flex: 1 }}
                  contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
                  showsVerticalScrollIndicator={true}
                >
                  <View style={{ gap: 12 }}>
                    {dayByDayData.length > 0 ? (
                      dayByDayData.map((day, index) => (
                        <View 
                          key={`${day.date}-${index}`} 
                          style={{ 
                            padding: 16, 
                            backgroundColor: index % 2 === 0 ? '#F9FAFB' : '#FFFFFF',
                            borderRadius: 12,
                            borderWidth: 1,
                            borderColor: '#E5E7EB',
                            marginBottom: index < dayByDayData.length - 1 ? 0 : 0,
                          }}
                        >
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                            <Text style={[sharedStyles.statLabel, { fontWeight: '600', fontSize: 16 }]}>
                              {day.date}
                            </Text>
                            {day.dayName && day.dayName !== 'Week' && day.dayName !== 'Month' && (
                              <Text style={[sharedStyles.statLabel, { fontSize: 13, color: '#6B7280' }]}>
                                {day.dayName}
                              </Text>
                            )}
                          </View>
                          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                            <View style={{ flex: 1, minWidth: '45%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, paddingHorizontal: 14, backgroundColor: '#FFFFFF', borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB' }}>
                              <Text style={[sharedStyles.statLabel, { fontSize: 13, color: '#6B7280' }]}>Bookings</Text>
                              <Text style={[sharedStyles.statLabel, { fontSize: 15, fontWeight: '600', color: '#10B981' }]}>
                                {day.bookings}
                              </Text>
                            </View>
                            <View style={{ flex: 1, minWidth: '45%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, paddingHorizontal: 14, backgroundColor: '#FFFFFF', borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB' }}>
                              <Text style={[sharedStyles.statLabel, { fontSize: 13, color: '#6B7280' }]}>Properties</Text>
                              <Text style={[sharedStyles.statLabel, { fontSize: 15, fontWeight: '600', color: '#3B82F6' }]}>
                                {day.properties}
                              </Text>
                            </View>
                            <View style={{ flex: 1, minWidth: '45%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, paddingHorizontal: 14, backgroundColor: '#FFFFFF', borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB' }}>
                              <Text style={[sharedStyles.statLabel, { fontSize: 13, color: '#6B7280' }]}>Owners</Text>
                              <Text style={[sharedStyles.statLabel, { fontSize: 15, fontWeight: '600', color: '#F59E0B' }]}>
                                {day.owners}
                              </Text>
                            </View>
                            <View style={{ flex: 1, minWidth: '45%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, paddingHorizontal: 14, backgroundColor: '#FFFFFF', borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB' }}>
                              <Text style={[sharedStyles.statLabel, { fontSize: 13, color: '#6B7280' }]}>Tenants</Text>
                              <Text style={[sharedStyles.statLabel, { fontSize: 15, fontWeight: '600', color: '#EC4899' }]}>
                                {day.tenants}
                              </Text>
                            </View>
                            <View style={{ flex: 1, minWidth: '45%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, paddingHorizontal: 14, backgroundColor: '#FFFFFF', borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB' }}>
                              <Text style={[sharedStyles.statLabel, { fontSize: 13, color: '#6B7280' }]}>Inquiries</Text>
                              <Text style={[sharedStyles.statLabel, { fontSize: 15, fontWeight: '600', color: '#8B5CF6' }]}>
                                {day.inquiries}
                              </Text>
                            </View>
                          </View>
                        </View>
                      ))
                    ) : (
                      <View style={{ padding: 40, alignItems: 'center', justifyContent: 'center', minHeight: 200 }}>
                        <Text style={[sharedStyles.statLabel, { color: '#6B7280', fontSize: 16 }]}>
                          No history data available for this period
                        </Text>
                      </View>
                    )}
                  </View>
                </ScrollView>
              </View>
            </Modal>
            
            {/* Recent Activity */}
            <View style={[sharedStyles.card, { marginBottom: designTokens.spacing.md }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                <View style={[sharedStyles.statIcon, { backgroundColor: '#EF4444' }]}>
                  <Activity size={20} color="white" />
                </View>
                <Text style={[sharedStyles.sectionTitle, { marginBottom: 0, fontSize: designTokens.typography.base }]}>
                  Recent Activity ({timePeriod === 'daily' ? 'Today' : timePeriod === 'weekly' ? 'Last 7 Days' : timePeriod === 'monthly' ? 'This Month' : 'This Year'})
                </Text>
              </View>

              <View style={{ gap: 12 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={sharedStyles.statLabel}>New Bookings</Text>
                  <Text style={[sharedStyles.statLabel, { color: '#10B981' }]}>
                    {activityData.newBookings}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={sharedStyles.statLabel}>New Properties</Text>
                  <Text style={[sharedStyles.statLabel, { color: '#3B82F6' }]}>
                    {activityData.newProperties}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={sharedStyles.statLabel}>New Owners</Text>
                  <Text style={[sharedStyles.statLabel, { color: '#F59E0B' }]}>
                    {activityData.newOwners}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={sharedStyles.statLabel}>New Tenants</Text>
                  <Text style={[sharedStyles.statLabel, { color: '#EC4899' }]}>
                    {activityData.newTenants}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={sharedStyles.statLabel}>New Inquiries</Text>
                  <Text style={[sharedStyles.statLabel, { color: '#8B5CF6' }]}>
                    {activityData.newInquiries}
                  </Text>
                </View>
              </View>
            </View>


            {/* Engagement Metrics */}
            <View style={[sharedStyles.card, { marginBottom: designTokens.spacing.md }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                <View style={[sharedStyles.statIcon, { backgroundColor: '#8B5CF6' }]}>
                  <Eye size={20} color="white" />
                </View>
                <Text style={[sharedStyles.sectionTitle, { marginBottom: 0, fontSize: designTokens.typography.base }]}>
                  Engagement Metrics
                </Text>
              </View>

              <View style={{ gap: 12 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={sharedStyles.statLabel}>Total Property Views</Text>
                  <Text style={[sharedStyles.statLabel, { color: '#8B5CF6' }]}>
                    {analytics.totalViews}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={sharedStyles.statLabel}>Average Views per Property</Text>
                  <Text style={[sharedStyles.statLabel, { color: '#3B82F6' }]}>
                    {analytics.averageViewsPerProperty}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={sharedStyles.statLabel}>Total Inquiries</Text>
                  <Text style={[sharedStyles.statLabel, { color: '#10B981' }]}>
                    {analytics.totalInquiries}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* 7. TOP PERFORMERS */}
          <View style={[sharedStyles.section, { marginBottom: designTokens.spacing.lg }]}>
            <Text style={[sharedStyles.sectionTitle, { fontSize: designTokens.typography.lg, marginBottom: designTokens.spacing.md }]}>
              🏆 Top Performers
            </Text>
            
            {/* Top Performing Owners */}
            {analytics.ownerAnalytics.topOwners.length > 0 && (
              <View style={[sharedStyles.card, { marginBottom: designTokens.spacing.md }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                  <View style={[sharedStyles.statIcon, { backgroundColor: '#10B981' }]}>
                    <Award size={20} color="white" />
                  </View>
                  <Text style={[sharedStyles.sectionTitle, { marginBottom: 0, fontSize: designTokens.typography.base }]}>
                    Top Performing Owners
                  </Text>
                </View>

                <View style={{ gap: 12 }}>
                  {analytics.ownerAnalytics.topOwners.map((owner, index) => (
                    <View key={owner.ownerId} style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      paddingVertical: 8,
                      paddingHorizontal: 12,
                      backgroundColor: '#F9FAFB',
                      borderRadius: 8,
                      borderBottomWidth: index < analytics.ownerAnalytics.topOwners.length - 1 ? 1 : 0,
                      borderBottomColor: '#E5E7EB',
                    }}>
                      <View style={{ flex: 1 }}>
                        <Text style={[sharedStyles.statLabel, { fontSize: 16 }]}>
                          {index + 1}. {owner.ownerName}
                        </Text>
                        <Text style={[sharedStyles.statLabel, { fontSize: 14, color: '#6B7280' }]}>
                          {owner.propertyCount} properties
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Most Active Owners */}
            {analytics.relationshipAnalytics.mostActiveOwners.length > 0 && (
              <View style={[sharedStyles.card, { marginBottom: designTokens.spacing.md }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                  <View style={[sharedStyles.statIcon, { backgroundColor: '#EF4444' }]}>
                    <TrendingUp size={20} color="white" />
                  </View>
                  <Text style={[sharedStyles.sectionTitle, { marginBottom: 0, fontSize: designTokens.typography.base }]}>
                    Most Active Owners
                  </Text>
                </View>

                <View style={{ gap: 12 }}>
                  {analytics.relationshipAnalytics.mostActiveOwners.map((owner, index) => (
                    <View key={owner.ownerId} style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      paddingVertical: 8,
                      paddingHorizontal: 12,
                      backgroundColor: '#F9FAFB',
                      borderRadius: 8,
                      borderBottomWidth: index < analytics.relationshipAnalytics.mostActiveOwners.length - 1 ? 1 : 0,
                      borderBottomColor: '#E5E7EB',
                    }}>
                      <View style={{ flex: 1 }}>
                        <Text style={[sharedStyles.statLabel, { fontSize: 16 }]}>
                          {index + 1}. {owner.ownerName}
                        </Text>
                        <Text style={[sharedStyles.statLabel, { fontSize: 14, color: '#6B7280' }]}>
                          {owner.bookingCount} bookings
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Most Active Tenants */}
            {analytics.relationshipAnalytics.mostActiveTenants.length > 0 && (
              <View style={[sharedStyles.card, { marginBottom: designTokens.spacing.md }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                  <View style={[sharedStyles.statIcon, { backgroundColor: '#EC4899' }]}>
                    <Users size={20} color="white" />
                  </View>
                  <Text style={[sharedStyles.sectionTitle, { marginBottom: 0, fontSize: designTokens.typography.base }]}>
                    Most Active Tenants
                  </Text>
                </View>

                <View style={{ gap: 12 }}>
                  {analytics.relationshipAnalytics.mostActiveTenants.map((tenant, index) => (
                    <View key={tenant.tenantId} style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      paddingVertical: 8,
                      paddingHorizontal: 12,
                      backgroundColor: '#F9FAFB',
                      borderRadius: 8,
                      borderBottomWidth: index < analytics.relationshipAnalytics.mostActiveTenants.length - 1 ? 1 : 0,
                      borderBottomColor: '#E5E7EB',
                    }}>
                      <View style={{ flex: 1 }}>
                        <Text style={[sharedStyles.statLabel, { fontSize: 16 }]}>
                          {index + 1}. {tenant.tenantName}
                        </Text>
                      </View>
                      <Text style={[sharedStyles.statLabel, { color: '#3B82F6', fontSize: 16 }]}>
                        {tenant.bookingCount} bookings
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>

          {/* 8. MARKET INSIGHTS */}
          <View style={[sharedStyles.section, { marginBottom: designTokens.spacing.lg }]}>
            <Text style={[sharedStyles.sectionTitle, { fontSize: designTokens.typography.lg, marginBottom: designTokens.spacing.md }]}>
              📈 Market Insights
            </Text>
            
            {/* Market Analytics */}
            <View style={[sharedStyles.card, { marginBottom: designTokens.spacing.md }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                <View style={[sharedStyles.statIcon, { backgroundColor: '#8B5CF6' }]}>
                  <Building2 size={20} color="white" />
                </View>
                <Text style={[sharedStyles.sectionTitle, { marginBottom: 0, fontSize: designTokens.typography.base }]}>
                  Market Analytics
                </Text>
              </View>

              <View style={{ gap: 12 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={sharedStyles.statLabel}>Occupancy Rate</Text>
                  <Text style={[sharedStyles.statLabel, { color: '#10B981' }]}>
                    {analytics.marketAnalytics.occupancyRate}%
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={sharedStyles.statLabel}>Avg Days on Market</Text>
                  <Text style={[sharedStyles.statLabel, { color: '#F59E0B' }]}>
                    {analytics.marketAnalytics.averageDaysOnMarket} days
                  </Text>
                </View>
              </View>
            </View>

            {/* Popular Property Types */}
            {analytics.marketAnalytics.popularPropertyTypes.length > 0 && (
              <View style={[sharedStyles.card, { marginBottom: designTokens.spacing.md }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                  <View style={[sharedStyles.statIcon, { backgroundColor: '#F59E0B' }]}>
                    <MapPin size={20} color="white" />
                  </View>
                  <Text style={[sharedStyles.sectionTitle, { marginBottom: 0, fontSize: designTokens.typography.base }]}>
                    Popular Property Types
                  </Text>
                </View>

                <View style={{ gap: 12 }}>
                  {analytics.marketAnalytics.popularPropertyTypes.map((type, index) => (
                    <View key={type.type} style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      paddingVertical: 8,
                      paddingHorizontal: 12,
                      backgroundColor: '#F9FAFB',
                      borderRadius: 8,
                      borderBottomWidth: index < analytics.marketAnalytics.popularPropertyTypes.length - 1 ? 1 : 0,
                      borderBottomColor: '#E5E7EB',
                    }}>
                      <View style={{ flex: 1 }}>
                        <Text style={[sharedStyles.statLabel, { fontSize: 16 }]}>
                          {type.type}
                        </Text>
                        <Text style={[sharedStyles.statLabel, { fontSize: 14, color: '#6B7280' }]}>
                          {type.count} properties
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Tenant-Owner Relationships */}
            <View style={[sharedStyles.card, { marginBottom: designTokens.spacing.md }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                <View style={[sharedStyles.statIcon, { backgroundColor: '#8B5CF6' }]}>
                  <Target size={20} color="white" />
                </View>
                <Text style={[sharedStyles.sectionTitle, { marginBottom: 0, fontSize: designTokens.typography.base }]}>
                  Tenant-Owner Relationships
                </Text>
              </View>

              <View style={{ gap: 12 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={sharedStyles.statLabel}>Avg Bookings per Owner</Text>
                  <Text style={[sharedStyles.statLabel, { color: '#3B82F6' }]}>
                    {analytics.relationshipAnalytics.averageBookingsPerOwner}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={sharedStyles.statLabel}>Avg Bookings per Tenant</Text>
                  <Text style={[sharedStyles.statLabel, { color: '#10B981' }]}>
                    {analytics.relationshipAnalytics.averageBookingsPerTenant}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={sharedStyles.statLabel}>Conversion Rate</Text>
                  <Text style={[sharedStyles.statLabel, { color: '#F59E0B' }]}>
                    {analytics.relationshipAnalytics.conversionRate}%
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={{ 
            flexDirection: 'row', 
            gap: 12, 
            marginTop: designTokens.spacing.lg,
            marginBottom: designTokens.spacing.xl,
            flexWrap: 'wrap'
          }}>
            <TouchableOpacity
              onPress={loadAnalytics}
              style={[sharedStyles.primaryButton, { flex: 1, minWidth: 150 }]}
              activeOpacity={0.8}
            >
              <RefreshCw size={20} color="white" />
              <Text style={[sharedStyles.primaryButtonText, { marginLeft: 8 }]}>
                🔄 Refresh
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={handlePrint}
              style={[
                sharedStyles.primaryButton, 
                { 
                  flex: 1,
                  minWidth: 150,
                  backgroundColor: '#8B5CF6',
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8
                }
              ]}
              activeOpacity={0.8}
            >
              <Printer size={20} color="white" />
              <Text style={sharedStyles.primaryButtonText}>
                🖨️ Print
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={() => setShowExportModal(true)}
              disabled={exporting}
              style={[
                sharedStyles.primaryButton, 
                { 
                  flex: 1,
                  minWidth: 150,
                  backgroundColor: exporting ? '#9CA3AF' : '#10B981',
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8
                }
              ]}
              activeOpacity={0.8}
            >
              {exporting ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <FileDown size={20} color="white" />
              )}
              <Text style={sharedStyles.primaryButtonText}>
                {exporting ? 'Exporting...' : '📥 Download'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Export Format Selection Modal */}
          <Modal
            visible={showExportModal}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setShowExportModal(false)}
          >
            <Pressable
              style={{
                flex: 1,
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                justifyContent: 'center',
                alignItems: 'center',
                padding: 20,
              }}
              onPress={() => setShowExportModal(false)}
            >
              <Pressable
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: 16,
                  padding: 24,
                  width: '100%',
                  maxWidth: 400,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  elevation: 8,
                }}
                onPress={(e) => e.stopPropagation()}
              >
                <Text style={[sharedStyles.sectionTitle, { fontSize: designTokens.typography.lg, marginBottom: 8 }]}>
                  Download Analytics Data
                </Text>
                <Text style={[sharedStyles.statSubtitle, { fontSize: 14, color: '#6B7280', marginBottom: 20 }]}>
                  Choose the format you want to download:
                </Text>

                <View style={{ gap: 12 }}>
                  <TouchableOpacity
                    onPress={() => handleExport('all')}
                    disabled={exporting}
                    style={{
                      paddingVertical: 16,
                      paddingHorizontal: 20,
                      borderRadius: 12,
                      backgroundColor: '#10B981',
                      borderWidth: 2,
                      borderColor: '#10B981',
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <Download size={20} color="white" />
                      <View>
                        <Text style={{ fontSize: 16, fontWeight: '600', color: '#FFFFFF', marginBottom: 2 }}>
                          All Formats
                        </Text>
                        <Text style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.8)' }}>
                          Summary, CSV, and JSON
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handleExport('summary')}
                    disabled={exporting}
                    style={{
                      paddingVertical: 14,
                      paddingHorizontal: 20,
                      borderRadius: 12,
                      backgroundColor: '#F9FAFB',
                      borderWidth: 2,
                      borderColor: '#E5E7EB',
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 12,
                    }}
                    activeOpacity={0.7}
                  >
                    <FileText size={18} color="#3B82F6" />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 15, fontWeight: '600', color: '#1F2937', marginBottom: 2 }}>
                        Summary Report (TXT)
                      </Text>
                      <Text style={{ fontSize: 12, color: '#6B7280' }}>
                        Human-readable text report
                      </Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handleExport('csv')}
                    disabled={exporting}
                    style={{
                      paddingVertical: 14,
                      paddingHorizontal: 20,
                      borderRadius: 12,
                      backgroundColor: '#F9FAFB',
                      borderWidth: 2,
                      borderColor: '#E5E7EB',
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 12,
                    }}
                    activeOpacity={0.7}
                  >
                    <FileDown size={18} color="#10B981" />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 15, fontWeight: '600', color: '#1F2937', marginBottom: 2 }}>
                        CSV Data
                      </Text>
                      <Text style={{ fontSize: 12, color: '#6B7280' }}>
                        Spreadsheet format for Excel
                      </Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handleExport('json')}
                    disabled={exporting}
                    style={{
                      paddingVertical: 14,
                      paddingHorizontal: 20,
                      borderRadius: 12,
                      backgroundColor: '#F9FAFB',
                      borderWidth: 2,
                      borderColor: '#E5E7EB',
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 12,
                    }}
                    activeOpacity={0.7}
                  >
                    <FileText size={18} color="#8B5CF6" />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 15, fontWeight: '600', color: '#1F2937', marginBottom: 2 }}>
                        JSON Data
                      </Text>
                      <Text style={{ fontSize: 12, color: '#6B7280' }}>
                        Structured data format
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  onPress={() => setShowExportModal(false)}
                  style={{
                    marginTop: 20,
                    paddingVertical: 12,
                    paddingHorizontal: 20,
                    borderRadius: 8,
                    backgroundColor: '#F3F4F6',
                    alignItems: 'center',
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={{
                    fontSize: 14,
                    fontWeight: '500',
                    color: '#6B7280',
                  }}>
                    Cancel
                  </Text>
                </TouchableOpacity>
              </Pressable>
            </Pressable>
          </Modal>
        </View>
      </ScrollView>
    </View>
  );
}
