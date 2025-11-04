import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, Alert, Modal, StyleSheet, Dimensions, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { db, clearCache } from '../../utils/db';
import { OwnerApplicationRecord, BrgyNotificationRecord, OwnerApplicationDocument } from '../../types';
import { sharedStyles, designTokens, iconBackgrounds } from '../../styles/owner-dashboard-styles';
import * as FileSystem from 'expo-file-system';
import { GestureHandlerRootView, GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
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
  X
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
  const [selectedDocument, setSelectedDocument] = useState<OwnerApplicationDocument | { uri: string; name: string } | null>(null);
  const [showDocumentViewer, setShowDocumentViewer] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

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
    } catch (error) {
      console.error('Error loading applications:', error);
      Alert.alert('Error', 'Failed to load owner applications');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (application: OwnerApplicationRecord) => {
    Alert.alert(
      'Approve Application',
      `Are you sure you want to approve ${application.name}'s owner application?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: async () => {
            try {
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

              // Close modal first
              setShowModal(false);
              
              // Refresh data
              await loadData();
              
              Alert.alert('Success', 'Application approved successfully!');
            } catch (error) {
              console.error('❌ Error approving application:', error);
              Alert.alert('Error', `Failed to approve application: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          },
        },
      ]
    );
  };

  const handleReject = async (application: OwnerApplicationRecord) => {
    Alert.alert(
      'Reject Application',
      `Are you sure you want to reject ${application.name}'s owner application?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            try {
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

              // Close modal first
              setShowModal(false);
              
              // Refresh data
              await loadData();
              
              Alert.alert('Success', 'Application rejected.');
            } catch (error) {
              console.error('❌ Error rejecting application:', error);
              Alert.alert('Error', `Failed to reject application: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          },
        },
      ]
    );
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
    try {
      setIsDownloading(true);
      const fileName = `${document.name.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.jpg`;
      
      if (Platform.OS === 'web') {
        // For web, create a download link
        try {
          if (typeof window !== 'undefined' && window.URL && document) {
            const response = await fetch(document.uri);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
            Alert.alert('Success', 'Document download started');
          } else {
            throw new Error('Web APIs not available');
          }
        } catch (error) {
          console.error('Web download error:', error);
          Alert.alert('Error', 'Failed to download document. Please try again.');
        }
      } else {
        // For mobile platforms
        const fileUri = FileSystem.documentDirectory + fileName;
        const result = await FileSystem.downloadAsync(document.uri, fileUri);
        
        if (result.status === 200) {
          // Try to use expo-sharing if available
          try {
            const Sharing = await import('expo-sharing');
            if (await Sharing.isAvailableAsync()) {
              await Sharing.shareAsync(result.uri);
              Alert.alert('Success', 'Document downloaded successfully!');
            } else {
              Alert.alert('Success', `Document saved to: ${result.uri}`);
            }
          } catch (sharingError) {
            // Sharing not available, just show success
            Alert.alert('Success', `Document saved to: ${result.uri}`);
          }
        } else {
          throw new Error('Download failed');
        }
      }
    } catch (error) {
      console.error('Error downloading document:', error);
      Alert.alert('Error', 'Failed to download document. Please try again.');
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
          {applications.filter(app => app.status === 'approved').length > 0 && (
            <View style={sharedStyles.section}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Text style={sharedStyles.sectionTitle}>
                  Approved Applications ({applications.filter(app => app.status === 'approved').length})
                </Text>
                <TouchableOpacity 
                  onPress={() => router.push('/(brgy)/approved-owners' as any)}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                >
                  <Text style={{ color: '#3B82F6', fontSize: 13, fontWeight: '600' }}>View All</Text>
                  <Text style={{ fontSize: 16, color: '#3B82F6' }}>›</Text>
                </TouchableOpacity>
              </View>
              {applications
                .filter(app => app.status === 'approved')
                .slice(0, 3) // Show only recent 3
                .map((app, index) => renderApplication(app, index))}
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
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Mail size={18} color="#6B7280" style={{ marginRight: 12 }} />
                    <Text style={sharedStyles.statLabel}>{selectedApplication.email}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Phone size={18} color="#6B7280" style={{ marginRight: 12 }} />
                    <Text style={sharedStyles.statLabel}>{selectedApplication.contactNumber}</Text>
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
                            <View style={{ flexDirection: 'row', gap: 8 }}>
                              <TouchableOpacity
                                style={styles.documentActionButton}
                                onPress={() => openDocumentViewer(doc)}
                              >
                                <ZoomIn size={16} color="#3B82F6" />
                                <Text style={styles.documentActionText}>View</Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={[styles.documentActionButton, isDownloading && { opacity: 0.5 }]}
                                onPress={() => downloadDocument(doc)}
                                disabled={isDownloading}
                              >
                                <Download size={16} color="#10B981" />
                                <Text style={styles.documentActionText}>Download</Text>
                              </TouchableOpacity>
                            </View>
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
                          <View style={{ flexDirection: 'row', gap: 8 }}>
                            <TouchableOpacity
                              style={styles.documentActionButton}
                              onPress={() => openDocumentViewer({ uri: selectedApplication.govIdUri!, name: 'Government ID' })}
                            >
                              <ZoomIn size={16} color="#3B82F6" />
                              <Text style={styles.documentActionText}>View</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[styles.documentActionButton, isDownloading && { opacity: 0.5 }]}
                              onPress={() => downloadDocument({ uri: selectedApplication.govIdUri!, name: 'Government ID' })}
                              disabled={isDownloading}
                            >
                              <Download size={16} color="#10B981" />
                              <Text style={styles.documentActionText}>Download</Text>
                            </TouchableOpacity>
                          </View>
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
        onRequestClose={() => setShowDocumentViewer(false)}
      >
        <GestureHandlerRootView style={{ flex: 1 }}>
          <View style={styles.documentViewerContainer}>
            <View style={styles.documentViewerHeader}>
              <Text style={styles.documentViewerTitle} numberOfLines={1}>
                {selectedDocument?.name || 'Document'}
              </Text>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <TouchableOpacity
                  style={[styles.documentViewerButton, isDownloading && { opacity: 0.5 }]}
                  onPress={() => {
                    if (selectedDocument && !isDownloading) {
                      downloadDocument(selectedDocument);
                    }
                  }}
                  disabled={isDownloading}
                >
                  <Download size={20} color="#FFFFFF" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.documentViewerButton}
                  onPress={() => {
                    setShowDocumentViewer(false);
                    setSelectedDocument(null);
                  }}
                  activeOpacity={0.7}
                >
                  <X size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>
            
            {selectedDocument && (
              <ZoomableImage
                uri={selectedDocument.uri}
                onClose={() => {
                  setShowDocumentViewer(false);
                  setSelectedDocument(null);
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

  const resetZoom = () => {
    scale.value = withTiming(1);
    translateX.value = withTiming(0);
    translateY.value = withTiming(0);
    savedScale.value = 1;
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
  };

  const pinchGesture = Gesture.Pinch()
    .onUpdate((event) => {
      const newScale = Math.max(1, Math.min(savedScale.value * event.scale, 5));
      scale.value = newScale;
    })
    .onEnd(() => {
      savedScale.value = scale.value;
      // Reset if scale is too small
      if (scale.value < 1) {
        scale.value = withTiming(1);
        savedScale.value = 1;
      }
    });

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      if (scale.value > 1) {
        translateX.value = savedTranslateX.value + event.translationX;
        translateY.value = savedTranslateY.value + event.translationY;
      }
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  const tapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      // Double tap to reset zoom
      resetZoom();
    });

  const singleTapGesture = Gesture.Tap()
    .numberOfTaps(1)
    .maxDuration(250)
    .onEnd(() => {
      // Only close if not zoomed (check saved scale to avoid race conditions)
      if (savedScale.value <= 1.1) {
        onClose();
      }
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

  return (
    <View style={styles.zoomableContainer}>
      <GestureDetector gesture={composedGesture}>
        <Animated.View style={[styles.zoomableImageContainer, animatedStyle]}>
          <Image
            source={{ uri }}
            style={styles.zoomableImage}
            resizeMode="contain"
          />
        </Animated.View>
      </GestureDetector>
      
      <View style={styles.zoomControls}>
        <TouchableOpacity
          style={styles.zoomHint}
          onPress={resetZoom}
          activeOpacity={0.7}
        >
          <Text style={styles.zoomHintText}>Double tap to reset zoom</Text>
        </TouchableOpacity>
      </View>
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
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  documentViewerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
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
  zoomControls: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  zoomHint: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 20,
  },
  zoomHintText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
});
