import { Stack } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'expo-router';
import { View, Text, ActivityIndicator, Linking, Alert, Platform, Modal, TouchableOpacity, ScrollView, TextInput, Image, Pressable } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import OwnerBottomNav from '../../components/OwnerBottomNav';
import { isOwnerApproved, hasPendingOwnerApplication, getOwnerApplication, getBarangayOfficialContact, clearOwnerApprovalCache } from '../../utils/owner-approval';
import { showAlert } from '../../utils/alert';
import { X, Edit, ArrowLeft, Save, User, Mail, Phone, MapPin, Home, FileText, Upload, ChevronRight } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { OwnerApplicationRecord, OwnerApplicationDocument, DbUserRecord } from '../../types';
import { db } from '../../utils/db';

export default function OwnerLayout() {
  const { user, isLoading, signOut } = useAuth();
  const router = useRouter();
  const [isCheckingApproval, setIsCheckingApproval] = useState(false);
  const hasCheckedRef = useRef(false);
  const isRedirectingRef = useRef(false);
  const modalShownForUserRef = useRef<string | null>(null);
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [showEditApplicationModal, setShowEditApplicationModal] = useState(false);
  const [applicationModalData, setApplicationModalData] = useState<{
    title: string;
    message: string;
    brgyContact: { name: string; email: string; phone: string; logo?: string | null } | null;
    barangay?: string;
    reapplicationRequested?: boolean;
    applicationId?: string;
  } | null>(null);
  
  // Edit application modal state
  const [editApplication, setEditApplication] = useState<OwnerApplicationRecord | null>(null);
  const [editUserRecord, setEditUserRecord] = useState<DbUserRecord | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editFormData, setEditFormData] = useState({
    name: '',
    email: '',
    contactNumber: '',
    houseNumber: '',
    street: '',
    barangay: '' as 'RIZAL' | 'TALOLONG' | 'GOMEZ' | 'MAGSAYSAY' | 'BURGOS' | '',
  });
  const [editDocuments, setEditDocuments] = useState<OwnerApplicationDocument[]>([]);
  const [showBarangayDropdown, setShowBarangayDropdown] = useState(false);
  const [showDocumentTypeModal, setShowDocumentTypeModal] = useState(false);
  const [selectedDocumentForType, setSelectedDocumentForType] = useState<number | null>(null);
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  
  const barangays = ['RIZAL', 'TALOLONG', 'GOMEZ', 'MAGSAYSAY', 'BURGOS'];
  const documentTypes = [
    'Government ID',
    'Business Permit',
    'Barangay Clearance',
    'Mayor\'s Permit',
    'Tax Identification Number (TIN)',
    'Business Registration',
    'Other'
  ];

  // Reset refs when user changes (but not if modal is already showing for this user)
  useEffect(() => {
    if (user?.id && modalShownForUserRef.current !== user.id) {
    hasCheckedRef.current = false;
    isRedirectingRef.current = false;
    }
  }, [user?.id]);

  useEffect(() => {
    const checkOwnerAccess = async () => {
      // Prevent multiple simultaneous checks or re-checking if modal is already shown for this user
      if (hasCheckedRef.current || isRedirectingRef.current || 
          (showApplicationModal && modalShownForUserRef.current === user?.id)) {
        return;
      }

      if (!isLoading) {
        if (!user) {
          console.log('🚫 Owner layout: No user found, redirecting to login');
          isRedirectingRef.current = true;
          router.replace('/login');
          return;
        }
        
        if (!user.roles?.includes('owner')) {
          console.log('🚫 Owner layout: User does not have owner role, redirecting to tenant tabs');
          isRedirectingRef.current = true;
          router.replace('/(tabs)');
          return;
        }

        // Check if owner application is approved - use single optimized check
        hasCheckedRef.current = true;
        setIsCheckingApproval(true);
        try {
          // Get application once and derive all needed info from it
          // This is much faster than 3 separate database queries
          const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('Approval check timeout')), 5000); // Reduced from 10s to 5s
          });
          
          const applicationPromise = getOwnerApplication(user.id);
          
          // Race against timeout
          const application = await Promise.race([
            applicationPromise,
            timeoutPromise
          ]) as OwnerApplicationRecord | null;
          
          // Derive approval status from application
          const isApproved = application?.status === 'approved' || false;
          const hasPending = application?.status === 'pending' || application?.reapplicationRequested === true || false;
          
          if (!isApproved) {
            console.log('🚫 Owner layout: Owner application not approved', { isApproved, hasPending });
            
            const barangay = application?.barangay || '';
            
            // Get Barangay official contact info in parallel with modal setup
            const brgyContactPromise = barangay ? getBarangayOfficialContact(barangay) : Promise.resolve(null);
            
            // Check if reapplication is requested
            const reapplicationRequested = application?.reapplicationRequested === true;
            
            if (hasPending || reapplicationRequested) {
              // Build message with contact info
              let message = reapplicationRequested 
                ? 'Your Barangay has requested you to update your application. Please review and update your information, then resubmit for review.'
                : 'Your Owner Application is still under review.\n\nYou will be notified once it is approved.';
              
              // Wait for contact info before showing modal
              const brgyContact = await brgyContactPromise;
              
              isRedirectingRef.current = true;
              modalShownForUserRef.current = user.id;
              setApplicationModalData({
                title: reapplicationRequested ? 'Update Required' : 'Application Pending',
                message: message,
                brgyContact: brgyContact,
                barangay: barangay,
                reapplicationRequested: reapplicationRequested,
                applicationId: application?.id
              });
              setShowApplicationModal(true);
            } else {
              // Build message with contact info
              let message = 'Your owner application has not been approved yet. Please contact your Barangay official for assistance.';
              
              // Wait for contact info before showing modal
              const brgyContact = await brgyContactPromise;
              
              isRedirectingRef.current = true;
              modalShownForUserRef.current = user.id;
              setApplicationModalData({
                title: 'Access Denied',
                message: message,
                brgyContact: brgyContact,
                barangay: barangay
              });
              setShowApplicationModal(true);
            }
            setIsCheckingApproval(false);
            return;
          }
          
          console.log('✅ Owner layout: Owner application approved, allowing access');
        } catch (error) {
          console.error('❌ Error checking owner approval:', error);
          setIsCheckingApproval(false);
          
          // If timeout error, show specific message
          const isTimeout = error instanceof Error && error.message === 'Approval check timeout';
          const errorMessage = isTimeout 
            ? 'The approval check is taking too long. Please try again or contact support.'
            : 'Unable to verify your owner status. Please try again.';
          
          isRedirectingRef.current = true;
          showAlert(
            'Error',
            errorMessage,
            [
              {
                text: 'OK',
                onPress: () => {
                  router.replace('/login');
                }
              }
            ]
          );
          return;
        } finally {
          setIsCheckingApproval(false);
        }
      }
    };

    checkOwnerAccess();
  }, [user?.id, isLoading, showApplicationModal]);

  if (isLoading || isCheckingApproval) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' }}>
        <ActivityIndicator size="large" color="#10B981" />
        <Text style={{ marginTop: 16, fontSize: 16, color: '#6B7280' }}>
          {isCheckingApproval ? 'Verifying owner status...' : 'Loading...'}
        </Text>
      </View>
    );
  }
  
  // Don't render if user check is still pending
  if (!user) {
    return null;
  }
  
  // Don't render if user doesn't have owner role
  if (!user.roles?.includes('owner')) {
    return null;
  }

  const handleCloseModal = () => {
    setShowApplicationModal(false);
    setApplicationModalData(null);
    // Redirect to login to prevent access to owner dashboard if not approved
    router.replace('/login');
  };

  const loadEditApplication = async () => {
    if (!user?.id) return;

    try {
      setEditLoading(true);
      
      // Get user record
      const userData = await db.get<DbUserRecord>('users', user.id);
      if (!userData) {
        Alert.alert('Error', 'User not found');
        return;
      }
      setEditUserRecord(userData);

      // Get owner application
      const allApplications = await db.list<OwnerApplicationRecord>('owner_applications');
      const app = allApplications.find(a => a.userId === user.id);
      
      if (!app) {
        Alert.alert('Error', 'Application not found');
        return;
      }

      setEditApplication(app);
      setEditFormData({
        name: app.name,
        email: app.email,
        contactNumber: app.contactNumber,
        houseNumber: app.houseNumber,
        street: app.street,
        barangay: app.barangay as any,
      });
      setEditDocuments(app.documents || []);
    } catch (error) {
      console.error('Error loading application:', error);
      Alert.alert('Error', 'Failed to load application');
    } finally {
      setEditLoading(false);
    }
  };

  const validateEditForm = () => {
    const newErrors: Record<string, string> = {};

    if (!editFormData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    if (!editFormData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editFormData.email)) {
      newErrors.email = 'Invalid email format';
    }
    if (!editFormData.contactNumber.trim()) {
      newErrors.contactNumber = 'Contact number is required';
    }
    if (!editFormData.houseNumber.trim()) {
      newErrors.houseNumber = 'House number is required';
    }
    if (!editFormData.street.trim()) {
      newErrors.street = 'Street is required';
    }
    if (!editFormData.barangay) {
      newErrors.barangay = 'Barangay is required';
    }
    if (editDocuments.length === 0) {
      newErrors.documents = 'At least one document is required';
    }

    setEditErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const openDocumentTypeModal = (documentIndex?: number) => {
    setSelectedDocumentForType(documentIndex !== undefined ? documentIndex : null);
    setShowDocumentTypeModal(true);
  };

  const pickDocument = async (documentType: string) => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant permission to access your photos');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.8,
        allowsMultipleSelection: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const newDoc: OwnerApplicationDocument = {
          id: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: documentType,
          uri: asset.uri,
          uploadedAt: new Date().toISOString(),
        };

        // If editing existing document, replace it; otherwise add new
        if (selectedDocumentForType !== null && selectedDocumentForType >= 0) {
          const updatedDocs = [...editDocuments];
          updatedDocs[selectedDocumentForType] = newDoc;
          setEditDocuments(updatedDocs);
        } else {
          setEditDocuments([...editDocuments, newDoc]);
        }
      }
      setShowDocumentTypeModal(false);
      setSelectedDocumentForType(null);
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert('Error', 'Failed to pick document');
    }
  };

  const removeDocument = (index: number) => {
    setEditDocuments(editDocuments.filter((_, i) => i !== index));
  };

  const changeDocumentType = (index: number) => {
    openDocumentTypeModal(index);
  };

  const handleSaveEditApplication = async () => {
    if (!validateEditForm() || !editApplication || !user?.id) {
      return;
    }

    try {
      setEditSaving(true);

      // Update user record with new info
      if (editUserRecord) {
        const updatedUser = {
          ...editUserRecord,
          name: editFormData.name,
          email: editFormData.email,
          phone: editFormData.contactNumber,
        };
        await db.upsert('users', user.id, updatedUser);
      }

      // Update application
      const updatedApplication: OwnerApplicationRecord = {
        ...editApplication,
        name: editFormData.name,
        email: editFormData.email,
        contactNumber: editFormData.contactNumber,
        houseNumber: editFormData.houseNumber,
        street: editFormData.street,
        barangay: editFormData.barangay,
        documents: editDocuments,
        status: 'pending',
        reapplicationRequested: false,
        reviewedBy: undefined,
        reviewedAt: undefined,
        reason: undefined,
      };

      await db.upsert('owner_applications', editApplication.id, updatedApplication);
      
      // Clear approval cache to ensure fresh data on next login
      clearOwnerApprovalCache();

      // Close modals first
      setShowEditApplicationModal(false);
      setShowApplicationModal(false);
      setApplicationModalData(null);
      
      // Reset refs
      hasCheckedRef.current = false;
      modalShownForUserRef.current = null;
      isRedirectingRef.current = true;

      // Sign out and redirect to login to ensure clean state
      // This prevents the user from staying on the owner dashboard
      const performSignOutAndRedirect = async () => {
        try {
          if (signOut) {
            await signOut();
          }
        } catch (signOutError) {
          console.error('Error signing out:', signOutError);
        }
        // Redirect to login
        router.replace('/login');
      };

      // Show success message and then sign out + redirect
      if (Platform.OS === 'web') {
        window.alert('Success\n\nYour application has been updated and resubmitted for review. Please log in again.');
        // Small delay to ensure modal is closed before redirect
        setTimeout(async () => {
          await performSignOutAndRedirect();
        }, 100);
      } else {
        Alert.alert(
          'Success', 
          'Your application has been updated and resubmitted for review. Please log in again.',
          [
            {
              text: 'OK',
              onPress: async () => {
                await performSignOutAndRedirect();
              }
            }
          ]
        );
      }
    } catch (error) {
      console.error('Error saving application:', error);
      Alert.alert('Error', 'Failed to save application');
    } finally {
      setEditSaving(false);
    }
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={{ flex: 1 }}>
          <Stack
            screenOptions={{
              headerShown: false,
            }}
          >
            <Stack.Screen name="dashboard" />
            <Stack.Screen name="listings" />
            <Stack.Screen name="bookings" />
            <Stack.Screen name="tenants" />
            <Stack.Screen name="messages" />
            <Stack.Screen name="payment-settings" />
            <Stack.Screen name="ratings" />
            <Stack.Screen name="profile" />
            <Stack.Screen name="create-listing" />
            <Stack.Screen name="edit-listing/[id]" />
            <Stack.Screen name="chat-room/[id]" />
          </Stack>
          {!showEditApplicationModal && <OwnerBottomNav />}
        </View>

        {/* Application Status Modal */}
        <Modal
          visible={showApplicationModal}
          transparent={true}
          animationType="fade"
          onRequestClose={handleCloseModal}
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
            {applicationModalData?.title || 'Application Status'}
          </Text>

          {/* Message */}
          <Text style={{
            fontSize: 14,
            color: '#374151',
            marginBottom: 16,
            lineHeight: 20,
            textAlign: 'center'
          }}>
            {applicationModalData?.message}
          </Text>

          {/* Barangay Logo and Name - Always show if barangay is available */}
          {applicationModalData?.barangay && (
            <View style={{
              marginTop: 12,
              marginBottom: 20,
              padding: 12,
              backgroundColor: '#F9FAFB',
              borderRadius: 8
            }}>
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

                  const logo = applicationModalData.brgyContact?.logo;
                  const barangayName = applicationModalData.barangay || '';
                  const defaultLogo = getDefaultLogo(barangayName);
                  
                  if (logo || defaultLogo) {
                    return (
                      <Image
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
                  <Text style={{
                    fontSize: 16,
                    fontWeight: '700',
                    color: '#111827',
                    flex: 1
                  }}>
                    Barangay {applicationModalData.barangay}
                  </Text>
              </View>

              {/* Contact Information - Only show if available */}
              {applicationModalData?.brgyContact ? (
                <>
                  <Text style={{
                    fontSize: 12,
                    fontWeight: '600',
                    color: '#111827',
                    marginBottom: 12,
                    textAlign: 'center'
                  }}>
                    For inquiries, please contact:
                  </Text>

              <Text style={{
                fontSize: 13,
                color: '#111827',
                marginBottom: 6,
                textAlign: 'center'
              }}>
                {applicationModalData.brgyContact.name}
              </Text>
                  {applicationModalData.brgyContact.email && (
                    <TextInput
                      value={applicationModalData.brgyContact.email}
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
                  {applicationModalData.brgyContact.phone && (
                    <TextInput
                      value={applicationModalData.brgyContact.phone}
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
                </>
              ) : (
                <Text style={{
                  fontSize: 11,
                  color: '#6B7280',
                  textAlign: 'center',
                  fontStyle: 'italic'
                }}>
                  Contact information will be available once your barangay official account is set up.
                </Text>
              )}
                </View>
              )}

              {/* Action Buttons */}
              <View style={{
                flexDirection: 'row',
                gap: 8,
                justifyContent: 'center',
                flexWrap: 'wrap'
              }}>
                {applicationModalData?.reapplicationRequested && (
                  <TouchableOpacity
                    onPress={async () => {
                      // Close the "Update Required" modal first
                      setShowApplicationModal(false);
                      setApplicationModalData(null);
                      // Load and show the blocking edit application modal
                      await loadEditApplication();
                      setShowEditApplicationModal(true);
                    }}
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 10,
                      backgroundColor: '#F59E0B',
                      borderRadius: 6,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      flex: 1,
                      minWidth: '100%'
                    }}
                  >
                    <Edit size={18} color="#FFFFFF" />
                    <Text style={{
                      color: '#FFFFFF',
                      fontSize: 14,
                      fontWeight: '600',
                      textAlign: 'center'
                    }}>
                      Edit Application
                    </Text>
                  </TouchableOpacity>
                )}
                {applicationModalData?.brgyContact?.email && (
                  <TouchableOpacity
                    onPress={async () => {
                      try {
                        const emailUrl = `mailto:${applicationModalData.brgyContact!.email}?subject=Owner Application Inquiry&body=Hello, I would like to inquire about my owner application status.`;
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
                      flex: applicationModalData?.reapplicationRequested ? 1 : undefined
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
                {applicationModalData?.brgyContact?.phone && (
                  <TouchableOpacity
                    onPress={async () => {
                      try {
                        const cleanPhone = applicationModalData.brgyContact!.phone.replace(/[\s\-()]/g, '');
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
                          const cleanPhone = applicationModalData.brgyContact!.phone.replace(/[\s\-()]/g, '');
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
                      flex: applicationModalData?.reapplicationRequested ? 1 : undefined
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
                  onPress={handleCloseModal}
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

        {/* Edit Application Modal - Blocking modal when reapplication is requested */}
        <Modal
          visible={showEditApplicationModal}
          animationType="slide"
          presentationStyle="fullScreen"
          onRequestClose={() => {
            // Don't allow closing without saving - this is a blocking modal
            if (Platform.OS !== 'web') {
              Alert.alert(
                'Update Required',
                'You must update and resubmit your application before you can access other features.',
                [{ text: 'OK' }]
              );
            }
          }}
        >
          <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }} edges={['top', 'bottom']}>
            {editLoading ? (
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#10B981" />
                <Text style={{ marginTop: 16, fontSize: 16, color: '#6B7280' }}>Loading application...</Text>
              </View>
            ) : (
              <ScrollView 
                style={{ flex: 1 }} 
                contentContainerStyle={{ paddingBottom: 32, flexGrow: 1, padding: 16 }}
                showsVerticalScrollIndicator={true}
              >
                {/* Header */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 24, fontWeight: '700', color: '#111827', marginBottom: 4 }}>
                      Update Required
                    </Text>
                    <Text style={{ fontSize: 14, color: '#6B7280' }}>
                      Update your credentials and resubmit
                    </Text>
                  </View>
                </View>

                {/* Info Banner */}
                <View style={{
                  backgroundColor: '#FEF3C7',
                  borderColor: '#F59E0B',
                  borderWidth: 1,
                  borderRadius: 8,
                  padding: 16,
                  marginBottom: 24
                }}>
                  <Text style={{
                    fontSize: 14,
                    color: '#92400E',
                    lineHeight: 20
                  }}>
                    Your barangay has requested you to update your application. Please review and update your information, then resubmit for review.
                  </Text>
                </View>

                {/* Personal Information */}
                <View style={{ backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#E5E7EB' }}>
                  <Text style={{ fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 16 }}>Personal Information</Text>
                  <View style={{ gap: 16 }}>
                    <View>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 }}>Full Name *</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <User size={18} color="#6B7280" />
                        <TextInput
                          style={{
                            borderWidth: 1,
                            borderColor: editErrors.name ? '#EF4444' : '#D1D5DB',
                            borderRadius: 8,
                            padding: 12,
                            fontSize: 16,
                            color: '#111827',
                            flex: 1
                          }}
                          placeholder="Enter your full name"
                          value={editFormData.name}
                          onChangeText={(text) => {
                            setEditFormData({ ...editFormData, name: text });
                            if (editErrors.name) setEditErrors({ ...editErrors, name: '' });
                          }}
                        />
                      </View>
                      {editErrors.name && <Text style={{ color: '#EF4444', fontSize: 12, marginTop: 4 }}>{editErrors.name}</Text>}
                    </View>

                    <View>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 }}>Email *</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Mail size={18} color="#6B7280" />
                        <TextInput
                          style={{
                            borderWidth: 1,
                            borderColor: editErrors.email ? '#EF4444' : '#D1D5DB',
                            borderRadius: 8,
                            padding: 12,
                            fontSize: 16,
                            color: '#111827',
                            flex: 1
                          }}
                          placeholder="Enter your email"
                          value={editFormData.email}
                          onChangeText={(text) => {
                            setEditFormData({ ...editFormData, email: text });
                            if (editErrors.email) setEditErrors({ ...editErrors, email: '' });
                          }}
                          keyboardType="email-address"
                          autoCapitalize="none"
                        />
                      </View>
                      {editErrors.email && <Text style={{ color: '#EF4444', fontSize: 12, marginTop: 4 }}>{editErrors.email}</Text>}
                    </View>

                    <View>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 }}>Contact Number *</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Phone size={18} color="#6B7280" />
                        <TextInput
                          style={{
                            borderWidth: 1,
                            borderColor: editErrors.contactNumber ? '#EF4444' : '#D1D5DB',
                            borderRadius: 8,
                            padding: 12,
                            fontSize: 16,
                            color: '#111827',
                            flex: 1
                          }}
                          placeholder="Enter your contact number"
                          value={editFormData.contactNumber}
                          onChangeText={(text) => {
                            setEditFormData({ ...editFormData, contactNumber: text });
                            if (editErrors.contactNumber) setEditErrors({ ...editErrors, contactNumber: '' });
                          }}
                          keyboardType="phone-pad"
                        />
                      </View>
                      {editErrors.contactNumber && <Text style={{ color: '#EF4444', fontSize: 12, marginTop: 4 }}>{editErrors.contactNumber}</Text>}
                    </View>
                  </View>
                </View>

                {/* Address Information */}
                <View style={{ backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#E5E7EB' }}>
                  <Text style={{ fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 16 }}>Address Information</Text>
                  <View style={{ gap: 16 }}>
                    <View>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 }}>House Number *</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Home size={18} color="#6B7280" />
                        <TextInput
                          style={{
                            borderWidth: 1,
                            borderColor: editErrors.houseNumber ? '#EF4444' : '#D1D5DB',
                            borderRadius: 8,
                            padding: 12,
                            fontSize: 16,
                            color: '#111827',
                            flex: 1
                          }}
                          placeholder="Enter house number"
                          value={editFormData.houseNumber}
                          onChangeText={(text) => {
                            setEditFormData({ ...editFormData, houseNumber: text });
                            if (editErrors.houseNumber) setEditErrors({ ...editErrors, houseNumber: '' });
                          }}
                        />
                      </View>
                      {editErrors.houseNumber && <Text style={{ color: '#EF4444', fontSize: 12, marginTop: 4 }}>{editErrors.houseNumber}</Text>}
                    </View>

                    <View>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 }}>Street *</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <MapPin size={18} color="#6B7280" />
                        <TextInput
                          style={{
                            borderWidth: 1,
                            borderColor: editErrors.street ? '#EF4444' : '#D1D5DB',
                            borderRadius: 8,
                            padding: 12,
                            fontSize: 16,
                            color: '#111827',
                            flex: 1
                          }}
                          placeholder="Enter street name"
                          value={editFormData.street}
                          onChangeText={(text) => {
                            setEditFormData({ ...editFormData, street: text });
                            if (editErrors.street) setEditErrors({ ...editErrors, street: '' });
                          }}
                        />
                      </View>
                      {editErrors.street && <Text style={{ color: '#EF4444', fontSize: 12, marginTop: 4 }}>{editErrors.street}</Text>}
                    </View>

                    <View>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 }}>Barangay *</Text>
                      <TouchableOpacity
                        style={{
                          borderWidth: 1,
                          borderColor: editErrors.barangay ? '#EF4444' : '#D1D5DB',
                          borderRadius: 8,
                          padding: 12,
                          fontSize: 16,
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between'
                        }}
                        onPress={() => setShowBarangayDropdown(!showBarangayDropdown)}
                      >
                        <Text style={{ color: editFormData.barangay ? '#111827' : '#9CA3AF', fontSize: 16 }}>
                          {editFormData.barangay || 'Select barangay'}
                        </Text>
                        <Text style={{ fontSize: 16, color: '#6B7280' }}>▼</Text>
                      </TouchableOpacity>
                      {showBarangayDropdown && (
                        <View style={{
                          backgroundColor: '#FFFFFF',
                          borderWidth: 1,
                          borderColor: '#D1D5DB',
                          borderRadius: 8,
                          marginTop: 4,
                          maxHeight: 200
                        }}>
                          {barangays.map((brgy) => (
                            <TouchableOpacity
                              key={brgy}
                              style={{
                                padding: 12,
                                borderBottomWidth: 1,
                                borderBottomColor: '#F3F4F6'
                              }}
                              onPress={() => {
                                setEditFormData({ ...editFormData, barangay: brgy });
                                setShowBarangayDropdown(false);
                                if (editErrors.barangay) setEditErrors({ ...editErrors, barangay: '' });
                              }}
                            >
                              <Text style={{ 
                                color: editFormData.barangay === brgy ? '#10B981' : '#111827',
                                fontWeight: editFormData.barangay === brgy ? '600' : '400'
                              }}>
                                {brgy}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}
                      {editErrors.barangay && <Text style={{ color: '#EF4444', fontSize: 12, marginTop: 4 }}>{editErrors.barangay}</Text>}
                    </View>
                  </View>
                </View>

                {/* Documents */}
                <View style={{ backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#E5E7EB' }}>
                  <Text style={{ fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 8 }}>Required Documents *</Text>
                  <Text style={{ fontSize: 14, color: '#6B7280', marginBottom: 16 }}>
                    Upload documents required to run a business in your Barangay.
                  </Text>

                  {editDocuments.map((doc, index) => (
                    <View key={doc.id || index} style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 12,
                      padding: 12,
                      backgroundColor: '#F9FAFB',
                      borderRadius: 8,
                      marginBottom: 8,
                      borderWidth: 1,
                      borderColor: '#E5E7EB'
                    }}>
                      <FileText size={20} color="#3B82F6" />
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, fontWeight: '600', color: '#111827', marginBottom: 2 }} numberOfLines={1}>
                          {doc.name}
                        </Text>
                        {doc.uploadedAt && (
                          <Text style={{ fontSize: 11, color: '#6B7280' }}>
                            Uploaded: {new Date(doc.uploadedAt).toLocaleDateString()}
                          </Text>
                        )}
                      </View>
                      <TouchableOpacity
                        onPress={() => changeDocumentType(index)}
                        style={{ padding: 4, marginRight: 4 }}
                      >
                        <Edit size={16} color="#6B7280" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => removeDocument(index)}
                        style={{ padding: 4 }}
                      >
                        <X size={18} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  ))}

                  <TouchableOpacity
                    style={{
                      backgroundColor: '#3B82F6',
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      padding: 12,
                      borderRadius: 8,
                      marginTop: 8
                    }}
                    onPress={() => openDocumentTypeModal()}
                  >
                    <Upload size={18} color="white" />
                    <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '600' }}>Upload Document</Text>
                  </TouchableOpacity>
                  {editErrors.documents && <Text style={{ color: '#EF4444', fontSize: 12, marginTop: 8 }}>{editErrors.documents}</Text>}
                </View>

                {/* Save Button */}
                <TouchableOpacity
                  style={{
                    backgroundColor: '#10B981',
                    marginTop: 16,
                    marginBottom: 32,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    padding: 16,
                    borderRadius: 8,
                    opacity: editSaving ? 0.5 : 1
                  }}
                  onPress={handleSaveEditApplication}
                  disabled={editSaving}
                >
                  {editSaving ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Save size={18} color="white" />
                  )}
                  <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '600' }}>
                    {editSaving ? 'Saving...' : 'Save & Resubmit Application'}
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            )}

            {/* Document Type Selection Modal */}
            <Modal
              visible={showDocumentTypeModal}
              transparent={true}
              animationType="slide"
              onRequestClose={() => {
                setShowDocumentTypeModal(false);
                setSelectedDocumentForType(null);
              }}
            >
              <View style={{
                flex: 1,
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                justifyContent: 'flex-end'
              }}>
                <View style={{
                  backgroundColor: '#FFFFFF',
                  borderTopLeftRadius: 20,
                  borderTopRightRadius: 20,
                  padding: 24,
                  maxHeight: '80%'
                }}>
                  <View style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 20
                  }}>
                    <Text style={{
                      fontSize: 20,
                      fontWeight: '700',
                      color: '#111827'
                    }}>
                      {selectedDocumentForType !== null ? 'Change Document Type' : 'Select Document Type'}
                    </Text>
                    <Pressable
                      onPress={() => {
                        setShowDocumentTypeModal(false);
                        setSelectedDocumentForType(null);
                      }}
                      style={{ padding: 4 }}
                    >
                      <X size={24} color="#6B7280" />
                    </Pressable>
                  </View>
                  <ScrollView style={{ maxHeight: 400 }}>
                    {documentTypes.map((docType) => {
                      const uploadedCount = editDocuments.filter(doc => doc.name === docType).length;
                      const isEditing = selectedDocumentForType !== null;
                      return (
                        <Pressable
                          key={docType}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: 16,
                            backgroundColor: '#F9FAFB',
                            borderRadius: 8,
                            marginBottom: 8,
                            borderWidth: 1,
                            borderColor: '#E5E7EB'
                          }}
                          onPress={() => pickDocument(docType)}
                        >
                          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                            <Text style={{
                              fontSize: 16,
                              fontWeight: '600',
                              color: '#111827',
                              marginRight: 8
                            }}>
                              {docType}
                            </Text>
                            {uploadedCount > 0 && !isEditing && (
                              <View style={{
                                backgroundColor: '#3B82F6',
                                borderRadius: 12,
                                paddingHorizontal: 8,
                                paddingVertical: 2
                              }}>
                                <Text style={{
                                  fontSize: 12,
                                  fontWeight: '600',
                                  color: '#FFFFFF'
                                }}>
                                  {uploadedCount} {uploadedCount === 1 ? 'file' : 'files'}
                                </Text>
                              </View>
                            )}
                          </View>
                          <ChevronRight size={20} color="#6B7280" />
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </View>
              </View>
            </Modal>
          </SafeAreaView>
        </Modal>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
