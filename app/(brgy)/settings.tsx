import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'expo-router';
import { sharedStyles } from '../../styles/owner-dashboard-styles';
import { db } from '../../utils/db';
import { DbUserRecord } from '../../types';
import { showAlert } from '../../utils/alert';
import { User, Lock } from 'lucide-react-native';
import { changePassword } from '../../api/auth/change-password';

export default function SettingsPage() {
  const { user, refreshUser } = useAuth();
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [barangay, setBarangay] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
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
        updatedAt: new Date().toISOString()
      };

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

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={{ marginTop: 12, color: '#6B7280' }}>Loading settings...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1 }} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <View style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
        {/* Professional Header */}
        <View style={{
          backgroundColor: 'white',
          paddingVertical: 20,
          paddingHorizontal: 20,
          borderBottomWidth: 1,
          borderBottomColor: '#E5E7EB',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.05,
          shadowRadius: 4,
        }}>
          <Text style={{
            fontSize: 24,
            fontWeight: '700',
            color: '#111827',
            marginBottom: 4,
          }}>
            Settings
          </Text>
          <Text style={{
            fontSize: 14,
            color: '#6B7280',
          }}>
            Manage your barangay account settings
          </Text>
        </View>

        <ScrollView 
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 100 }}
          keyboardShouldPersistTaps="handled"
        >
        <View style={{ padding: 20 }}>
          {/* Profile Information Section */}
          <View style={{
            backgroundColor: 'white',
            borderRadius: 16,
            padding: 20,
            marginBottom: 20,
            borderWidth: 1,
            borderColor: '#E5E7EB',
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
              <View style={{
                backgroundColor: '#3B82F6',
                width: 48,
                height: 48,
                borderRadius: 24,
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: 12,
              }}>
                <User size={24} color="white" />
              </View>
              <View>
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827' }}>
                  Profile Information
                </Text>
                <Text style={{ fontSize: 13, color: '#6B7280', marginTop: 2 }}>
                  Update your personal details
                </Text>
              </View>
            </View>

            {/* Name Field */}
            <View style={{ marginBottom: 20 }}>
              <Text style={{
                fontSize: 13,
                fontWeight: '600',
                color: '#6B7280',
                marginBottom: 8,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
              }}>
                Official Name (Kapitan)
              </Text>
              <TextInput
                style={{
                  backgroundColor: '#F9FAFB',
                  borderRadius: 12,
                  padding: 16,
                  fontSize: 16,
                  color: '#111827',
                  borderWidth: 1,
                  borderColor: '#E5E7EB',
                }}
                placeholder="Enter official name"
                placeholderTextColor="#9CA3AF"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
            </View>

            {/* Email Field */}
            <View style={{ marginBottom: 20 }}>
              <Text style={{
                fontSize: 13,
                fontWeight: '600',
                color: '#6B7280',
                marginBottom: 8,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
              }}>
                Email Address
              </Text>
              <TextInput
                style={{
                  backgroundColor: '#F9FAFB',
                  borderRadius: 12,
                  padding: 16,
                  fontSize: 16,
                  color: '#111827',
                  borderWidth: 1,
                  borderColor: '#E5E7EB',
                }}
                placeholder="Enter email address"
                placeholderTextColor="#9CA3AF"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            {/* Phone Field */}
            <View style={{ marginBottom: 20 }}>
              <Text style={{
                fontSize: 13,
                fontWeight: '600',
                color: '#6B7280',
                marginBottom: 8,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
              }}>
                Phone Number
              </Text>
              <TextInput
                style={{
                  backgroundColor: '#F9FAFB',
                  borderRadius: 12,
                  padding: 16,
                  fontSize: 16,
                  color: '#111827',
                  borderWidth: 1,
                  borderColor: '#E5E7EB',
                }}
                placeholder="Enter phone number"
                placeholderTextColor="#9CA3AF"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
            </View>

            {/* Barangay Field - Read Only */}
            <View style={{ marginBottom: 0 }}>
              <Text style={{
                fontSize: 13,
                fontWeight: '600',
                color: '#6B7280',
                marginBottom: 8,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
              }}>
                Barangay Name
              </Text>
              <View style={{
                backgroundColor: '#F3F4F6',
                borderRadius: 12,
                padding: 16,
                borderWidth: 1,
                borderColor: '#E5E7EB',
              }}>
                <Text style={{
                  fontSize: 16,
                  color: '#111827',
                  fontWeight: '600',
                }}>
                  {barangay || 'Not Set'}
                </Text>
              </View>
            </View>
          </View>

          {/* Save Button */}
          <TouchableOpacity
            style={{
              backgroundColor: '#3B82F6',
              borderRadius: 12,
              padding: 18,
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 3,
            }}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.8}
          >
            {saving ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={{
                fontSize: 16,
                fontWeight: '700',
                color: 'white',
              }}>
                Save Changes
              </Text>
            )}
          </TouchableOpacity>

          {/* Info Note */}
          <View style={{
            backgroundColor: '#EFF6FF',
            borderRadius: 12,
            padding: 16,
            marginTop: 20,
            borderLeftWidth: 4,
            borderLeftColor: '#3B82F6',
          }}>
            <Text style={{
              fontSize: 13,
              color: '#1E40AF',
              lineHeight: 20,
            }}>
              💡 <Text style={{ fontWeight: '600' }}>Note:</Text> Changes to your name will be reflected throughout the app, including the dashboard display.
            </Text>
          </View>

          {/* Password Change Section */}
          <View style={{
            backgroundColor: 'white',
            borderRadius: 16,
            padding: 20,
            marginTop: 20,
            borderWidth: 1,
            borderColor: '#E5E7EB',
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
              <View style={{
                backgroundColor: '#EF4444',
                width: 48,
                height: 48,
                borderRadius: 24,
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: 12,
              }}>
                <Lock size={24} color="white" />
              </View>
              <View>
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827' }}>
                  Change Password
                </Text>
                <Text style={{ fontSize: 13, color: '#6B7280', marginTop: 2 }}>
                  Update your account password
                </Text>
              </View>
            </View>

            {!showPasswordSection ? (
              <TouchableOpacity
                onPress={() => setShowPasswordSection(true)}
                style={{
                  backgroundColor: '#EF4444',
                  borderRadius: 12,
                  padding: 16,
                  alignItems: 'center',
                }}
              >
                <Text style={{
                  fontSize: 16,
                  fontWeight: '600',
                  color: 'white',
                }}>
                  Change Password
                </Text>
              </TouchableOpacity>
            ) : (
              <View>
                {/* Current Password */}
                <View style={{ marginBottom: 16 }}>
                  <Text style={{
                    fontSize: 13,
                    fontWeight: '600',
                    color: '#6B7280',
                    marginBottom: 8,
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                  }}>
                    Current Password
                  </Text>
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: '#F9FAFB',
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: '#E5E7EB',
                  }}>
                    <TextInput
                      style={{
                        flex: 1,
                        padding: 16,
                        fontSize: 16,
                        color: '#111827',
                      }}
                      placeholder="Enter current password"
                      placeholderTextColor="#9CA3AF"
                      value={currentPassword}
                      onChangeText={setCurrentPassword}
                      secureTextEntry={!showCurrentPassword}
                    />
                    <TouchableOpacity
                      onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                      style={{ padding: 16 }}
                    >
                      <Text style={{ color: '#3B82F6', fontWeight: '600' }}>
                        {showCurrentPassword ? 'Hide' : 'Show'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* New Password */}
                <View style={{ marginBottom: 16 }}>
                  <Text style={{
                    fontSize: 13,
                    fontWeight: '600',
                    color: '#6B7280',
                    marginBottom: 8,
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                  }}>
                    New Password
                  </Text>
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: '#F9FAFB',
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: '#E5E7EB',
                  }}>
                    <TextInput
                      style={{
                        flex: 1,
                        padding: 16,
                        fontSize: 16,
                        color: '#111827',
                      }}
                      placeholder="Enter new password"
                      placeholderTextColor="#9CA3AF"
                      value={newPassword}
                      onChangeText={setNewPassword}
                      secureTextEntry={!showNewPassword}
                    />
                    <TouchableOpacity
                      onPress={() => setShowNewPassword(!showNewPassword)}
                      style={{ padding: 16 }}
                    >
                      <Text style={{ color: '#3B82F6', fontWeight: '600' }}>
                        {showNewPassword ? 'Hide' : 'Show'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Confirm Password */}
                <View style={{ marginBottom: 20 }}>
                  <Text style={{
                    fontSize: 13,
                    fontWeight: '600',
                    color: '#6B7280',
                    marginBottom: 8,
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                  }}>
                    Confirm New Password
                  </Text>
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: '#F9FAFB',
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: '#E5E7EB',
                  }}>
                    <TextInput
                      style={{
                        flex: 1,
                        padding: 16,
                        fontSize: 16,
                        color: '#111827',
                      }}
                      placeholder="Confirm new password"
                      placeholderTextColor="#9CA3AF"
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      secureTextEntry={!showConfirmPassword}
                    />
                    <TouchableOpacity
                      onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                      style={{ padding: 16 }}
                    >
                      <Text style={{ color: '#3B82F6', fontWeight: '600' }}>
                        {showConfirmPassword ? 'Hide' : 'Show'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Action Buttons */}
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <TouchableOpacity
                    onPress={() => {
                      setShowPasswordSection(false);
                      setCurrentPassword('');
                      setNewPassword('');
                      setConfirmPassword('');
                    }}
                    style={{
                      flex: 1,
                      backgroundColor: '#F3F4F6',
                      borderRadius: 12,
                      padding: 16,
                      alignItems: 'center',
                    }}
                    disabled={changingPassword}
                  >
                    <Text style={{
                      fontSize: 16,
                      fontWeight: '600',
                      color: '#6B7280',
                    }}>
                      Cancel
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleChangePassword}
                    disabled={changingPassword}
                    style={{
                      flex: 1,
                      backgroundColor: '#EF4444',
                      borderRadius: 12,
                      padding: 16,
                      alignItems: 'center',
                      opacity: changingPassword ? 0.7 : 1,
                    }}
                  >
                    {changingPassword ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <Text style={{
                        fontSize: 16,
                        fontWeight: '600',
                        color: 'white',
                      }}>
                        Change Password
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}
