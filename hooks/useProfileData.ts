import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';

export interface PersonalDetails {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address: string;
    profilePhoto: string | null;
}

export const useProfileData = () => {
    const { user, isAuthenticated } = useAuth();
    const [personalDetails, setPersonalDetails] = useState<PersonalDetails>({
        firstName: '',
        lastName: '',
        email: '',
        phone: '+63',
        address: '',
        profilePhoto: null
    });
    const [tempPersonalDetails, setTempPersonalDetails] = useState<PersonalDetails>({
        firstName: '',
        lastName: '',
        email: '',
        phone: '+63',
        address: '',
        profilePhoto: null
    });
    const [isLoading, setIsLoading] = useState(false);
    const [hasError, setHasError] = useState(false);

    const PERSONAL_DETAILS_KEY = user?.id ? `personal_details:${user.id}` : 'personal_details';

    const loadPersonalDetails = useCallback(async () => {
        try {
            setIsLoading(true);
            setHasError(false);
            
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
                                const { loadUserProfilePhoto } = await import('../utils/user-profile-photos');
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
                    email: parsedData.email || '',
                    profilePhoto: finalPhotoUri
                };
                
                setPersonalDetails(finalDetails);
                setTempPersonalDetails(finalDetails);
                
                console.log('🔄 Profile photo state updated:', { hasPhoto: !!finalPhotoUri });
            } else {
                console.log('📝 No stored personal details found, checking database for user data...');
                
                // Try to load user data from database if available
                let userData = null;
                
                if (user?.id) {
                    try {
                        const { db } = await import('../utils/db');
                        userData = await db.get('users', user.id) as any;
                        console.log('📊 User data from database:', userData);
                        
                        if (!userData) {
                            console.log('⚠️ No user data found in database for ID:', user.id);
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
                                const { loadUserProfilePhoto } = await import('../utils/user-profile-photos');
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
                
                // Initialize with user data from database or fallback values
                const defaultDetails = {
                    firstName: userData?.name?.split(' ')[0] || userData?.name || '',
                    lastName: userData?.name?.split(' ').slice(1).join(' ') || '',
                    email: userData?.email || '',
                    phone: userData?.phone || '+63',
                    address: userData?.address || '',
                    profilePhoto: profilePhoto
                };
                
                console.log('✅ Initialized personal details with user data:', defaultDetails);
                console.log('🔍 User data from database:', userData);
                console.log('🔍 Profile photo loaded:', !!profilePhoto);
                setPersonalDetails(defaultDetails);
                setTempPersonalDetails(defaultDetails);
            }
        } catch (error) {
            console.error('❌ Error loading personal details:', error);
            setHasError(true);
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
            setTempPersonalDetails(fallbackDetails);
            console.log('🔄 Using fallback personal details due to error');
        } finally {
            setIsLoading(false);
        }
    }, [user?.id, isAuthenticated, PERSONAL_DETAILS_KEY]);

    const savePersonalDetails = useCallback(async (data: PersonalDetails) => {
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
                        if (user?.id && typeof user.id === 'string' && user.id.trim() !== '') {
                            try {
                                console.log('💾 Saving profile photo to database for user:', user.id);
                                console.log('🔍 Debug - user object:', { id: user.id, hasId: !!user.id, type: typeof user.id });
                                
                                // Double-check user is still valid before making the async call
                                if (!user?.id || typeof user.id !== 'string' || user.id.trim() === '') {
                                    console.warn('⚠️ User became invalid during async operation, skipping database save');
                                    return;
                                }
                                
                                const fileName = `profile_photo_${user.id}_${Date.now()}.jpg`;
                                const mimeType = profilePhoto.startsWith('data:') 
                                    ? profilePhoto.split(';')[0].split(':')[1] 
                                    : 'image/jpeg';
                                
                                const { saveUserProfilePhoto } = await import('../utils/user-profile-photos');
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
                        } else {
                            console.warn('⚠️ Cannot save profile photo to database - invalid user ID:', {
                                hasUser: !!user,
                                userId: user?.id,
                                userIdType: typeof user?.id,
                                userIdEmpty: user?.id === '',
                                userIdTrimmed: user?.id?.trim() === ''
                            });
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
    }, [user?.id, PERSONAL_DETAILS_KEY]);

    const refreshProfilePhoto = useCallback(async () => {
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
                        const { loadUserProfilePhoto } = await import('../utils/user-profile-photos');
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
    }, [user?.id, PERSONAL_DETAILS_KEY]);

    // Load data when component mounts or user changes
    useEffect(() => {
        if (user?.id && isAuthenticated) {
            loadPersonalDetails();
        }
    }, [user?.id, isAuthenticated, loadPersonalDetails]);

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
        if (typeof window !== 'undefined' && window.addEventListener) {
          window.addEventListener('profilePhotoLoaded', handleProfilePhotoLoaded as EventListener);
        }
        
        // Cleanup
        return () => {
            if (typeof window !== 'undefined' && window.removeEventListener) {
              window.removeEventListener('profilePhotoLoaded', handleProfilePhotoLoaded as EventListener);
            }
        };
    }, [user?.id, PERSONAL_DETAILS_KEY]);

    return {
        personalDetails,
        setPersonalDetails,
        tempPersonalDetails,
        setTempPersonalDetails,
        isLoading,
        hasError,
        setHasError,
        loadPersonalDetails,
        savePersonalDetails,
        refreshProfilePhoto
    };
};
