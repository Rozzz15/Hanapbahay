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

interface OwnerInfoModalProps {
  visible: boolean;
  ownerId: string;
  ownerName: string;
  ownerEmail?: string;
  ownerPhone?: string;
  ownerAvatar?: string;
  onClose: () => void;
}

interface OwnerProfile {
  name: string;
  email: string;
  phone?: string;
  profilePhoto?: string;
  businessName?: string;
  barangay?: string;
  role: string;
  createdAt: string;
}

const OwnerInfoModal: React.FC<OwnerInfoModalProps> = ({
  visible,
  ownerId,
  ownerName,
  ownerEmail,
  ownerPhone,
  ownerAvatar,
  onClose
}) => {
  const [ownerProfile, setOwnerProfile] = useState<OwnerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    if (visible && ownerId) {
      setImageError(false);
      loadOwnerProfile();
    }
  }, [visible, ownerId, ownerAvatar]);

  const loadOwnerProfile = async () => {
    try {
      setLoading(true);
      setImageError(false);
      
      // Try to load user data first
      const user = await db.get('users', ownerId);
      
      // Load profile photo
      let profilePhoto = '';
      
      if (ownerAvatar && ownerAvatar.trim() && ownerAvatar.length > 10) {
        profilePhoto = ownerAvatar.trim();
      }
      
      if (!profilePhoto || profilePhoto.length <= 10) {
        try {
          const { loadUserProfilePhoto } = await import('../utils/user-profile-photos');
          const photoUri = await loadUserProfilePhoto(ownerId);
          if (photoUri && photoUri.trim() && photoUri.length > 10) {
            profilePhoto = photoUri.trim();
          }
        } catch (error) {
          console.error('Error loading profile photo:', error);
        }
      }

      // Load owner profile data
      let businessName = '';
      let ownerPhoneFromProfile = '';
      let barangay = '';
      
      try {
        const ownerProfileData = await db.get('owners', ownerId);
        if (ownerProfileData) {
          businessName = (ownerProfileData as any).businessName || '';
          ownerPhoneFromProfile = (ownerProfileData as any).contactNumber || '';
        }
      } catch (error) {
        console.log('Could not load owner profile:', error);
      }

      // Try to get barangay from owner application
      try {
        const allApplications = await db.list('owner_applications');
        const ownerApp = allApplications.find((app: any) => app.userId === ownerId);
        if (ownerApp) {
          barangay = (ownerApp as any).barangay || '';
        }
      } catch (error) {
        console.log('Could not load owner application:', error);
      }

      if (user) {
        setOwnerProfile({
          name: (user as any).name || ownerName,
          email: (user as any).email || ownerEmail || '',
          phone: (user as any).phone || ownerPhoneFromProfile || ownerPhone || '',
          profilePhoto,
          businessName,
          barangay,
          role: (user as any).role || 'owner',
          createdAt: (user as any).createdAt || ''
        });
      } else {
        setOwnerProfile({
          name: ownerName,
          email: ownerEmail || '',
          phone: ownerPhone || '',
          profilePhoto,
          businessName,
          barangay,
          role: 'owner',
          createdAt: ''
        });
      }
    } catch (error) {
      console.error('Error loading owner profile:', error);
      setOwnerProfile({
        name: ownerName,
        email: ownerEmail || '',
        phone: ownerPhone || '',
        role: 'owner',
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
            <Ionicons name="business" size={28} color="#10B981" />
            <Text style={styles.headerTitle}>Owner Information</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={28} color="#6B7280" />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#10B981" />
            <Text style={styles.loadingText}>Loading profile...</Text>
          </View>
        ) : ownerProfile ? (
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Profile Photo and Name */}
            <View style={styles.profileSection}>
              <View style={styles.avatarContainer}>
                {ownerProfile.profilePhoto && 
                 ownerProfile.profilePhoto.trim() && 
                 ownerProfile.profilePhoto.length > 10 && 
                 !imageError ? (
                  <Image
                    source={{ uri: ownerProfile.profilePhoto }}
                    style={styles.avatar}
                    onError={() => setImageError(true)}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarText}>
                      {ownerProfile.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={styles.profileName}>{ownerProfile.name}</Text>
              <Text style={styles.profileRole}>Property Owner</Text>
            </View>

            {/* Business Information */}
            {ownerProfile.businessName && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Business Information</Text>
                <View style={styles.infoRow}>
                  <View style={[styles.iconContainer, { backgroundColor: '#ECFDF5' }]}>
                    <Ionicons name="storefront" size={20} color="#10B981" />
                  </View>
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Business Name</Text>
                    <Text style={styles.infoValue}>{ownerProfile.businessName}</Text>
                  </View>
                </View>
              </View>
            )}

            {/* Contact Information */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Contact Information</Text>
              
              {ownerProfile.email && (
                <View style={styles.infoRow}>
                  <View style={styles.iconContainer}>
                    <Ionicons name="mail" size={20} color="#3B82F6" />
                  </View>
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Email</Text>
                    <Text style={styles.infoValue}>{ownerProfile.email}</Text>
                  </View>
                </View>
              )}

              {ownerProfile.phone && (
                <View style={styles.infoRow}>
                  <View style={styles.iconContainer}>
                    <Ionicons name="call" size={20} color="#3B82F6" />
                  </View>
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Phone</Text>
                    <Text style={styles.infoValue}>{ownerProfile.phone}</Text>
                  </View>
                </View>
              )}

              {ownerProfile.barangay && (
                <View style={styles.infoRow}>
                  <View style={styles.iconContainer}>
                    <Ionicons name="location" size={20} color="#3B82F6" />
                  </View>
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Barangay</Text>
                    <Text style={styles.infoValue}>{ownerProfile.barangay}</Text>
                  </View>
                </View>
              )}
            </View>

            {/* Account Information */}
            {ownerProfile.createdAt && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Account Information</Text>
                <View style={styles.infoRow}>
                  <View style={[styles.iconContainer, { backgroundColor: '#ECFDF5' }]}>
                    <Ionicons name="calendar" size={20} color="#10B981" />
                  </View>
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Member Since</Text>
                    <Text style={styles.infoValue}>
                      {new Date(ownerProfile.createdAt).toLocaleDateString('en-US', {
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
              Unable to load owner profile information
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
    backgroundColor: '#10B981',
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
    color: '#10B981',
    fontWeight: '600'
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

export default OwnerInfoModal;




