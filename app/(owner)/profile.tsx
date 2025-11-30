import React, { useState, useEffect, useRef } from 'react';
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
  X,
  Send,
  Bot,
  Sparkles
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
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [ownerName, setOwnerName] = useState(user?.name || '');
  const [oldEmail, setOldEmail] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [showPhotoViewer, setShowPhotoViewer] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showHelpSupport, setShowHelpSupport] = useState(false);
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

  const handleSaveProfile = async () => {
    if (!user?.id) return;
    
    // Validate name
    const trimmedName = ownerName.trim();
    if (!trimmedName) {
      showAlert('Validation Error', 'Name cannot be empty');
      return;
    }

    // Validate email fields if user is changing email
    const trimmedOldEmail = oldEmail.trim().toLowerCase();
    const trimmedNewEmail = newEmail.trim().toLowerCase();
    const trimmedConfirmEmail = confirmEmail.trim().toLowerCase();
    
    const isChangingEmail = trimmedOldEmail || trimmedNewEmail || trimmedConfirmEmail;
    
    if (isChangingEmail) {
      // Validate old email matches current email
      if (!trimmedOldEmail) {
        setEmailError('Please enter your current email');
        return;
      }
      
      if (trimmedOldEmail !== user.email?.toLowerCase()) {
        setEmailError('Current email does not match');
        return;
      }
      
      // Validate new email
      if (!trimmedNewEmail) {
        setEmailError('Please enter your new email');
        return;
      }
      
      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmedNewEmail)) {
        setEmailError('Please enter a valid email address');
        return;
      }
      
      // Check if new email is same as old
      if (trimmedNewEmail === trimmedOldEmail) {
        setEmailError('New email must be different from current email');
        return;
      }
      
      // Validate confirm email
      if (!trimmedConfirmEmail) {
        setEmailError('Please confirm your new email');
        return;
      }
      
      if (trimmedNewEmail !== trimmedConfirmEmail) {
        setEmailError('New email and confirm email do not match');
        return;
      }
      
      // Check if email is already taken by another user
      try {
        const allUsers = await db.list('users');
        const emailTaken = allUsers.some(u => u.id !== user.id && u.email.toLowerCase() === trimmedNewEmail);
        if (emailTaken) {
          setEmailError('This email is already registered to another account');
          return;
        }
      } catch (checkError) {
        console.warn('⚠️ Could not check email availability:', checkError);
      }
    }
    
    setEmailError('');

    try {
      setSavingProfile(true);
      
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
        ...(isChangingEmail && { email: trimmedNewEmail }),
        updatedAt: new Date().toISOString()
      };
      
      await db.upsert('users', user.id, updatedUser);
      console.log('✅ Updated owner profile in database:', { name: trimmedName, email: isChangingEmail ? trimmedNewEmail : userRecord.email });
      
      // Update mock auth storage - handle email change properly
      try {
        const { updateMockUser } = await import('../../utils/mock-auth');
        
        if (isChangingEmail) {
          // Update with email change - updateMockUser will handle removing old email and adding new email
          const updateResult = await updateMockUser(user.id, {
            name: trimmedName,
            email: trimmedNewEmail,
            updatedAt: updatedUser.updatedAt
          });
          
          if (updateResult) {
            console.log('✅ Successfully updated mockUsers: old email removed, new email added');
          } else {
            console.warn('⚠️ updateMockUser returned false - user may not be in mockUsers');
          }
        } else {
          // Just update name
          await updateMockUser(user.id, {
            name: trimmedName,
            updatedAt: updatedUser.updatedAt
          });
        }
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
          email: isChangingEmail ? trimmedNewEmail : user.email
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
      
      // Clear form
      setOldEmail('');
      setNewEmail('');
      setConfirmEmail('');
      setEmailError('');
      setShowEditProfileModal(false);
      
      if (isChangingEmail) {
        // Force sign out to ensure user logs in with new email
        // Close modal first, then show alert and sign out
        setTimeout(async () => {
          showAlert(
            'Success', 
            'Profile updated successfully! You will be logged out to apply the email change. Please log in again with your new email address.',
            [
              {
                text: 'OK',
                onPress: async () => {
                  // Sign out to force re-login with new email
                  try {
                    if (signOut) {
                      await signOut();
                    }
                    router.replace('/login');
                  } catch (signOutError) {
                    console.error('Error signing out:', signOutError);
                    router.replace('/login');
                  }
                }
              }
            ]
          );
        }, 100);
      } else {
        showAlert('Success', 'Profile updated successfully!');
      }
    } catch (error) {
      console.error('❌ Error saving profile:', error);
      showAlert('Error', 'Failed to save profile. Please try again.');
    } finally {
      setSavingProfile(false);
    }
  };

  const profileMenuItems = [
    {
      id: 'edit-profile',
      icon: Edit2,
      label: 'Edit Profile',
      description: 'Update your name and email',
      color: designTokens.colors.info,
      onPress: () => {
        setOwnerName(user?.name || '');
        setOldEmail(user?.email || '');
        setNewEmail('');
        setConfirmEmail('');
        setEmailError('');
        setShowEditProfileModal(true);
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
      description: 'Chat with Yna, your AI assistant',
      color: designTokens.colors.info,
      onPress: () => setShowHelpSupport(true)
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
                      setOldEmail(user?.email || '');
                      setNewEmail('');
                      setConfirmEmail('');
                      setEmailError('');
                      setShowEditProfileModal(true);
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
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4, gap: 8 }}>
                  <Mail size={14} color={designTokens.colors.textMuted} />
                  <Text style={[sharedStyles.statSubtitle, { flex: 1 }]} numberOfLines={1} ellipsizeMode="tail">
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

      {/* Edit Profile Modal - Combined Name and Email */}
      <Modal
        visible={showEditProfileModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setShowEditProfileModal(false);
          setOldEmail('');
          setNewEmail('');
          setConfirmEmail('');
          setEmailError('');
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
              setShowEditProfileModal(false);
              setOldEmail('');
              setNewEmail('');
              setConfirmEmail('');
              setEmailError('');
            }}
          >
            <TouchableOpacity
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
              style={{
                backgroundColor: 'white',
                borderRadius: 16,
                padding: 24,
                width: '90%',
                maxWidth: 500,
                maxHeight: '80%',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.25,
                shadowRadius: 8,
                elevation: 5
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#111827' }}>
                  Edit Profile
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setShowEditProfileModal(false);
                    setOldEmail('');
                    setNewEmail('');
                    setConfirmEmail('');
                    setEmailError('');
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
                <View style={{ gap: 20 }}>
                  {/* Name Field */}
                  <View>
                    <Text style={{ fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 8 }}>
                      Owner Name *
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
                      editable={!savingProfile}
                    />
                  </View>

                  {/* Email Change Section */}
                  <View>
                    <Text style={{ fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 12 }}>
                      Change Email (Optional)
                    </Text>
                    <Text style={{ fontSize: 12, color: '#6B7280', marginBottom: 12 }}>
                      Leave blank if you don&apos;t want to change your email
                    </Text>
                    
                    {/* Old Email */}
                    <View style={{ marginBottom: 12 }}>
                      <Text style={{ fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 8 }}>
                        Current Email {oldEmail || newEmail || confirmEmail ? '*' : ''}
                      </Text>
                      {user?.email && (
                        <Text style={{ fontSize: 12, color: '#6B7280', marginBottom: 4 }}>
                          Your current email: {user.email}
                        </Text>
                      )}
                      <TextInput
                        style={{
                          borderWidth: 1,
                          borderColor: emailError ? '#EF4444' : '#D1D5DB',
                          borderRadius: 8,
                          paddingHorizontal: 12,
                          paddingVertical: 12,
                          fontSize: 16,
                          color: '#111827',
                          backgroundColor: '#FFFFFF'
                        }}
                        value={oldEmail}
                        onChangeText={(text) => {
                          setOldEmail(text);
                          setEmailError('');
                        }}
                        placeholder={user?.email || "Enter your current email"}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoCorrect={false}
                        editable={!savingProfile}
                      />
                    </View>

                    {/* New Email */}
                    <View style={{ marginBottom: 12 }}>
                      <Text style={{ fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 8 }}>
                        New Email {oldEmail || newEmail || confirmEmail ? '*' : ''}
                      </Text>
                      <TextInput
                        style={{
                          borderWidth: 1,
                          borderColor: emailError ? '#EF4444' : '#D1D5DB',
                          borderRadius: 8,
                          paddingHorizontal: 12,
                          paddingVertical: 12,
                          fontSize: 16,
                          color: '#111827',
                          backgroundColor: '#FFFFFF'
                        }}
                        value={newEmail}
                        onChangeText={(text) => {
                          setNewEmail(text);
                          setEmailError('');
                        }}
                        placeholder="Enter your new email"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoCorrect={false}
                        editable={!savingProfile}
                      />
                    </View>

                    {/* Confirm Email */}
                    <View style={{ marginBottom: 8 }}>
                      <Text style={{ fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 8 }}>
                        Confirm New Email {oldEmail || newEmail || confirmEmail ? '*' : ''}
                      </Text>
                      <TextInput
                        style={{
                          borderWidth: 1,
                          borderColor: emailError ? '#EF4444' : '#D1D5DB',
                          borderRadius: 8,
                          paddingHorizontal: 12,
                          paddingVertical: 12,
                          fontSize: 16,
                          color: '#111827',
                          backgroundColor: '#FFFFFF'
                        }}
                        value={confirmEmail}
                        onChangeText={(text) => {
                          setConfirmEmail(text);
                          setEmailError('');
                        }}
                        placeholder="Re-enter your new email"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoCorrect={false}
                        editable={!savingProfile}
                      />
                    </View>
                    
                    {emailError ? (
                      <Text style={{ fontSize: 12, color: '#EF4444', marginTop: 4 }}>
                        {emailError}
                      </Text>
                    ) : null}
                  </View>
                </View>
              </ScrollView>

              <View style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}>
                <TouchableOpacity
                  onPress={() => {
                    setShowEditProfileModal(false);
                    setOldEmail('');
                    setNewEmail('');
                    setConfirmEmail('');
                    setEmailError('');
                  }}
                  disabled={savingProfile}
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    paddingHorizontal: 16,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: '#D1D5DB',
                    backgroundColor: '#FFFFFF',
                    alignItems: 'center',
                    opacity: savingProfile ? 0.5 : 1
                  }}
                >
                  <Text style={{ fontSize: 16, fontWeight: '600', color: '#374151' }}>
                    Cancel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSaveProfile}
                  disabled={savingProfile}
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    paddingHorizontal: 16,
                    borderRadius: 8,
                    backgroundColor: designTokens.colors.info,
                    alignItems: 'center',
                    opacity: savingProfile ? 0.7 : 1
                  }}
                >
                  {savingProfile ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Text style={{ fontSize: 16, fontWeight: '600', color: '#FFFFFF' }}>
                      Save Changes
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

      {/* Help & Support AI Agent Modal */}
      <Modal
        visible={showHelpSupport}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowHelpSupport(false)}
      >
        <HelpSupportAI 
          visible={showHelpSupport}
          onClose={() => setShowHelpSupport(false)}
          userName={user?.name || 'Owner'}
          userId={user?.id || ''}
          userRole="owner"
        />
      </Modal>
    </View>
  );
}

// AI Agent Component for Help & Support
interface HelpSupportAIProps {
  visible: boolean;
  onClose: () => void;
  userName: string;
  userId: string;
  userRole: 'owner' | 'tenant';
}

function HelpSupportAI({ visible, onClose, userName, userId, userRole }: HelpSupportAIProps) {
  const [messages, setMessages] = useState<Array<{ id: string; text: string; isUser: boolean; timestamp: Date }>>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);

  // Initialize with welcome message and reset when modal opens
  useEffect(() => {
    if (visible) {
      // Only show welcome message if no messages exist
      setMessages(prev => {
        if (prev.length === 0) {
          const welcomeMessage = {
            id: 'welcome',
            text: `Hello ${userName}! 👋 I'm Yna, your AI assistant for HanapBahay. I can help you with:\n\n• Creating and managing property listings\n• Understanding bookings and tenant management\n• Payment settings and account management\n• Platform features and navigation\n• Troubleshooting issues\n\nWhat would you like to know?`,
            isUser: false,
            timestamp: new Date()
          };
          return [welcomeMessage];
        }
        return prev;
      });
    } else {
      // Reset when modal closes
      setMessages([]);
      setInputText('');
      setIsTyping(false);
    }
  }, [visible, userName]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const generateAIResponse = async (userMessage: string): Promise<string> => {
    const lowerMessage = userMessage.toLowerCase().trim();
    
    // First, check if user is asking about a specific receipt number or booking ID
    if (userId) {
      try {
        const { searchHelpSupportData } = await import('../../utils/ai-support-search');
        const searchResult = await searchHelpSupportData(userMessage, userId, userRole);
        
        if (searchResult.responseText) {
          return searchResult.responseText;
        }
      } catch (error) {
        console.error('❌ Error searching help support data:', error);
        // Continue with regular responses if search fails
      }
    }
    
    // Context-aware responses based on keywords
    if (lowerMessage.includes('list') || lowerMessage.includes('property') || lowerMessage.includes('create') || lowerMessage.includes('add') || lowerMessage.includes('post')) {
      return `To create a property listing:\n\n1. Go to "Create Listing" from the dashboard\n2. Fill in property details (type, location, price, etc.)\n3. Upload photos and videos\n4. Set availability and rental terms\n5. Submit for review\n\nYour listing will be visible to tenants once approved. You can manage all listings from the "Manage Listings" section.\n\n💡 Tip: Add high-quality photos and detailed descriptions to attract more tenants!`;
    }
    
    if (lowerMessage.includes('edit') && (lowerMessage.includes('list') || lowerMessage.includes('property'))) {
      return `To edit a property listing:\n\n1. Go to "Manage Listings"\n2. Find the property you want to edit\n3. Tap on the property\n4. Click "Edit" button\n5. Update the details, photos, or pricing\n6. Save your changes\n\nChanges will be reflected immediately for tenants viewing your property.`;
    }
    
    if ((lowerMessage.includes('delete') || lowerMessage.includes('remove')) && (lowerMessage.includes('list') || lowerMessage.includes('property'))) {
      return `To remove a property listing:\n\n1. Go to "Manage Listings"\n2. Find the property you want to remove\n3. Tap on the property\n4. Look for the delete/remove option\n5. Confirm the removal\n\n⚠️ Note: Removing a listing will make it unavailable to tenants. Consider marking it as unavailable instead if you plan to relist it later.`;
    }
    
    if (lowerMessage.includes('booking') || lowerMessage.includes('reservation') || lowerMessage.includes('tenant') || lowerMessage.includes('approve') || lowerMessage.includes('reject')) {
      return `Managing bookings:\n\n• View all bookings in the "Bookings" section\n• Approve or reject booking requests\n• Track payment status\n• Communicate with tenants through Messages\n• View tenant profiles in "My Tenants"\n\nYou'll receive notifications for new booking requests. Always review tenant details before approving.\n\n💡 Tip: Check tenant ratings and previous booking history to make informed decisions.`;
    }
    
    if (lowerMessage.includes('pending') || lowerMessage.includes('waiting')) {
      return `Pending bookings are requests waiting for your approval. You can:\n\n• Review tenant information and requirements\n• Check move-in dates and rental terms\n• Approve if everything looks good\n• Reject if the tenant doesn't meet your criteria\n• Message the tenant for clarification\n\nRespond promptly to maintain good relationships with potential tenants.`;
    }
    
    if (lowerMessage.includes('payment') || lowerMessage.includes('money') || lowerMessage.includes('fee') || lowerMessage.includes('charge')) {
      return `Payment settings:\n\n• Configure payment methods in "Payment Settings"\n• Set up bank accounts or payment channels\n• View payment history and transactions\n• Manage rental collection\n\nEnsure your payment information is up to date to receive rent payments smoothly.`;
    }
    
    if (lowerMessage.includes('email') || lowerMessage.includes('account') || lowerMessage.includes('profile') || lowerMessage.includes('edit')) {
      return `Account management:\n\n• Edit your name and email from Profile\n• Change password in Security & Privacy\n• Update profile photo\n• Manage account settings\n\nKeep your account information current for better communication with tenants.`;
    }
    
    if (lowerMessage.includes('rating') || lowerMessage.includes('review') || lowerMessage.includes('feedback')) {
      return `Property ratings:\n\n• View tenant ratings in "Property Ratings"\n• Respond to reviews and feedback\n• Improve based on tenant suggestions\n• High ratings attract more tenants\n\nEngage with tenant feedback to improve your properties and reputation.`;
    }
    
    if (lowerMessage.includes('message') || lowerMessage.includes('chat') || lowerMessage.includes('communicate')) {
      return `Messaging features:\n\n• Access "Messages" to chat with tenants\n• Respond to inquiries about your properties\n• Share property details and answer questions\n• Coordinate viewing schedules\n\nQuick responses help convert inquiries into bookings!`;
    }
    
    if (lowerMessage.includes('help') || lowerMessage.includes('support') || lowerMessage.includes('issue') || lowerMessage.includes('problem')) {
      return `I'm Yna, and I'm here to help! You can ask me about:\n\n• How to use specific features\n• Managing your properties\n• Handling bookings and tenants\n• Account settings\n• Troubleshooting\n\nOr contact support at support@hanapbahay.com for urgent issues.`;
    }
    
    if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('hey')) {
      return `Hello! I'm Yna. How can I assist you today with your property management needs?`;
    }
    
    if (lowerMessage.includes('thank') || lowerMessage.includes('thanks')) {
      return `You're welcome! Feel free to ask if you need any other help. 😊`;
    }
    
    // Default helpful response
    return `I'm Yna, and I understand you're asking about "${userMessage}". Here are some ways I can help:\n\n• Property listing management\n• Booking and tenant coordination\n• Payment and account settings\n• Platform navigation\n• General questions\n\nCould you be more specific about what you need help with?`;
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || isTyping) return;
    
    const userMessage = inputText.trim();
    setInputText('');
    
    // Add user message
    const newUserMessage = {
      id: Date.now().toString(),
      text: userMessage,
      isUser: true,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, newUserMessage]);
    
    // Simulate AI thinking
    setIsTyping(true);
    
    // Generate AI response
    setTimeout(async () => {
      const aiResponse = await generateAIResponse(userMessage);
      const newAIMessage = {
        id: (Date.now() + 1).toString(),
        text: aiResponse,
        isUser: false,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, newAIMessage]);
      setIsTyping(false);
    }, 800 + Math.random() * 500); // Simulate thinking time
  };

  const quickQuestions = [
    'How do I create a listing?',
    'How to manage bookings?',
    'Payment settings',
    'Edit my account'
  ];

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      {/* Header */}
      <View style={{
        paddingTop: insets.top + 16,
        paddingBottom: 16,
        paddingHorizontal: 16,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12
      }}>
        <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
          <X size={24} color="#111827" />
        </TouchableOpacity>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
          <View style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: designTokens.colors.info + '20',
            justifyContent: 'center',
            alignItems: 'center'
          }}>
            <Bot size={20} color={designTokens.colors.info} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: '#111827' }}>
              Yna
            </Text>
            <Text style={{ fontSize: 12, color: '#6B7280' }}>
              AI Assistant • Help & Support
            </Text>
          </View>
        </View>
        <View style={{
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: '#10B981'
        }} />
      </View>

      {/* Messages */}
      <ScrollView
        ref={scrollViewRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        showsVerticalScrollIndicator={true}
      >
        {messages.map((message) => (
          <View
            key={message.id}
            style={{
              flexDirection: 'row',
              justifyContent: message.isUser ? 'flex-end' : 'flex-start',
              marginBottom: 4
            }}
          >
            <View style={{
              maxWidth: '80%',
              padding: 12,
              borderRadius: 16,
              backgroundColor: message.isUser ? designTokens.colors.info : '#F3F4F6',
            }}>
              {!message.isUser && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <Bot size={14} color={designTokens.colors.info} />
                  <Text style={{ fontSize: 11, fontWeight: '600', color: designTokens.colors.info }}>
                    Yna
                  </Text>
                </View>
              )}
              <Text style={{
                fontSize: 15,
                color: message.isUser ? '#FFFFFF' : '#111827',
                lineHeight: 20
              }}>
                {message.text}
              </Text>
            </View>
          </View>
        ))}
        
        {isTyping && (
          <View style={{ flexDirection: 'row', justifyContent: 'flex-start' }}>
            <View style={{
              padding: 12,
              borderRadius: 16,
              backgroundColor: '#F3F4F6',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6
            }}>
              <Bot size={14} color={designTokens.colors.info} />
              <Text style={{ fontSize: 11, fontWeight: '600', color: designTokens.colors.info, marginRight: 8 }}>
                Yna
              </Text>
              <ActivityIndicator size="small" color={designTokens.colors.info} />
            </View>
          </View>
        )}

        {/* Quick Questions */}
        {messages.length <= 1 && (
          <View style={{ marginTop: 8 }}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: '#6B7280', marginBottom: 8 }}>
              Quick Questions:
            </Text>
            <View style={{ gap: 8 }}>
              {quickQuestions.map((question, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => {
                    setInputText(question);
                    setTimeout(() => handleSendMessage(), 100);
                  }}
                  style={{
                    padding: 12,
                    backgroundColor: '#F9FAFB',
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: '#E5E7EB'
                  }}
                >
                  <Text style={{ fontSize: 14, color: '#374151' }}>{question}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Input Area */}
      <View style={{
        padding: 16,
        paddingBottom: Math.max(insets.bottom, 16),
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB'
      }}>
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          borderWidth: 1,
          borderColor: '#D1D5DB',
          borderRadius: 24,
          paddingHorizontal: 16,
          backgroundColor: '#F9FAFB'
        }}>
          <TextInput
            style={{
              flex: 1,
              paddingVertical: 12,
              fontSize: 15,
              color: '#111827'
            }}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Ask me anything..."
            multiline
            maxLength={500}
            onSubmitEditing={handleSendMessage}
            returnKeyType="send"
          />
          <TouchableOpacity
            onPress={handleSendMessage}
            disabled={!inputText.trim() || isTyping}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: inputText.trim() && !isTyping ? designTokens.colors.info : '#D1D5DB',
              justifyContent: 'center',
              alignItems: 'center'
            }}
          >
            {isTyping ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Send size={18} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

