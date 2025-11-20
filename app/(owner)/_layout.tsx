import { Stack } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'expo-router';
import { View, Text, ActivityIndicator, Linking, Alert, Platform, Modal, TouchableOpacity, ScrollView, TextInput, Image } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import OwnerBottomNav from '../../components/OwnerBottomNav';
import { isOwnerApproved, hasPendingOwnerApplication, getOwnerApplication, getBarangayOfficialContact } from '../../utils/owner-approval';
import { showAlert } from '../../utils/alert';
import { X } from 'lucide-react-native';

export default function OwnerLayout() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [isCheckingApproval, setIsCheckingApproval] = useState(false);
  const hasCheckedRef = useRef(false);
  const isRedirectingRef = useRef(false);
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [applicationModalData, setApplicationModalData] = useState<{
    title: string;
    message: string;
    brgyContact: { name: string; email: string; phone: string; logo?: string | null } | null;
    barangay?: string;
  } | null>(null);

  // Reset refs when user changes
  useEffect(() => {
    hasCheckedRef.current = false;
    isRedirectingRef.current = false;
  }, [user?.id]);

  useEffect(() => {
    const checkOwnerAccess = async () => {
      // Prevent multiple simultaneous checks
      if (hasCheckedRef.current || isRedirectingRef.current) {
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

        // Check if owner application is approved - parallelize checks for faster loading
        hasCheckedRef.current = true;
        setIsCheckingApproval(true);
        try {
          // Parallelize approval checks and application fetch
          const [isApproved, hasPending, application] = await Promise.all([
            isOwnerApproved(user.id),
            hasPendingOwnerApplication(user.id),
            getOwnerApplication(user.id)
          ]);
          
          if (!isApproved) {
            console.log('🚫 Owner layout: Owner application not approved', { isApproved, hasPending });
            
            const barangay = application?.barangay || '';
            
            // Get Barangay official contact info in parallel with modal setup
            const brgyContactPromise = barangay ? getBarangayOfficialContact(barangay) : Promise.resolve(null);
            
            if (hasPending) {
              // Build message with contact info
              let message = 'Your Owner Application is still under review.\n\nYou will be notified once it is approved.';
              
              // Wait for contact info before showing modal
              const brgyContact = await brgyContactPromise;
              
              isRedirectingRef.current = true;
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
              
              isRedirectingRef.current = true;
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
          isRedirectingRef.current = true;
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
          setIsCheckingApproval(false);
          return;
        } finally {
          setIsCheckingApproval(false);
        }
      }
    };

    checkOwnerAccess();
  }, [user?.id, isLoading]);

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
    router.replace('/login');
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
          <OwnerBottomNav />
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

          {/* Contact Information */}
          {applicationModalData?.brgyContact && (
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

                  const logo = applicationModalData.brgyContact.logo;
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
                {applicationModalData.barangay && (
                  <Text style={{
                    fontSize: 16,
                    fontWeight: '700',
                    color: '#111827',
                    flex: 1
                  }}>
                    Barangay {applicationModalData.barangay}
                  </Text>
                )}
              </View>

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
                </View>
              )}

              {/* Action Buttons */}
              <View style={{
                flexDirection: 'row',
                gap: 8,
                justifyContent: 'center'
              }}>
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
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
