import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, Modal, Platform, Alert, TextInput, KeyboardAvoidingView, Dimensions, FlatList, Linking, Image as RNImage } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { VideoView, useVideoPlayer } from 'expo-video';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { 
  getOwnerDashboardStats,
  getOwnerListings,
  getOwnerMessages,
  type OwnerDashboardStats,
  type OwnerListing,
  type OwnerMessage
} from '../../utils/owner-dashboard';
import { getBookingsByOwner, updateBookingStatus } from '@/utils/booking';
import { BookingRecord, MaintenanceRequestRecord } from '@/types';
import {
  getMaintenanceRequestsByOwner,
  getPendingMaintenanceRequestsCountForOwner,
  updateMaintenanceRequestStatus,
} from '../../utils/maintenance-requests';
import { 
  Home, 
  List, 
  Calendar, 
  MessageSquare,
  LogOut,
  Plus,
  Eye,
  User,
  Bell,
  Settings,
  ChevronRight,
  Users,
  Sparkles,
  Coins,
  Clock,
  CheckCircle,
  AlertCircle,
  CreditCard,
  TrendingUp,
  BarChart3,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  Download,
  X,
  Star,
  Wrench,
  Video
} from 'lucide-react-native';
import { ScrollView as RNScrollView } from 'react-native';
import { sharedStyles, designTokens, iconBackgrounds } from '../../styles/owner-dashboard-styles';
import { showAlert } from '../../utils/alert';
import { Image } from '../../components/ui/image';
import TenantInfoModal from '../../components/TenantInfoModal';
import { isOwnerApproved, hasPendingOwnerApplication, getOwnerApplication, getBarangayOfficialContact } from '../../utils/owner-approval';
import { addCustomEventListener } from '../../utils/custom-events';
import { getMonthlyRevenueOverview, type MonthlyRevenueOverview } from '../../utils/owner-revenue';
import { getTotalActiveTenants } from '../../utils/tenant-management';
import { exportOwnerAnalytics } from '../../utils/owner-analytics-export';
import type { TimePeriod } from '../../utils/owner-analytics';
import { autoDeleteOldRejectedPayments } from '../../utils/owner-payment-confirmation';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import * as ImagePicker from 'expo-image-picker';
import { loadUserProfilePhoto, saveUserProfilePhoto } from '../../utils/user-profile-photos';

// Types are now imported from owner-dashboard.ts

// Simple Date Picker Component
const SimpleDatePicker = ({ 
  selectedDate, 
  onDateSelect 
}: { 
  selectedDate: Date; 
  onDateSelect: (date: Date) => void; 
}) => {
  const [viewMonth, setViewMonth] = useState(selectedDate.getMonth());
  const [viewYear, setViewYear] = useState(selectedDate.getFullYear());
  
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  const firstDay = new Date(viewYear, viewMonth, 1);
  const lastDay = new Date(viewYear, viewMonth + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay();
  
  const calendarDays = [];
  for (let i = 0; i < startingDayOfWeek; i++) {
    calendarDays.push(null);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(new Date(viewYear, viewMonth, day));
  }
  
  const goToPreviousMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };
  
  const goToNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };
  
  const isSelected = (date: Date) => {
    return date.toDateString() === selectedDate.toDateString();
  };
  
  return (
    <View>
      {/* Month/Year Header */}
      <View style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: designTokens.spacing.md,
      }}>
        <TouchableOpacity onPress={goToPreviousMonth} activeOpacity={0.7}>
          <ChevronRight size={24} color={designTokens.colors.textPrimary} style={{ transform: [{ rotate: '180deg' }] }} />
        </TouchableOpacity>
        <Text style={[sharedStyles.statLabel, { fontSize: designTokens.typography.lg }]}>
          {months[viewMonth]} {viewYear}
        </Text>
        <TouchableOpacity onPress={goToNextMonth} activeOpacity={0.7}>
          <ChevronRight size={24} color={designTokens.colors.textPrimary} />
        </TouchableOpacity>
      </View>
      
      {/* Week Days Header */}
      <View style={{
        flexDirection: 'row',
        marginBottom: designTokens.spacing.sm,
      }}>
        {weekDays.map((day) => (
          <View key={day} style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{
              fontSize: designTokens.typography.xs,
              color: designTokens.colors.textMuted,
              fontWeight: '600',
            }}>
              {day}
            </Text>
          </View>
        ))}
      </View>
      
      {/* Calendar Grid */}
      <View style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
      }}>
        {calendarDays.map((date, index) => {
          if (!date) {
            return <View key={index} style={{ width: '14.28%', aspectRatio: 1 }} />;
          }
          
          const selected = isSelected(date);
          
          return (
            <TouchableOpacity
              key={index}
              onPress={() => onDateSelect(date)}
              style={{
                width: '14.28%',
                aspectRatio: 1,
                justifyContent: 'center',
                alignItems: 'center',
                borderRadius: 8,
                backgroundColor: selected ? designTokens.colors.primary : 'transparent',
                margin: 2,
              }}
              activeOpacity={0.7}
            >
              <Text style={{
                fontSize: designTokens.typography.sm,
                color: selected ? '#FFFFFF' : designTokens.colors.textPrimary,
                fontWeight: selected ? '600' : '400',
              }}>
                {date.getDate()}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

export default function OwnerDashboard() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<OwnerDashboardStats>({
    totalListings: 0,
    totalViews: 0,
    monthlyRevenue: 0,
    totalBookings: 0
  });
  const [listings, setListings] = useState<OwnerListing[]>([]);
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [messages, setMessages] = useState<OwnerMessage[]>([]);
  const [pendingBookingsCount, setPendingBookingsCount] = useState(0);
  const [totalTenants, setTotalTenants] = useState(0);
  const [monthlyRevenueOverview, setMonthlyRevenueOverview] = useState<MonthlyRevenueOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<{
    id: string;
    name: string;
    email?: string;
    phone?: string;
    avatar?: string;
  } | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [downloadModalVisible, setDownloadModalVisible] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod | 'custom'>('monthly');
  const [customStartDate, setCustomStartDate] = useState<Date | null>(null);
  const [customEndDate, setCustomEndDate] = useState<Date | null>(null);
  const [exporting, setExporting] = useState(false);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [profilePhotoError, setProfilePhotoError] = useState(false);
  const [showProfilePhotoModal, setShowProfilePhotoModal] = useState(false);
  const [savingPhoto, setSavingPhoto] = useState(false);
  const [maintenanceRequests, setMaintenanceRequests] = useState<MaintenanceRequestRecord[]>([]);
  const [pendingMaintenanceCount, setPendingMaintenanceCount] = useState(0);
  const [selectedMaintenanceRequest, setSelectedMaintenanceRequest] = useState<MaintenanceRequestRecord | null>(null);
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [updatingMaintenanceStatus, setUpdatingMaintenanceStatus] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const [selectedVideoIndex, setSelectedVideoIndex] = useState<number | null>(null);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [isPhotoModalClosing, setIsPhotoModalClosing] = useState(false);
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [applicationModalData, setApplicationModalData] = useState<{
    title: string;
    message: string;
    brgyContact: { name: string; email: string; phone: string; logo?: string | null } | null;
    barangay?: string;
  } | null>(null);

  // Define loadProfilePhoto before it's used
  const loadProfilePhoto = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      const photoUri = await loadUserProfilePhoto(user.id);
      if (photoUri && photoUri.trim() && photoUri.length > 10) {
        setProfilePhoto(photoUri.trim());
        setProfilePhotoError(false);
      } else {
        setProfilePhoto(null);
      }
    } catch (error) {
      console.error('❌ Error loading profile photo:', error);
      setProfilePhoto(null);
    }
  }, [user?.id]);

  // Load profile photo on mount and when user changes
  useEffect(() => {
    if (user?.id) {
      loadProfilePhoto();
    }
  }, [user?.id, loadProfilePhoto]);

  // Reload profile photo when modal closes
  useEffect(() => {
    if (!showProfilePhotoModal && user?.id) {
      // Small delay to ensure any photo changes are saved
      const timer = setTimeout(() => {
        loadProfilePhoto();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [showProfilePhotoModal, user?.id, loadProfilePhoto]);

  // Check authentication and approval status
  useEffect(() => {
    const checkAccess = async () => {
      if (!user) {
        router.replace('/login');
        return;
      }

      if (!user.roles?.includes('owner')) {
        showAlert('Access Denied', 'This dashboard is for property owners only.');
        router.replace('/(tabs)');
        return;
      }

      // Check if owner application is approved - parallelize checks for faster loading
      try {
        // Parallelize approval checks and application fetch
        const [isApproved, hasPending, application] = await Promise.all([
          isOwnerApproved(user.id),
          hasPendingOwnerApplication(user.id),
          getOwnerApplication(user.id)
        ]);
        
        if (!isApproved) {
          const barangay = application?.barangay || '';
          
          // Get Barangay official contact info (can be done in parallel with modal setup)
          const brgyContactPromise = barangay ? getBarangayOfficialContact(barangay) : Promise.resolve(null);
          
          if (hasPending) {
            // Build message with contact info
            let message = 'Your Owner Application is still under review.\n\nYou will be notified once it is approved.';
            
            // Wait for contact info before showing modal
            const brgyContact = await brgyContactPromise;
            
            setApplicationModalData({
              title: 'Application Pending',
              message: message,
              brgyContact: brgyContact,
              barangay: barangay
            });
            setShowApplicationModal(true);
          } else {
            // Build message with contact info
            let message = 'Your owner application has not been approved yet. Please contact your Barangay official for assistance.';
            
            // Wait for contact info before showing modal
            const brgyContact = await brgyContactPromise;
            
            setApplicationModalData({
              title: 'Access Denied',
              message: message,
              brgyContact: brgyContact,
              barangay: barangay
            });
            setShowApplicationModal(true);
          }
          return;
        }
        
        // If approved, load dashboard data and profile photo in parallel
        Promise.all([
          loadDashboardData(),
          loadProfilePhoto()
        ]).catch(err => console.error('Error loading dashboard data:', err));
      } catch (error) {
        console.error('❌ Error checking owner approval:', error);
        showAlert(
          'Error',
          'Unable to verify your owner status. Please try again.',
          [
            {
              text: 'OK',
              onPress: () => {
                router.replace('/login');
              }
            }
          ]
        );
      }
    };

    checkAccess();
  }, [user]);

  // Listen for listing changes to auto-refresh dashboard
  useEffect(() => {
    const handleListingChange = () => {
      console.log('🔄 Listing changed, refreshing dashboard...');
      loadDashboardData();
    };

    const handleBookingCreated = (event: Event | any) => {
      console.log('🔄 New booking created, refreshing dashboard...', event?.detail);
      // Refresh dashboard and bookings to update notification count
      loadDashboardData();
      loadBookings();
    };

    // Use cross-platform event listener utility
    const removeListingChanged = addCustomEventListener('listingChanged', handleListingChange);
    const removeBookingCreated = addCustomEventListener('bookingCreated', handleBookingCreated);
    
    const handleMaintenanceRequestCreated = async (event?: any) => {
      const eventDetail = event?.detail || {};
      console.log('🔄 Owner Dashboard: Maintenance request created event received:', eventDetail);
      
      if (eventDetail.ownerId === user?.id && user?.id) {
        // Reload maintenance requests
        const requests = await getMaintenanceRequestsByOwner(user.id);
        requests.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setMaintenanceRequests(requests);
        const pendingCount = await getPendingMaintenanceRequestsCountForOwner(user.id);
        setPendingMaintenanceCount(pendingCount);
        showAlert('New Maintenance Request', `You have a new maintenance request: ${eventDetail.title || 'Untitled'}`);
      }
    };
    
    const removeMaintenanceRequestCreated = addCustomEventListener('maintenanceRequestCreated', handleMaintenanceRequestCreated);
    
    // Listen for payment and revenue updates to refresh revenue data
    const handlePaymentUpdated = async (event?: any) => {
      const eventDetail = event?.detail || {};
      console.log('🔄 Owner Dashboard: Payment updated event received:', eventDetail);
      
      if (eventDetail.ownerId === user?.id && user?.id) {
        // Reload revenue data when payment is confirmed
        await loadRevenueData();
        // Also reload stats which includes monthly revenue
        await loadStats();
      }
    };
    
    const handleRevenueUpdated = async (event?: any) => {
      const eventDetail = event?.detail || {};
      console.log('🔄 Owner Dashboard: Revenue updated event received:', eventDetail);
      
      if (eventDetail.ownerId === user?.id && user?.id) {
        // Reload revenue data when revenue is updated
        await loadRevenueData();
        // Also reload stats which includes monthly revenue
        await loadStats();
      }
    };
    
    const removePaymentUpdated = addCustomEventListener('paymentUpdated', handlePaymentUpdated);
    const removeRevenueUpdated = addCustomEventListener('revenueUpdated', handleRevenueUpdated);
    
    return () => {
      removeListingChanged();
      removeBookingCreated();
      removeMaintenanceRequestCreated();
      removePaymentUpdated();
      removeRevenueUpdated();
    };
  }, [user?.id, loadRevenueData, loadStats]); // Include loadRevenueData and loadStats in dependencies


  const loadDashboardData = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      
      // Check and send payment due date notifications (runs in background)
      try {
        const { checkAndSendPaymentDueDateNotifications, updateOverduePayments } = await import('../../utils/tenant-payments');
        // First update overdue payments, then check notifications
        updateOverduePayments().catch(err => {
          console.log('Overdue payment update completed (background)');
        });
        checkAndSendPaymentDueDateNotifications().catch(err => {
          console.log('Payment notification check completed (background)');
        });
      } catch (err) {
        // Silently fail - notifications are not critical
      }
      
      // Auto-delete rejected payments older than 2 days (runs in background)
      try {
        autoDeleteOldRejectedPayments().catch((err: any) => {
          console.log('Auto-delete old rejected payments check completed (background)');
        });
      } catch (err) {
        // Silently fail - auto-deletion is not critical
      }
      
      await Promise.all([
        loadStats(),
        loadListings(),
        loadBookings(),
        loadMessages(),
        loadRevenueData(),
        loadTotalTenants(),
        loadMaintenanceRequests()
      ]);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      showAlert('Error', 'Failed to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]); // Only depend on user.id to prevent infinite loops

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadDashboardData();
  }, [loadDashboardData]);

  const loadStats = useCallback(async () => {
    if (!user?.id) return;

    try {
      const dashboardStats = await getOwnerDashboardStats(user.id);
      setStats(dashboardStats);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  }, [user?.id]);

  const loadListings = useCallback(async () => {
    if (!user?.id) return;

    try {
      console.log('🔍 Loading owner listings for user:', user.id);
      
      // REFRESH MEDIA FIRST (like tenant profile pictures)
      try {
        const { refreshAllPropertyMedia } = await import('../../utils/media-storage');
        await refreshAllPropertyMedia();
        console.log('✅ Owner media refreshed successfully (like tenant profile pictures)');
      } catch (mediaError) {
        console.log('⚠️ Owner media refresh failed:', mediaError);
      }
      
      // First, verify database storage
      const { db, generateId } = await import('../../utils/db');
      const allPublishedListings = await db.list('published_listings');
      const ownerListings = allPublishedListings.filter((listing: any) => listing.userId === user.id);
      
      console.log('📊 Owner Listings Database Test:', {
        totalPublishedListings: allPublishedListings.length,
        ownerListingsCount: ownerListings.length,
        ownerId: user.id,
        listingsData: ownerListings.map((listing: any) => {
          const l = listing as any;
          return {
            id: l.id,
            propertyType: l.propertyType,
            address: l.address?.substring(0, 30) + '...',
            status: l.status,
            hasCoverPhoto: !!l.coverPhoto,
            photosCount: l.photos?.length || 0,
            videosCount: l.videos?.length || 0
          };
        })
      });
      
      // Do not auto-create sample listings for owners
      
      // Load through the utility function (which includes media loading)
      const ownerListingsWithMedia = await getOwnerListings(user.id);
      setListings(ownerListingsWithMedia);
      
      console.log('📊 Owner Listings Loaded:', {
        listingsCount: ownerListingsWithMedia.length,
        listingsWithMedia: ownerListingsWithMedia.filter(l => l.coverPhoto).length
      });
    } catch (error) {
      console.error('Error loading listings:', error);
    }
  }, [user?.id]);

  const loadBookings = useCallback(async () => {
    if (!user?.id) return;

    try {
      const ownerBookings = await getBookingsByOwner(user.id);
      setBookings(ownerBookings);
      
      // Calculate pending bookings count for notification
      const pendingCount = ownerBookings.filter(b => b.status === 'pending').length;
      setPendingBookingsCount(pendingCount);
      
      console.log(`✅ Loaded ${ownerBookings.length} bookings for owner ${user.id}`);
      console.log(`📊 Pending bookings: ${pendingCount}`);
      console.log('📊 Bookings data:', ownerBookings.map(b => ({
        id: b.id,
        tenantName: b.tenantName,
        tenantId: b.tenantId,
        status: b.status,
        propertyTitle: b.propertyTitle
      })));
    } catch (error) {
      console.error('Error loading bookings:', error);
    }
  }, [user?.id]);

  const loadMessages = useCallback(async () => {
    if (!user?.id) return;

    try {
      const ownerMessages = await getOwnerMessages(user.id);
      setMessages(ownerMessages);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  }, [user?.id]);

  const loadRevenueData = useCallback(async () => {
    if (!user?.id) return;

    try {
      const revenueOverview = await getMonthlyRevenueOverview(user.id);
      setMonthlyRevenueOverview(revenueOverview);
    } catch (error) {
      console.error('Error loading revenue data:', error);
    }
  }, [user?.id]);

  const handleCloseApplicationModal = () => {
    setShowApplicationModal(false);
    setApplicationModalData(null);
    router.replace('/login');
  };

  const loadTotalTenants = useCallback(async () => {
    if (!user?.id) return;

    try {
      const tenantsCount = await getTotalActiveTenants(user.id);
      setTotalTenants(tenantsCount);
    } catch (error) {
      console.error('Error loading total tenants:', error);
    }
  }, [user?.id]);

  const loadMaintenanceRequests = useCallback(async () => {
    if (!user?.id) return;

    try {
      const requests = await getMaintenanceRequestsByOwner(user.id);
      // Sort by created date (newest first)
      requests.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setMaintenanceRequests(requests);
      
      const pendingCount = await getPendingMaintenanceRequestsCountForOwner(user.id);
      setPendingMaintenanceCount(pendingCount);
    } catch (error) {
      console.error('Error loading maintenance requests:', error);
    }
  }, [user?.id]);


  const handleBookingAction = async (bookingId: string, action: 'approve' | 'reject') => {
    if (!user?.id) return;

    try {
      const status = action === 'approve' ? 'approved' : 'rejected';
      const success = await updateBookingStatus(bookingId, status, user.id);

      if (success) {
        showAlert(
          'Success', 
          `Booking ${action === 'approve' ? 'approved' : 'rejected'} successfully`
        );

        // Get booking details to send notification
        const booking = bookings.find(b => b.id === bookingId);
        if (booking) {
          // Send notification message to tenant with payment details
          const { sendBookingApprovalNotification, sendBookingRejectionNotification } = await import('../../utils/booking-notifications');
          
          if (action === 'approve') {
            await sendBookingApprovalNotification(
              bookingId,
              user.id,
              booking.tenantId,
              booking.propertyTitle
            );
          } else {
            await sendBookingRejectionNotification(
              bookingId,
              user.id,
              booking.tenantId,
              booking.propertyTitle
            );
          }
        }

        // Reload bookings and stats
        loadBookings();
        loadStats();
      } else {
        throw new Error('Failed to update booking status');
      }
    } catch (error) {
      console.error(`Error ${action}ing booking:`, error);
      showAlert('Error', `Failed to ${action} booking`);
    }
  };



  const handleLogout = () => {
    console.log('🔘 Dashboard logout button clicked');
    console.log('User:', user);
    console.log('SignOut function available:', !!signOut);
    
    showAlert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { 
          text: 'Cancel', 
          style: 'cancel',
          onPress: () => console.log('❌ Logout cancelled')
        },
        { 
          text: 'Logout', 
          style: 'destructive', 
          onPress: async () => {
            try {
              console.log('🚪 User confirmed logout from dashboard, starting signOut...');
              await signOut();
              console.log('✅ SignOut completed successfully');
              router.replace('/login');
            } catch (error) {
              console.error('❌ Logout error:', error);
              showAlert('Logout Error', 'Failed to logout. Please try again.');
            }
          }
        }
      ]
    );
  };

  const handleUpdateMaintenanceStatus = async (requestId: string, status: MaintenanceRequestRecord['status'], notes?: string) => {
    if (!user?.id) return;

    try {
      setUpdatingMaintenanceStatus(true);
      const success = await updateMaintenanceRequestStatus(requestId, status, notes);

      if (success) {
        showAlert('Success', `Maintenance request ${status === 'resolved' ? 'resolved' : 'updated'} successfully`);
        await loadMaintenanceRequests();
        setShowMaintenanceModal(false);
        setSelectedMaintenanceRequest(null);
      } else {
        throw new Error('Failed to update maintenance request status');
      }
    } catch (error) {
      console.error('Error updating maintenance request:', error);
      showAlert('Error', 'Failed to update maintenance request');
    } finally {
      setUpdatingMaintenanceStatus(false);
    }
  };

  const handleClosePhotoViewer = useCallback(() => {
    // Set closing state first to start animation
    setIsPhotoModalClosing(true);
    // Delay state updates to allow animation to complete and prevent immediate re-renders
    setTimeout(() => {
      setSelectedPhotoIndex(null);
      setCurrentPhotoIndex(0);
      setIsPhotoModalClosing(false);
    }, 300); // Match animation duration
  }, []);

  const handleViewTenantInfo = async (booking: BookingRecord) => {
    // Load tenant avatar
    let tenantAvatar: string | undefined;
    try {
      const { loadUserProfilePhoto } = await import('../../utils/user-profile-photos');
      const photoUri = await loadUserProfilePhoto(booking.tenantId);
      if (photoUri && photoUri.trim() && photoUri.length > 10) {
        tenantAvatar = photoUri.trim();
      }
    } catch (error) {
      console.log('⚠️ Could not load tenant avatar:', error);
    }

    setSelectedTenant({
      id: booking.tenantId,
      name: booking.tenantName,
      email: booking.tenantEmail,
      phone: booking.tenantPhone,
      avatar: tenantAvatar
    });
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedTenant(null);
  };

  const handleDownloadAnalytics = async () => {
    if (!user) return;

    try {
      setExporting(true);
      
      let startDate: Date | undefined;
      let endDate: Date | undefined;
      
      if (selectedPeriod === 'custom') {
        if (!customStartDate || !customEndDate) {
          showAlert('Invalid Date Range', 'Please select both start and end dates for custom range.');
          setExporting(false);
          return;
        }
        startDate = customStartDate;
        endDate = customEndDate;
        
        if (startDate > endDate) {
          showAlert('Invalid Date Range', 'Start date must be before end date.');
          setExporting(false);
          return;
        }
      }

      const exportData = await exportOwnerAnalytics(
        user.id,
        selectedPeriod,
        startDate,
        endDate,
        user.name || user.email
      );

      // Generate filename
      const periodLabel = selectedPeriod === 'custom' 
        ? `${customStartDate?.toISOString().slice(0, 10)}_to_${customEndDate?.toISOString().slice(0, 10)}`
        : selectedPeriod;
      const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const filename = `owner_analytics_${periodLabel}_${timestamp}`;

      // Generate PDF from HTML
      try {
        const { uri } = await Print.printToFileAsync({
          html: exportData.htmlContent,
          base64: false,
        });

        // Web platform: Use browser download
        if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof document !== 'undefined') {
          try {
            // For web, we need to fetch the file and download it
            const response = await fetch(uri);
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${filename}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            
            showAlert('Success', 'PDF report downloaded successfully!');
          } catch (error) {
            console.error('Error downloading PDF:', error);
            Alert.alert('Download Failed', 'Unable to download PDF. Please try again.');
          }
        } else {
          // Mobile platform: Share the PDF file
          if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(uri, {
              mimeType: 'application/pdf',
              dialogTitle: 'Download Analytics Report (PDF)',
            });
            
            showAlert('Success', 'PDF report ready to save! Use the share menu to save to Downloads or Files.');
          } else {
            showAlert('Success', `PDF saved to: ${uri}`);
          }
        }
      } catch (error) {
        console.error('Error generating PDF:', error);
        showAlert('Error', 'Failed to generate PDF report. Please try again.');
      }

      setDownloadModalVisible(false);
    } catch (error) {
      console.error('Error downloading analytics:', error);
      showAlert('Error', 'Failed to generate analytics report. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const handlePhotoAction = async (action: 'gallery' | 'remove') => {
    if (action === 'remove') {
      Alert.alert(
        'Remove Photo',
        'Are you sure you want to remove your profile photo?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: async () => {
              try {
                if (!user?.id) return;
                // Delete from database
                const { db } = await import('../../utils/db');
                const allPhotos = await db.list('user_profile_photos');
                const userPhoto = allPhotos.find((p: any) => (p.userId || p.userid) === user.id) as any;
                if (userPhoto && userPhoto.id) {
                  await db.remove('user_profile_photos', userPhoto.id);
                }
                // Reload to ensure it's removed
                await loadProfilePhoto();
                showAlert('Success', 'Profile photo removed');
              } catch (error) {
                console.error('Error removing photo:', error);
                showAlert('Error', 'Failed to remove photo');
              }
            }
          }
        ]
      );
    } else {
      try {
        const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
        
        if (!permissionResult.granted) {
          showAlert('Permission Required', 'Please grant permission to access your photos');
          return;
        }
        
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [1, 1] as [number, number],
          quality: 0.7,
          base64: true,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
          const selectedImage = result.assets[0];
          
          let imageUri = selectedImage.uri;
          if (Platform.OS === 'web' && selectedImage.base64) {
            imageUri = `data:${selectedImage.type || 'image/jpeg'};base64,${selectedImage.base64}`;
          }
          
          // Save to database
          try {
            setSavingPhoto(true);
            const photoSize = imageUri.length;
            const fileName = `profile_photo_${user?.id}_${Date.now()}.jpg`;
            const mimeType = imageUri.startsWith('data:') 
              ? imageUri.split(';')[0].split(':')[1] 
              : 'image/jpeg';
            
            await saveUserProfilePhoto(
              user?.id || '',
              imageUri,
              imageUri,
              fileName,
              photoSize,
              mimeType
            );
            
            // Reload photo to ensure it's updated
            await loadProfilePhoto();
            setShowProfilePhotoModal(false);
            showAlert('Success', 'Profile photo updated successfully');
          } catch (saveError) {
            console.error('❌ Error saving photo:', saveError);
            showAlert('Error', 'Failed to save photo');
          } finally {
            setSavingPhoto(false);
          }
        }
      } catch (error) {
        console.error('Error selecting photo:', error);
        showAlert('Error', 'Failed to select photo');
      }
    }
  };

  const renderOverview = () => (
    <View style={sharedStyles.pageContainer}>
      {/* Modern Header with Gradient */}
      <View style={[sharedStyles.headerModern, { marginBottom: designTokens.spacing['2xl'], backgroundColor: 'transparent', shadowColor: 'transparent', shadowOpacity: 0, elevation: 0 }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', zIndex: 1 }}>
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: designTokens.spacing.md }}>
            {/* Profile Photo */}
            <TouchableOpacity
              onPress={() => router.push('/(owner)/profile')}
              activeOpacity={0.7}
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                overflow: 'hidden',
                borderWidth: 2,
                borderColor: designTokens.colors.primary,
                backgroundColor: designTokens.colors.white,
              }}
            >
              {profilePhoto && !profilePhotoError ? (
                <Image
                  source={{ uri: profilePhoto }}
                  style={{ width: '100%', height: '100%' }}
                  onError={() => setProfilePhotoError(true)}
                />
              ) : (
                <View style={{
                  width: '100%',
                  height: '100%',
                  backgroundColor: designTokens.colors.primary + '20',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}>
                  <User size={24} color={designTokens.colors.primary} />
                </View>
              )}
            </TouchableOpacity>
            
            <View style={{ flex: 1, flexShrink: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: designTokens.spacing.xs, flexWrap: 'wrap' }}>
                <Text style={{
                  fontSize: designTokens.typography.xs,
                  fontWeight: designTokens.typography.medium as any,
                  color: designTokens.colors.textSecondary,
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                }}>
                  {getGreeting()}
                </Text>
                <Text style={{
                  fontSize: designTokens.typography['2xl'],
                  fontWeight: designTokens.typography.bold as any,
                  color: designTokens.colors.textPrimary,
                  flexShrink: 1,
                }} numberOfLines={1}>
                  {user?.name || 'Property Owner'}
                </Text>
              </View>
              <Text style={{
                fontSize: designTokens.typography.xs,
                color: designTokens.colors.textSecondary,
                marginTop: 2,
              }}>
                Welcome back to your dashboard
              </Text>
            </View>
          </View>
          <TouchableOpacity 
            style={{
              padding: designTokens.spacing.sm,
              justifyContent: 'center',
              alignItems: 'center',
            }}
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <LogOut size={20} color={designTokens.colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Operations & Management Section */}
      <View style={{ marginBottom: designTokens.spacing['2xl'] }}>
        {/* Section Header with Divider */}
        <View style={{ 
          flexDirection: 'row', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          marginBottom: designTokens.spacing.lg,
          paddingBottom: designTokens.spacing.md,
          borderBottomWidth: 2,
          borderBottomColor: designTokens.colors.borderLight,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <View style={[sharedStyles.statIcon, iconBackgrounds.orange, { marginRight: designTokens.spacing.md, position: 'relative' }]}>
              <Sparkles size={20} color="#F59E0B" />
              {(pendingBookingsCount > 0 || messages.filter(m => !m.isRead).length > 0 || pendingMaintenanceCount > 0) && (
                <View style={{
                  position: 'absolute',
                  top: -6,
                  right: -6,
                  backgroundColor: designTokens.colors.error,
                  borderRadius: 8,
                  width: 16,
                  height: 16,
                  borderWidth: 2,
                  borderColor: designTokens.colors.white,
                }} />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: designTokens.spacing.sm }}>
                <Text style={[sharedStyles.sectionTitle, { marginBottom: 0 }]}>Operations & Management</Text>
                {(pendingBookingsCount > 0 || messages.filter(m => !m.isRead).length > 0 || pendingMaintenanceCount > 0) && (
                  <View style={{
                    backgroundColor: designTokens.colors.error,
                    borderRadius: 12,
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                    minWidth: 24,
                    height: 20,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}>
                    <Text style={{ color: designTokens.colors.white, fontSize: 10, fontWeight: '700' }}>
                      {pendingBookingsCount + messages.filter(m => !m.isRead).length + pendingMaintenanceCount}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={{
                fontSize: designTokens.typography.sm,
                color: designTokens.colors.textSecondary,
                marginTop: designTokens.spacing.xs,
              }}>
                {pendingBookingsCount > 0 || messages.filter(m => !m.isRead).length > 0 || pendingMaintenanceCount > 0
                  ? `${pendingBookingsCount + messages.filter(m => !m.isRead).length + pendingMaintenanceCount} item${(pendingBookingsCount + messages.filter(m => !m.isRead).length + pendingMaintenanceCount) > 1 ? 's' : ''} need attention`
                  : 'Quick actions and daily operations'}
              </Text>
            </View>
          </View>
        </View>

        {/* Horizontal Scrollable Operations Grid */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingRight: designTokens.spacing.lg }}
        >
          <View style={{ flexDirection: 'row', gap: designTokens.spacing.md }}>
            {/* Create New Listing */}
            <TouchableOpacity 
              style={{
                width: 160,
                padding: designTokens.spacing.lg,
                backgroundColor: designTokens.colors.white,
                borderRadius: designTokens.borderRadius.lg,
                borderWidth: 1,
                borderColor: designTokens.colors.borderLight,
                ...designTokens.shadows.sm,
              }}
              onPress={() => router.push('/(owner)/create-listing')}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={designTokens.gradients.primary as any}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: designTokens.borderRadius.md,
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginBottom: designTokens.spacing.md,
                }}
              >
                <Plus size={24} color="#FFFFFF" />
              </LinearGradient>
              <Text style={[sharedStyles.statLabel, { fontSize: designTokens.typography.base, marginBottom: 4 }]}>
                Create Listing
              </Text>
              <Text style={[sharedStyles.statSubtitle, { fontSize: 11 }]}>
                Add a new property
              </Text>
            </TouchableOpacity>

            {/* Manage Listings */}
            <TouchableOpacity 
              style={{
                width: 160,
                padding: designTokens.spacing.lg,
                backgroundColor: designTokens.colors.white,
                borderRadius: designTokens.borderRadius.lg,
                borderWidth: 1,
                borderColor: designTokens.colors.borderLight,
                ...designTokens.shadows.sm,
                position: 'relative',
              }}
              onPress={() => router.push('/(owner)/listings')}
              activeOpacity={0.7}
            >
              <View style={[sharedStyles.statIcon, iconBackgrounds.blue, { marginBottom: designTokens.spacing.md, position: 'relative' }]}>
                <List size={24} color="#3B82F6" />
                {listings.length > 0 && (
                  <View style={{
                    position: 'absolute',
                    top: -4,
                    right: -4,
                    backgroundColor: designTokens.colors.info,
                    borderRadius: 10,
                    minWidth: 20,
                    height: 20,
                    justifyContent: 'center',
                    alignItems: 'center',
                    paddingHorizontal: 4,
                    borderWidth: 2,
                    borderColor: designTokens.colors.white,
                  }}>
                    <Text style={{ color: designTokens.colors.white, fontSize: 9, fontWeight: '700' }}>
                      {listings.length}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={[sharedStyles.statLabel, { fontSize: designTokens.typography.base, marginBottom: 4 }]}>
                Manage Listings
              </Text>
              <Text style={[sharedStyles.statSubtitle, { fontSize: 11 }]}>
                View and edit properties
              </Text>
            </TouchableOpacity>

            {/* Bookings */}
            <TouchableOpacity 
              style={{
                width: 160,
                padding: designTokens.spacing.lg,
                backgroundColor: pendingBookingsCount > 0 ? designTokens.colors.warningLight : designTokens.colors.white,
                borderRadius: designTokens.borderRadius.lg,
                borderWidth: pendingBookingsCount > 0 ? 2 : 1,
                borderColor: pendingBookingsCount > 0 ? designTokens.colors.warning : designTokens.colors.borderLight,
                ...designTokens.shadows.sm,
                position: 'relative',
              }}
              onPress={() => router.push('/(owner)/bookings')}
              activeOpacity={0.7}
            >
              <View style={[sharedStyles.statIcon, iconBackgrounds.orange, { marginBottom: designTokens.spacing.md, position: 'relative' }]}>
                <Calendar size={24} color="#F59E0B" />
                {pendingBookingsCount > 0 && (
                  <View style={{
                    position: 'absolute',
                    top: -4,
                    right: -4,
                    backgroundColor: designTokens.colors.error,
                    borderRadius: 12,
                    minWidth: 24,
                    height: 24,
                    justifyContent: 'center',
                    alignItems: 'center',
                    paddingHorizontal: 6,
                    borderWidth: 2,
                    borderColor: designTokens.colors.white,
                  }}>
                    <Text style={{ color: designTokens.colors.white, fontSize: 10, fontWeight: '700' }}>
                      {pendingBookingsCount > 99 ? '99+' : pendingBookingsCount}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={[sharedStyles.statLabel, { fontSize: designTokens.typography.base, marginBottom: 4 }]}>
                Bookings
              </Text>
              <Text style={[sharedStyles.statSubtitle, { fontSize: 11 }]}>
                {pendingBookingsCount > 0 ? `${pendingBookingsCount} pending approval` : 'Manage reservations'}
              </Text>
            </TouchableOpacity>

            {/* My Tenants */}
            <TouchableOpacity 
              style={{
                width: 160,
                padding: designTokens.spacing.lg,
                backgroundColor: designTokens.colors.white,
                borderRadius: designTokens.borderRadius.lg,
                borderWidth: 1,
                borderColor: designTokens.colors.borderLight,
                ...designTokens.shadows.sm,
                position: 'relative',
              }}
              onPress={() => router.push('/(owner)/tenants')}
              activeOpacity={0.7}
            >
              <View style={[sharedStyles.statIcon, iconBackgrounds.teal, { marginBottom: designTokens.spacing.md, position: 'relative' }]}>
                <Users size={24} color="#14B8A6" />
                {totalTenants > 0 && (
                  <View style={{
                    position: 'absolute',
                    top: -4,
                    right: -4,
                    backgroundColor: designTokens.colors.success,
                    borderRadius: 10,
                    minWidth: 20,
                    height: 20,
                    justifyContent: 'center',
                    alignItems: 'center',
                    paddingHorizontal: 4,
                    borderWidth: 2,
                    borderColor: designTokens.colors.white,
                  }}>
                    <Text style={{ color: designTokens.colors.white, fontSize: 9, fontWeight: '700' }}>
                      {totalTenants > 99 ? '99+' : totalTenants}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={[sharedStyles.statLabel, { fontSize: designTokens.typography.base, marginBottom: 4 }]}>
                My Tenants
              </Text>
              <Text style={[sharedStyles.statSubtitle, { fontSize: 11 }]}>
                {totalTenants > 0 ? `${totalTenants} active tenant${totalTenants > 1 ? 's' : ''}` : 'View tenant information'}
              </Text>
            </TouchableOpacity>

            {/* Messages */}
            <TouchableOpacity 
              style={{
                width: 160,
                padding: designTokens.spacing.lg,
                backgroundColor: messages.filter(m => !m.isRead).length > 0 ? designTokens.colors.infoLight : designTokens.colors.white,
                borderRadius: designTokens.borderRadius.lg,
                borderWidth: messages.filter(m => !m.isRead).length > 0 ? 2 : 1,
                borderColor: messages.filter(m => !m.isRead).length > 0 ? designTokens.colors.info : designTokens.colors.borderLight,
                ...designTokens.shadows.sm,
                position: 'relative',
              }}
              onPress={() => router.push('/(owner)/messages')}
              activeOpacity={0.7}
            >
              <View style={[sharedStyles.statIcon, iconBackgrounds.green, { marginBottom: designTokens.spacing.md, position: 'relative' }]}>
                <MessageSquare size={24} color="#10B981" />
                {messages.filter(m => !m.isRead).length > 0 && (
                  <View style={{
                    position: 'absolute',
                    top: -4,
                    right: -4,
                    backgroundColor: designTokens.colors.error,
                    borderRadius: 12,
                    minWidth: 24,
                    height: 24,
                    justifyContent: 'center',
                    alignItems: 'center',
                    paddingHorizontal: 6,
                    borderWidth: 2,
                    borderColor: designTokens.colors.white,
                  }}>
                    <Text style={{ color: designTokens.colors.white, fontSize: 10, fontWeight: '700' }}>
                      {messages.filter(m => !m.isRead).length > 99 ? '99+' : messages.filter(m => !m.isRead).length}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={[sharedStyles.statLabel, { fontSize: designTokens.typography.base, marginBottom: 4 }]}>
                Messages
              </Text>
              <Text style={[sharedStyles.statSubtitle, { fontSize: 11 }]}>
                {messages.filter(m => !m.isRead).length > 0 
                  ? `${messages.filter(m => !m.isRead).length} unread message${messages.filter(m => !m.isRead).length > 1 ? 's' : ''}`
                  : 'Chat with tenants'}
              </Text>
            </TouchableOpacity>

            {/* Maintenance Requests */}
            <TouchableOpacity 
              style={{
                width: 160,
                padding: designTokens.spacing.lg,
                backgroundColor: pendingMaintenanceCount > 0 ? designTokens.colors.warningLight : designTokens.colors.white,
                borderRadius: designTokens.borderRadius.lg,
                borderWidth: pendingMaintenanceCount > 0 ? 2 : 1,
                borderColor: pendingMaintenanceCount > 0 ? designTokens.colors.warning : designTokens.colors.borderLight,
                ...designTokens.shadows.sm,
                position: 'relative',
              }}
              onPress={() => {
                // Show maintenance requests modal (list view)
                setSelectedMaintenanceRequest(null);
                setShowMaintenanceModal(true);
              }}
              activeOpacity={0.7}
            >
              <View style={[sharedStyles.statIcon, iconBackgrounds.blue, { marginBottom: designTokens.spacing.md, position: 'relative' }]}>
                <Wrench size={24} color="#3B82F6" />
                {pendingMaintenanceCount > 0 && (
                  <View style={{
                    position: 'absolute',
                    top: -4,
                    right: -4,
                    backgroundColor: designTokens.colors.error,
                    borderRadius: 12,
                    minWidth: 24,
                    height: 24,
                    justifyContent: 'center',
                    alignItems: 'center',
                    paddingHorizontal: 6,
                    borderWidth: 2,
                    borderColor: designTokens.colors.white,
                  }}>
                    <Text style={{ color: designTokens.colors.white, fontSize: 10, fontWeight: '700' }}>
                      {pendingMaintenanceCount > 99 ? '99+' : pendingMaintenanceCount}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={[sharedStyles.statLabel, { fontSize: designTokens.typography.base, marginBottom: 4 }]}>
                Maintenance
              </Text>
              <Text style={[sharedStyles.statSubtitle, { fontSize: 11 }]}>
                {pendingMaintenanceCount > 0 
                  ? `${pendingMaintenanceCount} pending request${pendingMaintenanceCount > 1 ? 's' : ''}`
                  : 'View maintenance issues'}
              </Text>
            </TouchableOpacity>

            {/* Payment Settings */}
            <TouchableOpacity 
              style={{
                width: 160,
                padding: designTokens.spacing.lg,
                backgroundColor: designTokens.colors.white,
                borderRadius: designTokens.borderRadius.lg,
                borderWidth: 1,
                borderColor: designTokens.colors.borderLight,
                ...designTokens.shadows.sm,
              }}
              onPress={() => router.push('/(owner)/payment-settings')}
              activeOpacity={0.7}
            >
              <View style={[sharedStyles.statIcon, iconBackgrounds.purple, { marginBottom: designTokens.spacing.md }]}>
                <CreditCard size={24} color="#8B5CF6" />
              </View>
              <Text style={[sharedStyles.statLabel, { fontSize: designTokens.typography.base, marginBottom: 4 }]}>
                Payment Settings
              </Text>
              <Text style={[sharedStyles.statSubtitle, { fontSize: 11 }]}>
                Manage payment methods
              </Text>
            </TouchableOpacity>

            {/* Property Ratings */}
            <TouchableOpacity 
              style={{
                width: 160,
                padding: designTokens.spacing.lg,
                backgroundColor: designTokens.colors.white,
                borderRadius: designTokens.borderRadius.lg,
                borderWidth: 1,
                borderColor: designTokens.colors.borderLight,
                ...designTokens.shadows.sm,
              }}
              onPress={() => router.push('/(owner)/ratings')}
              activeOpacity={0.7}
            >
              <View style={[sharedStyles.statIcon, iconBackgrounds.orange, { marginBottom: designTokens.spacing.md }]}>
                <Star size={24} color="#F59E0B" />
              </View>
              <Text style={[sharedStyles.statLabel, { fontSize: designTokens.typography.base, marginBottom: 4 }]}>
                Property Ratings
              </Text>
              <Text style={[sharedStyles.statSubtitle, { fontSize: 11 }]}>
                View and reply to ratings
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>

      {/* Key Metrics Summary */}
      <View style={{ marginBottom: designTokens.spacing['2xl'] }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: designTokens.spacing.lg }}>
          <View>
            <Text style={sharedStyles.sectionTitle}>Key Metrics</Text>
            <Text style={{
              fontSize: designTokens.typography.sm,
              color: designTokens.colors.textSecondary,
              marginTop: designTokens.spacing.xs,
            }}>
              Overview of your property business
            </Text>
          </View>
          <View style={[sharedStyles.statIcon, iconBackgrounds.blue]}>
            <BarChart3 size={18} color="#3B82F6" />
          </View>
        </View>
        <View style={sharedStyles.grid}>
          {/* Listings Card */}
          <View style={sharedStyles.gridItem}>
            <View style={sharedStyles.statCard}>
              <LinearGradient
                colors={designTokens.gradients.info as any}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[sharedStyles.statCardGradient, { height: 4 }]}
              />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: designTokens.spacing.sm }}>
                <View style={[sharedStyles.statIcon, iconBackgrounds.blue]}>
                  <Home size={20} color="#3B82F6" />
                </View>
              </View>
              <Text style={[sharedStyles.statLabel, { marginBottom: designTokens.spacing.xs }]}>Listings</Text>
              <Text style={[sharedStyles.statValue, { fontSize: designTokens.typography['2xl'], marginBottom: 0 }]}>
                {stats.totalListings}
              </Text>
            </View>
          </View>

          {/* Views Card */}
          <View style={sharedStyles.gridItem}>
            <View style={sharedStyles.statCard}>
              <LinearGradient
                colors={designTokens.gradients.teal as any}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[sharedStyles.statCardGradient, { height: 4 }]}
              />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: designTokens.spacing.sm }}>
                <View style={[sharedStyles.statIcon, iconBackgrounds.teal]}>
                  <Eye size={20} color="#14B8A6" />
                </View>
              </View>
              <Text style={[sharedStyles.statLabel, { marginBottom: designTokens.spacing.xs }]}>Views</Text>
              <Text style={[sharedStyles.statValue, { fontSize: designTokens.typography['2xl'], marginBottom: 0 }]}>
                {stats.totalViews}
              </Text>
            </View>
          </View>

          {/* Bookings Card */}
          <View style={sharedStyles.gridItem}>
            <View style={sharedStyles.statCard}>
              <LinearGradient
                colors={designTokens.gradients.warning as any}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[sharedStyles.statCardGradient, { height: 4 }]}
              />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: designTokens.spacing.sm }}>
                <View style={[sharedStyles.statIcon, iconBackgrounds.orange]}>
                  <Calendar size={20} color="#F59E0B" />
                </View>
                {pendingBookingsCount > 0 && (
                  <View style={{
                    backgroundColor: designTokens.colors.error,
                    borderRadius: 12,
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    minWidth: 24,
                    height: 24,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}>
                    <Text style={{ color: designTokens.colors.white, fontSize: 11, fontWeight: '700' }}>
                      {pendingBookingsCount}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={[sharedStyles.statLabel, { marginBottom: designTokens.spacing.xs }]}>Bookings</Text>
              <Text style={[sharedStyles.statValue, { fontSize: designTokens.typography['2xl'], marginBottom: 0 }]}>
                {stats.totalBookings}
              </Text>
            </View>
          </View>

          {/* Total Tenants Card */}
          <View style={sharedStyles.gridItem}>
            <View style={sharedStyles.statCard}>
              <LinearGradient
                colors={designTokens.gradients.purple as any}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[sharedStyles.statCardGradient, { height: 4 }]}
              />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: designTokens.spacing.sm }}>
                <View style={[sharedStyles.statIcon, iconBackgrounds.purple]}>
                  <Users size={20} color="#8B5CF6" />
                </View>
              </View>
              <Text style={[sharedStyles.statLabel, { marginBottom: designTokens.spacing.xs }]}>Total Tenants</Text>
              <Text style={[sharedStyles.statValue, { fontSize: designTokens.typography['2xl'], marginBottom: 0 }]}>
                {totalTenants}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Financial Analytics Section */}
      {monthlyRevenueOverview && (
      <View style={{ marginBottom: designTokens.spacing['2xl'] }}>
          {/* Section Header with Divider */}
          <View style={{ 
            flexDirection: 'row', 
            alignItems: 'center', 
            marginBottom: designTokens.spacing.lg,
            paddingBottom: designTokens.spacing.md,
            borderBottomWidth: 2,
            borderBottomColor: designTokens.colors.borderLight,
          }}>
            <View style={[sharedStyles.statIcon, iconBackgrounds.green, { marginRight: designTokens.spacing.md }]}>
              <TrendingUp size={20} color="#10B981" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[sharedStyles.sectionTitle, { marginBottom: 0 }]}>Financial Analytics</Text>
              <Text style={{
                fontSize: designTokens.typography.sm,
                color: designTokens.colors.textSecondary,
                marginTop: designTokens.spacing.xs,
              }}>
                {new Date(monthlyRevenueOverview.month + '-01').toLocaleDateString('en-US', { year: 'numeric', month: 'long' })} • Cash Flow Tracking
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setDownloadModalVisible(true)}
              style={{
                padding: designTokens.spacing.sm,
                borderRadius: 8,
                backgroundColor: designTokens.colors.primary + '15',
              }}
              activeOpacity={0.7}
            >
              <Download size={20} color={designTokens.colors.primary} />
            </TouchableOpacity>
          </View>
          
          <View style={sharedStyles.grid}>
            {/* Total Rental Income Card */}
            <View style={sharedStyles.gridItem}>
              <View style={sharedStyles.statCard}>
                <LinearGradient
                  colors={designTokens.gradients.success as any}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[sharedStyles.statCardGradient, { height: 4 }]}
                />
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: designTokens.spacing.sm }}>
                  <View style={[sharedStyles.statIcon, iconBackgrounds.green]}>
                    <Coins size={20} color="#10B981" />
                  </View>
                </View>
                <Text style={[sharedStyles.statLabel, { marginBottom: designTokens.spacing.xs }]}>Total Rental Income</Text>
                <Text style={[sharedStyles.statValue, { fontSize: designTokens.typography['2xl'], marginBottom: 0 }]}>
                  ₱{monthlyRevenueOverview.totalRentalIncome.toLocaleString()}
                </Text>
              </View>
            </View>

            {/* Pending Payments Card */}
            <View style={sharedStyles.gridItem}>
              <View style={sharedStyles.statCard}>
                <LinearGradient
                  colors={designTokens.gradients.warning as any}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[sharedStyles.statCardGradient, { height: 4 }]}
                />
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: designTokens.spacing.sm }}>
                  <View style={[sharedStyles.statIcon, iconBackgrounds.orange]}>
                    <Clock size={20} color="#F59E0B" />
                  </View>
                </View>
                <Text style={[sharedStyles.statLabel, { marginBottom: designTokens.spacing.xs }]}>Pending Payments</Text>
                <Text style={[sharedStyles.statValue, { fontSize: designTokens.typography['2xl'], marginBottom: 0 }]}>
                  ₱{monthlyRevenueOverview.pendingPayments.toLocaleString()}
                </Text>
              </View>
            </View>

            {/* Completed Payments Card */}
            <View style={sharedStyles.gridItem}>
              <View style={sharedStyles.statCard}>
                <LinearGradient
                  colors={designTokens.gradients.info as any}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[sharedStyles.statCardGradient, { height: 4 }]}
                />
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: designTokens.spacing.sm }}>
                  <View style={[sharedStyles.statIcon, iconBackgrounds.blue]}>
                    <CheckCircle size={20} color="#3B82F6" />
                  </View>
                </View>
                <Text style={[sharedStyles.statLabel, { marginBottom: designTokens.spacing.xs }]}>Completed Payments</Text>
                <Text style={[sharedStyles.statValue, { fontSize: designTokens.typography['2xl'], marginBottom: 0 }]}>
                  {monthlyRevenueOverview.completedPayments.toLocaleString()}
                </Text>
              </View>
            </View>

            {/* Overdue Payments Card */}
            <View style={sharedStyles.gridItem}>
              <View style={sharedStyles.statCard}>
                <LinearGradient
                  colors={['#EF4444', '#F87171']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[sharedStyles.statCardGradient, { height: 4 }]}
                />
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: designTokens.spacing.sm }}>
                  <View style={[sharedStyles.statIcon, iconBackgrounds.red]}>
                    <AlertCircle size={20} color="#EF4444" />
                  </View>
                </View>
                <Text style={[sharedStyles.statLabel, { marginBottom: designTokens.spacing.xs }]}>Overdue Payments</Text>
                <Text style={[sharedStyles.statValue, { fontSize: designTokens.typography['2xl'], marginBottom: 0 }]}>
                  ₱{monthlyRevenueOverview.overduePayments.toLocaleString()}
                </Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* Property Analytics Section */}
      {listings.length > 0 && (
        <View style={{ marginBottom: designTokens.spacing['2xl'] }}>
          {/* Section Header with Divider */}
          <View style={{ 
            flexDirection: 'row', 
            alignItems: 'center', 
            marginBottom: designTokens.spacing.lg,
            paddingBottom: designTokens.spacing.md,
            borderBottomWidth: 2,
            borderBottomColor: designTokens.colors.borderLight,
          }}>
            <View style={[sharedStyles.statIcon, iconBackgrounds.teal, { marginRight: designTokens.spacing.md }]}>
              <PieChart size={20} color="#14B8A6" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[sharedStyles.sectionTitle, { marginBottom: 0 }]}>Property Analytics</Text>
              <Text style={{
                fontSize: designTokens.typography.sm,
                color: designTokens.colors.textSecondary,
                marginTop: designTokens.spacing.xs,
              }}>
                Performance insights and top performers
              </Text>
            </View>
          </View>

          {/* Top 3 Most Viewed Listings */}
          <View style={{ marginBottom: designTokens.spacing.xl }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: designTokens.spacing.md }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: designTokens.spacing.sm }}>
                <Eye size={16} color={designTokens.colors.textSecondary} />
                <Text style={[sharedStyles.statLabel, { fontSize: designTokens.typography.base, marginBottom: 0 }]}>
                  Top 3 Most Viewed
                </Text>
              </View>
              <TouchableOpacity 
                onPress={() => router.push('/(owner)/listings')}
                style={{
                  paddingHorizontal: designTokens.spacing.sm,
                  paddingVertical: 4,
                }}
              >
                <Text style={{ fontSize: designTokens.typography.xs, color: designTokens.colors.primary, fontWeight: designTokens.typography.semibold as any }}>
                  View All →
                </Text>
              </TouchableOpacity>
            </View>
            
            {(() => {
              // Sort listings by views (descending) and take top 3
              const topViewedListings = [...listings]
                .sort((a, b) => (b.views || 0) - (a.views || 0))
                .slice(0, 3);
              
              if (topViewedListings.length === 0) {
                return null;
              }
              
              return (
                <View style={{ gap: designTokens.spacing.sm }}>
                  {topViewedListings.map((listing, index) => (
                    <TouchableOpacity
                      key={listing.id}
                      style={[sharedStyles.card, { padding: designTokens.spacing.md }]}
                      onPress={() => router.push(`/property-preview?id=${listing.id}`)}
                      activeOpacity={0.7}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        {/* Rank Badge */}
                        <View style={{
                          width: 28,
                          height: 28,
                          borderRadius: 14,
                          backgroundColor: index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : '#CD7F32',
                          justifyContent: 'center',
                          alignItems: 'center',
                          marginRight: designTokens.spacing.md,
                        }}>
                          <Text style={{
                            fontSize: designTokens.typography.xs,
                            fontWeight: designTokens.typography.bold as any,
                            color: '#FFFFFF',
                          }}>
                            {index + 1}
                          </Text>
                        </View>
                        
                        {/* Cover Photo */}
                        {listing.coverPhoto && (
                          <View style={{ width: 50, height: 50, marginRight: designTokens.spacing.md, borderRadius: 8, overflow: 'hidden' }}>
                            <Image 
                              source={{ uri: listing.coverPhoto }} 
                              style={{ width: '100%', height: '100%' }}
                              resizeMode="cover"
                              showSkeleton={true}
                              fallbackIcon="home"
                            />
                          </View>
                        )}
                        
                        {/* Listing Info */}
                        <View style={{ flex: 1 }}>
                          <Text style={[sharedStyles.statLabel, { marginBottom: 2, fontSize: designTokens.typography.sm }]} numberOfLines={1}>
                            {listing.propertyType}
                          </Text>
                          <Text style={[sharedStyles.statSubtitle, { fontSize: designTokens.typography.xs, marginBottom: 2 }]} numberOfLines={1}>
                            {listing.address}
                          </Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: designTokens.spacing.sm }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                              <Eye size={12} color={designTokens.colors.textMuted} />
                              <Text style={[sharedStyles.statSubtitle, { marginLeft: 2, marginBottom: 0, fontSize: designTokens.typography.xs }]}>
                                {listing.views || 0}
                              </Text>
                            </View>
                            <Text style={[sharedStyles.statValue, { fontSize: designTokens.typography.xs, color: designTokens.colors.success }]}>
                              ₱{listing.monthlyRent?.toLocaleString() || '0'}/mo
                            </Text>
                          </View>
                        </View>
                        
                        <ChevronRight size={16} color={designTokens.colors.textMuted} />
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              );
            })()}
          </View>
        </View>
      )}

      {/* Maintenance Requests Section */}
      {maintenanceRequests.length > 0 && (
        <View style={{ marginBottom: designTokens.spacing['2xl'] }}>
          {/* Section Header with Divider */}
          <View style={{ 
            flexDirection: 'row', 
            alignItems: 'center', 
            marginBottom: designTokens.spacing.lg,
            paddingBottom: designTokens.spacing.md,
            borderBottomWidth: 2,
            borderBottomColor: designTokens.colors.borderLight,
          }}>
            <View style={[sharedStyles.statIcon, iconBackgrounds.blue, { marginRight: designTokens.spacing.md }]}>
              <Wrench size={20} color="#3B82F6" />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: designTokens.spacing.sm }}>
                <Text style={[sharedStyles.sectionTitle, { marginBottom: 0 }]}>Maintenance Requests</Text>
                {pendingMaintenanceCount > 0 && (
                  <View style={{
                    backgroundColor: designTokens.colors.warning,
                    borderRadius: 12,
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                    minWidth: 24,
                    height: 20,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}>
                    <Text style={{ color: designTokens.colors.white, fontSize: 10, fontWeight: '700' }}>
                      {pendingMaintenanceCount}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={{
                fontSize: designTokens.typography.sm,
                color: designTokens.colors.textSecondary,
                marginTop: designTokens.spacing.xs,
              }}>
                {pendingMaintenanceCount > 0 
                  ? `${pendingMaintenanceCount} pending request${pendingMaintenanceCount > 1 ? 's' : ''} need attention`
                  : 'Recent maintenance issues from tenants'}
              </Text>
            </View>
          </View>

          {/* Recent Maintenance Requests */}
          <View style={{ gap: designTokens.spacing.sm }}>
            {maintenanceRequests.slice(0, 3).map((request) => (
              <TouchableOpacity
                key={request.id}
                style={[
                  sharedStyles.card,
                  { padding: designTokens.spacing.md },
                  (request.status === 'pending' || request.status === 'in_progress') && {
                    borderWidth: 2,
                    borderColor: request.priority === 'urgent' ? designTokens.colors.error : designTokens.colors.warning,
                  }
                ]}
                onPress={() => {
                  setSelectedMaintenanceRequest(request);
                  setShowMaintenanceModal(true);
                }}
                activeOpacity={0.7}
              >
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: designTokens.spacing.md }}>
                  <View style={[
                    sharedStyles.statIcon,
                    request.status === 'resolved' ? iconBackgrounds.green :
                    request.status === 'in_progress' ? iconBackgrounds.blue :
                    request.priority === 'urgent' ? iconBackgrounds.red :
                    iconBackgrounds.orange,
                    { width: 40, height: 40 }
                  ]}>
                    {request.status === 'resolved' ? (
                      <CheckCircle size={20} color="#10B981" />
                    ) : request.status === 'in_progress' ? (
                      <Clock size={20} color="#3B82F6" />
                    ) : (
                      <AlertCircle size={20} color={request.priority === 'urgent' ? "#EF4444" : "#F59E0B"} />
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: designTokens.spacing.xs }}>
                      <Text style={[sharedStyles.statLabel, { fontSize: designTokens.typography.base, marginBottom: 0 }]} numberOfLines={1}>
                        {request.title}
                      </Text>
                      <View style={[
                        sharedStyles.statusBadge,
                        request.status === 'resolved' ? { backgroundColor: designTokens.colors.successLight } :
                        request.status === 'in_progress' ? { backgroundColor: designTokens.colors.infoLight } :
                        request.priority === 'urgent' ? { backgroundColor: designTokens.colors.errorLight } :
                        { backgroundColor: designTokens.colors.warningLight }
                      ]}>
                        <Text style={[
                          sharedStyles.statusText,
                          request.status === 'resolved' ? { color: designTokens.colors.success } :
                          request.status === 'in_progress' ? { color: designTokens.colors.info } :
                          request.priority === 'urgent' ? { color: designTokens.colors.error } :
                          { color: designTokens.colors.warning }
                        ]}>
                          {request.status.replace('_', ' ')}
                        </Text>
                      </View>
                    </View>
                    <Text style={[sharedStyles.statSubtitle, { marginBottom: designTokens.spacing.xs }]} numberOfLines={2}>
                      {request.description}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: designTokens.spacing.sm, flexWrap: 'wrap' }}>
                      <Text style={[sharedStyles.statSubtitle, { fontSize: designTokens.typography.xs, marginBottom: 0 }]}>
                        {request.category.replace('_', ' ')} • {request.priority}
                      </Text>
                      {(request.photos.length > 0 || request.videos.length > 0) && (
                        <Text style={[sharedStyles.statSubtitle, { fontSize: designTokens.typography.xs, marginBottom: 0, color: designTokens.colors.info }]}>
                          📷 {request.photos.length} photo{request.photos.length > 1 ? 's' : ''}
                          {request.videos.length > 0 && ` • 🎥 ${request.videos.length} video${request.videos.length > 1 ? 's' : ''}`}
                        </Text>
                      )}
                    </View>
                    <Text style={[sharedStyles.statSubtitle, { fontSize: designTokens.typography.xs, marginTop: designTokens.spacing.xs, marginBottom: 0 }]}>
                      {new Date(request.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </Text>
                  </View>
                  <ChevronRight size={16} color={designTokens.colors.textMuted} />
                </View>
              </TouchableOpacity>
            ))}
            {maintenanceRequests.length > 3 && (
              <TouchableOpacity
                style={[sharedStyles.card, { padding: designTokens.spacing.md, alignItems: 'center' }]}
                onPress={() => {
                  setSelectedMaintenanceRequest(null);
                  setShowMaintenanceModal(true);
                }}
                activeOpacity={0.7}
              >
                <Text style={{ fontSize: designTokens.typography.sm, color: designTokens.colors.primary, fontWeight: designTokens.typography.semibold as any }}>
                  View All {maintenanceRequests.length} Request{maintenanceRequests.length > 1 ? 's' : ''} →
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      <View style={{ marginBottom: designTokens.spacing['2xl'] }}>
        {/* Section Header with Divider */}
        <View style={{ 
          flexDirection: 'row', 
          alignItems: 'center', 
          marginBottom: designTokens.spacing.lg,
          paddingBottom: designTokens.spacing.md,
          borderBottomWidth: 2,
          borderBottomColor: designTokens.colors.borderLight,
        }}>
          <View style={[sharedStyles.statIcon, iconBackgrounds.blue, { marginRight: designTokens.spacing.md }]}>
            <Calendar size={20} color="#3B82F6" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[sharedStyles.sectionTitle, { marginBottom: 0 }]}>Recent Activity</Text>
            <Text style={{
              fontSize: designTokens.typography.sm,
              color: designTokens.colors.textSecondary,
              marginTop: designTokens.spacing.xs,
            }}>
              Latest listings and updates
            </Text>
          </View>
          {listings.length > 0 && (
            <TouchableOpacity 
              onPress={() => router.push('/(owner)/listings')}
              style={{
                paddingHorizontal: designTokens.spacing.md,
                paddingVertical: designTokens.spacing.xs,
                borderRadius: designTokens.borderRadius.md,
                backgroundColor: designTokens.colors.primary + '15',
              }}
            >
              <Text style={{ fontSize: designTokens.typography.sm, color: designTokens.colors.primary, fontWeight: designTokens.typography.semibold as any }}>
                View All
              </Text>
            </TouchableOpacity>
          )}
        </View>
        
        {listings.length === 0 ? (
          <View style={[sharedStyles.emptyState, { padding: designTokens.spacing['3xl'] }]}>
            <View style={[sharedStyles.statIconLarge, iconBackgrounds.blue, { marginBottom: designTokens.spacing.lg }]}>
              <Home size={32} color="#3B82F6" />
            </View>
            <Text style={[sharedStyles.emptyStateTitle, { fontSize: designTokens.typography.xl }]}>No listings yet</Text>
            <Text style={[sharedStyles.emptyStateText, { marginTop: designTokens.spacing.sm }]}>Create your first property listing to get started</Text>
            <TouchableOpacity 
              style={[sharedStyles.primaryButton, { marginTop: designTokens.spacing.xl }]}
              onPress={() => router.push('/(owner)/create-listing')}
            >
              <Plus size={18} color="white" />
              <Text style={[sharedStyles.primaryButtonText, { fontSize: designTokens.typography.base }]}>Create Listing</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={sharedStyles.card}>
            {listings[0]?.coverPhoto && (
              <View style={{ width: '100%', height: 180, borderRadius: designTokens.borderRadius.lg, overflow: 'hidden', marginBottom: designTokens.spacing.lg }}>
                <Image 
                  source={{ uri: listings[0].coverPhoto }} 
                  style={{ width: '100%', height: '100%' }}
                  resizeMode="cover"
                  showSkeleton={true}
                  fallbackIcon="home"
                />
              </View>
            )}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: designTokens.spacing.sm }}>
              <View style={[sharedStyles.statIcon, iconBackgrounds.green, { marginRight: designTokens.spacing.sm }]}>
                <Home size={18} color="#10B981" />
              </View>
              <Text style={[sharedStyles.statLabel, { fontSize: designTokens.typography.lg, marginBottom: 0, flex: 1 }]}>
                {listings[0]?.propertyType || 'Property Listing'}
              </Text>
            </View>
            <Text style={[sharedStyles.statSubtitle, { marginBottom: designTokens.spacing.md, fontSize: designTokens.typography.base }]}>
              {listings[0]?.address || 'Location'}
            </Text>
            <View style={{ flexDirection: 'row', gap: designTokens.spacing.lg, marginBottom: designTokens.spacing.md, flexWrap: 'wrap' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: designTokens.colors.background, paddingHorizontal: designTokens.spacing.sm, paddingVertical: designTokens.spacing.xs, borderRadius: designTokens.borderRadius.md }}>
                <Eye size={14} color={designTokens.colors.textMuted} />
                <Text style={[sharedStyles.statSubtitle, { marginLeft: 4, marginBottom: 0 }]}>{listings[0]?.views || 0} views</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: designTokens.colors.background, paddingHorizontal: designTokens.spacing.sm, paddingVertical: designTokens.spacing.xs, borderRadius: designTokens.borderRadius.md }}>
                <MessageSquare size={14} color={designTokens.colors.textMuted} />
                <Text style={[sharedStyles.statSubtitle, { marginLeft: 4, marginBottom: 0 }]}>{listings[0]?.inquiries || 0} inquiries</Text>
              </View>
            </View>
            <View style={{ borderTopWidth: 1, borderTopColor: designTokens.colors.borderLight, paddingTop: designTokens.spacing.md }}>
              <Text style={[sharedStyles.statValue, { color: designTokens.colors.success, fontSize: designTokens.typography.xl }]}>
                ₱{listings[0]?.monthlyRent?.toLocaleString() || '0'}/month
              </Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );

  const renderListings = () => (
    <View style={sharedStyles.pageContainer}>
      <View style={sharedStyles.pageHeader}>
        <Text style={sharedStyles.pageTitle}>My Listings</Text>
        <TouchableOpacity 
          style={sharedStyles.primaryButton}
          onPress={() => router.push('/(owner)/create-listing')}
        >
          <Plus size={16} color="white" />
          <Text style={sharedStyles.primaryButtonText}>Add New</Text>
        </TouchableOpacity>
      </View>

      {listings.length === 0 ? (
        <View style={sharedStyles.emptyState}>
          <View style={[sharedStyles.statIcon, iconBackgrounds.blue, { marginBottom: designTokens.spacing.lg }]}>
            <List size={32} color="#3B82F6" />
          </View>
          <Text style={sharedStyles.emptyStateTitle}>No listings yet</Text>
          <Text style={sharedStyles.emptyStateText}>
            Create your first property listing to start attracting tenants
          </Text>
          <TouchableOpacity 
            style={[sharedStyles.primaryButton, { marginTop: designTokens.spacing.lg }]}
            onPress={() => router.push('/(owner)/create-listing')}
          >
            <Plus size={16} color="white" />
            <Text style={sharedStyles.primaryButtonText}>Create Your First Listing</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={sharedStyles.list}>
          {listings.map((listing) => (
            <View key={listing.id} style={sharedStyles.card}>
              <View style={{ flexDirection: 'row', marginBottom: designTokens.spacing.lg }}>
                {/* Cover Photo */}
                <View style={{ width: 80, height: 80, marginRight: designTokens.spacing.md, borderRadius: 8, overflow: 'hidden' }}>
                  {listing.coverPhoto ? (
                    <Image 
                      source={{ uri: listing.coverPhoto }} 
                      style={{ width: '100%', height: '100%' }}
                      resizeMode="cover"
                      showSkeleton={true}
                      fallbackIcon="home"
                      borderRadius={8}
                      onError={() => {
                        console.log('❌ Owner dashboard image load error for:', listing.id);
                      }}
                      onLoad={() => {
                        console.log('✅ Owner dashboard image loaded successfully for:', listing.id);
                      }}
                    />
                  ) : (
                    <View style={{ width: '100%', height: '100%', backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' }}>
                      <Home size={24} color="#9CA3AF" />
                    </View>
                  )}
                </View>
                
                <View style={{ flex: 1 }}>
                  <Text style={[sharedStyles.statLabel, { marginBottom: 4, fontSize: designTokens.typography.lg }]}>
                    {listing.propertyType}
                  </Text>
                  <Text style={sharedStyles.statSubtitle}>{listing.address}</Text>
                  <Text style={[sharedStyles.statValue, { color: designTokens.colors.success, fontSize: designTokens.typography.lg }]}>
                    ₱{listing.monthlyRent.toLocaleString()}/month
                  </Text>
                </View>
              </View>
              
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: designTokens.spacing.lg }}>
                <View style={{ alignItems: 'flex-end' }}>
                  <View style={[
                    sharedStyles.statusBadge, 
                    listing.status === 'published' ? 
                      { backgroundColor: designTokens.colors.successLight } : 
                      { backgroundColor: designTokens.colors.border }
                  ]}>
                    <Text style={[
                      sharedStyles.statusText,
                      listing.status === 'published' ? 
                        { color: designTokens.colors.success } : 
                        { color: designTokens.colors.textSecondary }
                    ]}>
                      {listing.status}
                    </Text>
                  </View>
                </View>
              </View>
              
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flexDirection: 'row', gap: designTokens.spacing.lg }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Eye size={14} color={designTokens.colors.textMuted} />
                    <Text style={[sharedStyles.statSubtitle, { marginLeft: 4 }]}>
                      {listing.views || 0} views
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <MessageSquare size={14} color={designTokens.colors.textMuted} />
                    <Text style={[sharedStyles.statSubtitle, { marginLeft: 4 }]}>
                      {listing.inquiries || 0} inquiries
                    </Text>
                  </View>
                </View>
                
                <View style={{ flexDirection: 'row', gap: designTokens.spacing.sm }}>
                  <TouchableOpacity 
                    style={[sharedStyles.secondaryButton, { paddingHorizontal: designTokens.spacing.md, paddingVertical: designTokens.spacing.xs }]}
                    onPress={() => router.push(`/(owner)/edit-listing/${listing.id}` as any)}
                  >
                    <Text style={[sharedStyles.secondaryButtonText, { color: designTokens.colors.info }]}>
                      Edit
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[sharedStyles.secondaryButton, { paddingHorizontal: designTokens.spacing.md, paddingVertical: designTokens.spacing.xs }]}
                    onPress={() => router.push(`/property-preview?id=${listing.id}`)}
                  >
                    <Text style={[sharedStyles.secondaryButtonText, { color: designTokens.colors.success }]}>
                      View
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  const renderBookings = () => (
    <View style={sharedStyles.pageContainer}>
      <Text style={sharedStyles.pageTitle}>Booking Management</Text>
      
      {bookings.length === 0 ? (
        <View style={sharedStyles.emptyState}>
          <View style={[sharedStyles.statIcon, iconBackgrounds.orange, { marginBottom: designTokens.spacing.lg }]}>
            <Calendar size={32} color="#F59E0B" />
          </View>
          <Text style={sharedStyles.emptyStateTitle}>No bookings yet</Text>
          <Text style={sharedStyles.emptyStateText}>
            Booking requests from tenants will appear here
          </Text>
        </View>
      ) : (
        <View style={sharedStyles.list}>
          {bookings.map((booking) => (
            <View key={booking.id} style={sharedStyles.card}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: designTokens.spacing.lg }}>
                <View style={{ flex: 1 }}>
                  <Text style={[sharedStyles.statLabel, { marginBottom: 4, fontSize: designTokens.typography.lg }]}>
                    {booking.propertyTitle}
                  </Text>
                  <TouchableOpacity 
                    onPress={() => handleViewTenantInfo(booking)}
                    activeOpacity={0.7}
                    style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}
                  >
                    <Text style={sharedStyles.statSubtitle}>Tenant: {booking.tenantName} </Text>
                    <View style={{ backgroundColor: designTokens.colors.infoLight, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                      <User size={12} color={designTokens.colors.info} />
                    </View>
                  </TouchableOpacity>
                  {booking.tenantAddress && (
                    <Text style={sharedStyles.statSubtitle}>{booking.tenantAddress}</Text>
                  )}
                  <Text style={sharedStyles.statSubtitle}>{booking.tenantPhone}</Text>
                  {booking.tenantType && (
                    <Text style={sharedStyles.statSubtitle}>
                      Type: {booking.tenantType.charAt(0).toUpperCase() + booking.tenantType.slice(1)}
                      {booking.numberOfPeople && (booking.tenantType === 'family' || booking.tenantType === 'group') && (
                        <Text style={{ fontWeight: '600' }}>
                          {' '}({booking.numberOfPeople} {booking.numberOfPeople === 1 ? 'person' : 'people'})
                        </Text>
                      )}
                    </Text>
                  )}
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <View style={[
                    sharedStyles.statusBadge,
                    booking.status === 'approved' ? { backgroundColor: designTokens.colors.successLight } :
                    booking.status === 'rejected' ? { backgroundColor: designTokens.colors.errorLight } : 
                    { backgroundColor: designTokens.colors.warningLight }
                  ]}>
                    <Text style={[
                      sharedStyles.statusText,
                      booking.status === 'approved' ? { color: designTokens.colors.success } :
                      booking.status === 'rejected' ? { color: designTokens.colors.error } : 
                      { color: designTokens.colors.warning }
                    ]}>
                      {booking.status}
                    </Text>
                  </View>
                </View>
              </View>
              
              <View style={{ borderTopWidth: 1, borderTopColor: designTokens.colors.borderLight, paddingTop: designTokens.spacing.lg }}>
                {booking.selectedRoom !== undefined && (
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: designTokens.spacing.sm }}>
                    <Text style={sharedStyles.statSubtitle}>Selected Room:</Text>
                    <Text style={[sharedStyles.statValue, { fontSize: designTokens.typography.base, color: '#10B981', fontWeight: '600' }]}>
                      Room {booking.selectedRoom + 1}
                    </Text>
                  </View>
                )}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: designTokens.spacing.sm }}>
                  <Text style={sharedStyles.statSubtitle}>Monthly Rent:</Text>
                  <Text style={[sharedStyles.statValue, { fontSize: designTokens.typography.base }]}>
                    ₱{booking.monthlyRent.toLocaleString()}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: designTokens.spacing.sm }}>
                  <Text style={sharedStyles.statSubtitle}>Total Amount:</Text>
                  <Text style={[sharedStyles.statValue, { fontSize: designTokens.typography.base, color: designTokens.colors.success }]}>
                    ₱{booking.totalAmount.toLocaleString()}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: designTokens.spacing.lg }}>
                  <Text style={sharedStyles.statSubtitle}>Duration:</Text>
                  <Text style={[sharedStyles.statValue, { fontSize: designTokens.typography.base }]}>
                    {booking.startDate} to {booking.endDate}
                  </Text>
                </View>
                
                <View style={{ flexDirection: 'row', gap: designTokens.spacing.md }}>
                  
                  {/* Approve/Reject buttons - Only for pending bookings */}
                  {booking.status === 'pending' && (
                    <>
                      <TouchableOpacity 
                        style={[sharedStyles.primaryButton, { flex: 1, backgroundColor: designTokens.colors.success, paddingVertical: designTokens.spacing.md }]}
                        onPress={() => handleBookingAction(booking.id, 'approve')}
                      >
                        <Text style={sharedStyles.primaryButtonText}>Approve</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={[sharedStyles.primaryButton, { flex: 1, backgroundColor: designTokens.colors.error, paddingVertical: designTokens.spacing.md }]}
                        onPress={() => handleBookingAction(booking.id, 'reject')}
                      >
                        <Text style={sharedStyles.primaryButtonText}>Reject</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  const renderMessages = () => (
    <View style={sharedStyles.pageContainer}>
      <Text style={sharedStyles.pageTitle}>Messages</Text>
      
      {messages.length === 0 ? (
        <View style={sharedStyles.emptyState}>
          <View style={[sharedStyles.statIcon, iconBackgrounds.teal, { marginBottom: designTokens.spacing.lg }]}>
            <MessageSquare size={32} color="#10B981" />
          </View>
          <Text style={sharedStyles.emptyStateTitle}>No messages yet</Text>
          <Text style={sharedStyles.emptyStateText}>
            Messages from tenants will appear here
          </Text>
        </View>
      ) : (
        <View style={sharedStyles.list}>
          {messages.map((message) => (
            <TouchableOpacity 
              key={message.id}
              style={[
                sharedStyles.card,
                !message.isRead && { backgroundColor: designTokens.colors.infoLight }
              ]}
              onPress={() => router.push(`/(owner)/chat-room/${message.conversationId}` as any)}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: designTokens.spacing.sm }}>
                <Text style={[sharedStyles.statLabel, { marginBottom: 0, fontSize: designTokens.typography.lg }]}>
                  {message.tenantName}
                </Text>
                <Text style={sharedStyles.statSubtitle}>
                  {new Date(message.createdAt).toLocaleDateString()}
                </Text>
              </View>
              
              {message.propertyTitle && (
                <Text style={[sharedStyles.statSubtitle, { color: designTokens.colors.info, fontWeight: '500', marginBottom: designTokens.spacing.sm }]}>
                  {message.propertyTitle}
                </Text>
              )}
              
              <Text style={[sharedStyles.statSubtitle, { color: designTokens.colors.textPrimary }]} numberOfLines={2}>
                {message.text}
              </Text>
              
              {!message.isRead && (
                <View style={{ 
                  backgroundColor: designTokens.colors.info, 
                  width: 8, 
                  height: 8, 
                  borderRadius: 4, 
                  marginTop: designTokens.spacing.sm 
                }} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );


  if (loading) {
    return (
      <View style={sharedStyles.loadingContainer}>
        <Text style={sharedStyles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <View style={sharedStyles.container}>
      <ScrollView 
        style={sharedStyles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {renderOverview()}
      </ScrollView>

      {/* Download Analytics Modal */}
      <Modal
        visible={downloadModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setDownloadModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <TouchableOpacity
            style={{
              flex: 1,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              justifyContent: 'flex-end',
            }}
            activeOpacity={1}
            onPress={() => setDownloadModalVisible(false)}
          >
            <TouchableOpacity
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
              style={{
                backgroundColor: designTokens.colors.background,
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                maxHeight: '90%',
              }}
            >
              <ScrollView
                style={{ maxHeight: '90%' }}
                contentContainerStyle={{
                  padding: designTokens.spacing.xl,
                }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={true}
              >
                {/* Header */}
                <View style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: designTokens.spacing.xl,
                }}>
                  <View style={{ flex: 1 }}>
                    <Text style={[sharedStyles.sectionTitle, { marginBottom: designTokens.spacing.xs }]}>
                      Download Analytics Report
                    </Text>
                    <Text style={{
                      fontSize: designTokens.typography.sm,
                      color: designTokens.colors.textSecondary,
                    }}>
                      Select a time period to export your analytics
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setDownloadModalVisible(false)}
                    style={{
                      padding: designTokens.spacing.sm,
                      borderRadius: 8,
                    }}
                    activeOpacity={0.7}
                  >
                    <X size={24} color={designTokens.colors.textMuted} />
                  </TouchableOpacity>
                </View>

                {/* Period Selection */}
                <View style={{ marginBottom: designTokens.spacing.xl }}>
                  <Text style={[sharedStyles.statLabel, { marginBottom: designTokens.spacing.md }]}>
                    Select Time Period
                  </Text>
                  <View style={{ gap: designTokens.spacing.sm }}>
                    {(['weekly', 'monthly', 'yearly', 'custom'] as const).map((period) => (
                      <TouchableOpacity
                        key={period}
                        onPress={() => setSelectedPeriod(period)}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          padding: designTokens.spacing.md,
                          borderRadius: 12,
                          backgroundColor: selectedPeriod === period 
                            ? designTokens.colors.primary + '15' 
                            : designTokens.colors.white,
                          borderWidth: 2,
                          borderColor: selectedPeriod === period 
                            ? designTokens.colors.primary 
                            : 'transparent',
                        }}
                        activeOpacity={0.7}
                      >
                        <View style={{
                          width: 20,
                          height: 20,
                          borderRadius: 10,
                          borderWidth: 2,
                          borderColor: selectedPeriod === period 
                            ? designTokens.colors.primary 
                            : designTokens.colors.borderLight,
                          backgroundColor: selectedPeriod === period 
                            ? designTokens.colors.primary 
                            : 'transparent',
                          marginRight: designTokens.spacing.md,
                        }} />
                        <Text style={[sharedStyles.statLabel, {
                          textTransform: 'capitalize',
                          color: selectedPeriod === period 
                            ? designTokens.colors.primary 
                            : designTokens.colors.textPrimary,
                        }]}>
                          {period === 'weekly' ? 'Last 7 Days' : period === 'monthly' ? 'This Month' : period === 'yearly' ? 'This Year' : 'Custom Date Range'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Custom Date Range Inputs */}
                {selectedPeriod === 'custom' && (
                  <View style={{ marginBottom: designTokens.spacing.xl }}>
                    <Text style={[sharedStyles.statLabel, { marginBottom: designTokens.spacing.md }]}>
                      Select Date Range
                    </Text>
                    <View style={{ gap: designTokens.spacing.md }}>
                      <View>
                        <Text style={[sharedStyles.statSubtitle, { marginBottom: designTokens.spacing.xs }]}>
                          Start Date
                        </Text>
                        <TouchableOpacity
                          onPress={() => setShowStartDatePicker(true)}
                          style={{
                            padding: designTokens.spacing.md,
                            borderRadius: 8,
                            backgroundColor: designTokens.colors.white,
                            borderWidth: 1,
                            borderColor: designTokens.colors.borderLight,
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}
                          activeOpacity={0.7}
                        >
                          <Text style={{
                            fontSize: designTokens.typography.base,
                            color: customStartDate ? designTokens.colors.textPrimary : designTokens.colors.textMuted,
                          }}>
                            {customStartDate 
                              ? customStartDate.toLocaleDateString('en-US', { 
                                  year: 'numeric', 
                                  month: 'short', 
                                  day: 'numeric' 
                                })
                              : 'Select start date'}
                          </Text>
                          <Calendar size={20} color={designTokens.colors.textMuted} />
                        </TouchableOpacity>
                      </View>
                      <View>
                        <Text style={[sharedStyles.statSubtitle, { marginBottom: designTokens.spacing.xs }]}>
                          End Date
                        </Text>
                        <TouchableOpacity
                          onPress={() => setShowEndDatePicker(true)}
                          style={{
                            padding: designTokens.spacing.md,
                            borderRadius: 8,
                            backgroundColor: designTokens.colors.white,
                            borderWidth: 1,
                            borderColor: designTokens.colors.borderLight,
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}
                          activeOpacity={0.7}
                        >
                          <Text style={{
                            fontSize: designTokens.typography.base,
                            color: customEndDate ? designTokens.colors.textPrimary : designTokens.colors.textMuted,
                          }}>
                            {customEndDate 
                              ? customEndDate.toLocaleDateString('en-US', { 
                                  year: 'numeric', 
                                  month: 'short', 
                                  day: 'numeric' 
                                })
                              : 'Select end date'}
                          </Text>
                          <Calendar size={20} color={designTokens.colors.textMuted} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                )}

                {/* Download Button */}
                <TouchableOpacity
                  onPress={handleDownloadAnalytics}
                  disabled={exporting || (selectedPeriod === 'custom' && (!customStartDate || !customEndDate))}
                  style={[
                    sharedStyles.primaryButton,
                    {
                      opacity: exporting || (selectedPeriod === 'custom' && (!customStartDate || !customEndDate)) ? 0.5 : 1,
                      flexDirection: 'row',
                      justifyContent: 'center',
                      alignItems: 'center',
                      gap: designTokens.spacing.sm,
                      marginTop: designTokens.spacing.md,
                    }
                  ]}
                  activeOpacity={0.7}
                >
                  {exporting ? (
                    <>
                      <Text style={sharedStyles.primaryButtonText}>Generating Report...</Text>
                    </>
                  ) : (
                    <>
                      <Download size={20} color="#FFFFFF" />
                      <Text style={sharedStyles.primaryButtonText}>Download Report</Text>
                    </>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      {/* Start Date Picker Modal */}
      <Modal
        visible={showStartDatePicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowStartDatePicker(false)}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          <View style={{
            backgroundColor: designTokens.colors.background,
            borderRadius: 16,
            padding: designTokens.spacing.xl,
            width: '90%',
            maxWidth: 400,
          }}>
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: designTokens.spacing.lg,
            }}>
              <Text style={[sharedStyles.sectionTitle, { marginBottom: 0 }]}>
                Select Start Date
              </Text>
              <TouchableOpacity
                onPress={() => setShowStartDatePicker(false)}
                style={{ padding: designTokens.spacing.sm }}
                activeOpacity={0.7}
              >
                <X size={24} color={designTokens.colors.textMuted} />
              </TouchableOpacity>
            </View>
            <SimpleDatePicker
              selectedDate={customStartDate || new Date()}
              onDateSelect={(date) => {
                setCustomStartDate(date);
                setShowStartDatePicker(false);
              }}
            />
          </View>
        </View>
      </Modal>

      {/* End Date Picker Modal */}
      <Modal
        visible={showEndDatePicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowEndDatePicker(false)}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          <View style={{
            backgroundColor: designTokens.colors.background,
            borderRadius: 16,
            padding: designTokens.spacing.xl,
            width: '90%',
            maxWidth: 400,
          }}>
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: designTokens.spacing.lg,
            }}>
              <Text style={[sharedStyles.sectionTitle, { marginBottom: 0 }]}>
                Select End Date
              </Text>
              <TouchableOpacity
                onPress={() => setShowEndDatePicker(false)}
                style={{ padding: designTokens.spacing.sm }}
                activeOpacity={0.7}
              >
                <X size={24} color={designTokens.colors.textMuted} />
              </TouchableOpacity>
            </View>
            <SimpleDatePicker
              selectedDate={customEndDate || new Date()}
              onDateSelect={(date) => {
                setCustomEndDate(date);
                setShowEndDatePicker(false);
              }}
            />
          </View>
        </View>
      </Modal>

      {/* Profile Photo Modal */}
      <Modal
        visible={showProfilePhotoModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setShowProfilePhotoModal(false);
        }}
      >
        <TouchableOpacity
          style={{
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            justifyContent: 'flex-end',
            alignItems: 'center',
          }}
          activeOpacity={1}
          onPress={() => {
            setShowProfilePhotoModal(false);
          }}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            style={{
              backgroundColor: designTokens.colors.white,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: designTokens.spacing.lg,
              width: '100%',
              maxHeight: '50%',
              ...designTokens.shadows.lg,
            }}
          >
            {/* Header */}
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: designTokens.spacing.md,
            }}>
            <Text style={{
              fontSize: designTokens.typography.base,
              fontWeight: designTokens.typography.bold as any,
              color: designTokens.colors.textPrimary,
            }}>
              Profile Photo
            </Text>
              <TouchableOpacity
                onPress={() => {
                  setShowProfilePhotoModal(false);
                }}
                style={{ padding: designTokens.spacing.xs }}
                activeOpacity={0.7}
              >
                <X size={18} color={designTokens.colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Current Photo - Compact */}
            <View style={{
              alignItems: 'center',
              marginBottom: designTokens.spacing.md,
            }}>
              {profilePhoto && !profilePhotoError ? (
                <Image
                  source={{ uri: profilePhoto }}
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: 40,
                    borderWidth: 2,
                    borderColor: designTokens.colors.primary,
                  }}
                  onError={() => setProfilePhotoError(true)}
                />
              ) : (
                <View style={{
                  width: 80,
                  height: 80,
                  borderRadius: 40,
                  backgroundColor: designTokens.colors.primary + '20',
                  justifyContent: 'center',
                  alignItems: 'center',
                  borderWidth: 2,
                  borderColor: designTokens.colors.primary,
                }}>
                  <User size={40} color={designTokens.colors.primary} />
                </View>
              )}
            </View>

            {/* Action Buttons - Compact */}
            <View style={{ gap: designTokens.spacing.xs }}>
              <TouchableOpacity
                onPress={() => handlePhotoAction('gallery')}
                disabled={savingPhoto}
                style={[
                  sharedStyles.primaryButton,
                  {
                    opacity: savingPhoto ? 0.5 : 1,
                    flexDirection: 'row',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: designTokens.spacing.xs,
                    paddingVertical: designTokens.spacing.sm,
                  }
                ]}
                activeOpacity={0.7}
              >
                {savingPhoto ? (
                  <Text style={[sharedStyles.primaryButtonText, { fontSize: designTokens.typography.sm }]}>Uploading...</Text>
                ) : (
                  <>
                    <User size={16} color="#FFFFFF" />
                    <Text style={[sharedStyles.primaryButtonText, { fontSize: designTokens.typography.sm }]}>
                      {profilePhoto ? 'Change Photo' : 'Select Photo'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              {profilePhoto && (
                <TouchableOpacity
                  onPress={() => handlePhotoAction('remove')}
                  disabled={savingPhoto}
                  style={{
                    padding: designTokens.spacing.sm,
                    borderRadius: designTokens.borderRadius.md,
                    borderWidth: 1,
                    borderColor: designTokens.colors.error,
                    backgroundColor: 'transparent',
                    flexDirection: 'row',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: designTokens.spacing.xs,
                    opacity: savingPhoto ? 0.5 : 1,
                  }}
                  activeOpacity={0.7}
                >
                  <X size={14} color={designTokens.colors.error} />
                  <Text style={{
                    color: designTokens.colors.error,
                    fontWeight: '600',
                    fontSize: designTokens.typography.xs,
                  }}>
                    Remove Photo
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Tenant Info Modal */}
      {selectedTenant && (
        <TenantInfoModal
          visible={modalVisible}
          tenantId={selectedTenant.id}
          tenantName={selectedTenant.name}
          tenantEmail={selectedTenant.email}
          tenantPhone={selectedTenant.phone}
          tenantAvatar={selectedTenant.avatar}
          onClose={closeModal}
        />
      )}

      {/* Maintenance Request Modal */}
      <Modal
        visible={showMaintenanceModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowMaintenanceModal(false);
          setSelectedMaintenanceRequest(null);
        }}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          justifyContent: 'flex-end',
        }}>
          <View style={{
            backgroundColor: designTokens.colors.white,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            maxHeight: Dimensions.get('window').height * 0.9,
            height: Dimensions.get('window').height * 0.9,
            ...designTokens.shadows.xl,
            flexDirection: 'column',
          }}>
            {selectedMaintenanceRequest ? (
              <>
                {/* Header */}
                <View style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: designTokens.spacing.xl,
                  borderBottomWidth: 1,
                  borderBottomColor: designTokens.colors.border,
                  flexShrink: 0,
                }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{
                      fontSize: designTokens.typography['2xl'],
                      fontWeight: designTokens.typography.bold as any,
                      color: designTokens.colors.textPrimary,
                      marginBottom: designTokens.spacing.xs,
                    }}>
                      {selectedMaintenanceRequest.title}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: designTokens.spacing.sm, flexWrap: 'wrap' }}>
                      <View style={[
                        sharedStyles.statusBadge,
                        selectedMaintenanceRequest.status === 'resolved' ? { backgroundColor: designTokens.colors.successLight } :
                        selectedMaintenanceRequest.status === 'in_progress' ? { backgroundColor: designTokens.colors.infoLight } :
                        selectedMaintenanceRequest.priority === 'urgent' ? { backgroundColor: designTokens.colors.errorLight } :
                        { backgroundColor: designTokens.colors.warningLight }
                      ]}>
                        <Text style={[
                          sharedStyles.statusText,
                          selectedMaintenanceRequest.status === 'resolved' ? { color: designTokens.colors.success } :
                          selectedMaintenanceRequest.status === 'in_progress' ? { color: designTokens.colors.info } :
                          selectedMaintenanceRequest.priority === 'urgent' ? { color: designTokens.colors.error } :
                          { color: designTokens.colors.warning }
                        ]}>
                          {selectedMaintenanceRequest.status.replace('_', ' ')}
                        </Text>
                      </View>
                      <Text style={{
                        fontSize: designTokens.typography.xs,
                        color: designTokens.colors.textSecondary,
                      }}>
                        {selectedMaintenanceRequest.category.replace('_', ' ')} • {selectedMaintenanceRequest.priority}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      setShowMaintenanceModal(false);
                      setSelectedMaintenanceRequest(null);
                    }}
                    style={{
                      padding: designTokens.spacing.sm,
                      marginLeft: designTokens.spacing.md,
                    }}
                    activeOpacity={0.7}
                  >
                    <X size={24} color={designTokens.colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                {/* Content */}
                <ScrollView
                  style={{
                    flex: 1,
                    backgroundColor: designTokens.colors.white,
                  }}
                  contentContainerStyle={{
                    padding: designTokens.spacing.xl,
                    minHeight: 200,
                  }}
                  showsVerticalScrollIndicator={true}
                >
                  <View style={{ gap: designTokens.spacing.lg }}>
                    {/* Description */}
                    <View>
                      <Text style={{
                        fontSize: designTokens.typography.sm,
                        fontWeight: designTokens.typography.semibold as any,
                        color: designTokens.colors.textSecondary,
                        marginBottom: designTokens.spacing.sm,
                        textTransform: 'uppercase',
                        letterSpacing: 0.5,
                      }}>
                        Description
                      </Text>
                      <Text style={{
                        fontSize: designTokens.typography.base,
                        color: designTokens.colors.textPrimary,
                        lineHeight: 22,
                      }}>
                        {selectedMaintenanceRequest.description}
                      </Text>
                    </View>

                    {/* Photos */}
                    {selectedMaintenanceRequest.photos.length > 0 && (
                      <View>
                        <Text style={{
                          fontSize: designTokens.typography.sm,
                          fontWeight: designTokens.typography.semibold as any,
                          color: designTokens.colors.textSecondary,
                          marginBottom: designTokens.spacing.md,
                          textTransform: 'uppercase',
                          letterSpacing: 0.5,
                        }}>
                          Photos ({selectedMaintenanceRequest.photos.length})
                        </Text>
                        {selectedMaintenanceRequest.photos.length === 1 ? (
                          <TouchableOpacity
                            activeOpacity={0.9}
                            onPress={() => setSelectedPhotoIndex(0)}
                            style={{
                              width: '100%',
                              aspectRatio: 1,
                              borderRadius: 12,
                              overflow: 'hidden',
                              backgroundColor: designTokens.colors.borderLight,
                            }}
                          >
                            <Image
                              source={{ uri: selectedMaintenanceRequest.photos[0] }}
                              style={{
                                width: '100%',
                                height: '100%',
                              }}
                              resizeMode="cover"
                            />
                          </TouchableOpacity>
                        ) : selectedMaintenanceRequest.photos.length === 2 ? (
                          <View style={{ flexDirection: 'row', gap: designTokens.spacing.sm }}>
                            {selectedMaintenanceRequest.photos.map((photo, index) => (
                              <TouchableOpacity
                                key={index}
                                activeOpacity={0.9}
                                onPress={() => setSelectedPhotoIndex(index)}
                                style={{
                                  flex: 1,
                                  aspectRatio: 1,
                                  borderRadius: 12,
                                  overflow: 'hidden',
                                  backgroundColor: designTokens.colors.borderLight,
                                }}
                              >
                                <Image
                                  source={{ uri: photo }}
                                  style={{
                                    width: '100%',
                                    height: '100%',
                                  }}
                                  resizeMode="cover"
                                />
                              </TouchableOpacity>
                            ))}
                          </View>
                        ) : (
                          <View>
                            <ScrollView 
                              horizontal 
                              showsHorizontalScrollIndicator={true}
                              contentContainerStyle={{ paddingRight: designTokens.spacing.md }}
                              style={{ marginTop: designTokens.spacing.xs }}
                            >
                              <View style={{ flexDirection: 'row', gap: designTokens.spacing.sm }}>
                                {selectedMaintenanceRequest.photos.map((photo, index) => (
                                  <TouchableOpacity
                                    key={index}
                                    activeOpacity={0.9}
                                    onPress={() => setSelectedPhotoIndex(index)}
                                    style={{
                                      width: 280,
                                      height: 280,
                                      borderRadius: 12,
                                      overflow: 'hidden',
                                      backgroundColor: designTokens.colors.borderLight,
                                    }}
                                  >
                                    <Image
                                      source={{ uri: photo }}
                                      style={{
                                        width: '100%',
                                        height: '100%',
                                      }}
                                      resizeMode="cover"
                                    />
                                  </TouchableOpacity>
                                ))}
                              </View>
                            </ScrollView>
                            {selectedMaintenanceRequest.photos.length > 3 && (
                              <Text style={{
                                fontSize: designTokens.typography.xs,
                                color: designTokens.colors.textMuted,
                                marginTop: designTokens.spacing.xs,
                                textAlign: 'center',
                              }}>
                                Tap to view photos • Swipe to see all {selectedMaintenanceRequest.photos.length}
                              </Text>
                            )}
                          </View>
                        )}
                      </View>
                    )}

                    {/* Videos */}
                    {selectedMaintenanceRequest.videos.length > 0 && (
                      <View>
                        <Text style={{
                          fontSize: designTokens.typography.sm,
                          fontWeight: designTokens.typography.semibold as any,
                          color: designTokens.colors.textSecondary,
                          marginBottom: designTokens.spacing.md,
                          textTransform: 'uppercase',
                          letterSpacing: 0.5,
                        }}>
                          Videos ({selectedMaintenanceRequest.videos.length})
                        </Text>
                        <View style={{ gap: designTokens.spacing.sm }}>
                          {selectedMaintenanceRequest.videos.map((video, index) => (
                            <TouchableOpacity
                              key={index}
                              activeOpacity={0.7}
                              onPress={() => setSelectedVideoIndex(index)}
                              style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                padding: designTokens.spacing.md,
                                backgroundColor: designTokens.colors.background,
                                borderRadius: designTokens.borderRadius.md,
                                borderWidth: 1,
                                borderColor: designTokens.colors.borderLight,
                              }}
                            >
                              <View style={{
                                width: 48,
                                height: 48,
                                borderRadius: 8,
                                backgroundColor: designTokens.colors.primary + '20',
                                justifyContent: 'center',
                                alignItems: 'center',
                                marginRight: designTokens.spacing.md,
                              }}>
                                <Video size={24} color={designTokens.colors.primary} />
                              </View>
                              <View style={{ flex: 1 }}>
                                <Text style={{
                                  fontSize: designTokens.typography.base,
                                  fontWeight: designTokens.typography.semibold as any,
                                  color: designTokens.colors.textPrimary,
                                  marginBottom: 2,
                                }}>
                                  Video {index + 1}
                                </Text>
                                <Text style={{
                                  fontSize: designTokens.typography.xs,
                                  color: designTokens.colors.textSecondary,
                                }}>
                                  Tap to play video
                                </Text>
                              </View>
                              <ChevronRight size={20} color={designTokens.colors.textMuted} />
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                    )}

                    {/* Owner Notes */}
                    {selectedMaintenanceRequest.ownerNotes && (
                      <View>
                        <Text style={{
                          fontSize: designTokens.typography.sm,
                          fontWeight: designTokens.typography.semibold as any,
                          color: designTokens.colors.textSecondary,
                          marginBottom: designTokens.spacing.sm,
                          textTransform: 'uppercase',
                          letterSpacing: 0.5,
                        }}>
                          Your Notes
                        </Text>
                        <Text style={{
                          fontSize: designTokens.typography.base,
                          color: designTokens.colors.textPrimary,
                          lineHeight: 22,
                          backgroundColor: designTokens.colors.infoLight,
                          padding: designTokens.spacing.md,
                          borderRadius: designTokens.borderRadius.md,
                        }}>
                          {selectedMaintenanceRequest.ownerNotes}
                        </Text>
                      </View>
                    )}

                    {/* Created Date */}
                    <View>
                      <Text style={{
                        fontSize: designTokens.typography.xs,
                        color: designTokens.colors.textSecondary,
                      }}>
                        Submitted: {new Date(selectedMaintenanceRequest.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </Text>
                      {selectedMaintenanceRequest.resolvedAt && (
                        <Text style={{
                          fontSize: designTokens.typography.xs,
                          color: designTokens.colors.textSecondary,
                          marginTop: designTokens.spacing.xs,
                        }}>
                          Resolved: {new Date(selectedMaintenanceRequest.resolvedAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </Text>
                      )}
                    </View>
                  </View>
                </ScrollView>

                {/* Actions */}
                <View style={{
                  padding: designTokens.spacing.xl,
                  borderTopWidth: 1,
                  borderTopColor: designTokens.colors.border,
                  gap: designTokens.spacing.sm,
                  flexShrink: 0,
                }}>
                  {selectedMaintenanceRequest.status === 'pending' && (
                    <>
                      <TouchableOpacity
                        style={[sharedStyles.primaryButton, { backgroundColor: designTokens.colors.info }]}
                        onPress={() => handleUpdateMaintenanceStatus(selectedMaintenanceRequest.id, 'in_progress')}
                        disabled={updatingMaintenanceStatus}
                        activeOpacity={0.8}
                      >
                        {updatingMaintenanceStatus ? (
                          <Text style={sharedStyles.primaryButtonText}>Updating...</Text>
                        ) : (
                          <>
                            <Clock size={18} color="#FFFFFF" />
                            <Text style={sharedStyles.primaryButtonText}>Mark as In Progress</Text>
                          </>
                        )}
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[sharedStyles.primaryButton, { backgroundColor: designTokens.colors.success }]}
                        onPress={() => handleUpdateMaintenanceStatus(selectedMaintenanceRequest.id, 'resolved')}
                        disabled={updatingMaintenanceStatus}
                        activeOpacity={0.8}
                      >
                        {updatingMaintenanceStatus ? (
                          <Text style={sharedStyles.primaryButtonText}>Updating...</Text>
                        ) : (
                          <>
                            <CheckCircle size={18} color="#FFFFFF" />
                            <Text style={sharedStyles.primaryButtonText}>Mark as Resolved</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </>
                  )}
                  {selectedMaintenanceRequest.status === 'in_progress' && (
                    <TouchableOpacity
                      style={[sharedStyles.primaryButton, { backgroundColor: designTokens.colors.success }]}
                      onPress={() => handleUpdateMaintenanceStatus(selectedMaintenanceRequest.id, 'resolved')}
                      disabled={updatingMaintenanceStatus}
                      activeOpacity={0.8}
                    >
                      {updatingMaintenanceStatus ? (
                        <Text style={sharedStyles.primaryButtonText}>Updating...</Text>
                      ) : (
                        <>
                          <CheckCircle size={18} color="#FFFFFF" />
                          <Text style={sharedStyles.primaryButtonText}>Mark as Resolved</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}
                  {selectedMaintenanceRequest.status === 'resolved' && (
                    <View style={{
                      backgroundColor: designTokens.colors.successLight,
                      padding: designTokens.spacing.md,
                      borderRadius: designTokens.borderRadius.md,
                      alignItems: 'center',
                    }}>
                      <CheckCircle size={24} color={designTokens.colors.success} />
                      <Text style={{
                        fontSize: designTokens.typography.base,
                        fontWeight: designTokens.typography.semibold as any,
                        color: designTokens.colors.success,
                        marginTop: designTokens.spacing.sm,
                      }}>
                        This request has been resolved
                      </Text>
                    </View>
                  )}
                  <TouchableOpacity
                    style={[sharedStyles.secondaryButton]}
                    onPress={() => {
                      setShowMaintenanceModal(false);
                      setSelectedMaintenanceRequest(null);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={sharedStyles.secondaryButtonText}>Close</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <View style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: designTokens.spacing.xl,
                  borderBottomWidth: 1,
                  borderBottomColor: designTokens.colors.border,
                  flexShrink: 0,
                }}>
                  <Text style={{
                    fontSize: designTokens.typography['2xl'],
                    fontWeight: designTokens.typography.bold as any,
                    color: designTokens.colors.textPrimary,
                  }}>
                    Maintenance Requests
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      setShowMaintenanceModal(false);
                      setSelectedMaintenanceRequest(null);
                    }}
                    activeOpacity={0.7}
                  >
                    <X size={24} color={designTokens.colors.textSecondary} />
                  </TouchableOpacity>
                </View>
                <ScrollView 
                  style={{ flex: 1 }}
                  contentContainerStyle={{ padding: designTokens.spacing.xl }}
                  showsVerticalScrollIndicator={true}
                >
                  {maintenanceRequests.length === 0 ? (
                    <View style={{ alignItems: 'center', paddingVertical: designTokens.spacing['2xl'] }}>
                      <Wrench size={48} color={designTokens.colors.textMuted} />
                      <Text style={{
                        fontSize: designTokens.typography.base,
                        color: designTokens.colors.textSecondary,
                        marginTop: designTokens.spacing.md,
                      }}>
                        No maintenance requests yet
                      </Text>
                    </View>
                  ) : (
                    <View style={{ gap: designTokens.spacing.md }}>
                      {maintenanceRequests.map((request) => (
                        <TouchableOpacity
                          key={request.id}
                          style={[sharedStyles.card, { padding: designTokens.spacing.md }]}
                          onPress={() => setSelectedMaintenanceRequest(request)}
                          activeOpacity={0.7}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: designTokens.spacing.md }}>
                            <View style={[
                              sharedStyles.statIcon,
                              request.status === 'resolved' ? iconBackgrounds.green :
                              request.status === 'in_progress' ? iconBackgrounds.blue :
                              request.priority === 'urgent' ? iconBackgrounds.red :
                              iconBackgrounds.orange,
                            ]}>
                              {request.status === 'resolved' ? (
                                <CheckCircle size={20} color="#10B981" />
                              ) : request.status === 'in_progress' ? (
                                <Clock size={20} color="#3B82F6" />
                              ) : (
                                <AlertCircle size={20} color={request.priority === 'urgent' ? "#EF4444" : "#F59E0B"} />
                              )}
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={[sharedStyles.statLabel, { marginBottom: designTokens.spacing.xs }]}>
                                {request.title}
                              </Text>
                              <Text style={[sharedStyles.statSubtitle, { marginBottom: designTokens.spacing.xs }]} numberOfLines={2}>
                                {request.description}
                              </Text>
                              <Text style={[sharedStyles.statSubtitle, { fontSize: designTokens.typography.xs }]}>
                                {request.category.replace('_', ' ')} • {request.priority} • {request.status.replace('_', ' ')}
                              </Text>
                            </View>
                            <ChevronRight size={16} color={designTokens.colors.textMuted} />
                          </View>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Photo Viewer Modal */}
      <Modal
        visible={(selectedPhotoIndex !== null && selectedMaintenanceRequest !== null) || isPhotoModalClosing}
        transparent
        animationType="fade"
        onRequestClose={() => {
          handleClosePhotoViewer();
        }}
      >
        {selectedPhotoIndex !== null && selectedMaintenanceRequest && !isPhotoModalClosing && (
          <PhotoViewerContent
            photos={selectedMaintenanceRequest.photos}
            initialIndex={selectedPhotoIndex}
            onClose={handleClosePhotoViewer}
            onIndexChange={setCurrentPhotoIndex}
          />
        )}
      </Modal>

      {/* Video Player Modal */}
      <Modal
        visible={selectedVideoIndex !== null && selectedMaintenanceRequest !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedVideoIndex(null)}
      >
        {selectedMaintenanceRequest && selectedVideoIndex !== null && (
          <VideoPlayerModal
            videoUri={selectedMaintenanceRequest.videos[selectedVideoIndex]}
            onClose={() => setSelectedVideoIndex(null)}
          />
        )}
      </Modal>

      {/* Application Status Modal */}
      <ApplicationStatusModal
        visible={showApplicationModal}
        data={applicationModalData}
        onClose={handleCloseApplicationModal}
      />
    </View>
  );
}

// Memoized Photo Item Component
const PhotoItem = React.memo(({ photo }: { photo: string }) => {
  const screenWidth = Dimensions.get('window').width;
  const screenHeight = Dimensions.get('window').height;

  return (
    <View
      style={{
        width: screenWidth,
        height: screenHeight,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <Image
        source={{ uri: photo }}
        style={{
          width: '100%',
          height: '100%',
        }}
        resizeMode="contain"
        showSkeleton={false}
      />
    </View>
  );
}, (prevProps, nextProps) => {
  // Only re-render if the photo URI changes
  return prevProps.photo === nextProps.photo;
});

PhotoItem.displayName = 'PhotoItem';

// Photo Viewer Component
function PhotoViewerContent({ photos, initialIndex, onClose, onIndexChange }: { photos: string[]; initialIndex: number; onClose: () => void; onIndexChange: (index: number) => void }) {
  const flatListRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const screenWidth = Dimensions.get('window').width;
  const screenHeight = Dimensions.get('window').height;

  useEffect(() => {
    if (flatListRef.current && initialIndex !== null) {
      setTimeout(() => {
        try {
          flatListRef.current?.scrollToIndex({
            index: initialIndex,
            animated: false,
          });
          setCurrentIndex(initialIndex);
        } catch (error) {
          // Fallback to scrollToOffset if scrollToIndex fails
          flatListRef.current?.scrollToOffset({
            offset: initialIndex * screenWidth,
            animated: false,
          });
          setCurrentIndex(initialIndex);
        }
      }, 100);
    }
  }, [initialIndex, screenWidth]);

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      const index = viewableItems[0].index;
      if (index !== null && index !== undefined) {
        setCurrentIndex(index);
        onIndexChange(index);
      }
    }
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  const getItemLayout = useCallback(
    (_: any, index: number) => ({
      length: screenWidth,
      offset: screenWidth * index,
      index,
    }),
    [screenWidth]
  );

  const renderItem = useCallback(({ item }: { item: string }) => (
    <PhotoItem photo={item} />
  ), []);

  const keyExtractor = useCallback((item: string, index: number) => `photo-${index}-${item}`, []);

  return (
    <View style={{
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.95)',
      justifyContent: 'center',
      alignItems: 'center',
    }}>
      <TouchableOpacity
        style={{
          position: 'absolute',
          top: 50,
          right: 20,
          zIndex: 10,
          padding: designTokens.spacing.md,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          borderRadius: 24,
        }}
        onPress={onClose}
        activeOpacity={0.7}
      >
        <X size={24} color="#FFFFFF" />
      </TouchableOpacity>
      
      <FlatList
        ref={flatListRef}
        data={photos}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        getItemLayout={getItemLayout}
        initialScrollIndex={initialIndex}
        removeClippedSubviews={false}
        maxToRenderPerBatch={3}
        windowSize={3}
        initialNumToRender={3}
        style={{ flex: 1, width: '100%' }}
      />
      
      {photos.length > 1 && (
        <View style={{
          position: 'absolute',
          bottom: 50,
          alignSelf: 'center',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          paddingHorizontal: designTokens.spacing.md,
          paddingVertical: designTokens.spacing.sm,
          borderRadius: 20,
        }}>
          <Text style={{
            color: '#FFFFFF',
            fontSize: designTokens.typography.sm,
          }}>
            {currentIndex + 1} / {photos.length}
          </Text>
        </View>
      )}
    </View>
  );
}

// Video Player Component
function VideoPlayerModal({ videoUri, onClose }: { videoUri: string; onClose: () => void }) {
  const player = useVideoPlayer(videoUri, (player) => {
    player.loop = false;
    player.play();
  });

  return (
    <View style={{
      flex: 1,
      backgroundColor: '#000000',
      justifyContent: 'center',
      alignItems: 'center',
    }}>
      <TouchableOpacity
        style={{
          position: 'absolute',
          top: 50,
          right: 20,
          zIndex: 10,
          padding: designTokens.spacing.md,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          borderRadius: 24,
        }}
        onPress={onClose}
        activeOpacity={0.7}
      >
        <X size={24} color="#FFFFFF" />
      </TouchableOpacity>
      
      <VideoView
        player={player}
        style={{
          width: Dimensions.get('window').width,
          height: Dimensions.get('window').height * 0.6,
        }}
        allowsFullscreen
        allowsPictureInPicture
      />
    </View>
  );
}

// Application Status Modal Component
function ApplicationStatusModal({ visible, data, onClose }: { visible: boolean; data: { title: string; message: string; brgyContact: { name: string; email: string; phone: string; logo?: string | null } | null } | null; onClose: () => void }) {
  if (!data) return null;
  
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={{
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20
      }}>
        <View style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 12,
          width: '100%',
          maxWidth: 320,
          padding: 20
        }}>
          {/* Title */}
          <Text style={{
            fontSize: 18,
            fontWeight: '700',
            color: '#111827',
            marginBottom: 12,
            textAlign: 'center'
          }}>
            {data.title || 'Application Status'}
          </Text>

          {/* Message */}
          <Text style={{
            fontSize: 14,
            color: '#374151',
            marginBottom: 16,
            lineHeight: 20,
            textAlign: 'center'
          }}>
            {data.message}
          </Text>

          {/* Contact Information */}
          {data.brgyContact && (
            <View style={{
              marginTop: 12,
              marginBottom: 20,
              padding: 12,
              backgroundColor: '#F9FAFB',
              borderRadius: 8
            }}>
              <Text style={{
                fontSize: 12,
                fontWeight: '600',
                color: '#111827',
                marginBottom: 12,
                textAlign: 'center'
              }}>
                For inquiries, please contact:
              </Text>

              {/* Barangay Logo and Name */}
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 12,
                gap: 12
              }}>
                {(() => {
                  // Helper function to get default logo
                  const getDefaultLogo = (barangayName: string | null | undefined) => {
                    if (!barangayName) return null;
                    const barangayLower = barangayName.toLowerCase().trim();
                    switch (barangayLower) {
                      case 'talolong':
                      case 'talongon':
                        return require('../../assets/images/talolong.jpg');
                      case 'burgos':
                        return require('../../assets/images/burgos.jpg');
                      case 'magsaysay':
                        return require('../../assets/images/magsaysay.jpg');
                      case 'gomez':
                        return require('../../assets/images/gomez.jpg');
                      case 'rizal':
                        return require('../../assets/images/rizal.jpg');
                      default:
                        return null;
                    }
                  };

                  const logo = data.brgyContact.logo;
                  const barangayName = (data as any)?.barangay || '';
                  const defaultLogo = getDefaultLogo(barangayName);
                  
                  if (logo || defaultLogo) {
                    return (
                      <RNImage
                        source={logo ? { uri: logo } : defaultLogo}
                        style={{
                          width: 60,
                          height: 60,
                          borderRadius: 30,
                          borderWidth: 2,
                          borderColor: '#E5E7EB'
                        }}
                        resizeMode="cover"
                      />
                    );
                  }
                  return null;
                })()}

                {/* Barangay Name */}
                {(data as any)?.barangay && (
                  <Text style={{
                    fontSize: 16,
                    fontWeight: '700',
                    color: '#111827',
                    flex: 1
                  }}>
                    Barangay {(data as any).barangay}
                  </Text>
                )}
              </View>

              <Text style={{
                fontSize: 13,
                color: '#111827',
                marginBottom: 6,
                textAlign: 'center'
              }}>
                {data.brgyContact.name}
              </Text>
              {data.brgyContact.email && (
                <TextInput
                  value={data.brgyContact.email}
                  editable={false}
                  selectTextOnFocus={true}
                  style={{
                    fontSize: 13,
                    color: '#111827',
                    padding: 6,
                    backgroundColor: '#FFFFFF',
                    borderRadius: 4,
                    borderWidth: 1,
                    borderColor: '#D1D5DB',
                    marginBottom: 6
                  }}
                />
              )}
              {data.brgyContact.phone && (
                <TextInput
                  value={data.brgyContact.phone}
                  editable={false}
                  selectTextOnFocus={true}
                  style={{
                    fontSize: 13,
                    color: '#111827',
                    padding: 6,
                    backgroundColor: '#FFFFFF',
                    borderRadius: 4,
                    borderWidth: 1,
                    borderColor: '#D1D5DB'
                  }}
                />
              )}
            </View>
          )}

          {/* Action Buttons */}
          <View style={{
            flexDirection: 'row',
            gap: 8,
            justifyContent: 'center'
          }}>
            {data.brgyContact?.email && (
              <TouchableOpacity
                onPress={async () => {
                  try {
                    const emailUrl = `mailto:${data.brgyContact!.email}?subject=Owner Application Inquiry&body=Hello, I would like to inquire about my owner application status.`;
                    const canOpen = await Linking.canOpenURL(emailUrl);
                    if (canOpen) {
                      await Linking.openURL(emailUrl);
                    } else {
                      Alert.alert('Error', 'Unable to open email client');
                    }
                  } catch (error) {
                    console.error('Error opening email:', error);
                    Alert.alert('Error', 'Unable to open email client');
                  }
                }}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  backgroundColor: '#10B981',
                  borderRadius: 6,
                  flex: 1
                }}
              >
                <Text style={{
                  color: '#FFFFFF',
                  fontSize: 14,
                  fontWeight: '600',
                  textAlign: 'center'
                }}>
                  Email
                </Text>
              </TouchableOpacity>
            )}
            {data.brgyContact?.phone && (
              <TouchableOpacity
                onPress={async () => {
                  try {
                    const cleanPhone = data.brgyContact!.phone.replace(/[\s\-()]/g, '');
                    const phoneUrl = cleanPhone.startsWith('+') ? `tel:${cleanPhone}` : `tel:+${cleanPhone}`;
                    
                    if (Platform.OS === 'web') {
                      window.location.href = phoneUrl;
                    } else {
                      const canOpen = await Linking.canOpenURL(phoneUrl);
                      if (canOpen) {
                        await Linking.openURL(phoneUrl);
                      } else {
                        const fallbackUrl = `tel:${cleanPhone.replace(/^\+/, '')}`;
                        const canOpenFallback = await Linking.canOpenURL(fallbackUrl);
                        if (canOpenFallback) {
                          await Linking.openURL(fallbackUrl);
                        } else {
                          try {
                            await Linking.openURL(`tel:${cleanPhone}`);
                          } catch (fallbackError) {
                            Alert.alert('Error', `Unable to open phone dialer. Please copy the number and dial manually.`);
                          }
                        }
                      }
                    }
                  } catch (error) {
                    console.error('Error opening phone:', error);
                    try {
                      const cleanPhone = data.brgyContact!.phone.replace(/[\s\-()]/g, '');
                      await Linking.openURL(`tel:${cleanPhone}`);
                    } catch (fallbackError) {
                      Alert.alert('Error', `Unable to open phone dialer. Please copy the number and dial manually.`);
                    }
                  }
                }}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  backgroundColor: '#3B82F6',
                  borderRadius: 6,
                  flex: 1
                }}
              >
                <Text style={{
                  color: '#FFFFFF',
                  fontSize: 14,
                  fontWeight: '600',
                  textAlign: 'center'
                }}>
                  Call
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={onClose}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 10,
                backgroundColor: '#6B7280',
                borderRadius: 6,
                minWidth: 70
              }}
            >
              <Text style={{
                color: '#FFFFFF',
                fontSize: 14,
                fontWeight: '600',
                textAlign: 'center'
              }}>
                OK
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
