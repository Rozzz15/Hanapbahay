import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Image, Modal, useWindowDimensions, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { db, generateId } from '../../utils/db';
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
  // Text, // Replaced with peso symbol ₱
  CreditCard,
  Settings,
  AlertCircle,
  Edit3,
  Eye,
  EyeOff,
  Camera
} from 'lucide-react-native';
import { PROPERTY_TYPES, RENTAL_TYPES, AMENITIES, PAYMENT_METHODS, LEASE_TERMS } from '../../types/property';
import { BARANGAYS } from '../../constants/Barangays';
import { sharedStyles, designTokens } from '../../styles/owner-dashboard-styles';
import { professionalStyles } from '../../styles/create-listing-professional';
import { dispatchCustomEvent } from '../../utils/custom-events';
import { showAlert } from '../../utils/alert';
import { savePropertyMedia } from '../../utils/media-storage';

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
  securityDeposit: string;
  paymentMethods: string[];
  ownerName: string;
  businessName: string;
  contactNumber: string;
  email: string;
  emergencyContact: string;
  coverPhoto: string | null;
  photos: string[];
  videos: string[];
  capacity: string; // Maximum number of tenants/slots (calculated from room capacities)
  roomCapacities: string[]; // Capacity per room
}

export default function CreateListing() {
  const { user } = useAuth();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [customRule, setCustomRule] = useState('');
  const [showBarangayDropdown, setShowBarangayDropdown] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showWarnings, setShowWarnings] = useState(false);
  const [showPhotoSourceModal, setShowPhotoSourceModal] = useState(false);
  const [photoSourceType, setPhotoSourceType] = useState<'cover' | 'photos' | null>(null);
  const [hasPaymentMethods, setHasPaymentMethods] = useState<boolean | null>(null);
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
    securityDeposit: '',
    paymentMethods: [],
    ownerName: user?.name || '',
    businessName: '',
    contactNumber: '09123456789', // Default contact number
    email: user?.email || '',
    emergencyContact: '',
    coverPhoto: null,
    photos: [],
    videos: [],
    capacity: '1', // Default capacity (calculated from room capacities)
    roomCapacities: [] // Capacity per room
  });

  // Function to check payment methods
  const checkPaymentMethods = useCallback(async () => {
    if (!user?.id) {
      setHasPaymentMethods(null);
      return;
    }

    try {
      const allAccounts = await db.list('payment_accounts');
      const ownerAccounts = allAccounts.filter(
        (account: any) => account.ownerId === user.id && account.isActive === true
      );
      setHasPaymentMethods(ownerAccounts.length > 0);
      console.log(`💳 Payment methods check: ${ownerAccounts.length > 0 ? 'Found' : 'Not found'} payment methods`);
    } catch (error) {
      console.error('❌ Error checking payment methods:', error);
      setHasPaymentMethods(null); // Unknown state
    }
  }, [user?.id]);

  // Check for payment methods on mount and when user changes
  useEffect(() => {
    checkPaymentMethods();
  }, [checkPaymentMethods]);

  // Refresh payment methods check when screen comes into focus (e.g., returning from payment settings)
  useFocusEffect(
    useCallback(() => {
      checkPaymentMethods();
    }, [checkPaymentMethods])
  );

  // Update form data when user data becomes available
  useEffect(() => {
    if (user) {
      console.log('👤 User data available for pre-filling:', {
        name: user.name,
        email: user.email
      });
      setFormData(prev => ({
        ...prev,
        ownerName: user.name || prev.ownerName,
        contactNumber: prev.contactNumber || '09123456789',
        email: user.email || prev.email
      }));
    }
  }, [user?.id, user?.name, user?.email]); // Only depend on specific user properties that matter

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

  const updateFormData = (field: keyof ListingFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const toggleArrayItem = (field: 'amenities' | 'rules' | 'paymentMethods', item: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].includes(item)
        ? prev[field].filter(i => i !== item)
        : [...prev[field], item]
    }));
    // Clear error for payment methods when user selects one
    if (field === 'paymentMethods' && errors.paymentMethods) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.paymentMethods;
        return newErrors;
      });
    }
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
    const newErrors: Record<string, string> = {};
    
    switch (step) {
      case 1:
        if (!formData.propertyType) newErrors.propertyType = 'Property type is required';
        if (!formData.rentalType) newErrors.rentalType = 'Rental type is required';
        if (!formData.monthlyRent || !formData.monthlyRent.trim()) newErrors.monthlyRent = 'Monthly rent is required';
        // Capacity validation moved to step 2 where room capacities are set
        break;
      case 2:
        if (!formData.address || !formData.address.trim()) newErrors.address = 'Address is required';
        if (!formData.barangay || !formData.barangay.trim()) newErrors.barangay = 'Barangay is required';
        if (!formData.description || !formData.description.trim()) newErrors.description = 'Description is required';
        if (!formData.rooms || !formData.rooms.trim()) newErrors.rooms = 'Number of rooms is required';
        if (!formData.bathrooms || !formData.bathrooms.trim()) newErrors.bathrooms = 'Number of bathrooms is required';
        // Validate capacity is set from room capacities
        if (!formData.capacity || !formData.capacity.trim() || parseInt(formData.capacity) < 1) {
          newErrors.capacity = 'Please set capacity for at least one room';
        }
        break;
      case 3:
        if (!formData.ownerName || !formData.ownerName.trim()) newErrors.ownerName = 'Owner name is required';
        if (!formData.contactNumber || !formData.contactNumber.trim()) newErrors.contactNumber = 'Contact number is required';
        if (!formData.email || !formData.email.trim()) newErrors.email = 'Email address is required';
        else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Email address is invalid';
        break;
      case 4:
        if (formData.paymentMethods.length === 0) newErrors.paymentMethods = 'At least one payment method is required';
        break;
      case 5:
        // Media is optional, no validation needed
        break;
    }
    
    setErrors(newErrors);
    setShowWarnings(Object.keys(newErrors).length > 0);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setErrors({});
      setShowWarnings(false);
      setCurrentStep(prev => Math.min(prev + 1, 5));
    } else {
      showAlert('Validation Error', 'Please fill in all required fields');
    }
  };

  // Check for errors when form data changes (only if warnings are already shown)
  useEffect(() => {
    if (showWarnings) {
      validateStep(currentStep);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.propertyType, formData.rentalType, formData.monthlyRent, formData.address, formData.barangay, formData.description, formData.rooms, formData.bathrooms, formData.capacity, formData.ownerName, formData.contactNumber, formData.email, formData.paymentMethods, currentStep]);

  const handlePrevious = () => {
    setErrors({});
    setShowWarnings(false);
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  // Image Picker Functions
  const showPhotoSourceSelection = (type: 'cover' | 'photos') => {
    setPhotoSourceType(type);
    setShowPhotoSourceModal(true);
  };

  const takePhotoFromCamera = async () => {
    if (!photoSourceType) return;
    
    setShowPhotoSourceModal(false);
    
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        showAlert('Permission Required', 'Please grant permission to access your camera');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: photoSourceType === 'cover',
        aspect: photoSourceType === 'cover' ? [16, 9] : undefined,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        if (photoSourceType === 'cover') {
          updateFormData('coverPhoto', result.assets[0].uri);
        } else if (photoSourceType === 'photos') {
          updateFormData('photos', [...formData.photos, result.assets[0].uri]);
        }
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      showAlert('Error', 'Failed to take photo. Please try again.');
    }
  };

  const pickPhotoFromGallery = async () => {
    if (!photoSourceType) return;
    
    setShowPhotoSourceModal(false);
    
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showAlert('Permission Required', 'Please grant permission to access your photos');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: photoSourceType === 'cover',
        aspect: photoSourceType === 'cover' ? [16, 9] : undefined,
        allowsMultipleSelection: photoSourceType === 'photos',
        quality: 0.8,
      });

      if (!result.canceled && result.assets) {
        if (photoSourceType === 'cover' && result.assets[0]) {
          updateFormData('coverPhoto', result.assets[0].uri);
        } else if (photoSourceType === 'photos') {
          const newPhotos = result.assets.map(asset => asset.uri);
          updateFormData('photos', [...formData.photos, ...newPhotos]);
        }
      }
    } catch (error) {
      console.error('Error picking photo:', error);
      showAlert('Error', 'Failed to pick photo. Please try again.');
    }
  };

  const pickCoverPhoto = async () => {
    showPhotoSourceSelection('cover');
  };

  const pickPhotos = async () => {
    showPhotoSourceSelection('photos');
  };

  const pickVideos = async () => {
    const { status} = await ImagePicker.requestMediaLibraryPermissionsAsync();
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
    if (!user?.id) {
      showAlert('Error', 'User not authenticated. Please log in again.');
      return;
    }

    // Check if owner has payment methods set up
    try {
      const allAccounts = await db.list('payment_accounts');
      const ownerAccounts = allAccounts.filter(
        (account: any) => account.ownerId === user.id && account.isActive === true
      );

      if (ownerAccounts.length === 0) {
        showAlert(
          'Payment Methods Required',
          'You need to add at least one payment method before creating a listing. This allows tenants to pay rent for your property.\n\nWould you like to add payment methods now?',
          [
            {
              text: 'Cancel',
              style: 'cancel',
              onPress: () => {}
            },
            {
              text: 'Add Payment Methods',
              onPress: () => {
                router.push('/(owner)/payment-settings');
              }
            }
          ]
        );
        return;
      }
    } catch (error) {
      console.error('❌ Error checking payment methods:', error);
      // Continue with listing creation if check fails (don't block user)
    }

    // Validate all steps before submitting
    let allValid = true;
    for (let step = 1; step <= 4; step++) {
      if (!validateStep(step)) {
        allValid = false;
        break;
      }
    }
    
    if (!allValid) {
      showAlert('Validation Error', 'Please fill in all required fields in all steps');
      return;
    }

    try {
      setLoading(true);
      console.log('📝 Creating listing for user:', user.id);
      console.log('📍 Barangay selected:', formData.barangay.trim());

      // Generate unique ID for the listing
      const listingId = generateId('listing');
      const now = new Date().toISOString();

      const listingData = {
        id: listingId,
        userId: user.id,
        ownerUserId: user.id, // Add ownerUserId for tenant dashboard
        propertyType: formData.propertyType,
        rentalType: formData.rentalType,
        monthlyRent: parseFloat(formData.monthlyRent),
        price: parseFloat(formData.monthlyRent), // Add price field for tenant dashboard
        availabilityStatus: formData.availabilityStatus,
        leaseTerm: formData.leaseTerm,
        address: formData.address,
        barangay: formData.barangay.trim().toUpperCase(), // Use selected barangay from dropdown (trim and uppercase to avoid whitespace/case issues)
        title: `${formData.propertyType} in ${formData.address.split(',')[0]}`, // Generate title
        location: formData.address.split(',')[0] || 'Location not specified', // Extract location from address
        rooms: parseInt(formData.rooms),
        bathrooms: parseInt(formData.bathrooms),
        size: 0, // Default size (can be added to form later)
        rating: 4.5, // Default rating
        reviews: 0, // Default reviews
        description: formData.description,
        amenities: formData.amenities,
        rules: formData.rules,
        securityDeposit: formData.securityDeposit ? parseFloat(formData.securityDeposit) : 0,
        paymentMethods: formData.paymentMethods,
        ownerName: formData.ownerName,
        businessName: formData.businessName || '',
        contactNumber: formData.contactNumber,
        email: formData.email,
        emergencyContact: formData.emergencyContact || '',
        capacity: parseInt(formData.capacity) || 1, // Maximum number of tenants/slots
        roomCapacities: formData.roomCapacities.map(cap => parseInt(cap) || 1), // Capacity per room
        status: 'published',
        publishedAt: now,
        coverPhoto: formData.coverPhoto || null,
        photos: formData.photos || [],
        videos: formData.videos || [],
        views: 0,
        inquiries: 0,
        createdAt: now,
        updatedAt: now
      };

      // Save to local database with retry mechanism
      let saveAttempts = 0;
      const maxAttempts = 3;
      let saveSuccess = false;
      
      while (saveAttempts < maxAttempts && !saveSuccess) {
        try {
          await db.upsert('published_listings', listingId, listingData);
          
          // Verify the save was successful
          const verification = await db.get('published_listings', listingId) as any;
          if (verification && verification.id === listingId) {
            saveSuccess = true;
            console.log('✅ Listing saved and verified successfully');
            console.log('📍 Listing barangay:', verification.barangay);
          } else {
            throw new Error('Verification failed - listing not found after save');
          }
        } catch (saveError) {
          saveAttempts++;
          console.error(`❌ Save attempt ${saveAttempts} failed:`, saveError);
          
          if (saveAttempts < maxAttempts) {
            // Wait before retry
            await new Promise(resolve => setTimeout(resolve, 500));
          } else {
            throw new Error(`Failed to save listing after ${maxAttempts} attempts`);
          }
        }
      }
      
      // Clear cache to ensure fresh data
      const { clearCache } = await import('../../utils/db');
      await clearCache();

      // Save media to database
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
          // Don't fail the listing creation if profile update fails
        }
      }

      // Dispatch event to notify other components
      dispatchCustomEvent('listingChanged', { 
        action: 'created', 
        listingId, 
        userId: user.id,
        propertyType: formData.propertyType,
        address: formData.address?.substring(0, 50) + '...',
        timestamp: now
      });

      // Show success message
      showAlert(
        'Success! 🎉',
        'Your property listing has been created successfully!',
        [
          {
            text: 'View Listing',
            onPress: () => router.replace('/(owner)/listings')
          },
          {
            text: 'Back to Dashboard',
            onPress: () => router.replace('/(owner)/dashboard'),
            style: 'cancel'
          }
        ]
      );
    } catch (error) {
      console.error('❌ Error creating listing:', error);
      showAlert(
        'Error', 
        'Failed to create listing. Please check your information and try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <View style={professionalStyles.stepContent}>
      {showWarnings && Object.keys(errors).length > 0 && (
        <View style={professionalStyles.warningBanner}>
          <AlertCircle size={20} color={designTokens.colors.error} style={{ marginRight: 12, marginTop: 2 }} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontWeight: '600', color: designTokens.colors.error, marginBottom: 4 }}>
              Required Fields Missing
            </Text>
            <Text style={{ fontSize: 13, color: designTokens.colors.error }}>
              Please fill in all required fields marked with *
            </Text>
          </View>
        </View>
      )}
      
      <View style={professionalStyles.sectionHeader}>
        <View style={professionalStyles.sectionIcon}>
          <Home size={20} color={designTokens.colors.primary} />
        </View>
        <Text style={professionalStyles.sectionTitle}>Property Information</Text>
      </View>
      
      <View style={[professionalStyles.inputGroup, { marginTop: 8 }]}>
        <Text style={professionalStyles.inputLabel}>Property Type *</Text>
        <Text style={[professionalStyles.inputHelper, { marginBottom: 8 }]}>
          Select the type of property you're listing
        </Text>
        <View style={[professionalStyles.optionsGrid, { marginTop: 0, marginBottom: 0, gap: 8 }]}>
          {PROPERTY_TYPES.map((type) => (
            <TouchableOpacity
              key={type}
              style={[
                professionalStyles.amenityOptionCard,
                isMobile && { minWidth: '47%', maxWidth: '47%' },
                formData.propertyType === type && professionalStyles.amenityOptionCardActive,
                errors.propertyType && !formData.propertyType && professionalStyles.propertyOptionCardError
              ]}
              onPress={() => updateFormData('propertyType', type)}
            >
              <Text 
                numberOfLines={2}
                style={[
                  professionalStyles.amenityOptionText,
                  formData.propertyType === type && professionalStyles.amenityOptionTextActive,
                  errors.propertyType && !formData.propertyType && { color: designTokens.colors.error }
                ]}>
                {type}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {errors.propertyType && (
          <Text style={professionalStyles.errorText}>{errors.propertyType}</Text>
        )}
      </View>

      <View style={[professionalStyles.inputGroup, { marginTop: 8 }]}>
        <Text style={professionalStyles.inputLabel}>Rental Type *</Text>
        <Text style={[professionalStyles.inputHelper, { marginBottom: 8 }]}>
          Select the rental type for your property
        </Text>
        <View style={[professionalStyles.optionsGrid, { marginTop: 0, marginBottom: 0, gap: 8 }]}>
          {RENTAL_TYPES.map((type) => (
            <TouchableOpacity
              key={type}
              style={[
                professionalStyles.amenityOptionCard,
                isMobile && { minWidth: '47%', maxWidth: '47%' },
                formData.rentalType === type && professionalStyles.amenityOptionCardActive,
                errors.rentalType && !formData.rentalType && professionalStyles.propertyOptionCardError
              ]}
              onPress={() => updateFormData('rentalType', type)}
            >
              <Text 
                numberOfLines={2}
                style={[
                  professionalStyles.amenityOptionText,
                  formData.rentalType === type && professionalStyles.amenityOptionTextActive,
                  errors.rentalType && !formData.rentalType && { color: designTokens.colors.error }
                ]}>
                {type}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {errors.rentalType && (
          <Text style={professionalStyles.errorText}>{errors.rentalType}</Text>
        )}
      </View>

      <View style={[professionalStyles.inputGroup, { marginTop: 8 }]}>
        <Text style={professionalStyles.inputLabel}>Monthly Rent (₱) *</Text>
        <View style={professionalStyles.inputContainer}>
          <View style={professionalStyles.inputIcon}>
            <Text style={{ fontSize: 18, color: designTokens.colors.textMuted }}>₱</Text>
          </View>
          <TextInput
            style={[
              professionalStyles.input, 
              professionalStyles.inputWithIcon,
              errors.monthlyRent && professionalStyles.inputError
            ]}
            placeholder="Enter monthly rent"
            value={formData.monthlyRent}
            onChangeText={(value) => updateFormData('monthlyRent', value)}
            keyboardType="numeric"
          />
        </View>
        {errors.monthlyRent && (
          <Text style={professionalStyles.errorText}>{errors.monthlyRent}</Text>
        )}
      </View>

      <View style={[professionalStyles.inputGroup, { marginTop: 8 }]}>
        <Text style={professionalStyles.inputLabel}>Availability Status</Text>
        <Text style={[professionalStyles.inputHelper, { marginBottom: 8 }]}>
          Select the current availability status of your property
        </Text>
        <View style={[professionalStyles.optionsGrid, { marginTop: 0, marginBottom: 0, gap: 8 }]}>
          {(['available', 'occupied', 'reserved'] as const).map((status) => (
            <TouchableOpacity
              key={status}
              style={[
                professionalStyles.amenityOptionCard,
                isMobile && { minWidth: '47%', maxWidth: '47%' },
                formData.availabilityStatus === status && professionalStyles.amenityOptionCardActive
              ]}
              onPress={() => updateFormData('availabilityStatus', status)}
            >
              <Text 
                numberOfLines={2}
                style={[
                  professionalStyles.amenityOptionText,
                  formData.availabilityStatus === status && professionalStyles.amenityOptionTextActive
                ]}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={[professionalStyles.inputGroup, { marginTop: 8 }]}>
        <Text style={professionalStyles.inputLabel}>Lease Term</Text>
        <Text style={[professionalStyles.inputHelper, { marginBottom: 8 }]}>
          Select the lease term option for your property
        </Text>
        <View style={[professionalStyles.optionsGrid, { marginTop: 0, marginBottom: 0, gap: 8 }]}>
          {LEASE_TERMS.map((term) => (
            <TouchableOpacity
              key={term}
              style={[
                professionalStyles.amenityOptionCard,
                isMobile && { minWidth: '47%', maxWidth: '47%' },
                formData.leaseTerm === term.toLowerCase().split(' ')[0] && professionalStyles.amenityOptionCardActive
              ]}
              onPress={() => updateFormData('leaseTerm', term.toLowerCase().split(' ')[0] as any)}
            >
              <Text 
                numberOfLines={2}
                style={[
                  professionalStyles.amenityOptionText,
                  formData.leaseTerm === term.toLowerCase().split(' ')[0] && professionalStyles.amenityOptionTextActive
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
      {showWarnings && Object.keys(errors).length > 0 && (
        <View style={professionalStyles.warningBanner}>
          <AlertCircle size={20} color={designTokens.colors.error} style={{ marginRight: 12, marginTop: 2 }} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontWeight: '600', color: designTokens.colors.error, marginBottom: 4 }}>
              Required Fields Missing
            </Text>
            <Text style={{ fontSize: 13, color: designTokens.colors.error }}>
              Please fill in all required fields marked with *
            </Text>
          </View>
        </View>
      )}
      
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
            style={[
              professionalStyles.input, 
              professionalStyles.inputWithIcon, 
              professionalStyles.inputMultiline,
              errors.address && professionalStyles.inputError
            ]}
            placeholder="Enter complete address"
            value={formData.address}
            onChangeText={(value) => updateFormData('address', value)}
            multiline
            numberOfLines={3}
          />
        </View>
        {errors.address && (
          <Text style={professionalStyles.errorText}>{errors.address}</Text>
        )}
      </View>

      <View style={{ marginBottom: 24 }} />

      <View style={professionalStyles.inputGroup}>
        <Text style={professionalStyles.inputLabel}>Barangay *</Text>
        <TouchableOpacity
          onPress={() => setShowBarangayDropdown(true)}
          style={[
            {
              borderWidth: 2,
              borderColor: formData.barangay ? designTokens.colors.primary : designTokens.colors.border,
              borderRadius: 12,
              backgroundColor: errors.barangay ? '#FEF2F2' : 'white',
              paddingVertical: 14,
              paddingHorizontal: 16,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            },
            errors.barangay && { borderColor: designTokens.colors.error }
          ]}
        >
          <Text style={{
            fontSize: 16,
            color: formData.barangay ? designTokens.colors.textPrimary : designTokens.colors.textMuted,
            fontWeight: formData.barangay ? '500' : '400',
          }}>
            {formData.barangay || 'Select Barangay'}
          </Text>
          <Text style={{
            fontSize: 16,
            color: designTokens.colors.textMuted,
          }}>▼</Text>
        </TouchableOpacity>
        {errors.barangay && (
          <Text style={professionalStyles.errorText}>{errors.barangay}</Text>
        )}
        {formData.barangay && !errors.barangay && (
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
                  color: designTokens.colors.textPrimary,
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
                      color: formData.barangay === brgy ? designTokens.colors.primary : designTokens.colors.textPrimary,
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
          style={[
            professionalStyles.input, 
            professionalStyles.inputMultiline,
            errors.description && professionalStyles.inputError
          ]}
          placeholder="Describe your property, its features, and what makes it special..."
          value={formData.description}
          onChangeText={(value) => updateFormData('description', value)}
          multiline
          numberOfLines={4}
        />
        {errors.description && (
          <Text style={professionalStyles.errorText}>{errors.description}</Text>
        )}
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
              style={[
                professionalStyles.input, 
                professionalStyles.inputWithIcon, 
                { height: 50 },
                errors.rooms && professionalStyles.inputError
              ]}
              placeholder="Number of rooms"
              value={formData.rooms}
              onChangeText={(value) => updateFormData('rooms', value)}
              keyboardType="numeric"
            />
          </View>
          {errors.rooms && (
            <Text style={professionalStyles.errorText}>{errors.rooms}</Text>
          )}
        </View>
        <View style={{ flex: isMobile ? 0 : 1, width: isMobile ? '100%' : undefined }}>
          <Text style={[professionalStyles.inputLabel, { marginBottom: 10 }]}>Bathrooms *</Text>
          <View style={[professionalStyles.inputContainer, { minHeight: 50 }]}>
            <View style={professionalStyles.inputIcon}>
              <Home size={18} color={designTokens.colors.textMuted} />
            </View>
            <TextInput
              style={[
                professionalStyles.input, 
                professionalStyles.inputWithIcon, 
                { height: 50 },
                errors.bathrooms && professionalStyles.inputError
              ]}
              placeholder="Number of bathrooms"
              value={formData.bathrooms}
              onChangeText={(value) => updateFormData('bathrooms', value)}
              keyboardType="numeric"
            />
          </View>
          {errors.bathrooms && (
            <Text style={professionalStyles.errorText}>{errors.bathrooms}</Text>
          )}
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
                    color: designTokens.colors.textPrimary,
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
      {errors.capacity && (
        <Text style={professionalStyles.errorText}>{errors.capacity}</Text>
      )}

      <View style={professionalStyles.inputGroup}>
        <Text style={professionalStyles.inputLabel}>Amenities</Text>
        <Text style={[professionalStyles.inputHelper, { marginBottom: 8 }]}>
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
              <Text 
                numberOfLines={2}
                style={[
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
        
        {/* Custom Rule Input */}
        <View style={professionalStyles.inputContainer}>
          <TextInput
            style={professionalStyles.input}
            placeholder="Enter a house rule (e.g., No smoking, No pets, etc.)"
            value={customRule}
            onChangeText={setCustomRule}
            multiline={false}
          />
          <TouchableOpacity
            style={[sharedStyles.primaryButton, { marginTop: 12 }]}
            onPress={addCustomRule}
            disabled={!customRule.trim()}
          >
            <Text style={sharedStyles.primaryButtonText}>Add Rule</Text>
          </TouchableOpacity>
        </View>

        {/* Display Added Rules */}
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
      {showWarnings && Object.keys(errors).length > 0 && (
        <View style={professionalStyles.warningBanner}>
          <AlertCircle size={20} color={designTokens.colors.error} style={{ marginRight: 12, marginTop: 2 }} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontWeight: '600', color: designTokens.colors.error, marginBottom: 4 }}>
              Required Fields Missing
            </Text>
            <Text style={{ fontSize: 13, color: designTokens.colors.error }}>
              Please fill in all required fields marked with *
            </Text>
          </View>
        </View>
      )}
      
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
            style={[
              professionalStyles.input, 
              professionalStyles.inputWithIcon,
              errors.ownerName && professionalStyles.inputError
            ]}
            placeholder="Enter owner's full name"
            value={formData.ownerName}
            onChangeText={(value) => {
              console.log('📝 Owner name changed:', value);
              updateFormData('ownerName', value);
            }}
          />
        </View>
        {errors.ownerName && (
          <Text style={professionalStyles.errorText}>{errors.ownerName}</Text>
        )}
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
            style={[
              professionalStyles.input, 
              professionalStyles.inputWithIcon,
              errors.contactNumber && professionalStyles.inputError
            ]}
            placeholder="Enter contact number"
            value={formData.contactNumber}
            onChangeText={(value) => {
              console.log('📞 Contact number changed:', value);
              updateFormData('contactNumber', value);
            }}
            keyboardType="phone-pad"
          />
        </View>
        {errors.contactNumber && (
          <Text style={professionalStyles.errorText}>{errors.contactNumber}</Text>
        )}
      </View>

      <View style={professionalStyles.inputGroup}>
        <Text style={professionalStyles.inputLabel}>Email Address *</Text>
        <View style={professionalStyles.inputContainer}>
          <View style={professionalStyles.inputIcon}>
            <Mail size={18} color={designTokens.colors.textMuted} />
          </View>
          <TextInput
            style={[
              professionalStyles.input, 
              professionalStyles.inputWithIcon,
              errors.email && professionalStyles.inputError
            ]}
            placeholder="Enter email address"
            value={formData.email}
            onChangeText={(value) => {
              console.log('📧 Email changed:', value);
              updateFormData('email', value);
            }}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>
        {errors.email && (
          <Text style={professionalStyles.errorText}>{errors.email}</Text>
        )}
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
      {showWarnings && Object.keys(errors).length > 0 && (
        <View style={professionalStyles.warningBanner}>
          <AlertCircle size={20} color={designTokens.colors.error} style={{ marginRight: 12, marginTop: 2 }} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontWeight: '600', color: designTokens.colors.error, marginBottom: 4 }}>
              Required Fields Missing
            </Text>
            <Text style={{ fontSize: 13, color: designTokens.colors.error }}>
              Please fill in all required fields marked with *
            </Text>
          </View>
        </View>
      )}
      
      <View style={professionalStyles.sectionHeader}>
        <View style={professionalStyles.sectionIcon}>
          <Text style={{ fontSize: 20, color: designTokens.colors.primary }}>₱</Text>
        </View>
        <Text style={professionalStyles.sectionTitle}>Pricing & Payment</Text>
      </View>
      
      <View style={professionalStyles.inputGroup}>
        <Text style={professionalStyles.inputLabel}>Security Deposit (₱)</Text>
        <View style={professionalStyles.inputContainer}>
          <View style={professionalStyles.inputIcon}>
            <Text style={{ fontSize: 18, color: designTokens.colors.textMuted }}>₱</Text>
          </View>
          <TextInput
            style={[professionalStyles.input, professionalStyles.inputWithIcon]}
            placeholder="Enter security deposit amount"
            value={formData.securityDeposit}
            onChangeText={(value) => updateFormData('securityDeposit', value)}
            keyboardType="numeric"
          />
        </View>
      </View>

      <View style={professionalStyles.inputGroup}>
        <Text style={professionalStyles.inputLabel}>Accepted Payment Methods *</Text>
        <Text style={[professionalStyles.inputHelper, { marginBottom: 8 }]}>
          Select all payment methods you accept
        </Text>
        <View style={[professionalStyles.optionsGrid, { marginTop: 0, marginBottom: 0, gap: 8 }]}>
          {PAYMENT_METHODS.map((method) => (
            <TouchableOpacity
              key={method}
              style={[
                professionalStyles.amenityOptionCard,
                isMobile && { minWidth: '47%', maxWidth: '47%' },
                formData.paymentMethods.includes(method) && professionalStyles.amenityOptionCardActive,
                errors.paymentMethods && formData.paymentMethods.length === 0 && professionalStyles.propertyOptionCardError
              ]}
              onPress={() => toggleArrayItem('paymentMethods', method)}
            >
              <Text 
                numberOfLines={2}
                style={[
                  professionalStyles.amenityOptionText,
                  formData.paymentMethods.includes(method) && professionalStyles.amenityOptionTextActive,
                  errors.paymentMethods && formData.paymentMethods.length === 0 && { color: designTokens.colors.error }
                ]}>
                {method}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {errors.paymentMethods && (
          <Text style={professionalStyles.errorText}>{errors.paymentMethods}</Text>
        )}
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

      {!formData.coverPhoto && (
        <View style={{
          padding: designTokens.spacing.md,
          backgroundColor: designTokens.colors.warningLight,
          borderRadius: designTokens.borderRadius.md,
          marginTop: designTokens.spacing.md,
          flexDirection: 'row',
          alignItems: 'center'
        }}>
          <AlertCircle size={20} color={designTokens.colors.warning} />
          <Text style={{ 
            color: designTokens.colors.warning, 
            fontSize: designTokens.typography.sm,
            marginLeft: designTokens.spacing.sm,
            flex: 1
          }}>
            Tip: Adding a cover photo will make your listing more attractive to potential tenants!
          </Text>
        </View>
      )}
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
            <Text style={professionalStyles.headerTitle}>Create New Listing</Text>
            <Text style={professionalStyles.headerSubtitle}>Add your property to the marketplace</Text>
          </View>
          
          <View style={{ width: 40 }} />
        </View>
      </View>

      {/* Payment Methods Reminder Banner */}
      {hasPaymentMethods === false && (
        <View style={professionalStyles.paymentWarningBanner}>
          <View style={professionalStyles.paymentWarningContent}>
            <AlertCircle size={20} color="#F59E0B" />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={professionalStyles.paymentWarningTitle}>
                Payment Methods Required
              </Text>
              <Text style={professionalStyles.paymentWarningText}>
                You need to add payment methods before creating a listing. Tenants will need this to pay rent.
              </Text>
            </View>
            <TouchableOpacity
              style={professionalStyles.paymentWarningButton}
              onPress={() => router.push('/(owner)/payment-settings')}
            >
              <CreditCard size={16} color="#FFFFFF" />
              <Text style={professionalStyles.paymentWarningButtonText}>Add Now</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

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
            (currentStep === 1 || loading) && { opacity: 0.5 }
          ]}
          onPress={handlePrevious}
          disabled={currentStep === 1 || loading}
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
            disabled={loading}
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
              loading && { opacity: 0.7 }
            ]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <CheckCircle size={18} color="white" />
            )}
            <Text style={[professionalStyles.footerButtonText, professionalStyles.footerButtonTextPrimary]}>
              {loading ? 'Creating...' : 'Create Listing'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Photo Source Selection Modal */}
      <Modal
        visible={showPhotoSourceModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPhotoSourceModal(false)}
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
            paddingBottom: Platform.OS === 'ios' ? 40 : 20,
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
                    color: designTokens.colors.textPrimary,
              }}>
                Select Photo Source
              </Text>
              <TouchableOpacity onPress={() => setShowPhotoSourceModal(false)}>
                <X size={24} color={designTokens.colors.textMuted} />
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 20,
                paddingHorizontal: 20,
                borderBottomWidth: 1,
                borderBottomColor: '#f0f0f0',
              }}
              onPress={takePhotoFromCamera}
            >
              <View style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: designTokens.colors.primaryLight,
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: 16,
              }}>
                <Camera size={24} color={designTokens.colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{
                  fontSize: 16,
                  fontWeight: '600',
                  color: designTokens.colors.textPrimary,
                  marginBottom: 4,
                }}>
                  Take Photo
                </Text>
                <Text style={{
                  fontSize: 14,
                  color: designTokens.colors.textMuted,
                }}>
                  Use your camera to take a new photo
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 20,
                paddingHorizontal: 20,
              }}
              onPress={pickPhotoFromGallery}
            >
              <View style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: designTokens.colors.primaryLight,
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: 16,
              }}>
                <ImageIcon size={24} color={designTokens.colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{
                  fontSize: 16,
                  fontWeight: '600',
                  color: designTokens.colors.textPrimary,
                  marginBottom: 4,
                }}>
                  Choose from Gallery
                </Text>
                <Text style={{
                  fontSize: 14,
                  color: designTokens.colors.textMuted,
                }}>
                  Select an existing photo from your gallery
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
