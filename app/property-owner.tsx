import React, { useEffect, useState } from 'react';
import { ScrollView, View, Text, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useRootNavigationState, Redirect } from 'expo-router';
import { ArrowLeft, Save, Eye, Upload, LogOut } from 'lucide-react-native';
import { ThemedView } from '@/components/common';
import { ThemedText } from '@/components/common';
import { useAuth } from '@/context/AuthContext';
import { useToast, Toast, ToastTitle, ToastDescription } from "@/components/ui/toast";
import PropertyInfoSection from '@/components/property-owner/PropertyInfoSection';
import PropertyDetailsSection from '@/components/property-owner/PropertyDetailsSection';
import MediaUploadSection from '@/components/property-owner/MediaUploadSection';
import PricingPaymentSection from '@/components/property-owner/PricingPaymentSection';
import ContactOwnerSection from '@/components/property-owner/ContactOwnerSection';
import PreviewPublishSection from '@/components/property-owner/PreviewPublishSection';
import { PropertyListing } from '@/types/property';
import { db } from '@/utils/db';
import { debugPublishListing } from '@/utils/debug-db';
import { safeSaveToStorage, cleanupStorageData, getStorageStats } from '@/utils/storage-management';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function PropertyOwnerScreen() {
  const router = useRouter();
  const rootNavigation = useRootNavigationState();
  const { user, isAuthenticated, signOut } = useAuth();
  const toast = useToast();
  const isOwner = Array.isArray(user?.roles) && user?.roles.includes('owner');

  // Wait until the root navigation is mounted before rendering anything that depends on routing
  const isNavigationReady = !!rootNavigation?.key;
  const [currentStep, setCurrentStep] = useState(1);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editListingId, setEditListingId] = useState<string | null>(null);
  const [listingId] = useState(() => `listing_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const [propertyData, setPropertyData] = useState<PropertyListing>({
    // Property Information
    propertyType: '',
    rentalType: '',
    monthlyRent: 0,
    availabilityStatus: 'available',
    leaseTerm: 'negotiable',
    
    // Property Details
    address: '',
    amenities: [],
    rules: [],
    
    // Media
    photos: [],
    videos: [],
    coverPhoto: null,
    
    // Pricing & Payment
    baseRent: 0,
    securityDeposit: 0,
    paymentMethods: [],
    
    // Contact & Owner
    ownerName: '',
    businessName: '',
    contactNumber: '',
    email: '',
    emergencyContact: '',
    
    // Status
    status: 'draft',
    publishedAt: null,
  });

  const totalSteps = 6;

  // Check for edit mode and load existing listing data
  useEffect(() => {
    const checkEditMode = () => {
      // Check if we're in edit mode by looking at URL parameters
      const urlParams = new URLSearchParams(window.location.search);
      const editId = urlParams.get('editListingId');
      const editMode = urlParams.get('editMode');
      
      if (editId && editMode === 'true') {
        console.log('🔧 Edit mode detected for listing:', editId);
        setIsEditMode(true);
        setEditListingId(editId);
        loadExistingListingData(editId);
      }
    };

    if (typeof window !== 'undefined') {
      checkEditMode();
    }
  }, []);

  // Load existing listing data for editing
  const loadExistingListingData = async (listingId: string) => {
    try {
      console.log('📂 Loading existing listing data for editing:', listingId);
      
      // Try to load from published listings first
      const publishedListings = await db.list('published_listings') as any[];
      const publishedListing = publishedListings.find(p => p.id === listingId);
      
      if (publishedListing) {
        console.log('✅ Found published listing to edit:', publishedListing);
        
        // Pre-populate form with existing data
        const existingData: PropertyListing = {
          // Property Information
          propertyType: publishedListing.propertyType || '',
          rentalType: publishedListing.rentalType || '',
          monthlyRent: publishedListing.monthlyRent || publishedListing.baseRent || 0,
          availabilityStatus: publishedListing.availabilityStatus || 'available',
          leaseTerm: publishedListing.leaseTerm || 'negotiable',
          
          // Property Details
          address: publishedListing.address || '',
          amenities: publishedListing.amenities || [],
          rules: publishedListing.rules || [],
          
          // Media
          photos: publishedListing.photos || [],
          videos: publishedListing.videos || [],
          coverPhoto: publishedListing.coverPhoto || null,
          
          // Pricing & Payment
          baseRent: publishedListing.baseRent || 0,
          securityDeposit: publishedListing.securityDeposit || 0,
          paymentMethods: publishedListing.paymentMethods || [],
          
          // Contact & Owner
          ownerName: publishedListing.ownerName || '',
          businessName: publishedListing.businessName || '',
          contactNumber: publishedListing.contactNumber || '',
          email: publishedListing.email || '',
          emergencyContact: publishedListing.emergencyContact || '',
          
          // Status
          status: 'draft', // Set to draft for editing
          publishedAt: publishedListing.publishedAt,
        };
        
        setPropertyData(existingData);
        console.log('✅ Form pre-populated with existing listing data');
        return;
      }
      
      // Try to load from drafts if not found in published
      const drafts = await db.list('listing_drafts') as any[];
      const draftListing = drafts.find(d => d.id === listingId);
      
      if (draftListing) {
        console.log('✅ Found draft listing to edit:', draftListing);
        
        // Pre-populate form with draft data
        const existingData: PropertyListing = {
          // Property Information
          propertyType: draftListing.propertyType || '',
          rentalType: draftListing.rentalType || '',
          monthlyRent: draftListing.monthlyRent || draftListing.baseRent || 0,
          availabilityStatus: draftListing.availabilityStatus || 'available',
          leaseTerm: draftListing.leaseTerm || 'negotiable',
          
          // Property Details
          address: draftListing.address || '',
          amenities: draftListing.amenities || [],
          rules: draftListing.rules || [],
          
          // Media
          photos: draftListing.photos || [],
          videos: draftListing.videos || [],
          coverPhoto: draftListing.coverPhoto || null,
          
          // Pricing & Payment
          baseRent: draftListing.baseRent || 0,
          securityDeposit: draftListing.securityDeposit || 0,
          paymentMethods: draftListing.paymentMethods || [],
          
          // Contact & Owner
          ownerName: draftListing.ownerName || '',
          businessName: draftListing.businessName || '',
          contactNumber: draftListing.contactNumber || '',
          email: draftListing.email || '',
          emergencyContact: draftListing.emergencyContact || '',
          
          // Status
          status: 'draft',
          publishedAt: null,
        };
        
        setPropertyData(existingData);
        console.log('✅ Form pre-populated with existing draft data');
        return;
      }
      
      console.log('⚠️ No existing listing found with ID:', listingId);
      
    } catch (error) {
      console.error('❌ Error loading existing listing data:', error);
    }
  };

  // Load user profile data and auto-populate form
  useEffect(() => {
    const loadUserData = async () => {
      if (!user?.id || isEditMode) return; // Skip if in edit mode
      
      try {
        console.log('🔄 Loading user profile data for property listing...');
        
        // Load user data from database
        const userRecord = await db.get('users', user.id) as any;
        const ownerProfile = await db.get('owner_profiles', user.id) as any;
        const paymentProfile = await db.get('payment_profiles', user.id) as any;
        
        // Load owner property preferences from sign-up
        const ownerPreferencesRaw = await AsyncStorage.getItem('owner_property_preferences');
        const ownerPreferences = ownerPreferencesRaw ? JSON.parse(ownerPreferencesRaw) : {};
        
        console.log('📊 User data loaded:', { userRecord, ownerProfile, paymentProfile, ownerPreferences });
        
        // Auto-populate ALL available information from user profile and preferences
        const updatedPropertyData = {
          ...propertyData,
          // Contact & Owner Info - pre-populate from user profile
          ownerName: userRecord?.name || '',
          businessName: ownerProfile?.businessName || '', // Load business name from owner profile
          email: userRecord?.email || '', // Use email from user profile
          contactNumber: userRecord?.phone || '',
          address: ownerPreferences.propertyAddress || userRecord?.address || '',
          // try to get payment methods from signup if available
          paymentMethods: paymentProfile?.methods || [],
          
          // Property Information - use signup preferences
          propertyType: ownerPreferences.propertyType || '',
          monthlyRent: parseFloat(ownerPreferences.monthlyRate) || 0,
          
          // Property Details - use signup preferences
          amenities: ownerPreferences.selectedAmenities || [],
          
            // try existing photos from signup
            photos: ownerPreferences.propertyPhotos || [],
            
            // Auto-set cover photo from first available photo
            coverPhoto: ownerPreferences.propertyPhotos && ownerPreferences.propertyPhotos.length > 0 
              ? ownerPreferences.propertyPhotos[0] 
              : null,
        };
        
        setPropertyData(updatedPropertyData);
        
        console.log('✅ Property form auto-populated with user data and preferences:', updatedPropertyData);
      } catch (error) {
        console.error('❌ Error loading user data:', error);
        // Continue with default form - user can fill manually
      }
    };

    if (user?.id && isOwner) {
      loadUserData();
    }
  }, [user?.id, isOwner, isEditMode]);

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSaveDraft = async () => {
    try {
      const draftData = { 
        ...propertyData, 
        status: 'draft',
        userId: user?.id,
        updatedAt: new Date().toISOString()
      };
      
      // Save to database
      await db.upsert('listing_drafts', user?.id || 'anonymous', draftData);
      
      // Also save to AsyncStorage for offline access
      await AsyncStorage.setItem(`property_draft:${user?.id}`, JSON.stringify(draftData));
      
      Alert.alert('Success', 'Property listing saved as draft');
      console.log('✅ Draft saved successfully');
    } catch (error) {
      console.error('❌ Error saving draft:', error);
      Alert.alert('Error', 'Failed to save draft. Please try again.');
    }
  };

  const handlePreview = () => {
    // Navigate to preview screen with current data
    router.push({
      pathname: '/property-preview',
      params: {
        id: propertyData.id || 'preview',
        title: `${propertyData.propertyType} in ${(propertyData.address || '').split(',')[0] || 'Property'}`,
        location: propertyData.address || 'Location not set',
        price: propertyData.monthlyRent?.toString() || '0',
        rooms: '1', // Default since bedrooms removed
        size: '50', // Default size
        rating: '4.8', // Default rating
        reviews: '12', // Default reviews
        image: propertyData.coverPhoto || propertyData.photos[0] || 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=500',
        ownerUserId: propertyData.userId || '',
        description: `Beautiful ${propertyData.propertyType || 'property'} located in ${propertyData.address || 'a great location'}. Perfect for your next home.`,
        amenities: JSON.stringify(propertyData.amenities || ['WiFi', 'Parking', 'Air Conditioning']),
        photos: JSON.stringify(propertyData.photos || []),
        ownerName: propertyData.ownerName || 'Property Owner',
        contactNumber: propertyData.contactNumber || 'Contact not provided',
        email: propertyData.email || 'Email not provided',
        monthlyRent: propertyData.monthlyRent?.toString() || '0',
        securityDeposit: propertyData.securityDeposit?.toString() || '0',
        availabilityStatus: propertyData.availabilityStatus || 'Available',
        leaseTerm: propertyData.leaseTerm || 'Not specified',
        rules: JSON.stringify(propertyData.rules || [])
      }
    });
  };

  const handlePublish = async () => {
    if (isPublishing) {
      console.log('🚀 Publish already in progress, ignoring duplicate call');
      return;
    }

    try {
      setIsPublishing(true);
      console.log('🚀 Starting publish process...');
      console.log('📊 Validation data:', {
        propertyType: propertyData.propertyType,
        rentalType: propertyData.rentalType,
        address: propertyData.address,
        monthlyRent: propertyData.monthlyRent,
        ownerName: propertyData.ownerName,
        contactNumber: propertyData.contactNumber,
        email: propertyData.email,
        photosCount: propertyData.photos?.length || 0,
        coverPhoto: propertyData.coverPhoto
      });
      
      // Enhanced validation with better error handling
      const requiredFields = [
        { key: 'propertyType', label: 'Property Type' },
        { key: 'rentalType', label: 'Rental Type' },
        { key: 'address', label: 'Address' },
        { key: 'ownerName', label: 'Owner Name' },
        { key: 'contactNumber', label: 'Contact Number' },
        { key: 'email', label: 'Email' },
        { key: 'monthlyRent', label: 'Monthly Rent' }
      ];
      
      const missingFields: string[] = [];
      
      // Check standard required fields
      requiredFields.forEach(({ key, label }) => {
        const value = propertyData[key as keyof PropertyListing];
        let isEmpty = false;
        
        if (key === 'monthlyRent') {
          isEmpty = !value || value <= 0;
        } else if (typeof value === 'string') {
          isEmpty = value.trim() === '';
        } else {
          isEmpty = !value;
        }
        
        if (isEmpty) {
          console.log(`❌ Missing field: ${key} (${label}) =`, value);
          missingFields.push(label);
        } else {
          console.log(`✅ Field OK: ${key} (${label}) =`, value);
        }
      });
      
      // Validate email format
      if (propertyData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(propertyData.email)) {
        console.log('❌ Invalid email format:', propertyData.email);
        missingFields.push('Valid Email Address');
      }
      
      // Validate phone number (should start with +63)
      if (propertyData.contactNumber && !propertyData.contactNumber.startsWith('+63')) {
        console.log('❌ Invalid phone number format:', propertyData.contactNumber);
        missingFields.push('Contact Number (must start with +63)');
      }
      
      // Check for photos and cover photo
      console.log('📸 Photo validation:', {
        coverPhoto: propertyData.coverPhoto,
        photosCount: propertyData.photos?.length || 0,
        photos: propertyData.photos
      });
      
      if (!propertyData.photos || propertyData.photos.length === 0) {
        console.log('❌ No photos uploaded');
        missingFields.push('Property Photos');
      }
      
      if (!propertyData.coverPhoto && propertyData.photos && propertyData.photos.length > 0) {
        // Auto-set cover photo if photos exist but no cover photo selected
        console.log('🔧 Auto-setting first photo as cover photo');
        setPropertyData(prev => ({ ...prev, coverPhoto: prev.photos[0] }));
      }
      
      if (!propertyData.coverPhoto && (!propertyData.photos || propertyData.photos.length === 0)) {
        console.log('❌ No cover photo and no photos available');
        missingFields.push('Cover Photo');
      }
      
      if (missingFields.length > 0) {
        console.log('❌ Validation failed. Missing fields:', missingFields);
        setIsPublishing(false);
        Alert.alert(
          'Incomplete Listing', 
          `Please complete the following required fields before publishing:\n\n• ${missingFields.join('\n• ')}\n\nTip: You can use the "Preview Listing" button to see exactly what's missing.`,
          [{ text: 'OK' }]
        );
        return;
      }
      
      console.log('✅ All validation passed, proceeding with publish...');
      
      // Ensure user is authenticated
      if (!user?.id) {
        console.error('❌ User not authenticated');
        setIsPublishing(false);
        Alert.alert('Authentication Error', 'Please log in again to publish your listing.');
        return;
      }
      
      // Create the published data with proper structure
      const publishedData = { 
        ...propertyData,
        // Ensure cover photo is set
        coverPhoto: propertyData.coverPhoto || propertyData.photos[0],
        // Add publishing metadata
        status: 'published' as const,
        publishedAt: new Date().toISOString(),
        userId: user.id,
        // Use existing listing ID if editing, otherwise generate new one
        id: isEditMode && editListingId ? editListingId : `${user.id}_${Date.now()}`,
        views: isEditMode ? (propertyData as any).views || 0 : 0,
        inquiries: isEditMode ? (propertyData as any).inquiries || 0 : 0,
        createdAt: isEditMode ? (propertyData as any).createdAt || new Date().toISOString() : new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      console.log('📝 Publishing listing to database:', {
        id: publishedData.id,
        propertyType: publishedData.propertyType,
        address: publishedData.address.substring(0, 50) + '...',
        photosCount: publishedData.photos.length,
        hasCoverPhoto: !!publishedData.coverPhoto
      });
      
      // Validate database connection before attempting save
      try {
        console.log('🔌 Testing database connection...');
        await db.get('published_listings', 'test_key'); // Test read first
        console.log('✅ Database connection verified');
        
        // Run debug test to ensure publish functionality works
        console.log('🧪 Running debug publish test...');
        const debugResult = await debugPublishListing({
          propertyType: publishedData.propertyType,
          rentalType: publishedData.rentalType,
          address: publishedData.address,
          monthlyRent: publishedData.monthlyRent,
          ownerName: publishedData.ownerName,
          contactNumber: publishedData.contactNumber,
          email: publishedData.email,
          photos: publishedData.photos,
          coverPhoto: publishedData.coverPhoto
        });
        
        if (!debugResult.success) {
          console.error('❌ Debug publish test failed:', debugResult.error);
          
          // Check if it's a storage quota issue
          if (debugResult.error?.includes('quota') || debugResult.error?.includes('exceeded')) {
            console.log('🧹 Storage quota exceeded, attempting cleanup...');
            
            try {
              const cleanupResult = await cleanupStorageData();
              console.log(`✅ Cleanup completed: ${cleanupResult.cleaned} items cleaned, ${cleanupResult.freedSpace} bytes freed`);
              
              // Try debug test again after cleanup
              console.log('🔄 Retrying debug test after cleanup...');
              const retryResult = await debugPublishListing({
                propertyType: publishedData.propertyType,
                rentalType: publishedData.rentalType,
                address: publishedData.address,
                monthlyRent: publishedData.monthlyRent,
                ownerName: publishedData.ownerName,
                contactNumber: publishedData.contactNumber,
                email: publishedData.email,
                photos: publishedData.photos,
                coverPhoto: publishedData.coverPhoto
              });
              
              if (!retryResult.success) {
                throw new Error(`Publish test failed even after cleanup: ${retryResult.error}`);
              }
              console.log('✅ Debug publish test passed after cleanup');
            } catch (cleanupError) {
              throw new Error(`Storage cleanup failed: ${cleanupError}`);
            }
          } else {
            throw new Error(`Publish test failed: ${debugResult.error}`);
          }
        } else {
          console.log('✅ Debug publish test passed');
        }
      } catch (dbTestError) {
        console.error('❌ Database connection test failed:', dbTestError);
        const message = dbTestError instanceof Error ? dbTestError.message : 'Database connection failed';
        throw new Error(`Database connection failed: ${message}. Please check your internet connection and try again.`);
      }
      
      // Save to database with storage management
      console.log('💾 Saving listing with storage management...');
      const saveResult = await safeSaveToStorage('published_listings', publishedData.id, publishedData, {
        optimizePhotos: true,
        maxRetries: 3,
        cleanupOnFailure: true
      });
      
      if (!saveResult.success) {
        throw new Error(`Failed to save listing: ${saveResult.error}`);
      }
      console.log('✅ Listing saved to database successfully');
      
      // Verify the save was successful
      const savedListing = await db.get('published_listings', publishedData.id);
      if (!savedListing) {
        throw new Error('Failed to verify listing was saved to database');
      }
      console.log('✅ Listing verification successful');
      
      // Update owner profile with business name if it has changed
      if (propertyData.businessName) {
        try {
          const ownerProfile = await db.get('owner_profiles', user.id);
          if (ownerProfile && ownerProfile.businessName !== propertyData.businessName) {
            const updatedOwnerProfile = {
              ...ownerProfile,
              businessName: propertyData.businessName,
              updatedAt: new Date().toISOString()
            };
            await db.upsert('owner_profiles', user.id, updatedOwnerProfile);
            console.log('✅ Owner profile updated with new business name:', propertyData.businessName);
          }
        } catch (error) {
          console.log('⚠️ Could not update owner profile:', error);
        }
      }
      
      // Show success toast notification
      toast.show({
        id: 'publish-success',
        placement: "top",
        render: ({ id }) => (
          <Toast nativeID={id} action="success">
            <ToastTitle>🎉 Listing Published Successfully!</ToastTitle>
            <ToastDescription>
              Your property "{propertyData.propertyType} in {(propertyData.address || '').split(',')[0] || 'Philippines'}" is now live and visible to tenants. Redirecting to dashboard...
            </ToastDescription>
          </Toast>
        ),
      });

      // Auto-navigate to dashboard after showing the toast
      setTimeout(() => {
        console.log('🚀 Auto-navigating to dashboard...');
        router.replace('/(owner)/dashboard');
      }, 2000);
      
      console.log('✅ Listing publish process completed successfully');
    } catch (error) {
      console.error('❌ Error publishing listing:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      // Show error toast notification
      toast.show({
        id: 'publish-error',
        placement: "top",
        render: ({ id }) => (
          <Toast nativeID={id} action="error">
            <ToastTitle>❌ Publishing Failed</ToastTitle>
            <ToastDescription>
              Failed to publish listing: {errorMessage}. Please check your internet connection and try again.
            </ToastDescription>
          </Toast>
        ),
      });

      // Enhanced error handling with retry option
      Alert.alert(
        'Publishing Failed', 
        `Failed to publish listing: ${errorMessage}\n\nPlease check your internet connection and try again. If this continues, contact support.`,
        [
          { text: 'OK', style: 'cancel' },
          { 
            text: 'Retry', 
            onPress: () => {
              console.log('🔄 User initiated retry for publish operation');
              setTimeout(() => {
                handlePublish();
              }, 1000); // Small delay before retry
            }
          }
        ]
      );
    } finally {
      setIsPublishing(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <PropertyInfoSection
            data={propertyData}
            onUpdate={(data) => setPropertyData({ ...propertyData, ...data })}
          />
        );
      case 2:
        return (
          <PropertyDetailsSection
            data={propertyData}
            onUpdate={(data) => setPropertyData({ ...propertyData, ...data })}
          />
        );
      case 3:
        return (
          <MediaUploadSection
            data={propertyData}
            onUpdate={(data) => setPropertyData({ ...propertyData, ...data })}
            listingId={listingId}
          />
        );
      case 4:
        return (
          <PricingPaymentSection
            data={propertyData}
            onUpdate={(data) => setPropertyData({ ...propertyData, ...data })}
          />
        );
      case 5:
        return (
          <ContactOwnerSection
            data={propertyData}
            onUpdate={(data) => setPropertyData({ ...propertyData, ...data })}
          />
        );
      case 6:
        return (
          <PreviewPublishSection
            data={propertyData}
            onSaveDraft={handleSaveDraft}
            onPreview={handlePreview}
            onPublish={handlePublish}
            isPublishing={isPublishing}
          />
        );
      default:
        return null;
    }
  };

  const getStepTitle = () => {
    const titles = [
      'Property Information',
      'Property Details',
      'Media Upload',
      'Pricing & Payment',
      'Contact & Owner Info',
      'Preview & Publish'
    ];
    return titles[currentStep - 1];
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 py-4 bg-white border-b border-gray-200">
        <TouchableOpacity
          onPress={() => router.back()}
          className="flex-row items-center"
        >
          <ArrowLeft size={24} color="#374151" />
          <Text className="ml-2 text-xl font-semibold text-gray-900">
            {isEditMode ? 'Edit Listing' : 'Create Listing'}
          </Text>
        </TouchableOpacity>
        
        <View className="flex-row items-center space-x-2">
          {isEditMode && (
            <View className="bg-blue-100 px-3 py-1 rounded-full">
              <Text className="text-blue-600 text-sm font-medium">Edit Mode</Text>
            </View>
          )}
          <TouchableOpacity
            onPress={handleSaveDraft}
            className="flex-row items-center px-3 py-2 bg-gray-100 rounded-lg border border-gray-200"
          >
            <Save size={16} color="#4B5563" />
            <Text className="ml-1 text-sm text-gray-700">Save Draft</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={async () => {
              try {
                await signOut();
                router.replace('/login');
              } catch (e) {
                router.replace('/login');
              }
            }}
            className="flex-row items-center px-3 py-2 bg-red-50 rounded-lg border border-red-200"
          >
            <LogOut size={16} color="#DC2626" />
            <Text className="ml-1 text-sm text-red-600">Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Progress Bar */}
      <View className="px-5 py-4 bg-white border-b border-gray-100">
        <View className="flex-row items-center justify-between mb-2">
          <Text className="text-sm font-semibold text-gray-700">Step {currentStep} of {totalSteps}</Text>
          <Text className="text-sm font-semibold text-gray-700">{Math.round((currentStep / totalSteps) * 100)}%</Text>
        </View>
        <View className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <View 
            className="h-2 bg-indigo-600 rounded-full"
            style={{ width: `${(currentStep / totalSteps) * 100}%` }}
          />
        </View>
        <Text className="mt-3 text-xl font-bold text-gray-900">{getStepTitle()}</Text>
      </View>

      {/* Content */}
      <ScrollView className="flex-1 bg-white">
        <View className="p-4">
          <View className="bg-white rounded-2xl border border-gray-100 shadow-md p-5">
            {renderStepContent()}
          </View>
        </View>
      </ScrollView>

      {/* Navigation Footer */}
      <View className="px-5 py-4 bg-white border-t border-gray-200">
        <View className="flex-row justify-between">
          <TouchableOpacity
            onPress={handlePrevious}
            disabled={currentStep === 1}
            className={`px-6 py-3 rounded-xl border ${
              currentStep === 1 
                ? 'bg-gray-50 border-gray-200' 
                : 'bg-white border-gray-300'
            }`}
          >
            <Text className={`text-base font-semibold ${
              currentStep === 1 
                ? 'text-gray-400' 
                : 'text-gray-800'
            }`}>
              Previous
            </Text>
          </TouchableOpacity>

          {currentStep < totalSteps ? (
            <TouchableOpacity
              onPress={handleNext}
              className="px-7 py-3 rounded-xl bg-indigo-600"
              accessibilityRole="button"
            >
              <Text className="text-white text-base font-semibold">Next</Text>
            </TouchableOpacity>
          ) : (
            <View className="flex-row space-x-2">
              <TouchableOpacity
                onPress={handlePreview}
                className="flex-row items-center px-4 py-3 rounded-xl border border-blue-300 bg-blue-50"
              >
                <Eye size={16} color="#1D4ED8" />
                <Text className="ml-2 text-blue-700 text-base font-semibold">Preview</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={handlePublish}
                className="px-7 py-3 rounded-xl bg-green-600"
              >
                <Text className="text-white text-base font-semibold">Publish</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}
