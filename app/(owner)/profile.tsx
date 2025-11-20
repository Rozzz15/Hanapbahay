import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Image, Alert, Platform, Modal, TextInput, KeyboardAvoidingView, Keyboard, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { 
  User, 
  LogOut, 
  Shield,
  HelpCircle,
  ChevronRight,
  Mail,
  Phone,
  Camera,
  Edit2,
  X
} from 'lucide-react-native';
import { sharedStyles, designTokens, iconBackgrounds } from '../../styles/owner-dashboard-styles';
import { showAlert } from '../../utils/alert';
import { saveUserProfilePhoto, loadUserProfilePhoto } from '../../utils/user-profile-photos';
import { db } from '../../utils/db';
import { changePassword } from '../../api/auth/change-password';

export default function OwnerProfile() {
  const { user, signOut, refreshUser } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [loggingOut, setLoggingOut] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [loadingPhoto, setLoadingPhoto] = useState(true);
  const [savingPhoto, setSavingPhoto] = useState(false);
  const [showNameModal, setShowNameModal] = useState(false);
  const [ownerName, setOwnerName] = useState(user?.name || '');
  const [savingName, setSavingName] = useState(false);
  const [showPhotoViewer, setShowPhotoViewer] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  
  // Calculate bottom padding: bottom nav height (~70px) + safe area bottom
  const bottomPadding = 70 + Math.max(insets.bottom, 8);
  const screenDimensions = Dimensions.get('window');

  const handleLogout = () => {
    console.log('🔘 Logout button clicked');
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
              setLoggingOut(true);
              console.log('🚪 User confirmed logout, starting signOut...');
              await signOut();
              console.log('✅ SignOut completed successfully');
              router.replace('/login');
            } catch (error) {
              console.error('❌ Logout error:', error);
              showAlert('Logout Error', 'Failed to logout. Please try again.');
            } finally {
              setLoggingOut(false);
            }
          }
        }
      ]
    );
  };

  // Load profile photo on mount
  useEffect(() => {
    if (user?.id) {
      loadOwnerProfilePhoto();
    }
  }, [user?.id]);

  // Update owner name when user changes
  useEffect(() => {
    if (user?.name) {
      setOwnerName(user.name);
    }
  }, [user?.name]);

  const loadOwnerProfilePhoto = async () => {
    if (!user?.id) return;
    
    try {
      setLoadingPhoto(true);
      const photoUri = await loadUserProfilePhoto(user.id);
      if (photoUri) {
        setProfilePhoto(photoUri);
        console.log('✅ Loaded owner profile photo');
      } else {
        setProfilePhoto(null);
        console.log('📸 No profile photo found for owner');
      }
    } catch (error) {
      console.error('❌ Error loading owner profile photo:', error);
      setProfilePhoto(null);
    } finally {
      setLoadingPhoto(false);
    }
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
                setSavingPhoto(true);
                // Remove photo from database
                const { deleteUserProfilePhoto } = await import('../../utils/user-profile-photos');
                await deleteUserProfilePhoto(user?.id || '');
                // Reload to ensure it's removed
                await loadOwnerProfilePhoto();
                showAlert('Success', 'Profile photo removed successfully');
              } catch (error) {
                console.error('❌ Error removing photo:', error);
                showAlert('Error', 'Failed to remove photo');
              } finally {
                setSavingPhoto(false);
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
              imageUri, // Store as both URI and data
              fileName,
              photoSize,
              mimeType
            );
            
            // Reload photo from database to ensure it's properly displayed
            await loadOwnerProfilePhoto();
            showAlert('Success', 'Profile photo updated successfully');
            console.log('✅ Owner profile photo saved to database');
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

  const handleChangePassword = async () => {
    if (!user?.id) return;
    
    // Validate inputs
    if (!currentPassword || !newPassword || !confirmPassword) {
      showAlert('Validation Error', 'All password fields are required');
      return;
    }
    
    if (newPassword.length < 6) {
      showAlert('Validation Error', 'New password must be at least 6 characters');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      showAlert('Validation Error', 'New passwords do not match');
      return;
    }
    
    try {
      setChangingPassword(true);
      
      const result = await changePassword(user.id, {
        currentPassword,
        newPassword,
        confirmPassword
      });
      
      if (result.success) {
        showAlert('Success', 'Password changed successfully!');
        // Clear password fields
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setShowChangePassword(false);
      } else {
        showAlert('Error', result.error || 'Failed to change password');
      }
    } catch (error) {
      console.error('Error changing password:', error);
      showAlert('Error', 'Failed to change password. Please try again.');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleSaveName = async () => {
    if (!user?.id) return;
    
    const trimmedName = ownerName.trim();
    if (!trimmedName) {
      showAlert('Validation Error', 'Name cannot be empty');
      return;
    }

    try {
      setSavingName(true);
      
      // Get user record from database
      const userRecord = await db.get('users', user.id);
      
      if (!userRecord) {
        showAlert('Error', 'User not found');
        return;
      }

      // Update user record
      const updatedUser = {
        ...userRecord,
        name: trimmedName,
        updatedAt: new Date().toISOString()
      };
      
      await db.upsert('users', user.id, updatedUser);
      console.log('✅ Updated owner name in database:', trimmedName);
      
      // Update mock auth storage
      try {
        const { updateMockUser } = await import('../../utils/mock-auth');
        await updateMockUser(user.id, {
          name: trimmedName,
          updatedAt: updatedUser.updatedAt
        });
      } catch (mockError) {
        console.warn('⚠️ Could not update mock user:', mockError);
      }
      
      // Update auth session storage
      try {
        const { storeAuthUser, clearAuthUser } = await import('../../utils/auth-user');
        await clearAuthUser();
        await storeAuthUser({
          id: user.id,
          roles: user.roles || [],
          permissions: (userRecord as any).permissions || [],
          name: trimmedName,
          email: user.email
        });
      } catch (authError) {
        console.warn('⚠️ Could not update auth user:', authError);
      }
      
      // Wait a bit for storage to update
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Refresh user context to reflect changes
      await refreshUser();
      
      // Wait a bit more for context to update
      await new Promise(resolve => setTimeout(resolve, 100));
      
      setShowNameModal(false);
      showAlert('Success', 'Name updated successfully!');
    } catch (error) {
      console.error('❌ Error saving name:', error);
      showAlert('Error', 'Failed to save name. Please try again.');
    } finally {
      setSavingName(false);
    }
  };

  const profileMenuItems = [
    {
      id: 'edit-name',
      icon: Edit2,
      label: 'Edit Name',
      description: 'Change your display name',
      color: designTokens.colors.info,
      onPress: () => {
        setOwnerName(user?.name || '');
        setShowNameModal(true);
      }
    },
    {
      id: 'security',
      icon: Shield,
      label: 'Security & Privacy',
      description: 'Change password and security settings',
      color: designTokens.colors.success,
      onPress: () => {
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setShowChangePassword(true);
      }
    },
    {
      id: 'help',
      icon: HelpCircle,
      label: 'Help & Support',
      description: 'Get help and contact support',
      color: designTokens.colors.info,
      onPress: () => showAlert('Help', 'Help & support coming soon!')
    }
  ];

  return (
    <View style={[sharedStyles.container, { flex: 1 }]}>
      <ScrollView 
        style={[sharedStyles.scrollView, { flex: 1 }]}
        contentContainerStyle={{ 
          paddingBottom: bottomPadding,
          flexGrow: 1,
          minHeight: '100%'
        }}
        showsVerticalScrollIndicator={true}
        keyboardShouldPersistTaps="handled"
        bounces={true}
        alwaysBounceVertical={false}
        nestedScrollEnabled={true}
      >
        <View style={sharedStyles.pageContainer}>
          {/* Header */}
          <View style={sharedStyles.pageHeader}>
            <View style={sharedStyles.headerLeft}>
              <Text style={sharedStyles.pageTitle}>Profile</Text>
              <Text style={sharedStyles.pageSubtitle}>Manage your account</Text>
            </View>
          </View>

          {/* User Info Card */}
          <View style={[sharedStyles.card, { marginBottom: designTokens.spacing.lg }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity
                onPress={() => {
                  if (profilePhoto) {
                    setShowPhotoViewer(true);
                  } else {
                    handlePhotoAction('gallery');
                  }
                }}
                disabled={savingPhoto || loadingPhoto}
                activeOpacity={0.7}
                style={{ position: 'relative' }}
              >
                {loadingPhoto ? (
                  <View style={[sharedStyles.statIcon, iconBackgrounds.blue, { width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center' }]}>
                    <ActivityIndicator size="small" color="#3B82F6" />
                  </View>
                ) : profilePhoto ? (
                  <View style={{ width: 60, height: 60, borderRadius: 30, overflow: 'hidden', borderWidth: 2, borderColor: designTokens.colors.info }}>
                    <Image 
                      source={{ uri: profilePhoto }} 
                      style={{ width: 60, height: 60 }}
                      resizeMode="cover"
                    />
                    <View style={{ 
                      position: 'absolute', 
                      bottom: 0, 
                      right: 0, 
                      backgroundColor: 'rgba(0,0,0,0.6)', 
                      borderRadius: 12,
                      padding: 4
                    }}>
                      <Camera size={12} color="white" />
                    </View>
                  </View>
                ) : (
                  <View style={[sharedStyles.statIcon, iconBackgrounds.blue, { width: 60, height: 60, borderRadius: 30, position: 'relative' }]}>
                    <User size={32} color="#3B82F6" />
                    <View style={{ 
                      position: 'absolute', 
                      bottom: 0, 
                      right: 0, 
                      backgroundColor: designTokens.colors.info, 
                      borderRadius: 12,
                      padding: 4,
                      borderWidth: 2,
                      borderColor: 'white'
                    }}>
                      <Camera size={12} color="white" />
                    </View>
                  </View>
                )}
              </TouchableOpacity>
              <View style={{ marginLeft: designTokens.spacing.lg, flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <Text style={[sharedStyles.statLabel, { fontSize: designTokens.typography.xl, flex: 1 }]}>
                    {user?.name || 'Property Owner'}
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      setOwnerName(user?.name || '');
                      setShowNameModal(true);
                    }}
                    style={{ 
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 4,
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      backgroundColor: designTokens.colors.info + '15',
                      borderRadius: 6,
                      borderWidth: 1,
                      borderColor: designTokens.colors.info + '40'
                    }}
                    activeOpacity={0.7}
                  >
                    <Edit2 size={18} color={designTokens.colors.info} />
                    <Text style={{ fontSize: 12, fontWeight: '600', color: designTokens.colors.info }}>
                      Edit
                    </Text>
                  </TouchableOpacity>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                  <Mail size={14} color={designTokens.colors.textMuted} />
                  <Text style={[sharedStyles.statSubtitle, { marginLeft: 4 }]}>
                    {user?.email || 'owner@hanapbahay.com'}
                  </Text>
                </View>
                <View style={[
                  sharedStyles.statusBadge,
                  { backgroundColor: designTokens.colors.successLight, alignSelf: 'flex-start' }
                ]}>
                  <Text style={[sharedStyles.statusText, { color: designTokens.colors.success }]}>
                    Owner Account
                  </Text>
                </View>
                {profilePhoto && (
                  <TouchableOpacity
                    onPress={() => handlePhotoAction('remove')}
                    disabled={savingPhoto}
                    style={{ marginTop: 8, alignSelf: 'flex-start' }}
                  >
                    <Text style={[sharedStyles.statSubtitle, { color: designTokens.colors.error, fontSize: 12 }]}>
                      Remove Photo
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>

          {/* Menu Items */}
          <View style={sharedStyles.section}>
            <Text style={[sharedStyles.sectionTitle, { marginBottom: designTokens.spacing.md }]}>
              Account Settings
            </Text>
            
            <View style={sharedStyles.list}>
              {profileMenuItems.map((item) => {
                const Icon = item.icon;
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={sharedStyles.card}
                    onPress={item.onPress}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <View style={[sharedStyles.statIcon, { backgroundColor: `${item.color}20` }]}>
                        <Icon size={20} color={item.color} />
                      </View>
                      <View style={{ flex: 1, marginLeft: designTokens.spacing.md }}>
                        <Text style={[sharedStyles.statLabel, { marginBottom: 2 }]}>
                          {item.label}
                        </Text>
                        <Text style={sharedStyles.statSubtitle}>
                          {item.description}
                        </Text>
                      </View>
                      <ChevronRight size={20} color={designTokens.colors.textMuted} />
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Logout Button */}
          <View style={sharedStyles.section}>
            <TouchableOpacity
              style={[
                sharedStyles.primaryButton,
                { 
                  backgroundColor: designTokens.colors.error,
                  paddingVertical: designTokens.spacing.md,
                  opacity: loggingOut ? 0.7 : 1
                }
              ]}
              onPress={() => {
                console.log('👆 Logout button press detected');
                handleLogout();
              }}
              disabled={loggingOut}
              activeOpacity={0.7}
            >
              {loggingOut ? (
                <>
                  <ActivityIndicator size="small" color="white" style={{ marginRight: 8 }} />
                  <Text style={sharedStyles.primaryButtonText}>Logging out...</Text>
                </>
              ) : (
                <>
                  <LogOut size={16} color="white" />
                  <Text style={sharedStyles.primaryButtonText}>Logout</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* App Version */}
          <View style={{ alignItems: 'center', marginTop: designTokens.spacing.xl }}>
            <Text style={[sharedStyles.statSubtitle, { marginBottom: designTokens.spacing.xs }]}>
              HanapBahay Property Management
            </Text>
            <Text style={sharedStyles.statSubtitle}>
              Version 1.0.0
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Profile Photo Full-Screen Viewer Modal */}
      <Modal
        visible={showPhotoViewer}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowPhotoViewer(false)}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.95)',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <TouchableOpacity
            style={{
              position: 'absolute',
              top: insets.top + 16,
              right: 16,
              zIndex: 10,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              borderRadius: 20,
              padding: 8
            }}
            onPress={() => setShowPhotoViewer(false)}
          >
            <X size={24} color="white" />
          </TouchableOpacity>
          
          {profilePhoto ? (
            <TouchableOpacity
              style={{ 
                flex: 1, 
                width: '100%',
                justifyContent: 'center', 
                alignItems: 'center', 
                paddingHorizontal: 20,
                paddingTop: insets.top + 50,
                paddingBottom: 150
              }}
              activeOpacity={1}
              onPress={() => setShowPhotoViewer(false)}
            >
              <Image
                source={{ uri: profilePhoto }}
                style={{
                  width: screenDimensions.width - 40,
                  height: screenDimensions.width - 40,
                  resizeMode: 'contain',
                  borderRadius: 8
                }}
              />
            </TouchableOpacity>
          ) : (
            <View style={{ alignItems: 'center', justifyContent: 'center' }}>
              <User size={80} color="white" />
              <Text style={{ color: 'white', marginTop: 16, fontSize: 16 }}>
                No profile photo
              </Text>
            </View>
          )}
          
          {/* Action Buttons */}
          <View style={{
            position: 'absolute',
            bottom: Math.max(insets.bottom, 20) + 70,
            left: 0,
            right: 0,
            flexDirection: 'row',
            justifyContent: 'center',
            gap: 16,
            paddingHorizontal: 20
          }}>
            <TouchableOpacity
              onPress={() => {
                setShowPhotoViewer(false);
                setTimeout(() => handlePhotoAction('gallery'), 300);
              }}
              style={{
                backgroundColor: designTokens.colors.info,
                paddingVertical: 12,
                paddingHorizontal: 24,
                borderRadius: 8,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8
              }}
            >
              <Camera size={18} color="white" />
              <Text style={{ color: 'white', fontSize: 16, fontWeight: '600' }}>
                Change Photo
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={() => {
                setShowPhotoViewer(false);
                setTimeout(() => handlePhotoAction('remove'), 300);
              }}
              style={{
                backgroundColor: designTokens.colors.error,
                paddingVertical: 12,
                paddingHorizontal: 24,
                borderRadius: 8,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8
              }}
            >
              <X size={18} color="white" />
              <Text style={{ color: 'white', fontSize: 16, fontWeight: '600' }}>
                Remove
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Name Edit Modal */}
      <Modal
        visible={showNameModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowNameModal(false)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <TouchableOpacity
            style={{ flex: 1, width: '100%', justifyContent: 'center', alignItems: 'center' }}
            activeOpacity={1}
            onPress={() => {
              Keyboard.dismiss();
              setShowNameModal(false);
            }}
          >
            <TouchableOpacity
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
              style={{
                backgroundColor: 'white',
                borderRadius: 16,
                padding: 24,
                width: '85%',
                maxWidth: 400,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.25,
                shadowRadius: 8,
                elevation: 5
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#111827' }}>
                  Edit Name
                </Text>
                <TouchableOpacity
                  onPress={() => setShowNameModal(false)}
                  style={{ padding: 4 }}
                >
                  <X size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>

              <View style={{ marginBottom: 20 }}>
                <Text style={{ fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 8 }}>
                  Owner Name
                </Text>
                <TextInput
                  style={{
                    borderWidth: 1,
                    borderColor: '#D1D5DB',
                    borderRadius: 8,
                    paddingHorizontal: 12,
                    paddingVertical: 12,
                    fontSize: 16,
                    color: '#111827',
                    backgroundColor: '#FFFFFF'
                  }}
                  value={ownerName}
                  onChangeText={setOwnerName}
                  placeholder="Enter your name"
                  autoFocus={true}
                  editable={!savingName}
                />
              </View>

              <View style={{ flexDirection: 'row', gap: 12 }}>
                <TouchableOpacity
                  onPress={() => setShowNameModal(false)}
                  disabled={savingName}
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    paddingHorizontal: 16,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: '#D1D5DB',
                    backgroundColor: '#FFFFFF',
                    alignItems: 'center',
                    opacity: savingName ? 0.5 : 1
                  }}
                >
                  <Text style={{ fontSize: 16, fontWeight: '600', color: '#374151' }}>
                    Cancel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSaveName}
                  disabled={savingName}
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    paddingHorizontal: 16,
                    borderRadius: 8,
                    backgroundColor: designTokens.colors.info,
                    alignItems: 'center',
                    opacity: savingName ? 0.7 : 1
                  }}
                >
                  {savingName ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Text style={{ fontSize: 16, fontWeight: '600', color: '#FFFFFF' }}>
                      Save
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      {/* Change Password Modal */}
      <Modal
        visible={showChangePassword}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setShowChangePassword(false);
          setCurrentPassword('');
          setNewPassword('');
          setConfirmPassword('');
        }}
      >
        <KeyboardAvoidingView
          style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <TouchableOpacity
            style={{ flex: 1, width: '100%', justifyContent: 'center', alignItems: 'center' }}
            activeOpacity={1}
            onPress={() => {
              Keyboard.dismiss();
              setShowChangePassword(false);
              setCurrentPassword('');
              setNewPassword('');
              setConfirmPassword('');
            }}
          >
            <TouchableOpacity
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
              style={{
                backgroundColor: 'white',
                borderRadius: 16,
                padding: 24,
                width: '85%',
                maxWidth: 400,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.25,
                shadowRadius: 8,
                elevation: 5
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#111827' }}>
                  Change Password
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setShowChangePassword(false);
                    setCurrentPassword('');
                    setNewPassword('');
                    setConfirmPassword('');
                  }}
                  style={{ padding: 4 }}
                >
                  <X size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>

              <ScrollView
                style={{ maxHeight: 400 }}
                showsVerticalScrollIndicator={true}
                keyboardShouldPersistTaps="handled"
              >
                <View style={{ gap: 16 }}>
                  {/* Current Password */}
                  <View>
                    <Text style={{ fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 8 }}>
                      Current Password
                    </Text>
                    <View style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      borderWidth: 1,
                      borderColor: '#D1D5DB',
                      borderRadius: 8,
                      paddingHorizontal: 12,
                      backgroundColor: '#FFFFFF'
                    }}>
                      <TextInput
                        style={{
                          flex: 1,
                          paddingVertical: 12,
                          fontSize: 16,
                          color: '#111827'
                        }}
                        value={currentPassword}
                        onChangeText={setCurrentPassword}
                        placeholder="Enter current password"
                        secureTextEntry={!showCurrentPassword}
                        autoCapitalize="none"
                        editable={!changingPassword}
                      />
                      <TouchableOpacity
                        onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                        style={{ padding: 4 }}
                      >
                        <Ionicons
                          name={showCurrentPassword ? "eye-off" : "eye"}
                          size={20}
                          color="#6B7280"
                        />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* New Password */}
                  <View>
                    <Text style={{ fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 8 }}>
                      New Password
                    </Text>
                    <View style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      borderWidth: 1,
                      borderColor: '#D1D5DB',
                      borderRadius: 8,
                      paddingHorizontal: 12,
                      backgroundColor: '#FFFFFF'
                    }}>
                      <TextInput
                        style={{
                          flex: 1,
                          paddingVertical: 12,
                          fontSize: 16,
                          color: '#111827'
                        }}
                        value={newPassword}
                        onChangeText={setNewPassword}
                        placeholder="Enter new password"
                        secureTextEntry={!showNewPassword}
                        autoCapitalize="none"
                        editable={!changingPassword}
                      />
                      <TouchableOpacity
                        onPress={() => setShowNewPassword(!showNewPassword)}
                        style={{ padding: 4 }}
                      >
                        <Ionicons
                          name={showNewPassword ? "eye-off" : "eye"}
                          size={20}
                          color="#6B7280"
                        />
                      </TouchableOpacity>
                    </View>
                    <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>
                      Must be at least 6 characters
                    </Text>
                  </View>

                  {/* Confirm Password */}
                  <View>
                    <Text style={{ fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 8 }}>
                      Confirm New Password
                    </Text>
                    <View style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      borderWidth: 1,
                      borderColor: '#D1D5DB',
                      borderRadius: 8,
                      paddingHorizontal: 12,
                      backgroundColor: '#FFFFFF'
                    }}>
                      <TextInput
                        style={{
                          flex: 1,
                          paddingVertical: 12,
                          fontSize: 16,
                          color: '#111827'
                        }}
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        placeholder="Confirm new password"
                        secureTextEntry={!showConfirmPassword}
                        autoCapitalize="none"
                        editable={!changingPassword}
                      />
                      <TouchableOpacity
                        onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                        style={{ padding: 4 }}
                      >
                        <Ionicons
                          name={showConfirmPassword ? "eye-off" : "eye"}
                          size={20}
                          color="#6B7280"
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </ScrollView>

              <View style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}>
                <TouchableOpacity
                  onPress={() => {
                    setShowChangePassword(false);
                    setCurrentPassword('');
                    setNewPassword('');
                    setConfirmPassword('');
                  }}
                  disabled={changingPassword}
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    paddingHorizontal: 16,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: '#D1D5DB',
                    backgroundColor: '#FFFFFF',
                    alignItems: 'center',
                    opacity: changingPassword ? 0.5 : 1
                  }}
                >
                  <Text style={{ fontSize: 16, fontWeight: '600', color: '#374151' }}>
                    Cancel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleChangePassword}
                  disabled={changingPassword}
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    paddingHorizontal: 16,
                    borderRadius: 8,
                    backgroundColor: designTokens.colors.success,
                    alignItems: 'center',
                    opacity: changingPassword ? 0.7 : 1
                  }}
                >
                  {changingPassword ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Text style={{ fontSize: 16, fontWeight: '600', color: '#FFFFFF' }}>
                      Change Password
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

