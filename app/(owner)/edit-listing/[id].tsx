import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Image, Modal, useWindowDimensions, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../../context/AuthContext';
import { db, generateId } from '../../../utils/db';
import * as ImagePicker from 'expo-image-picker';
import { 
  ArrowLeft, 
  Save, 
  CheckCircle, 
  Upload, 
  X, 
  Image as ImageIcon, 
  Video,
  Home,
  MapPin,
  Users,
  Phone,
  Mail,
  CreditCard,
  AlertCircle,
  Camera
} from 'lucide-react-native';
import { PROPERTY_TYPES, RENTAL_TYPES, AMENITIES, PAYMENT_METHODS, LEASE_TERMS } from '../../../types/property';
import { BARANGAYS } from '../../../constants/Barangays';
import { sharedStyles, designTokens } from '../../../styles/owner-dashboard-styles';
import { professionalStyles } from '../../../styles/create-listing-professional';
import { dispatchCustomEvent } from '../../../utils/custom-events';
import { showAlert } from '../../../utils/alert';
import { savePropertyMedia, loadPropertyMedia } from '../../../utils/media-storage';

interface ListingFormData {
  propertyType: string;
  rentalType: string;
  monthlyRent: string;
  availabilityStatus: 'available' | 'occupied' | 'reserved';
  leaseTerm: 'short-term' | 'long-term' | 'negotiable';
  address: string;
  barangay: string; // Barangay where property is located
  rooms: string;
  bathrooms: string;
  description: string;
  amenities: string[];
  rules: string[];
  advanceDepositMonths: string; // Optional: Number of months for advance deposit
  paymentMethods: string[];
  ownerName: string;
  businessName: string;
  contactNumber: string;
  email: string;
  emergencyContact: string;
  capacity: string; // Maximum number of tenants/slots (calculated from room capacities)
  roomCapacities: string[]; // Capacity per room
  coverPhoto: string | null;
  photos: string[];
  videos: string[];
}

export default function EditListing() {
  const { user } = useAuth();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const { id } = useLocalSearchParams();
  const listingId = Array.isArray(id) ? id[0] : id;
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [customRule, setCustomRule] = useState('');
  const [showBarangayDropdown, setShowBarangayDropdown] = useState(false);
  const [formData, setFormData] = useState<ListingFormData>({
    propertyType: '',
    rentalType: '',
    monthlyRent: '',
    availabilityStatus: 'available',
    leaseTerm: 'short-term',
    address: '',
    barangay: '', // Barangay selection
    rooms: '',
    bathrooms: '',
    description: '',
    amenities: [],
    rules: [],
    advanceDepositMonths: '', // Optional advance deposit months
    paymentMethods: [],
    ownerName: user?.name || '',
    businessName: '',
    contactNumber: '09123456789',
    email: user?.email || '',
    emergencyContact: '',
    capacity: '1', // Default capacity (calculated from room capacities)
    roomCapacities: [], // Capacity per room
    coverPhoto: null,
    photos: [],
    videos: []
  });

  // Load existing listing data
  useEffect(() => {
    loadListingData();
  }, [listingId]);

  // Manage room capacities array based on number of rooms
  useEffect(() => {
    if (formData.rooms && formData.rooms.trim() !== '') {
      const roomsCount = parseInt(formData.rooms);
      if (!isNaN(roomsCount) && roomsCount > 0) {
        setFormData(prev => {
          const currentCapacities = prev.roomCapacities || [];
          const newCapacities: string[] = [];
          
          // Initialize or adjust room capacities array
          for (let i = 0; i < roomsCount; i++) {
            // Keep existing capacity if available, otherwise default to '1'
            newCapacities[i] = currentCapacities[i] || '1';
          }
          
          // Calculate total capacity from room capacities
          const totalCapacity = newCapacities.reduce((sum, cap) => {
            const capNum = parseInt(cap) || 0;
            return sum + capNum;
          }, 0);
          
          return {
            ...prev,
            roomCapacities: newCapacities,
            capacity: totalCapacity > 0 ? totalCapacity.toString() : '1'
          };
        });
      }
    } else {
      // Reset if rooms is cleared
      setFormData(prev => ({
        ...prev,
        roomCapacities: [],
        capacity: '1'
      }));
    }
  }, [formData.rooms]); // Only trigger when rooms changes

  // Recalculate total capacity when individual room capacities change
  useEffect(() => {
    if (formData.roomCapacities && formData.roomCapacities.length > 0) {
      const totalCapacity = formData.roomCapacities.reduce((sum, cap) => {
        const capNum = parseInt(cap) || 0;
        return sum + capNum;
      }, 0);
      
      setFormData(prev => ({
        ...prev,
        capacity: totalCapacity > 0 ? totalCapacity.toString() : '1'
      }));
    }
  }, [formData.roomCapacities]);

  const loadListingData = async () => {
    if (!listingId || !user?.id) {
      showAlert('Error', 'Invalid listing ID or user not authenticated');
      router.back();
      return;
    }

    try {
      setLoading(true);
      console.log('📋 Loading listing:', listingId);

      // Get listing from database
      const listing = await db.get('published_listings', listingId);
      
      if (!listing) {
        showAlert('Error', 'Listing not found');
        router.back();
        return;
      }

      // Verify ownership
      if (listing.userId !== user.id) {
        showAlert('Error', 'You do not have permission to edit this listing');
        router.back();
        return;
      }

      // Load media
      const media = await loadPropertyMedia(listingId, user.id);

      // Populate form with existing data
      setFormData({
        propertyType: listing.propertyType || '',
        rentalType: listing.rentalType || '',
        monthlyRent: listing.monthlyRent?.toString() || '',
        availabilityStatus: listing.availabilityStatus || 'available',
        leaseTerm: listing.leaseTerm || 'short-term',
        address: listing.address || '',
        barangay: (listing as any).barangay || '', // Load barangay
        rooms: listing.rooms?.toString() || listing.bedrooms?.toString() || '',
        bathrooms: listing.bathrooms?.toString() || '',
        description: listing.description || '',
        amenities: listing.amenities || [],
        rules: listing.rules || [],
        advanceDepositMonths: listing.advanceDepositMonths?.toString() || '',
        paymentMethods: listing.paymentMethods || [],
        ownerName: listing.ownerName || user.name || '',
        businessName: listing.businessName || '',
        contactNumber: listing.contactNumber || '09123456789',
        email: listing.email || user.email || '',
        emergencyContact: listing.emergencyContact || '',
        capacity: (listing as any).capacity?.toString() || '1',
        roomCapacities: (listing as any).roomCapacities 
          ? (listing as any).roomCapacities.map((cap: number) => cap.toString())
          : [],
        coverPhoto: media.coverPhoto || listing.coverPhoto || null,
        photos: media.photos || listing.photos || [],
        videos: media.videos || listing.videos || []
      });

      console.log('✅ Listing data loaded successfully');
    } catch (error) {
      console.error('❌ Error loading listing:', error);
      showAlert('Error', 'Failed to load listing data');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const updateFormData = (field: keyof ListingFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleArrayItem = (field: 'amenities' | 'rules' | 'paymentMethods', item: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].includes(item)
        ? prev[field].filter(i => i !== item)
        : [...prev[field], item]
    }));
  };

  const addCustomRule = () => {
    if (customRule.trim()) {
      setFormData(prev => ({
        ...prev,
        rules: [...prev.rules, customRule.trim()]
      }));
      setCustomRule('');
    }
  };

  const removeRule = (ruleToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      rules: prev.rules.filter(rule => rule !== ruleToRemove)
    }));
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return !!(formData.propertyType && formData.rentalType && formData.monthlyRent);
      case 2:
        return !!(formData.address && formData.barangay && formData.description && formData.rooms && formData.bathrooms && formData.capacity && parseInt(formData.capacity) >= 1);
      case 3:
        return !!(formData.ownerName && formData.contactNumber && formData.email);
      case 4:
        return !!(formData.paymentMethods.length > 0);
      case 5:
        return true;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 5));
    } else {
      showAlert('Validation Error', 'Please fill in all required fields');
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  // Image Picker Functions
  const pickCoverPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showAlert('Permission Required', 'Please grant permission to access your photos');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      updateFormData('coverPhoto', result.assets[0].uri);
    }
  };

  const pickPhotos = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showAlert('Permission Required', 'Please grant permission to access your photos');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets) {
      const newPhotos = result.assets.map(asset => asset.uri);
      updateFormData('photos', [...formData.photos, ...newPhotos]);
    }
  };

  const pickVideos = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showAlert('Permission Required', 'Please grant permission to access your videos');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      allowsEditing: false,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      updateFormData('videos', [...formData.videos, result.assets[0].uri]);
    }
  };

  const removePhoto = (index: number) => {
    const newPhotos = formData.photos.filter((_, i) => i !== index);
    updateFormData('photos', newPhotos);
  };

  const removeVideo = (index: number) => {
    const newVideos = formData.videos.filter((_, i) => i !== index);
    updateFormData('videos', newVideos);
  };

  const handleSubmit = async () => {
    if (!user?.id || !listingId) {
      showAlert('Error', 'User not authenticated or invalid listing ID');
      return;
    }

    if (!validateStep(5)) {
      showAlert('Validation Error', 'Please fill in all required fields');
      return;
    }

    try {
      setSaving(true);
      console.log('💾 Updating listing:', listingId);

      const now = new Date().toISOString();

      const listingData = {
        id: listingId,
        userId: user.id,
        ownerUserId: user.id,
        propertyType: formData.propertyType,
        rentalType: formData.rentalType,
        monthlyRent: parseFloat(formData.monthlyRent),
        price: parseFloat(formData.monthlyRent),
        availabilityStatus: formData.availabilityStatus,
        leaseTerm: formData.leaseTerm,
        address: formData.address,
        barangay: formData.barangay.trim().toUpperCase(), // Use selected barangay from dropdown (trim and uppercase to avoid whitespace/case issues)
        title: `${formData.propertyType} in ${formData.address.split(',')[0]}`,
        location: formData.address.split(',')[0] || 'Location not specified',
        rooms: parseInt(formData.rooms),
        bathrooms: parseInt(formData.bathrooms),
        capacity: parseInt(formData.capacity) || 1,
        roomCapacities: formData.roomCapacities.map(cap => parseInt(cap) || 1), // Capacity per room
        size: 0,
        rating: 4.5,
        reviews: 0,
        description: formData.description,
        amenities: formData.amenities,
        rules: formData.rules,
        securityDeposit: 0, // Security deposit feature removed
        advanceDepositMonths: formData.advanceDepositMonths ? parseInt(formData.advanceDepositMonths) : undefined,
        paymentMethods: formData.paymentMethods,
        ownerName: formData.ownerName,
        businessName: formData.businessName || '',
        contactNumber: formData.contactNumber,
        email: formData.email,
        emergencyContact: formData.emergencyContact || '',
        status: 'published',
        publishedAt: now,
        coverPhoto: formData.coverPhoto || null,
        photos: formData.photos || [],
        videos: formData.videos || [],
        views: 0,
        inquiries: 0,
        updatedAt: now
      };

      // Update in database
      await db.upsert('published_listings', listingId, listingData);

      // Update media
      await savePropertyMedia(listingId, user.id, {
        coverPhoto: formData.coverPhoto,
        photos: formData.photos || [],
        videos: formData.videos || []
      });

      // Update owner profile with business name if provided
      if (formData.businessName && formData.businessName.trim() !== '') {
        try {
          const existingProfile = await db.get('owner_profiles', user.id) as any;
          if (existingProfile) {
            await db.upsert('owner_profiles', user.id, {
              ...existingProfile,
              businessName: formData.businessName.trim(),
              contactNumber: formData.contactNumber,
              email: formData.email,
              updatedAt: now
            });
            console.log('✅ Owner profile updated with business name:', formData.businessName);
          } else {
            // Create new owner profile if it doesn't exist
            await db.upsert('owner_profiles', user.id, {
              userId: user.id,
              businessName: formData.businessName.trim(),
              contactNumber: formData.contactNumber,
              email: formData.email,
              createdAt: now
            });
            console.log('✅ New owner profile created with business name:', formData.businessName);
          }
        } catch (profileError) {
          console.error('⚠️ Could not update owner profile:', profileError);
          // Don't fail the listing update if profile update fails
        }
      }

      // Clear cache
      const { clearCache } = await import('../../../utils/db');
      await clearCache();

      // Dispatch event to notify other components
      dispatchCustomEvent('listingChanged', { 
        action: 'updated', 
        listingId, 
        userId: user.id,
        timestamp: now
      });

      showAlert(
        'Success! 🎉',
        'Your property listing has been updated successfully!',
        [
          {
            text: 'Back to Listings',
            onPress: () => router.replace('/(owner)/listings')
          }
        ]
      );
    } catch (error) {
      console.error('❌ Error updating listing:', error);
      showAlert(
        'Error', 
        'Failed to update listing. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setSaving(false);
    }
  };

  // Copy all render functions from create-listing.tsx
  const renderStep1 = () => (
    <View style={professionalStyles.stepContent}>
      <View style={professionalStyles.sectionHeader}>
        <View style={professionalStyles.sectionIcon}>
          <Home size={20} color={designTokens.colors.primary} />
        </View>
        <Text style={professionalStyles.sectionTitle}>Property Information</Text>
      </View>
      
      <View style={professionalStyles.inputGroup}>
        <Text style={professionalStyles.inputLabel}>Property Type *</Text>
        <View style={[professionalStyles.optionsGrid, { marginTop: 8, marginBottom: 16, gap: 8 }]}>
          {PROPERTY_TYPES.map((type) => (
            <TouchableOpacity
              key={type}
              style={[
                professionalStyles.propertyOptionCard,
                isMobile && { minWidth: '47%', maxWidth: '47%' },
                formData.propertyType === type && professionalStyles.propertyOptionCardActive
              ]}
              onPress={() => updateFormData('propertyType', type)}
            >
              <Text style={[
                professionalStyles.propertyOptionText,
                formData.propertyType === type && professionalStyles.propertyOptionTextActive
              ]}>
                {type}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={[professionalStyles.inputGroup, { marginTop: 8 }]}>
        <Text style={professionalStyles.inputLabel}>Rental Type *</Text>
        <View style={[professionalStyles.optionsGrid, { marginTop: 8, marginBottom: 16, gap: 8 }]}>
          {RENTAL_TYPES.map((type) => (
            <TouchableOpacity
              key={type}
              style={[
                professionalStyles.propertyOptionCard,
                isMobile && { minWidth: '47%', maxWidth: '47%' },
                formData.rentalType === type && professionalStyles.propertyOptionCardActive
              ]}
              onPress={() => updateFormData('rentalType', type)}
            >
              <Text style={[
                professionalStyles.propertyOptionText,
                formData.rentalType === type && professionalStyles.propertyOptionTextActive
              ]}>
                {type}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={[professionalStyles.inputGroup, { marginTop: 8 }]}>
        <Text style={professionalStyles.inputLabel}>Monthly Rent (₱) *</Text>
        <View style={professionalStyles.inputContainer}>
          <View style={professionalStyles.inputIcon}>
            <Text style={{ fontSize: 18, color: designTokens.colors.textMuted }}>₱</Text>
          </View>
          <TextInput
            style={[professionalStyles.input, professionalStyles.inputWithIcon]}
            placeholder="Enter monthly rent"
            value={formData.monthlyRent}
            onChangeText={(value) => updateFormData('monthlyRent', value)}
            keyboardType="numeric"
          />
        </View>
      </View>

      <View style={[professionalStyles.inputGroup, { marginTop: 8 }]}>
        <Text style={professionalStyles.inputLabel}>Availability Status</Text>
        <View style={[professionalStyles.optionsGrid, { marginTop: 8, marginBottom: 16, gap: 8 }]}>
          {(['available', 'occupied', 'reserved'] as const).map((status) => (
            <TouchableOpacity
              key={status}
              style={[
                professionalStyles.availabilityOptionCard,
                formData.availabilityStatus === status && professionalStyles.availabilityOptionCardActive
              ]}
              onPress={() => updateFormData('availabilityStatus', status)}
            >
              <Text style={[
                professionalStyles.availabilityOptionText,
                formData.availabilityStatus === status && professionalStyles.availabilityOptionTextActive
              ]}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={[professionalStyles.inputGroup, { marginTop: 8 }]}>
        <Text style={professionalStyles.inputLabel}>Lease Term</Text>
        <View style={[professionalStyles.optionsGrid, { marginTop: 8, marginBottom: 16 }]}>
          {LEASE_TERMS.map((term) => (
            <TouchableOpacity
              key={term}
              style={[
                professionalStyles.optionCard,
                isMobile && { minWidth: '47%', maxWidth: '47%' },
                formData.leaseTerm === term.toLowerCase().split(' ')[0] && professionalStyles.optionCardActive
              ]}
              onPress={() => updateFormData('leaseTerm', term.toLowerCase().split(' ')[0] as any)}
            >
              <Text style={[
                professionalStyles.optionText,
                formData.leaseTerm === term.toLowerCase().split(' ')[0] && professionalStyles.optionTextActive
              ]}>
                {term}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

    </View>
  );

  const renderStep2 = () => (
    <View style={professionalStyles.stepContent}>
      <View style={professionalStyles.sectionHeader}>
        <View style={professionalStyles.sectionIcon}>
          <MapPin size={20} color={designTokens.colors.primary} />
        </View>
        <Text style={professionalStyles.sectionTitle}>Property Details</Text>
      </View>
      
      <View style={professionalStyles.inputGroup}>
        <Text style={professionalStyles.inputLabel}>Address *</Text>
        <View style={professionalStyles.inputContainer}>
          <View style={professionalStyles.inputIcon}>
            <MapPin size={18} color={designTokens.colors.textMuted} />
          </View>
          <TextInput
            style={[professionalStyles.input, professionalStyles.inputWithIcon, professionalStyles.inputMultiline]}
            placeholder="Enter complete address"
            value={formData.address}
            onChangeText={(value) => updateFormData('address', value)}
            multiline
            numberOfLines={3}
          />
        </View>
      </View>

      <View style={{ marginBottom: 24 }} />

      <View style={professionalStyles.inputGroup}>
        <Text style={professionalStyles.inputLabel}>Barangay *</Text>
        <TouchableOpacity
          onPress={() => setShowBarangayDropdown(true)}
          style={{
            borderWidth: 1,
            borderColor: formData.barangay ? designTokens.colors.primary : designTokens.colors.border,
            borderRadius: 12,
            backgroundColor: 'white',
            paddingVertical: 14,
            paddingHorizontal: 16,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Text style={{
            fontSize: 16,
            color: formData.barangay ? designTokens.colors.text : designTokens.colors.textMuted,
            fontWeight: formData.barangay ? '500' : '400',
          }}>
            {formData.barangay || 'Select Barangay'}
          </Text>
          <Text style={{
            fontSize: 16,
            color: designTokens.colors.textMuted,
          }}>▼</Text>
        </TouchableOpacity>
        {formData.barangay && (
          <Text style={{ marginTop: 8, fontSize: 14, color: designTokens.colors.success }}>
            ✓ Selected: {formData.barangay}
          </Text>
        )}

        {/* Barangay Dropdown Modal */}
        <Modal
          visible={showBarangayDropdown}
          transparent
          animationType="slide"
          onRequestClose={() => setShowBarangayDropdown(false)}
        >
          <View style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'flex-end',
          }}>
            <View style={{
              backgroundColor: 'white',
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              maxHeight: '70%',
            }}>
              <View style={{
                padding: 20,
                borderBottomWidth: 1,
                borderBottomColor: '#eee',
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <Text style={{
                  fontSize: 18,
                  fontWeight: 'bold',
                  color: designTokens.colors.text,
                }}>
                  Select Barangay
                </Text>
                <TouchableOpacity onPress={() => setShowBarangayDropdown(false)}>
                  <Text style={{
                    fontSize: 16,
                    color: designTokens.colors.primary,
                    fontWeight: '600',
                  }}>
                    Done
                  </Text>
                </TouchableOpacity>
              </View>
              
              <ScrollView style={{ maxHeight: 400 }}>
                {BARANGAYS.map((brgy) => (
                  <TouchableOpacity
                    key={brgy}
                    style={{
                      paddingVertical: 16,
                      paddingHorizontal: 20,
                      backgroundColor: formData.barangay === brgy ? designTokens.colors.primaryLight : 'white',
                      borderBottomWidth: 1,
                      borderBottomColor: '#f0f0f0',
                    }}
                    onPress={() => {
                      updateFormData('barangay', brgy);
                      setShowBarangayDropdown(false);
                    }}
                  >
                    <Text style={{
                      fontSize: 16,
                      color: formData.barangay === brgy ? designTokens.colors.primary : designTokens.colors.text,
                      fontWeight: formData.barangay === brgy ? '600' : '400',
                    }}>
                      {brgy}
                      {formData.barangay === brgy && ' ✓'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>

      <View style={professionalStyles.inputGroup}>
        <Text style={professionalStyles.inputLabel}>Description *</Text>
        <TextInput
          style={[professionalStyles.input, professionalStyles.inputMultiline]}
          placeholder="Describe your property, its features, and what makes it special..."
          value={formData.description}
          onChangeText={(value) => updateFormData('description', value)}
          multiline
          numberOfLines={4}
        />
      </View>

      <View style={{
        flexDirection: isMobile ? 'column' : 'row',
        gap: 16,
        marginTop: 8,
        marginBottom: 24,
        alignItems: 'flex-start',
      }}>
        <View style={{ flex: isMobile ? 0 : 1, width: isMobile ? '100%' : undefined }}>
          <Text style={[professionalStyles.inputLabel, { marginBottom: 10 }]}>Rooms *</Text>
          <View style={[professionalStyles.inputContainer, { minHeight: 50 }]}>
            <View style={professionalStyles.inputIcon}>
              <Home size={18} color={designTokens.colors.textMuted} />
            </View>
            <TextInput
              style={[professionalStyles.input, professionalStyles.inputWithIcon, { height: 50 }]}
              placeholder="Number of rooms"
              value={formData.rooms}
              onChangeText={(value) => updateFormData('rooms', value)}
              keyboardType="numeric"
            />
          </View>
        </View>
        <View style={{ flex: isMobile ? 0 : 1, width: isMobile ? '100%' : undefined }}>
          <Text style={[professionalStyles.inputLabel, { marginBottom: 10 }]}>Bathrooms *</Text>
          <View style={[professionalStyles.inputContainer, { minHeight: 50 }]}>
            <View style={professionalStyles.inputIcon}>
              <Home size={18} color={designTokens.colors.textMuted} />
            </View>
            <TextInput
              style={[professionalStyles.input, professionalStyles.inputWithIcon, { height: 50 }]}
              placeholder="Number of bathrooms"
              value={formData.bathrooms}
              onChangeText={(value) => updateFormData('bathrooms', value)}
              keyboardType="numeric"
            />
          </View>
        </View>
      </View>

      {/* Room Capacity Inputs - Only show when rooms are entered */}
      {formData.rooms && parseInt(formData.rooms) > 0 && formData.roomCapacities.length > 0 && (
        <View style={professionalStyles.inputGroup}>
          <Text style={[professionalStyles.inputLabel, { marginBottom: 10 }]}>
            Capacity per Room (Slots) *
          </Text>
          <Text style={[professionalStyles.inputHelper, { marginBottom: 16 }]}>
            Set how many tenants can occupy each room. Total capacity: {formData.capacity} slot(s)
          </Text>
          <View style={{ gap: isMobile ? 16 : 12 }}>
            {formData.roomCapacities.map((capacity, index) => (
              <View key={index} style={{
                flexDirection: isMobile ? 'column' : 'row',
                alignItems: isMobile ? 'stretch' : 'center',
                gap: isMobile ? 12 : 12,
                padding: isMobile ? 16 : 12,
                backgroundColor: designTokens.colors.background,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: designTokens.colors.border,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.05,
                shadowRadius: 2,
                elevation: 1,
              }}>
                {/* Room Header - Badge and Label */}
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  marginBottom: isMobile ? 0 : 0,
                }}>
                  <View style={{
                    width: isMobile ? 36 : 32,
                    height: isMobile ? 36 : 32,
                    borderRadius: 18,
                    backgroundColor: designTokens.colors.primaryLight,
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <Text style={{
                      fontSize: isMobile ? 15 : 14,
                      fontWeight: '600',
                      color: designTokens.colors.primary,
                    }}>
                      {index + 1}
                    </Text>
                  </View>
                  <Text style={{
                    flex: 1,
                    fontSize: isMobile ? 16 : 15,
                    color: designTokens.colors.text,
                    fontWeight: '600',
                  }}>
                    Room {index + 1}
                  </Text>
                </View>

                {/* Input Section */}
                <View style={{
                  flexDirection: isMobile ? 'column' : 'row',
                  alignItems: isMobile ? 'stretch' : 'center',
                  gap: isMobile ? 8 : 8,
                  flex: 1,
                }}>
                  <View style={[professionalStyles.inputContainer, { 
                    minHeight: isMobile ? 48 : 44,
                    flex: 1,
                    maxWidth: isMobile ? '100%' : 140,
                    width: isMobile ? '100%' : undefined,
                  }]}>
                    <View style={professionalStyles.inputIcon}>
                      <Users size={isMobile ? 18 : 16} color={designTokens.colors.textMuted} />
                    </View>
                    <TextInput
                      style={[
                        professionalStyles.input, 
                        professionalStyles.inputWithIcon, 
                        { 
                          height: isMobile ? 48 : 44, 
                          fontSize: isMobile ? 16 : 15,
                          color: '#111827'
                        }
                      ]}
                      placeholder="1"
                      placeholderTextColor="#9CA3AF"
                      value={capacity}
                      onChangeText={(value) => {
                        const newCapacities = [...formData.roomCapacities];
                        newCapacities[index] = value;
                        setFormData(prev => ({
                          ...prev,
                          roomCapacities: newCapacities
                        }));
                      }}
                      keyboardType="numeric"
                    />
                  </View>
                  <Text style={{
                    fontSize: isMobile ? 15 : 14,
                    color: designTokens.colors.textMuted,
                    alignSelf: isMobile ? 'flex-start' : 'center',
                    marginTop: isMobile ? 4 : 0,
                    paddingLeft: isMobile ? 4 : 0,
                  }}>
                    slot{parseInt(capacity) !== 1 ? 's' : ''}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      <View style={professionalStyles.inputGroup}>
        <Text style={professionalStyles.inputLabel}>Amenities</Text>
        <Text style={[professionalStyles.inputHelper, { marginBottom: 12 }]}>
          Select all amenities available in your property
        </Text>
        <View style={[professionalStyles.optionsGrid, { marginTop: 0, marginBottom: 0, gap: 8 }]}>
          {AMENITIES.map((amenity) => (
            <TouchableOpacity
              key={amenity}
              style={[
                professionalStyles.amenityOptionCard,
                isMobile && { minWidth: '47%', maxWidth: '47%' },
                formData.amenities.includes(amenity) && professionalStyles.amenityOptionCardActive
              ]}
              onPress={() => toggleArrayItem('amenities', amenity)}
            >
              <Text style={[
                professionalStyles.amenityOptionText,
                formData.amenities.includes(amenity) && professionalStyles.amenityOptionTextActive
              ]}>
                {amenity}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={professionalStyles.inputGroup}>
        <Text style={professionalStyles.inputLabel}>House Rules</Text>
        <Text style={professionalStyles.inputHelper}>
          Add custom house rules for your property
        </Text>
        
        <View style={professionalStyles.inputContainer}>
          <TextInput
            style={professionalStyles.input}
            placeholder="Enter a house rule (e.g., No smoking, No pets, etc.)"
            value={customRule}
            onChangeText={setCustomRule}
            multiline={false}
          />
          <TouchableOpacity
            style={[professionalStyles.primaryButton, { marginTop: 12 }]}
            onPress={addCustomRule}
            disabled={!customRule.trim()}
          >
            <Text style={professionalStyles.primaryButtonText}>Add Rule</Text>
          </TouchableOpacity>
        </View>

        {formData.rules.length > 0 && (
          <View style={{ marginTop: 16 }}>
            <Text style={[professionalStyles.inputLabel, { marginBottom: 12 }]}>
              Added Rules ({formData.rules.length})
            </Text>
            <View style={{ gap: 8 }}>
              {formData.rules.map((rule, index) => (
                <View key={index} style={professionalStyles.ruleItem}>
                  <Text style={professionalStyles.ruleText}>{rule}</Text>
                  <TouchableOpacity
                    style={professionalStyles.ruleRemoveButton}
                    onPress={() => removeRule(rule)}
                  >
                    <X size={16} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View style={professionalStyles.stepContent}>
      <View style={professionalStyles.sectionHeader}>
        <View style={professionalStyles.sectionIcon}>
          <Users size={20} color={designTokens.colors.primary} />
        </View>
        <Text style={professionalStyles.sectionTitle}>Contact Information</Text>
      </View>
      
      <View style={professionalStyles.inputGroup}>
        <Text style={professionalStyles.inputLabel}>Owner Name *</Text>
        <View style={professionalStyles.inputContainer}>
          <View style={professionalStyles.inputIcon}>
            <Users size={18} color={designTokens.colors.textMuted} />
          </View>
          <TextInput
            style={[professionalStyles.input, professionalStyles.inputWithIcon]}
            placeholder="Enter owner's full name"
            value={formData.ownerName}
            onChangeText={(value) => updateFormData('ownerName', value)}
          />
        </View>
      </View>

      <View style={professionalStyles.inputGroup}>
        <Text style={professionalStyles.inputLabel}>Business Name</Text>
        <TextInput
          style={professionalStyles.input}
          placeholder="Enter business name (optional)"
          value={formData.businessName}
          onChangeText={(value) => updateFormData('businessName', value)}
        />
      </View>

      <View style={professionalStyles.inputGroup}>
        <Text style={professionalStyles.inputLabel}>Contact Number *</Text>
        <View style={professionalStyles.inputContainer}>
          <View style={professionalStyles.inputIcon}>
            <Phone size={18} color={designTokens.colors.textMuted} />
          </View>
          <TextInput
            style={[professionalStyles.input, professionalStyles.inputWithIcon]}
            placeholder="Enter contact number"
            value={formData.contactNumber}
            onChangeText={(value) => updateFormData('contactNumber', value)}
            keyboardType="phone-pad"
          />
        </View>
      </View>

      <View style={professionalStyles.inputGroup}>
        <Text style={professionalStyles.inputLabel}>Email Address *</Text>
        <View style={professionalStyles.inputContainer}>
          <View style={professionalStyles.inputIcon}>
            <Mail size={18} color={designTokens.colors.textMuted} />
          </View>
          <TextInput
            style={[professionalStyles.input, professionalStyles.inputWithIcon]}
            placeholder="Enter email address"
            value={formData.email}
            onChangeText={(value) => updateFormData('email', value)}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>
      </View>

      <View style={professionalStyles.inputGroup}>
        <Text style={professionalStyles.inputLabel}>Emergency Contact</Text>
        <View style={professionalStyles.inputContainer}>
          <View style={professionalStyles.inputIcon}>
            <Phone size={18} color={designTokens.colors.textMuted} />
          </View>
          <TextInput
            style={[professionalStyles.input, professionalStyles.inputWithIcon]}
            placeholder="Enter emergency contact number"
            value={formData.emergencyContact}
            onChangeText={(value) => updateFormData('emergencyContact', value)}
            keyboardType="phone-pad"
          />
        </View>
      </View>
    </View>
  );

  const renderStep4 = () => (
    <View style={professionalStyles.stepContent}>
      <View style={professionalStyles.sectionHeader}>
        <View style={professionalStyles.sectionIcon}>
          <Text style={{ fontSize: 20, color: designTokens.colors.primary }}>₱</Text>
        </View>
        <Text style={professionalStyles.sectionTitle}>Pricing & Payment</Text>
      </View>
      
      <View style={professionalStyles.inputGroup}>
        <Text style={professionalStyles.inputLabel}>Advance Deposit Months (Optional)</Text>
        <Text style={[professionalStyles.inputHelper, { marginBottom: 8 }]}>
          Number of months tenant pays in advance (e.g., 3 months). If set, tenant can use these months if they want to leave early.
        </Text>
        <View style={professionalStyles.inputContainer}>
          <TextInput
            style={professionalStyles.input}
            placeholder="Enter number of months (e.g., 3)"
            value={formData.advanceDepositMonths}
            onChangeText={(value) => updateFormData('advanceDepositMonths', value)}
            keyboardType="numeric"
          />
        </View>
        <Text style={[professionalStyles.inputHelper, { marginTop: 4 }]}>
          Leave empty if you don't require advance deposit. If tenant pays 3 months advance, they can use those months if they want to leave early.
        </Text>
      </View>

      <View style={professionalStyles.inputGroup}>
        <Text style={professionalStyles.inputLabel}>Accepted Payment Methods *</Text>
        <Text style={[professionalStyles.inputHelper, { marginBottom: 12 }]}>
          Select all payment methods you accept
        </Text>
        <View style={[professionalStyles.optionsGrid, { marginTop: 0, marginBottom: 0 }]}>
          {PAYMENT_METHODS.map((method) => (
            <TouchableOpacity
              key={method}
              style={[
                professionalStyles.optionCard,
                isMobile && { minWidth: '47%', maxWidth: '47%' },
                formData.paymentMethods.includes(method) && professionalStyles.optionCardActive
              ]}
              onPress={() => toggleArrayItem('paymentMethods', method)}
            >
              <Text style={[
                professionalStyles.optionText,
                formData.paymentMethods.includes(method) && professionalStyles.optionTextActive
              ]}>
                {method}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );

  const renderStep5 = () => (
    <View style={professionalStyles.stepContent}>
      <View style={professionalStyles.sectionHeader}>
        <View style={professionalStyles.sectionIcon}>
          <ImageIcon size={20} color={designTokens.colors.primary} />
        </View>
        <Text style={professionalStyles.sectionTitle}>Media & Photos</Text>
      </View>
      
      {/* Cover Photo */}
      <View style={professionalStyles.inputGroup}>
        <Text style={professionalStyles.inputLabel}>Cover Photo</Text>
        <Text style={professionalStyles.inputHelper}>
          This will be the main image shown on your listing
        </Text>
        
        {formData.coverPhoto ? (
          <View style={{ position: 'relative', marginTop: 12 }}>
            <Image 
              source={{ uri: formData.coverPhoto }} 
              style={{
                width: '100%',
                height: 200,
                borderRadius: 12,
                backgroundColor: '#f5f5f5'
              }}
              resizeMode="cover"
            />
            <TouchableOpacity
              style={{
                position: 'absolute',
                top: 8,
                right: 8,
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: 'rgba(239, 68, 68, 0.9)',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              onPress={() => updateFormData('coverPhoto', null)}
            >
              <X size={18} color="white" />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={professionalStyles.uploadCard}
            onPress={pickCoverPhoto}
          >
            <View style={professionalStyles.uploadIcon}>
              <Upload size={24} color={designTokens.colors.primary} />
            </View>
            <Text style={professionalStyles.uploadTitle}>Upload Cover Photo</Text>
            <Text style={professionalStyles.uploadSubtitle}>
              Tap to select a cover photo for your listing
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Property Photos */}
      <View style={professionalStyles.inputGroup}>
        <Text style={professionalStyles.inputLabel}>
          Property Photos ({formData.photos?.length || 0}/10)
        </Text>
        <Text style={professionalStyles.inputHelper}>
          Add multiple photos to showcase your property
        </Text>
        
        {formData.photos?.length > 0 && (
          <View style={professionalStyles.photoGrid}>
            {formData.photos.map((photo, index) => (
              <View key={index} style={professionalStyles.photoCard}>
                <Image 
                  source={{ uri: photo }} 
                  style={professionalStyles.photoImage}
                  resizeMode="cover"
                />
                <TouchableOpacity
                  style={professionalStyles.photoRemoveButton}
                  onPress={() => removePhoto(index)}
                >
                  <X size={12} color="white" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
        
        {formData.photos?.length < 10 && (
          <TouchableOpacity
            style={[professionalStyles.uploadCard, { marginTop: 12 }]}
            onPress={pickPhotos}
          >
            <View style={professionalStyles.uploadIcon}>
              <ImageIcon size={20} color={designTokens.colors.primary} />
            </View>
            <Text style={professionalStyles.uploadTitle}>Add Photos</Text>
            <Text style={professionalStyles.uploadSubtitle}>
              Tap to select multiple photos
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Property Videos */}
      <View style={professionalStyles.inputGroup}>
        <Text style={professionalStyles.inputLabel}>
          Property Videos ({formData.videos?.length || 0}/3)
        </Text>
        <Text style={professionalStyles.inputHelper}>
          Optional: Add video tours of your property
        </Text>
        
        {formData.videos?.map((video, index) => (
          <View key={index} style={{ 
            flexDirection: 'row', 
            alignItems: 'center', 
            padding: designTokens.spacing.md,
            backgroundColor: designTokens.colors.background,
            borderRadius: designTokens.borderRadius.md,
            marginBottom: designTokens.spacing.sm
          }}>
            <Video size={20} color={designTokens.colors.primary} />
            <Text style={[sharedStyles.statLabel, { flex: 1, marginLeft: designTokens.spacing.sm }]} numberOfLines={1}>
              Video {index + 1}
            </Text>
            <TouchableOpacity onPress={() => removeVideo(index)}>
              <X size={20} color={designTokens.colors.error} />
            </TouchableOpacity>
          </View>
        ))}
        
        {formData.videos?.length < 3 && (
          <TouchableOpacity
            style={[professionalStyles.uploadCard, { marginTop: 12 }]}
            onPress={pickVideos}
          >
            <View style={professionalStyles.uploadIcon}>
              <Video size={20} color={designTokens.colors.primary} />
            </View>
            <Text style={professionalStyles.uploadTitle}>Add Video</Text>
            <Text style={professionalStyles.uploadSubtitle}>
              Tap to select a video tour
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return renderStep1();
      case 2:
        return renderStep2();
      case 3:
        return renderStep3();
      case 4:
        return renderStep4();
      case 5:
        return renderStep5();
      default:
        return renderStep1();
    }
  };

  if (loading) {
    return (
      <View style={[sharedStyles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={designTokens.colors.primary} />
        <Text style={{ marginTop: 16, fontSize: 16, color: designTokens.colors.textSecondary }}>
          Loading listing data...
        </Text>
      </View>
    );
  }

  return (
    <View style={sharedStyles.container}>
      {/* Professional Header */}
      <View style={professionalStyles.professionalHeader}>
        <View style={professionalStyles.headerRow}>
          <TouchableOpacity 
            style={professionalStyles.backButton}
            onPress={() => router.back()}
          >
            <ArrowLeft size={20} color={designTokens.colors.textSecondary} />
          </TouchableOpacity>
          
          <View style={professionalStyles.headerTitleContainer}>
            <Text style={professionalStyles.headerTitle}>Edit Listing</Text>
            <Text style={professionalStyles.headerSubtitle}>Update your property details</Text>
          </View>
          
          <View style={{ width: 40 }} />
        </View>
      </View>

      {/* Progress Display */}
      <View style={professionalStyles.progressContainer}>
        <View style={professionalStyles.progressInfo}>
          <Text style={professionalStyles.progressText}>
            Step {currentStep} of 5
          </Text>
          <Text style={professionalStyles.progressText}>
            {Math.round((currentStep / 5) * 100)}% Complete
          </Text>
        </View>
        <View style={professionalStyles.progressBar}>
          <View 
            style={[
              professionalStyles.progressFill,
              { width: `${(currentStep / 5) * 100}%` }
            ]}
          />
        </View>
      </View>

      {/* Content */}
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView 
          style={sharedStyles.scrollView}
          keyboardShouldPersistTaps="handled"
        >
          <View style={sharedStyles.pageContainer}>
            {renderCurrentStep()}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Professional Footer */}
      <View style={professionalStyles.professionalFooter}>
        <TouchableOpacity
          style={[
            professionalStyles.footerButton, 
            professionalStyles.footerButtonSecondary,
            (currentStep === 1 || saving) && { opacity: 0.5 }
          ]}
          onPress={handlePrevious}
          disabled={currentStep === 1 || saving}
        >
          <ArrowLeft size={18} color={designTokens.colors.textSecondary} />
          <Text style={[professionalStyles.footerButtonText, professionalStyles.footerButtonTextSecondary]}>
            Previous
          </Text>
        </TouchableOpacity>

        {currentStep < 5 ? (
          <TouchableOpacity
            style={[professionalStyles.footerButton, professionalStyles.footerButtonPrimary]}
            onPress={handleNext}
            disabled={saving}
          >
            <Text style={[professionalStyles.footerButtonText, professionalStyles.footerButtonTextPrimary]}>
              Next Step →
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[
              professionalStyles.footerButton, 
              professionalStyles.footerButtonSuccess,
              saving && { opacity: 0.7 }
            ]}
            onPress={handleSubmit}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <CheckCircle size={18} color="white" />
            )}
            <Text style={[professionalStyles.footerButtonText, professionalStyles.footerButtonTextPrimary]}>
              {saving ? 'Updating...' : 'Update Listing'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
