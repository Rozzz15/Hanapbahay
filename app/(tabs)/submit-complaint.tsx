import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AlertTriangle, Camera, Video, X, ArrowLeft } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { sharedStyles, designTokens, iconBackgrounds } from '../../styles/owner-dashboard-styles';
import { getBookingsByTenant } from '../../utils/booking';
import { db } from '../../utils/db';
import { BookingRecord, PublishedListingRecord, TenantComplaintRecord } from '../../types';
import { createTenantComplaint, getComplaintCategoryLabel } from '../../utils/tenant-complaints';

const COMPLAINT_CATEGORIES: TenantComplaintRecord['category'][] = [
  'noise_complaint',
  'landlord_abuse',
  'unsanitary_conditions',
  'illegal_activities',
  'maintenance_neglect',
  'payment_dispute',
  'safety_concern',
  'neighbor_conflict',
];

const URGENCY_LEVELS: TenantComplaintRecord['urgency'][] = ['low', 'medium', 'high', 'urgent'];

export default function SubmitComplaintScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeBooking, setActiveBooking] = useState<BookingRecord | null>(null);
  const [property, setProperty] = useState<PublishedListingRecord | null>(null);
  
  const [formData, setFormData] = useState({
    category: '' as TenantComplaintRecord['category'] | '',
    description: '',
    propertyId: '',
    isAnonymous: false,
    urgency: 'medium' as TenantComplaintRecord['urgency'],
    photos: [] as string[],
    videos: [] as string[],
  });

  const loadData = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      
      // Get active booking - REQUIRED for submitting complaints
      const bookings = await getBookingsByTenant(user.id);
      const active = bookings.find(
        b => b.status === 'approved' && b.paymentStatus === 'paid'
      );
      
      if (!active) {
        // No active booking - redirect back
        Alert.alert(
          'No Active Rental',
          'You need to have an active rental booking to submit a complaint. Please contact your barangay directly if you have an urgent issue.',
          [
            {
              text: 'OK',
              onPress: () => router.back(),
            },
          ]
        );
        return;
      }

      // Set active booking and property automatically
      setActiveBooking(active);
      const propertyData = await db.get<PublishedListingRecord>('published_listings', active.propertyId);
      if (propertyData) {
        setProperty(propertyData);
        setFormData(prev => ({ ...prev, propertyId: active.propertyId }));
      } else {
        Alert.alert('Error', 'Property not found. Please try again.');
        router.back();
      }
    } catch (error) {
      console.error('❌ Error loading data:', error);
      Alert.alert('Error', 'Failed to load data. Please try again.');
      router.back();
    } finally {
      setLoading(false);
    }
  }, [user?.id, router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handlePickPhoto = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant camera roll access to attach photos.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets) {
        const newPhotos = result.assets.map(asset => asset.uri);
        setFormData(prev => ({
          ...prev,
          photos: [...prev.photos, ...newPhotos],
        }));
      }
    } catch (error) {
      console.error('Error picking photo:', error);
      Alert.alert('Error', 'Failed to pick photo. Please try again.');
    }
  };

  const handlePickVideo = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant camera roll access to attach videos.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsMultipleSelection: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets) {
        const newVideos = result.assets.map(asset => asset.uri);
        setFormData(prev => ({
          ...prev,
          videos: [...prev.videos, ...newVideos],
        }));
      }
    } catch (error) {
      console.error('Error picking video:', error);
      Alert.alert('Error', 'Failed to pick video. Please try again.');
    }
  };

  const handleRemovePhoto = (index: number) => {
    setFormData(prev => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index),
    }));
  };

  const handleRemoveVideo = (index: number) => {
    setFormData(prev => ({
      ...prev,
      videos: prev.videos.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async () => {
    if (!user?.id) {
      Alert.alert('Error', 'Please log in to submit a complaint.');
      return;
    }

    if (!formData.category) {
      Alert.alert('Required', 'Please select a complaint category.');
      return;
    }

    if (!formData.description.trim()) {
      Alert.alert('Required', 'Please provide a description of the complaint.');
      return;
    }

    if (!formData.propertyId || !activeBooking) {
      Alert.alert('Error', 'Property information not found. Please try again.');
      return;
    }

    try {
      setSubmitting(true);

      const complaint = await createTenantComplaint({
        tenantId: user.id,
        propertyId: formData.propertyId,
        bookingId: activeBooking?.id,
        category: formData.category,
        description: formData.description.trim(),
        photos: formData.photos,
        videos: formData.videos,
        isAnonymous: formData.isAnonymous,
        urgency: formData.urgency,
      });

      Alert.alert(
        'Complaint Submitted',
        'Your complaint has been submitted to the barangay. You can track its progress in the Complaint Tracking section.',
        [
          {
            text: 'OK',
            onPress: () => {
              router.back();
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error submitting complaint:', error);
      Alert.alert('Error', 'Failed to submit complaint. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={sharedStyles.container}>
        <View style={sharedStyles.loadingContainer}>
          <ActivityIndicator size="large" color={designTokens.colors.primary} />
          <Text style={sharedStyles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={sharedStyles.container}>
      <ScrollView style={sharedStyles.scrollView}>
        <View style={sharedStyles.pageContainer}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <ArrowLeft size={24} color={designTokens.colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Submit Complaint</Text>
            <View style={{ width: 40 }} />
          </View>

          <View style={sharedStyles.card}>
            <View style={{ gap: designTokens.spacing.md }}>
              {/* Complaint Category */}
              <View>
                <Text style={[styles.modalText, { marginBottom: designTokens.spacing.xs }]}>Complaint Category *</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: designTokens.spacing.xs }}>
                  {COMPLAINT_CATEGORIES.map((category) => (
                    <TouchableOpacity
                      key={category}
                      style={[
                        styles.categoryButton,
                        formData.category === category && styles.categoryButtonSelected,
                      ]}
                      onPress={() => setFormData(prev => ({ ...prev, category }))}
                    >
                      <Text
                        style={[
                          styles.categoryButtonText,
                          formData.category === category && styles.categoryButtonTextSelected,
                        ]}
                      >
                        {getComplaintCategoryLabel(category)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Description */}
              <View>
                <Text style={[styles.modalText, { marginBottom: designTokens.spacing.xs }]}>Description *</Text>
                <TextInput
                  style={[styles.modalInput, { minHeight: 100, textAlignVertical: 'top' }]}
                  placeholder="Describe the issue in detail..."
                  placeholderTextColor={designTokens.colors.textMuted}
                  multiline
                  numberOfLines={4}
                  maxLength={500}
                  value={formData.description}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
                />
              </View>
            </View>
          </View>

          {activeBooking && property && (
            <View style={sharedStyles.card}>
              <View style={{ gap: designTokens.spacing.md }}>
                <View>
                  <Text style={[styles.modalText, { marginBottom: designTokens.spacing.xs }]}>Property</Text>
                  <Text style={[styles.modalText, { fontSize: designTokens.typography.sm, color: designTokens.colors.textSecondary, marginBottom: designTokens.spacing.sm }]}>
                    Your current rental property
                  </Text>
                  
                  <View style={styles.propertyCard}>
                    <View style={styles.propertyInfoRow}>
                      <Text style={styles.propertyInfoLabel}>Property Name:</Text>
                      <Text style={styles.propertyInfoValue}>{activeBooking.propertyTitle || property.address}</Text>
                    </View>
                    
                    <View style={styles.propertyInfoRow}>
                      <Text style={styles.propertyInfoLabel}>Owner Name:</Text>
                      <Text style={styles.propertyInfoValue}>{activeBooking.ownerName || 'N/A'}</Text>
                    </View>
                    
                    <View style={styles.propertyInfoRow}>
                      <Text style={styles.propertyInfoLabel}>Contact Number:</Text>
                      <Text style={styles.propertyInfoValue}>{activeBooking.ownerPhone || 'N/A'}</Text>
                    </View>
                    
                    <View style={styles.propertyInfoRow}>
                      <Text style={styles.propertyInfoLabel}>Email:</Text>
                      <Text style={styles.propertyInfoValue}>{activeBooking.ownerEmail || 'N/A'}</Text>
                    </View>
                    
                    <View style={styles.propertyInfoRow}>
                      <Text style={styles.propertyInfoLabel}>Address:</Text>
                      <Text style={styles.propertyInfoValue}>{activeBooking.propertyAddress || property.address}</Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>
          )}

          <View style={sharedStyles.card}>
            <View>
              <Text style={[styles.modalText, { marginBottom: designTokens.spacing.xs }]}>Urgency Level</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: designTokens.spacing.xs }}>
                {URGENCY_LEVELS.map((urgency) => {
                  const urgencyStyle = formData.urgency === urgency ? (
                    urgency === 'low' ? styles.priorityButtonLow :
                    urgency === 'medium' ? styles.priorityButtonMedium :
                    urgency === 'high' ? styles.priorityButtonHigh :
                    styles.priorityButtonUrgent
                  ) : null;
                  
                  return (
                    <TouchableOpacity
                      key={urgency}
                      style={[
                        styles.priorityButton,
                        urgencyStyle
                      ]}
                      onPress={() => setFormData(prev => ({ ...prev, urgency }))}
                    >
                      <Text style={[
                        styles.priorityButtonText,
                        formData.urgency === urgency && styles.priorityButtonTextSelected,
                        urgencyStyle && {
                          color: urgency === 'low' ? '#10B981' :
                                 urgency === 'medium' ? '#F59E0B' :
                                 urgency === 'high' ? '#EF4444' :
                                 '#DC2626'
                        }
                      ]}>
                        {urgency.charAt(0).toUpperCase() + urgency.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>

          <View style={sharedStyles.card}>
            <View style={{ gap: designTokens.spacing.md }}>
              {/* Photos */}
              <View>
                <Text style={[styles.modalText, { marginBottom: designTokens.spacing.xs }]}>Photos</Text>
                <TouchableOpacity
                  style={styles.mediaButton}
                  onPress={handlePickPhoto}
                >
                  <Camera size={18} color={designTokens.colors.primary} />
                  <Text style={styles.mediaButtonText}>Add Photos</Text>
                </TouchableOpacity>
                {formData.photos.length > 0 && (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: designTokens.spacing.xs, marginTop: designTokens.spacing.sm }}>
                    {formData.photos.map((photo, index) => (
                      <View key={index} style={styles.mediaPreview}>
                        <Image source={{ uri: photo }} style={styles.mediaPreviewImage} />
                        <TouchableOpacity
                          style={styles.mediaRemoveButton}
                          onPress={() => handleRemovePhoto(index)}
                        >
                          <X size={16} color="#FFFFFF" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
              </View>

              {/* Videos */}
              <View>
                <Text style={[styles.modalText, { marginBottom: designTokens.spacing.xs }]}>Videos</Text>
                <TouchableOpacity
                  style={styles.mediaButton}
                  onPress={handlePickVideo}
                >
                  <Video size={18} color={designTokens.colors.primary} />
                  <Text style={styles.mediaButtonText}>Add Video</Text>
                </TouchableOpacity>
                {formData.videos.length > 0 && (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: designTokens.spacing.xs, marginTop: designTokens.spacing.sm }}>
                    {formData.videos.map((video, index) => (
                      <View key={index} style={styles.mediaPreview}>
                        <Video size={40} color={designTokens.colors.primary} />
                        <TouchableOpacity
                          style={styles.mediaRemoveButton}
                          onPress={() => handleRemoveVideo(index)}
                        >
                          <X size={16} color="#FFFFFF" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </View>
          </View>

          <View style={sharedStyles.card}>
            <TouchableOpacity
              style={styles.anonymousToggle}
              onPress={() => setFormData(prev => ({ ...prev, isAnonymous: !prev.isAnonymous }))}
            >
              <View style={[
                styles.checkbox,
                formData.isAnonymous && styles.checkboxChecked,
              ]}>
                {formData.isAnonymous && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.anonymousLabel}>Submit anonymously</Text>
                <Text style={styles.anonymousSubtext}>
                  Your name will not be shown to the barangay (if allowed)
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[
              sharedStyles.primaryButton,
              styles.submitButton,
              submitting && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <AlertTriangle size={20} color="#FFFFFF" />
                <Text style={sharedStyles.primaryButtonText}>Submit Complaint</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: designTokens.spacing.md,
    marginBottom: designTokens.spacing.md,
  },
  backButton: {
    padding: designTokens.spacing.xs,
  },
  headerTitle: {
    fontSize: designTokens.typography.xl,
    fontWeight: designTokens.typography.bold as any,
    color: designTokens.colors.textPrimary,
  },
  modalText: {
    fontSize: 16,
    color: '#374151',
    marginBottom: 16,
    fontWeight: '500',
    lineHeight: 20,
  },
  modalInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
  },
  categoryButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  categoryButtonSelected: {
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6',
    borderWidth: 2,
  },
  categoryButtonText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  categoryButtonTextSelected: {
    color: '#3B82F6',
    fontWeight: '600',
  },
  propertyCard: {
    padding: designTokens.spacing.md,
    borderRadius: designTokens.borderRadius.md,
    backgroundColor: designTokens.colors.background,
    borderWidth: 1,
    borderColor: designTokens.colors.border,
    gap: designTokens.spacing.sm,
  },
  propertyInfoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: designTokens.spacing.xs,
  },
  propertyInfoLabel: {
    fontSize: designTokens.typography.sm,
    fontWeight: designTokens.typography.semibold as any,
    color: designTokens.colors.textSecondary,
    width: 120,
    flexShrink: 0,
  },
  propertyInfoValue: {
    fontSize: designTokens.typography.sm,
    color: designTokens.colors.textPrimary,
    flex: 1,
  },
  priorityButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  priorityButtonLow: {
    backgroundColor: '#F0FDF4',
    borderColor: '#10B981',
    borderWidth: 2,
  },
  priorityButtonMedium: {
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
    borderWidth: 2,
  },
  priorityButtonHigh: {
    backgroundColor: '#FEE2E2',
    borderColor: '#EF4444',
    borderWidth: 2,
  },
  priorityButtonUrgent: {
    backgroundColor: '#FEE2E2',
    borderColor: '#DC2626',
    borderWidth: 2,
  },
  priorityButtonText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  priorityButtonTextSelected: {
    fontWeight: '600',
  },
  mediaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  mediaButtonText: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '500',
  },
  mediaPreview: {
    width: 80,
    height: 80,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaPreviewImage: {
    width: '100%',
    height: '100%',
  },
  mediaRemoveButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  anonymousToggle: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: designTokens.spacing.md,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: designTokens.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: designTokens.colors.primary,
    borderColor: designTokens.colors.primary,
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  anonymousLabel: {
    fontSize: designTokens.typography.base,
    fontWeight: designTokens.typography.semibold as any,
    color: designTokens.colors.textPrimary,
    marginBottom: designTokens.spacing.xs,
  },
  anonymousSubtext: {
    fontSize: designTokens.typography.sm,
    color: designTokens.colors.textSecondary,
  },
  submitButton: {
    marginTop: designTokens.spacing.lg,
    marginBottom: designTokens.spacing['2xl'],
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
});

