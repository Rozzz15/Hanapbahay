import React, { useState, useEffect, useCallback, memo, useMemo } from 'react';
import { View, ScrollView, Pressable, Alert, Modal, TextInput, TouchableOpacity, Image, Platform, StyleSheet, Text, KeyboardAvoidingView, Keyboard, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/ui/toast';
import { saveUserProfilePhoto } from '../../utils/user-profile-photos';
import { changePassword } from '../../api/auth/change-password';
import { showAlert } from '../../utils/alert';

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
    const [showChangePassword, setShowChangePassword] = useState(false);
    const [hasError, setHasError] = useState(false);
    
    // Password change states
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [changingPassword, setChangingPassword] = useState(false);
    
    // Personal details state - single source of truth
    const [personalDetails, setPersonalDetails] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '+63',
        address: '',
        gender: undefined as 'male' | 'female' | undefined,
        familyType: undefined as 'individual' | 'family' | undefined,
        emergencyContactPerson: '',
        emergencyContactNumber: '',
        profilePhoto: null as string | null
    });
    
    // Form state for editing
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '+63',
        address: '',
        gender: undefined as 'male' | 'female' | undefined,
        familyType: undefined as 'individual' | 'family' | undefined,
        emergencyContactPerson: '',
        emergencyContactNumber: '',
        profilePhoto: null as string | null
    });
    
    // Reset form state when modal is closed without saving
    const handleCloseModal = () => {
        setFormData({...personalDetails}); // Reset to current saved state
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
        }
    }, [isAuthenticated, user?.id]);


    

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
            console.log('📂 Loading personal details...');
            
            if (!user?.id) {
                console.log('❌ No user ID available');
                return;
            }
            
            // Load from AsyncStorage
            const stored = await AsyncStorage.getItem(PERSONAL_DETAILS_KEY);
            let details = {
                firstName: '',
                lastName: '',
                email: user.email || '',
                phone: '+63',
                address: '',
                gender: undefined as 'male' | 'female' | undefined,
                familyType: undefined as 'individual' | 'family' | undefined,
                emergencyContactPerson: '',
                emergencyContactNumber: '',
                profilePhoto: null as string | null
            };
            
            // Also load from database (tenants table) for emergency contact
            try {
                const { db } = await import('../../utils/db');
                const tenantProfile = await db.get('tenants', user.id);
                if (tenantProfile) {
                    details.emergencyContactPerson = (tenantProfile as any).emergencyContactPerson || '';
                    details.emergencyContactNumber = (tenantProfile as any).emergencyContactNumber || '';
                }
            } catch (error) {
                console.log('⚠️ Could not load emergency contact from database:', error);
            }
            
            if (stored) {
                const parsedData = JSON.parse(stored);
                console.log('📦 Loaded data from storage:', parsedData);
                console.log('🔍 Gender from storage:', parsedData.gender);
                console.log('🔍 FamilyType from storage:', parsedData.familyType);
                details = { ...details, ...parsedData };
            } else {
                console.log('⚠️ No stored data found');
            }
            
            // Load profile photo
            try {
                const photoKey = `${PERSONAL_DETAILS_KEY}_photo`;
                const storedPhoto = await AsyncStorage.getItem(photoKey);
                if (storedPhoto) {
                    details.profilePhoto = storedPhoto;
                }
            } catch (photoError) {
                console.log('⚠️ Could not load profile photo:', photoError);
            }
            
            console.log('✅ Final details loaded:', details);
            setPersonalDetails(details);
            setFormData(details);
            console.log('✅ Personal details loaded successfully');
            
        } catch (error) {
            console.error('❌ Error loading personal details:', error);
            const fallbackDetails = {
                firstName: '',
                lastName: '',
                email: user?.email || '',
                phone: '+63',
                address: '',
                gender: undefined,
                familyType: undefined,
                emergencyContactPerson: '',
                emergencyContactNumber: '',
                profilePhoto: null
            };
            setPersonalDetails(fallbackDetails);
            setFormData(fallbackDetails);
        }
    };
    
    // Reload profile data when screen comes into focus (navigation back to profile)
    useFocusEffect(
        useCallback(() => {
            if (isAuthenticated && user?.id) {
                console.log('🔄 Profile screen focused - reloading profile data');
                loadPersonalDetails();
            }
        }, [isAuthenticated, user?.id])
    );
    
    const savePersonalDetails = async (data: typeof personalDetails) => {
        try {
            console.log('💾 Saving personal details...');
            console.log('📊 Data to save:', {
                firstName: data.firstName,
                lastName: data.lastName,
                email: data.email,
                phone: data.phone,
                address: data.address,
                gender: data.gender,
                familyType: data.familyType,
                emergencyContactPerson: data.emergencyContactPerson,
                emergencyContactNumber: data.emergencyContactNumber
            });
            
            if (!user?.id) {
                throw new Error('No user ID available');
            }
            
            // Save basic details to AsyncStorage
            const { profilePhoto, ...detailsWithoutPhoto } = data;
            await AsyncStorage.setItem(PERSONAL_DETAILS_KEY, JSON.stringify(detailsWithoutPhoto));
            console.log('✅ Saved to AsyncStorage');
            
            // IMPORTANT: Also update the users table in database so owner can see the changes
            try {
                const { db } = await import('../../utils/db');
                const userRecord = await db.get('users', user.id);
                
                if (userRecord) {
                    const updatedUser = {
                        ...userRecord,
                        name: `${data.firstName} ${data.lastName}`.trim() || data.email,
                        email: data.email,
                        phone: data.phone,
                        address: data.address,
                        gender: data.gender,
                        familyType: data.familyType,
                        updatedAt: new Date().toISOString()
                    };
                    
                    await db.upsert('users', user.id, updatedUser);
                    console.log('✅ Updated users table with personal details:', {
                        name: updatedUser.name,
                        email: updatedUser.email,
                        phone: updatedUser.phone,
                        address: updatedUser.address,
                        gender: updatedUser.gender,
                        familyType: updatedUser.familyType
                    });
                    
                    // ALSO update the tenants table with gender, familyType, and emergency contact for owner visibility
                    try {
                        const tenantProfile = await db.get('tenants', user.id);
                        if (tenantProfile) {
                            const updatedTenantProfile = {
                                ...tenantProfile,
                                contactNumber: data.phone,
                                email: data.email,
                                address: data.address,
                                gender: data.gender,
                                familyType: data.familyType,
                                emergencyContactPerson: data.emergencyContactPerson,
                                emergencyContactNumber: data.emergencyContactNumber
                            };
                            await db.upsert('tenants', user.id, updatedTenantProfile);
                            console.log('✅ Updated tenants table with personal details:', {
                                contactNumber: updatedTenantProfile.contactNumber,
                                email: updatedTenantProfile.email,
                                address: updatedTenantProfile.address,
                                gender: updatedTenantProfile.gender,
                                familyType: updatedTenantProfile.familyType,
                                emergencyContactPerson: updatedTenantProfile.emergencyContactPerson,
                                emergencyContactNumber: updatedTenantProfile.emergencyContactNumber
                            });
                        }
                    } catch (tenantError) {
                        console.warn('⚠️ Could not update tenants table:', tenantError);
                    }
                }
            } catch (dbError) {
                console.warn('⚠️ Could not update users table:', dbError);
                // Don't fail the entire save for database issues
            }
            
            // Save profile photo separately
            if (profilePhoto) {
                const photoKey = `${PERSONAL_DETAILS_KEY}_photo`;
                await AsyncStorage.setItem(photoKey, profilePhoto);
                console.log('✅ Profile photo saved to AsyncStorage');
                
                // ALSO save to database so owners can see tenant photos
                try {
                    const photoSize = profilePhoto.length;
                    const fileName = `profile_photo_${user.id}_${Date.now()}.jpg`;
                    const mimeType = profilePhoto.startsWith('data:') 
                        ? profilePhoto.split(';')[0].split(':')[1] 
                        : 'image/jpeg';
                    
                    await saveUserProfilePhoto(
                        user.id,
                        profilePhoto,
                        profilePhoto, // Store as both URI and data
                        fileName,
                        photoSize,
                        mimeType
                    );
                    console.log('✅ Profile photo saved to database for sharing');
                } catch (dbError) {
                    console.warn('⚠️ Could not save photo to database:', dbError);
                    // Don't fail the entire save for database issues
                }
            } else {
                // Remove photo if none
                const photoKey = `${PERSONAL_DETAILS_KEY}_photo`;
                await AsyncStorage.removeItem(photoKey);
            }
            
            console.log('✅ Personal details saved successfully');
            
        } catch (error) {
            console.error('❌ Error saving personal details:', error);
            throw error;
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
            console.log('💾 Saving personal details...');
            
            // Validate email format if provided
            if (formData.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
                toast.show('Please enter a valid email address');
                return;
            }

            // Validate phone number if provided
            if (formData.phone.trim() && formData.phone.trim() !== '+63') {
                const cleanPhone = formData.phone.replace(/\s/g, '');
                if (!cleanPhone.startsWith('+63') || cleanPhone.length !== 13) {
                    toast.show('Please enter a valid Philippine phone number (+63XXXXXXXXXX)');
                    return;
                }
            }
            
            // Update main state
            setPersonalDetails({...formData});
            
            // Save to storage
            await savePersonalDetails(formData);
            
            toast.show('Profile updated successfully!');
            setShowPersonalDetails(false);
            
        } catch (error) {
            console.error('❌ Error saving personal details:', error);
            toast.show('Failed to update profile. Please try again.');
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
                setShowChangePassword(false);
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
                            setFormData(prev => ({...prev, profilePhoto: null}));
                            toast.show('Photo removed');
                        }
                    }
                ]
            );
        } else {
            try {
                const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
                
                if (!permissionResult.granted) {
                    toast.show('Permission required to access photo library');
                    return;
                }
                
                const result = await ImagePicker.launchImageLibraryAsync({
                    mediaTypes: ['images'],
                    allowsEditing: true,
                    aspect: [1, 1] as [number, number],
                    quality: 0.7,
                    base64: true,
                });

                if (!result.canceled && result.assets && result.assets.length > 0) {
                    const selectedImage = result.assets[0];
                    
                    let imageUri = selectedImage.uri;
                    if (Platform.OS === 'web' && selectedImage.base64) {
                        imageUri = `data:${selectedImage.type || 'image/jpeg'};base64,${selectedImage.base64}`;
                    }
                    
                    setFormData(prev => ({...prev, profilePhoto: imageUri}));
                    toast.show('Photo selected');
                }
            } catch (error) {
                console.error('Error selecting photo:', error);
                toast.show('Failed to select photo');
            }
        }
    };

    const menuItems: MenuItem[] = useMemo(() => [
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
                setFormData({...personalDetails});
                setShowPersonalDetails(true);
            },
        },
        {
            icon: <Ionicons name="lock-closed" size={20} color="#4B5563" />,
            label: 'Change Password',
            onPress: () => setShowChangePassword(true),
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
    ], [isOwner, personalDetails, handleLogout]);

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
                        loadPersonalDetails();
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
                onRequestClose={handleCloseModal}
            >
                <KeyboardAvoidingView 
                    style={styles.modalContainer}
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
                >
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Personal Details</Text>
                        <TouchableOpacity onPress={() => {
                            Keyboard.dismiss();
                            handleCloseModal();
                        }}>
                            <Ionicons name="close" size={24} color="#6B7280" />
                        </TouchableOpacity>
                    </View>
                    <ScrollView 
                        style={styles.modalContent}
                        contentContainerStyle={styles.modalScrollContent}
                        keyboardShouldPersistTaps="handled"
                    >
                        <TouchableOpacity 
                            activeOpacity={1} 
                            onPress={Keyboard.dismiss}
                        >
                        <View style={styles.modalForm}>
                            {/* Profile Photo Section */}
                            <View style={styles.photoSection}>
                                <View style={styles.photoSectionHeader}>
                                    <Text style={styles.photoSectionTitle}>Profile Photo</Text>
                                    {formData.profilePhoto !== personalDetails.profilePhoto && (
                                        <View style={styles.unsavedBadge}>
                                            <Text style={styles.unsavedText}>Unsaved</Text>
                                        </View>
                                    )}
                                </View>
                                <View style={styles.photoContainer}>
                                    <View style={styles.modalAvatar}>
                                        {formData.profilePhoto ? (
                                            <Image 
                                                source={{ uri: formData.profilePhoto }}
                                                style={styles.modalAvatarImage}
                                                resizeMode="cover"
                                            />
                                        ) : (
                                            <Text style={styles.modalAvatarText}>
                                                {formData.firstName && formData.lastName 
                                                    ? `${formData.firstName.charAt(0)}${formData.lastName.charAt(0)}`
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
                                        
                                        {formData.profilePhoto && (
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
                                        value={formData.firstName}
                                        onChangeText={(text) => setFormData({...formData, firstName: text})}
                                        placeholder="Enter your first name"
                                    />
                                </View>
                                
                                <View style={styles.inputContainer}>
                                    <Text style={styles.inputLabel}>Last Name</Text>
                                    <TextInput
                                        style={styles.textInput}
                                        value={formData.lastName}
                                        onChangeText={(text) => setFormData({...formData, lastName: text})}
                                        placeholder="Enter your last name"
                                    />
                                </View>
                                
                                <View style={styles.inputContainer}>
                                    <Text style={styles.inputLabel}>Email</Text>
                                    <TextInput
                                        style={styles.textInput}
                                        value={formData.email}
                                        onChangeText={(text) => setFormData({...formData, email: text})}
                                        keyboardType="email-address"
                                        placeholder="Enter your email"
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
                                            value={formData.phone.replace(countryCode + ' ', '')}
                                            onChangeText={(text) => {
                                                const digitsOnly = text.replace(/\D/g, '');
                                                if (digitsOnly.length <= 10) {
                                                    const fullPhone = countryCode + ' ' + digitsOnly;
                                                    setFormData({...formData, phone: fullPhone});
                                                }
                                            }}
                                            placeholder="912 345 6789"
                                            keyboardType="phone-pad"
                                            maxLength={10}
                                        />
                                    </View>
                                </View>
                                
                                <View style={styles.inputContainer}>
                                    <Text style={styles.inputLabel}>Address</Text>
                                    <TextInput
                                        style={[styles.textInput, styles.addressInput]}
                                        value={formData.address}
                                        onChangeText={(text) => setFormData({...formData, address: text})}
                                        multiline
                                        numberOfLines={3}
                                        placeholder="Enter your address"
                                    />
                                </View>

                                {/* Gender Selection */}
                                <View style={styles.inputContainer}>
                                    <Text style={styles.inputLabel}>Gender</Text>
                                    <View style={styles.radioGroup}>
                                        <TouchableOpacity
                                            style={[
                                                styles.radioOption,
                                                formData.gender === 'male' && styles.radioOptionSelected
                                            ]}
                                            onPress={() => setFormData({...formData, gender: 'male'})}
                                        >
                                            <View style={[
                                                styles.radioCircle,
                                                formData.gender === 'male' && styles.radioCircleSelected
                                            ]}>
                                                {formData.gender === 'male' && <View style={styles.radioInner} />}
                                            </View>
                                            <Text style={[
                                                styles.radioText,
                                                formData.gender === 'male' && styles.radioTextSelected
                                            ]}>Male</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[
                                                styles.radioOption,
                                                formData.gender === 'female' && styles.radioOptionSelected
                                            ]}
                                            onPress={() => setFormData({...formData, gender: 'female'})}
                                        >
                                            <View style={[
                                                styles.radioCircle,
                                                formData.gender === 'female' && styles.radioCircleSelected
                                            ]}>
                                                {formData.gender === 'female' && <View style={styles.radioInner} />}
                                            </View>
                                            <Text style={[
                                                styles.radioText,
                                                formData.gender === 'female' && styles.radioTextSelected
                                            ]}>Female</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                {/* Family Type Selection */}
                                <View style={styles.inputContainer}>
                                    <Text style={styles.inputLabel}>Family Type</Text>
                                    <View style={styles.radioGroup}>
                                        <TouchableOpacity
                                            style={[
                                                styles.radioOption,
                                                formData.familyType === 'individual' && styles.radioOptionSelected
                                            ]}
                                            onPress={() => setFormData({...formData, familyType: 'individual'})}
                                        >
                                            <View style={[
                                                styles.radioCircle,
                                                formData.familyType === 'individual' && styles.radioCircleSelected
                                            ]}>
                                                {formData.familyType === 'individual' && <View style={styles.radioInner} />}
                                            </View>
                                            <Text style={[
                                                styles.radioText,
                                                formData.familyType === 'individual' && styles.radioTextSelected
                                            ]}>Individual</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[
                                                styles.radioOption,
                                                formData.familyType === 'family' && styles.radioOptionSelected
                                            ]}
                                            onPress={() => setFormData({...formData, familyType: 'family'})}
                                        >
                                            <View style={[
                                                styles.radioCircle,
                                                formData.familyType === 'family' && styles.radioCircleSelected
                                            ]}>
                                                {formData.familyType === 'family' && <View style={styles.radioInner} />}
                                            </View>
                                            <Text style={[
                                                styles.radioText,
                                                formData.familyType === 'family' && styles.radioTextSelected
                                            ]}>Family</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                {/* Emergency Contact Fields */}
                                <View style={styles.inputContainer}>
                                    <Text style={styles.inputLabel}>Contact Person In case of Emergency (Optional)</Text>
                                    <TextInput
                                        style={styles.textInput}
                                        value={formData.emergencyContactPerson}
                                        onChangeText={(text) => setFormData({...formData, emergencyContactPerson: text})}
                                        placeholder="Enter contact person name"
                                    />
                                </View>
                                
                                <View style={styles.inputContainer}>
                                    <Text style={styles.inputLabel}>Contact Number In case of Emergency (Optional)</Text>
                                    <TextInput
                                        style={styles.textInput}
                                        value={formData.emergencyContactNumber}
                                        onChangeText={(text) => setFormData({...formData, emergencyContactNumber: text})}
                                        placeholder="Enter contact number"
                                        keyboardType="phone-pad"
                                    />
                                </View>
                            </View>
                        </View>
                        </TouchableOpacity>
                    </ScrollView>
                    
                    <View style={styles.modalFooter}>
                        <TouchableOpacity
                            style={styles.saveButton}
                            onPress={handleSavePersonalDetails}
                        >
                            <Text style={styles.saveButtonText}>Save Changes</Text>
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
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
                    <ScrollView 
                        style={styles.modalContent}
                        contentContainerStyle={styles.modalScrollContent}
                    >
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

            {/* Change Password Modal */}
            <Modal 
                visible={showChangePassword} 
                animationType="slide" 
                presentationStyle="pageSheet"
            >
                <KeyboardAvoidingView 
                    style={styles.modalContainer}
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
                >
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Change Password</Text>
                        <TouchableOpacity onPress={() => {
                            setShowChangePassword(false);
                            setCurrentPassword('');
                            setNewPassword('');
                            setConfirmPassword('');
                        }}>
                            <Ionicons name="close" size={24} color="#6B7280" />
                        </TouchableOpacity>
                    </View>
                    <ScrollView 
                        style={styles.modalContent}
                        contentContainerStyle={styles.modalScrollContent}
                        keyboardShouldPersistTaps="handled"
                    >
                        <View style={styles.modalForm}>
                            <View style={styles.inputContainer}>
                                <Text style={styles.inputLabel}>Current Password</Text>
                                <View style={styles.passwordInputWrapper}>
                                    <TextInput
                                        style={styles.passwordTextInput}
                                        value={currentPassword}
                                        onChangeText={setCurrentPassword}
                                        placeholder="Enter current password"
                                        secureTextEntry={!showCurrentPassword}
                                    />
                                    <TouchableOpacity
                                        style={styles.eyeIcon}
                                        onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                                    >
                                        <Ionicons 
                                            name={showCurrentPassword ? "eye-off" : "eye"} 
                                            size={20} 
                                            color="#6B7280" 
                                        />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <View style={styles.inputContainer}>
                                <Text style={styles.inputLabel}>New Password</Text>
                                <View style={styles.passwordInputWrapper}>
                                    <TextInput
                                        style={styles.passwordTextInput}
                                        value={newPassword}
                                        onChangeText={setNewPassword}
                                        placeholder="Enter new password"
                                        secureTextEntry={!showNewPassword}
                                    />
                                    <TouchableOpacity
                                        style={styles.eyeIcon}
                                        onPress={() => setShowNewPassword(!showNewPassword)}
                                    >
                                        <Ionicons 
                                            name={showNewPassword ? "eye-off" : "eye"} 
                                            size={20} 
                                            color="#6B7280" 
                                        />
                                    </TouchableOpacity>
                                </View>
                                <Text style={styles.helperText}>Must be at least 6 characters</Text>
                            </View>

                            <View style={styles.inputContainer}>
                                <Text style={styles.inputLabel}>Confirm New Password</Text>
                                <View style={styles.passwordInputWrapper}>
                                    <TextInput
                                        style={styles.passwordTextInput}
                                        value={confirmPassword}
                                        onChangeText={setConfirmPassword}
                                        placeholder="Confirm new password"
                                        secureTextEntry={!showConfirmPassword}
                                    />
                                    <TouchableOpacity
                                        style={styles.eyeIcon}
                                        onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                                    >
                                        <Ionicons 
                                            name={showConfirmPassword ? "eye-off" : "eye"} 
                                            size={20} 
                                            color="#6B7280" 
                                        />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    </ScrollView>
                    
                    <View style={styles.modalFooter}>
                        <TouchableOpacity
                            style={[styles.saveButton, changingPassword && styles.saveButtonDisabled]}
                            onPress={handleChangePassword}
                            disabled={changingPassword}
                        >
                            {changingPassword ? (
                                <ActivityIndicator color="#FFFFFF" />
                            ) : (
                                <Text style={styles.saveButtonText}>Change Password</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
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
        paddingTop: 32, // Reduced from 40
        paddingBottom: 20, // Reduced from 24
        paddingHorizontal: 16, // Reduced from 20
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    avatarContainer: {
        width: 100, // Reduced from 128
        height: 100, // Reduced from 128
        borderRadius: 50, // Reduced from 64
        backgroundColor: '#F3F4F6',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 14, // Reduced from 16
        overflow: 'hidden',
    },
    avatarImage: {
        width: 100, // Reduced from 128
        height: 100, // Reduced from 128
        borderRadius: 50, // Reduced from 64
    },
    avatarText: {
        fontSize: 36, // Reduced from 48
        fontWeight: '600',
        color: '#6B7280',
    },
    profileName: {
        fontSize: 20, // Reduced from 24
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
        paddingVertical: 14, // Reduced from 16
        paddingHorizontal: 16, // Reduced from 20
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    logoutButton: {
        backgroundColor: '#FEF2F2',
    },
    menuIcon: {
        width: 28, // Reduced from 32
        height: 28, // Reduced from 32
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 14, // Reduced from 16
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
        zIndex: 1000,
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
    modalScrollContent: {
        paddingBottom: 100, // Add bottom padding to ensure content isn't cut off
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
    passwordInputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#D1D5DB',
        borderRadius: 8,
        backgroundColor: '#FFFFFF',
        paddingRight: 8,
    },
    passwordTextInput: {
        flex: 1,
        paddingHorizontal: 12,
        paddingVertical: 12,
        fontSize: 16,
        color: '#111827',
        backgroundColor: 'transparent',
        borderWidth: 0,
    },
    eyeIcon: {
        padding: 4,
    },
    helperText: {
        fontSize: 12,
        color: '#6B7280',
        marginTop: 4,
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
    radioGroup: {
        flexDirection: 'row',
        gap: 16,
    },
    radioOption: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 12,
        paddingHorizontal: 16,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        flex: 1,
    },
    radioOptionSelected: {
        borderColor: '#10B981',
        backgroundColor: '#F0FDF4',
    },
    radioCircle: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: '#D1D5DB',
        alignItems: 'center',
        justifyContent: 'center',
    },
    radioCircleSelected: {
        borderColor: '#10B981',
    },
    radioInner: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#10B981',
    },
    radioText: {
        fontSize: 16,
        color: '#374151',
        fontWeight: '500',
    },
    radioTextSelected: {
        color: '#10B981',
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
    saveButtonDisabled: {
        opacity: 0.6,
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
