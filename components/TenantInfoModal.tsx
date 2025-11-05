import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { db } from '@/utils/db';

interface TenantInfoModalProps {
  visible: boolean;
  tenantId: string;
  tenantName: string;
  tenantEmail?: string;
  tenantPhone?: string;
  tenantAvatar?: string;
  onClose: () => void;
}

interface TenantProfile {
  name: string;
  email: string;
  phone?: string;
  profilePhoto?: string;
  address?: string;
  gender?: 'male' | 'female';
  familyType?: 'individual' | 'family';
  emergencyContactPerson?: string;
  emergencyContactNumber?: string;
  role: string;
  createdAt: string;
}

const TenantInfoModal: React.FC<TenantInfoModalProps> = ({
  visible,
  tenantId,
  tenantName,
  tenantEmail,
  tenantPhone,
  tenantAvatar,
  onClose
}) => {
  const [tenantProfile, setTenantProfile] = useState<TenantProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    if (visible && tenantId) {
      setImageError(false); // Reset image error when opening modal
      loadTenantProfile();
    }
  }, [visible, tenantId]);

  const loadTenantProfile = async () => {
    try {
      setLoading(true);
      
      // Try to load user data first
      const user = await db.get('users', tenantId);
      
      // Load profile photo - Use provided tenantAvatar if available, otherwise load it
      let profilePhoto = '';
      
      // First, use the provided tenantAvatar if available
      if (tenantAvatar && tenantAvatar.trim() && tenantAvatar.length > 10) {
        profilePhoto = tenantAvatar.trim();
        console.log('✅ Using provided tenant profile photo');
      } else {
        // Try to load profile photo from database
        try {
          const { loadUserProfilePhoto } = await import('../utils/user-profile-photos');
          const photoUri = await loadUserProfilePhoto(tenantId);
          if (photoUri && photoUri.trim() && photoUri.length > 10) {
            profilePhoto = photoUri.trim();
            console.log('✅ Loaded tenant profile photo from database');
          }
        } catch (error) {
          console.log('⚠️ Could not load profile photo:', error);
          
          // Try direct database query as fallback
          try {
            const allPhotos = await db.list('user_profile_photos');
            const tenantPhoto = allPhotos.find((photo: any) => {
              const photoUserId = photo.userId || photo.userid;
              return photoUserId === tenantId && (photo as any).photoData && (photo as any).photoData.trim();
            }) as any;
            
            if (tenantPhoto) {
              const photoData = tenantPhoto.photoData;
              if (photoData && photoData.trim()) {
                if (photoData.startsWith('data:')) {
                  profilePhoto = photoData.trim();
                } else {
                  const mimeType = tenantPhoto.mimeType || 'image/jpeg';
                  profilePhoto = `data:${mimeType};base64,${photoData.trim()}`;
                }
                console.log('✅ Loaded profile photo via direct query');
              }
            }
          } catch (fallbackError) {
            console.log('⚠️ Fallback photo loading failed:', fallbackError);
          }
        }
      }

      if (user) {
        // Get tenant-specific data
        let tenantAddress = '';
        let tenantPhoneFromProfile = '';
        let gender: 'male' | 'female' | undefined;
        let familyType: 'individual' | 'family' | undefined;
        let emergencyContactPerson: string | undefined;
        let emergencyContactNumber: string | undefined;
        
        try {
          const tenantProfile = await db.get('tenants', tenantId);
          if (tenantProfile) {
            tenantAddress = (tenantProfile as any).address || '';
            tenantPhoneFromProfile = (tenantProfile as any).contactNumber || '';
            gender = (tenantProfile as any).gender;
            familyType = (tenantProfile as any).familyType;
            emergencyContactPerson = (tenantProfile as any).emergencyContactPerson;
            emergencyContactNumber = (tenantProfile as any).emergencyContactNumber;
          }
        } catch (error) {
          console.log('⚠️ Could not load tenant profile:', error);
        }

        // Fallback to users table for gender/familyType
        if (!gender) gender = (user as any).gender;
        if (!familyType) familyType = (user as any).familyType;

        setTenantProfile({
          name: (user as any).name || tenantName,
          email: (user as any).email || tenantEmail || '',
          phone: (user as any).phone || tenantPhoneFromProfile || tenantPhone || '',
          profilePhoto, // Include the loaded photo
          address: tenantAddress,
          gender,
          familyType,
          emergencyContactPerson,
          emergencyContactNumber,
          role: (user as any).role || 'tenant',
          createdAt: (user as any).createdAt || ''
        });
      } else {
        // Fallback when user not found
        setTenantProfile({
          name: tenantName,
          email: tenantEmail || '',
          phone: tenantPhone || '',
          profilePhoto, // Include the loaded photo
          role: 'tenant',
          createdAt: ''
        });
      }
    } catch (error) {
      console.error('❌ Error loading tenant profile:', error);
      
      // Try to at least load the photo - use provided tenantAvatar if available
      let errorPhoto = '';
      if (tenantAvatar && tenantAvatar.trim() && tenantAvatar.length > 10) {
        errorPhoto = tenantAvatar.trim();
      } else {
        try {
          const { loadUserProfilePhoto } = await import('../utils/user-profile-photos');
          const photoUri = await loadUserProfilePhoto(tenantId);
          if (photoUri && photoUri.trim() && photoUri.length > 10) {
            errorPhoto = photoUri.trim();
          }
        } catch (photoError) {
          console.log('⚠️ Could not load photo on error:', photoError);
        }
      }
      
      setTenantProfile({
        name: tenantName,
        email: tenantEmail || '',
        phone: tenantPhone || '',
        profilePhoto: errorPhoto,
        role: 'tenant',
        createdAt: ''
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTitleContainer}>
            <Ionicons name="person-circle" size={28} color="#3B82F6" />
            <Text style={styles.headerTitle}>Tenant Information</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={28} color="#6B7280" />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3B82F6" />
            <Text style={styles.loadingText}>Loading profile...</Text>
          </View>
        ) : tenantProfile ? (
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Profile Photo and Name */}
            <View style={styles.profileSection}>
              <View style={styles.avatarContainer}>
                {tenantProfile.profilePhoto && 
                 tenantProfile.profilePhoto.trim() && 
                 tenantProfile.profilePhoto.length > 10 && 
                 !imageError ? (
                  <Image
                    source={{ uri: tenantProfile.profilePhoto }}
                    style={styles.avatar}
                    onError={(error) => {
                      console.warn('⚠️ Profile photo failed to load', error.nativeEvent?.error || 'Unknown error');
                      setImageError(true);
                    }}
                    onLoad={() => {
                      console.log('✅ Profile photo loaded successfully');
                      setImageError(false);
                    }}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarText}>
                      {tenantProfile.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={styles.profileName}>{tenantProfile.name}</Text>
              <Text style={styles.profileRole}>
                {tenantProfile.role.charAt(0).toUpperCase() + tenantProfile.role.slice(1)}
              </Text>
            </View>

            {/* Contact Information */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Contact Information</Text>
              
              {tenantProfile.email && (
                <View style={styles.infoRow}>
                  <View style={styles.iconContainer}>
                    <Ionicons name="mail" size={20} color="#3B82F6" />
                  </View>
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Email</Text>
                    <Text style={styles.infoValue}>{tenantProfile.email}</Text>
                  </View>
                </View>
              )}

              {tenantProfile.phone && (
                <View style={styles.infoRow}>
                  <View style={styles.iconContainer}>
                    <Ionicons name="call" size={20} color="#3B82F6" />
                  </View>
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Phone</Text>
                    <Text style={styles.infoValue}>{tenantProfile.phone}</Text>
                  </View>
                </View>
              )}

              {tenantProfile.address && (
                <View style={styles.infoRow}>
                  <View style={styles.iconContainer}>
                    <Ionicons name="location" size={20} color="#3B82F6" />
                  </View>
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Address</Text>
                    <Text style={styles.infoValue}>{tenantProfile.address}</Text>
                  </View>
                </View>
              )}
            </View>

            {/* Personal Information */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Personal Information</Text>
              
              <View style={styles.infoRow}>
                <View style={styles.iconContainer}>
                  <Ionicons name="person" size={20} color="#10B981" />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Gender</Text>
                  <Text style={styles.infoValue}>
                    {tenantProfile.gender 
                      ? tenantProfile.gender.charAt(0).toUpperCase() + tenantProfile.gender.slice(1)
                      : 'Not specified'
                    }
                  </Text>
                </View>
              </View>

              <View style={styles.infoRow}>
                <View style={styles.iconContainer}>
                  <Ionicons name="people" size={20} color="#10B981" />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Family Type</Text>
                  <Text style={styles.infoValue}>
                    {tenantProfile.familyType 
                      ? tenantProfile.familyType.charAt(0).toUpperCase() + tenantProfile.familyType.slice(1)
                      : 'Not specified'
                    }
                  </Text>
                </View>
              </View>

              {(tenantProfile.emergencyContactPerson || tenantProfile.emergencyContactNumber) && (
                <>
                  {tenantProfile.emergencyContactPerson && (
                    <View style={styles.infoRow}>
                      <View style={styles.iconContainer}>
                        <Ionicons name="person" size={20} color="#EF4444" />
                      </View>
                      <View style={styles.infoContent}>
                        <Text style={styles.infoLabel}>Emergency Contact Person</Text>
                        <Text style={styles.infoValue}>{tenantProfile.emergencyContactPerson}</Text>
                      </View>
                    </View>
                  )}
                  
                  {tenantProfile.emergencyContactNumber && (
                    <View style={styles.infoRow}>
                      <View style={styles.iconContainer}>
                        <Ionicons name="call" size={20} color="#EF4444" />
                      </View>
                      <View style={styles.infoContent}>
                        <Text style={styles.infoLabel}>Emergency Contact Number</Text>
                        <Text style={styles.infoValue}>{tenantProfile.emergencyContactNumber}</Text>
                      </View>
                    </View>
                  )}
                </>
              )}
            </View>

            {/* Account Information */}
            {tenantProfile.createdAt && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Account Information</Text>
                <View style={styles.infoRow}>
                  <View style={styles.iconContainer}>
                    <Ionicons name="calendar" size={20} color="#10B981" />
                  </View>
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Member Since</Text>
                    <Text style={styles.infoValue}>
                      {new Date(tenantProfile.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </ScrollView>
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="person-circle-outline" size={64} color="#9CA3AF" />
            <Text style={styles.emptyTitle}>Profile Not Available</Text>
            <Text style={styles.emptyText}>
              Unable to load tenant profile information
            </Text>
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827'
  },
  closeButton: {
    padding: 4
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280'
  },
  content: {
    flex: 1,
    padding: 20
  },
  profileSection: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2
  },
  avatarContainer: {
    marginBottom: 16
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4
  },
  avatarText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#FFFFFF'
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4
  },
  profileRole: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500'
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  infoContent: {
    flex: 1
  },
  infoLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
    fontWeight: '500'
  },
  infoValue: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '500'
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    paddingHorizontal: 40
  }
});

export default TenantInfoModal;

