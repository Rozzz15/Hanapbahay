import React, { useState, useEffect } from 'react';
import { View, ScrollView, Pressable, Alert, Modal, TextInput, TouchableOpacity, Image, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { VStack } from '@/components/ui/vstack';
import { Text } from '@/components/ui/text';
import { ChevronRight, User2, CreditCard, HelpCircle, LogOut, X, Image as ImageIcon, Trash2, Home } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { InteractiveButton } from '@/components/buttons';
import { useToast, Toast, ToastTitle, ToastDescription } from '@/components/ui/toast';
import { 
    saveUserProfilePhoto, 
    getUserProfilePhoto, 
    deleteUserProfilePhoto, 
    updateUserProfilePhoto 
} from '@/utils/profile-photos';

type MenuItem = {
    icon: React.ReactNode;
    label: string;
    route?: string;
    onPress?: () => void;
    isLogout?: boolean;
};

const MenuButton = ({ item }: { item: MenuItem }) => {
    const router = useRouter();

    const handlePress = () => {
        console.log('MenuButton pressed:', item.label);
        if (item.onPress) {
            console.log('Calling onPress for:', item.label);
            item.onPress();
        } else if (item.route) {
            console.log('Navigating to route:', item.route);
            router.push(item.route as any); // Type assertion since we know these are valid routes
        }
    };

    // Use TouchableOpacity for better web compatibility
    if (Platform.OS === 'web') {
        return (
            <TouchableOpacity
                onPress={handlePress}
                className={`flex-row items-center py-4 px-4 bg-white border-b border-gray-100 ${item.isLogout ? 'bg-red-50' : ''}`}
                accessibilityRole="button"
                accessibilityLabel={item.label}
                accessibilityHint={item.isLogout ? 'Double tap to logout' : `Double tap to open ${item.label}`}
                activeOpacity={0.7}
            >
                <View className={`w-8 h-8 justify-center items-center rounded-full mr-3 ${item.isLogout ? 'bg-red-100' : 'bg-gray-50'}`}>
                    {item.icon}
                </View>
                <Text className={`flex-1 text-base ${item.isLogout ? 'text-red-600 font-semibold' : ''}`}>{item.label}</Text>
                {!item.isLogout && <ChevronRight size={20} color="#9CA3AF" />}
            </TouchableOpacity>
        );
    }

    return (
        <Pressable
            onPress={handlePress}
            style={({ pressed }) => [
                {
                    opacity: pressed ? 0.7 : 1,
                    transform: [{ scale: pressed ? 0.98 : 1 }]
                }
            ]}
            className={`flex-row items-center py-4 px-4 bg-white border-b border-gray-100 ${item.isLogout ? 'bg-red-50' : ''}`}
            accessibilityRole="button"
            accessibilityLabel={item.label}
            accessibilityHint={item.isLogout ? 'Double tap to logout' : `Double tap to open ${item.label}`}
        >
            <View className={`w-8 h-8 justify-center items-center rounded-full mr-3 ${item.isLogout ? 'bg-red-100' : 'bg-gray-50'}`}>
                {item.icon}
            </View>
            <Text className={`flex-1 text-base ${item.isLogout ? 'text-red-600 font-semibold' : ''}`}>{item.label}</Text>
            {!item.isLogout && <ChevronRight size={20} color="#9CA3AF" />}
        </Pressable>
    );
};

export default function ProfileScreen() {
    const router = useRouter();
    const { signOut, user, isAuthenticated } = useAuth();
    const isOwner = Array.isArray(user?.roles) && user?.roles.includes('owner');
    const toast = useToast();
    
    // State for modals
    const [showPersonalDetails, setShowPersonalDetails] = useState(false);
    const [showPaymentDetails, setShowPaymentDetails] = useState(false);
    const [showFAQ, setShowFAQ] = useState(false);
    const [showCardNumber, setShowCardNumber] = useState(false);
    
    // Personal details state - initialize with empty values, will be loaded from storage/database
    const [personalDetails, setPersonalDetails] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '+63',
        address: '',
        profilePhoto: null as string | null
    });
    
    // Fixed country code for Philippines
    const countryCode = '+63';
    
    // Storage keys (per-user)
    const PERSONAL_DETAILS_KEY = user?.id ? `personal_details:${user.id}` : 'personal_details';
    const PAYMENT_DETAILS_KEY = user?.id ? `payment_details:${user.id}` : 'payment_details';
    
    // Load data from storage on component mount
    useEffect(() => {
        // Load user data with error handling
        const loadUserData = async () => {
            try {
                console.log('🔄 Loading user data for profile...');
                console.log('👤 Current user:', user?.id);
                
                // Debug: Check what's in storage before loading
                if (user?.id) {
                    const storageKey = `personal_details:${user.id}`;
                    const photoKey = `${storageKey}_photo`;
                    
                    console.log('🔍 Checking storage keys:');
                    console.log('📝 Personal details key:', storageKey);
                    console.log('📸 Photo key:', photoKey);
                    
                    try {
                        const storedDetails = await AsyncStorage.getItem(storageKey);
                        const storedPhoto = await AsyncStorage.getItem(photoKey);
                        console.log('📦 Storage check results:');
                        console.log('📝 Has personal details:', !!storedDetails);
                        console.log('📸 Has photo:', !!storedPhoto);
                        if (storedPhoto) {
                            console.log('📸 Photo size:', storedPhoto.length);
                        }
                    } catch (storageError) {
                        console.log('⚠️ Storage check failed:', storageError);
                    }
                }
                
                await loadPersonalDetails();
                await loadPaymentDetails();
                console.log('✅ User data loaded successfully');
                // Note: Removed clearAllStoredData to preserve sign-up data
            } catch (error) {
                console.error('❌ Error loading user data:', error);
                // Continue with default values even if loading fails
            }
        };
        
        if (user?.id) {
            loadUserData();
        }
    }, [user?.id]);
    
    // Force refresh when component becomes visible
    useEffect(() => {
        const handleFocus = () => {
            console.log('🔄 Profile screen focused, refreshing data...');
            loadPersonalDetails();
            loadPaymentDetails();
        };
        
        // This will reload data when the screen comes into focus
        return () => {};
    }, []);

    // Add a refresh function that can be called manually
    const refreshProfileData = async () => {
        console.log('🔄 Manually refreshing profile data...');
        try {
            await loadPersonalDetails();
            await loadPaymentDetails();
            console.log('✅ Profile data refreshed successfully');
        } catch (error) {
            console.error('❌ Error refreshing profile data:', error);
        }
    };

    // Force refresh when personal details modal is opened
    useEffect(() => {
        if (showPersonalDetails) {
            console.log('📱 Personal details modal opened, refreshing photo display...');
            // Force a re-render to ensure photo is displayed
            setTimeout(() => {
                setPersonalDetails(prev => ({...prev}));
            }, 100);
        }
    }, [showPersonalDetails, personalDetails.profilePhoto]);
    
    // Force refresh photo display
    const refreshPhotoDisplay = () => {
        setPersonalDetails(prev => ({...prev}));
    };
    
    // Clear all stored data to start fresh
    const clearAllStoredData = async () => {
        try {
            await AsyncStorage.removeItem('auth_user');
            await AsyncStorage.removeItem('personal_details');
            await AsyncStorage.removeItem('payment_details');
            console.log('All stored data cleared - ready for fresh start');
        } catch (error) {
            console.error('Error clearing stored data:', error);
        }
    };

    // Safety check - ensure profile is always accessible
    if (!isAuthenticated) {
        return (
            <View className="flex-1 justify-center items-center bg-gray-50">
                <Text className="text-lg font-semibold text-gray-600 mb-2">Authentication Required</Text>
                <Text className="text-gray-500 text-center px-6">
                    Please log in to access your profile
                </Text>
                <InteractiveButton
                    text="Go to Login"
                    onPress={() => router.push('/login')}
                    variant="primary"
                />
            </View>
        );
    }
    
    
    
    
    
    const loadPersonalDetails = async () => {
        try {
            console.log('📂 Loading personal details from persistent storage...');
            console.log('🔑 Storage key:', PERSONAL_DETAILS_KEY);
            console.log('👤 Current user ID:', user?.id);
            
            // Always try to load profile photo from database first
            let profilePhoto = null;
            if (user?.id) {
                try {
                    profilePhoto = await getUserProfilePhoto(user.id);
                    console.log('📸 Profile photo from database:', {
                        found: !!profilePhoto,
                        id: profilePhoto?.id,
                        fileName: profilePhoto?.fileName,
                        hasPhotoUri: !!profilePhoto?.photoUri,
                        photoUriPrefix: profilePhoto?.photoUri?.substring(0, 50),
                        photoUriLength: profilePhoto?.photoUri?.length,
                        isBase64: profilePhoto?.photoUri?.startsWith('data:') ? 'Yes' : 'No'
                    });
                } catch (photoError) {
                    console.log('⚠️ Could not load profile photo:', photoError);
                }
            }
            
            const stored = await AsyncStorage.getItem(PERSONAL_DETAILS_KEY);
            console.log('📦 Stored data found:', !!stored);
            
            if (stored) {
                const parsedData = JSON.parse(stored);
                console.log('✅ Personal details loaded from storage:', {
                    firstName: parsedData.firstName,
                    lastName: parsedData.lastName,
                    email: parsedData.email,
                    phone: parsedData.phone,
                    address: parsedData.address
                });
                
                // Try to load profile photo separately
                let storedPhoto = null;
                try {
                    const photoKey = `${PERSONAL_DETAILS_KEY}_photo`;
                    storedPhoto = await AsyncStorage.getItem(photoKey);
                    console.log('📸 Stored photo found:', !!storedPhoto);
                    if (storedPhoto) {
                        console.log('📸 Stored photo size:', storedPhoto.length, 'characters');
                        console.log('📸 Stored photo preview:', storedPhoto.substring(0, 50) + '...');
                    }
                } catch (photoError) {
                    console.log('⚠️ Could not load stored photo:', photoError);
                }
                
                // Priority: database photo > stored photo > null
                const finalPhotoUri = profilePhoto?.photoUri || storedPhoto || null;
                console.log('🎯 Final photo URI source:', {
                    databasePhoto: !!profilePhoto?.photoUri,
                    storedPhoto: !!storedPhoto,
                    finalPhoto: !!finalPhotoUri
                });
                
                const finalDetails = {
                    ...parsedData,
                    email: parsedData.email || '', // Show stored email if available
                    profilePhoto: finalPhotoUri
                };
                
                setPersonalDetails(finalDetails);
            } else {
                console.log('📝 No stored personal details found, checking database for user data...');
                
                // Try to load user data from database if available
                let userData = null;
                
                if (user?.id) {
                    try {
                        const { db } = await import('@/utils/db');
                        userData = await db.get('users', user.id) as any;
                        console.log('📊 User data from database:', userData);
                        
                        if (!userData) {
                            console.log('⚠️ No user data found in database for ID:', user.id);
                            // Let's also check what users exist in the database
                            const allUsers = await db.list('users');
                            console.log('📋 All users in database:', allUsers);
                        }
                    } catch (dbError) {
                        console.log('⚠️ Could not load user data from database:', dbError);
                    }
                }
                
                // Try to load profile photo from separate storage even if no personal details exist
                let storedPhoto = null;
                try {
                    const photoKey = `${PERSONAL_DETAILS_KEY}_photo`;
                    storedPhoto = await AsyncStorage.getItem(photoKey);
                    console.log('📸 Stored photo found (no personal details case):', !!storedPhoto);
                } catch (photoError) {
                    console.log('⚠️ Could not load stored photo (no personal details case):', photoError);
                }
                
                // Initialize with user data from database or fallback values (no auto-save)
                const defaultDetails = {
                    firstName: userData?.name?.split(' ')[0] || userData?.name || '',
                    lastName: userData?.name?.split(' ').slice(1).join(' ') || '',
                    email: userData?.email || '', // Show email from user data if available
                    phone: userData?.phone || '+63',
                    address: userData?.address || '',
                    profilePhoto: profilePhoto?.photoUri || storedPhoto || null
                };
                
                console.log('✅ Initialized personal details with user data (no auto-save):', defaultDetails);
                console.log('🔍 User data from database:', userData);
                console.log('🔍 Profile photo from database:', profilePhoto);
                setPersonalDetails(defaultDetails);
                
                // NO AUTO-SAVE: User must click "Save Changes" to save
            }
        } catch (error) {
            console.error('❌ Error loading personal details:', error);
            // Set default values if loading fails
            const fallbackDetails = {
                firstName: '',
                lastName: '',
                email: '',
                phone: '+63',
                address: '',
                profilePhoto: null
            };
            setPersonalDetails(fallbackDetails);
            console.log('🔄 Using fallback personal details due to error');
        }
    };
    
    const loadPaymentDetails = async () => {
        try {
            const stored = await AsyncStorage.getItem(PAYMENT_DETAILS_KEY);
            if (stored) {
                const parsedData = JSON.parse(stored);
                setPaymentDetails(parsedData);
            }
        } catch (error) {
            console.error('Error loading payment details:', error);
        }
    };
    
    
    const savePersonalDetails = async (data: typeof personalDetails) => {
        try {
            console.log('💾 Saving personal details to persistent storage...');
            console.log('🔑 Storage key:', PERSONAL_DETAILS_KEY);
            console.log('👤 User ID available:', !!user?.id);
            
            // Separate photo from other details to avoid storage quota issues
            const { profilePhoto, ...detailsWithoutPhoto } = data;
            const dataToStore = detailsWithoutPhoto;
            
            console.log('📊 Data being saved (without photo):', {
                firstName: data.firstName,
                lastName: data.lastName,
                email: data.email,
                phone: data.phone,
                address: data.address,
                hasProfilePhoto: !!profilePhoto,
                dataSize: JSON.stringify(dataToStore).length
            });
            
            // Check if AsyncStorage is available
            if (!AsyncStorage) {
                throw new Error('AsyncStorage is not available');
            }
            
            // Validate the storage key
            if (!PERSONAL_DETAILS_KEY || PERSONAL_DETAILS_KEY === 'personal_details:undefined') {
                console.warn('⚠️ Invalid storage key, using fallback');
                const fallbackKey = 'personal_details_fallback';
                await AsyncStorage.setItem(fallbackKey, JSON.stringify(dataToStore));
            } else {
                await AsyncStorage.setItem(PERSONAL_DETAILS_KEY, JSON.stringify(dataToStore));
            }
            
            // Store profile photo separately if it exists and isn't too large
            if (profilePhoto) {
                try {
                    const photoKey = `${PERSONAL_DETAILS_KEY}_photo`;
                    const photoSize = profilePhoto.length;
                    console.log('📸 Saving profile photo:');
                    console.log('📸 Photo key:', photoKey);
                    console.log('📸 Photo size:', photoSize, 'characters');
                    console.log('📸 Photo preview:', profilePhoto.substring(0, 50) + '...');
                    
                    // Check if photo is too large (limit to ~1MB in base64)
                    if (photoSize > 1000000) {
                        console.warn('⚠️ Profile photo too large for storage, keeping in memory only');
                    } else {
                        await AsyncStorage.setItem(photoKey, profilePhoto);
                        console.log('✅ Profile photo saved separately to key:', photoKey);
                        
                        // Verify it was saved
                        const verification = await AsyncStorage.getItem(photoKey);
                        console.log('🔍 Photo save verification:', !!verification);
                    }
                } catch (photoError) {
                    console.warn('⚠️ Failed to save profile photo to storage:', photoError);
                    // Don't fail the entire save for photo storage issues
                }
            }
            
            console.log('✅ Personal details saved successfully to persistent storage');
        } catch (error) {
            console.error('❌ Error saving personal details:', error);
            console.error('❌ Error details:', {
                message: error instanceof Error ? error.message : 'Unknown error',
                stack: error instanceof Error ? error.stack : undefined,
                storageKey: PERSONAL_DETAILS_KEY,
                userId: user?.id,
                dataValid: !!data
            });
            throw error; // Re-throw to allow calling functions to handle
        }
    };
    
    const savePaymentDetails = async (data: typeof paymentDetails) => {
        try {
            await AsyncStorage.setItem(PAYMENT_DETAILS_KEY, JSON.stringify(data));
        } catch (error) {
            console.error('Error saving payment details:', error);
        }
    };
    
    
    // Payment details state
    const [paymentDetails, setPaymentDetails] = useState({
        cardNumber: '',
        expiryDate: '',
        cardHolder: '',
        billingAddress: ''
    });
    

    const handleLogout = async () => {
        console.log('Logout button pressed');
        console.log('Current user before logout:', user);
        
        try {
            console.log('Starting logout process...');
            
            // Call signOut from AuthContext
            await signOut();
            
            console.log('Logout successful - user will be redirected automatically');
            
            // The tab layout will automatically redirect to login when user becomes null
            // No need for manual navigation as the TabLayout handles this
            
        } catch (error) {
            console.error('Logout error:', error);
            Alert.alert(
                'Logout Error', 
                'Failed to logout. Please try again or refresh the page.',
                [
                    {
                        text: 'OK',
                        onPress: () => console.log('User acknowledged logout error')
                    }
                ]
            );
        }
    };

    const handleSavePersonalDetails = async () => {
        try {
            console.log('🔥 NEW VALIDATION LOGIC - No required fields! Timestamp:', new Date().toISOString());
            console.log('📝 Current personal details:', personalDetails);
            
            // Only validate fields that have content - allow partial updates
            
            // Validate email format only if email is provided
            if (personalDetails.email.trim() && personalDetails.email.trim() !== '') {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(personalDetails.email)) {
                    toast.show({
                        id: 'validation-email',
                        placement: "top",
                        render: ({ id }) => (
                            <Toast nativeID={id} action="error">
                                <ToastTitle>Invalid Email</ToastTitle>
                                <ToastDescription>Please enter a valid email address</ToastDescription>
                            </Toast>
                        ),
                    });
                    return;
                }
            }

            // Validate phone number only if phone is provided
            if (personalDetails.phone.trim() && personalDetails.phone.trim() !== '' && personalDetails.phone.trim() !== '+63') {
                if (!personalDetails.phone.startsWith('+63')) {
                    toast.show({
                        id: 'validation-phone-prefix',
                        placement: "top",
                        render: ({ id }) => (
                            <Toast nativeID={id} action="error">
                                <ToastTitle>Invalid Phone Number</ToastTitle>
                                <ToastDescription>Phone number must start with +63</ToastDescription>
                            </Toast>
                        ),
                    });
                    return;
                }

                // Validate phone number length (should be +63 + 10 digits)
                if (personalDetails.phone.length !== 13) {
                    toast.show({
                        id: 'validation-phone-length',
                        placement: "top",
                        render: ({ id }) => (
                            <Toast nativeID={id} action="error">
                                <ToastTitle>Invalid Phone Number</ToastTitle>
                                <ToastDescription>Phone number must be exactly 10 digits after +63</ToastDescription>
                            </Toast>
                        ),
                    });
                    return;
                }
            }
            
            console.log('✅ All validations passed! Saving personal details:', personalDetails);
            
            // Update the display immediately (this always works)
            setPersonalDetails({...personalDetails});
            
            // Try to save to AsyncStorage (optional - don't fail if this doesn't work)
            try {
                await savePersonalDetails(personalDetails);
                console.log('✅ Personal details saved to storage successfully');
            } catch (storageError) {
                console.warn('⚠️ Storage save failed, but profile updated in memory:', storageError);
                // Don't throw - the profile is still updated in the app
            }
            
            // Save profile photo to database if it exists and user is authenticated
            if (personalDetails.profilePhoto && user?.id) {
                try {
                    console.log('📸 Saving profile photo to database...');
                    const fileName = `profile_photo_${user.id}_${Date.now()}.jpg`;
                    
                    if (personalDetails.profilePhoto.trim()) {
                        // Update the photo in database
                        await updateUserProfilePhoto(
                            user.id,
                            personalDetails.profilePhoto,
                            fileName,
                            'image/jpeg'
                        );
                        console.log('✅ Profile photo saved to database successfully');
                    }
                } catch (photoError) {
                    console.warn('⚠️ Photo database save failed, but profile saved:', photoError);
                    // Don't fail the entire save for photo issues
                }
            } else if (!personalDetails.profilePhoto && user?.id) {
                // If no photo in state but user has previous photo, delete it
                try {
                    console.log('🗑️ Removing profile photo from database...');
                    await deleteUserProfilePhoto(user.id);
                    console.log('✅ Profile photo removed from database successfully');
                } catch (photoError) {
                    console.warn('⚠️ Photo database delete failed:', photoError);
                    // Don't fail the entire save for photo issues
                }
            }
            
            // Show success toast
            toast.show({
                id: 'personal-details-saved',
                placement: "top",
                render: ({ id }) => (
                    <Toast nativeID={id} action="success">
                        <ToastTitle>Profile Updated!</ToastTitle>
                        <ToastDescription>Your personal details have been saved successfully</ToastDescription>
                    </Toast>
                ),
            });
            
            // Close the modal
            setShowPersonalDetails(false);
        } catch (error) {
            console.error('❌ Unexpected error in handleSavePersonalDetails:', error);
            // This should rarely happen now since we handle storage errors gracefully
            toast.show({
                id: 'personal-details-error',
                placement: "top",
                render: ({ id }) => (
                    <Toast nativeID={id} action="error">
                        <ToastTitle>Unexpected Error</ToastTitle>
                        <ToastDescription>An unexpected error occurred. Your changes may still be saved.</ToastDescription>
                    </Toast>
                ),
            });
        }
    };

    const handleSavePaymentDetails = async () => {
        try {
            // Validate required fields
            if (!paymentDetails.cardNumber.trim() || !paymentDetails.expiryDate.trim() || !paymentDetails.cardHolder.trim()) {
                Alert.alert('Error', 'Please fill in all required fields');
                return;
            }

            // Validate card number (should be 16 digits)
            const cardNumberDigits = paymentDetails.cardNumber.replace(/\D/g, '');
            if (cardNumberDigits.length !== 16) {
                Alert.alert('Error', 'Card number must be 16 digits');
                return;
            }

            // Validate expiry date format (MM/YY)
            const expiryRegex = /^(0[1-9]|1[0-2])\/\d{2}$/;
            if (!expiryRegex.test(paymentDetails.expiryDate)) {
                Alert.alert('Error', 'Expiry date must be in MM/YY format');
                return;
            }

            // Validate expiry date is not in the past
            const [month, year] = paymentDetails.expiryDate.split('/');
            const expiryDate = new Date(2000 + parseInt(year), parseInt(month) - 1);
            const currentDate = new Date();
            if (expiryDate < currentDate) {
                Alert.alert('Error', 'Card has expired');
                return;
            }

            console.log('Saving payment details:', paymentDetails);
            
            // Save to AsyncStorage
            await savePaymentDetails(paymentDetails);
            
            // Update the display immediately
            setPaymentDetails({...paymentDetails});
            
            console.log('Payment details saved successfully');
            
            Alert.alert('Success', 'Payment details updated successfully!', [
                {
                    text: 'OK',
                    onPress: () => setShowPaymentDetails(false)
                }
            ]);
        } catch (error) {
            console.error('Error saving payment details:', error);
            Alert.alert('Error', 'Failed to save payment details. Please try again.');
        }
    };


    const handlePhotoAction = async (action: 'gallery' | 'remove') => {
        console.log('🎯 handlePhotoAction called with action:', action);
        console.log('👤 Current user:', user?.id);
        console.log('📸 Current profile photo:', personalDetails.profilePhoto ? 'Has photo' : 'No photo');
        
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
                                console.log('🗑️ Removing profile photo...');
                                
                                // Clear the photo from state only (no auto-save to database)
                                const updatedDetails = {...personalDetails, profilePhoto: null};
                                
                                // Update state only - user must click "Save Changes" to persist
                                setPersonalDetails(updatedDetails);
                                
                                // Force a re-render to ensure photo is removed from both main profile and modal
                                setTimeout(() => {
                                    setPersonalDetails(prev => ({...prev, profilePhoto: null}));
                                }, 100);
                                
                                console.log('✅ Profile photo removed from state - requires save to persist');
                                toast.show({
                                    id: 'photo-removed',
                                    placement: "top",
                                    render: ({ id }) => (
                                        <Toast nativeID={id} action="success">
                                            <ToastTitle>Photo Removed</ToastTitle>
                                            <ToastDescription>Photo removed. Click "Save Changes" to confirm.</ToastDescription>
                                        </Toast>
                                    ),
                                });
                            } catch (error) {
                                console.error('❌ Error removing photo:', error);
                                toast.show({
                                    id: 'photo-remove-error',
                                    placement: "top",
                                    render: ({ id }) => (
                                        <Toast nativeID={id} action="error">
                                            <ToastTitle>Remove Failed</ToastTitle>
                                            <ToastDescription>Failed to remove photo. Please try again.</ToastDescription>
                                        </Toast>
                                    ),
                                });
                            }
                        }
                    }
                ]
            );
        } else {
            try {
                console.log('📸 Starting photo selection process...');
                console.log('📱 Platform:', Platform.OS);
                console.log('🔧 ImagePicker available:', !!ImagePicker);
                
                // Test if ImagePicker methods are available
                if (!ImagePicker.requestMediaLibraryPermissionsAsync) {
                    throw new Error('ImagePicker.requestMediaLibraryPermissionsAsync not available');
                }
                
                // Request permission
                console.log('🔐 Requesting media library permissions...');
                const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
                console.log('🔐 Permission result:', permissionResult);
                
                if (!permissionResult.granted) {
                    toast.show({
                        id: 'photo-permission-warning',
                        placement: "top",
                        render: ({ id }) => (
                            <Toast nativeID={id} action="warning">
                                <ToastTitle>Permission Required</ToastTitle>
                                <ToastDescription>Please allow access to your photo library</ToastDescription>
                            </Toast>
                        ),
                    });
                    return;
                }
                
                console.log('✅ Photo library permission granted');
                
                // Launch image picker with web-compatible options (compressed for storage)
                const pickerOptions = {
                    mediaTypes: ImagePicker.MediaTypeOptions.Images,
                    allowsEditing: true,
                    aspect: [1, 1] as [number, number],
                    quality: 0.3, // Reduced quality to minimize file size
                    base64: true, // Always include base64 for better compatibility
                    exif: false, // Reduce data size
                };
                
                console.log('🔧 Image picker options:', pickerOptions);
                console.log('🚀 Launching image library...');
                
                const result = await ImagePicker.launchImageLibraryAsync(pickerOptions);
                console.log('📋 Raw image picker result:', result);

                console.log('📋 Image picker result:', {
                    canceled: result.canceled,
                    hasAssets: !!result.assets,
                    assetsLength: result.assets?.length || 0
                });

                if (!result.canceled && result.assets && result.assets.length > 0) {
                    const selectedImage = result.assets[0];
                    console.log('📷 Image selected:', {
                        uri: selectedImage.uri,
                        type: selectedImage.type,
                        width: selectedImage.width,
                        height: selectedImage.height,
                        fileSize: selectedImage.fileSize,
                        base64: selectedImage.base64 ? 'Has base64' : 'No base64'
                    });
                    
                    try {
                        if (!user?.id) {
                            throw new Error('User not authenticated');
                        }
                        
                        // Generate a filename for the photo
                        const fileName = `profile_photo_${user.id}_${Date.now()}.jpg`;
                        
                        console.log('💾 Saving profile photo to database...');
                        
                        // For web, use base64 data URI if available, otherwise use the URI
                        let imageUri = selectedImage.uri;
                        if (Platform.OS === 'web' && selectedImage.base64) {
                            imageUri = `data:${selectedImage.type || 'image/jpeg'};base64,${selectedImage.base64}`;
                            console.log('🌐 Using base64 data URI for web compatibility');
                            console.log('📏 Base64 image size:', selectedImage.base64.length, 'characters');
                            
                            // If image is still too large, try to compress it further
                            if (selectedImage.base64.length > 500000) { // ~500KB limit
                                console.log('⚠️ Image is large, this may cause storage issues');
                                // Could implement additional compression here if needed
                            }
                        }
                        
                        // Store the image URI directly without auto-saving to database
                        console.log('📸 Storing photo URI temporarily - requires save to persist');
                        let photoUri = imageUri;
                        
                        console.log('✅ Profile photo processed:', {
                            photoUri: photoUri.substring(0, 100) + '...',
                            fileName: fileName,
                            imageType: selectedImage.type || 'image/jpeg'
                        });
                        
                        // Update personal details with the photo URI (no auto-save)
                        const updatedDetails = {
                            ...personalDetails, 
                            profilePhoto: photoUri
                        };
                        
                        console.log('🔄 Updating state with new photo (no auto-save)...');
                        console.log('📸 New photo URI length:', photoUri.length);
                        
                        // Update state only - user must click "Save Changes" to persist
                        setPersonalDetails(updatedDetails);
                        
                        console.log('✅ State updated - user must save to persist');
                        
                        toast.show({
                            id: 'photo-updated',
                            placement: "top",
                            render: ({ id }) => (
                                <Toast nativeID={id} action="success">
                                    <ToastTitle>Photo Selected!</ToastTitle>
                                    <ToastDescription>Photo selected. Click "Save Changes" to save.</ToastDescription>
                                </Toast>
                            ),
                        });
                    } catch (error) {
                        console.error('❌ Error saving photo:', error);
                        console.error('❌ Error details:', {
                            message: error instanceof Error ? error.message : 'Unknown error',
                            stack: error instanceof Error ? error.stack : undefined,
                            selectedImageUri: selectedImage.uri.substring(0, 100),
                            userId: user?.id
                        });
                        
                        toast.show({
                            id: 'photo-save-error',
                            placement: "top",
                            render: ({ id }) => (
                                <Toast nativeID={id} action="error">
                                    <ToastTitle>Save Failed</ToastTitle>
                                    <ToastDescription>Failed to save photo: {error instanceof Error ? error.message : 'Unknown error'}</ToastDescription>
                                </Toast>
                            ),
                        });
                    }
                } else {
                    console.log('❌ Photo selection cancelled');
                }
            } catch (error) {
                console.error('❌ Error picking image:', error);
                toast.show({
                    id: 'photo-selection-error',
                    placement: "top",
                    render: ({ id }) => (
                        <Toast nativeID={id} action="error">
                            <ToastTitle>Selection Failed</ToastTitle>
                            <ToastDescription>Failed to select photo. Please try again.</ToastDescription>
                        </Toast>
                    ),
                });
            }
        }
    };

    const menuItems: MenuItem[] = [
        // Owner-only actions
        ...(isOwner ? [
            {
                icon: <Home size={20} color="#4B5563" />,
                label: 'Create Property Listing',
                route: '/(owner)/property-owner',
            },
            {
                icon: <Home size={20} color="#4B5563" />,
                label: 'My Listings',
                route: '/(owner)/owner-listings',
            },
        ] : []),
        // Common actions
        {
            icon: <User2 size={20} color="#4B5563" />,
            label: 'Personal details',
            onPress: () => setShowPersonalDetails(true),
        },
        {
            icon: <CreditCard size={20} color="#4B5563" />,
            label: `Payment details${paymentDetails.cardNumber ? ' ✓' : ''}`,
            onPress: () => setShowPaymentDetails(true),
        },
        {
            icon: <HelpCircle size={20} color="#4B5563" />,
            label: 'FAQ',
            onPress: () => setShowFAQ(true),
        },
        {
            icon: <LogOut size={20} color="#DC2626" />,
            label: 'Logout',
            onPress: handleLogout,
            isLogout: true,
        },
    ];

    // Error boundary for profile screen
    const [hasError, setHasError] = useState(false);

    if (hasError) {
        return (
            <View className="flex-1 justify-center items-center bg-gray-50 p-6">
                <Text className="text-lg font-semibold text-gray-600 mb-2">Profile Error</Text>
                <Text className="text-gray-500 text-center mb-4">
                    There was an issue loading your profile. Please try again.
                </Text>
                <InteractiveButton
                    text="Retry"
                    onPress={() => {
                        setHasError(false);
                        // Refresh profile data
                        refreshProfileData();
                    }}
                    variant="primary"
                />
            </View>
        );
    }

    return (
        <ScrollView className="flex-1 bg-gray-50">
            <VStack className="pt-14 pb-6 px-4 bg-white items-center border-b border-gray-100">
                <View className="w-32 h-32 mb-3 rounded-full bg-gray-200 items-center justify-center overflow-hidden">
                    {personalDetails.profilePhoto ? (
                        <Image 
                            key={`main-profile-${personalDetails.profilePhoto.substring(0, 50)}`}
                            source={{ uri: personalDetails.profilePhoto }}
                            className="w-full h-full"
                            style={{ width: 128, height: 128, borderRadius: 64 }}
                            resizeMode="cover"
                            onError={(error) => {
                                console.log('❌ Main profile photo failed to load:', error);
                                console.log('❌ Failed URI:', personalDetails.profilePhoto);
                                // If image fails to load, try to reload from database
                                if (user?.id) {
                                    getUserProfilePhoto(user.id).then(photo => {
                                        if (photo?.photoUri) {
                                            console.log('🔄 Reloaded photo from database:', photo.photoUri.substring(0, 100));
                                            setPersonalDetails(prev => ({...prev, profilePhoto: photo.photoUri}));
                                        } else {
                                            console.log('❌ No photo found in database');
                                            setPersonalDetails(prev => ({...prev, profilePhoto: null}));
                                        }
                                    }).catch((dbError) => {
                                        console.log('❌ Database reload failed:', dbError);
                                        setPersonalDetails(prev => ({...prev, profilePhoto: null}));
                                    });
                                } else {
                                    setPersonalDetails(prev => ({...prev, profilePhoto: null}));
                                }
                            }}
                            onLoad={() => {
                                console.log('✅ Main profile photo loaded successfully');
                            }}
                        />
                    ) : (
                        <Text className="text-5xl font-semibold text-gray-600">
                            {personalDetails.firstName && personalDetails.lastName 
                                ? `${personalDetails.firstName.charAt(0)}${personalDetails.lastName.charAt(0)}`
                                : '?'
                            }
                        </Text>
                    )}
                </View>
                <Text className="text-xl font-semibold mb-1">
                    {personalDetails.firstName && personalDetails.lastName 
                        ? `${personalDetails.firstName} ${personalDetails.lastName}`
                        : personalDetails.firstName
                        ? personalDetails.firstName
                        : personalDetails.email
                        ? personalDetails.email.split('@')[0] // Show email username if no name
                        : 'Complete Your Profile'
                    }
                </Text>
                <Text className="text-gray-400 mt-1">
                    {personalDetails.email || 'Please add your email'}
                </Text>
            </VStack>


            {/* Payment Summary */}
            {paymentDetails.cardNumber && (
                <View className="mt-4 mx-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <Text className="text-sm font-medium text-green-800 mb-1">Payment Method</Text>
                    <Text className="text-green-700">
                        {paymentDetails.cardNumber.replace(/\d(?=\d{4})/g, '*')} • {paymentDetails.cardHolder}
                    </Text>
                </View>
            )}

            <VStack className="mt-4">
                {menuItems.map((item, index) => (
                    <MenuButton key={index} item={item} />
                ))}
            </VStack>

            {/* Personal Details Modal */}
            <Modal visible={showPersonalDetails} animationType="slide" presentationStyle="pageSheet">
                <View className="flex-1 bg-white">
                    <View className="flex-row items-center justify-between p-4 border-b border-gray-200">
                        <Text className="text-xl font-semibold">Personal Details</Text>
                        <TouchableOpacity onPress={() => setShowPersonalDetails(false)}>
                            <X size={24} color="#6B7280" />
                        </TouchableOpacity>
                    </View>
                    <ScrollView className="flex-1 p-4">
                        <VStack className="space-y-4">
                            {/* Profile Photo Section */}
                            <View className="items-center mb-6">
                                <Text className="text-sm font-medium text-gray-700 mb-4">Profile Photo</Text>
                                        <View className="relative">
                                            <View className="w-32 h-32 mb-3 rounded-full bg-gray-200 items-center justify-center overflow-hidden">
                                                {personalDetails.profilePhoto ? (
                                                    <Image 
                                                        key={`modal-profile-${personalDetails.profilePhoto.substring(0, 50)}`}
                                                        source={{ uri: personalDetails.profilePhoto }}
                                                        className="w-full h-full"
                                                        style={{ width: 128, height: 128, borderRadius: 64 }}
                                                        resizeMode="cover"
                                                        onError={(error) => {
                                                            console.log('❌ Modal profile photo failed to load:', error);
                                                            console.log('❌ Failed URI:', personalDetails.profilePhoto);
                                                            // If image fails to load, try to reload from database
                                                            if (user?.id) {
                                                                getUserProfilePhoto(user.id).then(photo => {
                                                                    if (photo?.photoUri) {
                                                                        console.log('🔄 Reloaded modal photo from database:', photo.photoUri.substring(0, 100));
                                                                        setPersonalDetails(prev => ({...prev, profilePhoto: photo.photoUri}));
                                                                    } else {
                                                                        console.log('❌ No photo found in database for modal');
                                                                        setPersonalDetails(prev => ({...prev, profilePhoto: null}));
                                                                    }
                                                                }).catch((dbError) => {
                                                                    console.log('❌ Database reload failed for modal:', dbError);
                                                                    setPersonalDetails(prev => ({...prev, profilePhoto: null}));
                                                                });
                                                            } else {
                                                                setPersonalDetails(prev => ({...prev, profilePhoto: null}));
                                                            }
                                                        }}
                                                        onLoad={() => {
                                                            console.log('✅ Modal profile photo loaded successfully');
                                                        }}
                                                    />
                                                ) : (
                                                    <Text className="text-5xl font-semibold text-gray-600">
                                                        {personalDetails.firstName && personalDetails.lastName 
                                                            ? `${personalDetails.firstName.charAt(0)}${personalDetails.lastName.charAt(0)}`
                                                            : '?'
                                                        }
                                                    </Text>
                                                )}
                                            </View>
                                    
                                    {/* Photo Action Buttons */}
                                    <View className="flex-row space-x-2 mt-3">
                                        <TouchableOpacity
                                            onPress={() => handlePhotoAction('gallery')}
                                            className="flex-row items-center bg-blue-50 border border-blue-200 rounded-lg px-4 py-2"
                                        >
                                            <ImageIcon size={16} color="#3B82F6" />
                                            <Text className="text-blue-600 font-medium ml-1 text-sm">Select Photo</Text>
                                        </TouchableOpacity>
                                        
                                        
                                        {personalDetails.profilePhoto && (
                                            <TouchableOpacity
                                                onPress={() => handlePhotoAction('remove')}
                                                className="flex-row items-center bg-red-50 border border-red-200 rounded-lg px-4 py-2"
                                            >
                                                <Trash2 size={16} color="#EF4444" />
                                                <Text className="text-red-600 font-medium ml-1 text-sm">Remove</Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                    
                                </View>
                            </View>
                            
                            <View>
                                <Text className="text-sm font-medium text-gray-700 mb-2">First Name</Text>
                                <TextInput
                                    className="border border-gray-300 rounded-lg p-3 text-base"
                                    value={personalDetails.firstName}
                                    onChangeText={(text) => setPersonalDetails({...personalDetails, firstName: text})}
                                />
                            </View>
                            <View>
                                <Text className="text-sm font-medium text-gray-700 mb-2">Last Name</Text>
                                <TextInput
                                    className="border border-gray-300 rounded-lg p-3 text-base"
                                    value={personalDetails.lastName}
                                    onChangeText={(text) => setPersonalDetails({...personalDetails, lastName: text})}
                                />
                            </View>
                            <View>
                                <Text className="text-sm font-medium text-gray-700 mb-2">Email</Text>
                                <TextInput
                                    className="border border-gray-300 rounded-lg p-3 text-base"
                                    value={personalDetails.email}
                                    onChangeText={(text) => setPersonalDetails({...personalDetails, email: text})}
                                    keyboardType="email-address"
                                />
                            </View>
                            <View>
                                <Text className="text-sm font-medium text-gray-700 mb-2">Phone Number</Text>
                                <View className="flex-row space-x-2">
                                    {/* Fixed Country Code Display */}
                                    <View className="border border-gray-300 rounded-lg p-3 flex-row items-center justify-center min-w-[100px] bg-gray-100">
                                        <Text className="text-lg mr-1">🇵🇭</Text>
                                        <Text className="text-base font-medium text-gray-800">
                                            {countryCode}
                                        </Text>
                                    </View>
                                    
                                    {/* Phone Number Input */}
                                    <TextInput
                                        className="flex-1 border border-gray-300 rounded-lg p-3 text-base"
                                        value={personalDetails.phone.replace(countryCode + ' ', '')}
                                        onChangeText={(text) => {
                                            // Only allow digits and limit to 10
                                            const digitsOnly = text.replace(/\D/g, '');
                                            if (digitsOnly.length <= 10) {
                                                const fullPhone = countryCode + ' ' + digitsOnly;
                                                setPersonalDetails({...personalDetails, phone: fullPhone});
                                            }
                                        }}
                                        placeholder="912 345 6789"
                                        keyboardType="phone-pad"
                                        maxLength={10}
                                    />
                                </View>
                            </View>
                            <View>
                                <Text className="text-sm font-medium text-gray-700 mb-2">Address</Text>
                                <TextInput
                                    className="border border-gray-300 rounded-lg p-3 text-base"
                                    value={personalDetails.address}
                                    onChangeText={(text) => setPersonalDetails({...personalDetails, address: text})}
                                    multiline
                                    numberOfLines={3}
                                />
                            </View>
                        </VStack>
                    </ScrollView>
                    <View className="p-4 border-t border-gray-200">
                        <InteractiveButton
                            text="Save Changes"
                            onPress={handleSavePersonalDetails}
                            variant="primary"
                            size="lg"
                            fullWidth={true}
                        />
                    </View>
                </View>
            </Modal>

            {/* Payment Details Modal */}
            <Modal visible={showPaymentDetails} animationType="slide" presentationStyle="pageSheet">
                <View className="flex-1 bg-white">
                    <View className="flex-row items-center justify-between p-4 border-b border-gray-200">
                        <Text className="text-xl font-semibold">Payment Details</Text>
                        <TouchableOpacity onPress={() => setShowPaymentDetails(false)}>
                            <X size={24} color="#6B7280" />
                        </TouchableOpacity>
                    </View>
                    <ScrollView className="flex-1 p-4">
                        <VStack className="space-y-4">
                            <View>
                                <Text className="text-sm font-medium text-gray-700 mb-2">Card Number</Text>
                                <View className="flex-row items-center border border-gray-300 rounded-lg">
                                    <TextInput
                                        className="flex-1 p-3 text-base"
                                        value={showCardNumber ? paymentDetails.cardNumber : paymentDetails.cardNumber.replace(/\d(?=\d{4})/g, '*')}
                                        onChangeText={(text) => {
                                            // Format card number with spaces every 4 digits
                                            const formatted = text.replace(/\s/g, '').replace(/(.{4})/g, '$1 ').trim();
                                            if (formatted.replace(/\s/g, '').length <= 16) {
                                                setPaymentDetails({...paymentDetails, cardNumber: formatted});
                                            }
                                        }}
                                        keyboardType="numeric"
                                        placeholder="1234 5678 9012 3456"
                                        maxLength={19} // 16 digits + 3 spaces
                                        secureTextEntry={!showCardNumber}
                                    />
                                    <TouchableOpacity
                                        onPress={() => setShowCardNumber(!showCardNumber)}
                                        className="p-3"
                                    >
                                        <Text className="text-blue-600 font-medium">
                                            {showCardNumber ? 'Hide' : 'Show'}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                            <View>
                                <Text className="text-sm font-medium text-gray-700 mb-2">Expiry Date</Text>
                                <TextInput
                                    className="border border-gray-300 rounded-lg p-3 text-base"
                                    value={paymentDetails.expiryDate}
                                    onChangeText={(text) => {
                                        // Format expiry date as MM/YY
                                        const formatted = text.replace(/\D/g, '').replace(/(\d{2})(\d{0,2})/, '$1/$2');
                                        if (formatted.length <= 5) {
                                            setPaymentDetails({...paymentDetails, expiryDate: formatted});
                                        }
                                    }}
                                    placeholder="MM/YY"
                                    maxLength={5}
                                />
                            </View>
                            <View>
                                <Text className="text-sm font-medium text-gray-700 mb-2">Card Holder Name</Text>
                                <TextInput
                                    className="border border-gray-300 rounded-lg p-3 text-base"
                                    value={paymentDetails.cardHolder}
                                    onChangeText={(text) => setPaymentDetails({...paymentDetails, cardHolder: text})}
                                />
                            </View>
                            <View>
                                <Text className="text-sm font-medium text-gray-700 mb-2">Billing Address</Text>
                                <TextInput
                                    className="border border-gray-300 rounded-lg p-3 text-base"
                                    value={paymentDetails.billingAddress}
                                    onChangeText={(text) => setPaymentDetails({...paymentDetails, billingAddress: text})}
                                    multiline
                                />
                            </View>
                        </VStack>
                    </ScrollView>
                    <View className="p-4 border-t border-gray-200">
                        <InteractiveButton
                            text="Save Changes"
                            onPress={handleSavePaymentDetails}
                            variant="primary"
                            size="lg"
                            fullWidth={true}
                        />
                    </View>
                </View>
            </Modal>

            {/* FAQ Modal */}
            <Modal visible={showFAQ} animationType="slide" presentationStyle="pageSheet">
                <View className="flex-1 bg-white">
                    <View className="flex-row items-center justify-between p-4 border-b border-gray-200">
                        <Text className="text-xl font-semibold">Frequently Asked Questions</Text>
                        <TouchableOpacity onPress={() => setShowFAQ(false)}>
                            <X size={24} color="#6B7280" />
                        </TouchableOpacity>
                    </View>
                    <ScrollView className="flex-1 p-4">
                        <VStack className="space-y-6">
                            <View>
                                <Text className="text-lg font-semibold text-gray-800 mb-2">How do I book a property?</Text>
                                <Text className="text-gray-600">You can browse available properties, select your preferred dates, and complete the booking process through our secure payment system.</Text>
                            </View>
                            <View>
                                <Text className="text-lg font-semibold text-gray-800 mb-2">What payment methods do you accept?</Text>
                                <Text className="text-gray-600">We accept all major credit cards, debit cards, and digital payment methods including PayPal and Apple Pay.</Text>
                            </View>
                            <View>
                                <Text className="text-lg font-semibold text-gray-800 mb-2">Can I cancel my booking?</Text>
                                <Text className="text-gray-600">Yes, you can cancel your booking up to 24 hours before check-in. Cancellation policies may vary by property.</Text>
                            </View>
                            <View>
                                <Text className="text-lg font-semibold text-gray-800 mb-2">How do I contact support?</Text>
                                <Text className="text-gray-600">You can reach our support team through the chat feature in the app or email us at support@hanapbahay.com</Text>
                            </View>
                            <View>
                                <Text className="text-lg font-semibold text-gray-800 mb-2">Is my payment information secure?</Text>
                                <Text className="text-gray-600">Yes, we use industry-standard encryption to protect your payment information and never store your full card details.</Text>
                            </View>
                            <View>
                                <Text className="text-lg font-semibold text-gray-800 mb-2">How do I update my profile?</Text>
                                <Text className="text-gray-600">Go to your profile tab and tap on "Personal details" to update your information. Changes are saved automatically.</Text>
                            </View>
                            <View>
                                <Text className="text-lg font-semibold text-gray-800 mb-2">Can I change my payment method?</Text>
                                <Text className="text-gray-600">Yes, you can update your payment details anytime in the "Payment details" section of your profile.</Text>
                            </View>
                            <View>
                                <Text className="text-lg font-semibold text-gray-800 mb-2">What if I forget my password?</Text>
                                <Text className="text-gray-600">Use the "Forgot Password" option on the login screen. We'll send you a reset link to your email.</Text>
                            </View>
                            <View>
                                <Text className="text-lg font-semibold text-gray-800 mb-2">How do I delete my account?</Text>
                                <Text className="text-gray-600">Contact our support team to request account deletion. We'll process your request within 24 hours.</Text>
                            </View>
                            <View>
                                <Text className="text-lg font-semibold text-gray-800 mb-2">Is my data private?</Text>
                                <Text className="text-gray-600">Yes, we respect your privacy and never share your personal information with third parties without your consent.</Text>
                            </View>
                        </VStack>
                    </ScrollView>
                </View>
            </Modal>

        </ScrollView>
    );
}
