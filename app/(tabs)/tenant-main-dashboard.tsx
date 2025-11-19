import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
  ActivityIndicator,
  Modal,
  Pressable,
  Image,
  Share,
  TextInput,
  Dimensions,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { 
  Home, 
  Calendar, 
  User, 
  MessageSquare, 
  CreditCard,
  FileText,
  Bell,
  Download,
  ChevronRight,
  Clock,
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Coins,
  Mail,
  Phone,
  MapPin,
  Edit,
  X,
  Share2,
  Wrench,
  Camera,
  Video,
  Plus,
  Trash2,
  History,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { getBookingsByTenant } from '../../utils/booking';
import { BookingRecord } from '../../types';
import { sharedStyles, designTokens, iconBackgrounds } from '../../styles/owner-dashboard-styles';
import { loadUserProfilePhoto } from '../../utils/user-profile-photos';
import {
  getRentHistorySummary,
  getPaymentReminders,
  markRentPaymentAsPaid,
  generatePaymentReceipt,
  initializeMonthlyPayments,
  createRentPayment,
  getNextDueDate,
  isPaymentOverdue,
  getDaysOverdue,
  getFuturePaymentMonths,
  type RentPayment,
  type PaymentReminder,
  type RentHistorySummary,
} from '../../utils/tenant-payments';
import { createOrFindConversation } from '../../utils/conversation-utils';
import { db } from '../../utils/db';
import { PublishedListingRecord, PaymentAccount } from '../../types';
import BookingStatusModal from '@/components/BookingStatusModal';
import { Platform } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import * as FileSystem from 'expo-file-system/legacy';
import { getQRCodeProps, generatePaymentQRCodeString } from '../../utils/qr-code-generator';
import { addCustomEventListener } from '../../utils/custom-events';
import {
  loadShownBookingNotifications,
  markBookingNotificationAsShown,
  hasBookingNotificationBeenShown,
} from '../../utils/booking-notifications-storage';
import * as ImagePicker from 'expo-image-picker';
import {
  createMaintenanceRequest,
  getMaintenanceRequestsByBooking,
  getPendingMaintenanceRequestsCount,
  cancelMaintenanceRequest,
} from '../../utils/maintenance-requests';
import { MaintenanceRequestRecord } from '../../types';
import { VideoView, useVideoPlayer } from 'expo-video';
import PayMongoPayment from '../../components/PayMongoPayment';
import {
  getComplaintsByTenant,
  getComplaintCategoryLabel,
  getStatusLabel,
  getUrgencyColor,
  createTenantComplaint,
} from '../../utils/tenant-complaints';
import { TenantComplaintRecord } from '../../types';

export default function TenantMainDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeBooking, setActiveBooking] = useState<BookingRecord | null>(null);
  const [property, setProperty] = useState<PublishedListingRecord | null>(null);
  const [rentHistory, setRentHistory] = useState<RentHistorySummary | null>(null);
  const [reminders, setReminders] = useState<PaymentReminder[]>([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<RentPayment | null>(null);
  const [selectedReceipt, setSelectedReceipt] = useState<string>('');
  const [futurePayments, setFuturePayments] = useState<RentPayment[]>([]);
  const [selectedPayments, setSelectedPayments] = useState<Set<string>>(new Set()); // Unified selection for all payments
  const [ownerPaymentAccounts, setOwnerPaymentAccounts] = useState<any[]>([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null);
  const [showPaymentMethodSelection, setShowPaymentMethodSelection] = useState(false);
  const [showQRCodeModal, setShowQRCodeModal] = useState(false);
  const [selectedQRCodeAccount, setSelectedQRCodeAccount] = useState<PaymentAccount | null>(null);
  const [bookingStatusModal, setBookingStatusModal] = useState<{
    visible: boolean;
    booking: BookingRecord | null;
    status: 'approved' | 'rejected';
  }>({
    visible: false,
    booking: null,
    status: 'approved',
  });
  const shownBookingNotificationsRef = useRef<Set<string>>(new Set());
  const [notificationsLoaded, setNotificationsLoaded] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [profilePhotoError, setProfilePhotoError] = useState(false);
  const [maintenanceRequests, setMaintenanceRequests] = useState<MaintenanceRequestRecord[]>([]);
  const [pendingMaintenanceCount, setPendingMaintenanceCount] = useState(0);
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [maintenanceForm, setMaintenanceForm] = useState({
    title: '',
    description: '',
    category: 'other' as MaintenanceRequestRecord['category'],
    priority: 'medium' as MaintenanceRequestRecord['priority'],
    photos: [] as string[],
    videos: [] as string[],
  });
  const [submittingMaintenance, setSubmittingMaintenance] = useState(false);
  const [showMaintenanceHistory, setShowMaintenanceHistory] = useState(false);
  const [cancellingRequest, setCancellingRequest] = useState<string | null>(null);
  const [selectedMaintenanceRequest, setSelectedMaintenanceRequest] = useState<MaintenanceRequestRecord | null>(null);
  const [showMaintenanceDetailModal, setShowMaintenanceDetailModal] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const [selectedVideoIndex, setSelectedVideoIndex] = useState<number | null>(null);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [showPaymongoModal, setShowPaymongoModal] = useState(false);
  const [complaints, setComplaints] = useState<TenantComplaintRecord[]>([]);
  const [showComplaintHistory, setShowComplaintHistory] = useState(false);
  const [selectedComplaintForHistory, setSelectedComplaintForHistory] = useState<TenantComplaintRecord | null>(null);
  const [showComplaintDetailModal, setShowComplaintDetailModal] = useState(false);
  const [showComplaintModal, setShowComplaintModal] = useState(false);
  const [complaintForm, setComplaintForm] = useState({
    category: '' as TenantComplaintRecord['category'] | '',
    description: '',
    isAnonymous: false,
    urgency: 'medium' as TenantComplaintRecord['urgency'],
    photos: [] as string[],
    videos: [] as string[],
  });
  const [submittingComplaint, setSubmittingComplaint] = useState(false);

  const loadProfilePhoto = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      const { loadUserProfilePhoto } = await import('../../utils/user-profile-photos');
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

  // Reload profile photo when modal opens
  useEffect(() => {
    if (showProfileModal && user?.id) {
      loadProfilePhoto();
    }
  }, [showProfileModal, user?.id, loadProfilePhoto]);

  // Load shown notifications from persistent storage
  useEffect(() => {
    if (!user?.id) return;

    const loadNotifications = async () => {
      try {
        const notifications = await loadShownBookingNotifications(user.id);
        shownBookingNotificationsRef.current = notifications;
        setNotificationsLoaded(true);
        console.log(`✅ Tenant Main Dashboard: Loaded ${notifications.size} shown booking notifications from storage`);
      } catch (error) {
        console.error('❌ Error loading booking notifications:', error);
        setNotificationsLoaded(true);
      }
    };

    loadNotifications();
  }, [user?.id]);

  const loadDashboardData = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      
      // Update overdue payments (runs in background)
      try {
        const { updateOverduePayments } = await import('../../utils/tenant-payments');
        updateOverduePayments().catch(err => {
          console.log('Overdue payment update completed (background)');
        });
      } catch (err) {
        // Silently fail - overdue update is not critical
      }
      
      // Get active booking (approved and paid)
      const bookings = await getBookingsByTenant(user.id);
      const active = bookings.find(
        b => b.status === 'approved' && b.paymentStatus === 'paid'
      );

      if (!active) {
        // No active booking, redirect to property browsing
        router.replace('/(tabs)');
        return;
      }

      setActiveBooking(active);

      // Load property details
      const propertyData = await db.get<PublishedListingRecord>('published_listings', active.propertyId);
      setProperty(propertyData || null);

      // Initialize monthly payments if needed
      await initializeMonthlyPayments(active.id);

      // Load rent history
      const history = await getRentHistorySummary(user.id);
      setRentHistory(history);

      // Load payment reminders
      const paymentReminders = await getPaymentReminders(user.id);
      setReminders(paymentReminders);

      // Create next payment if it doesn't exist
      if (history.nextDueDate && history.nextDueAmount) {
        const existingPayments = history.payments.filter(
          p => p.dueDate === history.nextDueDate && p.status === 'pending'
        );
        
        if (existingPayments.length === 0) {
          const paymentMonth = history.nextDueDate.substring(0, 7);
          await createRentPayment(active.id, paymentMonth, history.nextDueDate);
          
          // Reload history
          const updatedHistory = await getRentHistorySummary(user.id);
          setRentHistory(updatedHistory);
        }
      }

      // Load future payments for advanced payment
      const future = await getFuturePaymentMonths(active.id, 6);
      setFuturePayments(future);

      // Load owner payment accounts
      try {
        const allAccounts = await db.list('payment_accounts');
        const ownerAccounts = allAccounts.filter(
          (account: any) =>
            account.ownerId === active.ownerId &&
            account.isActive &&
            (account.type === 'gcash' || account.type === 'paymaya' || account.type === 'bank_transfer' || account.type === 'cash')
        );
        setOwnerPaymentAccounts(ownerAccounts);
      } catch (error) {
        console.error('❌ Error loading owner payment accounts:', error);
      }

        // Load maintenance requests
        try {
          const requests = await getMaintenanceRequestsByBooking(active.id);
          // Sort by created date (newest first)
          requests.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          setMaintenanceRequests(requests);
          const pendingCount = await getPendingMaintenanceRequestsCount(user.id);
          setPendingMaintenanceCount(pendingCount);
        } catch (error) {
          console.error('❌ Error loading maintenance requests:', error);
        }

        // Load complaints
        try {
          const tenantComplaints = await getComplaintsByTenant(user.id);
          setComplaints(tenantComplaints);
        } catch (error) {
          console.error('❌ Error loading complaints:', error);
        }

    } catch (error) {
      console.error('❌ Error loading dashboard data:', error);
      Alert.alert('Error', 'Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id, router]);

  useEffect(() => {
    if (user?.id) {
      loadDashboardData();
      loadProfilePhoto();
    }
  }, [user?.id, loadDashboardData, loadProfilePhoto]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadDashboardData();
    loadProfilePhoto();
    
  }, [loadDashboardData, loadProfilePhoto]);

  // Function to check for booking status changes
  const checkBookingStatusChanges = useCallback(async () => {
    if (!user?.id || !notificationsLoaded) return;
    
    try {
      console.log('🔍 Tenant Main Dashboard: Checking for booking status changes...');
      const bookings = await getBookingsByTenant(user.id);
      console.log(`📋 Found ${bookings.length} bookings for tenant`);
      
      // Check for newly approved or rejected bookings that haven't been shown yet
      for (const booking of bookings) {
        console.log(`🔑 Checking booking ${booking.id} with status ${booking.status}`);
        console.log(`📝 Already shown notifications:`, Array.from(shownBookingNotificationsRef.current));
        
        // Only show modal for approved or rejected bookings that haven't been shown
        if ((booking.status === 'approved' || booking.status === 'rejected') && 
            !hasBookingNotificationBeenShown(
              booking.id,
              booking.status as 'approved' | 'rejected',
              shownBookingNotificationsRef.current
            )) {
          
          console.log(`✅ Found new ${booking.status} booking! Showing modal for booking ${booking.id}`);
          
          // Mark as shown and save to persistent storage
          shownBookingNotificationsRef.current = await markBookingNotificationAsShown(
            user.id,
            booking.id,
            booking.status as 'approved' | 'rejected',
            shownBookingNotificationsRef.current
          );
          
          // Show modal after a short delay to ensure UI is ready
          setTimeout(() => {
            console.log(`🎯 Setting modal visible for booking ${booking.id}`);
            setBookingStatusModal({
              visible: true,
              booking: booking,
              status: booking.status as 'approved' | 'rejected',
            });
          }, 500);
          
          break; // Only show one notification at a time
        } else {
          console.log(`⏭️ Skipping booking ${booking.id} - already shown or not approved/rejected`);
        }
      }
    } catch (error) {
      console.error('❌ Error checking booking status changes:', error);
    }
  }, [user?.id, notificationsLoaded]);

  // Check for booking status changes and show modal
  useEffect(() => {
    if (!user?.id || loading) return; // Wait for loading to complete

    // Check after a delay to ensure component is fully mounted
    const timeoutId = setTimeout(() => {
      checkBookingStatusChanges();
    }, 1000);

    // Also listen for booking status change events
    const handleBookingStatusChange = async (event?: any) => {
      const eventDetail = event?.detail || {};
      console.log('🔄 Tenant Main Dashboard: Booking status changed event received:', eventDetail);
      
      if (eventDetail.bookingId && user?.id) {
        // Reload bookings to get the latest status
        const bookings = await getBookingsByTenant(user.id);
        const changedBooking = bookings.find(b => b.id === eventDetail.bookingId);
        
        if (changedBooking && (changedBooking.status === 'approved' || changedBooking.status === 'rejected')) {
          console.log(`🔔 Event: Found ${changedBooking.status} booking ${changedBooking.id}`);
          
          if (!hasBookingNotificationBeenShown(
            changedBooking.id,
            changedBooking.status as 'approved' | 'rejected',
            shownBookingNotificationsRef.current
          )) {
            // Mark as shown and save to persistent storage
            shownBookingNotificationsRef.current = await markBookingNotificationAsShown(
              user.id,
              changedBooking.id,
              changedBooking.status as 'approved' | 'rejected',
              shownBookingNotificationsRef.current
            );
            console.log(`✅ Event: Showing modal for booking ${changedBooking.id}`);
            
            setTimeout(() => {
              setBookingStatusModal({
                visible: true,
                booking: changedBooking,
                status: changedBooking.status as 'approved' | 'rejected',
              });
            }, 300);
          } else {
            console.log(`⏭️ Event: Already shown notification for booking ${changedBooking.id}`);
          }
        }
      }
    };

    const removeListener = addCustomEventListener('bookingStatusChanged', handleBookingStatusChange);
    
    return () => {
      clearTimeout(timeoutId);
      removeListener();
    };
  }, [user?.id, loading, checkBookingStatusChanges, notificationsLoaded]); // Also depend on loading state

  // Also check when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (!loading && user?.id && notificationsLoaded) {
        // Small delay to ensure component is ready
        const timeoutId = setTimeout(() => {
          checkBookingStatusChanges();
        }, 500);
        
        return () => clearTimeout(timeoutId);
      }
    }, [loading, user?.id, checkBookingStatusChanges, notificationsLoaded])
  );

  const handleMessageOwner = useCallback(async () => {
    if (!activeBooking || !user?.id) return;

    try {
      const conversationId = await createOrFindConversation({
        ownerId: activeBooking.ownerId,
        tenantId: user.id,
        ownerName: activeBooking.ownerName,
        tenantName: user.name || 'Tenant',
        propertyId: activeBooking.propertyId,
        propertyTitle: activeBooking.propertyTitle,
      });

      router.push({
        pathname: '/chat-room',
        params: {
          conversationId: conversationId,
          ownerName: activeBooking.ownerName,
          ownerAvatar: '',
          propertyTitle: activeBooking.propertyTitle,
        },
      });
    } catch (error) {
      console.error('❌ Error starting conversation:', error);
      Alert.alert('Error', 'Failed to start conversation. Please try again.');
    }
  }, [activeBooking, user, router]);

  const handlePickMaintenancePhoto = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant permission to access your photos');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets) {
        const newPhotos = result.assets.map(asset => asset.uri);
        setMaintenanceForm(prev => ({
          ...prev,
          photos: [...prev.photos, ...newPhotos],
        }));
      }
    } catch (error) {
      console.error('Error picking photo:', error);
      Alert.alert('Error', 'Failed to pick photo. Please try again.');
    }
  }, []);

  const handlePickMaintenanceVideo = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant permission to access your videos');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos'],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setMaintenanceForm(prev => ({
          ...prev,
          videos: [...prev.videos, result.assets[0].uri],
        }));
      }
    } catch (error) {
      console.error('Error picking video:', error);
      Alert.alert('Error', 'Failed to pick video. Please try again.');
    }
  }, []);

  const handleRemoveMaintenancePhoto = useCallback((index: number) => {
    setMaintenanceForm(prev => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index),
    }));
  }, []);

  const handleRemoveMaintenanceVideo = useCallback((index: number) => {
    setMaintenanceForm(prev => ({
      ...prev,
      videos: prev.videos.filter((_, i) => i !== index),
    }));
  }, []);

  const handlePickComplaintPhoto = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant permission to access your photos');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets) {
        const newPhotos = result.assets.map(asset => asset.uri);
        setComplaintForm(prev => ({
          ...prev,
          photos: [...prev.photos, ...newPhotos],
        }));
      }
    } catch (error) {
      console.error('Error picking photo:', error);
      Alert.alert('Error', 'Failed to pick photo. Please try again.');
    }
  }, []);

  const handlePickComplaintVideo = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant permission to access your videos');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos'],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setComplaintForm(prev => ({
          ...prev,
          videos: [...prev.videos, result.assets[0].uri],
        }));
      }
    } catch (error) {
      console.error('Error picking video:', error);
      Alert.alert('Error', 'Failed to pick video. Please try again.');
    }
  }, []);

  const handleRemoveComplaintPhoto = useCallback((index: number) => {
    setComplaintForm(prev => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index),
    }));
  }, []);

  const handleRemoveComplaintVideo = useCallback((index: number) => {
    setComplaintForm(prev => ({
      ...prev,
      videos: prev.videos.filter((_, i) => i !== index),
    }));
  }, []);

  const handleSubmitComplaint = useCallback(async () => {
    if (!activeBooking || !user?.id || !property) return;

    if (!complaintForm.category) {
      Alert.alert('Required', 'Please select a complaint category.');
      return;
    }

    if (!complaintForm.description.trim()) {
      Alert.alert('Required', 'Please provide a description of the complaint.');
      return;
    }

    try {
      setSubmittingComplaint(true);

      await createTenantComplaint({
        tenantId: user.id,
        propertyId: property.id,
        bookingId: activeBooking.id,
        category: complaintForm.category,
        description: complaintForm.description.trim(),
        photos: complaintForm.photos,
        videos: complaintForm.videos,
        isAnonymous: complaintForm.isAnonymous,
        urgency: complaintForm.urgency,
      });

      Alert.alert(
        'Complaint Submitted',
        'Your complaint has been submitted to the barangay. You can track its progress in the Complaint Tracking section.',
        [{ text: 'OK' }]
      );

      // Reset form and close modal
      setComplaintForm({
        category: '' as TenantComplaintRecord['category'] | '',
        description: '',
        isAnonymous: false,
        urgency: 'medium',
        photos: [],
        videos: [],
      });
      setShowComplaintModal(false);

      // Reload complaints
      const tenantComplaints = await getComplaintsByTenant(user.id);
      setComplaints(tenantComplaints);
    } catch (error) {
      console.error('Error submitting complaint:', error);
      Alert.alert('Error', 'Failed to submit complaint. Please try again.');
    } finally {
      setSubmittingComplaint(false);
    }
  }, [activeBooking, user, property, complaintForm]);

  const handleSubmitMaintenanceRequest = useCallback(async () => {
    if (!activeBooking || !user?.id) return;

    if (!maintenanceForm.title.trim()) {
      Alert.alert('Required', 'Please enter a title for the maintenance request.');
      return;
    }

    if (!maintenanceForm.description.trim()) {
      Alert.alert('Required', 'Please describe the issue.');
      return;
    }

    try {
      setSubmittingMaintenance(true);

      const request = await createMaintenanceRequest({
        bookingId: activeBooking.id,
        propertyId: activeBooking.propertyId,
        tenantId: user.id,
        ownerId: activeBooking.ownerId,
        title: maintenanceForm.title.trim(),
        description: maintenanceForm.description.trim(),
        category: maintenanceForm.category,
        priority: maintenanceForm.priority,
        photos: maintenanceForm.photos,
        videos: maintenanceForm.videos,
      });

      Alert.alert(
        'Request Submitted',
        'Your maintenance request has been submitted. The owner will be notified.',
        [{ text: 'OK', onPress: () => {
          setShowMaintenanceModal(false);
          setMaintenanceForm({
            title: '',
            description: '',
            category: 'other',
            priority: 'medium',
            photos: [],
            videos: [],
          });
          loadDashboardData();
        }}]
      );
    } catch (error) {
      console.error('Error submitting maintenance request:', error);
      Alert.alert('Error', 'Failed to submit maintenance request. Please try again.');
    } finally {
      setSubmittingMaintenance(false);
    }
  }, [activeBooking, user, maintenanceForm, loadDashboardData]);

  const handleCancelMaintenanceRequest = useCallback(async (requestId: string) => {
    if (!user?.id) return;

    Alert.alert(
      'Cancel Request',
      'Are you sure you want to cancel this maintenance request?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              setCancellingRequest(requestId);
              const success = await cancelMaintenanceRequest(requestId, user.id);
              
              if (success) {
                Alert.alert('Cancelled', 'Your maintenance request has been cancelled.');
                await loadDashboardData();
              } else {
                Alert.alert('Error', 'Failed to cancel maintenance request. Please try again.');
              }
            } catch (error) {
              console.error('Error cancelling maintenance request:', error);
              const errorMessage = error instanceof Error ? error.message : 'Unknown error';
              Alert.alert('Error', `Failed to cancel request: ${errorMessage}`);
            } finally {
              setCancellingRequest(null);
            }
          }
        }
      ]
    );
  }, [user, loadDashboardData]);

  const handlePayRent = useCallback(async () => {
    if (!rentHistory?.nextDueDate || !rentHistory?.nextDueAmount || !activeBooking) return;

    // Find the pending payment for next due date
    const pendingPayment = rentHistory.payments.find(
      p => p.dueDate === rentHistory.nextDueDate && (p.status === 'pending' || p.status === 'overdue')
    );

    // Pre-select the current due payment if it exists
    if (pendingPayment) {
      setSelectedPayments(new Set([pendingPayment.id]));
    } else {
      setSelectedPayments(new Set());
    }

    setShowPaymentModal(true);
  }, [rentHistory, activeBooking]);

  const handlePaymentMethodAction = useCallback(async (account: PaymentAccount) => {
    if (selectedPayments.size === 0) return;
    if (!activeBooking?.id) {
      Alert.alert('Error', 'Booking information not found. Please try again.');
      return;
    }

    try {
      const cleanPhone = account.accountNumber.replace(/[^0-9]/g, '');
      const reference = activeBooking.id.slice(-8).toUpperCase();
      
      // Calculate total amount from all selected payments
      const allPayments = [
        ...(rentHistory?.payments.filter(p => selectedPayments.has(p.id)) || []),
        ...futurePayments.filter(p => selectedPayments.has(p.id))
      ];
      const amount = allPayments.reduce((sum, p) => sum + p.totalAmount, 0);

      if (!amount || amount <= 0) {
        Alert.alert('Error', 'Invalid payment amount. Please try again.');
        return;
      }

      const methodName = account.type === 'gcash' ? 'GCash' : 
                        account.type === 'paymaya' ? 'Maya' : 
                        account.type === 'bank_transfer' ? 'Bank Transfer' : 'Cash';

      // For GCash: Use deep link as primary method (Option 1)
      if (account.type === 'gcash') {
        const Linking = await import('expo-linking');
        const { generateGCashPaymentURL } = await import('../../utils/qr-code-generator');
        const appUrl = generateGCashPaymentURL(account, amount, reference);
        
        // Primary Method: Open GCash app directly with deep link
        let appOpened = false;
        try {
          // Check if GCash app is installed and can be opened
          const canOpen = await Linking.canOpenURL(appUrl);
          
          if (canOpen) {
            // Open GCash app with payment details pre-filled
            await Linking.openURL(appUrl);
            appOpened = true;
            
            // Show confirmation with payment details and option to view QR code
            Alert.alert(
              'GCash Opened',
              `GCash app has been opened with your payment details:\n\n💰 Amount: ₱${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n📋 Account: ${account.accountNumber}\n📝 Reference: ${reference}\n\nComplete the payment in GCash, then tap "I Paid" below.`,
              [
                { 
                  text: 'View QR Code Instead', 
                  onPress: () => {
                    if (selectedPayment) {
                      setSelectedQRCodeAccount(account);
                      setShowQRCodeModal(true);
                    }
                  }
                },
                { 
                  text: 'I Paid', 
                  onPress: () => {
                    const paymentMethodName = `${methodName} - ${account.accountNumber.slice(-4)}`;
                    setSelectedPaymentMethod(paymentMethodName);
                    
                    // Use unified payment handler
                    setTimeout(() => {
                      handleConfirmPayment();
                    }, 300);
                  }
                },
                { text: 'OK', style: 'cancel' },
              ]
            );
            
            // Copy account number to clipboard as backup
            try {
              if (Platform.OS === 'web' && navigator.clipboard) {
                await navigator.clipboard.writeText(cleanPhone);
              } else {
                const Clipboard = await import('expo-clipboard');
                await Clipboard.setStringAsync(cleanPhone);
              }
            } catch (e) {
              // Ignore clipboard errors
            }
            
            return; // Exit early - deep link method succeeded
          }
        } catch (error) {
          console.warn(`Could not open ${methodName} app:`, error);
        }

        // Fallback: If deep link failed, show QR code modal (if available)
        const allPayments = [
          ...(rentHistory?.payments.filter(p => selectedPayments.has(p.id)) || []),
          ...futurePayments.filter(p => selectedPayments.has(p.id))
        ];
        const firstPayment = allPayments[0];
        if (!appOpened && account.qrCodeImageUri && firstPayment) {
          Alert.alert(
            'GCash Not Available',
            'Could not open GCash app automatically.\n\nWould you like to scan a QR code instead?',
            [
              { 
                text: 'View QR Code', 
                onPress: () => {
                  setSelectedQRCodeAccount(account);
                  setShowQRCodeModal(true);
                }
              },
              { 
                text: 'Manual Payment', 
                onPress: () => {
                  // Show manual payment instructions
                  let accountCopied = false;
                  try {
                    if (Platform.OS === 'web' && navigator.clipboard) {
                      navigator.clipboard.writeText(cleanPhone);
                      accountCopied = true;
                    } else {
                      const Clipboard = require('expo-clipboard');
                      Clipboard.setStringAsync(cleanPhone);
                      accountCopied = true;
                    }
                  } catch (e) {
                    console.warn('Could not copy to clipboard');
                  }
                  
                  Alert.alert(
                    `${methodName} Payment`,
                    `${accountCopied ? '📋 Account number copied to clipboard!\n\n' : ''}Please open ${methodName} manually and send payment to:\n\n📋 Account: ${account.accountNumber}\n💰 Amount: ₱${amount.toLocaleString()}\n📝 Reference: ${reference}\n\nAfter completing payment, tap "I Paid" to record it.`,
                    [
                      { 
                        text: 'I Paid', 
                        onPress: () => {
                          const paymentMethodName = `${methodName} - ${account.accountNumber.slice(-4)}`;
                          setSelectedPaymentMethod(paymentMethodName);
                          
                          if (selectedPayments.size === 1) {
                            setTimeout(async () => {
                              try {
                                const allPayments = [
                                  ...(rentHistory?.payments.filter(p => selectedPayments.has(p.id)) || []),
                                  ...futurePayments.filter(p => selectedPayments.has(p.id))
                                ];
                                const paymentToProcess = allPayments[0];
                                if (paymentToProcess) {
                                  const success = await markRentPaymentAsPaid(paymentToProcess.id, paymentMethodName);
                                  if (success) {
                                    Alert.alert('Success', 'Payment recorded successfully!');
                                    setShowPaymentModal(false);
                                    setSelectedPayment(null);
                                    setSelectedPaymentMethod(null);
                                    await loadDashboardData();
                                  }
                                }
                              } catch (error) {
                                console.error('Error confirming payment:', error);
                              }
                            }, 300);
                          }
                        }
                      },
                      { text: 'Cancel', style: 'cancel' },
                    ]
                  );
                }
              },
              { text: 'Cancel', style: 'cancel' },
            ]
          );
          return;
        }

        // Final fallback: Manual payment instructions
        let accountCopied = false;
        try {
          if (Platform.OS === 'web' && navigator.clipboard) {
            await navigator.clipboard.writeText(cleanPhone);
            accountCopied = true;
          } else {
            try {
              const Clipboard = await import('expo-clipboard');
              await Clipboard.setStringAsync(cleanPhone);
              accountCopied = true;
            } catch (e1) {
              console.warn('Could not copy to clipboard');
            }
          }
        } catch (clipboardError) {
          console.warn('Clipboard error:', clipboardError);
        }

        Alert.alert(
          `${methodName} Payment`,
          `${methodName} app could not be opened automatically.\n\n${accountCopied ? '📋 Account number is copied to your clipboard.\n\n' : ''}Please open ${methodName} manually and send payment to:\n\n📋 Account: ${account.accountNumber}\n💰 Amount: ₱${amount.toLocaleString()}\n📝 Reference: ${reference}\n\nAfter completing payment, tap "I Paid" to record it.`,
          [
            { 
              text: 'Copy Account Number', 
              onPress: async () => {
                try {
                  if (Platform.OS === 'web' && navigator.clipboard) {
                    await navigator.clipboard.writeText(cleanPhone);
                  } else {
                    try {
                      const Clipboard = await import('expo-clipboard');
                      await Clipboard.setStringAsync(cleanPhone);
                    } catch (e) {
                      Alert.alert('Account Number', cleanPhone, [{ text: 'OK' }]);
                    }
                  }
                } catch (e) {
                  Alert.alert('Account Number', cleanPhone, [{ text: 'OK' }]);
                }
              }
            },
            { 
              text: 'I Paid', 
              onPress: () => {
                const paymentMethodName = `${methodName} - ${account.accountNumber.slice(-4)}`;
                setSelectedPaymentMethod(paymentMethodName);
                
                          if (selectedPayments.size === 1) {
                  setTimeout(async () => {
                    try {
                      const allPayments = [
                        ...(rentHistory?.payments.filter(p => selectedPayments.has(p.id)) || []),
                        ...futurePayments.filter(p => selectedPayments.has(p.id))
                      ];
                      const paymentToProcess = allPayments[0];
                      if (paymentToProcess) {
                        const success = await markRentPaymentAsPaid(paymentToProcess.id, paymentMethodName);
                        if (success) {
                          Alert.alert('Success', 'Payment recorded successfully!');
                          setShowPaymentModal(false);
                          setSelectedPayment(null);
                          setSelectedPaymentMethod(null);
                          await loadDashboardData();
                        }
                      }
                    } catch (error) {
                      console.error('Error confirming payment:', error);
                    }
                  }, 300);
                }
              }
            },
            { text: 'Cancel', style: 'cancel' },
          ]
        );
      } else if (account.type === 'paymaya') {
        // For Maya: Try to open app first, then copy as backup
        const Linking = await import('expo-linking');
        const appUrl = `maya://pay?number=${cleanPhone}&amount=${amount}&reference=${reference}`;
        
        let appOpened = false;
        try {
          const canOpen = await Linking.canOpenURL(appUrl);
          if (canOpen) {
            await Linking.openURL(appUrl);
            appOpened = true;
          }
        } catch (error) {
          console.warn(`Could not open ${methodName} app:`, error);
        }
        
        // Copy account number to clipboard (as backup/helper)
        let accountCopied = false;
        try {
          if (Platform.OS === 'web' && navigator.clipboard) {
            await navigator.clipboard.writeText(cleanPhone);
            accountCopied = true;
          } else {
            try {
              const Clipboard = await import('expo-clipboard');
              await Clipboard.setStringAsync(cleanPhone);
              accountCopied = true;
            } catch (e1) {
              console.warn('Could not copy to clipboard');
            }
          }
        } catch (clipboardError) {
          console.warn('Clipboard error:', clipboardError);
        }

        if (!appOpened) {
          // App failed to open - show instructions with QR code option if available
          const alertButtons: any[] = [];
          
          // Add QR code option if available
          const allPayments = [
            ...(rentHistory?.payments.filter(p => selectedPayments.has(p.id)) || []),
            ...futurePayments.filter(p => selectedPayments.has(p.id))
          ];
          const firstPayment = allPayments[0];
          if (account.qrCodeImageUri && firstPayment) {
            alertButtons.push({
              text: 'View QR Code',
              onPress: () => {
                setSelectedQRCodeAccount(account);
                setShowQRCodeModal(true);
              }
            });
          }
          
          alertButtons.push(
            { 
              text: 'Copy Account Number', 
              onPress: async () => {
                try {
                  if (Platform.OS === 'web' && navigator.clipboard) {
                    await navigator.clipboard.writeText(cleanPhone);
                  } else {
                    try {
                      const Clipboard = await import('expo-clipboard');
                      await Clipboard.setStringAsync(cleanPhone);
                    } catch (e) {
                      Alert.alert('Account Number', cleanPhone, [{ text: 'OK' }]);
                    }
                  }
                } catch (e) {
                  Alert.alert('Account Number', cleanPhone, [{ text: 'OK' }]);
                }
              }
            },
            { text: 'OK' }
          );
          
          Alert.alert(
            `${methodName} Not Available`,
            `${methodName} app is not installed or could not be opened.\n\n${accountCopied ? '📋 Account number is copied to your clipboard.\n\n' : ''}${account.qrCodeImageUri ? 'You can scan a QR code instead, or ' : ''}Please install ${methodName} from the App Store or Google Play, or use the account number manually.\n\n📋 Account: ${account.accountNumber}\n💰 Amount: ₱${amount.toLocaleString()}\n📝 Reference: ${reference}`,
            alertButtons
          );
        } else {
          // App opened successfully - show confirmation with QR code option
          Alert.alert(
            `${methodName} Opened`,
            `${methodName} app has been opened with your payment details:\n\n💰 Amount: ₱${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n📋 Account: ${account.accountNumber}\n📝 Reference: ${reference}\n\nComplete the payment in ${methodName}, then tap "I Paid" below.`,
            [
              ...(() => {
                const allPayments = [
                  ...(rentHistory?.payments.filter(p => selectedPayments.has(p.id)) || []),
                  ...futurePayments.filter(p => selectedPayments.has(p.id))
                ];
                const firstPayment = allPayments[0];
                return account.qrCodeImageUri && firstPayment ? [{
                text: 'View QR Code Instead',
                onPress: () => {
                  setSelectedQRCodeAccount(account);
                  setShowQRCodeModal(true);
                }
              }] : [];
              })(),
              { 
                text: 'I Paid', 
                onPress: () => {
                  const paymentMethodName = `${methodName} - ${account.accountNumber.slice(-4)}`;
                  setSelectedPaymentMethod(paymentMethodName);
                  
                          if (selectedPayments.size === 1) {
                    setTimeout(async () => {
                      try {
                        const allPayments = [
                          ...(rentHistory?.payments.filter(p => selectedPayments.has(p.id)) || []),
                          ...futurePayments.filter(p => selectedPayments.has(p.id))
                        ];
                        const paymentToProcess = allPayments[0];
                        if (paymentToProcess) {
                          const success = await markRentPaymentAsPaid(paymentToProcess.id, paymentMethodName);
                          if (success) {
                            Alert.alert('Success', 'Payment recorded successfully!');
                            setShowPaymentModal(false);
                            setSelectedPayment(null);
                            setSelectedPaymentMethod(null);
                            await loadDashboardData();
                          }
                        }
                      } catch (error) {
                        console.error('Error confirming payment:', error);
                      }
                    }, 300);
                  }
                }
              },
              { text: 'OK', style: 'cancel' },
            ]
          );
        }
      } else {
        // For bank transfer or cash: Just copy account number
        let accountCopied = false;
        try {
          if (Platform.OS === 'web' && navigator.clipboard) {
            await navigator.clipboard.writeText(cleanPhone);
            accountCopied = true;
          } else {
            try {
              const Clipboard = await import('expo-clipboard');
              await Clipboard.setStringAsync(cleanPhone);
              accountCopied = true;
            } catch (e1) {
              console.warn('Could not copy to clipboard');
            }
          }
        } catch (clipboardError) {
          console.warn('Clipboard error:', clipboardError);
        }

        // Show confirmation alert
        Alert.alert(
          `${methodName} Payment`,
          `${accountCopied ? 'Account number copied to clipboard!\n\n' : ''}📋 Account: ${account.accountNumber}\n💰 Amount: ₱${amount.toLocaleString()}\n📝 Reference: ${reference}\n\nAfter completing payment, tap "I Paid" to record it.`,
          [
            { text: 'Copy Amount', onPress: async () => {
              try {
                if (Platform.OS === 'web' && navigator.clipboard) {
                  await navigator.clipboard.writeText(amount.toString());
                } else {
                  try {
                    const Clipboard = await import('expo-clipboard');
                    await Clipboard.setStringAsync(amount.toString());
                  } catch (e) {
                    console.warn('Failed to copy amount to clipboard:', e);
                    Alert.alert('Amount', `₱${amount.toLocaleString()}`);
                  }
                }
              } catch (e) {
                console.error('Failed to copy amount:', e);
                Alert.alert('Amount', `₱${amount.toLocaleString()}`);
              }
            }},
            { text: 'I Paid', onPress: () => {
              const paymentMethodName = `${methodName} - ${account.accountNumber.slice(-4)}`;
              setSelectedPaymentMethod(paymentMethodName);
              
              // If this is for a single payment (not advanced), automatically confirm
                          if (selectedPayments.size === 1) {
                setTimeout(async () => {
                  try {
                    const allPayments = [
                      ...(rentHistory?.payments.filter(p => selectedPayments.has(p.id)) || []),
                      ...futurePayments.filter(p => selectedPayments.has(p.id))
                    ];
                    const paymentToProcess = allPayments[0];
                    if (paymentToProcess) {
                      const success = await markRentPaymentAsPaid(paymentToProcess.id, paymentMethodName);
                      if (success) {
                        Alert.alert('Success', 'Payment recorded successfully!');
                        setShowPaymentModal(false);
                        setSelectedPayment(null);
                        setSelectedPaymentMethod(null);
                        await loadDashboardData();
                      }
                    }
                  } catch (error) {
                    console.error('Error confirming payment:', error);
                  }
                }, 300);
              }
            }},
            { text: 'Cancel', style: 'cancel' },
          ]
        );
      }
    } catch (error) {
      console.error('Error handling payment method:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      Alert.alert(
        'Payment Error',
        `Unable to process payment: ${errorMessage}\n\nPlease try again.`,
        [{ text: 'OK' }]
      );
    }
  }, [selectedPayments, rentHistory, futurePayments, activeBooking, loadDashboardData]);

  const handleConfirmPayment = useCallback(async () => {
    if (selectedPayments.size === 0) {
      Alert.alert('No Selection', 'Please select at least one payment to pay.');
      return;
    }

    // If no payment method selected and owner has payment accounts, show selection
    if (!selectedPaymentMethod && ownerPaymentAccounts.length > 0) {
      Alert.alert('Select Payment Method', 'Please select a payment method first.');
      return;
    }

    try {
      let successCount = 0;
      let failCount = 0;
      const paymentMethodName = selectedPaymentMethod || 'Manual Payment';

      // Get all payments (current + future) that are selected
      const allPayments = [
        ...(rentHistory?.payments.filter(p => selectedPayments.has(p.id)) || []),
        ...futurePayments.filter(p => selectedPayments.has(p.id))
      ];

      for (const payment of allPayments) {
        // Save payment to database if it doesn't exist yet (for future payments)
        try {
          const existing = await db.get('rent_payments', payment.id);
          if (!existing) {
            await db.upsert('rent_payments', payment.id, payment);
          }
        } catch (dbError) {
          // Payment doesn't exist, create it
          await db.upsert('rent_payments', payment.id, payment);
        }
        
        const success = await markRentPaymentAsPaid(payment.id, paymentMethodName);
        if (success) {
          successCount++;
        } else {
          failCount++;
        }
      }

      if (successCount > 0) {
        const paymentCount = successCount;
        Alert.alert(
          'Success',
          `Successfully paid for ${paymentCount} payment${paymentCount > 1 ? 's' : ''}!${failCount > 0 ? `\n\n${failCount} payment${failCount > 1 ? 's' : ''} failed.` : ''}`
        );
        setShowPaymentModal(false);
        setSelectedPayments(new Set());
        setSelectedPaymentMethod(null);
        
        // Reload data
        await loadDashboardData();
      } else {
        Alert.alert('Error', 'Failed to process payments. Please try again.');
      }
    } catch (error) {
      console.error('❌ Error confirming payment:', error);
      Alert.alert('Error', 'Failed to process payments. Please try again.');
    }
  }, [selectedPayments, rentHistory, futurePayments, selectedPaymentMethod, ownerPaymentAccounts, loadDashboardData]);

  const handleViewReceipt = useCallback((payment: RentPayment) => {
    if (!activeBooking) return;

    const receipt = generatePaymentReceipt(payment, activeBooking);
    setSelectedReceipt(receipt);
    setShowReceiptModal(true);
  }, [activeBooking]);

  const handleDownloadComplaint = useCallback(async (complaint: TenantComplaintRecord) => {
    if (!user || !activeBooking || !property) return;

    try {
      // Generate complaint document content
      const complaintContent = `COMPLAINT REPORT
================================

COMPLAINT ID: ${complaint.id}
DATE SUBMITTED: ${new Date(complaint.createdAt).toLocaleString()}

TENANT INFORMATION:
-------------------
Name: ${user.name || 'N/A'}
Email: ${user.email || 'N/A'}
${complaint.isAnonymous ? '(Submitted Anonymously)' : ''}

PROPERTY INFORMATION:
---------------------
Address: ${property.address || 'N/A'}
Property Type: ${property.propertyType || 'N/A'}

COMPLAINT DETAILS:
------------------
Category: ${getComplaintCategoryLabel(complaint.category)}
Urgency: ${complaint.urgency.toUpperCase()}
Status: ${getStatusLabel(complaint.status)}

Description:
${complaint.description}

${complaint.photos.length > 0 ? `\nATTACHED PHOTOS: ${complaint.photos.length} photo(s)` : ''}
${complaint.videos.length > 0 ? `ATTACHED VIDEOS: ${complaint.videos.length} video(s)` : ''}

${complaint.barangayNotes ? `\nBARANGAY NOTES:\n${complaint.barangayNotes}` : ''}

${complaint.settlementDocuments && complaint.settlementDocuments.length > 0 
  ? `\nSETTLEMENT DOCUMENTS: ${complaint.settlementDocuments.length} document(s) attached` 
  : ''}

TIMELINE:
---------
Submitted: ${new Date(complaint.createdAt).toLocaleString()}
${complaint.resolvedAt ? `Resolved: ${new Date(complaint.resolvedAt).toLocaleString()}` : ''}
${complaint.closedAt ? `Closed: ${new Date(complaint.closedAt).toLocaleString()}` : ''}
Last Updated: ${new Date(complaint.updatedAt).toLocaleString()}

================================
Generated on: ${new Date().toLocaleString()}
HanapBahay Complaint System
`;

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const filename = `complaint_${complaint.id.slice(-8)}_${timestamp}.txt`;

      if (Platform.OS === 'web') {
        // Web platform: Download as text file
        const blob = new Blob([complaintContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        
        Alert.alert('Success', 'Complaint report downloaded successfully!');
      } else {
        // Mobile platform: Save to file system and share
        const fileUri = FileSystem.documentDirectory + filename;
        
        try {
          await FileSystem.writeAsStringAsync(fileUri, complaintContent, {
            encoding: FileSystem.EncodingType.UTF8,
          });

          // Share the file
          const Sharing = await import('expo-sharing');
          if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(fileUri, {
              mimeType: 'text/plain',
              dialogTitle: 'Download Complaint Report',
            });
            Alert.alert('Success', 'Complaint report ready to save! Use the share menu to save to Downloads or Files.');
          } else {
            Alert.alert('Success', `Complaint report saved to: ${fileUri}`);
          }
        } catch (error) {
          console.error('Error saving complaint file:', error);
          Alert.alert('Error', 'Failed to save complaint report. Please try again.');
        }
      }
    } catch (error) {
      console.error('Error downloading complaint:', error);
      Alert.alert('Error', 'Failed to download complaint report. Please try again.');
    }
  }, [user, activeBooking, property]);

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return 'N/A';
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={sharedStyles.container} edges={['bottom', 'left', 'right']}>
        <View style={sharedStyles.loadingContainer}>
          <ActivityIndicator size="large" color={designTokens.colors.primary} />
          <Text style={sharedStyles.loadingText}>Loading dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!activeBooking) {
    return null; // Will redirect
  }

  const nextDueDays = rentHistory?.nextDueDate 
    ? Math.ceil((new Date(rentHistory.nextDueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  const isNextDueOverdue = rentHistory?.nextDueDate 
    ? isPaymentOverdue(rentHistory.nextDueDate)
    : false;

  // Calculate next month's payment date - exactly 1 month after current due date
  // Payments are monthly and due on the same day of month as move-in date
  // Skips months that are already paid (for advance payments)
  const getNextMonthPaymentDate = () => {
    if (!activeBooking?.startDate || !rentHistory?.nextDueDate) return null;
    
    // Get the day of the month from the start date (when tenant moved in)
    const startDate = new Date(activeBooking.startDate);
    const moveInDay = startDate.getDate();
    
    // Get the current next due date
    const currentDueDate = new Date(rentHistory.nextDueDate);
    
    // Start from 1 month after current due date
    let nextMonth = new Date(currentDueDate);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    
    // Ensure it's on the same day of month as move-in date
    // Handle edge cases where the day doesn't exist in the target month (e.g., Jan 31 -> Feb 28/29)
    const lastDayOfTargetMonth = new Date(nextMonth.getFullYear(), nextMonth.getMonth() + 1, 0).getDate();
    const targetDay = Math.min(moveInDay, lastDayOfTargetMonth);
    nextMonth.setDate(targetDay);
    
    // Check if this month's payment is already paid, and skip to next unpaid month
    // Limit to checking up to 12 months ahead to avoid infinite loops
    let attempts = 0;
    const maxAttempts = 12;
    
    while (attempts < maxAttempts) {
      // Format the payment month as YYYY-MM
      const paymentMonth = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}`;
      
      // Check if this month's payment exists and is already paid
      const existingPayment = rentHistory?.payments?.find(
        p => p.paymentMonth === paymentMonth && p.status === 'paid'
      );
      
      // If payment doesn't exist or is not paid, this is the next unpaid month
      if (!existingPayment) {
        return nextMonth;
      }
      
      // Payment is already paid, skip to next month
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      
      // Recalculate the day of month for the new month
      const newLastDayOfMonth = new Date(nextMonth.getFullYear(), nextMonth.getMonth() + 1, 0).getDate();
      const newTargetDay = Math.min(moveInDay, newLastDayOfMonth);
      nextMonth.setDate(newTargetDay);
      
      attempts++;
    }
    
    // If we've checked 12 months and all are paid, return the last calculated date
    // (This shouldn't normally happen, but prevents infinite loops)
    return nextMonth;
  };

  const nextMonthPaymentDate = getNextMonthPaymentDate();
  const daysUntilNextMonth = nextMonthPaymentDate 
    ? Math.ceil((nextMonthPaymentDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const formatDateDetailed = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return {
        day: date.getDate(),
        month: date.toLocaleDateString('en-US', { month: 'long' }),
        year: date.getFullYear(),
        full: date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
      };
    } catch {
      return null;
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <SafeAreaView style={sharedStyles.container} edges={['bottom', 'left', 'right']}>
      <ScrollView
        style={sharedStyles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Compact Header with Profile */}
        <View style={[sharedStyles.pageContainer, { paddingTop: designTokens.spacing.md, paddingBottom: designTokens.spacing.sm }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: designTokens.spacing.sm }}>
            <TouchableOpacity
              onPress={() => setShowProfileModal(true)}
              activeOpacity={0.7}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
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
                  <User size={20} color={designTokens.colors.primary} />
                </View>
              )}
            </TouchableOpacity>
            
            <View style={{ flex: 1, flexShrink: 1 }}>
              <Text style={{
                fontSize: designTokens.typography.xs,
                fontWeight: designTokens.typography.medium as any,
                color: designTokens.colors.textSecondary,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
                marginBottom: 2,
              }}>
                {getGreeting()}
              </Text>
              <Text style={{
                fontSize: designTokens.typography.lg,
                fontWeight: designTokens.typography.bold as any,
                color: designTokens.colors.textPrimary,
                flexShrink: 1,
              }} numberOfLines={1}>
                {user?.name || 'Tenant'}
              </Text>
            </View>
          </View>
        </View>

        {/* Prominent Payment Alert Banner - Shows when payment is within 7 days */}
        {rentHistory?.nextDueDate && rentHistory?.nextDueAmount && (nextDueDays <= 7 || isNextDueOverdue) && (
          <View style={[sharedStyles.pageContainer, { paddingTop: designTokens.spacing.sm, paddingBottom: 0 }]}>
            <TouchableOpacity
              onPress={handlePayRent}
              activeOpacity={0.8}
              style={{
                backgroundColor: isNextDueOverdue 
                  ? designTokens.colors.error 
                  : nextDueDays <= 3 
                    ? '#F59E0B' 
                    : designTokens.colors.warning,
                borderRadius: designTokens.borderRadius.md,
                padding: designTokens.spacing.md,
                flexDirection: 'row',
                alignItems: 'center',
                gap: designTokens.spacing.sm,
                ...designTokens.shadows.md,
                borderLeftWidth: 4,
                borderLeftColor: isNextDueOverdue ? '#DC2626' : nextDueDays <= 3 ? '#D97706' : '#F59E0B',
              }}
            >
              <View style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                justifyContent: 'center',
                alignItems: 'center',
              }}>
                {isNextDueOverdue ? (
                  <AlertCircle size={20} color="#FFFFFF" />
                ) : (
                  <Bell size={20} color="#FFFFFF" />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{
                  fontSize: designTokens.typography.sm,
                  fontWeight: designTokens.typography.bold as any,
                  color: '#FFFFFF',
                  marginBottom: 2,
                }}>
                  {isNextDueOverdue 
                    ? `⚠️ Payment Overdue!`
                    : nextDueDays <= 1
                      ? `🚨 Payment Due Tomorrow!`
                      : nextDueDays <= 3
                        ? `⚡ Payment Due in ${nextDueDays} Days`
                        : `📅 Payment Due in ${nextDueDays} Days`}
                </Text>
                <Text style={{
                  fontSize: designTokens.typography.xs,
                  color: 'rgba(255, 255, 255, 0.9)',
                }}>
                  ₱{rentHistory.nextDueAmount.toLocaleString()} • {formatDate(rentHistory.nextDueDate)}
                </Text>
              </View>
              <View style={{
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                borderRadius: designTokens.borderRadius.sm,
                paddingHorizontal: designTokens.spacing.sm,
                paddingVertical: designTokens.spacing.xs,
              }}>
                <ChevronRight size={18} color="#FFFFFF" />
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* Compact Payment Notification Banner */}
        {rentHistory?.nextDueDate && rentHistory?.nextDueAmount && (
          <View style={[sharedStyles.pageContainer, { paddingTop: designTokens.spacing.sm, paddingBottom: designTokens.spacing.sm }]}>
            <LinearGradient
              colors={isNextDueOverdue ? ['#DC2626', '#EF4444'] as const : designTokens.gradients.primary as any}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[sharedStyles.cardModern, { marginBottom: designTokens.spacing.md, padding: designTokens.spacing.md }]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: designTokens.spacing.sm }}>
                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: designTokens.spacing.sm }}>
                  <View style={[sharedStyles.statIcon, { backgroundColor: 'rgba(255, 255, 255, 0.2)', width: 36, height: 36 }]}>
                    <Bell size={18} color="#FFFFFF" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{
                      fontSize: designTokens.typography.xs,
                      fontWeight: designTokens.typography.medium as any,
                      color: '#FFFFFF',
                      marginBottom: 2,
                    }}>
                      {isNextDueOverdue 
                        ? `Overdue - ${getDaysOverdue(rentHistory.nextDueDate)} days`
                        : nextDueDays <= 7 
                          ? `Due in ${nextDueDays} day${nextDueDays !== 1 ? 's' : ''}`
                          : 'Upcoming Payment'}
                    </Text>
                    <Text style={{
                      fontSize: designTokens.typography.xl,
                      fontWeight: designTokens.typography.bold as any,
                      color: '#FFFFFF',
                      marginBottom: 2,
                    }}>
                      ₱{rentHistory.nextDueAmount.toLocaleString()}
                    </Text>
                    <Text style={{
                      fontSize: designTokens.typography.xs,
                      color: 'rgba(255, 255, 255, 0.9)',
                    }}>
                      {formatDateDetailed(rentHistory.nextDueDate)?.full}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={[sharedStyles.primaryButton, { backgroundColor: 'rgba(255, 255, 255, 0.2)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.3)', paddingVertical: 10, paddingHorizontal: 16 }]}
                  onPress={handlePayRent}
                  activeOpacity={0.8}
                >
                  <Coins size={16} color="#FFFFFF" />
                  <Text style={[sharedStyles.primaryButtonText, { color: '#FFFFFF', fontSize: 14 }]}>Pay</Text>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </View>
        )}

        {/* Compact Property Information Card */}
        <View style={[sharedStyles.pageContainer, { paddingTop: designTokens.spacing.sm, paddingBottom: designTokens.spacing.sm }]}>
          <View style={sharedStyles.card}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: designTokens.spacing.md }}>
              <View style={[sharedStyles.statIcon, iconBackgrounds.blue, { width: 32, height: 32 }]}>
                <Home size={16} color="#3B82F6" />
              </View>
              <Text style={[sharedStyles.sectionTitle, { fontSize: designTokens.typography.base }]}>Property</Text>
            </View>
            <View>
              <Text style={{
                fontSize: designTokens.typography.base,
                fontWeight: designTokens.typography.bold as any,
                color: designTokens.colors.textPrimary,
                marginBottom: 4,
              }}>{activeBooking.propertyTitle}</Text>
              <Text style={{
                fontSize: designTokens.typography.xs,
                color: designTokens.colors.textSecondary,
                marginBottom: designTokens.spacing.sm,
              }} numberOfLines={1}>{activeBooking.propertyAddress}</Text>
              
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: designTokens.spacing.xs, marginBottom: 4 }}>
                <Calendar size={14} color={designTokens.colors.textSecondary} />
                <Text style={{
                  fontSize: designTokens.typography.xs,
                  color: designTokens.colors.textSecondary,
                }}>
                  {formatDate(activeBooking.startDate)}
                </Text>
                <Text style={{ fontSize: designTokens.typography.xs, color: designTokens.colors.textSecondary, marginLeft: designTokens.spacing.sm }}>
                  • {activeBooking.ownerName}
                </Text>
              </View>

              <TouchableOpacity
                style={[sharedStyles.primaryButton, { marginTop: designTokens.spacing.sm, paddingVertical: 10 }]}
                onPress={handleMessageOwner}
                activeOpacity={0.8}
              >
                <MessageSquare size={16} color="#FFFFFF" />
                <Text style={[sharedStyles.primaryButtonText, { fontSize: 14 }]}>Message Owner</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Compact Payment Details Card */}
        {rentHistory?.nextDueDate && rentHistory?.nextDueAmount && (
          <View style={[sharedStyles.pageContainer, { paddingTop: designTokens.spacing.sm, paddingBottom: designTokens.spacing.sm }]}>
            <View style={[
              sharedStyles.card,
              isNextDueOverdue && { borderWidth: 2, borderColor: designTokens.colors.error }
            ]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: designTokens.spacing.sm }}>
                <View style={[sharedStyles.statIcon, isNextDueOverdue ? iconBackgrounds.red : iconBackgrounds.green, { width: 32, height: 32 }]}>
                  <CreditCard size={16} color={isNextDueOverdue ? "#EF4444" : "#10B981"} />
                </View>
                <Text style={[sharedStyles.sectionTitle, { fontSize: designTokens.typography.base }]}>Payment Details</Text>
              </View>
              <View>
                <View style={sharedStyles.grid}>
                  <View style={[sharedStyles.gridItem, { width: '48%' }]}>
                    <Text style={[sharedStyles.statLabel, { fontSize: designTokens.typography.xs }]}>Amount Due</Text>
                    <Text style={[sharedStyles.statValue, { fontSize: designTokens.typography.base }]}>
                      ₱{rentHistory.nextDueAmount.toLocaleString()}
                    </Text>
                  </View>
                  <View style={[sharedStyles.gridItem, { width: '48%' }]}>
                    <Text style={[sharedStyles.statLabel, { fontSize: designTokens.typography.xs }]}>Due Date</Text>
                    <Text style={[sharedStyles.statValue, isNextDueOverdue && { color: designTokens.colors.error }, { fontSize: designTokens.typography.sm }]}>
                      {formatDate(rentHistory.nextDueDate)}
                    </Text>
                  </View>
                  {nextMonthPaymentDate && (
                    <View style={[sharedStyles.gridItem, { width: '100%', marginTop: designTokens.spacing.xs }]}>
                      <Text style={[sharedStyles.statLabel, { fontSize: designTokens.typography.xs }]}>Next Month</Text>
                      <Text style={[sharedStyles.statValue, { fontSize: designTokens.typography.sm }]}>
                        {formatDate(nextMonthPaymentDate.toISOString().split('T')[0])}
                      </Text>
                    </View>
                  )}
                </View>
                
                {isNextDueOverdue && (
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'flex-start',
                    gap: designTokens.spacing.xs,
                    backgroundColor: designTokens.colors.errorLight,
                    padding: designTokens.spacing.sm,
                    borderRadius: designTokens.borderRadius.md,
                    marginTop: designTokens.spacing.sm,
                    marginBottom: designTokens.spacing.sm,
                  }}>
                    <AlertCircle size={16} color="#EF4444" style={{ marginTop: 2 }} />
                    <Text style={{
                      flex: 1,
                      fontSize: designTokens.typography.xs,
                      color: designTokens.colors.error,
                      lineHeight: 16,
                    }}>
                      {getDaysOverdue(rentHistory.nextDueDate)} days overdue. Pay immediately to avoid late fees.
                    </Text>
                  </View>
                )}
                
                <View style={{ flexDirection: 'row', gap: designTokens.spacing.xs, marginTop: designTokens.spacing.sm }}>
                  <TouchableOpacity
                    style={[sharedStyles.primaryButton, isNextDueOverdue && { backgroundColor: designTokens.colors.error }, { flex: 1, paddingVertical: 10 }]}
                    onPress={handlePayRent}
                    activeOpacity={0.8}
                  >
                    <Coins size={16} color="#FFFFFF" />
                    <Text style={[sharedStyles.primaryButtonText, { fontSize: 14 }]}>Pay Now</Text>
                  </TouchableOpacity>

                </View>

              </View>
            </View>
          </View>
        )}

        {/* Compact Maintenance Requests */}
        <View style={[sharedStyles.pageContainer, { paddingTop: designTokens.spacing.sm, paddingBottom: designTokens.spacing.sm }]}>
          <View style={sharedStyles.card}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: designTokens.spacing.sm }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={[sharedStyles.statIcon, iconBackgrounds.blue, { width: 32, height: 32 }]}>
                  <Wrench size={16} color="#3B82F6" />
                </View>
                <Text style={[sharedStyles.sectionTitle, { fontSize: designTokens.typography.base }]}>Maintenance Requests</Text>
              </View>
              {pendingMaintenanceCount > 0 && (
                <View style={{
                  backgroundColor: designTokens.colors.warning,
                  borderRadius: 12,
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                }}>
                  <Text style={{
                    fontSize: designTokens.typography.xs,
                    fontWeight: designTokens.typography.bold as any,
                    color: '#FFFFFF',
                  }}>
                    {pendingMaintenanceCount}
                  </Text>
                </View>
              )}
            </View>
            
            <View style={{ gap: designTokens.spacing.sm }}>
              {maintenanceRequests.length > 0 ? (
                <>
                  {maintenanceRequests.slice(0, 3).map((request) => (
                    <TouchableOpacity
                      key={request.id}
                      onPress={() => {
                        setSelectedMaintenanceRequest(request);
                        setShowMaintenanceDetailModal(true);
                      }}
                      activeOpacity={0.7}
                      style={[sharedStyles.listItem, { marginBottom: 0, paddingVertical: 10 }]}
                    >
                      <View style={[sharedStyles.listItemIcon, 
                        request.status === 'resolved' ? iconBackgrounds.green :
                        request.status === 'cancelled' ? iconBackgrounds.red :
                        request.status === 'in_progress' ? iconBackgrounds.blue :
                        request.priority === 'urgent' ? iconBackgrounds.red :
                        iconBackgrounds.orange,
                        { width: 28, height: 28 }
                      ]}>
                        {request.status === 'resolved' ? (
                          <CheckCircle size={16} color="#10B981" />
                        ) : request.status === 'cancelled' ? (
                          <XCircle size={16} color="#EF4444" />
                        ) : request.status === 'in_progress' ? (
                          <Clock size={16} color="#3B82F6" />
                        ) : (
                          <AlertCircle size={16} color={request.priority === 'urgent' ? "#EF4444" : "#F59E0B"} />
                        )}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{
                          fontSize: designTokens.typography.sm,
                          fontWeight: designTokens.typography.semibold as any,
                          color: designTokens.colors.textPrimary,
                          marginBottom: 2,
                        }} numberOfLines={1}>
                          {request.title}
                        </Text>
                        <Text style={{
                          fontSize: designTokens.typography.xs,
                          color: designTokens.colors.textSecondary,
                        }}>
                          {request.category.replace('_', ' ')} • {request.priority}
                        </Text>
                      </View>
                      <View style={{ alignItems: 'flex-end', gap: 4 }}>
                        <Text style={{
                          fontSize: designTokens.typography.xs,
                          color: request.status === 'resolved' ? designTokens.colors.success :
                                 request.status === 'cancelled' ? designTokens.colors.error :
                                 request.status === 'in_progress' ? designTokens.colors.info :
                                 designTokens.colors.warning,
                          fontWeight: designTokens.typography.medium as any,
                          textTransform: 'capitalize',
                        }}>
                          {request.status.replace('_', ' ')}
                        </Text>
                        {(request.status === 'pending' || request.status === 'in_progress') && (
                          <TouchableOpacity
                            onPress={(e) => {
                              e.stopPropagation();
                              handleCancelMaintenanceRequest(request.id);
                            }}
                            disabled={cancellingRequest === request.id}
                            style={{
                              paddingHorizontal: 8,
                              paddingVertical: 4,
                              backgroundColor: designTokens.colors.errorLight,
                              borderRadius: 6,
                            }}
                            activeOpacity={0.7}
                          >
                            {cancellingRequest === request.id ? (
                              <ActivityIndicator size="small" color={designTokens.colors.error} />
                            ) : (
                              <Text style={{
                                fontSize: designTokens.typography.xs,
                                color: designTokens.colors.error,
                                fontWeight: designTokens.typography.semibold as any,
                              }}>
                                Cancel
                              </Text>
                            )}
                          </TouchableOpacity>
                        )}
                      </View>
                    </TouchableOpacity>
                  ))}
                  {maintenanceRequests.length > 3 && (
                    <TouchableOpacity
                      onPress={() => setShowMaintenanceHistory(true)}
                      style={{
                        padding: designTokens.spacing.sm,
                        alignItems: 'center',
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={{
                        fontSize: designTokens.typography.xs,
                        color: designTokens.colors.primary,
                        fontWeight: designTokens.typography.semibold as any,
                      }}>
                        View All {maintenanceRequests.length} Request{maintenanceRequests.length > 1 ? 's' : ''} →
                      </Text>
                    </TouchableOpacity>
                  )}
                </>
              ) : (
                <Text style={{
                  fontSize: designTokens.typography.sm,
                  color: designTokens.colors.textSecondary,
                  textAlign: 'center',
                  paddingVertical: designTokens.spacing.md,
                }}>
                  No maintenance requests yet
                </Text>
              )}
              
              <View style={{ flexDirection: 'row', gap: designTokens.spacing.xs, marginTop: designTokens.spacing.xs }}>
                <TouchableOpacity
                  style={[sharedStyles.primaryButton, { flex: 1, paddingVertical: 10 }]}
                  onPress={() => setShowMaintenanceModal(true)}
                  activeOpacity={0.8}
                >
                  <Plus size={16} color="#FFFFFF" />
                  <Text style={[sharedStyles.primaryButtonText, { fontSize: 14 }]}>Report Issue</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[sharedStyles.secondaryButton, { flex: 1, paddingVertical: 10 }]}
                  onPress={() => setShowMaintenanceHistory(true)}
                  activeOpacity={0.8}
                >
                  <FileText size={16} color={designTokens.colors.info} />
                  <Text style={[sharedStyles.secondaryButtonText, { color: designTokens.colors.info, fontSize: 14 }]}>History</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={[sharedStyles.secondaryButton, { paddingVertical: 10 }]}
                onPress={handleMessageOwner}
                activeOpacity={0.8}
              >
                <MessageSquare size={16} color={designTokens.colors.info} />
                <Text style={[sharedStyles.secondaryButtonText, { color: designTokens.colors.info, fontSize: 14 }]}>Chat Owner</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Complaints Section - Similar to Maintenance Requests */}
        <View style={[sharedStyles.pageContainer, { paddingTop: designTokens.spacing.sm, paddingBottom: designTokens.spacing.sm }]}>
          <View style={sharedStyles.card}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: designTokens.spacing.sm }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={[sharedStyles.statIcon, iconBackgrounds.red, { width: 32, height: 32 }]}>
                  <AlertTriangle size={16} color="#EF4444" />
                </View>
                <Text style={[sharedStyles.sectionTitle, { fontSize: designTokens.typography.base }]}>Complaints</Text>
              </View>
              {complaints.filter(c => c.status === 'submitted' || c.status === 'received_by_brgy' || c.status === 'under_review').length > 0 && (
                <View style={{
                  backgroundColor: designTokens.colors.error,
                  borderRadius: 12,
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                }}>
                  <Text style={{
                    fontSize: designTokens.typography.xs,
                    fontWeight: designTokens.typography.bold as any,
                    color: '#FFFFFF',
                  }}>
                    {complaints.filter(c => c.status === 'submitted' || c.status === 'received_by_brgy' || c.status === 'under_review').length}
                  </Text>
                </View>
              )}
            </View>
            
            <View style={{ gap: designTokens.spacing.sm }}>
              {complaints.length > 0 ? (
                <>
                  {complaints.slice(0, 3).map((complaint) => (
                    <TouchableOpacity
                      key={complaint.id}
                      onPress={() => {
                        setSelectedComplaintForHistory(complaint);
                        setShowComplaintDetailModal(true);
                      }}
                      activeOpacity={0.7}
                      style={[sharedStyles.listItem, { marginBottom: 0, paddingVertical: 10 }]}
                    >
                      <View style={[sharedStyles.listItemIcon, 
                        complaint.status === 'resolved' ? iconBackgrounds.green :
                        complaint.status === 'closed' ? iconBackgrounds.gray :
                        complaint.status === 'for_mediation' ? iconBackgrounds.orange :
                        iconBackgrounds.blue,
                        { width: 28, height: 28 }
                      ]}>
                        {complaint.status === 'resolved' ? (
                          <CheckCircle size={16} color="#10B981" />
                        ) : complaint.status === 'closed' ? (
                          <CheckCircle size={16} color="#6B7280" />
                        ) : complaint.status === 'for_mediation' ? (
                          <Clock size={16} color="#F59E0B" />
                        ) : (
                          <AlertCircle size={16} color={complaint.urgency === 'urgent' ? "#EF4444" : "#3B82F6"} />
                        )}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{
                          fontSize: designTokens.typography.sm,
                          fontWeight: designTokens.typography.semibold as any,
                          color: designTokens.colors.textPrimary,
                          marginBottom: 2,
                        }} numberOfLines={1}>
                          {getComplaintCategoryLabel(complaint.category)}
                        </Text>
                        <Text style={{
                          fontSize: designTokens.typography.xs,
                          color: designTokens.colors.textSecondary,
                        }}>
                          {new Date(complaint.createdAt).toLocaleDateString()} • {getStatusLabel(complaint.status)}
                        </Text>
                      </View>
                      <View style={{ alignItems: 'flex-end', gap: 4 }}>
                        <Text style={{
                          fontSize: designTokens.typography.xs,
                          color: complaint.status === 'resolved' ? designTokens.colors.success :
                                 complaint.status === 'closed' ? designTokens.colors.textMuted :
                                 complaint.status === 'for_mediation' ? designTokens.colors.warning :
                                 designTokens.colors.info,
                          fontWeight: designTokens.typography.medium as any,
                          textTransform: 'capitalize',
                        }}>
                          {getStatusLabel(complaint.status)}
                        </Text>
                        <TouchableOpacity
                          onPress={async (e) => {
                            e.stopPropagation();
                            await handleDownloadComplaint(complaint);
                          }}
                          style={{
                            paddingHorizontal: 8,
                            paddingVertical: 4,
                            backgroundColor: designTokens.colors.background,
                            borderRadius: 6,
                          }}
                          activeOpacity={0.7}
                        >
                          <Download size={14} color={designTokens.colors.primary} />
                        </TouchableOpacity>
                      </View>
                    </TouchableOpacity>
                  ))}
                  {complaints.length > 3 && (
                    <TouchableOpacity
                      onPress={() => setShowComplaintHistory(true)}
                      style={{
                        padding: designTokens.spacing.sm,
                        alignItems: 'center',
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={{
                        fontSize: designTokens.typography.xs,
                        color: designTokens.colors.primary,
                        fontWeight: designTokens.typography.semibold as any,
                      }}>
                        View All {complaints.length} Complaint{complaints.length > 1 ? 's' : ''} →
                      </Text>
                    </TouchableOpacity>
                  )}
                </>
              ) : (
                <Text style={{
                  fontSize: designTokens.typography.sm,
                  color: designTokens.colors.textSecondary,
                  textAlign: 'center',
                  paddingVertical: designTokens.spacing.md,
                }}>
                  No complaints yet
                </Text>
              )}
              
              <View style={{ flexDirection: 'row', gap: designTokens.spacing.xs, marginTop: designTokens.spacing.xs }}>
                <TouchableOpacity
                  style={[sharedStyles.primaryButton, { flex: 1, paddingVertical: 10, backgroundColor: designTokens.colors.error }]}
                  onPress={() => setShowComplaintModal(true)}
                  activeOpacity={0.8}
                >
                  <AlertTriangle size={16} color="#FFFFFF" />
                  <Text style={[sharedStyles.primaryButtonText, { fontSize: 14 }]}>Submit Complaint</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[sharedStyles.secondaryButton, { flex: 1, paddingVertical: 10 }]}
                  onPress={() => setShowComplaintHistory(true)}
                  activeOpacity={0.8}
                >
                  <FileText size={16} color={designTokens.colors.info} />
                  <Text style={[sharedStyles.secondaryButtonText, { color: designTokens.colors.info, fontSize: 14 }]}>History</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        {/* Compact Payment Reminders */}
        {reminders.length > 0 && (
          <View style={[sharedStyles.pageContainer, { paddingTop: designTokens.spacing.sm, paddingBottom: designTokens.spacing.sm }]}>
            <View style={sharedStyles.card}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: designTokens.spacing.sm }}>
                <View style={[sharedStyles.statIcon, iconBackgrounds.orange, { width: 32, height: 32 }]}>
                  <Bell size={16} color="#F59E0B" />
                </View>
                <Text style={[sharedStyles.sectionTitle, { fontSize: designTokens.typography.base }]}>Reminders</Text>
              </View>
              <View style={{ gap: designTokens.spacing.sm }}>
                {reminders.map((reminder) => (
                  <View key={reminder.id} style={[sharedStyles.listItem, { marginBottom: 0, paddingVertical: 10 }]}>
                    <View style={[sharedStyles.listItemIcon, reminder.type === 'overdue' ? iconBackgrounds.red : iconBackgrounds.orange, { width: 28, height: 28 }]}>
                      {reminder.type === 'overdue' ? (
                        <AlertCircle size={16} color="#EF4444" />
                      ) : (
                        <Clock size={16} color="#F59E0B" />
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{
                        fontSize: designTokens.typography.sm,
                        fontWeight: designTokens.typography.semibold as any,
                        color: designTokens.colors.textPrimary,
                        marginBottom: 2,
                      }}>{reminder.message}</Text>
                      <Text style={{
                        fontSize: designTokens.typography.xs,
                        color: designTokens.colors.textSecondary,
                      }}>
                        {formatDate(reminder.dueDate)}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* Compact Rent History */}
        {rentHistory && rentHistory.payments.length > 0 && (
          <View style={[sharedStyles.pageContainer, { paddingTop: designTokens.spacing.sm, paddingBottom: designTokens.spacing.lg }]}>
            <View style={sharedStyles.card}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: designTokens.spacing.sm }}>
                <View style={[sharedStyles.statIcon, iconBackgrounds.blue, { width: 32, height: 32 }]}>
                  <FileText size={16} color="#3B82F6" />
                </View>
                <Text style={[sharedStyles.sectionTitle, { fontSize: designTokens.typography.base }]}>Rent History</Text>
              </View>
              <View>
                {/* Summary */}
                <View style={sharedStyles.grid}>
                  <View style={[sharedStyles.gridItem, { width: '48%' }]}>
                    <Text style={[sharedStyles.statLabel, { fontSize: designTokens.typography.xs }]}>Total Paid</Text>
                    <Text style={[sharedStyles.statValue, { color: designTokens.colors.success, fontSize: designTokens.typography.base }]}>
                      ₱{rentHistory.totalPaid.toLocaleString()}
                    </Text>
                  </View>
                  <View style={[sharedStyles.gridItem, { width: '48%' }]}>
                    <Text style={[sharedStyles.statLabel, { fontSize: designTokens.typography.xs }]}>Pending</Text>
                    <Text style={[sharedStyles.statValue, { color: designTokens.colors.warning, fontSize: designTokens.typography.base }]}>
                      ₱{rentHistory.totalPending.toLocaleString()}
                    </Text>
                  </View>
                  {rentHistory.totalOverdue > 0 && (
                    <>
                      <View style={[sharedStyles.gridItem, { width: '48%' }]}>
                        <Text style={[sharedStyles.statLabel, { fontSize: designTokens.typography.xs }]}>Overdue</Text>
                        <Text style={[sharedStyles.statValue, { color: designTokens.colors.error, fontSize: designTokens.typography.base }]}>
                          ₱{rentHistory.totalOverdue.toLocaleString()}
                        </Text>
                      </View>
                      {rentHistory.totalLateFees > 0 && (
                        <View style={[sharedStyles.gridItem, { width: '48%' }]}>
                          <Text style={[sharedStyles.statLabel, { fontSize: designTokens.typography.xs }]}>Late Fees</Text>
                          <Text style={[sharedStyles.statValue, { color: designTokens.colors.error, fontSize: designTokens.typography.base }]}>
                            ₱{rentHistory.totalLateFees.toLocaleString()}
                          </Text>
                        </View>
                      )}
                    </>
                  )}
                </View>

                {/* Payment List */}
                <View style={{ gap: designTokens.spacing.sm, marginTop: designTokens.spacing.md }}>
                  {rentHistory.payments.map((payment) => (
                    <TouchableOpacity
                      key={payment.id}
                      style={[sharedStyles.listItem, { marginBottom: 0, paddingVertical: 10 }]}
                      onPress={() => payment.status === 'paid' && handleViewReceipt(payment)}
                      activeOpacity={payment.status === 'paid' ? 0.7 : 1}
                    >
                      <View style={[sharedStyles.listItemIcon, 
                        payment.status === 'paid' ? iconBackgrounds.green :
                        payment.status === 'overdue' ? iconBackgrounds.red :
                        iconBackgrounds.orange,
                        { width: 28, height: 28 }
                      ]}>
                        {payment.status === 'paid' ? (
                          <CheckCircle size={16} color="#10B981" />
                        ) : payment.status === 'overdue' ? (
                          <XCircle size={16} color="#EF4444" />
                        ) : (
                          <Clock size={16} color="#F59E0B" />
                        )}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{
                          fontSize: designTokens.typography.sm,
                          fontWeight: designTokens.typography.semibold as any,
                          color: designTokens.colors.textPrimary,
                          marginBottom: 2,
                        }}>
                          {new Date(payment.paymentMonth + '-01').toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                          })}
                        </Text>
                        <Text style={{
                          fontSize: designTokens.typography.xs,
                          color: designTokens.colors.textSecondary,
                        }}>
                          {formatDate(payment.dueDate)}
                          {payment.paidDate && ` • ${formatDate(payment.paidDate)}`}
                        </Text>
                        {payment.lateFee > 0 && (
                          <Text style={{
                            fontSize: designTokens.typography.xs,
                            color: designTokens.colors.error,
                            marginTop: 2,
                          }}>
                            +₱{payment.lateFee.toLocaleString()} late fee
                          </Text>
                        )}
                      </View>
                      <View style={{ alignItems: 'flex-end', gap: 2 }}>
                        <Text style={{
                          fontSize: designTokens.typography.sm,
                          fontWeight: designTokens.typography.bold as any,
                          color: payment.status === 'paid' ? designTokens.colors.success :
                                 payment.status === 'overdue' ? designTokens.colors.error :
                                 designTokens.colors.textPrimary,
                        }}>
                          ₱{payment.totalAmount.toLocaleString()}
                        </Text>
                        {payment.status === 'paid' && (
                          <ChevronRight size={14} color={designTokens.colors.textSecondary} />
                        )}
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Unified Payment Modal */}
      <Modal
        visible={showPaymentModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowPaymentModal(false);
          setSelectedPayments(new Set());
          setSelectedPaymentMethod(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.advancedPaymentModalContent]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Make Payment</Text>
              <TouchableOpacity onPress={() => {
                setShowPaymentModal(false);
                setSelectedPayments(new Set());
                setSelectedPaymentMethod(null);
              }}>
                <XCircle size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.advancedPaymentScrollView}>
              <Text style={styles.advancedPaymentModalDescription}>
                Select the payment(s) you want to pay. You can pay the current due payment and future months together.
              </Text>
              
              {/* Current Due Payment */}
              {rentHistory?.nextDueDate && (() => {
                const currentPayment = rentHistory.payments.find(
                  p => p.dueDate === rentHistory.nextDueDate && (p.status === 'pending' || p.status === 'overdue')
                );
                if (!currentPayment) return null;
                
                const isSelected = selectedPayments.has(currentPayment.id);
                const isOverdue = currentPayment.status === 'overdue';
                
                return (
                  <View style={styles.paymentSection}>
                    <Text style={styles.paymentSectionTitle}>Current Payment</Text>
                    <TouchableOpacity
                      style={[
                        styles.advancedPaymentModalItem,
                        isSelected && styles.advancedPaymentModalItemSelected,
                        isOverdue && styles.advancedPaymentModalItemOverdue
                      ]}
                      onPress={() => {
                        const newSet = new Set(selectedPayments);
                        if (isSelected) {
                          newSet.delete(currentPayment.id);
                        } else {
                          newSet.add(currentPayment.id);
                        }
                        setSelectedPayments(newSet);
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={styles.advancedPaymentModalLeft}>
                        <View style={[
                          styles.advancedPaymentModalCheckbox,
                          isSelected && styles.advancedPaymentModalCheckboxSelected,
                          isOverdue && styles.advancedPaymentModalCheckboxOverdue
                        ]}>
                          {isSelected && <CheckCircle size={18} color="#FFFFFF" />}
                        </View>
                        <View style={styles.advancedPaymentModalInfo}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Text style={styles.advancedPaymentModalMonth}>
                              {isOverdue ? '⚠️ Overdue Payment' : 'Current Due Payment'}
                            </Text>
                            {isOverdue && (
                              <View style={{
                                backgroundColor: '#EF4444',
                                paddingHorizontal: 6,
                                paddingVertical: 2,
                                borderRadius: 4,
                              }}>
                                <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '600' }}>
                                  OVERDUE
                                </Text>
                              </View>
                            )}
                          </View>
                          <Text style={styles.advancedPaymentModalDate}>
                            Due: {formatDate(currentPayment.dueDate)}
                          </Text>
                          {currentPayment.lateFee > 0 && (
                            <Text style={{ fontSize: 12, color: '#EF4444', marginTop: 2 }}>
                              Late Fee: ₱{currentPayment.lateFee.toLocaleString()}
                            </Text>
                          )}
                        </View>
                      </View>
                      <Text style={styles.advancedPaymentModalAmount}>
                        ₱{currentPayment.totalAmount.toLocaleString()}
                      </Text>
                    </TouchableOpacity>
                  </View>
                );
              })()}

              {/* Future Payments */}
              {futurePayments.length > 0 && (
                <View style={styles.paymentSection}>
                  <Text style={styles.paymentSectionTitle}>Future Payments</Text>
                  <View style={styles.advancedPaymentList}>
                    {futurePayments.map((payment) => {
                      const isSelected = selectedPayments.has(payment.id);
                      const monthName = new Date(payment.paymentMonth + '-01').toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                      });
                      
                      return (
                        <TouchableOpacity
                          key={payment.id}
                          style={[
                            styles.advancedPaymentModalItem,
                            isSelected && styles.advancedPaymentModalItemSelected
                          ]}
                          onPress={() => {
                            const newSet = new Set(selectedPayments);
                            if (isSelected) {
                              newSet.delete(payment.id);
                            } else {
                              newSet.add(payment.id);
                            }
                            setSelectedPayments(newSet);
                          }}
                          activeOpacity={0.7}
                        >
                          <View style={styles.advancedPaymentModalLeft}>
                            <View style={[
                              styles.advancedPaymentModalCheckbox,
                              isSelected && styles.advancedPaymentModalCheckboxSelected
                            ]}>
                              {isSelected && <CheckCircle size={18} color="#FFFFFF" />}
                            </View>
                            <View style={styles.advancedPaymentModalInfo}>
                              <Text style={styles.advancedPaymentModalMonth}>{monthName}</Text>
                              <Text style={styles.advancedPaymentModalDate}>
                                Due: {formatDate(payment.dueDate)}
                              </Text>
                            </View>
                          </View>
                          <Text style={styles.advancedPaymentModalAmount}>
                            ₱{payment.totalAmount.toLocaleString()}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* Payment Summary */}
              {selectedPayments.size > 0 && (() => {
                const allPayments = [
                  ...(rentHistory?.payments.filter(p => selectedPayments.has(p.id)) || []),
                  ...futurePayments.filter(p => selectedPayments.has(p.id))
                ];
                const totalAmount = allPayments.reduce((sum, p) => sum + p.totalAmount, 0);
                
                return (
                  <View style={styles.advancedPaymentModalSummary}>
                    <View style={styles.advancedPaymentModalSummaryRow}>
                      <Text style={styles.advancedPaymentModalSummaryLabel}>
                        Selected: {selectedPayments.size} payment{selectedPayments.size > 1 ? 's' : ''}
                      </Text>
                      <Text style={styles.advancedPaymentModalSummaryAmount}>
                        ₱{totalAmount.toLocaleString()}
                      </Text>
                    </View>
                  </View>
                );
              })()}

              {/* Owner Payment Methods */}
              {ownerPaymentAccounts.length > 0 && (
                <View style={styles.paymentMethodsSection}>
                  <Text style={styles.paymentMethodsTitle}>Payment Method</Text>
                  <View style={styles.paymentMethodsList}>
                    {/* Paymongo Payment Option */}
                    <TouchableOpacity
                      style={[
                        styles.paymentMethodOption,
                        selectedPaymentMethod === 'Paymongo' && styles.paymentMethodOptionSelected
                      ]}
                      onPress={() => {
                        setSelectedPaymentMethod('Paymongo');
                        if (selectedPayments.size > 1) {
                          Alert.alert(
                            'Paymongo Payment',
                            'Paymongo payment is currently available for single payments only. Please select one payment at a time.',
                            [{ text: 'OK' }]
                          );
                          return;
                        }
                        const allPayments = [
                          ...(rentHistory?.payments.filter(p => selectedPayments.has(p.id)) || []),
                          ...futurePayments.filter(p => selectedPayments.has(p.id))
                        ];
                        const paymentToUse = allPayments[0];
                        if (paymentToUse) {
                          setSelectedPayment(paymentToUse);
                          setShowPaymongoModal(true);
                        }
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={styles.paymentMethodLeft}>
                        <Text style={styles.paymentMethodIcon}>💳</Text>
                        <View style={styles.paymentMethodInfo}>
                          <Text style={styles.paymentMethodName}>Paymongo (Online Payment)</Text>
                          <Text style={styles.paymentMethodAccount}>
                            Secure online payment via GCash, PayMaya, or Card
                          </Text>
                        </View>
                      </View>
                      <View style={styles.paymentMethodAction}>
                        <Text style={styles.paymentMethodActionText}>Pay</Text>
                      </View>
                    </TouchableOpacity>
                    {selectedPaymentMethod === 'Paymongo' && (
                      <View style={styles.paymentMethodSelectedIndicator}>
                        <CheckCircle size={16} color="#10B981" />
                        <Text style={styles.paymentMethodSelectedText}>
                          Selected - Tap "Pay" to proceed
                        </Text>
                      </View>
                    )}
                    
                    {ownerPaymentAccounts.map((account) => {
                      const methodName = account.type === 'gcash' ? 'GCash' : 
                                        account.type === 'paymaya' ? 'Maya' :
                                        account.type === 'bank_transfer' ? 'Bank Transfer' : 'Cash';
                      const methodIcon = account.type === 'gcash' ? '📱' : 
                                        account.type === 'paymaya' ? '💳' :
                                        account.type === 'bank_transfer' ? '🏦' : '💵';
                      const methodIconImage = account.type === 'gcash' ? require('../../assets/images/Gcash.jpg') :
                                             account.type === 'paymaya' ? require('../../assets/images/paymaya.jpg') :
                                             null;
                      const isSelected = selectedPaymentMethod === `${methodName} - ${account.accountNumber.slice(-4)}`;
                      
                      return (
                        <View key={account.id}>
                          <TouchableOpacity
                            style={[
                              styles.paymentMethodOption,
                              isSelected && styles.paymentMethodOptionSelected
                            ]}
                            onPress={() => handlePaymentMethodAction(account)}
                            activeOpacity={0.7}
                          >
                            <View style={styles.paymentMethodLeft}>
                              {methodIconImage ? (
                                <Image 
                                  source={methodIconImage} 
                                  style={styles.paymentMethodIconImage}
                                  resizeMode="cover"
                                />
                              ) : (
                                <Text style={styles.paymentMethodIcon}>{methodIcon}</Text>
                              )}
                              <View style={styles.paymentMethodInfo}>
                                <Text style={styles.paymentMethodName}>{methodName}</Text>
                                <Text style={styles.paymentMethodAccount}>
                                  {account.accountName} • {account.accountNumber}
                                </Text>
                              </View>
                            </View>
                            {(account.type === 'gcash' || account.type === 'paymaya') && (
                              <View style={styles.paymentMethodAction}>
                                <Text style={styles.paymentMethodActionText}>Pay</Text>
                              </View>
                            )}
                          </TouchableOpacity>
                          {isSelected && (
                            <View style={styles.paymentMethodSelectedIndicator}>
                              <CheckCircle size={16} color="#10B981" />
                              <Text style={styles.paymentMethodSelectedText}>
                                Selected - Tap "Confirm Payment" to record
                              </Text>
                            </View>
                          )}
                        </View>
                      );
                    })}
                  </View>
                </View>
              )}

              {ownerPaymentAccounts.length === 0 && (
                <View style={styles.noPaymentMethods}>
                  <Text style={styles.noPaymentMethodsText}>
                    Owner has not set up payment methods. Please contact the owner for payment instructions.
                  </Text>
                </View>
              )}
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => {
                  setShowPaymentModal(false);
                  setSelectedPayments(new Set());
                  setSelectedPaymentMethod(null);
                }}
              >
                <Text style={styles.modalButtonCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.modalButtonConfirm,
                  (selectedPayments.size === 0 || (ownerPaymentAccounts.length > 0 && !selectedPaymentMethod)) && styles.modalButtonDisabled
                ]}
                onPress={handleConfirmPayment}
                disabled={selectedPayments.size === 0 || (ownerPaymentAccounts.length > 0 && !selectedPaymentMethod)}
              >
                <Text style={styles.modalButtonConfirmText}>
                  {selectedPayments.size > 0 
                    ? `Pay ${selectedPayments.size} Payment${selectedPayments.size > 1 ? 's' : ''}`
                    : 'Confirm Payment'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Receipt Modal */}
      <Modal
        visible={showReceiptModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowReceiptModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Payment Receipt</Text>
              <TouchableOpacity onPress={() => setShowReceiptModal(false)}>
                <XCircle size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.receiptContent}>
              <Text style={styles.receiptText}>{selectedReceipt}</Text>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonPrimary]}
                onPress={() => {
                  // TODO: Implement download functionality
                  Alert.alert('Info', 'Download functionality will be implemented soon.');
                }}
              >
                <Download size={18} color="#FFFFFF" />
                <Text style={styles.modalButtonPrimaryText}>Download</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSecondary]}
                onPress={() => setShowReceiptModal(false)}
              >
                <Text style={styles.modalButtonSecondaryText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Tenant Profile Modal */}
      <Modal
        visible={showProfileModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowProfileModal(false)}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          justifyContent: 'flex-end',
        }}>
          <View style={{
            backgroundColor: designTokens.colors.white,
            borderTopLeftRadius: designTokens.borderRadius.xl,
            borderTopRightRadius: designTokens.borderRadius.xl,
            maxHeight: '90%',
            ...designTokens.shadows.xl,
          }}>
            {/* Modal Header */}
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingHorizontal: designTokens.spacing.xl,
              paddingTop: designTokens.spacing.xl,
              paddingBottom: designTokens.spacing.lg,
              borderBottomWidth: 1,
              borderBottomColor: designTokens.colors.border,
              backgroundColor: designTokens.colors.white,
            }}>
              <Text style={{
                fontSize: designTokens.typography['2xl'],
                fontWeight: designTokens.typography.bold as any,
                color: designTokens.colors.textPrimary,
                flex: 1,
              }}>My Profile</Text>
              <TouchableOpacity
                onPress={() => setShowProfileModal(false)}
                style={{
                  padding: designTokens.spacing.sm,
                  marginLeft: designTokens.spacing.md,
                }}
                activeOpacity={0.7}
              >
                <X size={24} color={designTokens.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Profile Content */}
            <ScrollView 
              style={{
                flex: 1,
                paddingHorizontal: designTokens.spacing.xl,
              }} 
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{
                paddingBottom: designTokens.spacing['2xl'],
              }}
            >
              {/* Profile Photo */}
              <View style={{
                alignItems: 'center',
                paddingVertical: designTokens.spacing['2xl'],
                borderBottomWidth: 1,
                borderBottomColor: designTokens.colors.border,
                marginBottom: designTokens.spacing.lg,
              }}>
                {profilePhoto && !profilePhotoError ? (
                  <Image
                    source={{ uri: profilePhoto }}
                    style={{
                      width: 100,
                      height: 100,
                      borderRadius: 50,
                      borderWidth: 4,
                      borderColor: designTokens.colors.white,
                      ...designTokens.shadows.lg,
                      marginBottom: designTokens.spacing.lg,
                    }}
                    onError={() => setProfilePhotoError(true)}
                  />
                ) : (
                  <View style={{
                    width: 100,
                    height: 100,
                    borderRadius: 50,
                    backgroundColor: designTokens.colors.primary,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 4,
                    borderColor: designTokens.colors.white,
                    ...designTokens.shadows.lg,
                    marginBottom: designTokens.spacing.lg,
                  }}>
                    <Text style={{
                      fontSize: 40,
                      fontWeight: designTokens.typography.bold as any,
                      color: designTokens.colors.white,
                    }}>
                      {user?.name?.charAt(0).toUpperCase() || 'U'}
                    </Text>
                  </View>
                )}
                <Text style={{
                  fontSize: designTokens.typography['2xl'],
                  fontWeight: designTokens.typography.bold as any,
                  color: designTokens.colors.textPrimary,
                  marginBottom: designTokens.spacing.xs,
                }}>{user?.name || 'Tenant'}</Text>
                <Text style={{
                  fontSize: designTokens.typography.sm,
                  color: designTokens.colors.textSecondary,
                  fontWeight: designTokens.typography.medium as any,
                }}>Tenant</Text>
              </View>

              {/* Profile Information */}
              <View style={{
                paddingVertical: designTokens.spacing.xl,
                gap: designTokens.spacing.lg,
              }}>
                {user?.email && (
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'flex-start',
                    gap: designTokens.spacing.lg,
                  }}>
                    <View style={[sharedStyles.statIcon, iconBackgrounds.blue]}>
                      <Mail size={20} color="#3B82F6" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{
                        fontSize: designTokens.typography.xs,
                        color: designTokens.colors.textSecondary,
                        fontWeight: designTokens.typography.semibold as any,
                        marginBottom: designTokens.spacing.xs,
                        textTransform: 'uppercase',
                        letterSpacing: 0.5,
                      }}>Email</Text>
                      <Text style={{
                        fontSize: designTokens.typography.base,
                        color: designTokens.colors.textPrimary,
                        fontWeight: designTokens.typography.medium as any,
                      }}>{user.email}</Text>
                    </View>
                  </View>
                )}


                {activeBooking?.propertyAddress && (
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'flex-start',
                    gap: designTokens.spacing.lg,
                  }}>
                    <View style={[sharedStyles.statIcon, iconBackgrounds.blue]}>
                      <MapPin size={20} color="#3B82F6" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{
                        fontSize: designTokens.typography.xs,
                        color: designTokens.colors.textSecondary,
                        fontWeight: designTokens.typography.semibold as any,
                        marginBottom: designTokens.spacing.xs,
                        textTransform: 'uppercase',
                        letterSpacing: 0.5,
                      }}>Current Property</Text>
                      <Text style={{
                        fontSize: designTokens.typography.base,
                        color: designTokens.colors.textPrimary,
                        fontWeight: designTokens.typography.medium as any,
                      }} numberOfLines={2}>
                        {activeBooking.propertyAddress}
                      </Text>
                    </View>
                  </View>
                )}
              </View>

              {/* Action Button */}
              <TouchableOpacity
                style={[sharedStyles.primaryButton, { marginTop: designTokens.spacing.lg }]}
                onPress={() => {
                  setShowProfileModal(false);
                  router.push('/(tabs)/profile');
                }}
                activeOpacity={0.7}
              >
                <Edit size={18} color="#FFFFFF" />
                <Text style={sharedStyles.primaryButtonText}>Edit Profile</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Booking Status Modal */}
      <BookingStatusModal
        visible={bookingStatusModal.visible}
        booking={bookingStatusModal.booking}
        status={bookingStatusModal.status}
        onClose={() => {
          setBookingStatusModal(prev => ({ ...prev, visible: false }));
        }}
        onViewBooking={() => {
          setBookingStatusModal(prev => ({ ...prev, visible: false }));
          router.push('/(tabs)/bookings');
        }}
      />

      {/* Dynamic QR Code Modal for GCash and Maya Payment */}
      {showQRCodeModal && selectedQRCodeAccount && (() => {
        const allPayments = [
          ...(rentHistory?.payments.filter(p => selectedPayments.has(p.id)) || []),
          ...futurePayments.filter(p => selectedPayments.has(p.id))
        ];
        const firstPayment = allPayments[0];
        return firstPayment ? (
        <Modal
          visible={showQRCodeModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => {
            setShowQRCodeModal(false);
            setSelectedQRCodeAccount(null);
          }}
        >
          <View style={styles.qrCodeModalOverlay}>
            <View style={styles.qrCodeModalContainer}>
              <View style={styles.qrCodeModalHeader}>
                <Text style={styles.qrCodeModalTitle}>
                  Scan to Pay with {selectedQRCodeAccount.type === 'gcash' ? 'GCash' : 'Maya'}
                </Text>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <TouchableOpacity
                    style={styles.qrCodeModalShareButton}
                    onPress={async () => {
                      try {
                        const { generatePaymentQRCodeString } = await import('../../utils/qr-code-generator');
                        const qrData = generatePaymentQRCodeString(firstPayment, selectedQRCodeAccount);
                        const paymentMethodName = selectedQRCodeAccount.type === 'gcash' ? 'GCash' : 'Maya';
                        const paymentDetails = `${paymentMethodName} Payment QR Code\n\nAmount: ₱${firstPayment.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\nReference: ${firstPayment.receiptNumber}\nAccount: ${selectedQRCodeAccount.accountName} (${selectedQRCodeAccount.accountNumber})\nPayment Month: ${firstPayment.paymentMonth}\nDue Date: ${new Date(firstPayment.dueDate).toLocaleDateString()}\n\nScan the QR code in the app to pay.`;
                        
                        if (Platform.OS === 'web') {
                          // For web, copy to clipboard
                          if (navigator.clipboard) {
                            await navigator.clipboard.writeText(`${paymentDetails}\n\nQR Code Data:\n${qrData}`);
                            Alert.alert('Copied', 'Payment details copied to clipboard! You can paste and share it.');
                          }
                        } else {
                          // For mobile, use React Native Share API
                          try {
                            await Share.share({
                              message: `${paymentDetails}\n\nQR Code Data:\n${qrData}`,
                              title: `${paymentMethodName} Payment QR Code`,
                            });
                          } catch (shareError) {
                            // Fallback to clipboard if share fails
                            const Clipboard = await import('expo-clipboard');
                            await Clipboard.setStringAsync(`${paymentDetails}\n\nQR Code Data:\n${qrData}`);
                            Alert.alert('Copied', 'Payment details copied to clipboard!');
                          }
                        }
                      } catch (error) {
                        console.error('Error sharing QR code:', error);
                        Alert.alert('Error', 'Failed to share QR code. Please try again.');
                      }
                    }}
                  >
                    <Share2 size={20} color="#3B82F6" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.qrCodeModalCloseButton}
                    onPress={() => {
                      setShowQRCodeModal(false);
                      setSelectedQRCodeAccount(null);
                    }}
                  >
                    <X size={24} color="#6B7280" />
                  </TouchableOpacity>
                </View>
              </View>

              <ScrollView style={styles.qrCodeModalBody} showsVerticalScrollIndicator={false}>
                <View style={styles.qrCodeSection}>
                  <Text style={styles.qrCodeLabel}>Payment QR Code</Text>
                  <Text style={styles.qrCodeSubtitle}>
                    Scan this QR-PH code with your {selectedQRCodeAccount.type === 'gcash' ? 'GCash' : 'Maya'} app{'\n'}
                    {selectedQRCodeAccount.type === 'gcash' ? 'GCash' : 'Maya'} will recognize the payment details automatically{'\n'}
                    Or share it to another device to scan
                  </Text>
                  
                  <View style={styles.qrCodeWrapper}>
                    <QRCode
                      {...getQRCodeProps(firstPayment, selectedQRCodeAccount, 250)}
                    />
                  </View>
                  
                  <TouchableOpacity
                    style={styles.qrCodeShareButton}
                    onPress={async () => {
                      try {
                        const { generatePaymentQRCodeString } = await import('../../utils/qr-code-generator');
                        const qrData = generatePaymentQRCodeString(firstPayment, selectedQRCodeAccount);
                        const paymentMethodName = selectedQRCodeAccount.type === 'gcash' ? 'GCash' : 'Maya';
                        const paymentDetails = `${paymentMethodName} Payment QR Code\n\nAmount: ₱${firstPayment.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\nReference: ${firstPayment.receiptNumber}\nAccount: ${selectedQRCodeAccount.accountName} (${selectedQRCodeAccount.accountNumber})\nPayment Month: ${firstPayment.paymentMonth}\nDue Date: ${new Date(firstPayment.dueDate).toLocaleDateString()}\n\nScan the QR code in the app to pay.`;
                        
                        if (Platform.OS === 'web') {
                          // For web, copy to clipboard
                          if (navigator.clipboard) {
                            await navigator.clipboard.writeText(`${paymentDetails}\n\nQR Code Data:\n${qrData}`);
                            Alert.alert('Copied', 'Payment details copied to clipboard! You can paste and share it.');
                          }
                        } else {
                          // For mobile, use React Native Share API
                          try {
                            await Share.share({
                              message: `${paymentDetails}\n\nQR Code Data:\n${qrData}`,
                              title: `${paymentMethodName} Payment QR Code`,
                            });
                          } catch (shareError) {
                            // Fallback to clipboard if share fails
                            const Clipboard = await import('expo-clipboard');
                            await Clipboard.setStringAsync(`${paymentDetails}\n\nQR Code Data:\n${qrData}`);
                            Alert.alert('Copied', 'Payment details copied to clipboard!');
                          }
                        }
                      } catch (error) {
                        console.error('Error sharing QR code:', error);
                        Alert.alert('Error', 'Failed to share QR code. Please try again.');
                      }
                    }}
                  >
                    <Share2 size={18} color="#3B82F6" />
                    <Text style={styles.qrCodeShareButtonText}>Share QR Code</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.qrCodePaymentDetails}>
                  <Text style={styles.qrCodeDetailsTitle}>Payment Details</Text>
                  
                  <View style={styles.qrCodeDetailRow}>
                    <Text style={styles.qrCodeDetailLabel}>Amount:</Text>
                    <Text style={styles.qrCodeDetailValue}>
                      ₱{firstPayment.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </Text>
                  </View>

                  <View style={styles.qrCodeDetailRow}>
                    <Text style={styles.qrCodeDetailLabel}>Reference:</Text>
                    <Text style={styles.qrCodeDetailValue}>{firstPayment.receiptNumber}</Text>
                  </View>

                  <View style={styles.qrCodeDetailRow}>
                    <Text style={styles.qrCodeDetailLabel}>Account:</Text>
                    <Text style={styles.qrCodeDetailValue}>
                      {selectedQRCodeAccount.accountName} ({selectedQRCodeAccount.accountNumber})
                    </Text>
                  </View>

                  <View style={styles.qrCodeDetailRow}>
                    <Text style={styles.qrCodeDetailLabel}>Payment Month:</Text>
                    <Text style={styles.qrCodeDetailValue}>{firstPayment.paymentMonth}</Text>
                  </View>

                  <View style={styles.qrCodeDetailRow}>
                    <Text style={styles.qrCodeDetailLabel}>Due Date:</Text>
                    <Text style={styles.qrCodeDetailValue}>
                      {new Date(firstPayment.dueDate).toLocaleDateString()}
                    </Text>
                  </View>
                </View>

                <View style={styles.qrCodeInstructions}>
                  <Text style={styles.qrCodeInstructionsTitle}>How to Pay with QR-PH:</Text>
                  <Text style={styles.qrCodeInstructionsText}>
                    <Text style={{ fontWeight: '600' }}>Option 1: Scan on this device</Text>{'\n'}
                    1. Open your {selectedQRCodeAccount.type === 'gcash' ? 'GCash' : 'Maya'} app{'\n'}
                    2. Tap "Scan QR" or "QR Code"{'\n'}
                    3. Point camera at this QR-PH code{'\n'}
                    4. {selectedQRCodeAccount.type === 'gcash' ? 'GCash' : 'Maya'} will show payment details automatically{'\n'}
                    5. Confirm amount and complete payment{'\n\n'}
                    <Text style={{ fontWeight: '600' }}>Option 2: Share to another device</Text>{'\n'}
                    1. Tap "Share QR Code" above{'\n'}
                    2. Send to another device{'\n'}
                    3. Open {selectedQRCodeAccount.type === 'gcash' ? 'GCash' : 'Maya'} and scan the QR-PH code{'\n'}
                    4. Confirm and complete payment{'\n\n'}
                    This QR-PH code contains all payment details. After payment, tap "I Paid" below to confirm.
                  </Text>
                </View>
              </ScrollView>

              <View style={styles.qrCodeModalFooter}>
                <TouchableOpacity
                  style={styles.qrCodeConfirmButton}
                  onPress={async () => {
                    const methodName = selectedQRCodeAccount.type === 'gcash' ? 'GCash' : 'Maya';
                    const paymentMethodName = `${methodName} - ${selectedQRCodeAccount.accountNumber.slice(-4)}`;
                    setSelectedPaymentMethod(paymentMethodName);
                    
                    // Use unified payment handler
                    handleConfirmPayment();
                    setShowQRCodeModal(false);
                    setSelectedQRCodeAccount(null);
                  }}
                >
                  <CheckCircle size={20} color="#FFFFFF" />
                  <Text style={styles.qrCodeConfirmButtonText}>I Paid</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.qrCodeCancelButton}
                  onPress={() => {
                    setShowQRCodeModal(false);
                    setSelectedQRCodeAccount(null);
                  }}
                >
                  <Text style={styles.qrCodeCancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
        ) : null;
      })()}

      {/* Paymongo Payment Modal */}
      {selectedPayment && (
        <PayMongoPayment
          visible={showPaymongoModal}
          payment={selectedPayment}
          onSuccess={() => {
            setShowPaymongoModal(false);
            setShowPaymentModal(false);
            setSelectedPayment(null);
            setSelectedPaymentMethod(null);
            loadDashboardData();
          }}
          onCancel={() => {
            setShowPaymongoModal(false);
            setSelectedPaymentMethod(null);
          }}
        />
      )}

      {/* Maintenance Request Modal */}
      <Modal
        visible={showMaintenanceModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowMaintenanceModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '90%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Report Maintenance Issue</Text>
              <TouchableOpacity onPress={() => setShowMaintenanceModal(false)}>
                <X size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <View style={{ gap: designTokens.spacing.md }}>
                {/* Title */}
                <View>
                  <Text style={[styles.modalText, { marginBottom: designTokens.spacing.xs }]}>Title *</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="e.g., Leaky faucet in kitchen"
                    value={maintenanceForm.title}
                    onChangeText={(text) => setMaintenanceForm(prev => ({ ...prev, title: text }))}
                    maxLength={100}
                  />
                </View>

                {/* Description */}
                <View>
                  <Text style={[styles.modalText, { marginBottom: designTokens.spacing.xs }]}>Description *</Text>
                  <TextInput
                    style={[styles.modalInput, { minHeight: 100, textAlignVertical: 'top' }]}
                    placeholder="Describe the issue in detail..."
                    value={maintenanceForm.description}
                    onChangeText={(text) => setMaintenanceForm(prev => ({ ...prev, description: text }))}
                    multiline
                    numberOfLines={4}
                    maxLength={500}
                  />
                </View>

                {/* Category */}
                <View>
                  <Text style={[styles.modalText, { marginBottom: designTokens.spacing.xs }]}>Category</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: designTokens.spacing.xs }}>
                    {(['plumbing', 'electrical', 'appliance', 'heating_cooling', 'structural', 'other'] as const).map((cat) => (
                      <TouchableOpacity
                        key={cat}
                        style={[
                          styles.categoryButton,
                          maintenanceForm.category === cat && styles.categoryButtonSelected
                        ]}
                        onPress={() => setMaintenanceForm(prev => ({ ...prev, category: cat }))}
                      >
                        <Text style={[
                          styles.categoryButtonText,
                          maintenanceForm.category === cat && styles.categoryButtonTextSelected
                        ]}>
                          {cat.replace('_', ' ')}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Priority */}
                <View>
                  <Text style={[styles.modalText, { marginBottom: designTokens.spacing.xs }]}>Priority</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: designTokens.spacing.xs }}>
                    {(['low', 'medium', 'high', 'urgent'] as const).map((pri) => {
                      const priorityStyle = maintenanceForm.priority === pri ? (
                        pri === 'low' ? styles.priorityButtonLow :
                        pri === 'medium' ? styles.priorityButtonMedium :
                        pri === 'high' ? styles.priorityButtonHigh :
                        styles.priorityButtonUrgent
                      ) : null;
                      
                      return (
                        <TouchableOpacity
                          key={pri}
                          style={[
                            styles.priorityButton,
                            priorityStyle
                          ]}
                          onPress={() => setMaintenanceForm(prev => ({ ...prev, priority: pri }))}
                        >
                          <Text style={[
                            styles.priorityButtonText,
                            maintenanceForm.priority === pri && styles.priorityButtonTextSelected,
                            priorityStyle && {
                              color: pri === 'low' ? '#10B981' :
                                     pri === 'medium' ? '#F59E0B' :
                                     pri === 'high' ? '#EF4444' :
                                     '#DC2626'
                            }
                          ]}>
                            {pri}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Photos */}
                <View>
                  <Text style={[styles.modalText, { marginBottom: designTokens.spacing.xs }]}>Photos</Text>
                  <TouchableOpacity
                    style={styles.mediaButton}
                    onPress={handlePickMaintenancePhoto}
                  >
                    <Camera size={18} color={designTokens.colors.primary} />
                    <Text style={styles.mediaButtonText}>Add Photos</Text>
                  </TouchableOpacity>
                  {maintenanceForm.photos.length > 0 && (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: designTokens.spacing.xs, marginTop: designTokens.spacing.sm }}>
                      {maintenanceForm.photos.map((photo, index) => (
                        <View key={index} style={styles.mediaPreview}>
                          <Image source={{ uri: photo }} style={styles.mediaPreviewImage} />
                          <TouchableOpacity
                            style={styles.mediaRemoveButton}
                            onPress={() => handleRemoveMaintenancePhoto(index)}
                          >
                            <X size={16} color="#FFFFFF" />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  )}
                </View>

                {/* Videos */}
                <View>
                  <Text style={[styles.modalText, { marginBottom: designTokens.spacing.xs }]}>Videos</Text>
                  <TouchableOpacity
                    style={styles.mediaButton}
                    onPress={handlePickMaintenanceVideo}
                  >
                    <Video size={18} color={designTokens.colors.primary} />
                    <Text style={styles.mediaButtonText}>Add Video</Text>
                  </TouchableOpacity>
                  {maintenanceForm.videos.length > 0 && (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: designTokens.spacing.xs, marginTop: designTokens.spacing.sm }}>
                      {maintenanceForm.videos.map((video, index) => (
                        <View key={index} style={styles.mediaPreview}>
                          <Video size={40} color={designTokens.colors.primary} />
                          <TouchableOpacity
                            style={styles.mediaRemoveButton}
                            onPress={() => handleRemoveMaintenanceVideo(index)}
                          >
                            <X size={16} color="#FFFFFF" />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => {
                  setShowMaintenanceModal(false);
                  setMaintenanceForm({
                    title: '',
                    description: '',
                    category: 'other',
                    priority: 'medium',
                    photos: [],
                    videos: [],
                  });
                }}
              >
                <Text style={styles.modalButtonCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonConfirm, submittingMaintenance && styles.modalButtonDisabled]}
                onPress={handleSubmitMaintenanceRequest}
                disabled={submittingMaintenance}
              >
                {submittingMaintenance ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalButtonConfirmText}>Submit Request</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Maintenance History Modal */}
      <Modal
        visible={showMaintenanceHistory}
        transparent
        animationType="slide"
        onRequestClose={() => setShowMaintenanceHistory(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '90%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Maintenance History</Text>
              <TouchableOpacity onPress={() => setShowMaintenanceHistory(false)}>
                <X size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
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
                      onPress={() => {
                        setSelectedMaintenanceRequest(request);
                        setShowMaintenanceDetailModal(true);
                        setShowMaintenanceHistory(false);
                      }}
                      activeOpacity={0.7}
                      style={[
                        sharedStyles.card,
                        {
                          padding: designTokens.spacing.md,
                          borderLeftWidth: 4,
                          borderLeftColor:
                            request.status === 'resolved' ? designTokens.colors.success :
                            request.status === 'cancelled' ? designTokens.colors.error :
                            request.status === 'in_progress' ? designTokens.colors.info :
                            request.priority === 'urgent' ? designTokens.colors.error :
                            designTokens.colors.warning,
                        }
                      ]}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: designTokens.spacing.md }}>
                        <View style={[
                          sharedStyles.statIcon,
                          request.status === 'resolved' ? iconBackgrounds.green :
                          request.status === 'cancelled' ? iconBackgrounds.red :
                          request.status === 'in_progress' ? iconBackgrounds.blue :
                          request.priority === 'urgent' ? iconBackgrounds.red :
                          iconBackgrounds.orange,
                          { width: 40, height: 40 }
                        ]}>
                          {request.status === 'resolved' ? (
                            <CheckCircle size={20} color="#10B981" />
                          ) : request.status === 'cancelled' ? (
                            <XCircle size={20} color="#EF4444" />
                          ) : request.status === 'in_progress' ? (
                            <Clock size={20} color="#3B82F6" />
                          ) : (
                            <AlertCircle size={20} color={request.priority === 'urgent' ? "#EF4444" : "#F59E0B"} />
                          )}
                        </View>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: designTokens.spacing.xs }}>
                            <Text style={[sharedStyles.statLabel, { fontSize: designTokens.typography.base, marginBottom: 0 }]} numberOfLines={2}>
                              {request.title}
                            </Text>
                            <View style={[
                              sharedStyles.statusBadge,
                              request.status === 'resolved' ? { backgroundColor: designTokens.colors.successLight } :
                              request.status === 'cancelled' ? { backgroundColor: designTokens.colors.errorLight } :
                              request.status === 'in_progress' ? { backgroundColor: designTokens.colors.infoLight } :
                              request.priority === 'urgent' ? { backgroundColor: designTokens.colors.errorLight } :
                              { backgroundColor: designTokens.colors.warningLight }
                            ]}>
                              <Text style={[
                                sharedStyles.statusText,
                                request.status === 'resolved' ? { color: designTokens.colors.success } :
                                request.status === 'cancelled' ? { color: designTokens.colors.error } :
                                request.status === 'in_progress' ? { color: designTokens.colors.info } :
                                request.priority === 'urgent' ? { color: designTokens.colors.error } :
                                { color: designTokens.colors.warning }
                              ]}>
                                {request.status.replace('_', ' ')}
                              </Text>
                            </View>
                          </View>
                          <Text style={[sharedStyles.statSubtitle, { marginBottom: designTokens.spacing.xs }]} numberOfLines={3}>
                            {request.description}
                          </Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: designTokens.spacing.sm, flexWrap: 'wrap', marginBottom: designTokens.spacing.xs }}>
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
                          <Text style={[sharedStyles.statSubtitle, { fontSize: designTokens.typography.xs, marginBottom: designTokens.spacing.xs }]}>
                            {new Date(request.createdAt).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </Text>
                          {request.resolvedAt && (
                            <Text style={[sharedStyles.statSubtitle, { fontSize: designTokens.typography.xs, color: designTokens.colors.success }]}>
                              Resolved: {new Date(request.resolvedAt).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </Text>
                          )}
                          {request.ownerNotes && (
                            <View style={{
                              marginTop: designTokens.spacing.xs,
                              padding: designTokens.spacing.sm,
                              backgroundColor: designTokens.colors.infoLight,
                              borderRadius: designTokens.borderRadius.md,
                            }}>
                              <Text style={[sharedStyles.statSubtitle, { fontSize: designTokens.typography.xs, marginBottom: 4, fontWeight: designTokens.typography.semibold as any }]}>
                                Owner Notes:
                              </Text>
                              <Text style={[sharedStyles.statSubtitle, { fontSize: designTokens.typography.xs }]}>
                                {request.ownerNotes}
                              </Text>
                            </View>
                          )}
                          {(request.status === 'pending' || request.status === 'in_progress') && (
                            <TouchableOpacity
                              onPress={() => {
                                setShowMaintenanceHistory(false);
                                handleCancelMaintenanceRequest(request.id);
                              }}
                              disabled={cancellingRequest === request.id}
                              style={{
                                marginTop: designTokens.spacing.sm,
                                paddingVertical: 8,
                                paddingHorizontal: 12,
                                backgroundColor: designTokens.colors.errorLight,
                                borderRadius: designTokens.borderRadius.md,
                                alignSelf: 'flex-start',
                              }}
                              activeOpacity={0.7}
                            >
                              {cancellingRequest === request.id ? (
                                <ActivityIndicator size="small" color={designTokens.colors.error} />
                              ) : (
                                <Text style={{
                                  fontSize: designTokens.typography.sm,
                                  color: designTokens.colors.error,
                                  fontWeight: designTokens.typography.semibold as any,
                                }}>
                                  Cancel Request
                                </Text>
                              )}
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setShowMaintenanceHistory(false)}
              >
                <Text style={styles.modalButtonCancelText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Maintenance Request Detail Modal */}
      <Modal
        visible={showMaintenanceDetailModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowMaintenanceDetailModal(false);
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
                        selectedMaintenanceRequest.status === 'cancelled' ? { backgroundColor: designTokens.colors.errorLight } :
                        selectedMaintenanceRequest.status === 'in_progress' ? { backgroundColor: designTokens.colors.infoLight } :
                        selectedMaintenanceRequest.priority === 'urgent' ? { backgroundColor: designTokens.colors.errorLight } :
                        { backgroundColor: designTokens.colors.warningLight }
                      ]}>
                        <Text style={[
                          sharedStyles.statusText,
                          selectedMaintenanceRequest.status === 'resolved' ? { color: designTokens.colors.success } :
                          selectedMaintenanceRequest.status === 'cancelled' ? { color: designTokens.colors.error } :
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
                      setShowMaintenanceDetailModal(false);
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
                  }}
                  contentContainerStyle={{
                    padding: designTokens.spacing.xl,
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
                          Owner Notes
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
                  {(selectedMaintenanceRequest.status === 'pending' || selectedMaintenanceRequest.status === 'in_progress') && (
                    <TouchableOpacity
                      style={[sharedStyles.secondaryButton, { borderColor: designTokens.colors.error, borderWidth: 1 }]}
                      onPress={() => {
                        setShowMaintenanceDetailModal(false);
                        handleCancelMaintenanceRequest(selectedMaintenanceRequest.id);
                      }}
                      disabled={cancellingRequest === selectedMaintenanceRequest.id}
                      activeOpacity={0.8}
                    >
                      {cancellingRequest === selectedMaintenanceRequest.id ? (
                        <ActivityIndicator size="small" color={designTokens.colors.error} />
                      ) : (
                        <>
                          <XCircle size={18} color={designTokens.colors.error} />
                          <Text style={[sharedStyles.secondaryButtonText, { color: designTokens.colors.error }]}>
                            Cancel Request
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={[sharedStyles.secondaryButton]}
                    onPress={() => {
                      setShowMaintenanceDetailModal(false);
                      setSelectedMaintenanceRequest(null);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={sharedStyles.secondaryButtonText}>Close</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <View style={{ padding: designTokens.spacing.xl, alignItems: 'center' }}>
                <Text style={{
                  fontSize: designTokens.typography.base,
                  color: designTokens.colors.textSecondary,
                }}>
                  Loading...
                </Text>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Submit Complaint Modal */}
      <Modal
        visible={showComplaintModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowComplaintModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '90%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Submit Complaint</Text>
              <TouchableOpacity onPress={() => setShowComplaintModal(false)}>
                <X size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <View style={{ gap: designTokens.spacing.md }}>
                {/* Complaint Category */}
                <View>
                  <Text style={[styles.modalText, { marginBottom: designTokens.spacing.xs }]}>Complaint Category *</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: designTokens.spacing.xs }}>
                    {(['noise_complaint', 'landlord_abuse', 'unsanitary_conditions', 'illegal_activities', 'maintenance_neglect', 'payment_dispute', 'safety_concern', 'neighbor_conflict'] as TenantComplaintRecord['category'][]).map((category) => (
                      <TouchableOpacity
                        key={category}
                        style={[
                          styles.categoryButton,
                          complaintForm.category === category && styles.categoryButtonSelected
                        ]}
                        onPress={() => setComplaintForm(prev => ({ ...prev, category }))}
                      >
                        <Text style={[
                          styles.categoryButtonText,
                          complaintForm.category === category && styles.categoryButtonTextSelected
                        ]}>
                          {getComplaintCategoryLabel(category)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Description */}
                <View>
                  <Text style={[styles.modalText, { marginBottom: designTokens.spacing.xs }]}>Description *</Text>
                  <TextInput
                    style={[styles.modalInput, { minHeight: 100, textAlignVertical: 'top' }]}
                    placeholder="Describe the issue in detail..."
                    value={complaintForm.description}
                    onChangeText={(text) => setComplaintForm(prev => ({ ...prev, description: text }))}
                    multiline
                    numberOfLines={4}
                    maxLength={500}
                  />
                </View>

                {/* Property Info */}
                {activeBooking && property && (
                  <View>
                    <Text style={[styles.modalText, { marginBottom: designTokens.spacing.xs }]}>Property</Text>
                    <View style={{
                      padding: designTokens.spacing.md,
                      backgroundColor: '#F9FAFB',
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: '#E5E7EB',
                      gap: designTokens.spacing.xs,
                    }}>
                      <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                        <Text style={{ fontSize: 12, color: '#6B7280', width: 100, flexShrink: 0 }}>Property Name:</Text>
                        <Text style={{ fontSize: 12, color: '#111827', flex: 1 }}>{activeBooking.propertyTitle || property.address}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                        <Text style={{ fontSize: 12, color: '#6B7280', width: 100, flexShrink: 0 }}>Owner Name:</Text>
                        <Text style={{ fontSize: 12, color: '#111827', flex: 1 }}>{activeBooking.ownerName || 'N/A'}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                        <Text style={{ fontSize: 12, color: '#6B7280', width: 100, flexShrink: 0 }}>Contact Number:</Text>
                        <Text style={{ fontSize: 12, color: '#111827', flex: 1 }}>{activeBooking.ownerPhone || 'N/A'}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                        <Text style={{ fontSize: 12, color: '#6B7280', width: 100, flexShrink: 0 }}>Email:</Text>
                        <Text style={{ fontSize: 12, color: '#111827', flex: 1 }}>{activeBooking.ownerEmail || 'N/A'}</Text>
                      </View>
                    </View>
                  </View>
                )}

                {/* Urgency Level */}
                <View>
                  <Text style={[styles.modalText, { marginBottom: designTokens.spacing.xs }]}>Urgency Level</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: designTokens.spacing.xs }}>
                    {(['low', 'medium', 'high', 'urgent'] as TenantComplaintRecord['urgency'][]).map((urgency) => {
                      const urgencyStyle = complaintForm.urgency === urgency ? (
                        urgency === 'low' ? styles.priorityButtonLow :
                        urgency === 'medium' ? styles.priorityButtonMedium :
                        urgency === 'high' ? styles.priorityButtonHigh :
                        styles.priorityButtonUrgent
                      ) : null;
                      
                      return (
                        <TouchableOpacity
                          key={urgency}
                          style={[
                            styles.priorityButton,
                            urgencyStyle
                          ]}
                          onPress={() => setComplaintForm(prev => ({ ...prev, urgency }))}
                        >
                          <Text style={[
                            styles.priorityButtonText,
                            complaintForm.urgency === urgency && styles.priorityButtonTextSelected,
                            urgencyStyle && {
                              color: urgency === 'low' ? '#10B981' :
                                     urgency === 'medium' ? '#F59E0B' :
                                     urgency === 'high' ? '#EF4444' :
                                     '#DC2626'
                            }
                          ]}>
                            {urgency.charAt(0).toUpperCase() + urgency.slice(1)}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Photos */}
                <View>
                  <Text style={[styles.modalText, { marginBottom: designTokens.spacing.xs }]}>Photos</Text>
                  <TouchableOpacity
                    style={styles.mediaButton}
                    onPress={handlePickComplaintPhoto}
                  >
                    <Camera size={18} color={designTokens.colors.primary} />
                    <Text style={styles.mediaButtonText}>Add Photos</Text>
                  </TouchableOpacity>
                  {complaintForm.photos.length > 0 && (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: designTokens.spacing.xs, marginTop: designTokens.spacing.sm }}>
                      {complaintForm.photos.map((photo, index) => (
                        <View key={index} style={styles.mediaPreview}>
                          <Image source={{ uri: photo }} style={styles.mediaPreviewImage} />
                          <TouchableOpacity
                            style={styles.mediaRemoveButton}
                            onPress={() => handleRemoveComplaintPhoto(index)}
                          >
                            <X size={16} color="#FFFFFF" />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  )}
                </View>

                {/* Videos */}
                <View>
                  <Text style={[styles.modalText, { marginBottom: designTokens.spacing.xs }]}>Videos</Text>
                  <TouchableOpacity
                    style={styles.mediaButton}
                    onPress={handlePickComplaintVideo}
                  >
                    <Video size={18} color={designTokens.colors.primary} />
                    <Text style={styles.mediaButtonText}>Add Video</Text>
                  </TouchableOpacity>
                  {complaintForm.videos.length > 0 && (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: designTokens.spacing.xs, marginTop: designTokens.spacing.sm }}>
                      {complaintForm.videos.map((video, index) => (
                        <View key={index} style={styles.mediaPreview}>
                          <Video size={40} color={designTokens.colors.primary} />
                          <TouchableOpacity
                            style={styles.mediaRemoveButton}
                            onPress={() => handleRemoveComplaintVideo(index)}
                          >
                            <X size={16} color="#FFFFFF" />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  )}
                </View>

                {/* Anonymous Toggle */}
                <View>
                  <TouchableOpacity
                    style={{
                      flexDirection: 'row',
                      alignItems: 'flex-start',
                      gap: designTokens.spacing.md,
                    }}
                    onPress={() => setComplaintForm(prev => ({ ...prev, isAnonymous: !prev.isAnonymous }))}
                  >
                    <View style={[
                      {
                        width: 24,
                        height: 24,
                        borderRadius: 4,
                        borderWidth: 2,
                        borderColor: '#E5E7EB',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginTop: 2,
                      },
                      complaintForm.isAnonymous && {
                        backgroundColor: designTokens.colors.primary,
                        borderColor: designTokens.colors.primary,
                      }
                    ]}>
                      {complaintForm.isAnonymous && <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' }}>✓</Text>}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{
                        fontSize: 16,
                        fontWeight: '500',
                        color: '#374151',
                        marginBottom: 4,
                      }}>Submit anonymously</Text>
                      <Text style={{
                        fontSize: 14,
                        color: '#6B7280',
                      }}>
                        Your name will not be shown to the barangay (if allowed)
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => {
                  setShowComplaintModal(false);
                  setComplaintForm({
                    category: '' as TenantComplaintRecord['category'] | '',
                    description: '',
                    isAnonymous: false,
                    urgency: 'medium',
                    photos: [],
                    videos: [],
                  });
                }}
              >
                <Text style={styles.modalButtonCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonConfirm, submittingComplaint && styles.modalButtonDisabled]}
                onPress={handleSubmitComplaint}
                disabled={submittingComplaint}
              >
                {submittingComplaint ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalButtonConfirmText}>Submit Complaint</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Complaints History Modal */}
      <Modal
        visible={showComplaintHistory}
        transparent
        animationType="slide"
        onRequestClose={() => setShowComplaintHistory(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '90%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Complaints History</Text>
              <TouchableOpacity onPress={() => setShowComplaintHistory(false)}>
                <X size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {complaints.length === 0 ? (
                <View style={{ alignItems: 'center', paddingVertical: designTokens.spacing['2xl'] }}>
                  <AlertTriangle size={48} color={designTokens.colors.textMuted} />
                  <Text style={{
                    fontSize: designTokens.typography.base,
                    color: designTokens.colors.textSecondary,
                    marginTop: designTokens.spacing.md,
                  }}>
                    No complaints yet
                  </Text>
                </View>
              ) : (
                <View style={{ gap: designTokens.spacing.md }}>
                  {complaints.map((complaint) => (
                    <TouchableOpacity
                      key={complaint.id}
                      onPress={() => {
                        setSelectedComplaintForHistory(complaint);
                        setShowComplaintDetailModal(true);
                        setShowComplaintHistory(false);
                      }}
                      activeOpacity={0.7}
                      style={[
                        sharedStyles.card,
                        {
                          padding: designTokens.spacing.md,
                          borderLeftWidth: 4,
                          borderLeftColor:
                            complaint.status === 'resolved' ? designTokens.colors.success :
                            complaint.status === 'closed' ? designTokens.colors.textMuted :
                            complaint.status === 'for_mediation' ? designTokens.colors.warning :
                            complaint.urgency === 'urgent' ? designTokens.colors.error :
                            designTokens.colors.info,
                        }
                      ]}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: designTokens.spacing.md }}>
                        <View style={[
                          sharedStyles.statIcon,
                          complaint.status === 'resolved' ? iconBackgrounds.green :
                          complaint.status === 'closed' ? iconBackgrounds.gray :
                          complaint.status === 'for_mediation' ? iconBackgrounds.orange :
                          complaint.urgency === 'urgent' ? iconBackgrounds.red :
                          iconBackgrounds.blue,
                          { width: 40, height: 40 }
                        ]}>
                          {complaint.status === 'resolved' ? (
                            <CheckCircle size={20} color="#10B981" />
                          ) : complaint.status === 'closed' ? (
                            <CheckCircle size={20} color="#6B7280" />
                          ) : complaint.status === 'for_mediation' ? (
                            <Clock size={20} color="#F59E0B" />
                          ) : (
                            <AlertCircle size={20} color={complaint.urgency === 'urgent' ? "#EF4444" : "#3B82F6"} />
                          )}
                        </View>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: designTokens.spacing.xs }}>
                            <Text style={[sharedStyles.statLabel, { fontSize: designTokens.typography.base, marginBottom: 0 }]} numberOfLines={2}>
                              {getComplaintCategoryLabel(complaint.category)}
                            </Text>
                            <View style={[
                              sharedStyles.statusBadge,
                              complaint.status === 'resolved' ? { backgroundColor: designTokens.colors.successLight } :
                              complaint.status === 'closed' ? { backgroundColor: designTokens.colors.textMuted + '20' } :
                              complaint.status === 'for_mediation' ? { backgroundColor: designTokens.colors.warningLight } :
                              complaint.urgency === 'urgent' ? { backgroundColor: designTokens.colors.errorLight } :
                              { backgroundColor: designTokens.colors.infoLight }
                            ]}>
                              <Text style={[
                                sharedStyles.statusText,
                                complaint.status === 'resolved' ? { color: designTokens.colors.success } :
                                complaint.status === 'closed' ? { color: designTokens.colors.textMuted } :
                                complaint.status === 'for_mediation' ? { color: designTokens.colors.warning } :
                                complaint.urgency === 'urgent' ? { color: designTokens.colors.error } :
                                { color: designTokens.colors.info }
                              ]}>
                                {getStatusLabel(complaint.status)}
                              </Text>
                            </View>
                          </View>
                          <Text style={[sharedStyles.statSubtitle, { marginBottom: designTokens.spacing.xs }]} numberOfLines={3}>
                            {complaint.description}
                          </Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: designTokens.spacing.sm, flexWrap: 'wrap', marginBottom: designTokens.spacing.xs }}>
                            <Text style={[sharedStyles.statSubtitle, { fontSize: designTokens.typography.xs, marginBottom: 0 }]}>
                              Urgency: {complaint.urgency.toUpperCase()}
                            </Text>
                            {(complaint.photos.length > 0 || complaint.videos.length > 0) && (
                              <Text style={[sharedStyles.statSubtitle, { fontSize: designTokens.typography.xs, marginBottom: 0, color: designTokens.colors.info }]}>
                                📷 {complaint.photos.length} photo{complaint.photos.length > 1 ? 's' : ''}
                                {complaint.videos.length > 0 && ` • 🎥 ${complaint.videos.length} video${complaint.videos.length > 1 ? 's' : ''}`}
                              </Text>
                            )}
                          </View>
                          <Text style={[sharedStyles.statSubtitle, { fontSize: designTokens.typography.xs, marginBottom: designTokens.spacing.xs }]}>
                            Submitted: {new Date(complaint.createdAt).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </Text>
                          {complaint.resolvedAt && (
                            <Text style={[sharedStyles.statSubtitle, { fontSize: designTokens.typography.xs, color: designTokens.colors.success }]}>
                              Resolved: {new Date(complaint.resolvedAt).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </Text>
                          )}
                          {complaint.barangayNotes && (
                            <View style={{
                              marginTop: designTokens.spacing.xs,
                              padding: designTokens.spacing.sm,
                              backgroundColor: designTokens.colors.infoLight,
                              borderRadius: designTokens.borderRadius.md,
                            }}>
                              <Text style={[sharedStyles.statSubtitle, { fontSize: designTokens.typography.xs, marginBottom: 4, fontWeight: designTokens.typography.semibold as any }]}>
                                Barangay Notes:
                              </Text>
                              <Text style={[sharedStyles.statSubtitle, { fontSize: designTokens.typography.xs }]}>
                                {complaint.barangayNotes}
                              </Text>
                            </View>
                          )}
                          <TouchableOpacity
                            onPress={async (e) => {
                              e.stopPropagation();
                              await handleDownloadComplaint(complaint);
                            }}
                            style={{
                              marginTop: designTokens.spacing.sm,
                              paddingVertical: 8,
                              paddingHorizontal: 12,
                              backgroundColor: designTokens.colors.background,
                              borderRadius: designTokens.borderRadius.md,
                              alignSelf: 'flex-start',
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: designTokens.spacing.xs,
                            }}
                            activeOpacity={0.7}
                          >
                            <Download size={16} color={designTokens.colors.primary} />
                            <Text style={{
                              fontSize: designTokens.typography.sm,
                              color: designTokens.colors.primary,
                              fontWeight: designTokens.typography.semibold as any,
                            }}>
                              Download Report
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setShowComplaintHistory(false)}
              >
                <Text style={styles.modalButtonCancelText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Complaint Detail Modal */}
      <Modal
        visible={showComplaintDetailModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowComplaintDetailModal(false);
          setSelectedComplaintForHistory(null);
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
            {selectedComplaintForHistory ? (
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
                      {getComplaintCategoryLabel(selectedComplaintForHistory.category)}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: designTokens.spacing.sm, flexWrap: 'wrap' }}>
                      <View style={[
                        sharedStyles.statusBadge,
                        selectedComplaintForHistory.status === 'resolved' ? { backgroundColor: designTokens.colors.successLight } :
                        selectedComplaintForHistory.status === 'closed' ? { backgroundColor: designTokens.colors.textMuted + '20' } :
                        selectedComplaintForHistory.status === 'for_mediation' ? { backgroundColor: designTokens.colors.warningLight } :
                        selectedComplaintForHistory.urgency === 'urgent' ? { backgroundColor: designTokens.colors.errorLight } :
                        { backgroundColor: designTokens.colors.infoLight }
                      ]}>
                        <Text style={[
                          sharedStyles.statusText,
                          selectedComplaintForHistory.status === 'resolved' ? { color: designTokens.colors.success } :
                          selectedComplaintForHistory.status === 'closed' ? { color: designTokens.colors.textMuted } :
                          selectedComplaintForHistory.status === 'for_mediation' ? { color: designTokens.colors.warning } :
                          selectedComplaintForHistory.urgency === 'urgent' ? { color: designTokens.colors.error } :
                          { color: designTokens.colors.info }
                        ]}>
                          {getStatusLabel(selectedComplaintForHistory.status)}
                        </Text>
                      </View>
                      <Text style={{
                        fontSize: designTokens.typography.xs,
                        color: designTokens.colors.textSecondary,
                      }}>
                        Urgency: {selectedComplaintForHistory.urgency.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      setShowComplaintDetailModal(false);
                      setSelectedComplaintForHistory(null);
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
                  }}
                  contentContainerStyle={{
                    padding: designTokens.spacing.xl,
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
                        {selectedComplaintForHistory.description}
                      </Text>
                    </View>

                    {/* Property Info */}
                    {property && (
                      <View>
                        <Text style={{
                          fontSize: designTokens.typography.sm,
                          fontWeight: designTokens.typography.semibold as any,
                          color: designTokens.colors.textSecondary,
                          marginBottom: designTokens.spacing.sm,
                          textTransform: 'uppercase',
                          letterSpacing: 0.5,
                        }}>
                          Property
                        </Text>
                        <Text style={{
                          fontSize: designTokens.typography.base,
                          color: designTokens.colors.textPrimary,
                        }}>
                          {property.address}
                        </Text>
                      </View>
                    )}

                    {/* Photos */}
                    {selectedComplaintForHistory.photos.length > 0 && (
                      <View>
                        <Text style={{
                          fontSize: designTokens.typography.sm,
                          fontWeight: designTokens.typography.semibold as any,
                          color: designTokens.colors.textSecondary,
                          marginBottom: designTokens.spacing.md,
                          textTransform: 'uppercase',
                          letterSpacing: 0.5,
                        }}>
                          Photos ({selectedComplaintForHistory.photos.length})
                        </Text>
                        {selectedComplaintForHistory.photos.length === 1 ? (
                          <TouchableOpacity
                            activeOpacity={0.9}
                            onPress={() => {
                              // Open photo viewer
                              const photoIndex = 0;
                              setSelectedPhotoIndex(photoIndex);
                            }}
                            style={{
                              width: '100%',
                              aspectRatio: 1,
                              borderRadius: 12,
                              overflow: 'hidden',
                              backgroundColor: designTokens.colors.borderLight,
                            }}
                          >
                            <Image
                              source={{ uri: selectedComplaintForHistory.photos[0] }}
                              style={{
                                width: '100%',
                                height: '100%',
                              }}
                              resizeMode="cover"
                            />
                          </TouchableOpacity>
                        ) : (
                          <ScrollView 
                            horizontal 
                            showsHorizontalScrollIndicator={true}
                            contentContainerStyle={{ paddingRight: designTokens.spacing.md }}
                            style={{ marginTop: designTokens.spacing.xs }}
                          >
                            <View style={{ flexDirection: 'row', gap: designTokens.spacing.sm }}>
                              {selectedComplaintForHistory.photos.map((photo, index) => (
                                <TouchableOpacity
                                  key={index}
                                  activeOpacity={0.9}
                                  onPress={() => {
                                    setSelectedPhotoIndex(index);
                                  }}
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
                        )}
                      </View>
                    )}

                    {/* Videos */}
                    {selectedComplaintForHistory.videos.length > 0 && (
                      <View>
                        <Text style={{
                          fontSize: designTokens.typography.sm,
                          fontWeight: designTokens.typography.semibold as any,
                          color: designTokens.colors.textSecondary,
                          marginBottom: designTokens.spacing.md,
                          textTransform: 'uppercase',
                          letterSpacing: 0.5,
                        }}>
                          Videos ({selectedComplaintForHistory.videos.length})
                        </Text>
                        <Text style={{
                          fontSize: designTokens.typography.base,
                          color: designTokens.colors.textSecondary,
                        }}>
                          {selectedComplaintForHistory.videos.length} video{selectedComplaintForHistory.videos.length > 1 ? 's' : ''} attached
                        </Text>
                      </View>
                    )}

                    {/* Barangay Notes */}
                    {selectedComplaintForHistory.barangayNotes && (
                      <View>
                        <Text style={{
                          fontSize: designTokens.typography.sm,
                          fontWeight: designTokens.typography.semibold as any,
                          color: designTokens.colors.textSecondary,
                          marginBottom: designTokens.spacing.sm,
                          textTransform: 'uppercase',
                          letterSpacing: 0.5,
                        }}>
                          Barangay Notes
                        </Text>
                        <View style={{
                          padding: designTokens.spacing.md,
                          backgroundColor: designTokens.colors.infoLight,
                          borderRadius: designTokens.borderRadius.md,
                        }}>
                          <Text style={{
                            fontSize: designTokens.typography.base,
                            color: designTokens.colors.textPrimary,
                            lineHeight: 22,
                          }}>
                            {selectedComplaintForHistory.barangayNotes}
                          </Text>
                        </View>
                      </View>
                    )}

                    {/* Settlement Documents */}
                    {selectedComplaintForHistory.settlementDocuments && selectedComplaintForHistory.settlementDocuments.length > 0 && (
                      <View>
                        <Text style={{
                          fontSize: designTokens.typography.sm,
                          fontWeight: designTokens.typography.semibold as any,
                          color: designTokens.colors.textSecondary,
                          marginBottom: designTokens.spacing.sm,
                          textTransform: 'uppercase',
                          letterSpacing: 0.5,
                        }}>
                          Settlement Documents
                        </Text>
                        <Text style={{
                          fontSize: designTokens.typography.base,
                          color: designTokens.colors.textPrimary,
                        }}>
                          {selectedComplaintForHistory.settlementDocuments.length} document{selectedComplaintForHistory.settlementDocuments.length > 1 ? 's' : ''} uploaded by barangay
                        </Text>
                      </View>
                    )}

                    {/* Timeline */}
                    <View>
                      <Text style={{
                        fontSize: designTokens.typography.sm,
                        fontWeight: designTokens.typography.semibold as any,
                        color: designTokens.colors.textSecondary,
                        marginBottom: designTokens.spacing.sm,
                        textTransform: 'uppercase',
                        letterSpacing: 0.5,
                      }}>
                        Timeline
                      </Text>
                      <View style={{ gap: designTokens.spacing.xs }}>
                        <Text style={{
                          fontSize: designTokens.typography.base,
                          color: designTokens.colors.textPrimary,
                        }}>
                          Submitted: {new Date(selectedComplaintForHistory.createdAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </Text>
                        {selectedComplaintForHistory.resolvedAt && (
                          <Text style={{
                            fontSize: designTokens.typography.base,
                            color: designTokens.colors.success,
                          }}>
                            Resolved: {new Date(selectedComplaintForHistory.resolvedAt).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </Text>
                        )}
                        {selectedComplaintForHistory.closedAt && (
                          <Text style={{
                            fontSize: designTokens.typography.base,
                            color: designTokens.colors.textMuted,
                          }}>
                            Closed: {new Date(selectedComplaintForHistory.closedAt).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </Text>
                        )}
                        <Text style={{
                          fontSize: designTokens.typography.sm,
                          color: designTokens.colors.textSecondary,
                        }}>
                          Last Updated: {new Date(selectedComplaintForHistory.updatedAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </Text>
                      </View>
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
                  <TouchableOpacity
                    style={[sharedStyles.primaryButton]}
                    onPress={async () => {
                      await handleDownloadComplaint(selectedComplaintForHistory);
                    }}
                    activeOpacity={0.8}
                  >
                    <Download size={18} color="#FFFFFF" />
                    <Text style={sharedStyles.primaryButtonText}>
                      Download Report
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[sharedStyles.secondaryButton]}
                    onPress={() => {
                      setShowComplaintDetailModal(false);
                      setSelectedComplaintForHistory(null);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={sharedStyles.secondaryButtonText}>Close</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <View style={{ padding: designTokens.spacing.xl, alignItems: 'center' }}>
                <Text style={{
                  fontSize: designTokens.typography.base,
                  color: designTokens.colors.textSecondary,
                }}>
                  Loading...
                </Text>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Photo Viewer Modal */}
      <Modal
        visible={selectedPhotoIndex !== null && (
          (selectedMaintenanceRequest !== null && selectedMaintenanceRequest.photos.length > 0) ||
          (selectedComplaintForHistory !== null && selectedComplaintForHistory.photos.length > 0)
        )}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setSelectedPhotoIndex(null);
          setCurrentPhotoIndex(0);
        }}
      >
        {selectedPhotoIndex !== null && (
          selectedMaintenanceRequest && selectedMaintenanceRequest.photos.length > 0 ? (
            <PhotoViewerContent
              photos={selectedMaintenanceRequest.photos}
              initialIndex={selectedPhotoIndex}
              onClose={() => {
                setSelectedPhotoIndex(null);
                setCurrentPhotoIndex(0);
              }}
              onIndexChange={setCurrentPhotoIndex}
            />
          ) : selectedComplaintForHistory && selectedComplaintForHistory.photos.length > 0 ? (
            <PhotoViewerContent
              photos={selectedComplaintForHistory.photos}
              initialIndex={selectedPhotoIndex}
              onClose={() => {
                setSelectedPhotoIndex(null);
                setCurrentPhotoIndex(0);
              }}
              onIndexChange={setCurrentPhotoIndex}
            />
          ) : null
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
    </SafeAreaView>
  );
}

// Photo Viewer Component
function PhotoViewerContent({ photos, initialIndex, onClose, onIndexChange }: { photos: string[]; initialIndex: number; onClose: () => void; onIndexChange: (index: number) => void }) {
  const flatListRef = useRef<any>(null);
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
      />
    </View>
  );
}, (prevProps, nextProps) => {
  // Only re-render if the photo URI changes
  return prevProps.photo === nextProps.photo;
});

PhotoItem.displayName = 'PhotoItem';

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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  scrollView: {
    flex: 1,
  },
  headerContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  headerGradient: {
    paddingBottom: 20,
    paddingTop: 16,
  },
  header: {
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTextSection: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  profileButton: {
    marginLeft: 16,
  },
  profileAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  profileAvatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  profileAvatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  profileModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  profileModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
  },
  profileModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  profileModalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
  },
  profileModalCloseButton: {
    padding: 4,
  },
  profileModalBody: {
    flex: 1,
    paddingHorizontal: 20,
  },
  profileModalPhotoSection: {
    alignItems: 'center',
    paddingVertical: 32,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  profileModalAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 16,
  },
  profileModalAvatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 16,
  },
  profileModalAvatarText: {
    fontSize: 40,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  profileModalName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  profileModalRole: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  profileModalInfoSection: {
    paddingVertical: 24,
    gap: 20,
  },
  profileModalInfoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  profileModalInfoIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileModalInfoContent: {
    flex: 1,
  },
  profileModalInfoLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  profileModalInfoValue: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '500',
  },
  profileModalEditButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
    marginBottom: 32,
    marginTop: 8,
  },
  profileModalEditButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardOverdue: {
    borderColor: '#EF4444',
    borderWidth: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  cardContent: {
    gap: 16,
  },
  propertyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  propertyAddress: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#374151',
  },
  messageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
    marginTop: 8,
  },
  messageButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  reminderItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  reminderIcon: {
    marginTop: 2,
  },
  reminderContent: {
    flex: 1,
  },
  reminderMessage: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  reminderDate: {
    fontSize: 12,
    color: '#6B7280',
  },
  paymentAmountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  paymentAmount: {
    fontSize: 32,
    fontWeight: '800',
    color: '#111827',
  },
  overdueBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  overdueBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#EF4444',
  },
  paymentDueDate: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  payButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
  },
  payButtonOverdue: {
    backgroundColor: '#EF4444',
  },
  payButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  summaryValueSuccess: {
    color: '#10B981',
  },
  summaryValueWarning: {
    color: '#F59E0B',
  },
  summaryValueError: {
    color: '#EF4444',
  },
  paymentsList: {
    gap: 12,
  },
  paymentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  paymentItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  paymentStatusIcon: {
    marginTop: 2,
  },
  paymentItemContent: {
    flex: 1,
  },
  paymentItemMonth: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  paymentItemDate: {
    fontSize: 12,
    color: '#6B7280',
  },
  paymentItemRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  paymentItemAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  paymentItemAmountPaid: {
    color: '#10B981',
  },
  paymentItemAmountOverdue: {
    color: '#EF4444',
  },
  paymentItemLateFee: {
    fontSize: 11,
    color: '#EF4444',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  modalBody: {
    marginBottom: 20,
  },
  modalText: {
    fontSize: 16,
    color: '#374151',
    marginBottom: 16,
  },
  modalPaymentDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalPaymentLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  modalPaymentValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: '#F3F4F6',
  },
  modalButtonCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  modalButtonConfirm: {
    backgroundColor: '#10B981',
  },
  modalButtonConfirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  modalButtonPrimary: {
    backgroundColor: '#3B82F6',
    flexDirection: 'row',
    gap: 8,
  },
  modalButtonPrimaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  modalButtonSecondary: {
    backgroundColor: '#F3F4F6',
  },
  modalButtonSecondaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  receiptContent: {
    maxHeight: 400,
    marginBottom: 20,
  },
  receiptText: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#111827',
    lineHeight: 18,
  },
  // QR Code Modal Styles
  qrCodeModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  qrCodeModalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingBottom: 20,
  },
  qrCodeModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  qrCodeModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  qrCodeModalCloseButton: {
    padding: 4,
  },
  qrCodeModalShareButton: {
    padding: 4,
  },
  qrCodeShareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  qrCodeShareButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#3B82F6',
  },
  qrCodeModalBody: {
    padding: 20,
  },
  qrCodeSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  qrCodeLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  qrCodeSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
    textAlign: 'center',
  },
  qrCodeWrapper: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  qrCodePaymentDetails: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  qrCodeDetailsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  qrCodeDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  qrCodeDetailLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  qrCodeDetailValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  qrCodeInstructions: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  qrCodeInstructionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E40AF',
    marginBottom: 8,
  },
  qrCodeInstructionsText: {
    fontSize: 14,
    color: '#1E40AF',
    lineHeight: 22,
  },
  qrCodeModalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 12,
  },
  qrCodeConfirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#10B981',
    paddingVertical: 16,
    borderRadius: 12,
  },
  qrCodeConfirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  qrCodeCancelButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  qrCodeCancelButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#6B7280',
  },
  advancedPayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3B82F6',
    marginTop: 12,
  },
  advancedPayButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#3B82F6',
  },
  advancedPaymentDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
    lineHeight: 20,
  },
  futurePaymentsList: {
    gap: 12,
    marginBottom: 16,
  },
  futurePaymentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  futurePaymentItemSelected: {
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6',
    borderWidth: 2,
  },
  futurePaymentLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  futurePaymentCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  futurePaymentCheckboxSelected: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  futurePaymentInfo: {
    flex: 1,
  },
  futurePaymentMonth: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  futurePaymentDate: {
    fontSize: 12,
    color: '#6B7280',
  },
  futurePaymentAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    marginTop: 8,
  },
  viewAllButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
  },
  advancedPaymentSummary: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  advancedPaymentSummaryLabel: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 4,
  },
  advancedPaymentSummaryAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: '#10B981',
  },
  advancedPayConfirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    marginTop: 16,
  },
  advancedPayConfirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  advancedPaymentModalContent: {
    maxHeight: '80%',
  },
  advancedPaymentScrollView: {
    maxHeight: 400,
  },
  advancedPaymentList: {
    gap: 12,
  },
  advancedPaymentModalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  advancedPaymentModalItemSelected: {
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6',
    borderWidth: 2,
  },
  advancedPaymentModalLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  advancedPaymentModalCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  advancedPaymentModalCheckboxSelected: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  advancedPaymentModalInfo: {
    flex: 1,
  },
  advancedPaymentModalMonth: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  advancedPaymentModalDate: {
    fontSize: 13,
    color: '#6B7280',
  },
  advancedPaymentModalAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  advancedPaymentModalDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 20,
    lineHeight: 20,
  },
  paymentSection: {
    marginBottom: 24,
  },
  paymentSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  advancedPaymentModalItemOverdue: {
    backgroundColor: '#FEF2F2',
    borderColor: '#EF4444',
  },
  advancedPaymentModalCheckboxOverdue: {
    borderColor: '#EF4444',
  },
  advancedPaymentModalSummary: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  advancedPaymentModalSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  advancedPaymentModalSummaryLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
  advancedPaymentModalSummaryAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: '#10B981',
  },
  modalButtonDisabled: {
    opacity: 0.5,
  },
  paymentMethodsSection: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  paymentMethodsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  paymentMethodsList: {
    gap: 12,
  },
  paymentMethodOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  paymentMethodOptionSelected: {
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6',
    borderWidth: 2,
  },
  paymentMethodLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  paymentMethodIcon: {
    fontSize: 24,
  },
  paymentMethodIconImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 12,
  },
  paymentMethodInfo: {
    flex: 1,
  },
  paymentMethodName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  paymentMethodAccount: {
    fontSize: 13,
    color: '#6B7280',
  },
  noPaymentMethods: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  noPaymentMethodsText: {
    fontSize: 14,
    color: '#92400E',
    lineHeight: 20,
    textAlign: 'center',
  },
  paymentMethodAction: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  paymentMethodActionText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  paymentMethodSelectedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    padding: 10,
    backgroundColor: '#F0FDF4',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  paymentMethodSelectedText: {
    fontSize: 13,
    color: '#10B981',
    fontWeight: '500',
  },
  paymentBanner: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  paymentBannerContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  paymentBannerIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  paymentBannerText: {
    flex: 1,
  },
  paymentBannerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  paymentBannerAmount: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  paymentBannerDate: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  paymentBannerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    gap: 8,
  },
  paymentBannerButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  nextMonthNotification: {
    marginTop: 12,
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  nextMonthNotificationText: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '600',
    lineHeight: 18,
  },
  paymentDetailsGrid: {
    gap: 16,
    marginBottom: 16,
  },
  paymentDetailItem: {
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  paymentDetailLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  paymentDetailValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  paymentDetailValueError: {
    color: '#EF4444',
  },
  overdueWarning: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FEF2F2',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
    marginBottom: 16,
    gap: 12,
  },
  overdueWarningText: {
    flex: 1,
    fontSize: 14,
    color: '#DC2626',
    fontWeight: '500',
    lineHeight: 20,
  },
  modalInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
  },
  categoryButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  categoryButtonSelected: {
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6',
    borderWidth: 2,
  },
  categoryButtonText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  categoryButtonTextSelected: {
    color: '#3B82F6',
    fontWeight: '600',
  },
  priorityButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  priorityButtonLow: {
    backgroundColor: '#F0FDF4',
    borderColor: '#10B981',
    borderWidth: 2,
  },
  priorityButtonMedium: {
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
    borderWidth: 2,
  },
  priorityButtonHigh: {
    backgroundColor: '#FEE2E2',
    borderColor: '#EF4444',
    borderWidth: 2,
  },
  priorityButtonUrgent: {
    backgroundColor: '#FEE2E2',
    borderColor: '#DC2626',
    borderWidth: 2,
  },
  priorityButtonText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  priorityButtonTextSelected: {
    fontWeight: '600',
  },
  mediaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  mediaButtonText: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '500',
  },
  mediaPreview: {
    width: 80,
    height: 80,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  mediaPreviewImage: {
    width: '100%',
    height: '100%',
  },
  mediaRemoveButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

