import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity, Modal, Pressable, Platform, Alert, Share } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Line, Circle, Polyline, Path } from 'react-native-svg';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'expo-router';
import { sharedStyles, designTokens, iconBackgrounds } from '../../styles/owner-dashboard-styles';
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
  FileDown,
  Calendar
} from 'lucide-react-native';

// Helper component for progress bars - Modern Design
const ProgressBar = ({ percentage, color = '#3B82F6', height = 8 }: { percentage: number; color?: string; height?: number }) => (
  <View style={{
    height,
    backgroundColor: '#F3F4F6',
    borderRadius: height / 2,
    overflow: 'hidden',
    position: 'relative',
  }}>
    <LinearGradient
      colors={[color, color + 'DD']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={{
        height: '100%',
        width: `${Math.min(100, Math.max(0, percentage))}%`,
        borderRadius: height / 2,
      }}
    />
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
        // getComprehensiveAnalytics always returns a valid object, even with empty string
        const emptyData = await getComprehensiveAnalytics('');
        setAnalytics(emptyData);
        setLoading(false);
        return;
      }
      
      const actualBarangay = (userRecord as DbUserRecord)?.barangay;
      
      if (!actualBarangay) {
        console.error('❌ No barangay found in user record');
        // getComprehensiveAnalytics always returns a valid object, even with empty string
        const emptyData = await getComprehensiveAnalytics('');
        setAnalytics(emptyData);
        setLoading(false);
        return;
      }
      
      // Store barangay in state for use in other functions
      setUserBarangay(actualBarangay);
      
      console.log('📊 Loading analytics for barangay:', actualBarangay);
      console.log('📊 Using barangay name:', actualBarangay);
      console.log('📊 Trimmed barangay name:', actualBarangay.trim());
      console.log('📊 Uppercase barangay name:', actualBarangay.trim().toUpperCase());
      
      // getComprehensiveAnalytics always returns a valid ComprehensiveAnalytics object (never null)
      const data = await getComprehensiveAnalytics(actualBarangay);
      
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
        // getComprehensiveAnalytics always returns a valid object (never null)
        const emptyData = await getComprehensiveAnalytics(fallbackBarangay);
        console.log('✅ Fallback analytics loaded');
        setAnalytics(emptyData);
      } catch (fallbackError) {
        console.error('❌ Error getting fallback analytics:', fallbackError);
        // Last resort: getComprehensiveAnalytics always returns a valid object, even with empty string
        const emptyData = await getComprehensiveAnalytics('');
        setAnalytics(emptyData);
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
        <View style={[sharedStyles.pageContainer, { 
          paddingHorizontal: designTokens.spacing.xl + designTokens.spacing.sm,
          paddingTop: designTokens.spacing.lg,
          paddingBottom: designTokens.spacing.xl,
        }]}>
          {/* Clean Modern Header */}
          <View style={{
            marginBottom: designTokens.spacing['2xl'],
            paddingBottom: designTokens.spacing.lg,
            borderBottomWidth: 1,
            borderBottomColor: designTokens.colors.borderLight,
          }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: designTokens.spacing.sm }}>
              <View style={{ flex: 1 }}>
                <Text style={{
                  fontSize: designTokens.typography['3xl'],
                  fontWeight: designTokens.typography.bold as any,
                  color: designTokens.colors.textPrimary,
                  letterSpacing: -0.5,
                  marginBottom: designTokens.spacing.xs,
                }}>
                  Reports & Analytics
                </Text>
                <Text style={{
                  fontSize: designTokens.typography.base,
                  color: designTokens.colors.textSecondary,
                  fontWeight: designTokens.typography.medium as any,
                }}>
                  {userBarangay || 'Your Barangay'} • Comprehensive Insights
                </Text>
              </View>
              <TouchableOpacity
                onPress={loadAnalytics}
                style={{
                  backgroundColor: designTokens.colors.background,
                  padding: designTokens.spacing.md,
                  borderRadius: designTokens.borderRadius.lg,
                  borderWidth: 1,
                  borderColor: designTokens.colors.borderLight,
                }}
                activeOpacity={0.7}
              >
                <RefreshCw size={20} color={designTokens.colors.primary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* 1. DEMOGRAPHICS - Clean Section */}
          <View style={{ marginBottom: designTokens.spacing['2xl'] }}>
            {/* Clean Section Header */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: designTokens.spacing.xl,
              paddingLeft: designTokens.spacing.sm,
            }}>
              <View style={{
                width: 4,
                height: 24,
                backgroundColor: '#3B82F6',
                borderRadius: 2,
                marginRight: designTokens.spacing.md,
              }} />
              <Text style={{
                fontSize: designTokens.typography.xl,
                fontWeight: designTokens.typography.bold as any,
                color: designTokens.colors.textPrimary,
                letterSpacing: -0.3,
              }}>
                Demographics
              </Text>
            </View>
            
            {/* Key Stats Grid */}
            <View style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: designTokens.spacing.md,
              marginBottom: designTokens.spacing.lg,
            }}>
              {/* Total Owners Card - Modern */}
              <View style={{
                flex: 1,
                minWidth: '47%',
                backgroundColor: designTokens.colors.white,
                borderRadius: 12,
                padding: designTokens.spacing.lg + designTokens.spacing.xs,
                borderWidth: 1,
                borderColor: designTokens.colors.borderLight,
              }}>
                <Text style={{
                  fontSize: designTokens.typography.xs,
                  color: designTokens.colors.textSecondary,
                  marginBottom: designTokens.spacing.xs,
                  fontWeight: designTokens.typography.medium as any,
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                }}>
                  Total Owners
                </Text>
                <Text style={{
                  fontSize: designTokens.typography['3xl'],
                  fontWeight: designTokens.typography.bold as any,
                  color: designTokens.colors.textPrimary,
                  letterSpacing: -1,
                }}>
                  {analytics?.ownerAnalytics?.totalOwners ?? 0}
                </Text>
              </View>

              {/* Total Residents Card - Modern */}
              <View style={{
                flex: 1,
                minWidth: '47%',
                backgroundColor: designTokens.colors.white,
                borderRadius: 12,
                padding: designTokens.spacing.lg + designTokens.spacing.xs,
                borderWidth: 1,
                borderColor: designTokens.colors.borderLight,
              }}>
                <Text style={{
                  fontSize: designTokens.typography.xs,
                  color: designTokens.colors.textSecondary,
                  marginBottom: designTokens.spacing.xs,
                  fontWeight: designTokens.typography.medium as any,
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                }}>
                  Total Residents
                </Text>
                <Text style={{
                  fontSize: designTokens.typography['3xl'],
                  fontWeight: designTokens.typography.bold as any,
                  color: designTokens.colors.textPrimary,
                  letterSpacing: -1,
                }}>
                  {analytics?.genderAnalytics?.total ?? 0}
                </Text>
              </View>

              {/* Avg Properties per Owner Card - Modern */}
              <View style={{
                flex: 1,
                minWidth: '47%',
                backgroundColor: designTokens.colors.white,
                borderRadius: 12,
                padding: designTokens.spacing.lg + designTokens.spacing.xs,
                borderWidth: 1,
                borderColor: designTokens.colors.borderLight,
              }}>
                <Text style={{
                  fontSize: designTokens.typography.xs,
                  color: designTokens.colors.textSecondary,
                  marginBottom: designTokens.spacing.xs,
                  fontWeight: designTokens.typography.medium as any,
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                }}>
                  Avg Properties/Owner
                </Text>
                <Text style={{
                  fontSize: designTokens.typography['3xl'],
                  fontWeight: designTokens.typography.bold as any,
                  color: designTokens.colors.textPrimary,
                  letterSpacing: -1,
                }}>
                  {analytics?.ownerAnalytics?.averagePropertiesPerOwner ?? 0}
                </Text>
              </View>
            </View>

            {/* Tenant Demographics with Pie Chart - Clean Card */}
            <View style={{
              backgroundColor: designTokens.colors.white,
              borderRadius: 12,
              padding: designTokens.spacing.xl + designTokens.spacing.xs,
              marginBottom: designTokens.spacing.lg,
              borderWidth: 1,
              borderColor: designTokens.colors.borderLight,
            }}>
                <Text style={{
                  fontSize: designTokens.typography.lg,
                  fontWeight: designTokens.typography.bold as any,
                  color: designTokens.colors.textPrimary,
                  marginBottom: designTokens.spacing.xs,
                  letterSpacing: -0.3,
                }}>
                  Resident Gender Distribution
                </Text>
                <Text style={{
                  fontSize: designTokens.typography.sm,
                  color: designTokens.colors.textSecondary,
                  marginBottom: designTokens.spacing.lg,
                }}>
                  Only tenants with completed payments are counted
                </Text>

                <View style={{ marginBottom: 16 }}>
                  <Text style={[sharedStyles.statLabel, { fontSize: 18, marginBottom: 8 }]}>
                  Total Residents: {analytics?.genderAnalytics?.total ?? 0}
                </Text>
                <Text style={[sharedStyles.statSubtitle, { fontSize: 12, color: '#6B7280', marginTop: 4 }]}>
                  Only tenants with completed payments are counted as residents
                  </Text>
                </View>

              {/* Pie Chart - Modern Design */}
              <View style={{ 
                alignItems: 'center', 
                marginBottom: designTokens.spacing.lg, 
                paddingVertical: designTokens.spacing.xl,
                paddingHorizontal: designTokens.spacing.lg,
                backgroundColor: designTokens.colors.background,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: designTokens.colors.borderLight,
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

            {/* Tenant Type Analytics - Clean Section */}
            <View style={{
              backgroundColor: designTokens.colors.white,
              borderRadius: 12,
              padding: designTokens.spacing.xl + designTokens.spacing.xs,
              marginBottom: designTokens.spacing.lg,
              marginHorizontal: designTokens.spacing.sm,
              borderWidth: 1,
              borderColor: designTokens.colors.borderLight,
            }}>
              <Text style={{
                fontSize: designTokens.typography.lg,
                fontWeight: designTokens.typography.bold as any,
                color: designTokens.colors.textPrimary,
                marginBottom: designTokens.spacing.xs,
                letterSpacing: -0.3,
              }}>
                Tenant Type Distribution
              </Text>
              <Text style={{
                fontSize: designTokens.typography.sm,
                color: designTokens.colors.textSecondary,
                marginBottom: designTokens.spacing.lg,
              }}>
                Breakdown of tenant types and total number of people
              </Text>

              <View style={{ marginBottom: 16 }}>
                <Text style={[sharedStyles.statLabel, { fontSize: 18, marginBottom: 8 }]}>
                  Total People: {analytics?.tenantTypeAnalytics?.totalPeople ?? 0}
                </Text>
                <Text style={[sharedStyles.statSubtitle, { fontSize: 12, color: '#6B7280', marginTop: 4 }]}>
                  Breakdown of tenant types and total number of people from bookings
                </Text>
              </View>

              {analytics?.tenantTypeAnalytics && (
                <View style={{ gap: 16 }}>
                  <View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                      <Text style={sharedStyles.statLabel}>👤 Individual</Text>
                      <Text style={sharedStyles.statLabel}>
                        {analytics.tenantTypeAnalytics.individual ?? 0} {analytics.tenantTypeAnalytics.individual === 1 ? 'booking' : 'bookings'}
                      </Text>
                    </View>
                    <ProgressBar 
                      percentage={analytics.totalBookings > 0 ? Math.round(((analytics.tenantTypeAnalytics.individual ?? 0) / analytics.totalBookings) * 100) : 0} 
                      color="#3B82F6" 
                      height={12} 
                    />
                  </View>

                  <View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                      <Text style={sharedStyles.statLabel}>👨‍👩‍👧‍👦 Family</Text>
                      <Text style={sharedStyles.statLabel}>
                        {analytics.tenantTypeAnalytics.family ?? 0} {analytics.tenantTypeAnalytics.family === 1 ? 'booking' : 'bookings'}
                      </Text>
                    </View>
                    <ProgressBar 
                      percentage={analytics.totalBookings > 0 ? Math.round(((analytics.tenantTypeAnalytics.family ?? 0) / analytics.totalBookings) * 100) : 0} 
                      color="#10B981" 
                      height={12} 
                    />
                  </View>

                  <View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                      <Text style={sharedStyles.statLabel}>💑 Couple</Text>
                      <Text style={sharedStyles.statLabel}>
                        {analytics.tenantTypeAnalytics.couple ?? 0} {analytics.tenantTypeAnalytics.couple === 1 ? 'booking' : 'bookings'}
                      </Text>
                    </View>
                    <ProgressBar 
                      percentage={analytics.totalBookings > 0 ? Math.round(((analytics.tenantTypeAnalytics.couple ?? 0) / analytics.totalBookings) * 100) : 0} 
                      color="#EC4899" 
                      height={12} 
                    />
                  </View>

                  <View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                      <Text style={sharedStyles.statLabel}>👥 Group/Shared</Text>
                      <Text style={sharedStyles.statLabel}>
                        {analytics.tenantTypeAnalytics.group ?? 0} {analytics.tenantTypeAnalytics.group === 1 ? 'booking' : 'bookings'}
                      </Text>
                    </View>
                    <ProgressBar 
                      percentage={analytics.totalBookings > 0 ? Math.round(((analytics.tenantTypeAnalytics.group ?? 0) / analytics.totalBookings) * 100) : 0} 
                      color="#F59E0B" 
                      height={12} 
                    />
                  </View>
                </View>
              )}
            </View>
          </View>

          {/* 3. PROPERTY ANALYTICS - Clean Section */}
          <View style={{ marginBottom: designTokens.spacing['2xl'] }}>
            {/* Clean Section Header */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: designTokens.spacing.xl,
              paddingLeft: designTokens.spacing.sm,
            }}>
              <View style={{
                width: 4,
                height: 24,
                backgroundColor: '#10B981',
                borderRadius: 2,
                marginRight: designTokens.spacing.md,
              }} />
              <Text style={{
                fontSize: designTokens.typography.xl,
                fontWeight: designTokens.typography.bold as any,
                color: designTokens.colors.textPrimary,
                letterSpacing: -0.3,
              }}>
                Property Analytics
              </Text>
            </View>
            
            {/* Property Status - Clean Card */}
            <View style={{
              backgroundColor: designTokens.colors.white,
              borderRadius: 12,
              padding: designTokens.spacing.xl + designTokens.spacing.xs,
              marginBottom: designTokens.spacing.lg,
              marginHorizontal: designTokens.spacing.sm,
              borderWidth: 1,
              borderColor: designTokens.colors.borderLight,
            }}>
              <Text style={{
                fontSize: designTokens.typography.lg,
                fontWeight: designTokens.typography.bold as any,
                color: designTokens.colors.textPrimary,
                marginBottom: designTokens.spacing.lg,
                letterSpacing: -0.3,
              }}>
                Property Status Breakdown
              </Text>

              {/* Area Chart */}
              <View style={{ overflow: 'hidden' }}>
                <LinearGradient
                  colors={['#EEF2FF', '#F5F3FF'] as [string, string]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    borderRadius: 12,
                    padding: designTokens.spacing.lg,
                    overflow: 'hidden',
                  }}
                >
                  {(() => {
                    const availablePercent = analytics.totalProperties > 0 ? (analytics.availableProperties / analytics.totalProperties) * 100 : 0;
                    const occupiedPercent = analytics.totalProperties > 0 ? (analytics.occupiedProperties / analytics.totalProperties) * 100 : 0;
                    const reservedPercent = analytics.totalProperties > 0 ? (analytics.reservedProperties / analytics.totalProperties) * 100 : 0;
                    const chartHeight = 200;
                    const chartWidth = '100%';
                    const padding = designTokens.spacing.md;
                    
                    // Calculate stacked areas
                    const availableHeight = (availablePercent / 100) * chartHeight;
                    const occupiedHeight = (occupiedPercent / 100) * chartHeight;
                    const reservedHeight = (reservedPercent / 100) * chartHeight;
                    
                    // Y positions from bottom
                    const reservedY = chartHeight - reservedHeight;
                    const occupiedY = reservedY - occupiedHeight;
                    const availableY = occupiedY - availableHeight;
                    
                    return (
                      <View>
                        {/* Chart Container */}
                        <View style={{
                          height: chartHeight,
                          position: 'relative',
                          marginBottom: designTokens.spacing.lg,
                        }}>
                          {/* Y-axis labels */}
                          <View style={{
                            position: 'absolute',
                            left: 0,
                            top: 0,
                            bottom: 0,
                            width: 35,
                            justifyContent: 'space-between',
                            paddingRight: designTokens.spacing.xs,
                          }}>
                            {[100, 75, 50, 25, 0].map((value) => (
                              <Text key={value} style={{
                                fontSize: designTokens.typography.xs,
                                color: designTokens.colors.textMuted,
                                textAlign: 'right',
                              }}>
                                {value}%
                              </Text>
                            ))}
                          </View>
                          
                          {/* Chart area */}
                          <View style={{
                            marginLeft: 40,
                            marginRight: padding,
                            height: chartHeight,
                            position: 'relative',
                            overflow: 'hidden',
                          }}>
                            {/* Grid lines */}
                            {[0, 25, 50, 75, 100].map((percent) => (
                              <View
                                key={percent}
                                style={{
                                  position: 'absolute',
                                  left: 0,
                                  right: 0,
                                  bottom: `${percent}%`,
                                  height: 1,
                                  backgroundColor: designTokens.colors.borderLight,
                                  opacity: 0.3,
                                }}
                              />
                            ))}
                            
                            {/* Area Chart using SVG */}
                            {(() => {
                              // Use Dimensions to get width, or use a fixed width for SVG
                              const svgWidth = 300; // Approximate width, will scale
                              
                              return (
                                <Svg height={chartHeight} width="100%" viewBox={`0 0 ${svgWidth} ${chartHeight}`} preserveAspectRatio="none" style={{ position: 'absolute' }}>
                                  {/* Reserved Area (bottom) */}
                                  <Path
                                    d={`M 0 ${chartHeight} L 0 ${reservedY} L ${svgWidth} ${reservedY} L ${svgWidth} ${chartHeight} Z`}
                                    fill="#F59E0B"
                                    opacity={0.8}
                                  />
                                  
                                  {/* Occupied Area (middle) */}
                                  <Path
                                    d={`M 0 ${reservedY} L 0 ${occupiedY} L ${svgWidth} ${occupiedY} L ${svgWidth} ${reservedY} Z`}
                                    fill="#3B82F6"
                                    opacity={0.8}
                                  />
                                  
                                  {/* Available Area (top) */}
                                  <Path
                                    d={`M 0 ${occupiedY} L 0 ${availableY} L ${svgWidth} ${availableY} L ${svgWidth} ${occupiedY} Z`}
                                    fill="#10B981"
                                    opacity={0.8}
                                  />
                                  
                                  {/* Separator lines */}
                                  <Line
                                    x1={0}
                                    y1={reservedY}
                                    x2={svgWidth}
                                    y2={reservedY}
                                    stroke="#FFFFFF"
                                    strokeWidth="2"
                                    strokeOpacity="0.5"
                                  />
                                  <Line
                                    x1={0}
                                    y1={occupiedY}
                                    x2={svgWidth}
                                    y2={occupiedY}
                                    stroke="#FFFFFF"
                                    strokeWidth="2"
                                    strokeOpacity="0.5"
                                  />
                                </Svg>
                              );
                            })()}
                            
                            {/* Value labels on the areas */}
                            <View style={{
                              position: 'absolute',
                              left: 0,
                              right: 0,
                              top: 0,
                              bottom: 0,
                              justifyContent: 'center',
                              alignItems: 'center',
                            }}>
                              {/* Reserved label */}
                              {reservedHeight > 30 && (
                                <View style={{
                                  position: 'absolute',
                                  bottom: reservedHeight / 2,
                                  left: 0,
                                  right: 0,
                                  alignItems: 'center',
                                }}>
                                  <Text style={{
                                    fontSize: designTokens.typography.base,
                                    fontWeight: '700',
                                    color: '#FFFFFF',
                                  }}>
                                    {analytics.reservedProperties}
                                  </Text>
                                  <Text style={{
                                    fontSize: designTokens.typography.xs,
                                    color: '#FFFFFF',
                                    opacity: 0.9,
                                  }}>
                                    Reserved ({Math.round(reservedPercent)}%)
                                  </Text>
                                </View>
                              )}
                              
                              {/* Occupied label */}
                              {occupiedHeight > 30 && (
                                <View style={{
                                  position: 'absolute',
                                  bottom: reservedHeight + (occupiedHeight / 2),
                                  left: 0,
                                  right: 0,
                                  alignItems: 'center',
                                }}>
                                  <Text style={{
                                    fontSize: designTokens.typography.base,
                                    fontWeight: '700',
                                    color: '#FFFFFF',
                                  }}>
                                    {analytics.occupiedProperties}
                                  </Text>
                                  <Text style={{
                                    fontSize: designTokens.typography.xs,
                                    color: '#FFFFFF',
                                    opacity: 0.9,
                                  }}>
                                    Occupied ({Math.round(occupiedPercent)}%)
                                  </Text>
                                </View>
                              )}
                              
                              {/* Available label */}
                              {availableHeight > 30 && (
                                <View style={{
                                  position: 'absolute',
                                  bottom: reservedHeight + occupiedHeight + (availableHeight / 2),
                                  left: 0,
                                  right: 0,
                                  alignItems: 'center',
                                }}>
                                  <Text style={{
                                    fontSize: designTokens.typography.base,
                                    fontWeight: '700',
                                    color: '#FFFFFF',
                                  }}>
                                    {analytics.availableProperties}
                                  </Text>
                                  <Text style={{
                                    fontSize: designTokens.typography.xs,
                                    color: '#FFFFFF',
                                    opacity: 0.9,
                                  }}>
                                    Available ({Math.round(availablePercent)}%)
                                  </Text>
                                </View>
                              )}
                            </View>
                          </View>
                        </View>
                        
                        {/* Legend */}
                        <View style={{
                          flexDirection: 'row',
                          justifyContent: 'space-around',
                          marginBottom: designTokens.spacing.md,
                          flexWrap: 'wrap',
                          gap: designTokens.spacing.sm,
                        }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <View style={{ width: 16, height: 16, borderRadius: 4, backgroundColor: '#10B981', marginRight: designTokens.spacing.xs }} />
                            <Text style={{ fontSize: designTokens.typography.xs, color: designTokens.colors.textSecondary }}>
                              Available: {analytics.availableProperties}
                            </Text>
                          </View>
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <View style={{ width: 16, height: 16, borderRadius: 4, backgroundColor: '#3B82F6', marginRight: designTokens.spacing.xs }} />
                            <Text style={{ fontSize: designTokens.typography.xs, color: designTokens.colors.textSecondary }}>
                              Occupied: {analytics.occupiedProperties}
                            </Text>
                          </View>
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <View style={{ width: 16, height: 16, borderRadius: 4, backgroundColor: '#F59E0B', marginRight: designTokens.spacing.xs }} />
                            <Text style={{ fontSize: designTokens.typography.xs, color: designTokens.colors.textSecondary }}>
                              Reserved: {analytics.reservedProperties}
                            </Text>
                          </View>
                        </View>
                        
                        {/* Summary */}
                        <View style={{
                          paddingTop: designTokens.spacing.md,
                          borderTopWidth: 1,
                          borderTopColor: designTokens.colors.borderLight,
                        }}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text style={{
                              fontSize: designTokens.typography.base,
                              color: designTokens.colors.textSecondary,
                              fontWeight: '600',
                            }}>
                              Total Properties
                            </Text>
                            <Text style={{
                              fontSize: designTokens.typography.xl,
                              fontWeight: designTokens.typography.bold as any,
                              color: designTokens.colors.textPrimary,
                            }}>
                              {analytics.totalProperties}
                            </Text>
                          </View>
                        </View>
                      </View>
                    );
                  })()}
                </LinearGradient>
              </View>
            </View>

            {/* Property Types - Clean */}
            {Object.keys(analytics.propertyTypes).length > 0 && (
              <View style={{
                backgroundColor: designTokens.colors.white,
                borderRadius: 12,
                padding: designTokens.spacing.xl + designTokens.spacing.xs,
                marginBottom: designTokens.spacing.lg,
                marginHorizontal: designTokens.spacing.sm,
                borderWidth: 1,
                borderColor: designTokens.colors.borderLight,
              }}>
                <Text style={{
                  fontSize: designTokens.typography.lg,
                  fontWeight: designTokens.typography.bold as any,
                  color: designTokens.colors.textPrimary,
                  marginBottom: designTokens.spacing.lg,
                  letterSpacing: -0.3,
                }}>
                  Property Types Distribution
                </Text>

                <View style={{ gap: designTokens.spacing.md }}>
                  {Object.entries(analytics.propertyTypes).map(([type, count]) => {
                    // Normalize property type names for display
                    const normalizedType = type === 'Condo' ? 'Boarding House' : type;
                    return (
                    <View key={type} style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      paddingVertical: designTokens.spacing.sm,
                      paddingHorizontal: designTokens.spacing.sm,
                      backgroundColor: designTokens.colors.background,
                      borderRadius: 8,
                    }}>
                      <Text style={[sharedStyles.statLabel, { fontSize: designTokens.typography.sm }]}>{normalizedType}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: designTokens.spacing.xs }}>
                        <Text style={{
                          fontSize: designTokens.typography.base,
                          fontWeight: designTokens.typography.semibold as any,
                          color: '#8B5CF6',
                        }}>
                          {count}
                        </Text>
                        <Text style={{
                          fontSize: designTokens.typography.xs,
                          color: designTokens.colors.textSecondary,
                        }}>
                          ({analytics.totalProperties > 0 ? Math.round((count / analytics.totalProperties) * 100) : 0}%)
                        </Text>
                      </View>
                    </View>
                    );
                  })}
                </View>
              </View>
            )}

          {/* 4. BOOKING ANALYTICS - Clean Section */}
          <View style={{ marginBottom: designTokens.spacing['2xl'] }}>
            {/* Clean Section Header */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: designTokens.spacing.xl,
              paddingLeft: designTokens.spacing.sm,
            }}>
              <View style={{
                width: 4,
                height: 24,
                backgroundColor: '#8B5CF6',
                borderRadius: 2,
                marginRight: designTokens.spacing.md,
              }} />
              <Text style={{
                fontSize: designTokens.typography.xl,
                fontWeight: designTokens.typography.bold as any,
                color: designTokens.colors.textPrimary,
                letterSpacing: -0.3,
              }}>
                Booking Analytics
              </Text>
            </View>
            
            {/* Booking Status - Clean Card */}
            <View style={{
              backgroundColor: designTokens.colors.white,
              borderRadius: 12,
              padding: designTokens.spacing.xl + designTokens.spacing.xs,
              marginBottom: designTokens.spacing.lg,
              marginHorizontal: designTokens.spacing.sm,
              borderWidth: 1,
              borderColor: designTokens.colors.borderLight,
            }}>
              <Text style={{
                fontSize: designTokens.typography.lg,
                fontWeight: designTokens.typography.bold as any,
                color: designTokens.colors.textPrimary,
                marginBottom: designTokens.spacing.lg,
                letterSpacing: -0.3,
              }}>
                Booking Status Breakdown
              </Text>

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

            {/* Booking Trends - Clean Card */}
            <View style={{
              backgroundColor: designTokens.colors.white,
              borderRadius: 12,
              padding: designTokens.spacing.xl + designTokens.spacing.xs,
              marginBottom: designTokens.spacing.lg,
              borderWidth: 1,
              borderColor: designTokens.colors.borderLight,
            }}>
              <Text style={{
                fontSize: designTokens.typography.lg,
                fontWeight: designTokens.typography.bold as any,
                color: designTokens.colors.textPrimary,
                marginBottom: designTokens.spacing.lg,
                letterSpacing: -0.3,
              }}>
                Booking Trends
              </Text>

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

          {/* 5. ACTIVITY & ENGAGEMENT - Clean Section */}
          <View style={{ marginBottom: designTokens.spacing['2xl'] }}>
            {/* Clean Section Header */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: designTokens.spacing.xl,
              paddingLeft: designTokens.spacing.sm,
            }}>
              <View style={{
                width: 4,
                height: 24,
                backgroundColor: '#6366F1',
                borderRadius: 2,
                marginRight: designTokens.spacing.md,
              }} />
              <Text style={{
                fontSize: designTokens.typography.xl,
                fontWeight: designTokens.typography.bold as any,
                color: designTokens.colors.textPrimary,
                letterSpacing: -0.3,
              }}>
                Activity & Engagement
              </Text>
            </View>
            
            {/* Time Period Selector Button - Clean */}
            <TouchableOpacity
              onPress={() => setShowTimePeriodModal(true)}
              style={{
                backgroundColor: designTokens.colors.white,
                borderRadius: 12,
                padding: designTokens.spacing.lg + designTokens.spacing.xs,
                marginBottom: designTokens.spacing.lg,
                marginHorizontal: designTokens.spacing.sm,
                borderWidth: 1,
                borderColor: designTokens.colors.borderLight,
              }}
              activeOpacity={0.7}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View>
                  <Text style={{
                    fontSize: designTokens.typography.xs,
                    color: designTokens.colors.textSecondary,
                    marginBottom: designTokens.spacing.xs,
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                  }}>
                    Time Period
                  </Text>
                  <Text style={{
                    fontSize: designTokens.typography.base,
                    fontWeight: designTokens.typography.semibold as any,
                    color: designTokens.colors.textPrimary,
                    textTransform: 'capitalize',
                  }}>
                    {timePeriod === 'daily' ? 'Today' : timePeriod === 'weekly' ? 'Last 7 Days' : timePeriod === 'monthly' ? 'This Month' : 'This Year'}
                  </Text>
                </View>
                <Text style={{
                  fontSize: designTokens.typography.sm,
                  color: designTokens.colors.primary,
                  fontWeight: designTokens.typography.medium as any,
                }}>
                  Change →
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
            
            {/* Recent Activity - Organized Bar Graph */}
            <View style={{
              backgroundColor: designTokens.colors.white,
              borderRadius: 16,
              padding: designTokens.spacing.lg + designTokens.spacing.xs,
              marginBottom: designTokens.spacing.lg,
              marginHorizontal: designTokens.spacing.sm,
              borderWidth: 1,
              borderColor: designTokens.colors.borderLight,
              ...designTokens.shadows.md,
            }}>
              {/* Header */}
              <View style={{ 
                flexDirection: 'row', 
                alignItems: 'center', 
                marginBottom: designTokens.spacing.lg,
                paddingBottom: designTokens.spacing.md,
                borderBottomWidth: 1,
                borderBottomColor: designTokens.colors.borderLight,
              }}>
                <LinearGradient
                  colors={['#EF4444', '#DC2626'] as [string, string]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginRight: designTokens.spacing.sm,
                  }}
                >
                  <Activity size={20} color="white" />
                </LinearGradient>
                <View style={{ flex: 1 }}>
                  <Text style={{
                    fontSize: designTokens.typography.base,
                    fontWeight: designTokens.typography.bold as any,
                    color: designTokens.colors.textPrimary,
                  }}>
                    Recent Activity
                  </Text>
                  <Text style={{
                    fontSize: designTokens.typography.xs,
                    color: designTokens.colors.textSecondary,
                    marginTop: 2,
                  }}>
                    {timePeriod === 'daily' ? 'Today' : timePeriod === 'weekly' ? 'Last 7 Days' : timePeriod === 'monthly' ? 'This Month' : 'This Year'}
                  </Text>
                </View>
              </View>

              {/* Bar Graph - Compact Layout */}
              <View style={{
                backgroundColor: designTokens.colors.background,
                borderRadius: 12,
                padding: designTokens.spacing.md,
              }}>
                {(() => {
                  const activityItems = [
                    { label: 'New Bookings', value: activityData.newBookings, color: '#10B981', icon: Calendar },
                    { label: 'New Properties', value: activityData.newProperties, color: '#3B82F6', icon: Home },
                    { label: 'New Owners', value: activityData.newOwners, color: '#F59E0B', icon: Users },
                    { label: 'New Tenants', value: activityData.newTenants, color: '#EC4899', icon: Users },
                    { label: 'New Inquiries', value: activityData.newInquiries, color: '#8B5CF6', icon: MessageSquare },
                  ];
                  
                  const maxValue = Math.max(
                    ...activityItems.map(item => item.value),
                    1
                  );
                  const barHeight = 24;
                  const barSpacing = designTokens.spacing.sm;

                  return (
                    <View style={{ gap: barSpacing }}>
                      {activityItems.map((item) => {
                        const IconComponent = item.icon;
                        const barPercentage = maxValue > 0 ? (item.value / maxValue) * 100 : 0;

                        return (
                          <View key={item.label}>
                            {/* Compact Row: Icon, Label, Value, Bar */}
                            <View style={{ 
                              flexDirection: 'row', 
                              alignItems: 'center', 
                              gap: designTokens.spacing.sm,
                            }}>
                              {/* Icon */}
                              <View style={{
                                width: 24,
                                height: 24,
                                borderRadius: 12,
                                backgroundColor: item.color + '20',
                                justifyContent: 'center',
                                alignItems: 'center',
                                flexShrink: 0,
                              }}>
                                <IconComponent size={12} color={item.color} />
                              </View>
                              
                              {/* Label */}
                              <Text style={{
                                fontSize: designTokens.typography.xs,
                                fontWeight: designTokens.typography.medium as any,
                                color: designTokens.colors.textPrimary,
                                flex: 1,
                                minWidth: 0,
                              }} numberOfLines={1}>
                                {item.label}
                              </Text>
                              
                              {/* Value Badge */}
                              <View style={{
                                backgroundColor: item.color + '15',
                                paddingHorizontal: 6,
                                paddingVertical: 2,
                                borderRadius: 4,
                                minWidth: 32,
                                alignItems: 'center',
                              }}>
                                <Text style={{
                                  fontSize: designTokens.typography.xs,
                                  fontWeight: designTokens.typography.bold as any,
                                  color: item.color,
                                }}>
                                  {item.value}
                                </Text>
                              </View>
                            </View>
                            
                            {/* Compact Bar */}
                            <View style={{
                              marginTop: 4,
                              height: barHeight,
                              backgroundColor: '#F3F4F6',
                              borderRadius: 6,
                              overflow: 'hidden',
                            }}>
                              {item.value > 0 ? (
                                <LinearGradient
                                  colors={[item.color, item.color + 'DD'] as [string, string]}
                                  start={{ x: 0, y: 0 }}
                                  end={{ x: 1, y: 0 }}
                                  style={{
                                    height: '100%',
                                    width: `${Math.min(100, Math.max(0, barPercentage))}%`,
                                    borderRadius: 6,
                                  }}
                                />
                              ) : (
                                <View style={{
                                  height: '100%',
                                  width: '100%',
                                  justifyContent: 'center',
                                  alignItems: 'center',
                                }}>
                                  <Text style={{
                                    fontSize: 10,
                                    color: designTokens.colors.textMuted,
                                    fontStyle: 'italic',
                                  }}>
                                    No activity
                                  </Text>
                                </View>
                              )}
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  );
                })()}
              </View>
            </View>


            {/* Engagement Metrics - KPI Cards */}
            <View style={{ marginBottom: designTokens.spacing.lg }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: designTokens.spacing.md, paddingLeft: designTokens.spacing.sm }}>
                <View style={{
                  width: 4,
                  height: 20,
                  backgroundColor: '#8B5CF6',
                  borderRadius: 2,
                  marginRight: designTokens.spacing.sm,
                }} />
                <Text style={{
                  fontSize: designTokens.typography.base,
                  fontWeight: designTokens.typography.semibold as any,
                  color: designTokens.colors.textPrimary,
                }}>
                  Engagement Metrics
                </Text>
              </View>

              <View style={{
                flexDirection: 'row',
                gap: designTokens.spacing.md,
                flexWrap: 'wrap',
                marginHorizontal: designTokens.spacing.sm,
              }}>
                {/* Total Property Views KPI Card */}
                <View style={{
                  flex: 1,
                  minWidth: '30%',
                  backgroundColor: designTokens.colors.white,
                  borderRadius: 16,
                  padding: designTokens.spacing.lg + designTokens.spacing.xs,
                  borderWidth: 1,
                  borderColor: designTokens.colors.borderLight,
                  ...designTokens.shadows.sm,
                }}>
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: designTokens.spacing.sm,
                  }}>
                    <LinearGradient
                      colors={['#8B5CF6', '#7C3AED'] as [string, string]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 12,
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}
                    >
                      <Eye size={20} color="white" />
                    </LinearGradient>
                  </View>
                  <Text style={{
                    fontSize: designTokens.typography['2xl'],
                    fontWeight: designTokens.typography.bold as any,
                    color: designTokens.colors.textPrimary,
                    marginBottom: 4,
                  }}>
                    {analytics.totalViews.toLocaleString()}
                  </Text>
                  <Text style={{
                    fontSize: designTokens.typography.xs,
                    color: designTokens.colors.textSecondary,
                    fontWeight: designTokens.typography.medium as any,
                  }}>
                    Total Property Views
                  </Text>
                </View>

                {/* Average Views per Property KPI Card */}
                <View style={{
                  flex: 1,
                  minWidth: '30%',
                  backgroundColor: designTokens.colors.white,
                  borderRadius: 16,
                  padding: designTokens.spacing.lg + designTokens.spacing.xs,
                  borderWidth: 1,
                  borderColor: designTokens.colors.borderLight,
                  ...designTokens.shadows.sm,
                }}>
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: designTokens.spacing.sm,
                  }}>
                    <LinearGradient
                      colors={['#3B82F6', '#2563EB'] as [string, string]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 12,
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}
                    >
                      <BarChart3 size={20} color="white" />
                    </LinearGradient>
                  </View>
                  <Text style={{
                    fontSize: designTokens.typography['2xl'],
                    fontWeight: designTokens.typography.bold as any,
                    color: designTokens.colors.textPrimary,
                    marginBottom: 4,
                  }}>
                    {analytics.averageViewsPerProperty.toLocaleString()}
                  </Text>
                  <Text style={{
                    fontSize: designTokens.typography.xs,
                    color: designTokens.colors.textSecondary,
                    fontWeight: designTokens.typography.medium as any,
                  }}>
                    Avg Views per Property
                  </Text>
                </View>

                {/* Total Inquiries KPI Card */}
                <View style={{
                  flex: 1,
                  minWidth: '30%',
                  backgroundColor: designTokens.colors.white,
                  borderRadius: 16,
                  padding: designTokens.spacing.lg + designTokens.spacing.xs,
                  borderWidth: 1,
                  borderColor: designTokens.colors.borderLight,
                  ...designTokens.shadows.sm,
                }}>
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: designTokens.spacing.sm,
                  }}>
                    <LinearGradient
                      colors={['#10B981', '#059669'] as [string, string]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 12,
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}
                    >
                      <MessageSquare size={20} color="white" />
                    </LinearGradient>
                  </View>
                  <Text style={{
                    fontSize: designTokens.typography['2xl'],
                    fontWeight: designTokens.typography.bold as any,
                    color: designTokens.colors.textPrimary,
                    marginBottom: 4,
                  }}>
                    {analytics.totalInquiries.toLocaleString()}
                  </Text>
                  <Text style={{
                    fontSize: designTokens.typography.xs,
                    color: designTokens.colors.textSecondary,
                    fontWeight: designTokens.typography.medium as any,
                  }}>
                    Total Inquiries
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* 7. TOP PERFORMERS - Modern Redesign */}
          <View style={{ marginBottom: designTokens.spacing['2xl'] }}>
            {/* Section Header */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: designTokens.spacing.lg,
              paddingBottom: designTokens.spacing.md,
              paddingLeft: designTokens.spacing.sm,
              borderBottomWidth: 2,
              borderBottomColor: designTokens.colors.borderLight,
            }}>
              <View style={[sharedStyles.statIcon, iconBackgrounds.orange, { marginRight: designTokens.spacing.md }]}>
                <Award size={20} color="#F59E0B" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[sharedStyles.sectionTitle, { marginBottom: 0 }]}>Top Performers</Text>
                <Text style={{
                  fontSize: designTokens.typography.sm,
                  color: designTokens.colors.textSecondary,
                  marginTop: designTokens.spacing.xs,
                }}>
                  Leading owners and tenants in your barangay
                </Text>
              </View>
            </View>

            {/* Top Performing Owners - Premium Card */}
            {analytics.ownerAnalytics.topOwners.length > 0 && (
              <View style={{
                backgroundColor: designTokens.colors.white,
                borderRadius: 16,
                padding: designTokens.spacing.lg + designTokens.spacing.xs,
                marginBottom: designTokens.spacing.lg,
                marginHorizontal: designTokens.spacing.sm,
                borderWidth: 1,
                borderColor: designTokens.colors.borderLight,
                ...designTokens.shadows.md,
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: designTokens.spacing.lg }}>
                  <LinearGradient
                    colors={['#10B981', '#059669'] as [string, string]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      justifyContent: 'center',
                      alignItems: 'center',
                      marginRight: designTokens.spacing.sm,
                    }}
                  >
                    <Award size={20} color="white" />
                  </LinearGradient>
                  <View style={{ flex: 1 }}>
                    <Text style={{
                      fontSize: designTokens.typography.base,
                      fontWeight: designTokens.typography.bold as any,
                      color: designTokens.colors.textPrimary,
                    }}>
                      Top Performing Owners
                    </Text>
                    <Text style={{
                      fontSize: designTokens.typography.xs,
                      color: designTokens.colors.textSecondary,
                      marginTop: 2,
                    }}>
                      Ranked by property count
                    </Text>
                  </View>
                </View>

                <View style={{ gap: designTokens.spacing.sm }}>
                  {analytics.ownerAnalytics.topOwners.map((owner, index) => {
                    const isTopThree = index < 3;
                    const rankColors = [
                      { bg: '#FFD700', text: '#B8860B' }, // Gold
                      { bg: '#C0C0C0', text: '#808080' }, // Silver
                      { bg: '#CD7F32', text: '#8B4513' }, // Bronze
                    ];
                    const rankColor = isTopThree ? rankColors[index] : { bg: '#F3F4F6', text: '#6B7280' };

                    return (
                      <View key={owner.ownerId} style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        padding: designTokens.spacing.md,
                        backgroundColor: index === 0 ? '#F0FDF4' : index === 1 ? '#FFFBEB' : index === 2 ? '#FEF3C7' : designTokens.colors.background,
                        borderRadius: 12,
                        borderWidth: isTopThree ? 2 : 1,
                        borderColor: isTopThree ? rankColor.bg : designTokens.colors.borderLight,
                        ...(isTopThree ? designTokens.shadows.sm : {}),
                      }}>
                        {/* Rank Badge */}
                        <View style={{
                          width: 40,
                          height: 40,
                          borderRadius: 20,
                          backgroundColor: rankColor.bg,
                          justifyContent: 'center',
                          alignItems: 'center',
                          marginRight: designTokens.spacing.md,
                          borderWidth: isTopThree ? 2 : 0,
                          borderColor: rankColor.text,
                        }}>
                          {isTopThree ? (
                            <Award size={18} color={rankColor.text} />
                          ) : (
                            <Text style={{
                              fontSize: designTokens.typography.base,
                              fontWeight: designTokens.typography.bold as any,
                              color: rankColor.text,
                            }}>
                              {index + 1}
                            </Text>
                          )}
                        </View>

                        {/* Owner Info */}
                        <View style={{ flex: 1, marginRight: designTokens.spacing.sm }}>
                          <Text style={{
                            fontSize: designTokens.typography.base,
                            fontWeight: designTokens.typography.semibold as any,
                            color: designTokens.colors.textPrimary,
                            marginBottom: designTokens.spacing.xs,
                          }} numberOfLines={1}>
                            {owner.ownerName}
                          </Text>
                          <View style={{
                            backgroundColor: designTokens.colors.primary + '15',
                            paddingHorizontal: 8,
                            paddingVertical: 4,
                            borderRadius: 6,
                            alignSelf: 'flex-start',
                          }}>
                            <Text style={{
                              fontSize: designTokens.typography.xs,
                              fontWeight: designTokens.typography.medium as any,
                              color: designTokens.colors.primary,
                            }}>
                              {owner.propertyCount} {owner.propertyCount === 1 ? 'property' : 'properties'}
                            </Text>
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Most Active Owners - Premium Card */}
            {analytics.relationshipAnalytics.mostActiveOwners.length > 0 && (
              <View style={{
                backgroundColor: designTokens.colors.white,
                borderRadius: 16,
                padding: designTokens.spacing.lg + designTokens.spacing.xs,
                marginBottom: designTokens.spacing.lg,
                marginHorizontal: designTokens.spacing.sm,
                borderWidth: 1,
                borderColor: designTokens.colors.borderLight,
                ...designTokens.shadows.md,
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: designTokens.spacing.lg }}>
                  <LinearGradient
                    colors={['#3B82F6', '#2563EB'] as [string, string]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      justifyContent: 'center',
                      alignItems: 'center',
                      marginRight: designTokens.spacing.sm,
                    }}
                  >
                    <TrendingUp size={20} color="white" />
                  </LinearGradient>
                  <View style={{ flex: 1 }}>
                    <Text style={{
                      fontSize: designTokens.typography.base,
                      fontWeight: designTokens.typography.bold as any,
                      color: designTokens.colors.textPrimary,
                    }}>
                      Most Active Owners
                    </Text>
                    <Text style={{
                      fontSize: designTokens.typography.xs,
                      color: designTokens.colors.textSecondary,
                      marginTop: 2,
                    }}>
                      Ranked by booking activity
                    </Text>
                  </View>
                </View>

                <View style={{ gap: designTokens.spacing.sm }}>
                  {analytics.relationshipAnalytics.mostActiveOwners.map((owner, index) => {
                    const maxBookings = analytics.relationshipAnalytics.mostActiveOwners[0]?.bookingCount || 1;
                    const bookingPercentage = (owner.bookingCount / maxBookings) * 100;

                    return (
                      <View key={owner.ownerId} style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        padding: designTokens.spacing.md,
                        backgroundColor: designTokens.colors.background,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: designTokens.colors.borderLight,
                      }}>
                        {/* Rank Number */}
                        <View style={{
                          width: 36,
                          height: 36,
                          borderRadius: 18,
                          backgroundColor: '#3B82F6' + '20',
                          justifyContent: 'center',
                          alignItems: 'center',
                          marginRight: designTokens.spacing.md,
                        }}>
                          <Text style={{
                            fontSize: designTokens.typography.base,
                            fontWeight: designTokens.typography.bold as any,
                            color: '#3B82F6',
                          }}>
                            {index + 1}
                          </Text>
                        </View>

                        {/* Owner Info */}
                        <View style={{ flex: 1, marginRight: designTokens.spacing.sm }}>
                          <Text style={{
                            fontSize: designTokens.typography.base,
                            fontWeight: designTokens.typography.semibold as any,
                            color: designTokens.colors.textPrimary,
                            marginBottom: designTokens.spacing.xs,
                          }} numberOfLines={1}>
                            {owner.ownerName}
                          </Text>
                          <View style={{
                            backgroundColor: '#3B82F6' + '15',
                            paddingHorizontal: 8,
                            paddingVertical: 4,
                            borderRadius: 6,
                            alignSelf: 'flex-start',
                          }}>
                            <Text style={{
                              fontSize: designTokens.typography.xs,
                              fontWeight: designTokens.typography.medium as any,
                              color: '#3B82F6',
                            }}>
                              {owner.propertyCount || 0} {owner.propertyCount === 1 ? 'property' : 'properties'}
                            </Text>
                          </View>
                          {/* Activity Progress Bar */}
                          <View style={{ marginTop: designTokens.spacing.xs }}>
                            <ProgressBar 
                              percentage={bookingPercentage} 
                              color="#3B82F6" 
                              height={4} 
                            />
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Most Active Tenants - Premium Card */}
            {analytics.relationshipAnalytics.mostActiveTenants.length > 0 && (
              <View style={{
                backgroundColor: designTokens.colors.white,
                borderRadius: 16,
                padding: designTokens.spacing.lg + designTokens.spacing.xs,
                marginBottom: designTokens.spacing.lg,
                borderWidth: 1,
                borderColor: designTokens.colors.borderLight,
                ...designTokens.shadows.md,
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: designTokens.spacing.lg }}>
                  <LinearGradient
                    colors={['#8B5CF6', '#7C3AED'] as [string, string]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      justifyContent: 'center',
                      alignItems: 'center',
                      marginRight: designTokens.spacing.sm,
                    }}
                  >
                    <Users size={20} color="white" />
                  </LinearGradient>
                  <View style={{ flex: 1 }}>
                    <Text style={{
                      fontSize: designTokens.typography.base,
                      fontWeight: designTokens.typography.bold as any,
                      color: designTokens.colors.textPrimary,
                    }}>
                      Most Active Tenants
                    </Text>
                    <Text style={{
                      fontSize: designTokens.typography.xs,
                      color: designTokens.colors.textSecondary,
                      marginTop: 2,
                    }}>
                      Ranked by booking frequency
                    </Text>
                  </View>
                </View>

                <View style={{ gap: designTokens.spacing.sm }}>
                  {analytics.relationshipAnalytics.mostActiveTenants.map((tenant, index) => {
                    const maxBookings = analytics.relationshipAnalytics.mostActiveTenants[0]?.bookingCount || 1;
                    const bookingPercentage = (tenant.bookingCount / maxBookings) * 100;

                    return (
                      <View key={tenant.tenantId} style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        padding: designTokens.spacing.md,
                        backgroundColor: designTokens.colors.background,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: designTokens.colors.borderLight,
                      }}>
                        {/* Rank Number */}
                        <View style={{
                          width: 36,
                          height: 36,
                          borderRadius: 18,
                          backgroundColor: '#8B5CF6' + '20',
                          justifyContent: 'center',
                          alignItems: 'center',
                          marginRight: designTokens.spacing.md,
                        }}>
                          <Text style={{
                            fontSize: designTokens.typography.base,
                            fontWeight: designTokens.typography.bold as any,
                            color: '#8B5CF6',
                          }}>
                            {index + 1}
                          </Text>
                        </View>

                        {/* Tenant Info */}
                        <View style={{ flex: 1, marginRight: designTokens.spacing.sm }}>
                          <Text style={{
                            fontSize: designTokens.typography.base,
                            fontWeight: designTokens.typography.semibold as any,
                            color: designTokens.colors.textPrimary,
                            marginBottom: designTokens.spacing.xs,
                          }} numberOfLines={1}>
                            {tenant.tenantName}
                          </Text>
                          {/* Activity Progress Bar */}
                          <View style={{ marginTop: designTokens.spacing.xs }}>
                            <ProgressBar 
                              percentage={bookingPercentage} 
                              color="#8B5CF6" 
                              height={4} 
                            />
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}
          </View>

          {/* 8. PROPERTY TRENDS & RELATIONSHIPS */}
          <View style={{ marginBottom: designTokens.spacing['2xl'] }}>
            {/* Section Header */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: designTokens.spacing.lg,
              paddingBottom: designTokens.spacing.md,
              paddingLeft: designTokens.spacing.sm,
              borderBottomWidth: 2,
              borderBottomColor: designTokens.colors.borderLight,
            }}>
              <View style={[sharedStyles.statIcon, iconBackgrounds.purple, { marginRight: designTokens.spacing.md }]}>
                <BarChart3 size={20} color="#8B5CF6" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[sharedStyles.sectionTitle, { marginBottom: 0 }]}>Property Trends & Relationships</Text>
                <Text style={{
                  fontSize: designTokens.typography.sm,
                  color: designTokens.colors.textSecondary,
                  marginTop: designTokens.spacing.xs,
                }}>
                  Property distribution and tenant-owner connections
                </Text>
              </View>
            </View>

            {/* Popular Property Types - Bar Graph */}
            {analytics.marketAnalytics.popularPropertyTypes.length > 0 && (() => {
              // Prepare chart data
              const propertyTypeColors = ['#6366F1', '#0EA5E9', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#EC4899'];
              const chartSeries = analytics.marketAnalytics.popularPropertyTypes.map((type, index) => ({
                label: type.type === 'Condo' ? 'Boarding House' : type.type,
                value: type.count,
                color: propertyTypeColors[index % propertyTypeColors.length],
              }));
              const chartMax = Math.max(...chartSeries.map(s => s.value), 1);
              const chartHeight = 120;
              const totalProperties = chartSeries.reduce((sum, series) => sum + series.value, 0);
              const chartSeriesWithDetails = chartSeries.map(series => ({
                ...series,
                percentage: totalProperties > 0 ? Math.round((series.value / totalProperties) * 100) : 0,
              }));

              return (
                <View style={{
                  backgroundColor: designTokens.colors.white,
                  borderRadius: 16,
                  padding: designTokens.spacing.lg + designTokens.spacing.xs,
                  marginBottom: designTokens.spacing.lg,
                  marginHorizontal: designTokens.spacing.sm,
                  borderWidth: 1,
                  borderColor: designTokens.colors.borderLight,
                  ...designTokens.shadows.md,
                }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: designTokens.spacing.lg }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{
                        fontSize: designTokens.typography.base,
                        fontWeight: designTokens.typography.bold as any,
                        color: designTokens.colors.textPrimary,
                      }}>
                        Popular Property Types
                      </Text>
                      <Text style={{
                        fontSize: designTokens.typography.xs,
                        color: designTokens.colors.textSecondary,
                        marginTop: 2,
                      }}>
                        Distribution by property type
                      </Text>
                    </View>
                    <View style={{
                      backgroundColor: designTokens.colors.primary + '15',
                      borderRadius: designTokens.borderRadius.md,
                      paddingHorizontal: designTokens.spacing.md,
                      paddingVertical: designTokens.spacing.xs,
                    }}>
                      <Text style={{
                        fontSize: designTokens.typography.sm,
                        fontWeight: '600',
                        color: designTokens.colors.primary,
                      }}>
                        Total: {totalProperties}
                      </Text>
                    </View>
                  </View>
                  
                  {/* Chart Visualization */}
                  <View style={{ overflow: 'hidden' }}>
                    <LinearGradient
                      colors={['#EEF2FF', '#F5F3FF'] as [string, string]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={{
                        borderRadius: 12,
                        padding: designTokens.spacing.lg + designTokens.spacing.xs,
                        overflow: 'hidden',
                      }}
                    >
                      <View style={{
                        flexDirection: 'row',
                        alignItems: 'flex-end',
                        justifyContent: 'space-between',
                        minHeight: 200,
                        maxHeight: 200,
                        gap: designTokens.spacing.md,
                        paddingHorizontal: designTokens.spacing.xs,
                      }}>
                        {chartSeriesWithDetails.map((series) => {
                          // Reserve space for labels above (value + percentage) and below (label)
                          const labelSpaceAbove = 50;
                          const labelSpaceBelow = 30;
                          const availableHeight = chartHeight - labelSpaceAbove - labelSpaceBelow;
                          const computedHeight = Math.max(8, Math.min(availableHeight, (series.value / chartMax) * availableHeight));
                          
                          return (
                            <View key={series.label} style={{
                              flex: 1,
                              alignItems: 'center',
                              justifyContent: 'flex-end',
                              maxWidth: `${100 / chartSeries.length}%`,
                              height: '100%',
                            }}>
                              <View style={{ 
                                alignItems: 'center', 
                                marginBottom: designTokens.spacing.xs,
                                height: labelSpaceAbove,
                                justifyContent: 'flex-end',
                              }}>
                                <Text style={{
                                  fontSize: designTokens.typography.sm,
                                  fontWeight: '700',
                                  color: series.color,
                                  marginBottom: 2,
                                }}>
                                  {series.value}
                                </Text>
                                <Text style={{
                                  fontSize: designTokens.typography.xs,
                                  color: designTokens.colors.textMuted,
                                }}>
                                  {series.percentage}%
                                </Text>
                              </View>
                              <View style={{ 
                                width: '100%',
                                maxWidth: 40,
                                minWidth: 24,
                                height: computedHeight, 
                                backgroundColor: series.color,
                                maxHeight: availableHeight,
                                borderRadius: 8,
                                alignSelf: 'center',
                              }} />
                              <View style={{ 
                                height: labelSpaceBelow,
                                justifyContent: 'flex-start',
                                paddingTop: designTokens.spacing.xs,
                              }}>
                                <Text style={{
                                  marginTop: designTokens.spacing.sm,
                                  fontSize: designTokens.typography.xs,
                                  color: designTokens.colors.textSecondary,
                                  textAlign: 'center',
                                }}>
                                  {series.label}
                                </Text>
                              </View>
                            </View>
                          );
                        })}
                      </View>
                    </LinearGradient>
                  </View>
                </View>
              );
            })()}

            {/* Tenant-Owner Relationships - Premium Card */}
            <View style={{
              backgroundColor: designTokens.colors.white,
              borderRadius: 16,
              padding: designTokens.spacing.lg + designTokens.spacing.xs,
              marginBottom: designTokens.spacing.lg,
              marginHorizontal: designTokens.spacing.sm,
              borderWidth: 1,
              borderColor: designTokens.colors.borderLight,
              ...designTokens.shadows.md,
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: designTokens.spacing.lg }}>
                <LinearGradient
                  colors={['#6366F1', '#4F46E5'] as [string, string]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginRight: designTokens.spacing.sm,
                  }}
                >
                  <Target size={20} color="white" />
                </LinearGradient>
                <View style={{ flex: 1 }}>
                  <Text style={{
                    fontSize: designTokens.typography.base,
                    fontWeight: designTokens.typography.bold as any,
                    color: designTokens.colors.textPrimary,
                  }}>
                    Tenant-Owner Relationships
                  </Text>
                  <Text style={{
                    fontSize: designTokens.typography.xs,
                    color: designTokens.colors.textSecondary,
                    marginTop: 2,
                  }}>
                    Engagement and conversion metrics
                  </Text>
                </View>
              </View>

              <View style={{ gap: designTokens.spacing.md }}>
                {/* Avg Bookings per Owner */}
                <View style={{
                  padding: designTokens.spacing.md,
                  backgroundColor: '#EFF6FF',
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: '#3B82F6' + '30',
                }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: designTokens.spacing.sm }}>
                      <View style={{
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: '#3B82F6',
                      }} />
                      <Text style={{
                        fontSize: designTokens.typography.sm,
                        fontWeight: designTokens.typography.medium as any,
                        color: designTokens.colors.textSecondary,
                      }}>
                        Avg Bookings per Owner
                      </Text>
                    </View>
                    <Text style={{
                      fontSize: designTokens.typography.xl,
                      fontWeight: designTokens.typography.bold as any,
                      color: '#3B82F6',
                    }}>
                      {analytics.relationshipAnalytics.averageBookingsPerOwner.toFixed(1)}
                    </Text>
                  </View>
                </View>

                {/* Avg Bookings per Tenant */}
                <View style={{
                  padding: designTokens.spacing.md,
                  backgroundColor: '#F0FDF4',
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: '#10B981' + '30',
                }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: designTokens.spacing.sm }}>
                      <View style={{
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: '#10B981',
                      }} />
                      <Text style={{
                        fontSize: designTokens.typography.sm,
                        fontWeight: designTokens.typography.medium as any,
                        color: designTokens.colors.textSecondary,
                      }}>
                        Avg Bookings per Tenant
                      </Text>
                    </View>
                    <Text style={{
                      fontSize: designTokens.typography.xl,
                      fontWeight: designTokens.typography.bold as any,
                      color: '#10B981',
                    }}>
                      {analytics.relationshipAnalytics.averageBookingsPerTenant.toFixed(1)}
                    </Text>
                  </View>
                </View>

                {/* Conversion Rate */}
                <View style={{
                  padding: designTokens.spacing.md,
                  backgroundColor: '#FFFBEB',
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: '#F59E0B' + '30',
                }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: designTokens.spacing.xs }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: designTokens.spacing.sm }}>
                      <View style={{
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: '#F59E0B',
                      }} />
                      <Text style={{
                        fontSize: designTokens.typography.sm,
                        fontWeight: designTokens.typography.medium as any,
                        color: designTokens.colors.textSecondary,
                      }}>
                        Conversion Rate
                      </Text>
                    </View>
                    <Text style={{
                      fontSize: designTokens.typography.xl,
                      fontWeight: designTokens.typography.bold as any,
                      color: '#F59E0B',
                    }}>
                      {analytics.relationshipAnalytics.conversionRate}%
                    </Text>
                  </View>
                  <ProgressBar 
                    percentage={analytics.relationshipAnalytics.conversionRate} 
                    color="#F59E0B" 
                    height={6} 
                  />
                </View>
              </View>
            </View>
          </View>

          {/* Action Buttons - Modern Design */}
          {/* Compact Action Buttons */}
          <View style={{ 
            flexDirection: 'row', 
            gap: designTokens.spacing.sm, 
            marginTop: designTokens.spacing.lg,
            marginBottom: designTokens.spacing.lg,
            justifyContent: 'flex-end',
            alignItems: 'center',
          }}>
            {/* Refresh Button */}
            <TouchableOpacity
              onPress={loadAnalytics}
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                backgroundColor: designTokens.colors.white,
                borderWidth: 1.5,
                borderColor: designTokens.colors.borderLight,
                justifyContent: 'center',
                alignItems: 'center',
                ...designTokens.shadows.sm,
              }}
              activeOpacity={0.7}
            >
              <RefreshCw size={20} color={designTokens.colors.primary} />
            </TouchableOpacity>
            
            {/* Download Button */}
            <TouchableOpacity
              onPress={() => setShowExportModal(true)}
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                backgroundColor: designTokens.colors.primary,
                justifyContent: 'center',
                alignItems: 'center',
                ...designTokens.shadows.sm,
              }}
              activeOpacity={0.8}
            >
              <Download size={20} color="white" />
            </TouchableOpacity>
            
            {/* Print Button */}
            <TouchableOpacity
              onPress={handlePrint}
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                backgroundColor: '#8B5CF6',
                justifyContent: 'center',
                alignItems: 'center',
                ...designTokens.shadows.sm,
              }}
              activeOpacity={0.8}
            >
              <Printer size={20} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Export Modal - Modern Design */}
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
              backgroundColor: designTokens.colors.white,
              borderRadius: 20,
              padding: designTokens.spacing.xl,
              width: '100%',
              maxWidth: 420,
              ...designTokens.shadows.lg,
            }}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <View style={{ marginBottom: designTokens.spacing.lg }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: designTokens.spacing.sm }}>
                <LinearGradient
                  colors={[designTokens.colors.primary, '#2563EB'] as [string, string]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginRight: designTokens.spacing.md,
                  }}
                >
                  <Download size={24} color="white" />
                </LinearGradient>
                <View style={{ flex: 1 }}>
                  <Text style={{
                    fontSize: designTokens.typography.xl,
                    fontWeight: designTokens.typography.bold as any,
                    color: designTokens.colors.textPrimary,
                    marginBottom: 4,
                  }}>
                    Export Analytics
                  </Text>
                  <Text style={{
                    fontSize: designTokens.typography.sm,
                    color: designTokens.colors.textSecondary,
                  }}>
                    Choose export format
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setShowExportModal(false)}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: designTokens.colors.background,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={{ fontSize: 20, color: designTokens.colors.textMuted, fontWeight: '300' }}>×</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Export Options */}
            <View style={{ gap: designTokens.spacing.md }}>
              <TouchableOpacity
                onPress={() => handleExport('all')}
                disabled={exporting}
                style={{
                  padding: designTokens.spacing.lg,
                  backgroundColor: designTokens.colors.primary + '10',
                  borderRadius: 12,
                  borderWidth: 2,
                  borderColor: designTokens.colors.primary,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: designTokens.spacing.md,
                }}
                activeOpacity={0.7}
              >
                <View style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: designTokens.colors.primary,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}>
                  <FileDown size={20} color="white" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{
                    fontSize: designTokens.typography.base,
                    fontWeight: designTokens.typography.semibold as any,
                    color: designTokens.colors.textPrimary,
                    marginBottom: 2,
                  }}>
                    All Formats
                  </Text>
                  <Text style={{
                    fontSize: designTokens.typography.xs,
                    color: designTokens.colors.textSecondary,
                  }}>
                    Summary, CSV, and JSON files
                  </Text>
                </View>
                {exporting && <ActivityIndicator size="small" color={designTokens.colors.primary} />}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleExport('summary')}
                disabled={exporting}
                style={{
                  padding: designTokens.spacing.lg,
                  backgroundColor: designTokens.colors.background,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: designTokens.colors.borderLight,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: designTokens.spacing.md,
                }}
                activeOpacity={0.7}
              >
                <View style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: '#10B981' + '20',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}>
                  <FileText size={20} color="#10B981" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{
                    fontSize: designTokens.typography.base,
                    fontWeight: designTokens.typography.semibold as any,
                    color: designTokens.colors.textPrimary,
                    marginBottom: 2,
                  }}>
                    Summary (TXT)
                  </Text>
                  <Text style={{
                    fontSize: designTokens.typography.xs,
                    color: designTokens.colors.textSecondary,
                  }}>
                    Text summary report
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleExport('csv')}
                disabled={exporting}
                style={{
                  padding: designTokens.spacing.lg,
                  backgroundColor: designTokens.colors.background,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: designTokens.colors.borderLight,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: designTokens.spacing.md,
                }}
                activeOpacity={0.7}
              >
                <View style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: '#3B82F6' + '20',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}>
                  <BarChart3 size={20} color="#3B82F6" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{
                    fontSize: designTokens.typography.base,
                    fontWeight: designTokens.typography.semibold as any,
                    color: designTokens.colors.textPrimary,
                    marginBottom: 2,
                  }}>
                    CSV Data
                  </Text>
                  <Text style={{
                    fontSize: designTokens.typography.xs,
                    color: designTokens.colors.textSecondary,
                  }}>
                    Spreadsheet format
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleExport('json')}
                disabled={exporting}
                style={{
                  padding: designTokens.spacing.lg,
                  backgroundColor: designTokens.colors.background,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: designTokens.colors.borderLight,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: designTokens.spacing.md,
                }}
                activeOpacity={0.7}
              >
                <View style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: '#8B5CF6' + '20',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}>
                  <FileText size={20} color="#8B5CF6" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{
                    fontSize: designTokens.typography.base,
                    fontWeight: designTokens.typography.semibold as any,
                    color: designTokens.colors.textPrimary,
                    marginBottom: 2,
                  }}>
                    JSON Data
                  </Text>
                  <Text style={{
                    fontSize: designTokens.typography.xs,
                    color: designTokens.colors.textSecondary,
                  }}>
                    Structured data format
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Cancel Button */}
            <TouchableOpacity
              onPress={() => setShowExportModal(false)}
              style={{
                marginTop: designTokens.spacing.lg,
                paddingVertical: designTokens.spacing.md,
                paddingHorizontal: designTokens.spacing.lg,
                borderRadius: 12,
                backgroundColor: designTokens.colors.background,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: designTokens.colors.borderLight,
              }}
              activeOpacity={0.7}
            >
              <Text style={{
                fontSize: designTokens.typography.base,
                fontWeight: designTokens.typography.semibold as any,
                color: designTokens.colors.textSecondary,
              }}>
                Cancel
              </Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
