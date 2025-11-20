import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, Alert, Modal, StyleSheet, Dimensions, Platform, ActivityIndicator, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { db, clearCache } from '../../utils/db';
import { OwnerApplicationRecord, BrgyNotificationRecord, OwnerApplicationDocument, DbUserRecord, PublishedListingRecord } from '../../types';
import { sharedStyles, designTokens, iconBackgrounds } from '../../styles/owner-dashboard-styles';
import { loadUserProfilePhoto } from '../../utils/user-profile-photos';
import * as FileSystem from 'expo-file-system/legacy';
import { GestureHandlerRootView, GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming, cancelAnimation, runOnJS } from 'react-native-reanimated';
import { 
  CheckCircle, 
  XCircle, 
  FileText,
  User,
  Mail,
  Phone,
  MapPin,
  Home,
  AlertCircle,
  Download,
  ZoomIn,
  X,
  Bell,
  Building
} from 'lucide-react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function OwnerApplications() {
  const { user } = useAuth();
  const router = useRouter();
  const [applications, setApplications] = useState<OwnerApplicationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApplication, setSelectedApplication] = useState<OwnerApplicationRecord | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [barangay, setBarangay] = useState('');
  const [approvedApplicationsData, setApprovedApplicationsData] = useState<Array<{
    application: OwnerApplicationRecord;
    profilePhoto: string | null;
    propertyCount: number;
  }>>([]);
  const [selectedDocument, setSelectedDocument] = useState<OwnerApplicationDocument | { uri: string; name: string } | null>(null);
  const [showDocumentViewer, setShowDocumentViewer] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  // Confirmation dialog state
  const [confirmationDialog, setConfirmationDialog] = useState<{
    visible: boolean;
    title: string;
    message: string;
    confirmText: string;
    cancelText: string;
    onConfirm: () => Promise<void>;
    isDestructive?: boolean;
    isLoading?: boolean;
  } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      
      // Get barangay from user
      const userRecord = await db.get('users', user.id);
      const userBarangay = userRecord?.barangay || '';
      setBarangay(userBarangay);

      // Get all applications for this barangay
      const allApplications = await db.list<OwnerApplicationRecord>('owner_applications');
      const barangayApplications = allApplications.filter(
        app => app.barangay.toUpperCase() === userBarangay.toUpperCase()
      );

      // Sort by creation date (newest first)
      barangayApplications.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      setApplications(barangayApplications);

      // Load data for approved applications (profile photos and property counts)
      const approvedApps = barangayApplications.filter(app => app.status === 'approved');
      const allUsers = await db.list<DbUserRecord>('users');
      const allListings = await db.list<PublishedListingRecord>('published_listings');
      
      const approvedData = await Promise.all(
        approvedApps.map(async (application) => {
          const owner = allUsers.find(u => u.id === application.userId);
          const ownerProperties = allListings.filter(l => l.userId === application.userId);
          
          // Load profile photo
          let profilePhoto: string | null = null;
          if (owner) {
            try {
              profilePhoto = await loadUserProfilePhoto(owner.id);
            } catch (photoError) {
              console.warn(`⚠️ Could not load profile photo for owner ${owner.id}:`, photoError);
            }
          }
          
          return {
            application,
            profilePhoto,
            propertyCount: ownerProperties.length,
          };
        })
      );
      
      setApprovedApplicationsData(approvedData);
    } catch (error) {
      console.error('Error loading applications:', error);
      if (Platform.OS === 'web') {
        window.alert('Error\n\nFailed to load owner applications');
      } else {
        Alert.alert('Error', 'Failed to load owner applications');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (application: OwnerApplicationRecord) => {
    // Use confirmation dialog that works on web
    setConfirmationDialog({
      visible: true,
      title: 'Approve Application',
      message: `Are you sure you want to approve ${application.name}'s owner application?`,
      confirmText: 'Approve',
      cancelText: 'Cancel',
      isDestructive: false,
      isLoading: false,
      onConfirm: async () => {
        try {
          setConfirmationDialog(prev => prev ? { ...prev, isLoading: true } : null);
          console.log('🔄 Starting approval process for application:', application.id);
          
          // Update application status
          const updatedApplication = {
            ...application,
            status: 'approved' as const,
            reviewedBy: user?.id,
            reviewedAt: new Date().toISOString(),
          };
          
          await db.upsert('owner_applications', application.id, updatedApplication);
          console.log('✅ Application status updated to approved');

          // Clear cache to ensure fresh data
          await clearCache();

          // Update user role to owner
          const userRecord = await db.get('users', application.userId);
          if (userRecord) {
            const updatedUser = {
              ...userRecord,
              role: 'owner',
              // Also update the roles array if it exists for AuthContext compatibility
              roles: ['owner'],
              updatedAt: new Date().toISOString(),
            };
            await db.upsert('users', application.userId, updatedUser);
            console.log('✅ User role updated to owner:', updatedUser);
          } else {
            console.warn('⚠️ User record not found for userId:', application.userId);
          }

          // Delete notification
          const notifications = await db.list<BrgyNotificationRecord>('brgy_notifications');
          const notification = notifications.find(
            notif => notif.ownerApplicationId === application.id && notif.barangay === barangay
          );
          
          if (notification) {
            await db.remove('brgy_notifications', notification.id);
            console.log('✅ Notification deleted');
          }

          // Close modals
          setConfirmationDialog(null);
          setShowModal(false);
          
          // Refresh data
          await loadData();
          
          // Show success message
          if (Platform.OS === 'web') {
            window.alert('Success\n\nApplication approved successfully!');
          } else {
            Alert.alert('Success', 'Application approved successfully!');
          }
        } catch (error) {
          console.error('❌ Error approving application:', error);
          const errorMessage = `Failed to approve application: ${error instanceof Error ? error.message : 'Unknown error'}`;
          setConfirmationDialog(null);
          if (Platform.OS === 'web') {
            window.alert(`Error\n\n${errorMessage}`);
          } else {
            Alert.alert('Error', errorMessage);
          }
        }
      },
    });
  };

  const handleReject = async (application: OwnerApplicationRecord) => {
    // Use confirmation dialog that works on web
    setConfirmationDialog({
      visible: true,
      title: 'Reject Application',
      message: `Are you sure you want to reject ${application.name}'s owner application?`,
      confirmText: 'Reject',
      cancelText: 'Cancel',
      isDestructive: true,
      isLoading: false,
      onConfirm: async () => {
        try {
          setConfirmationDialog(prev => prev ? { ...prev, isLoading: true } : null);
          console.log('🔄 Starting rejection process for application:', application.id);
          
          // Update application status
          const updatedApplication = {
            ...application,
            status: 'rejected' as const,
            reviewedBy: user?.id,
            reviewedAt: new Date().toISOString(),
          };
          
          await db.upsert('owner_applications', application.id, updatedApplication);
          console.log('✅ Application status updated to rejected');

          // Clear cache to ensure fresh data
          await clearCache();

          // Delete notification
          const notifications = await db.list<BrgyNotificationRecord>('brgy_notifications');
          const notification = notifications.find(
            notif => notif.ownerApplicationId === application.id && notif.barangay === barangay
          );
          
          if (notification) {
            await db.remove('brgy_notifications', notification.id);
            console.log('✅ Notification deleted');
          }

          // Close modals
          setConfirmationDialog(null);
          setShowModal(false);
          
          // Refresh data
          await loadData();
          
          // Show success message
          if (Platform.OS === 'web') {
            window.alert('Success\n\nApplication rejected.');
          } else {
            Alert.alert('Success', 'Application rejected.');
          }
        } catch (error) {
          console.error('❌ Error rejecting application:', error);
          const errorMessage = `Failed to reject application: ${error instanceof Error ? error.message : 'Unknown error'}`;
          setConfirmationDialog(null);
          if (Platform.OS === 'web') {
            window.alert(`Error\n\n${errorMessage}`);
          } else {
            Alert.alert('Error', errorMessage);
          }
        }
      },
    });
  };

  const openModal = (application: OwnerApplicationRecord) => {
    setSelectedApplication(application);
    setShowModal(true);
  };

  const openDocumentViewer = (document: OwnerApplicationDocument | { uri: string; name: string }) => {
    setSelectedDocument(document);
    setShowDocumentViewer(true);
  };

  const downloadDocument = async (document: OwnerApplicationDocument | { uri: string; name: string }) => {
    if (!document || !document.uri) {
      Alert.alert('Error', 'Document URI is missing');
      return;
    }

    try {
      setIsDownloading(true);
      console.log('📥 Starting download for:', document.name, document.uri);
      
      // Determine file extension from URI or default to jpg
      const uriLower = document.uri.toLowerCase();
      let extension = 'jpg';
      if (uriLower.includes('.png')) extension = 'png';
      else if (uriLower.includes('.pdf')) extension = 'pdf';
      else if (uriLower.includes('.jpeg')) extension = 'jpeg';
      
      const fileName = `${document.name.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.${extension}`;
      
      if (Platform.OS === 'web') {
        // For web, create a download link
        try {
          if (typeof window !== 'undefined' && window.URL) {
            console.log('🌐 Web download: Fetching document...');
            const response = await fetch(document.uri);
            
            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = window.document.createElement('a');
            link.href = url;
            link.download = fileName;
            link.style.display = 'none';
            window.document.body.appendChild(link);
            link.click();
            window.document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
            console.log('✅ Web download completed');
          } else {
            throw new Error('Web APIs not available');
          }
        } catch (error) {
          console.error('❌ Web download error:', error);
          Alert.alert('Error', `Failed to download document: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      } else {
        // For mobile platforms
        try {
          console.log('📱 Mobile download: Starting...');
          
          // Use cache directory for temporary storage before saving to device
          const tempFileUri = FileSystem.cacheDirectory + fileName;
          console.log('📁 Temporary location:', tempFileUri);
          
          let resultUri = tempFileUri;
          
          // Check if the source URI is a local file or remote URL
          const isLocalFile = document.uri.startsWith('file://') || document.uri.startsWith('/');
          
          if (isLocalFile) {
            // For local files, read and write to copy
            console.log('📋 Copying local file...');
            const sourceUri = document.uri.startsWith('file://') ? document.uri : `file://${document.uri}`;
            
            // Read the file as base64
            const base64 = await FileSystem.readAsStringAsync(sourceUri, {
              encoding: FileSystem.EncodingType.Base64,
            });
            
            // Write to temporary location
            await FileSystem.writeAsStringAsync(tempFileUri, base64, {
              encoding: FileSystem.EncodingType.Base64,
            });
            
            console.log('✅ File copied successfully');
            resultUri = tempFileUri;
          } else {
            // For remote URLs (http/https), use downloadAsync
            console.log('🌐 Downloading remote file...');
            const result = await FileSystem.downloadAsync(document.uri, tempFileUri);
            console.log('📥 Download result:', result);
            
            if (result.status === 200) {
              resultUri = result.uri;
            } else {
              throw new Error(`Download failed with status: ${result.status}`);
            }
          }
          
          // Save file directly to device storage
          try {
            const isImage = ['jpg', 'jpeg', 'png', 'gif'].includes(extension.toLowerCase());
            
            if (isImage) {
              // For images, try to save to Photos library using expo-media-library
              try {
                const MediaLibrary = await import('expo-media-library');
                
                // Request permissions
                const { status } = await MediaLibrary.requestPermissionsAsync();
                
                if (status === 'granted') {
                  // Save image to Photos library
                  const asset = await MediaLibrary.createAssetAsync(resultUri);
                  
                  // Try to add to a "Downloads" or "HanapBahay" album, or just save to default
                  try {
                    await MediaLibrary.createAlbumAsync('HanapBahay', asset, false);
                    console.log('✅ Image saved to Photos library in HanapBahay album');
                  } catch (albumError) {
                    // If album creation fails, the image is still saved to Photos
                    console.log('✅ Image saved to Photos library');
                  }
                  
                  Alert.alert('Success', 'Image saved to your Photos library!');
                } else {
                  // Permission denied, fall back to document directory
                  throw new Error('Media library permission denied');
                }
              } catch (mediaLibraryError) {
                console.log('⚠️ Media library not available or permission denied, using fallback');
                // Fallback: Save to document directory and use sharing
                await saveToDocumentDirectory(resultUri, fileName, extension);
              }
            } else {
              // For PDFs and other files, save to document directory and use sharing
              await saveToDocumentDirectory(resultUri, fileName, extension);
            }
          } catch (error) {
            console.error('⚠️ Error saving file:', error);
            // Final fallback: Save to document directory
            await saveToDocumentDirectory(resultUri, fileName, extension);
          }
          
          // Helper function to save to document directory and optionally share
          async function saveToDocumentDirectory(sourceUri: string, fileName: string, fileExtension: string) {
            const docFileUri = FileSystem.documentDirectory + fileName;
            
            // Copy file to document directory
            if (sourceUri !== docFileUri) {
              const base64 = await FileSystem.readAsStringAsync(sourceUri, {
                encoding: FileSystem.EncodingType.Base64,
              });
              await FileSystem.writeAsStringAsync(docFileUri, base64, {
                encoding: FileSystem.EncodingType.Base64,
              });
            }
            
            // Try to use sharing to make it accessible
            try {
              const Sharing = await import('expo-sharing');
              if (await Sharing.isAvailableAsync()) {
                // Open share sheet so user can save to Downloads/Files
                await Sharing.shareAsync(docFileUri, {
                  mimeType: fileExtension === 'pdf' ? 'application/pdf' : `image/${fileExtension}`,
                  dialogTitle: 'Save Document',
                });
                Alert.alert('Success', 'File ready to save! Use the share menu to save to Downloads or Files.');
              } else {
                Alert.alert('Success', `File saved to app storage: ${docFileUri}`);
              }
            } catch (sharingError) {
              Alert.alert('Success', `File saved to app storage: ${docFileUri}`);
            }
          }
        } catch (error) {
          console.error('❌ Mobile download error:', error);
          Alert.alert('Error', `Failed to download document: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    } catch (error) {
      console.error('❌ Error downloading document:', error);
      Alert.alert('Error', `Failed to download document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsDownloading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return '#10B981';
      case 'rejected':
        return '#EF4444';
      default:
        return '#F59E0B';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle size={16} color="#10B981" />;
      case 'rejected':
        return <XCircle size={16} color="#EF4444" />;
      default:
        return <AlertCircle size={16} color="#F59E0B" />;
    }
  };

  const renderApprovedApplication = (data: { application: OwnerApplicationRecord; profilePhoto: string | null; propertyCount: number }, index: number) => {
    const { application, profilePhoto, propertyCount } = data;
    return (
      <TouchableOpacity
        key={application.id}
        style={[sharedStyles.listItem, { marginBottom: 16 }]}
        onPress={() => openModal(application)}
        activeOpacity={0.7}
      >
        <View style={{ position: 'relative' }}>
          {profilePhoto ? (
            <Image
              source={{ uri: profilePhoto }}
              style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                borderWidth: 2,
                borderColor: '#10B981',
              }}
              resizeMode="cover"
              onError={(error) => {
                console.error('Profile photo load error in list:', error);
              }}
            />
          ) : (
            <View style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              backgroundColor: designTokens.colors.primary + '20',
              justifyContent: 'center',
              alignItems: 'center',
              borderWidth: 2,
              borderColor: '#10B981',
            }}>
              <Text style={{
                fontSize: 24,
                fontWeight: 'bold',
                color: designTokens.colors.primary,
              }}>
                {application.name.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          {/* Verified badge */}
          <View style={{
            position: 'absolute',
            bottom: -2,
            right: -2,
            width: 20,
            height: 20,
            borderRadius: 10,
            backgroundColor: '#10B981',
            borderWidth: 2,
            borderColor: '#FFFFFF',
            justifyContent: 'center',
            alignItems: 'center',
          }}>
            <CheckCircle size={12} color="#FFFFFF" />
          </View>
        </View>
        <View style={{ flex: 1, marginLeft: designTokens.spacing.lg }}>
          <Text style={[sharedStyles.statLabel, { marginBottom: 4 }]}>
            {application.name}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 }}>
            <Mail size={14} color="#6B7280" />
            <Text style={[sharedStyles.statSubtitle, { fontSize: 13 }]}>
              {application.email}
            </Text>
          </View>
          {application.contactNumber && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 }}>
              <Phone size={14} color="#6B7280" />
              <Text style={[sharedStyles.statSubtitle, { fontSize: 13 }]}>
                {application.contactNumber}
              </Text>
            </View>
          )}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Building size={14} color="#10B981" />
              <Text style={[sharedStyles.statSubtitle, { color: '#10B981', fontWeight: '600' }]}>
                {propertyCount} {propertyCount === 1 ? 'property' : 'properties'}
              </Text>
            </View>
          </View>
        </View>
        <Text style={{ fontSize: 20, color: designTokens.colors.textMuted }}>›</Text>
      </TouchableOpacity>
    );
  };

  const renderApplication = (application: OwnerApplicationRecord, index: number) => (
    <TouchableOpacity
      key={application.id}
      style={[sharedStyles.listItem, { marginBottom: 16 }]}
      onPress={() => openModal(application)}
    >
      <View style={[sharedStyles.statIcon, iconBackgrounds.blue]}>
        <FileText size={20} color="#3B82F6" />
      </View>
      <View style={{ flex: 1, marginLeft: designTokens.spacing.lg }}>
        <Text style={[sharedStyles.statLabel, { marginBottom: 4 }]}>
          {application.name}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {getStatusIcon(application.status)}
          <Text style={[sharedStyles.statSubtitle, { 
            color: getStatusColor(application.status),
            textTransform: 'capitalize'
          }]}>
            {application.status}
          </Text>
        </View>
        <Text style={[sharedStyles.statSubtitle, { marginTop: 4 }]}>
          {application.street}, {application.barangay}
        </Text>
      </View>
      <Text style={{ fontSize: 20, color: designTokens.colors.textMuted }}>›</Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={sharedStyles.loadingContainer}>
        <Text style={sharedStyles.loadingText}>Loading applications...</Text>
      </View>
    );
  }

  const pendingApplications = applications.filter(app => app.status === 'pending');

  return (
    <View style={sharedStyles.container}>
      <ScrollView style={sharedStyles.scrollView}>
        <View style={sharedStyles.pageContainer}>
          {/* Header */}
          <View style={sharedStyles.pageHeader}>
            <TouchableOpacity 
              style={sharedStyles.backButton}
              onPress={() => router.back()}
            >
              <Text style={sharedStyles.primaryButtonText}>← Back</Text>
            </TouchableOpacity>
            <View style={sharedStyles.headerLeft}>
              <Text style={sharedStyles.pageTitle}>Owner Applications</Text>
              <Text style={sharedStyles.pageSubtitle}>
                {pendingApplications.length} pending review
              </Text>
            </View>
          </View>

          {/* Summary Box for Pending Applications */}
          {pendingApplications.length > 0 && (
            <View style={[sharedStyles.card, { 
              backgroundColor: '#FFFBEB', 
              borderColor: '#F59E0B', 
              borderWidth: 1,
              marginBottom: designTokens.spacing.lg 
            }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: designTokens.spacing.md, flex: 1 }}>
                  <View style={[sharedStyles.statIcon, iconBackgrounds.orange]}>
                    <Bell size={20} color="#F59E0B" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[sharedStyles.statLabel, { color: '#92400E', marginBottom: 4 }]}>
                      {pendingApplications.length} Pending Application{pendingApplications.length > 1 ? 's' : ''}
                    </Text>
                    <Text style={[sharedStyles.statSubtitle, { fontSize: 12, color: '#92400E' }]}>
                      Awaiting your review and approval
                    </Text>
                  </View>
                </View>
                <View style={{
                  backgroundColor: '#F59E0B',
                  borderRadius: 20,
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  minWidth: 50,
                  alignItems: 'center',
                }}>
                  <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 18 }}>
                    {pendingApplications.length}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Pending Applications */}
          {pendingApplications.length === 0 ? (
            <View style={sharedStyles.card}>
              <View style={{ alignItems: 'center', padding: 32 }}>
                <FileText size={48} color="#9CA3AF" />
                <Text style={[sharedStyles.sectionTitle, { marginTop: 16 }]}>
                  No Pending Applications
                </Text>
                <Text style={sharedStyles.statSubtitle}>
                  All owner applications have been reviewed
                </Text>
              </View>
            </View>
          ) : (
            <View style={sharedStyles.section}>
              <Text style={sharedStyles.sectionTitle}>
                Pending Applications ({pendingApplications.length})
              </Text>
              {pendingApplications.map((app, index) => renderApplication(app, index))}
            </View>
          )}

          {/* Approved Applications */}
          {approvedApplicationsData.length > 0 && (
            <View style={[sharedStyles.section, { marginTop: designTokens.spacing['2xl'] }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Text style={sharedStyles.sectionTitle}>
                  Approved Applications ({approvedApplicationsData.length})
                </Text>
                <TouchableOpacity 
                  onPress={() => router.push('/(brgy)/approved-owners' as any)}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                >
                  <Text style={{ color: '#3B82F6', fontSize: 13, fontWeight: '600' }}>View All</Text>
                  <Text style={{ fontSize: 16, color: '#3B82F6' }}>›</Text>
                </TouchableOpacity>
              </View>
              {approvedApplicationsData
                .slice(0, 2) // Show only recent 2
                .map((data, index) => renderApprovedApplication(data, index))}
            </View>
          )}

          {/* Rejected Applications */}
          {applications.filter(app => app.status === 'rejected').length > 0 && (
            <View style={sharedStyles.section}>
              <Text style={sharedStyles.sectionTitle}>
                Rejected Applications ({applications.filter(app => app.status === 'rejected').length})
              </Text>
              {applications
                .filter(app => app.status === 'rejected')
                .slice(0, 3) // Show only recent 3
                .map((app, index) => renderApplication(app, index))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Confirmation Dialog Modal */}
      <Modal
        visible={confirmationDialog?.visible || false}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setConfirmationDialog(null)}
      >
        <View style={styles.confirmationOverlay}>
          <View style={styles.confirmationDialog}>
            <Text style={styles.confirmationTitle}>
              {confirmationDialog?.title}
            </Text>
            <Text style={styles.confirmationMessage}>
              {confirmationDialog?.message}
            </Text>
            <View style={styles.confirmationButtons}>
              <TouchableOpacity
                style={[styles.confirmationButton, styles.confirmationCancelButton]}
                onPress={() => setConfirmationDialog(null)}
                disabled={confirmationDialog?.isLoading}
              >
                <Text style={styles.confirmationCancelText}>
                  {confirmationDialog?.cancelText || 'Cancel'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.confirmationButton,
                  confirmationDialog?.isDestructive
                    ? styles.confirmationDestructiveButton
                    : styles.confirmationConfirmButton,
                  confirmationDialog?.isLoading && styles.confirmationButtonDisabled
                ]}
                onPress={confirmationDialog?.onConfirm}
                disabled={confirmationDialog?.isLoading}
              >
                {confirmationDialog?.isLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.confirmationConfirmText}>
                    {confirmationDialog?.confirmText || 'Confirm'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Application Detail Modal */}
      <Modal
        visible={showModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowModal(false)}
      >
      {selectedApplication && (
          <ScrollView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
            <View style={{ padding: 24 }}>
              {/* Header */}
              <View style={{ 
                flexDirection: 'row', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: 24 
              }}>
                <Text style={sharedStyles.pageTitle}>Application Details</Text>
                <TouchableOpacity onPress={() => setShowModal(false)}>
                  <Text style={[sharedStyles.primaryButtonText, { color: '#6B7280' }]}>Close</Text>
                </TouchableOpacity>
              </View>

              {/* Personal Information */}
              <View style={sharedStyles.card}>
                <Text style={sharedStyles.sectionTitle}>Personal Information</Text>
                <View style={{ gap: 16 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <User size={18} color="#6B7280" style={{ marginRight: 12 }} />
                    <Text style={sharedStyles.statLabel}>Name: {selectedApplication.name}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                      <Mail size={18} color="#6B7280" style={{ marginRight: 12 }} />
                      <Text style={[sharedStyles.statLabel, { flex: 1 }]}>{selectedApplication.email}</Text>
                    </View>
                    <TouchableOpacity
                      onPress={async () => {
                        try {
                          const emailUrl = `mailto:${selectedApplication.email}?subject=Owner Application Inquiry&body=Hello, I would like to discuss your owner application.`;
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
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        backgroundColor: '#10B981',
                        borderRadius: 6,
                        marginLeft: 8
                      }}
                    >
                      <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '600' }}>Email</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                      <Phone size={18} color="#6B7280" style={{ marginRight: 12 }} />
                      <Text style={[sharedStyles.statLabel, { flex: 1 }]}>{selectedApplication.contactNumber}</Text>
                    </View>
                    <TouchableOpacity
                      onPress={async () => {
                        try {
                          const cleanPhone = selectedApplication.contactNumber.replace(/[\s\-()]/g, '');
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
                            const cleanPhone = selectedApplication.contactNumber.replace(/[\s\-()]/g, '');
                            await Linking.openURL(`tel:${cleanPhone}`);
                          } catch (fallbackError) {
                            Alert.alert('Error', `Unable to open phone dialer. Please copy the number and dial manually.`);
                          }
                        }
                      }}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        backgroundColor: '#3B82F6',
                        borderRadius: 6,
                        marginLeft: 8
                      }}
                    >
                      <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '600' }}>Call</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* Business Address */}
              <View style={[sharedStyles.card, { marginTop: 16 }]}>
                <Text style={sharedStyles.sectionTitle}>Business Address</Text>
                <View style={{ gap: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Home size={18} color="#6B7280" style={{ marginRight: 12 }} />
                    <Text style={sharedStyles.statLabel}>
                      {selectedApplication.houseNumber} {selectedApplication.street}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <MapPin size={18} color="#6B7280" style={{ marginRight: 12 }} />
                    <Text style={sharedStyles.statLabel}>{selectedApplication.barangay} Barangay</Text>
                  </View>
                </View>
              </View>

              {/* Business Documents */}
              {(selectedApplication.documents?.length > 0 || selectedApplication.govIdUri) && (
                <View style={[sharedStyles.card, { marginTop: 16 }]}>
                  <Text style={sharedStyles.sectionTitle}>Business Documents & Requirements</Text>
                  
                  {/* Display multiple documents if available */}
                  {selectedApplication.documents && selectedApplication.documents.length > 0 ? (
                    <View style={{ marginTop: 12, gap: 16 }}>
                      {selectedApplication.documents.map((doc, index) => (
                        <View key={doc.id || index} style={{ marginBottom: 16 }}>
                          <View style={{ 
                            flexDirection: 'row', 
                            justifyContent: 'space-between', 
                            alignItems: 'center',
                            marginBottom: 8 
                          }}>
                            <Text style={{
                              fontSize: 14,
                              fontWeight: '600',
                              color: '#374151',
                              flex: 1
                            }}>
                              {doc.name}
                            </Text>
                          </View>
                          <TouchableOpacity onPress={() => openDocumentViewer(doc)}>
                            <Image
                              source={{ uri: doc.uri }}
                              style={{ 
                                width: '100%', 
                                height: 300, 
                                borderRadius: 12,
                                backgroundColor: '#F3F4F6'
                              }}
                              resizeMode="contain"
                            />
                          </TouchableOpacity>
                          {doc.uploadedAt && (
                            <Text style={{
                              fontSize: 12,
                              color: '#6B7280',
                              marginTop: 4,
                              fontStyle: 'italic'
                            }}>
                              Uploaded: {new Date(doc.uploadedAt).toLocaleDateString()}
                            </Text>
                          )}
                        </View>
                      ))}
                    </View>
                  ) : (
                    /* Fallback to govIdUri for backward compatibility */
                    selectedApplication.govIdUri && (
                      <View style={{ marginTop: 12 }}>
                        <View style={{ 
                          flexDirection: 'row', 
                          justifyContent: 'space-between', 
                          alignItems: 'center',
                          marginBottom: 8 
                        }}>
                          <Text style={{
                            fontSize: 14,
                            fontWeight: '600',
                            color: '#374151',
                            flex: 1
                          }}>
                            Government ID
                          </Text>
                        </View>
                        <TouchableOpacity onPress={() => openDocumentViewer({ uri: selectedApplication.govIdUri!, name: 'Government ID' })}>
                          <Image
                            source={{ uri: selectedApplication.govIdUri }}
                            style={{ 
                              width: '100%', 
                              height: 300, 
                              borderRadius: 12,
                              backgroundColor: '#F3F4F6'
                            }}
                            resizeMode="contain"
                          />
                        </TouchableOpacity>
                      </View>
                    )
                  )}
                </View>
              )}

              {/* Action Buttons */}
              {selectedApplication.status === 'pending' && (
                <View style={{ marginTop: 32, gap: 12 }}>
                  <TouchableOpacity
                    style={[sharedStyles.primaryButton, { backgroundColor: '#10B981' }]}
                    onPress={() => handleApprove(selectedApplication)}
                  >
                    <CheckCircle size={18} color="white" />
                    <Text style={sharedStyles.primaryButtonText}>Approve Application</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[sharedStyles.primaryButton, { backgroundColor: '#EF4444' }]}
                    onPress={() => handleReject(selectedApplication)}
                  >
                    <XCircle size={18} color="white" />
                    <Text style={sharedStyles.primaryButtonText}>Reject Application</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </ScrollView>
        )}
      </Modal>

      {/* Document Viewer Modal with Zoom */}
      <Modal
        visible={showDocumentViewer}
        animationType="fade"
        transparent={true}
        onRequestClose={() => {
          setShowDocumentViewer(false);
          setTimeout(() => {
            setSelectedDocument(null);
          }, 200);
        }}
      >
        <GestureHandlerRootView style={{ flex: 1 }}>
          <View style={styles.documentViewerContainer}>
            <View style={styles.documentViewerHeader}>
              <Text style={styles.documentViewerTitle} numberOfLines={1} ellipsizeMode="tail">
                {selectedDocument?.name || 'Document'}
              </Text>
              <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                <TouchableOpacity
                  style={[styles.documentViewerButton, isDownloading && { opacity: 0.5 }]}
                  onPress={() => {
                    if (selectedDocument && !isDownloading) {
                      downloadDocument(selectedDocument);
                    }
                  }}
                  disabled={isDownloading}
                  activeOpacity={0.7}
                >
                  <Download size={20} color="#FFFFFF" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.documentViewerButton}
                  onPress={() => {
                    // Close modal safely
                    setShowDocumentViewer(false);
                    setTimeout(() => {
                      setSelectedDocument(null);
                    }, 200);
                  }}
                  activeOpacity={0.7}
                >
                  <X size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>
            
            {selectedDocument && selectedDocument.uri && (
              <ZoomableImage
                uri={selectedDocument.uri}
                onClose={() => {
                  // Reset state in a safe way
                  setTimeout(() => {
                    setShowDocumentViewer(false);
                    setSelectedDocument(null);
                  }, 100);
                }}
              />
            )}
          </View>
        </GestureHandlerRootView>
      </Modal>
    </View>
  );
}

// Zoomable Image Component
const ZoomableImage = ({ uri, onClose }: { uri: string; onClose: () => void }) => {
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedScale = useSharedValue(1);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);
  const [isClosing, setIsClosing] = useState(false);
  // Use shared value for mounted state (worklet-safe)
  const isMounted = useSharedValue(true);
  
  // Cleanup on unmount
  useEffect(() => {
    isMounted.value = true;
    return () => {
      isMounted.value = false;
      // Cancel any running animations
      try {
        cancelAnimation(scale);
        cancelAnimation(translateX);
        cancelAnimation(translateY);
      } catch (error) {
        console.log('Animation cleanup error (safe to ignore):', error);
      }
      // Reset all animations when component unmounts
      scale.value = 1;
      translateX.value = 0;
      translateY.value = 0;
      savedScale.value = 1;
      savedTranslateX.value = 0;
      savedTranslateY.value = 0;
    };
  }, []);

  const resetZoom = () => {
    if (isClosing || !isMounted.value) return; // Don't animate if closing or unmounted
    
    try {
      // Cancel any running animations first
      cancelAnimation(scale);
      cancelAnimation(translateX);
      cancelAnimation(translateY);
      
      // Reset saved values immediately
      savedScale.value = 1;
      savedTranslateX.value = 0;
      savedTranslateY.value = 0;
      
      // Animate to reset position
      scale.value = withTiming(1, { duration: 200 });
      translateX.value = withTiming(0, { duration: 200 });
      translateY.value = withTiming(0, { duration: 200 });
    } catch (error) {
      console.error('Error resetting zoom:', error);
      // Fallback: set values directly without animation
      scale.value = 1;
      translateX.value = 0;
      translateY.value = 0;
      savedScale.value = 1;
      savedTranslateX.value = 0;
      savedTranslateY.value = 0;
    }
  };

  const handleClose = () => {
    if (isClosing) return; // Prevent multiple close calls
    setIsClosing(true);
    
    // Reset animations before closing
    scale.value = 1;
    translateX.value = 0;
    translateY.value = 0;
    savedScale.value = 1;
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
    
    // Small delay to ensure animations are reset
    setTimeout(() => {
      onClose();
    }, 50);
  };

  const pinchGesture = Gesture.Pinch()
    .enabled(!isClosing)
    .onUpdate((event) => {
      if (isClosing || !isMounted.value) return;
      try {
        const newScale = Math.max(1, Math.min(savedScale.value * event.scale, 5));
        scale.value = newScale;
      } catch (error) {
        console.error('Pinch gesture error:', error);
      }
    })
    .onEnd(() => {
      if (isClosing || !isMounted.value) return;
      try {
        savedScale.value = scale.value;
        // Reset if scale is too small
        if (scale.value < 1) {
          scale.value = withTiming(1, { duration: 200 });
          savedScale.value = 1;
        }
      } catch (error) {
        console.error('Pinch gesture end error:', error);
      }
    });

  const panGesture = Gesture.Pan()
    .enabled(!isClosing)
    .onUpdate((event) => {
      if (isClosing || !isMounted.value) return;
      try {
        if (scale.value > 1) {
          translateX.value = savedTranslateX.value + event.translationX;
          translateY.value = savedTranslateY.value + event.translationY;
        }
      } catch (error) {
        console.error('Pan gesture error:', error);
      }
    })
    .onEnd(() => {
      if (isClosing || !isMounted.value) return;
      try {
        savedTranslateX.value = translateX.value;
        savedTranslateY.value = translateY.value;
      } catch (error) {
        console.error('Pan gesture end error:', error);
      }
    });

  const tapGesture = Gesture.Tap()
    .enabled(!isClosing)
    .numberOfTaps(2)
    .onEnd(() => {
      // Double tap to close
      if (!isClosing && isMounted.value) {
        runOnJS(handleClose)();
      }
    });

  const singleTapGesture = Gesture.Tap()
    .numberOfTaps(1)
    .maxDuration(250)
    .onEnd(() => {
      // Single tap does nothing (only double tap closes)
      // This prevents accidental closes
    });

  const composedGesture = Gesture.Simultaneous(
    Gesture.Race(pinchGesture, panGesture),
    Gesture.Exclusive(tapGesture, singleTapGesture)
  );

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale: scale.value },
      ],
    };
  });

  // Don't render if closing or URI is invalid
  if (isClosing || !uri) {
    return null;
  }

  return (
    <View style={styles.zoomableContainer}>
      <GestureDetector gesture={composedGesture}>
        <Animated.View style={[styles.zoomableImageContainer, animatedStyle]}>
          <Image
            source={{ uri }}
            style={styles.zoomableImage}
            resizeMode="contain"
            onError={(error) => {
              console.error('Image load error:', error);
              // Close viewer if image fails to load
              handleClose();
            }}
          />
        </Animated.View>
      </GestureDetector>
    </View>
  );
};

const styles = StyleSheet.create({
  documentActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
  },
  documentActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  documentViewerContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
  },
  documentViewerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
    backgroundColor: 'transparent',
    zIndex: 10,
    position: 'relative',
  },
  documentViewerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
    marginRight: 12,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  documentViewerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoomableContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  zoomableImageContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  zoomableImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  confirmationOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  confirmationDialog: {
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
  },
  confirmationTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  confirmationMessage: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 24,
    lineHeight: 24,
  },
  confirmationButtons: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'flex-end',
  },
  confirmationButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmationCancelButton: {
    backgroundColor: '#F3F4F6',
  },
  confirmationConfirmButton: {
    backgroundColor: '#10B981',
  },
  confirmationDestructiveButton: {
    backgroundColor: '#EF4444',
  },
  confirmationButtonDisabled: {
    opacity: 0.6,
  },
  confirmationCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  confirmationConfirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
