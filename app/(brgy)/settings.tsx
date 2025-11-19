import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'expo-router';
import { sharedStyles, designTokens } from '../../styles/owner-dashboard-styles';
import { db } from '../../utils/db';
import { DbUserRecord } from '../../types';
import { showAlert } from '../../utils/alert';
import { User, Lock, LogOut, Settings as SettingsIcon, Eye, EyeOff, ChevronRight, Image as ImageIcon, X } from 'lucide-react-native';
import { changePassword } from '../../api/auth/change-password';
import * as ImagePicker from 'expo-image-picker';

export default function SettingsPage() {
  const { user, refreshUser, signOut } = useAuth();
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [barangay, setBarangay] = useState('');
  const [barangayLogo, setBarangayLogo] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingLogo, setSavingLogo] = useState(false);
  
  // Password change states
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    if (!user) {
      router.replace('/login');
      return;
    }

    if (!user.roles?.includes('brgy_official')) {
      router.replace('/(tabs)');
      return;
    }

    loadUserData();
  }, [user]);

  const loadUserData = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const userRecord = await db.get<DbUserRecord>('users', user.id);
      
      if (userRecord) {
        setName(userRecord.name || '');
        setEmail(userRecord.email || '');
        setPhone(userRecord.phone || '');
        setBarangay(userRecord.barangay || '');
        // Load barangay logo from user record
        setBarangayLogo((userRecord as any).barangayLogo || null);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      showAlert('Error', 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const handleSave = async () => {
    if (!user?.id) return;

    if (!name.trim()) {
      showAlert('Validation Error', 'Name is required');
      return;
    }

    if (!email.trim()) {
      showAlert('Validation Error', 'Email is required');
      return;
    }

    try {
      setSaving(true);

      const userRecord = await db.get<DbUserRecord>('users', user.id);
      
      if (!userRecord) {
        showAlert('Error', 'User not found');
        return;
      }

      const updatedUser: DbUserRecord = {
        ...userRecord,
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        // barangay is fixed and should not be changed
        barangayLogo: barangayLogo || undefined,
        updatedAt: new Date().toISOString()
      } as any;

      // Update database
      await db.upsert('users', user.id, updatedUser);
      
      // IMPORTANT: Update the mock authentication storage
      const { updateMockUser } = await import('../../utils/mock-auth');
      updateMockUser(user.id, {
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        updatedAt: updatedUser.updatedAt,
      });
      
      // IMPORTANT: Also update the auth session storage
      const { storeAuthUser, clearAuthUser } = await import('../../utils/auth-user');
      
      // Clear the current auth cache
      await clearAuthUser();
      
      // Store updated user info
      await storeAuthUser({
        id: user.id,
        roles: userRecord.roles || [],
        permissions: userRecord.permissions || [],
        name: updatedUser.name,
        email: updatedUser.email
      });
      
      // Wait a bit for storage to update
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Refresh user context to reflect changes
      await refreshUser();
      
      // Wait a bit more for context to update
      await new Promise(resolve => setTimeout(resolve, 100));
      
      showAlert('Success', 'Settings saved successfully!');
      
      // Navigate back to dashboard after a short delay to allow refresh
      setTimeout(() => {
        router.replace('/(brgy)/dashboard');
      }, 300);
    } catch (error) {
      console.error('Error saving settings:', error);
      showAlert('Error', 'Failed to save settings');
    } finally {
      setSaving(false);
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
        setShowPasswordSection(false);
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

  const pickLogo = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showAlert('Permission Required', 'Please grant permission to access your photos');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setBarangayLogo(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking logo:', error);
      showAlert('Error', 'Failed to pick logo. Please try again.');
    }
  };

  const handleSaveLogo = async () => {
    if (!user?.id || !barangayLogo) return;

    try {
      setSavingLogo(true);
      const userRecord = await db.get<DbUserRecord>('users', user.id);
      
      if (!userRecord) {
        showAlert('Error', 'User not found');
        return;
      }

      const updatedUser: DbUserRecord = {
        ...userRecord,
        barangayLogo: barangayLogo,
        updatedAt: new Date().toISOString()
      } as any;

      await db.upsert('users', user.id, updatedUser);
      
      // Update mock auth (non-blocking - it's okay if this fails)
      try {
        const { updateMockUser } = await import('../../utils/mock-auth');
        await updateMockUser(user.id, {
          barangayLogo: barangayLogo,
          updatedAt: updatedUser.updatedAt,
        });
      } catch (mockError) {
        console.warn('⚠️ Failed to update mock user (non-critical):', mockError);
        // Continue anyway - database update is what matters
      }
      
      showAlert('Success', 'Logo updated successfully!');
      
      // Refresh user context
      await refreshUser();
    } catch (error) {
      console.error('Error saving logo:', error);
      showAlert('Error', 'Failed to save logo');
    } finally {
      setSavingLogo(false);
    }
  };

  const handleRemoveLogo = () => {
    showAlert(
      'Remove Logo',
      'Are you sure you want to remove the barangay logo?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            if (!user?.id) return;
            try {
              setSavingLogo(true);
              const userRecord = await db.get<DbUserRecord>('users', user.id);
              
              if (!userRecord) {
                showAlert('Error', 'User not found');
                return;
              }

              const updatedUser: DbUserRecord = {
                ...userRecord,
                barangayLogo: undefined,
                updatedAt: new Date().toISOString()
              } as any;

              await db.upsert('users', user.id, updatedUser);
              
              // Update mock auth (non-blocking - it's okay if this fails)
              try {
                const { updateMockUser } = await import('../../utils/mock-auth');
                await updateMockUser(user.id, {
                  barangayLogo: undefined,
                  updatedAt: updatedUser.updatedAt,
                });
              } catch (mockError) {
                console.warn('⚠️ Failed to update mock user (non-critical):', mockError);
                // Continue anyway - database update is what matters
              }
              
              setBarangayLogo(null);
              showAlert('Success', 'Logo removed successfully!');
              await refreshUser();
            } catch (error) {
              console.error('Error removing logo:', error);
              showAlert('Error', 'Failed to remove logo');
            } finally {
              setSavingLogo(false);
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: designTokens.colors.background }}>
        <ActivityIndicator size="large" color={designTokens.colors.primary} />
        <Text style={{ marginTop: designTokens.spacing.md, color: designTokens.colors.textSecondary, fontSize: designTokens.typography.sm }}>
          Loading settings...
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1 }} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <View style={{ flex: 1, backgroundColor: designTokens.colors.background }}>
        {/* Modern Header */}
        <View style={{
          backgroundColor: 'white',
          paddingVertical: designTokens.spacing.lg,
          paddingHorizontal: designTokens.spacing.lg,
          borderBottomWidth: 1,
          borderBottomColor: designTokens.colors.borderLight,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.05,
          shadowRadius: 4,
          zIndex: 10,
          elevation: 5,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: designTokens.spacing.md }}>
            <View style={{
              backgroundColor: designTokens.colors.primary + '20',
              padding: designTokens.spacing.sm,
              borderRadius: 8,
            }}>
              <SettingsIcon size={20} color={designTokens.colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{
                fontSize: designTokens.typography.lg,
                fontWeight: '700',
                color: designTokens.colors.textPrimary,
              }}>
                Settings
              </Text>
              <Text style={{
                fontSize: designTokens.typography.xs,
                color: designTokens.colors.textSecondary,
                marginTop: 2,
              }}>
                Manage your barangay account settings
              </Text>
            </View>
          </View>
        </View>

        <ScrollView 
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 100 }}
          keyboardShouldPersistTaps="handled"
        >
        <View style={{ padding: designTokens.spacing.lg }}>
          {/* Profile Information Section */}
          <View style={[sharedStyles.card, { marginBottom: designTokens.spacing.lg }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: designTokens.spacing.lg }}>
              <View style={[sharedStyles.statIcon, { backgroundColor: designTokens.colors.primary + '20' }]}>
                <User size={20} color={designTokens.colors.primary} />
              </View>
              <View style={{ flex: 1, marginLeft: designTokens.spacing.md }}>
                <Text style={[sharedStyles.sectionTitle, { marginBottom: 0 }]}>
                  Profile Information
                </Text>
                <Text style={[sharedStyles.statSubtitle, { marginTop: 2 }]}>
                  Update your personal details
                </Text>
              </View>
            </View>

            {/* Name Field */}
            <View style={{ marginBottom: designTokens.spacing.lg }}>
              <Text style={[sharedStyles.statLabel, { marginBottom: designTokens.spacing.xs }]}>
                Official Name (Kapitan)
              </Text>
              <TextInput
                style={{
                  backgroundColor: designTokens.colors.background,
                  borderRadius: designTokens.borderRadius.md,
                  padding: designTokens.spacing.md,
                  fontSize: designTokens.typography.base,
                  color: designTokens.colors.textPrimary,
                  borderWidth: 1,
                  borderColor: designTokens.colors.borderLight,
                }}
                placeholder="Enter official name"
                placeholderTextColor={designTokens.colors.textMuted}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
            </View>

            {/* Email Field */}
            <View style={{ marginBottom: designTokens.spacing.lg }}>
              <Text style={[sharedStyles.statLabel, { marginBottom: designTokens.spacing.xs }]}>
                Email Address
              </Text>
              <TextInput
                style={{
                  backgroundColor: designTokens.colors.background,
                  borderRadius: designTokens.borderRadius.md,
                  padding: designTokens.spacing.md,
                  fontSize: designTokens.typography.base,
                  color: designTokens.colors.textPrimary,
                  borderWidth: 1,
                  borderColor: designTokens.colors.borderLight,
                }}
                placeholder="Enter email address"
                placeholderTextColor={designTokens.colors.textMuted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            {/* Phone Field */}
            <View style={{ marginBottom: 0 }}>
              <Text style={[sharedStyles.statLabel, { marginBottom: designTokens.spacing.xs }]}>
                Phone Number
              </Text>
              <TextInput
                style={{
                  backgroundColor: designTokens.colors.background,
                  borderRadius: designTokens.borderRadius.md,
                  padding: designTokens.spacing.md,
                  fontSize: designTokens.typography.base,
                  color: designTokens.colors.textPrimary,
                  borderWidth: 1,
                  borderColor: designTokens.colors.borderLight,
                }}
                placeholder="Enter phone number"
                placeholderTextColor={designTokens.colors.textMuted}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
            </View>
          </View>

          {/* Save Button */}
          <TouchableOpacity
            style={[sharedStyles.primaryButton, {
              marginBottom: designTokens.spacing.lg,
              paddingVertical: designTokens.spacing.md,
            }]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.8}
          >
            {saving ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={sharedStyles.primaryButtonText}>
                Save Changes
              </Text>
            )}
          </TouchableOpacity>

          {/* Info Note */}
          <View style={{
            backgroundColor: designTokens.colors.primary + '10',
            borderRadius: designTokens.borderRadius.md,
            padding: designTokens.spacing.md,
            marginBottom: designTokens.spacing.lg,
            borderLeftWidth: 4,
            borderLeftColor: designTokens.colors.primary,
          }}>
            <Text style={{
              fontSize: designTokens.typography.sm,
              color: designTokens.colors.primary,
              lineHeight: 20,
            }}>
              💡 <Text style={{ fontWeight: '600' }}>Note:</Text> Changes to your name will be reflected throughout the app, including the dashboard display.
            </Text>
          </View>

          {/* Barangay Logo Section */}
          <View style={[sharedStyles.card, { marginBottom: designTokens.spacing.lg }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: designTokens.spacing.lg }}>
              <View style={[sharedStyles.statIcon, { backgroundColor: designTokens.colors.primary + '20' }]}>
                <ImageIcon size={20} color={designTokens.colors.primary} />
              </View>
              <View style={{ flex: 1, marginLeft: designTokens.spacing.md }}>
                <Text style={[sharedStyles.sectionTitle, { marginBottom: 0 }]}>
                  Barangay Logo
                </Text>
                <Text style={[sharedStyles.statSubtitle, { marginTop: 2 }]}>
                  Update your barangay logo
                </Text>
              </View>
            </View>

            {/* Current Logo Display */}
            {barangayLogo ? (
              <View style={{ marginBottom: designTokens.spacing.lg }}>
                <View style={{
                  alignItems: 'center',
                  marginBottom: designTokens.spacing.md,
                }}>
                  <View style={{
                    position: 'relative',
                    width: 120,
                    height: 120,
                    borderRadius: 60,
                    overflow: 'hidden',
                    borderWidth: 3,
                    borderColor: designTokens.colors.primary,
                    backgroundColor: designTokens.colors.background,
                    ...designTokens.shadows.md,
                  }}>
                    <Image
                      source={{ uri: barangayLogo }}
                      style={{ width: '100%', height: '100%' }}
                      resizeMode="cover"
                    />
                    <TouchableOpacity
                      onPress={handleRemoveLogo}
                      style={{
                        position: 'absolute',
                        top: 4,
                        right: 4,
                        backgroundColor: '#EF4444',
                        borderRadius: 12,
                        width: 24,
                        height: 24,
                        justifyContent: 'center',
                        alignItems: 'center',
                        ...designTokens.shadows.sm,
                      }}
                      activeOpacity={0.8}
                    >
                      <X size={14} color="white" />
                    </TouchableOpacity>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={pickLogo}
                  style={{
                    backgroundColor: designTokens.colors.background,
                    borderRadius: designTokens.borderRadius.md,
                    paddingVertical: designTokens.spacing.md,
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: designTokens.colors.borderLight,
                    marginBottom: designTokens.spacing.sm,
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={{
                    fontSize: designTokens.typography.base,
                    fontWeight: '600',
                    color: designTokens.colors.textPrimary,
                  }}>
                    Change Logo
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSaveLogo}
                  disabled={savingLogo}
                  style={{
                    backgroundColor: designTokens.colors.primary,
                    borderRadius: designTokens.borderRadius.md,
                    paddingVertical: designTokens.spacing.md,
                    alignItems: 'center',
                    opacity: savingLogo ? 0.7 : 1,
                    ...designTokens.shadows.sm,
                  }}
                  activeOpacity={0.8}
                >
                  {savingLogo ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text style={{
                      fontSize: designTokens.typography.base,
                      fontWeight: '600',
                      color: 'white',
                    }}>
                      Save Logo
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <View>
                <View style={{
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: designTokens.colors.background,
                  borderRadius: designTokens.borderRadius.lg,
                  padding: designTokens.spacing['2xl'],
                  marginBottom: designTokens.spacing.md,
                  borderWidth: 2,
                  borderColor: designTokens.colors.borderLight,
                  borderStyle: 'dashed',
                }}>
                  <ImageIcon size={48} color={designTokens.colors.textMuted} />
                  <Text style={{
                    fontSize: designTokens.typography.sm,
                    color: designTokens.colors.textSecondary,
                    marginTop: designTokens.spacing.md,
                    textAlign: 'center',
                  }}>
                    No logo uploaded
                  </Text>
                  <Text style={{
                    fontSize: designTokens.typography.xs,
                    color: designTokens.colors.textMuted,
                    marginTop: designTokens.spacing.xs,
                    textAlign: 'center',
                  }}>
                    Upload a square image for best results
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={pickLogo}
                  style={{
                    backgroundColor: designTokens.colors.primary,
                    borderRadius: designTokens.borderRadius.md,
                    paddingVertical: designTokens.spacing.md,
                    alignItems: 'center',
                    flexDirection: 'row',
                    justifyContent: 'center',
                    gap: designTokens.spacing.sm,
                    ...designTokens.shadows.sm,
                  }}
                  activeOpacity={0.8}
                >
                  <ImageIcon size={18} color="white" />
                  <Text style={{
                    fontSize: designTokens.typography.base,
                    fontWeight: '600',
                    color: 'white',
                  }}>
                    Upload Logo
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Password Change Section */}
          <View style={[sharedStyles.card, { marginBottom: designTokens.spacing.lg }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: designTokens.spacing.lg }}>
              <View style={[sharedStyles.statIcon, { backgroundColor: designTokens.colors.primary + '20' }]}>
                <Lock size={20} color={designTokens.colors.primary} />
              </View>
              <View style={{ flex: 1, marginLeft: designTokens.spacing.md }}>
                <Text style={[sharedStyles.sectionTitle, { marginBottom: 0 }]}>
                  Security
                </Text>
                <Text style={[sharedStyles.statSubtitle, { marginTop: 2 }]}>
                  Change your account password
                </Text>
              </View>
            </View>

            {!showPasswordSection ? (
              <TouchableOpacity
                onPress={() => setShowPasswordSection(true)}
                style={{
                  backgroundColor: designTokens.colors.primary,
                  borderRadius: designTokens.borderRadius.md,
                  paddingVertical: designTokens.spacing.md,
                  paddingHorizontal: designTokens.spacing.lg,
                  alignItems: 'center',
                  flexDirection: 'row',
                  justifyContent: 'center',
                  gap: designTokens.spacing.sm,
                  ...designTokens.shadows.sm,
                }}
                activeOpacity={0.8}
              >
                <Lock size={18} color="white" />
                <Text style={{
                  fontSize: designTokens.typography.base,
                  fontWeight: '600',
                  color: 'white',
                }}>
                  Change Password
                </Text>
              </TouchableOpacity>
            ) : (
              <View>
                {/* Divider */}
                <View style={{
                  height: 1,
                  backgroundColor: designTokens.colors.borderLight,
                  marginBottom: designTokens.spacing.lg,
                }} />

                {/* Current Password */}
                <View style={{ marginBottom: designTokens.spacing.lg }}>
                  <Text style={[sharedStyles.statLabel, { marginBottom: designTokens.spacing.sm }]}>
                    Current Password
                  </Text>
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: designTokens.colors.background,
                    borderRadius: designTokens.borderRadius.md,
                    borderWidth: 1,
                    borderColor: designTokens.colors.borderLight,
                    ...designTokens.shadows.sm,
                  }}>
                    <TextInput
                      style={{
                        flex: 1,
                        padding: designTokens.spacing.md,
                        fontSize: designTokens.typography.base,
                        color: designTokens.colors.textPrimary,
                      }}
                      placeholder="Enter your current password"
                      placeholderTextColor={designTokens.colors.textMuted}
                      value={currentPassword}
                      onChangeText={setCurrentPassword}
                      secureTextEntry={!showCurrentPassword}
                      autoCapitalize="none"
                    />
                    <TouchableOpacity
                      onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                      style={{ 
                        padding: designTokens.spacing.md,
                        paddingRight: designTokens.spacing.md,
                      }}
                      activeOpacity={0.7}
                    >
                      {showCurrentPassword ? (
                        <EyeOff size={20} color={designTokens.colors.textSecondary} />
                      ) : (
                        <Eye size={20} color={designTokens.colors.textSecondary} />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>

                {/* New Password */}
                <View style={{ marginBottom: designTokens.spacing.lg }}>
                  <Text style={[sharedStyles.statLabel, { marginBottom: designTokens.spacing.sm }]}>
                    New Password
                  </Text>
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: designTokens.colors.background,
                    borderRadius: designTokens.borderRadius.md,
                    borderWidth: 1,
                    borderColor: designTokens.colors.borderLight,
                    ...designTokens.shadows.sm,
                  }}>
                    <TextInput
                      style={{
                        flex: 1,
                        padding: designTokens.spacing.md,
                        fontSize: designTokens.typography.base,
                        color: designTokens.colors.textPrimary,
                      }}
                      placeholder="Enter your new password"
                      placeholderTextColor={designTokens.colors.textMuted}
                      value={newPassword}
                      onChangeText={setNewPassword}
                      secureTextEntry={!showNewPassword}
                      autoCapitalize="none"
                    />
                    <TouchableOpacity
                      onPress={() => setShowNewPassword(!showNewPassword)}
                      style={{ 
                        padding: designTokens.spacing.md,
                        paddingRight: designTokens.spacing.md,
                      }}
                      activeOpacity={0.7}
                    >
                      {showNewPassword ? (
                        <EyeOff size={20} color={designTokens.colors.textSecondary} />
                      ) : (
                        <Eye size={20} color={designTokens.colors.textSecondary} />
                      )}
                    </TouchableOpacity>
                  </View>
                  <Text style={{
                    fontSize: designTokens.typography.xs,
                    color: designTokens.colors.textMuted,
                    marginTop: designTokens.spacing.xs,
                  }}>
                    Password must be at least 6 characters long
                  </Text>
                </View>

                {/* Confirm Password */}
                <View style={{ marginBottom: designTokens.spacing.lg }}>
                  <Text style={[sharedStyles.statLabel, { marginBottom: designTokens.spacing.sm }]}>
                    Confirm New Password
                  </Text>
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: designTokens.colors.background,
                    borderRadius: designTokens.borderRadius.md,
                    borderWidth: 1,
                    borderColor: designTokens.colors.borderLight,
                    ...designTokens.shadows.sm,
                  }}>
                    <TextInput
                      style={{
                        flex: 1,
                        padding: designTokens.spacing.md,
                        fontSize: designTokens.typography.base,
                        color: designTokens.colors.textPrimary,
                      }}
                      placeholder="Confirm your new password"
                      placeholderTextColor={designTokens.colors.textMuted}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      secureTextEntry={!showConfirmPassword}
                      autoCapitalize="none"
                    />
                    <TouchableOpacity
                      onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                      style={{ 
                        padding: designTokens.spacing.md,
                        paddingRight: designTokens.spacing.md,
                      }}
                      activeOpacity={0.7}
                    >
                      {showConfirmPassword ? (
                        <EyeOff size={20} color={designTokens.colors.textSecondary} />
                      ) : (
                        <Eye size={20} color={designTokens.colors.textSecondary} />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Action Buttons */}
                <View style={{ 
                  flexDirection: 'row', 
                  gap: designTokens.spacing.md,
                  marginTop: designTokens.spacing.md,
                }}>
                  <TouchableOpacity
                    onPress={() => {
                      setShowPasswordSection(false);
                      setCurrentPassword('');
                      setNewPassword('');
                      setConfirmPassword('');
                    }}
                    style={{
                      flex: 1,
                      backgroundColor: designTokens.colors.background,
                      borderRadius: designTokens.borderRadius.md,
                      paddingVertical: designTokens.spacing.md,
                      alignItems: 'center',
                      borderWidth: 1,
                      borderColor: designTokens.colors.borderLight,
                      ...designTokens.shadows.sm,
                    }}
                    disabled={changingPassword}
                    activeOpacity={0.7}
                  >
                    <Text style={{
                      fontSize: designTokens.typography.base,
                      fontWeight: '600',
                      color: designTokens.colors.textSecondary,
                    }}>
                      Cancel
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleChangePassword}
                    disabled={changingPassword}
                    style={{
                      flex: 1,
                      backgroundColor: designTokens.colors.primary,
                      borderRadius: designTokens.borderRadius.md,
                      paddingVertical: designTokens.spacing.md,
                      alignItems: 'center',
                      opacity: changingPassword ? 0.7 : 1,
                      ...designTokens.shadows.sm,
                    }}
                    activeOpacity={0.8}
                  >
                    {changingPassword ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <Text style={{
                        fontSize: designTokens.typography.base,
                        fontWeight: '600',
                        color: 'white',
                      }}>
                        Update Password
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>

          {/* Logout Section */}
          <View style={[sharedStyles.card]}>
            <TouchableOpacity
              onPress={async () => {
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
                          console.log('🚪 User confirmed logout from settings, starting signOut...');
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
              }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#FEF2F2',
                borderRadius: designTokens.borderRadius.md,
                padding: designTokens.spacing.md,
                borderWidth: 1,
                borderColor: '#FECACA',
                gap: designTokens.spacing.sm,
              }}
              activeOpacity={0.7}
            >
              <LogOut size={20} color="#EF4444" />
              <Text style={{
                fontSize: designTokens.typography.base,
                fontWeight: '600',
                color: '#EF4444',
              }}>
                Logout
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}
