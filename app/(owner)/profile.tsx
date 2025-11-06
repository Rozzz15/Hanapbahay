import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Image, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import * as ImagePicker from 'expo-image-picker';
import { 
  User, 
  LogOut, 
  Settings,
  Shield,
  Bell,
  HelpCircle,
  ChevronRight,
  Mail,
  Phone,
  Camera
} from 'lucide-react-native';
import { sharedStyles, designTokens, iconBackgrounds } from '../../styles/owner-dashboard-styles';
import { showAlert } from '../../utils/alert';
import { saveUserProfilePhoto, loadUserProfilePhoto } from '../../utils/user-profile-photos';

export default function OwnerProfile() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [loadingPhoto, setLoadingPhoto] = useState(true);
  const [savingPhoto, setSavingPhoto] = useState(false);

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
                setProfilePhoto(null);
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
            
            setProfilePhoto(imageUri);
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

  const profileMenuItems = [
    {
      id: 'settings',
      icon: Settings,
      label: 'Account Settings',
      description: 'Manage your account preferences',
      color: designTokens.colors.info,
      onPress: () => showAlert('Settings', 'Account settings coming soon!')
    },
    {
      id: 'security',
      icon: Shield,
      label: 'Security & Privacy',
      description: 'Password and security settings',
      color: designTokens.colors.success,
      onPress: () => showAlert('Security', 'Security settings coming soon!')
    },
    {
      id: 'notifications',
      icon: Bell,
      label: 'Notifications',
      description: 'Manage notification preferences',
      color: designTokens.colors.warning,
      onPress: () => showAlert('Notifications', 'Notification settings coming soon!')
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
    <View style={sharedStyles.container}>
      <ScrollView style={sharedStyles.scrollView}>
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
                onPress={() => handlePhotoAction('gallery')}
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
                <Text style={[sharedStyles.statLabel, { fontSize: designTokens.typography.xl, marginBottom: 4 }]}>
                  {user?.name || 'Property Owner'}
                </Text>
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
    </View>
  );
}

