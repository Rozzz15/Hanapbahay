import React, { useState, useEffect, useCallback, memo } from 'react';
import { View, ScrollView, Pressable, Alert, Modal, TextInput, TouchableOpacity, Image, Platform, StyleSheet, Text } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/toast';
import { notifications, createNotification } from '@/utils';
import { saveUserProfilePhoto } from '@/utils/user-profile-photos';

type MenuItem = {
    icon: React.ReactNode;
    label: string;
    route?: string;
    onPress?: () => void;
    isLogout?: boolean;
};

const MenuButton = memo(({ item }: { item: MenuItem }) => {
    const router = useRouter();

    const handlePress = useCallback(() => {
        console.log('MenuButton pressed:', item.label);
        if (item.onPress) {
            console.log('Calling onPress for:', item.label);
            item.onPress();
        } else if (item.route) {
            console.log('Navigating to route:', item.route);
            router.push(item.route as any);
        }
    }, [item, router]);

    return (
        <TouchableOpacity
            onPress={handlePress}
            style={[
                styles.menuButton,
                item.isLogout && styles.logoutButton
            ]}
            activeOpacity={0.7}
        >
            <View style={[
                styles.menuIcon,
                item.isLogout && styles.logoutIcon
            ]}>
                {item.icon}
            </View>
            <Text style={[
                styles.menuText,
                item.isLogout && styles.logoutText
            ]}>
                {item.label}
            </Text>
            {!item.isLogout && (
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            )}
        </TouchableOpacity>
    );
});

const ProfileScreen = memo(function ProfileScreen() {
    const router = useRouter();
    const { signOut, user, isAuthenticated } = useAuth();
    const isOwner = Array.isArray(user?.roles) && user?.roles.includes('owner');
    const toast = useToast();
    
    // State for modals
    const [showPersonalDetails, setShowPersonalDetails] = useState(false);
    const [showFAQ, setShowFAQ] = useState(false);
    const [hasError, setHasError] = useState(false);
    
    // Personal details state - initialize with empty values, will be loaded from storage/database
    const [personalDetails, setPersonalDetails] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '+63',
        address: '',
        profilePhoto: null as string | null
    });
    
    // Temporary form state - changes are only applied when "Save Changes" is clicked
    const [tempPersonalDetails, setTempPersonalDetails] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '+63',
        address: '',
        profilePhoto: null as string | null
    });
    
    // Reset temporary state when modal is closed without saving
    const handleCloseModal = () => {
        console.log('🚪 Closing personal details modal - resetting temporary state');
        setTempPersonalDetails({...personalDetails}); // Reset to current saved state
        setShowPersonalDetails(false);
    };
    
    // Fixed country code for Philippines
    const countryCode = '+63';
    
    // Storage keys (per-user)
    const PERSONAL_DETAILS_KEY = user?.id ? `personal_details:${user.id}` : 'personal_details';
    
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
    
    // Reload profile data when authentication state changes (after login/logout)
    useEffect(() => {
        console.log('🔄 Auth state effect triggered:', { isAuthenticated, userId: user?.id });
        if (isAuthenticated && user?.id) {
            console.log('🔄 Authentication state changed - reloading profile data');
            loadPersonalDetails();
            
            // Also refresh profile photo specifically
            setTimeout(() => {
                refreshProfilePhoto();
            }, 500); // Small delay to ensure user data is loaded first
        }
    }, [isAuthenticated, user?.id]);

    // Listen for profile photo loaded events from AuthContext
    useEffect(() => {
        const handleProfilePhotoLoaded = (event: CustomEvent) => {
            const { userId, photoUri } = event.detail;
            console.log('📸 Received profile photo loaded event:', { userId, hasPhoto: !!photoUri });
            
            if (user?.id === userId && photoUri) {
                console.log('📸 Updating profile photo from event');
                setPersonalDetails(prev => ({...prev, profilePhoto: photoUri}));
                
                // Also save to AsyncStorage for faster access
                const photoKey = `${PERSONAL_DETAILS_KEY}_photo`;
                AsyncStorage.setItem(photoKey, photoUri).catch(error => {
                    console.error('❌ Error saving profile photo to storage:', error);
                });
            }
        };

        // Add event listener
        window.addEventListener('profilePhotoLoaded', handleProfilePhotoLoaded as EventListener);
        
        // Cleanup
        return () => {
            window.removeEventListener('profilePhotoLoaded', handleProfilePhotoLoaded as EventListener);
        };
    }, [user?.id]);
    
    // Reload profile data when screen comes into focus (navigation back to profile)
    useFocusEffect(
        useCallback(() => {
            if (isAuthenticated && user?.id) {
                console.log('🔄 Profile screen focused - reloading profile data');
                loadPersonalDetails();
            }
        }, [isAuthenticated, user?.id])
    );

    // Add a refresh function that can be called manually
    const refreshProfileData = async () => {
        console.log('🔄 Manually refreshing profile data...');
        try {
            await loadPersonalDetails();
            console.log('✅ Profile data refreshed successfully');
        } catch (error) {
            console.error('❌ Error refreshing profile data:', error);
        }
    };


    // Add the missing refreshProfilePhoto function
    const refreshProfilePhoto = async () => {
        console.log('🔄 Refreshing profile photo...');
        try {
            if (user?.id) {
                const photoKey = `${PERSONAL_DETAILS_KEY}_photo`;
                const storedPhoto = await AsyncStorage.getItem(photoKey);
                if (storedPhoto) {
                    setPersonalDetails(prev => ({...prev, profilePhoto: storedPhoto}));
                    console.log('✅ Profile photo refreshed from storage');
                } else {
                    // If not in storage, try loading from database
                    try {
                        console.log('🔍 Refreshing profile photo from database for user:', user.id);
                        const { loadUserProfilePhoto } = await import('@/utils/user-profile-photos');
                        const dbPhoto = await loadUserProfilePhoto(user.id);
                        console.log('🔍 Database photo result for refresh:', !!dbPhoto, dbPhoto ? 'has data' : 'no data');
                        if (dbPhoto) {
                            setPersonalDetails(prev => ({...prev, profilePhoto: dbPhoto}));
                            console.log('✅ Profile photo refreshed from database');
                            // Also save to AsyncStorage for faster future access
                            await AsyncStorage.setItem(photoKey, dbPhoto);
                        } else {
                            console.log('❌ No profile photo found in database for refresh:', user.id);
                        }
                    } catch (dbPhotoError) {
                        console.log('⚠️ Could not refresh profile photo from database:', dbPhotoError);
                    }
                }
            }
        } catch (error) {
            console.error('❌ Error refreshing profile photo:', error);
        }
    };

    // Force refresh when personal details modal is opened (optimized)
    useEffect(() => {
        if (showPersonalDetails) {
            console.log('📱 Personal details modal opened, refreshing photo display...');
            // Force a re-render to ensure photo is displayed (immediate)
            setPersonalDetails(prev => ({...prev}));
        }
    }, [showPersonalDetails, personalDetails.profilePhoto]);
    
    
    // Clear all stored data to start fresh
    const clearAllStoredData = async () => {
        try {
            await AsyncStorage.removeItem('auth_user');
            await AsyncStorage.removeItem('personal_details');
            console.log('All stored data cleared - ready for fresh start');
        } catch (error) {
            console.error('Error clearing stored data:', error);
        }
    };

    // Safety check - ensure profile is always accessible
    if (!isAuthenticated) {
        return (
            <View className="flex-1 justify-center items-center bg-white">
                <Text className="text-lg font-semibold text-gray-600 mb-2">Authentication Required</Text>
                <Text className="text-gray-500 text-center px-6">
                    Please log in to access your profile
                </Text>
                <TouchableOpacity
                    onPress={() => router.push('/login')}
                    style={{ backgroundColor: '#007bff', padding: 10, marginTop: 10, borderRadius: 5 }}
                >
                    <Text style={{ color: 'white' }}>Go to Login</Text>
                </TouchableOpacity>
            </View>
        );
    }
    
    
    
    
    
    const loadPersonalDetails = async () => {
        try {
            console.log('📂 Loading personal details from persistent storage...');
            console.log('🔑 Storage key:', PERSONAL_DETAILS_KEY);
            console.log('👤 Current user ID:', user?.id);
            console.log('🔐 Is authenticated:', isAuthenticated);
            
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
                
                // Load profile photo from storage and database
                let finalPhotoUri = null;
                try {
                    const photoKey = `${PERSONAL_DETAILS_KEY}_photo`;
                    const storedPhoto = await AsyncStorage.getItem(photoKey);
                    if (storedPhoto) {
                        finalPhotoUri = storedPhoto;
                        console.log('✅ Loaded profile photo from storage');
                    } else {
                        // If not in storage, try loading from database
                        if (user?.id) {
                            try {
                                console.log('🔍 Loading profile photo from database for user:', user.id);
                                const { loadUserProfilePhoto } = await import('@/utils/user-profile-photos');
                                const dbPhoto = await loadUserProfilePhoto(user.id);
                                console.log('🔍 Database photo result:', !!dbPhoto, dbPhoto ? 'has data' : 'no data');
                                if (dbPhoto) {
                                    finalPhotoUri = dbPhoto;
                                    console.log('✅ Loaded profile photo from database');
                                    // Also save to AsyncStorage for faster future access
                                    await AsyncStorage.setItem(photoKey, dbPhoto);
                                } else {
                                    console.log('❌ No profile photo found in database for user:', user.id);
                                }
                            } catch (dbPhotoError) {
                                console.log('⚠️ Could not load profile photo from database:', dbPhotoError);
                            }
                        }
                    }
                } catch (photoError) {
                    console.log('⚠️ Could not load stored photo:', photoError);
                }
                
                const finalDetails = {
                    ...parsedData,
                    email: parsedData.email || '', // Show stored email if available
                    profilePhoto: finalPhotoUri
                };
                
                setPersonalDetails(finalDetails);
                setTempPersonalDetails(finalDetails); // Also update temporary state
                
                // Force a re-render to ensure photo is displayed
                console.log('🔄 Profile photo state updated:', { hasPhoto: !!finalPhotoUri });
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
                
                // Load profile photo from storage and database for new users
                let profilePhoto = null;
                try {
                    const photoKey = `${PERSONAL_DETAILS_KEY}_photo`;
                    const storedPhoto = await AsyncStorage.getItem(photoKey);
                    if (storedPhoto) {
                        profilePhoto = storedPhoto;
                        console.log('✅ Profile photo loaded from storage for new user');
                    } else {
                        // If not in storage, try loading from database
                        if (user?.id) {
                            try {
                                console.log('🔍 Loading profile photo from database for new user:', user.id);
                                const { loadUserProfilePhoto } = await import('@/utils/user-profile-photos');
                                const dbPhoto = await loadUserProfilePhoto(user.id);
                                console.log('🔍 Database photo result for new user:', !!dbPhoto, dbPhoto ? 'has data' : 'no data');
                                if (dbPhoto) {
                                    profilePhoto = dbPhoto;
                                    console.log('✅ Profile photo loaded from database for new user');
                                    // Also save to AsyncStorage for faster future access
                                    await AsyncStorage.setItem(photoKey, dbPhoto);
                                } else {
                                    console.log('❌ No profile photo found in database for new user:', user.id);
                                }
                            } catch (dbPhotoError) {
                                console.log('⚠️ Could not load profile photo from database for new user:', dbPhotoError);
                            }
                        }
                    }
                } catch (photoError) {
                    console.log('⚠️ Could not load profile photo from storage for new user:', photoError);
                }
                
                // Initialize with user data from database or fallback values (no auto-save)
                const defaultDetails = {
                    firstName: userData?.name?.split(' ')[0] || userData?.name || '',
                    lastName: userData?.name?.split(' ').slice(1).join(' ') || '',
                    email: userData?.email || '', // Show email from user data if available
                    phone: userData?.phone || '+63',
                    address: userData?.address || '',
                    profilePhoto: profilePhoto // Use the profile photo loaded from database
                };
                
                console.log('✅ Initialized personal details with user data (no auto-save):', defaultDetails);
                console.log('🔍 User data from database:', userData);
                console.log('🔍 Profile photo loaded:', !!profilePhoto);
                setPersonalDetails(defaultDetails);
                setTempPersonalDetails(defaultDetails); // Also update temporary state
                
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
            setTempPersonalDetails(fallbackDetails); // Also update temporary state
            console.log('🔄 Using fallback personal details due to error');
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
                        // Save to AsyncStorage for immediate access
                        await AsyncStorage.setItem(photoKey, profilePhoto);
                        console.log('✅ Profile photo saved separately to key:', photoKey);
                        
                        // Also save to database for persistence across sessions
                        if (user?.id) {
                            try {
                                console.log('💾 Saving profile photo to database for user:', user.id);
                                const fileName = `profile_photo_${user.id}_${Date.now()}.jpg`;
                                const mimeType = profilePhoto.startsWith('data:') 
                                    ? profilePhoto.split(';')[0].split(':')[1] 
                                    : 'image/jpeg';
                                
                                await saveUserProfilePhoto(
                                    user.id,
                                    profilePhoto,
                                    profilePhoto, // Use the same data for both URI and data
                                    fileName,
                                    photoSize,
                                    mimeType
                                );
                                console.log('✅ Profile photo saved to database for persistence');
                            } catch (dbError) {
                                console.warn('⚠️ Failed to save profile photo to database:', dbError);
                                // Don't fail the entire save for database issues
                            }
                        }
                        
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
    
    
    
    const handleLogout = async () => {
        console.log('🚪 Logout button pressed');
        console.log('🚪 Current user before logout:', user);
        
        try {
            console.log('🚪 Starting logout process...');
            
            // Call signOut from AuthContext - this will handle the redirect
            await signOut();
            
            console.log('✅ Logout successful - redirecting to login');
            
        } catch (error) {
            console.error('❌ Logout error:', error);
            Alert.alert(
                'Logout Error', 
                'Failed to logout. Please try again.',
                [
                    {
                        text: 'OK',
                        onPress: () => {
                            console.log('🚪 User acknowledged logout error, forcing redirect');
                            // Force redirect even if logout failed
                            router.replace('/login');
                        }
                    }
                ]
            );
        }
    };

    const handleSavePersonalDetails = async () => {
        try {
            console.log('🔥 SAVE CHANGES CLICKED - Validating temporary data! Timestamp:', new Date().toISOString());
            console.log('📝 Temporary personal details:', tempPersonalDetails);
            
            // Only validate fields that have content - allow partial updates
            
            // Validate email format only if email is provided
            if (tempPersonalDetails.email.trim() && tempPersonalDetails.email.trim() !== '') {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(tempPersonalDetails.email)) {
                    toast.show(notifications.invalidEmail());
                    return;
                }
            }

            // Validate phone number only if phone is provided
            if (tempPersonalDetails.phone.trim() && tempPersonalDetails.phone.trim() !== '' && tempPersonalDetails.phone.trim() !== '+63') {
                // Clean the phone number for validation
                const cleanPhone = tempPersonalDetails.phone.replace(/\s/g, '');
                
                if (!cleanPhone.startsWith('+63')) {
                    toast.show(notifications.invalidPhone());
                    return;
                }

                // Validate phone number length (should be +63 + 10 digits, ignoring spaces)
                const digitsOnly = cleanPhone.replace('+63', '');
                if (digitsOnly.length !== 10) {
                    toast.show(notifications.invalidPhone());
                    return;
                }
            }
            
            console.log('✅ All validations passed! Saving personal details:', tempPersonalDetails);
            
            // Update the main state with temporary data (this saves the changes)
            setPersonalDetails({...tempPersonalDetails});
            
            // Try to save to AsyncStorage (optional - don't fail if this doesn't work)
            try {
                await savePersonalDetails(tempPersonalDetails);
                console.log('✅ Personal details saved to storage successfully');
            } catch (storageError) {
                console.warn('⚠️ Storage save failed, but profile updated in memory:', storageError);
                // Don't throw - the profile is still updated in the app
            }
            
            // Save profile photo to storage if it exists
            if (tempPersonalDetails.profilePhoto) {
                try {
                    const photoKey = `${PERSONAL_DETAILS_KEY}_photo`;
                    await AsyncStorage.setItem(photoKey, tempPersonalDetails.profilePhoto);
                    console.log('✅ Profile photo saved to storage');
                } catch (photoError) {
                    console.error('❌ Photo storage save failed:', photoError);
                }
            } else {
                // Remove photo from storage if no photo
                try {
                    const photoKey = `${PERSONAL_DETAILS_KEY}_photo`;
                    await AsyncStorage.removeItem(photoKey);
                    console.log('✅ Profile photo removed from storage');
                } catch (photoError) {
                    console.warn('⚠️ Photo storage remove failed:', photoError);
                }
            }
            
            // Show success toast
            toast.show(notifications.profileUpdateSuccess());
            
            // Close the modal
            setShowPersonalDetails(false);
        } catch (error) {
            console.error('❌ Unexpected error in handleSavePersonalDetails:', error);
            // This should rarely happen now since we handle storage errors gracefully
            toast.show(notifications.profileUpdateError());
        }
    };



    const handlePhotoAction = async (action: 'gallery' | 'remove') => {
        if (action === 'remove') {
            Alert.alert(
                'Remove Photo',
                'Are you sure you want to remove your profile photo?',
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Remove',
                        style: 'destructive',
                        onPress: () => {
                            setTempPersonalDetails(prev => ({...prev, profilePhoto: null}));
                            toast.show(notifications.operationSuccess('Photo removed'));
                        }
                    }
                ]
            );
        } else {
            try {
                // Request permission
                const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
                
                if (!permissionResult.granted) {
                    toast.show(createNotification({
                        title: 'Permission Required',
                        description: 'Please allow access to your photo library to select a profile picture.',
                        type: 'warning',
                        duration: 0,
                    }));
                    return;
                }
                
                // Launch image picker
                const result = await ImagePicker.launchImageLibraryAsync({
                    mediaTypes: ImagePicker.MediaTypeOptions.Images,
                    allowsEditing: true,
                    aspect: [1, 1] as [number, number],
                    quality: 0.7,
                    base64: true,
                });

                if (!result.canceled && result.assets && result.assets.length > 0) {
                    const selectedImage = result.assets[0];
                    
                    // Use base64 data URI for better compatibility
                    let imageUri = selectedImage.uri;
                    if (Platform.OS === 'web' && selectedImage.base64) {
                        imageUri = `data:${selectedImage.type || 'image/jpeg'};base64,${selectedImage.base64}`;
                    }
                    
                    setTempPersonalDetails(prev => ({...prev, profilePhoto: imageUri}));
                    toast.show(notifications.operationSuccess('Photo selected'));
                }
            } catch (error) {
                console.error('Error selecting photo:', error);
                toast.show(notifications.operationError('select photo'));
            }
        }
    };

    const menuItems: MenuItem[] = [
        // Owner-only actions
        ...(isOwner ? [
            {
                icon: <Ionicons name="home" size={20} color="#4B5563" />,
                label: 'Create Property Listing',
                route: '/(owner)/create-listing',
            },
            {
                icon: <Ionicons name="list" size={20} color="#4B5563" />,
                label: 'My Listings',
                route: '/(owner)/owner-listings',
            },
        ] : []),
        // Common actions
        {
            icon: <Ionicons name="person" size={20} color="#4B5563" />,
            label: 'Personal details',
            onPress: () => {
                console.log('📞 Opening personal details modal');
                console.log('📞 Current personal details:', personalDetails);
                setTempPersonalDetails({...personalDetails});
                console.log('📞 Setting temp personal details:', {...personalDetails});
                setShowPersonalDetails(true);
            },
        },
        {
            icon: <Ionicons name="help-circle" size={20} color="#4B5563" />,
            label: 'FAQ',
            onPress: () => setShowFAQ(true),
        },
        {
            icon: <Ionicons name="log-out" size={20} color="#DC2626" />,
            label: 'Logout',
            onPress: handleLogout,
            isLogout: true,
        },
    ];

    if (hasError) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorTitle}>Profile Error</Text>
                <Text style={styles.errorText}>
                    There was an issue loading your profile. Please try again.
                </Text>
                <TouchableOpacity
                    style={styles.retryButton}
                    onPress={() => {
                        setHasError(false);
                        refreshProfileData();
                    }}
                >
                    <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container}>
            {/* Profile Header */}
            <View style={styles.profileHeader}>
                <View style={styles.avatarContainer}>
                    {personalDetails.profilePhoto ? (
                        <Image 
                            source={{ uri: personalDetails.profilePhoto }}
                            style={styles.avatarImage}
                            resizeMode="cover"
                        />
                    ) : (
                        <Text style={styles.avatarText}>
                            {personalDetails.firstName && personalDetails.lastName 
                                ? `${personalDetails.firstName.charAt(0)}${personalDetails.lastName.charAt(0)}`
                                : '?'
                            }
                        </Text>
                    )}
                </View>
                <Text style={styles.profileName}>
                    {personalDetails.firstName && personalDetails.lastName 
                        ? `${personalDetails.firstName} ${personalDetails.lastName}`
                        : personalDetails.firstName
                        ? personalDetails.firstName
                        : personalDetails.email
                        ? personalDetails.email.split('@')[0]
                        : 'Complete Your Profile'
                    }
                </Text>
                <Text style={styles.profileEmail}>
                    {personalDetails.email || 'Please add your email'}
                </Text>
            </View>

            {/* Menu Items */}
            <View style={styles.menuContainer}>
                {menuItems.map((item, index) => (
                    <MenuButton key={index} item={item} />
                ))}
            </View>

            {/* Personal Details Modal */}
            <Modal 
                visible={showPersonalDetails} 
                animationType="slide" 
                presentationStyle="pageSheet"
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Personal Details</Text>
                        <TouchableOpacity onPress={handleCloseModal}>
                            <Ionicons name="close" size={24} color="#6B7280" />
                        </TouchableOpacity>
                    </View>
                    <ScrollView style={styles.modalContent}>
                        <View style={styles.modalForm}>
                            {/* Profile Photo Section */}
                            <View style={styles.photoSection}>
                                <View style={styles.photoSectionHeader}>
                                    <Text style={styles.photoSectionTitle}>Profile Photo</Text>
                                    {tempPersonalDetails.profilePhoto !== personalDetails.profilePhoto && (
                                        <View style={styles.unsavedBadge}>
                                            <Text style={styles.unsavedText}>Unsaved</Text>
                                        </View>
                                    )}
                                </View>
                                <View style={styles.photoContainer}>
                                    <View style={styles.modalAvatar}>
                                        {tempPersonalDetails.profilePhoto ? (
                                            <Image 
                                                source={{ uri: tempPersonalDetails.profilePhoto }}
                                                style={styles.modalAvatarImage}
                                                resizeMode="cover"
                                            />
                                        ) : (
                                            <Text style={styles.modalAvatarText}>
                                                {tempPersonalDetails.firstName && tempPersonalDetails.lastName 
                                                    ? `${tempPersonalDetails.firstName.charAt(0)}${tempPersonalDetails.lastName.charAt(0)}`
                                                    : '?'
                                                }
                                            </Text>
                                        )}
                                    </View>
                                    
                                    {/* Photo Action Buttons */}
                                    <View style={styles.photoActions}>
                                        <TouchableOpacity
                                            onPress={() => handlePhotoAction('gallery')}
                                            style={styles.selectPhotoButton}
                                        >
                                            <Ionicons name="image" size={16} color="#3B82F6" />
                                            <Text style={styles.selectPhotoText}>Select Photo</Text>
                                        </TouchableOpacity>
                                        
                                        {tempPersonalDetails.profilePhoto && (
                                            <TouchableOpacity
                                                onPress={() => handlePhotoAction('remove')}
                                                style={styles.removePhotoButton}
                                            >
                                                <Ionicons name="trash" size={16} color="#EF4444" />
                                                <Text style={styles.removePhotoText}>Remove</Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                </View>
                            </View>
                            
                            {/* Form Fields */}
                            <View style={styles.formSection}>
                                <View style={styles.inputContainer}>
                                    <Text style={styles.inputLabel}>First Name</Text>
                                    <TextInput
                                        style={styles.textInput}
                                        value={tempPersonalDetails.firstName}
                                        onChangeText={(text) => setTempPersonalDetails({...tempPersonalDetails, firstName: text})}
                                    />
                                </View>
                                
                                <View style={styles.inputContainer}>
                                    <Text style={styles.inputLabel}>Last Name</Text>
                                    <TextInput
                                        style={styles.textInput}
                                        value={tempPersonalDetails.lastName}
                                        onChangeText={(text) => setTempPersonalDetails({...tempPersonalDetails, lastName: text})}
                                    />
                                </View>
                                
                                <View style={styles.inputContainer}>
                                    <Text style={styles.inputLabel}>Email</Text>
                                    <TextInput
                                        style={styles.textInput}
                                        value={tempPersonalDetails.email}
                                        onChangeText={(text) => setTempPersonalDetails({...tempPersonalDetails, email: text})}
                                        keyboardType="email-address"
                                    />
                                </View>
                                
                                <View style={styles.inputContainer}>
                                    <Text style={styles.inputLabel}>Phone Number</Text>
                                    <View style={styles.phoneContainer}>
                                        <View style={styles.countryCode}>
                                            <Text style={styles.countryCodeText}>🇵🇭 {countryCode}</Text>
                                        </View>
                                        <TextInput
                                            style={styles.phoneInput}
                                            value={tempPersonalDetails.phone.replace(countryCode + ' ', '')}
                                            onChangeText={(text) => {
                                                console.log('📞 Phone input changed:', text);
                                                const digitsOnly = text.replace(/\D/g, '');
                                                if (digitsOnly.length <= 10) {
                                                    const fullPhone = countryCode + ' ' + digitsOnly;
                                                    console.log('📞 Setting phone to:', fullPhone);
                                                    setTempPersonalDetails({...tempPersonalDetails, phone: fullPhone});
                                                }
                                            }}
                                            placeholder="912 345 6789"
                                            keyboardType="phone-pad"
                                            maxLength={10}
                                            editable={true}
                                            selectTextOnFocus={true}
                                        />
                                    </View>
                                </View>
                                
                                <View style={styles.inputContainer}>
                                    <Text style={styles.inputLabel}>Address</Text>
                                    <TextInput
                                        style={[styles.textInput, styles.addressInput]}
                                        value={tempPersonalDetails.address}
                                        onChangeText={(text) => setTempPersonalDetails({...tempPersonalDetails, address: text})}
                                        multiline
                                        numberOfLines={3}
                                    />
                                </View>
                            </View>
                        </View>
                    </ScrollView>
                    
                    <View style={styles.modalFooter}>
                        <TouchableOpacity
                            style={styles.saveButton}
                            onPress={handleSavePersonalDetails}
                        >
                            <Text style={styles.saveButtonText}>Save Changes</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>


            {/* FAQ Modal */}
            <Modal 
                visible={showFAQ} 
                animationType="slide" 
                presentationStyle="pageSheet"
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Frequently Asked Questions</Text>
                        <TouchableOpacity onPress={() => setShowFAQ(false)}>
                            <Ionicons name="close" size={24} color="#6B7280" />
                        </TouchableOpacity>
                    </View>
                    <ScrollView style={styles.modalContent}>
                        <View style={styles.faqContent}>
                            <View style={styles.faqItem}>
                                <Text style={styles.faqQuestion}>How do I search for properties in HanapBahay?</Text>
                                <Text style={styles.faqAnswer}>Use the search bar on the dashboard to search by location, property type, or keywords. You can also use the filter button to narrow down by barangay, price range, and property type (house, apartment, condo, bedspace).</Text>
                            </View>
                            <View style={styles.faqItem}>
                                <Text style={styles.faqQuestion}>How do I filter properties by barangay?</Text>
                                <Text style={styles.faqAnswer}>Tap the filter button on the dashboard, then select your preferred barangay from the dropdown (Danlagan, Gomez, Magsaysay, Rizal, Bocboc, or Talolong). Click "Apply Filters" to see only properties in that area.</Text>
                            </View>
                            <View style={styles.faqItem}>
                                <Text style={styles.faqQuestion}>How do I contact a property owner?</Text>
                                <Text style={styles.faqAnswer}>Tap on any property listing to view details, then use the "Contact Owner" button or go to the Chat tab to start a conversation with the property owner directly.</Text>
                            </View>
                            <View style={styles.faqItem}>
                                <Text style={styles.faqQuestion}>What information do I need to provide when contacting owners?</Text>
                                <Text style={styles.faqAnswer}>Be ready to share your name, contact number, move-in date, rental budget, and any specific requirements. This helps owners respond faster with relevant information.</Text>
                            </View>
                            <View style={styles.faqItem}>
                                <Text style={styles.faqQuestion}>How do I book a property viewing?</Text>
                                <Text style={styles.faqAnswer}>Contact the property owner through the chat feature to schedule a viewing. Owners will coordinate with you to arrange a convenient time for property inspection.</Text>
                            </View>
                            <View style={styles.faqItem}>
                                <Text style={styles.faqQuestion}>What types of properties are available?</Text>
                                <Text style={styles.faqAnswer}>HanapBahay offers houses, apartments, condominiums, and bedspaces. Each property includes details like monthly rent, number of bedrooms, size, amenities, and location information.</Text>
                            </View>
                            <View style={styles.faqItem}>
                                <Text style={styles.faqQuestion}>How do I set my price range?</Text>
                                <Text style={styles.faqAnswer}>Use the price range slider in the filter section to set your minimum and maximum monthly rent budget. The app will show only properties within your specified price range.</Text>
                            </View>
                            <View style={styles.faqItem}>
                                <Text style={styles.faqQuestion}>How do I update my profile information?</Text>
                                <Text style={styles.faqAnswer}>Go to your profile tab and tap "Personal details" to update your name, email, phone number, and address. Changes are saved automatically to help owners contact you easily.</Text>
                            </View>
                            <View style={styles.faqItem}>
                                <Text style={styles.faqQuestion}>How do I clear my search filters?</Text>
                                <Text style={styles.faqAnswer}>On the dashboard, tap the "Clear All" button in the Active Filters section to remove all applied filters and see all available properties again.</Text>
                            </View>
                            <View style={styles.faqItem}>
                                <Text style={styles.faqQuestion}>What if I can't find properties in my preferred area?</Text>
                                <Text style={styles.faqAnswer}>Try expanding your search criteria by adjusting the price range or selecting "Any Type" for property type. You can also contact owners directly to ask about availability in your preferred location.</Text>
                            </View>
                            <View style={styles.faqItem}>
                                <Text style={styles.faqQuestion}>How do I report an issue with a property listing?</Text>
                                <Text style={styles.faqAnswer}>Contact our support team through the chat feature or email us at support@hanapbahay.com. Include the property details and description of the issue for faster resolution.</Text>
                            </View>
                            <View style={styles.faqItem}>
                                <Text style={styles.faqQuestion}>Is my personal information secure?</Text>
                                <Text style={styles.faqAnswer}>Yes, we prioritize your privacy and security. Your personal information is only shared with property owners when you initiate contact, and we never sell your data to third parties.</Text>
                            </View>
                        </View>
                    </ScrollView>
                </View>
            </Modal>
        </ScrollView>
    );
});

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        padding: 24,
    },
    errorTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 8,
    },
    errorText: {
        fontSize: 14,
        color: '#6B7280',
        textAlign: 'center',
        marginBottom: 16,
    },
    retryButton: {
        backgroundColor: '#10B981',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
    },
    retryButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    profileHeader: {
        alignItems: 'center',
        paddingTop: 40,
        paddingBottom: 24,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    avatarContainer: {
        width: 128,
        height: 128,
        borderRadius: 64,
        backgroundColor: '#F3F4F6',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        overflow: 'hidden',
    },
    avatarImage: {
        width: 128,
        height: 128,
        borderRadius: 64,
    },
    avatarText: {
        fontSize: 48,
        fontWeight: '600',
        color: '#6B7280',
    },
    profileName: {
        fontSize: 24,
        fontWeight: '600',
        color: '#111827',
        marginBottom: 4,
        textAlign: 'center',
    },
    profileEmail: {
        fontSize: 16,
        color: '#9CA3AF',
        textAlign: 'center',
    },
    menuContainer: {
        paddingTop: 8,
    },
    menuButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 20,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    logoutButton: {
        backgroundColor: '#FEF2F2',
    },
    menuIcon: {
        width: 32,
        height: 32,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 16,
        backgroundColor: '#F3F4F6',
        marginRight: 12,
    },
    logoutIcon: {
        backgroundColor: '#FEE2E2',
    },
    menuText: {
        flex: 1,
        fontSize: 16,
        color: '#111827',
    },
    logoutText: {
        color: '#DC2626',
        fontWeight: '600',
    },
    // Modal styles
    modalContainer: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#111827',
    },
    modalContent: {
        flex: 1,
        padding: 20,
    },
    modalForm: {
        gap: 24,
    },
    photoSection: {
        alignItems: 'center',
    },
    photoSectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    photoSectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#374151',
    },
    unsavedBadge: {
        backgroundColor: '#FEF3C7',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        marginLeft: 8,
    },
    unsavedText: {
        fontSize: 12,
        fontWeight: '500',
        color: '#92400E',
    },
    photoContainer: {
        alignItems: 'center',
    },
    modalAvatar: {
        width: 128,
        height: 128,
        borderRadius: 64,
        backgroundColor: '#F3F4F6',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        overflow: 'hidden',
    },
    modalAvatarImage: {
        width: 128,
        height: 128,
        borderRadius: 64,
    },
    modalAvatarText: {
        fontSize: 48,
        fontWeight: '600',
        color: '#6B7280',
    },
    photoActions: {
        flexDirection: 'row',
        gap: 12,
    },
    selectPhotoButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#EFF6FF',
        borderWidth: 1,
        borderColor: '#BFDBFE',
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    selectPhotoText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#3B82F6',
        marginLeft: 4,
    },
    removePhotoButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FEF2F2',
        borderWidth: 1,
        borderColor: '#FECACA',
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    removePhotoText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#EF4444',
        marginLeft: 4,
    },
    formSection: {
        gap: 16,
    },
    inputContainer: {
        gap: 8,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '500',
        color: '#374151',
    },
    textInput: {
        borderWidth: 1,
        borderColor: '#D1D5DB',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 12,
        fontSize: 16,
        color: '#111827',
        backgroundColor: '#FFFFFF',
    },
    addressInput: {
        height: 80,
        textAlignVertical: 'top',
    },
    phoneContainer: {
        flexDirection: 'row',
        gap: 8,
    },
    countryCode: {
        borderWidth: 1,
        borderColor: '#D1D5DB',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 12,
        backgroundColor: '#F9FAFB',
        justifyContent: 'center',
        alignItems: 'center',
        minWidth: 100,
    },
    countryCodeText: {
        fontSize: 16,
        fontWeight: '500',
        color: '#374151',
    },
    phoneInput: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#D1D5DB',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 12,
        fontSize: 16,
        color: '#111827',
        backgroundColor: '#FFFFFF',
    },
    modalFooter: {
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
    },
    saveButton: {
        backgroundColor: '#10B981',
        borderRadius: 8,
        paddingVertical: 16,
        alignItems: 'center',
    },
    saveButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    faqContent: {
        gap: 24,
    },
    faqItem: {
        gap: 8,
    },
    faqQuestion: {
        fontSize: 18,
        fontWeight: '600',
        color: '#111827',
    },
    faqAnswer: {
        fontSize: 16,
        color: '#6B7280',
        lineHeight: 24,
    },
});

export default ProfileScreen;
