import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { 
  User, 
  LogOut, 
  Settings,
  Shield,
  Bell,
  HelpCircle,
  ChevronRight,
  Mail,
  Phone
} from 'lucide-react-native';
import { sharedStyles, designTokens, iconBackgrounds } from '../../styles/owner-dashboard-styles';
import { showAlert } from '../../utils/alert';

export default function OwnerProfile() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

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
              <View style={[sharedStyles.statIcon, iconBackgrounds.blue, { width: 60, height: 60, borderRadius: 30 }]}>
                <User size={32} color="#3B82F6" />
              </View>
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

