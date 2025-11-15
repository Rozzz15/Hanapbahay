import { useRouter } from 'expo-router';
import { ScrollView, Pressable, View, Text, StyleSheet, KeyboardAvoidingView, Platform, Modal, TextInput, Image, Alert } from 'react-native';
import React, { useState } from 'react';
import { signUpUser } from '@/api/auth/sign-up';
import { useAuth } from '@/context/AuthContext';
import { SignInButton } from '@/components/buttons';
import { useToast } from "@/components/ui/toast";
import { notifications } from "@/utils";
import { showSimpleAlert } from "@/utils/alert";
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { OwnerApplicationDocument } from '@/types';

interface SignUpModalProps {
    visible: boolean;
    onClose: () => void;
    onSignUpSuccess?: () => void;
    onSwitchToLogin?: () => void;
}

export default function SignUpModal({ visible, onClose, onSignUpSuccess, onSwitchToLogin }: SignUpModalProps) {
    const router = useRouter();
    const { refreshUser, redirectOwnerBasedOnListings, redirectTenantToTabs } = useAuth();
    const toast = useToast();
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [selectedRole, setSelectedRole] = useState<'tenant' | 'owner'>('tenant');

    // Owner-specific state
    const [ownerAddress, setOwnerAddress] = useState({
        houseNumber: '',
        street: '',
        barangay: '' as 'RIZAL' | 'TALOLONG' | 'GOMEZ' | 'MAGSAYSAY' | ''
    });
    const [showBarangayDropdown, setShowBarangayDropdown] = useState(false);
    const [ownerDocuments, setOwnerDocuments] = useState<OwnerApplicationDocument[]>([]);
    const [showDocumentTypeModal, setShowDocumentTypeModal] = useState(false);
    const [agreeToTerms, setAgreeToTerms] = useState(false);
    const [showTermsModal, setShowTermsModal] = useState(false);
    const [showPrivacyModal, setShowPrivacyModal] = useState(false);
    
    // Predefined document types for business requirements
    const documentTypes = [
        'Government ID',
        'Business Permit',
        'Barangay Clearance',
        'Mayor\'s Permit',
        'Tax Identification Number (TIN)',
        'Business Registration',
        'Other'
    ];

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        contactNumber: '',
        address: '',
        password: '',
        confirmPassword: '',
        gender: '' as 'male' | 'female' | '',
        familyType: '' as 'individual' | 'family' | '',
        emergencyContactPerson: '',
        emergencyContactNumber: '',
    });
    const [errors, setErrors] = useState({
        name: '',
        email: '',
        contactNumber: '',
        address: '',
        password: '',
        confirmPassword: '',
        gender: '',
        familyType: '',
        houseNumber: '',
        street: '',
        barangay: '',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Reset form when modal closes
    React.useEffect(() => {
        if (!visible) {
            setFormData({
                name: '',
                email: '',
                contactNumber: '',
                address: '',
                password: '',
                confirmPassword: '',
                gender: '' as 'male' | 'female' | '',
                familyType: '' as 'individual' | 'family' | '',
                emergencyContactPerson: '',
                emergencyContactNumber: '',
            });
            setOwnerAddress({
                houseNumber: '',
                street: '',
                barangay: '' as 'RIZAL' | 'TALOLONG' | 'GOMEZ' | 'MAGSAYSAY' | ''
            });
            setErrors({
                name: '',
                email: '',
                contactNumber: '',
                address: '',
                password: '',
                confirmPassword: '',
                gender: '',
                familyType: '',
                houseNumber: '',
                street: '',
                barangay: '',
            });
            setSelectedRole('tenant');
            setShowBarangayDropdown(false);
            setOwnerDocuments([]);
            setShowDocumentTypeModal(false);
            setAgreeToTerms(false);
            setShowTermsModal(false);
            setShowPrivacyModal(false);
        }
    }, [visible]);

    const pickDocument = async (documentName: string) => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission required', 'Please allow photo library access to upload documents.');
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            quality: 0.8,
            allowsMultipleSelection: false,
        });
        if (!result.canceled && result.assets?.length) {
            const newDocument: OwnerApplicationDocument = {
                id: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                name: documentName,
                uri: result.assets[0].uri,
                uploadedAt: new Date().toISOString(),
            };
            // Allow multiple documents - add the new document to the list
            setOwnerDocuments(prev => [...prev, newDocument]);
            setShowDocumentTypeModal(false);
        }
    };

    const removeDocument = (documentId: string) => {
        setOwnerDocuments(prev => prev.filter(doc => doc.id !== documentId));
    };

    const openDocumentPicker = () => {
        setShowDocumentTypeModal(true);
    };

    const handleTermsPress = () => {
        setShowTermsModal(true);
    };

    const handlePrivacyPress = () => {
        setShowPrivacyModal(true);
    };

    const formatPhoneNumber = (text: string) => {
        // Remove all non-digits
        const digits = text.replace(/\D/g, '');
        
        // If starts with 63, add + prefix
        if (digits.startsWith('63')) {
            return '+' + digits;
        }
        // If starts with 0, replace with +63
        if (digits.startsWith('0')) {
            return '+63' + digits.substring(1);
        }
        // If doesn't start with anything, add +63
        if (digits.length > 0) {
            return '+63' + digits;
        }
        return '';
    };

    const handlePhoneChange = (text: string) => {
        const formatted = formatPhoneNumber(text);
        if (formatted.length <= 13) {
            setFormData(prev => ({ ...prev, contactNumber: formatted }));
        }
    };

    const validateForm = () => {
        const newErrors = {
            name: '',
            email: '',
            contactNumber: '',
            address: '',
            password: '',
            confirmPassword: '',
            gender: '',
            familyType: '',
            houseNumber: '',
            street: '',
            barangay: '',
        };
        let isValid = true;

        if (!formData.name.trim()) {
            newErrors.name = 'Name is required';
            isValid = false;
        } else if (formData.name.trim().length < 2) {
            newErrors.name = 'Name must be at least 2 characters';
            isValid = false;
        }

        if (!formData.email.trim()) {
            newErrors.email = 'Email is required';
            isValid = false;
        } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
            newErrors.email = 'Email is invalid';
            isValid = false;
        }

        if (!formData.contactNumber.trim()) {
            newErrors.contactNumber = 'Contact number is required';
            isValid = false;
        } else if (!formData.contactNumber.match(/^\+63[0-9]{10}$/)) {
            newErrors.contactNumber = 'Contact number must be exactly 10 digits (excluding +63)';
            isValid = false;
        }

        // Address is only required for tenants
        if (selectedRole === 'tenant' && !formData.address.trim()) {
            newErrors.address = 'Address is required';
            isValid = false;
        }

        // Owner-specific address fields validation
        if (selectedRole === 'owner') {
            if (!ownerAddress.houseNumber.trim()) {
                newErrors.houseNumber = 'House number is required';
                isValid = false;
            }
            if (!ownerAddress.street.trim()) {
                newErrors.street = 'Street is required';
                isValid = false;
            }
            if (!ownerAddress.barangay) {
                newErrors.barangay = 'Barangay is required';
                isValid = false;
            }
        }

        // Gender and Family Type are required for tenants
        if (selectedRole === 'tenant') {
            if (!formData.gender) {
                newErrors.gender = 'Gender is required';
                isValid = false;
            }
            if (!formData.familyType) {
                newErrors.familyType = 'Family type is required';
                isValid = false;
            }
        }

        if (!formData.password) {
            newErrors.password = 'Password is required';
            isValid = false;
        } else if (formData.password.length < 6) {
            newErrors.password = 'Password must be at least 6 characters';
            isValid = false;
        }

        if (!formData.confirmPassword) {
            newErrors.confirmPassword = 'Please confirm your password';
            isValid = false;
        } else if (formData.password !== formData.confirmPassword) {
            newErrors.confirmPassword = 'Passwords do not match';
            isValid = false;
        }

        setErrors(newErrors);
        return isValid;
    };

    const onSubmit = async () => {
        // Validate terms agreement first
        if (!agreeToTerms) {
            showSimpleAlert('Terms Required', 'You must agree to the Terms and Conditions to create an account.');
            return;
        }

        if (!validateForm()) {
            return;
        }

        setIsSubmitting(true);
        try {
            // Owner flow: Save documents for verification
            if (selectedRole === 'owner' && ownerDocuments.length > 0) {
                console.log('💾 Saving owner verification documents:', ownerDocuments);
                const ownerVerification = { documents: ownerDocuments };
                await AsyncStorage.setItem('owner_verification', JSON.stringify(ownerVerification));
                console.log('✅ Owner verification documents saved');
            }

            const signUpData = {
                name: formData.name.trim(),
                email: formData.email.trim(),
                contactNumber: formData.contactNumber,
                address: selectedRole === 'tenant' ? formData.address.trim() : undefined,
                password: formData.password,
                confirmPassword: formData.confirmPassword,
                role: selectedRole,
                gender: selectedRole === 'tenant' ? (formData.gender === 'male' || formData.gender === 'female' ? formData.gender : undefined) : undefined,
                familyType: selectedRole === 'tenant' ? (formData.familyType === 'individual' || formData.familyType === 'family' ? formData.familyType : undefined) : undefined,
                emergencyContactPerson: selectedRole === 'tenant' ? formData.emergencyContactPerson.trim() || undefined : undefined,
                emergencyContactNumber: selectedRole === 'tenant' ? formData.emergencyContactNumber.trim() || undefined : undefined,
                houseNumber: selectedRole === 'owner' ? ownerAddress.houseNumber.trim() : undefined,
                street: selectedRole === 'owner' ? ownerAddress.street.trim() : undefined,
                barangay: selectedRole === 'owner' ? (ownerAddress.barangay === 'RIZAL' || ownerAddress.barangay === 'TALOLONG' || ownerAddress.barangay === 'GOMEZ' || ownerAddress.barangay === 'MAGSAYSAY' ? ownerAddress.barangay : undefined) : undefined,
            };

            const result = await signUpUser(signUpData);

            if (result.success) {
                await refreshUser();
                await new Promise(resolve => setTimeout(resolve, 200));

                toast.show('Account Created! Welcome to HanapBahay! Your account has been created successfully. 🎉');

                const roles = (result as any).roles || (result as any).user?.roles || [];
                const userId = (result as any).user?.id || (result as any).id;
                
                setTimeout(async () => {
                    if (Array.isArray(roles) && roles.includes('owner')) {
                        let ownerId = userId;
                        
                        try {
                            const { getAuthUser } = await import('@/utils/auth-user');
                            const authUser = await getAuthUser();
                            if (authUser?.id) {
                                ownerId = authUser.id;
                            }
                        } catch (authError) {
                            console.warn('⚠️ Could not get userId from auth context:', authError);
                        }
                        
                        if (ownerId) {
                            redirectOwnerBasedOnListings(ownerId);
                        }
                    } else {
                        // Pass userId to redirectTenantToTabs to ensure it has the user ID even if state hasn't updated
                        redirectTenantToTabs(userId);
                    }
                    
                    onClose();
                    if (onSignUpSuccess) {
                        onSignUpSuccess();
                    }
                }, 100);
            } else {
                showSimpleAlert(
                    'Sign Up Failed ❌',
                    result.error || 'Unable to create your account. Please try again.'
                );
            }
        } catch (error) {
            console.error('Sign-up error:', error);
            showSimpleAlert(
                'Sign Up Failed ❌',
                error instanceof Error ? error.message : 'Unable to create your account. Please try again.'
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    // Debug: Log when modal visibility changes
    React.useEffect(() => {
        console.log('🔵 SignUpModal visibility changed:', visible);
    }, [visible]);

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}
        >
            <BlurView intensity={100} tint="dark" style={styles.blurContainer}>
                <Pressable 
                    style={StyleSheet.absoluteFill}
                    onPress={onClose}
                />
                <KeyboardAvoidingView 
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.keyboardView}
                    keyboardVerticalOffset={Platform.OS === 'ios' ? -100 : -50}
                    pointerEvents="box-none"
                >
                    <View style={styles.modalContent}>
                        {/* Close Button */}
                        <Pressable 
                            style={styles.closeButton}
                            onPress={onClose}
                        >
                            <Ionicons name="close" size={20} color="#64748B" />
                        </Pressable>

                        <ScrollView 
                            style={styles.scrollView}
                            contentContainerStyle={styles.scrollContent}
                            showsVerticalScrollIndicator={false}
                            nestedScrollEnabled={true}
                        >
                            <View style={styles.contentContainer}>
                                {/* Header */}
                                <View style={styles.header}>
                                    <View style={styles.logoContainer}>
                                        <Image 
                                            source={require('../assets/images/LOPEZ.jpg')}
                                            style={styles.logoImage}
                                            resizeMode="contain"
                                        />
                                    </View>
                                    <Text style={styles.welcomeText} numberOfLines={2}>
                                        Create Your Account
                                    </Text>
                                    <Text style={styles.subtitleText} numberOfLines={2}>
                                        Create your Hanapbahay account your trusted rental companion.
                                    </Text>
                                    <Text style={styles.taglineText} numberOfLines={1}>
                                        Hanapbahay — hanap mo, nandito na!
                                    </Text>
                                </View>

                                {/* Role Selection */}
                                <View style={styles.roleContainer}>
                                    <Text style={styles.roleLabel}>I am a:</Text>
                                    <View style={styles.roleButtons}>
                                        <Pressable
                                            style={[
                                                styles.roleButton,
                                                selectedRole === 'tenant' && styles.roleButtonActive
                                            ]}
                                            onPress={() => setSelectedRole('tenant')}
                                        >
                                            <Ionicons 
                                                name="person-outline" 
                                                size={20} 
                                                color={selectedRole === 'tenant' ? '#FFFFFF' : '#64748B'} 
                                            />
                                            <Text style={[
                                                styles.roleButtonText,
                                                selectedRole === 'tenant' && styles.roleButtonTextActive
                                            ]}>
                                                Tenant
                                            </Text>
                                        </Pressable>
                                        <Pressable
                                            style={[
                                                styles.roleButton,
                                                selectedRole === 'owner' && styles.roleButtonActive
                                            ]}
                                            onPress={() => setSelectedRole('owner')}
                                        >
                                            <Ionicons 
                                                name="home-outline" 
                                                size={20} 
                                                color={selectedRole === 'owner' ? '#FFFFFF' : '#64748B'} 
                                            />
                                            <Text style={[
                                                styles.roleButtonText,
                                                selectedRole === 'owner' && styles.roleButtonTextActive
                                            ]}>
                                                Owner
                                            </Text>
                                        </Pressable>
                                    </View>
                                </View>

                                {/* Form Fields */}
                                <View style={styles.formSection}>
                                    {/* Name Field */}
                                    <View style={styles.inputContainer}>
                                        <View style={[styles.inputWrapper, errors.name && styles.inputError]}>
                                            <Ionicons name="person-outline" size={20} color={errors.name ? "#EF4444" : "#64748B"} style={styles.inputIcon} />
                                            <TextInput
                                                style={styles.textInput}
                                                placeholder="Full name"
                                                placeholderTextColor="#94A3B8"
                                                value={formData.name}
                                                onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
                                                autoCapitalize="words"
                                                autoCorrect={false}
                                            />
                                        </View>
                                        {errors.name && (
                                            <Text style={styles.errorText}>{errors.name}</Text>
                                        )}
                                    </View>

                                    {/* Email Field */}
                                    <View style={styles.inputContainer}>
                                        <View style={[styles.inputWrapper, errors.email && styles.inputError]}>
                                            <Ionicons name="mail-outline" size={20} color={errors.email ? "#EF4444" : "#64748B"} style={styles.inputIcon} />
                                            <TextInput
                                                style={styles.textInput}
                                                placeholder="Email address"
                                                placeholderTextColor="#94A3B8"
                                                value={formData.email}
                                                onChangeText={(text) => setFormData(prev => ({ ...prev, email: text }))}
                                                keyboardType="email-address"
                                                autoCapitalize="none"
                                                autoCorrect={false}
                                            />
                                        </View>
                                        {errors.email && (
                                            <Text style={styles.errorText}>{errors.email}</Text>
                                        )}
                                    </View>

                                    {/* Contact Number Field */}
                                    <View style={styles.inputContainer}>
                                        <View style={[styles.inputWrapper, errors.contactNumber && styles.inputError]}>
                                            <Ionicons name="call-outline" size={20} color={errors.contactNumber ? "#EF4444" : "#64748B"} style={styles.inputIcon} />
                                            <TextInput
                                                style={styles.textInput}
                                                placeholder="+63XXXXXXXXXX"
                                                placeholderTextColor="#94A3B8"
                                                value={formData.contactNumber}
                                                onChangeText={handlePhoneChange}
                                                keyboardType="phone-pad"
                                                maxLength={13}
                                            />
                                        </View>
                                        {errors.contactNumber && (
                                            <Text style={styles.errorText}>{errors.contactNumber}</Text>
                                        )}
                                    </View>

                                    {/* Address Field (only for tenants) */}
                                    {selectedRole === 'tenant' && (
                                        <View style={styles.inputContainer}>
                                            <View style={[styles.inputWrapper, errors.address && styles.inputError]}>
                                                <Ionicons name="location-outline" size={20} color={errors.address ? "#EF4444" : "#64748B"} style={styles.inputIcon} />
                                                <TextInput
                                                    style={styles.textInput}
                                                    placeholder="Address"
                                                    placeholderTextColor="#94A3B8"
                                                    value={formData.address}
                                                    onChangeText={(text) => setFormData(prev => ({ ...prev, address: text }))}
                                                    autoCapitalize="words"
                                                />
                                            </View>
                                            {errors.address && (
                                                <Text style={styles.errorText}>{errors.address}</Text>
                                            )}
                                        </View>
                                    )}

                                    {/* Gender Selection (for tenants only) */}
                                    {selectedRole === 'tenant' && (
                                        <View style={styles.inputContainer}>
                                            <Text style={styles.fieldLabel}>Gender *</Text>
                                            <View style={styles.radioGroup}>
                                                <Pressable
                                                    style={[
                                                        styles.radioOption,
                                                        formData.gender === 'male' && styles.radioOptionActive
                                                    ]}
                                                    onPress={() => setFormData(prev => ({ ...prev, gender: 'male' }))}
                                                >
                                                    <View style={[
                                                        styles.radioCircle,
                                                        formData.gender === 'male' && styles.radioCircleActive
                                                    ]}>
                                                        {formData.gender === 'male' && <View style={styles.radioInner} />}
                                                    </View>
                                                    <Text style={[
                                                        styles.radioText,
                                                        formData.gender === 'male' && styles.radioTextActive
                                                    ]}>Male</Text>
                                                </Pressable>
                                                <Pressable
                                                    style={[
                                                        styles.radioOption,
                                                        formData.gender === 'female' && styles.radioOptionActive
                                                    ]}
                                                    onPress={() => setFormData(prev => ({ ...prev, gender: 'female' }))}
                                                >
                                                    <View style={[
                                                        styles.radioCircle,
                                                        formData.gender === 'female' && styles.radioCircleActive
                                                    ]}>
                                                        {formData.gender === 'female' && <View style={styles.radioInner} />}
                                                    </View>
                                                    <Text style={[
                                                        styles.radioText,
                                                        formData.gender === 'female' && styles.radioTextActive
                                                    ]}>Female</Text>
                                                </Pressable>
                                            </View>
                                            {errors.gender && (
                                                <Text style={styles.errorText}>{errors.gender}</Text>
                                            )}
                                        </View>
                                    )}

                                    {/* Family Type Selection (for tenants only) */}
                                    {selectedRole === 'tenant' && (
                                        <View style={styles.inputContainer}>
                                            <Text style={styles.fieldLabel}>Family Type *</Text>
                                            <View style={styles.radioGroup}>
                                                <Pressable
                                                    style={[
                                                        styles.radioOption,
                                                        formData.familyType === 'individual' && styles.radioOptionActive
                                                    ]}
                                                    onPress={() => setFormData(prev => ({ ...prev, familyType: 'individual' }))}
                                                >
                                                    <View style={[
                                                        styles.radioCircle,
                                                        formData.familyType === 'individual' && styles.radioCircleActive
                                                    ]}>
                                                        {formData.familyType === 'individual' && <View style={styles.radioInner} />}
                                                    </View>
                                                    <Text style={[
                                                        styles.radioText,
                                                        formData.familyType === 'individual' && styles.radioTextActive
                                                    ]}>Individual</Text>
                                                </Pressable>
                                                <Pressable
                                                    style={[
                                                        styles.radioOption,
                                                        formData.familyType === 'family' && styles.radioOptionActive
                                                    ]}
                                                    onPress={() => setFormData(prev => ({ ...prev, familyType: 'family' }))}
                                                >
                                                    <View style={[
                                                        styles.radioCircle,
                                                        formData.familyType === 'family' && styles.radioCircleActive
                                                    ]}>
                                                        {formData.familyType === 'family' && <View style={styles.radioInner} />}
                                                    </View>
                                                    <Text style={[
                                                        styles.radioText,
                                                        formData.familyType === 'family' && styles.radioTextActive
                                                    ]}>Family</Text>
                                                </Pressable>
                                            </View>
                                            {errors.familyType && (
                                                <Text style={styles.errorText}>{errors.familyType}</Text>
                                            )}
                                        </View>
                                    )}

                                    {/* Emergency Contact Fields (for tenants only) */}
                                    {selectedRole === 'tenant' && (
                                        <>
                                            <View style={styles.inputContainer}>
                                                <Text style={styles.fieldLabel}>Emergency Contact Person (Optional)</Text>
                                                <View style={styles.inputWrapper}>
                                                    <Ionicons name="person-outline" size={20} color="#64748B" style={styles.inputIcon} />
                                                    <TextInput
                                                        style={styles.textInput}
                                                        placeholder="Contact person name"
                                                        placeholderTextColor="#94A3B8"
                                                        value={formData.emergencyContactPerson}
                                                        onChangeText={(text) => setFormData(prev => ({ ...prev, emergencyContactPerson: text }))}
                                                        autoCapitalize="words"
                                                    />
                                                </View>
                                            </View>
                                            
                                            <View style={styles.inputContainer}>
                                                <Text style={styles.fieldLabel}>Emergency Contact Number (Optional)</Text>
                                                <View style={styles.inputWrapper}>
                                                    <Ionicons name="call-outline" size={20} color="#64748B" style={styles.inputIcon} />
                                                    <TextInput
                                                        style={styles.textInput}
                                                        placeholder="Contact number"
                                                        placeholderTextColor="#94A3B8"
                                                        value={formData.emergencyContactNumber}
                                                        onChangeText={(text) => setFormData(prev => ({ ...prev, emergencyContactNumber: text }))}
                                                        keyboardType="phone-pad"
                                                    />
                                                </View>
                                            </View>
                                        </>
                                    )}

                                    {/* Owner Address Fields */}
                                    {selectedRole === 'owner' && (
                                        <>
                                            <View style={styles.inputContainer}>
                                                <Text style={styles.fieldLabel}>House Number *</Text>
                                                <View style={[styles.inputWrapper, errors.houseNumber && styles.inputError]}>
                                                    <Ionicons name="home-outline" size={20} color={errors.houseNumber ? "#EF4444" : "#64748B"} style={styles.inputIcon} />
                                                    <TextInput
                                                        style={styles.textInput}
                                                        placeholder="House number"
                                                        placeholderTextColor="#94A3B8"
                                                        value={ownerAddress.houseNumber}
                                                        onChangeText={(text) => setOwnerAddress(prev => ({ ...prev, houseNumber: text }))}
                                                        autoCapitalize="none"
                                                    />
                                                </View>
                                                {errors.houseNumber && (
                                                    <Text style={styles.errorText}>{errors.houseNumber}</Text>
                                                )}
                                            </View>

                                            <View style={styles.inputContainer}>
                                                <Text style={styles.fieldLabel}>Street *</Text>
                                                <View style={[styles.inputWrapper, errors.street && styles.inputError]}>
                                                    <Ionicons name="map-outline" size={20} color={errors.street ? "#EF4444" : "#64748B"} style={styles.inputIcon} />
                                                    <TextInput
                                                        style={styles.textInput}
                                                        placeholder="Street name"
                                                        placeholderTextColor="#94A3B8"
                                                        value={ownerAddress.street}
                                                        onChangeText={(text) => setOwnerAddress(prev => ({ ...prev, street: text }))}
                                                        autoCapitalize="words"
                                                    />
                                                </View>
                                                {errors.street && (
                                                    <Text style={styles.errorText}>{errors.street}</Text>
                                                )}
                                            </View>

                                            <View style={[styles.inputContainer, { zIndex: showBarangayDropdown ? 100 : 1, marginBottom: showBarangayDropdown ? 180 : 18 }]}>
                                                <Text style={styles.fieldLabel}>Barangay *</Text>
                                                <View style={{ position: 'relative' }}>
                                                    <Pressable
                                                        style={[styles.inputWrapper, errors.barangay && styles.inputError, { justifyContent: 'space-between' }]}
                                                        onPress={() => setShowBarangayDropdown(!showBarangayDropdown)}
                                                    >
                                                        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                                                            <Ionicons name="location-outline" size={20} color={errors.barangay ? "#EF4444" : "#64748B"} style={styles.inputIcon} />
                                                            <Text style={[styles.textInput, { color: ownerAddress.barangay ? '#0F172A' : '#94A3B8' }]}>
                                                                {ownerAddress.barangay || 'Select barangay'}
                                                            </Text>
                                                        </View>
                                                        <Ionicons 
                                                            name={showBarangayDropdown ? "chevron-up" : "chevron-down"} 
                                                            size={20} 
                                                            color="#64748B" 
                                                        />
                                                    </Pressable>
                                                    {showBarangayDropdown && (
                                                        <View style={styles.dropdownContainer}>
                                                            {(['RIZAL', 'TALOLONG', 'GOMEZ', 'MAGSAYSAY'] as const).map((barangay) => (
                                                                <Pressable
                                                                    key={barangay}
                                                                    style={styles.dropdownOption}
                                                                    onPress={() => {
                                                                        setOwnerAddress(prev => ({ ...prev, barangay }));
                                                                        setShowBarangayDropdown(false);
                                                                    }}
                                                                >
                                                                    <Text style={styles.dropdownOptionText}>{barangay}</Text>
                                                                </Pressable>
                                                            ))}
                                                        </View>
                                                    )}
                                                </View>
                                                {errors.barangay && (
                                                    <Text style={styles.errorText}>{errors.barangay}</Text>
                                                )}
                                            </View>
                                        </>
                                    )}

                                    {/* Owner Document Upload Section */}
                                    {selectedRole === 'owner' && (
                                        <View style={styles.verificationSection}>
                                            <Text style={styles.sectionTitle}>Business Documents & Requirements</Text>
                                            <Text style={styles.verificationSubtext}>
                                                Upload documents required to run a business in your Barangay. You can upload multiple documents for each type (e.g., Government ID, Business Permit, Barangay Clearance, etc.)
                                            </Text>
                                            
                                            {/* Uploaded Documents List */}
                                            {ownerDocuments.length > 0 && (
                                                <View style={styles.documentsList}>
                                                    {ownerDocuments.map((doc) => (
                                                        <View key={doc.id} style={styles.documentItem}>
                                                            <View style={styles.documentPreview}>
                                                                <Image 
                                                                    source={{ uri: doc.uri }} 
                                                                    style={styles.documentThumbnail} 
                                                                />
                                                                <View style={styles.documentInfo}>
                                                                    <Text style={styles.documentName} numberOfLines={1}>
                                                                        {doc.name}
                                                                    </Text>
                                                                    <Text style={styles.documentDate}>
                                                                        {new Date(doc.uploadedAt).toLocaleDateString()}
                                                                    </Text>
                                                                </View>
                                                            </View>
                                                            <Pressable 
                                                                style={styles.removeDocumentButton}
                                                                onPress={() => removeDocument(doc.id)}
                                                            >
                                                                <Ionicons name="close-circle" size={24} color="#EF4444" />
                                                            </Pressable>
                                                        </View>
                                                    ))}
                                                </View>
                                            )}
                                            
                                            {/* Upload Button */}
                                            <Pressable 
                                                style={styles.uploadIdButton}
                                                onPress={openDocumentPicker}
                                            >
                                                <Ionicons name="add-circle" size={24} color="#3B82F6" />
                                                <Text style={styles.uploadIdText}>
                                                    {ownerDocuments.length === 0 
                                                        ? 'Upload Business Documents' 
                                                        : 'Add Another Document'}
                                                </Text>
                                            </Pressable>
                                            
                                            {ownerDocuments.length > 0 && (
                                                <Text style={styles.documentsHint}>
                                                    {ownerDocuments.length} document{ownerDocuments.length !== 1 ? 's' : ''} uploaded. Barangay officials will review these documents.
                                                </Text>
                                            )}
                                        </View>
                                    )}

                                    {/* Password Field */}
                                    <View style={styles.inputContainer}>
                                        <View style={[styles.inputWrapper, errors.password && styles.inputError]}>
                                            <Ionicons name="lock-closed-outline" size={20} color={errors.password ? "#EF4444" : "#64748B"} style={styles.inputIcon} />
                                            <TextInput
                                                style={styles.textInput}
                                                placeholder="Password"
                                                placeholderTextColor="#94A3B8"
                                                secureTextEntry={!showPassword}
                                                value={formData.password}
                                                onChangeText={(text) => setFormData(prev => ({ ...prev, password: text }))}
                                            />
                                            <Pressable
                                                style={styles.eyeButton}
                                                onPress={() => setShowPassword(!showPassword)}
                                            >
                                                <Ionicons 
                                                    name={showPassword ? "eye-off-outline" : "eye-outline"} 
                                                    size={20} 
                                                    color="#64748B" 
                                                />
                                            </Pressable>
                                        </View>
                                        {errors.password && (
                                            <Text style={styles.errorText}>{errors.password}</Text>
                                        )}
                                    </View>

                                    {/* Confirm Password Field */}
                                    <View style={styles.inputContainer}>
                                        <View style={[styles.inputWrapper, errors.confirmPassword && styles.inputError]}>
                                            <Ionicons name="lock-closed-outline" size={20} color={errors.confirmPassword ? "#EF4444" : "#64748B"} style={styles.inputIcon} />
                                            <TextInput
                                                style={styles.textInput}
                                                placeholder="Confirm password"
                                                placeholderTextColor="#94A3B8"
                                                secureTextEntry={!showConfirmPassword}
                                                value={formData.confirmPassword}
                                                onChangeText={(text) => setFormData(prev => ({ ...prev, confirmPassword: text }))}
                                            />
                                            <Pressable
                                                style={styles.eyeButton}
                                                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                                            >
                                                <Ionicons 
                                                    name={showConfirmPassword ? "eye-off-outline" : "eye-outline"} 
                                                    size={20} 
                                                    color="#64748B" 
                                                />
                                            </Pressable>
                                        </View>
                                        {errors.confirmPassword && (
                                            <Text style={styles.errorText}>{errors.confirmPassword}</Text>
                                        )}
                                    </View>

                                    {/* Terms and Conditions */}
                                    <View style={styles.termsContainer}>
                                        <Pressable
                                            style={styles.checkboxContainer}
                                            onPress={() => setAgreeToTerms(!agreeToTerms)}
                                        >
                                            <View style={[styles.checkbox, agreeToTerms && styles.checkboxChecked]}>
                                                {agreeToTerms && (
                                                    <Ionicons name="checkmark" size={14} color="#fff" />
                                                )}
                                            </View>
                                            <Text style={styles.termsText}>
                                                I agree to the{' '}
                                                <Text style={styles.termsLink} onPress={handleTermsPress}>
                                                    Terms and Conditions
                                                </Text>
                                                {' '}and{' '}
                                                <Text style={styles.termsLink} onPress={handlePrivacyPress}>
                                                    Privacy Policy
                                                </Text>
                                            </Text>
                                        </Pressable>
                                    </View>

                                    {/* Sign Up Button */}
                                    <SignInButton
                                        title="Sign Up"
                                        onPress={onSubmit}
                                        isLoading={isSubmitting}
                                        disabled={isSubmitting}
                                    />

                                    {/* Sign In Link */}
                                    <View style={styles.signInContainer}>
                                        <Text style={styles.signInText}>Already have an account? </Text>
                                        <Pressable onPress={() => {
                                            onClose();
                                            if (onSwitchToLogin) {
                                                onSwitchToLogin();
                                            }
                                        }}>
                                            <Text style={styles.signInLink}>Sign in</Text>
                                        </Pressable>
                                    </View>
                                </View>
                            </View>
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </BlurView>
            
            {/* Document Type Selection Modal */}
            <Modal
                visible={showDocumentTypeModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowDocumentTypeModal(false)}
            >
                <View style={styles.documentModalContainer}>
                    <View style={styles.documentModalContent}>
                        <View style={styles.documentModalHeader}>
                            <Text style={styles.documentModalTitle}>Select Document Type</Text>
                            <Pressable
                                onPress={() => setShowDocumentTypeModal(false)}
                                style={styles.documentModalCloseButton}
                            >
                                <Ionicons name="close" size={24} color="#64748B" />
                            </Pressable>
                        </View>
                        <ScrollView style={styles.documentModalScroll}>
                            {documentTypes.map((docType) => {
                                const uploadedCount = ownerDocuments.filter(doc => doc.name === docType).length;
                                return (
                                    <Pressable
                                        key={docType}
                                        style={styles.documentTypeOption}
                                        onPress={() => pickDocument(docType)}
                                    >
                                        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                                            <Text style={styles.documentTypeText}>
                                                {docType}
                                            </Text>
                                            {uploadedCount > 0 && (
                                                <View style={styles.uploadedBadge}>
                                                    <Text style={styles.uploadedBadgeText}>
                                                        {uploadedCount} {uploadedCount === 1 ? 'file' : 'files'}
                                                    </Text>
                                                </View>
                                            )}
                                        </View>
                                        <Ionicons 
                                            name="chevron-forward" 
                                            size={20} 
                                            color="#6B7280" 
                                        />
                                    </Pressable>
                                );
                            })}
                        </ScrollView>
                    </View>
                </View>
            </Modal>
            
            {/* Terms and Conditions Modal */}
            <Modal
                visible={showTermsModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowTermsModal(false)}
            >
                <View style={styles.termsModalContainer}>
                    <View style={styles.termsModalContent}>
                        <View style={styles.termsModalHeader}>
                            <Text style={styles.termsModalTitle}>Terms and Conditions</Text>
                            <Pressable
                                onPress={() => setShowTermsModal(false)}
                                style={styles.termsModalCloseButton}
                            >
                                <Ionicons name="close" size={24} color="#64748B" />
                            </Pressable>
                        </View>
                        <ScrollView style={styles.termsModalScroll} showsVerticalScrollIndicator={true}>
                            <View style={styles.termsModalTextContainer}>
                                <Text style={styles.termsModalDateText}>
                                    Last updated: October 8, 2025
                                </Text>

                                <Text style={styles.termsModalBodyText}>
                                    Welcome to HANAPBAHAY, a mobile and web application designed to help users find available houses, apartments, and rooms for rent. By accessing or using the HANAPBAHAY App ("the App"), you agree to be bound by these Terms and Conditions. Please read them carefully before using our services.
                                </Text>

                                <View style={styles.termsModalSection}>
                                    <View style={styles.termsModalSubsection}>
                                        <Text style={styles.termsModalSubtitle}>1. Acceptance of Terms</Text>
                                        <Text style={styles.termsModalBodyText}>
                                            By creating an account or using the App, you agree to comply with and be legally bound by these Terms. If you do not agree, please do not use the App.
                                        </Text>
                                    </View>

                                    <View style={styles.termsModalSubsection}>
                                        <Text style={styles.termsModalSubtitle}>2. Description of Service</Text>
                                        <Text style={styles.termsModalBodyText}>
                                            HANAPBAHAY provides a digital platform that connects property owners who have rental listings and tenants looking for rental properties.
                                        </Text>
                                        <Text style={styles.termsModalBodyText}>
                                            We do not own, manage, or control any property listed in the App. All transactions or rental agreements are made directly between the property owner and tenant.
                                        </Text>
                                    </View>

                                    <View style={styles.termsModalSubsection}>
                                        <Text style={styles.termsModalSubtitle}>3. User Accounts</Text>
                                        <Text style={styles.termsModalBodyText}>
                                            • You must be at least 18 years old to create an account.
                                        </Text>
                                        <Text style={styles.termsModalBodyText}>
                                            • You agree to provide accurate and updated information when creating your account.
                                        </Text>
                                        <Text style={styles.termsModalBodyText}>
                                            • You are responsible for maintaining the confidentiality of your password and for all activities under your account.
                                        </Text>
                                        <Text style={styles.termsModalBodyText}>
                                            • If you suspect any unauthorized access, you must notify us immediately.
                                        </Text>
                                    </View>

                                    <View style={styles.termsModalSubsection}>
                                        <Text style={styles.termsModalSubtitle}>4. Owner Listings</Text>
                                        <Text style={styles.termsModalBodyText}>
                                            • Property owners are responsible for ensuring that all listing details (price, location, photos, descriptions) are accurate and not misleading.
                                        </Text>
                                        <Text style={styles.termsModalBodyText}>
                                            • HANAPBAHAY reserves the right to edit, hide, or remove listings that violate our policies or contain false, offensive, or illegal content.
                                        </Text>
                                        <Text style={styles.termsModalBodyText}>
                                            • Owners must comply with local housing, safety, and rental laws.
                                        </Text>
                                    </View>

                                    <View style={styles.termsModalSubsection}>
                                        <Text style={styles.termsModalSubtitle}>5. Tenant Responsibilities</Text>
                                        <Text style={styles.termsModalBodyText}>
                                            • Tenants must use the App honestly and respectfully when contacting or booking properties.
                                        </Text>
                                        <Text style={styles.termsModalBodyText}>
                                            • HANAPBAHAY is not responsible for disputes between tenants and property owners.
                                        </Text>
                                    </View>

                                    <View style={styles.termsModalSubsection}>
                                        <Text style={styles.termsModalSubtitle}>6. Payments (if applicable)</Text>
                                        <Text style={styles.termsModalBodyText}>
                                            • If payments are made through HANAPBAHAY, they are processed by a third-party payment provider.
                                        </Text>
                                        <Text style={styles.termsModalBodyText}>
                                            • HANAPBAHAY does not store or have access to your payment card details.
                                        </Text>
                                        <Text style={styles.termsModalBodyText}>
                                            • Refunds or cancellations depend on the property owner's policies.
                                        </Text>
                                    </View>

                                    <View style={styles.termsModalSubsection}>
                                        <Text style={styles.termsModalSubtitle}>7. Prohibited Activities</Text>
                                        <Text style={styles.termsModalBodyText}>
                                            Users must not:
                                        </Text>
                                        <Text style={styles.termsModalBodyText}>
                                            • Post false or misleading property information
                                        </Text>
                                        <Text style={styles.termsModalBodyText}>
                                            • Use the App for scams or fraudulent purposes
                                        </Text>
                                        <Text style={styles.termsModalBodyText}>
                                            • Upload harmful software, viruses, or spam
                                        </Text>
                                        <Text style={styles.termsModalBodyText}>
                                            • Harass or abuse other users
                                        </Text>
                                        <Text style={styles.termsModalBodyText}>
                                            Violation of these rules may result in suspension or termination of your account.
                                        </Text>
                                    </View>

                                    <View style={styles.termsModalSubsection}>
                                        <Text style={styles.termsModalSubtitle}>8. Limitation of Liability</Text>
                                        <Text style={styles.termsModalBodyText}>
                                            HANAPBAHAY provides the platform "as is" without warranties of any kind.
                                        </Text>
                                        <Text style={styles.termsModalBodyText}>
                                            We are not responsible for:
                                        </Text>
                                        <Text style={styles.termsModalBodyText}>
                                            • Property condition, safety, or accuracy of listings
                                        </Text>
                                        <Text style={styles.termsModalBodyText}>
                                            • Financial or rental disputes between users
                                        </Text>
                                        <Text style={styles.termsModalBodyText}>
                                            • Damages or losses resulting from use of the App
                                        </Text>
                                    </View>

                                    <View style={styles.termsModalSubsection}>
                                        <Text style={styles.termsModalSubtitle}>9. Termination</Text>
                                        <Text style={styles.termsModalBodyText}>
                                            HANAPBAHAY may suspend or terminate your access if you violate these Terms or misuse the platform.
                                        </Text>
                                    </View>

                                    <View style={styles.termsModalSubsection}>
                                        <Text style={styles.termsModalSubtitle}>10. Changes to Terms</Text>
                                        <Text style={styles.termsModalBodyText}>
                                            We may update these Terms from time to time. Continued use of the App means you accept the updated version.
                                        </Text>
                                    </View>

                                    <View style={styles.termsModalSubsection}>
                                        <Text style={styles.termsModalSubtitle}>11. Contact Us</Text>
                                        <Text style={styles.termsModalBodyText}>
                                            For questions or concerns about these Terms, you can reach us at:
                                        </Text>
                                        <Text style={styles.termsModalContactText}>
                                            rozelramos17@gmail.com
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        </ScrollView>
                        <View style={styles.termsModalFooter}>
                                <Pressable
                                    onPress={() => setShowTermsModal(false)}
                                    style={styles.termsModalButton}
                                >
                                    <Text style={styles.termsModalButtonText}>I Understand</Text>
                                </Pressable>
                            </View>
                        </View>
                    </View>
                </Modal>
            
            {/* Privacy Policy Modal */}
            <Modal
                visible={showPrivacyModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowPrivacyModal(false)}
            >
                <View style={styles.termsModalContainer}>
                    <View style={styles.termsModalContent}>
                        <View style={styles.termsModalHeader}>
                            <Text style={styles.termsModalTitle}>Privacy Policy</Text>
                            <Pressable
                                onPress={() => setShowPrivacyModal(false)}
                                style={styles.termsModalCloseButton}
                            >
                                <Ionicons name="close" size={24} color="#64748B" />
                            </Pressable>
                        </View>
                        <ScrollView style={styles.termsModalScroll} showsVerticalScrollIndicator={true}>
                            <View style={styles.termsModalTextContainer}>
                                <Text style={styles.termsModalDateText}>
                                    Last updated: October 8, 2025
                                </Text>

                                <Text style={styles.termsModalBodyText}>
                                    Your privacy is important to us. This Privacy Policy explains how HANAPBAHAY collects, uses, and protects your personal information when you use our App.
                                </Text>

                                <View style={styles.termsModalSection}>
                                    <View style={styles.termsModalSubsection}>
                                        <Text style={styles.termsModalSubtitle}>1. Information We Collect</Text>
                                        <Text style={styles.termsModalBodyText}>
                                            We collect the following types of data:
                                        </Text>
                                        <Text style={styles.termsModalBodyText}>
                                            • <Text style={styles.termsModalBoldText}>Personal Information:</Text> Name, email, phone number, account details
                                        </Text>
                                        <Text style={styles.termsModalBodyText}>
                                            • <Text style={styles.termsModalBoldText}>Property Information:</Text> Details of listings posted by owners
                                        </Text>
                                        <Text style={styles.termsModalBodyText}>
                                            • <Text style={styles.termsModalBoldText}>Usage Data:</Text> Device type, IP address, and app usage statistics
                                        </Text>
                                        <Text style={styles.termsModalBodyText}>
                                            • <Text style={styles.termsModalBoldText}>Optional Media:</Text> Photos or videos you upload for listings
                                        </Text>
                                        <Text style={styles.termsModalBodyText}>
                                            We do not collect or store sensitive financial information unless required for payments through a secure provider.
                                        </Text>
                                    </View>

                                    <View style={styles.termsModalSubsection}>
                                        <Text style={styles.termsModalSubtitle}>2. How We Use Your Information</Text>
                                        <Text style={styles.termsModalBodyText}>
                                            We use your information to:
                                        </Text>
                                        <Text style={styles.termsModalBodyText}>
                                            • Create and manage your account
                                        </Text>
                                        <Text style={styles.termsModalBodyText}>
                                            • Display rental listings and search results
                                        </Text>
                                        <Text style={styles.termsModalBodyText}>
                                            • Communicate with you (e.g., inquiries, updates, alerts)
                                        </Text>
                                        <Text style={styles.termsModalBodyText}>
                                            • Improve app performance and user experience
                                        </Text>
                                        <Text style={styles.termsModalBodyText}>
                                            • Prevent fraud and maintain safety
                                        </Text>
                                    </View>

                                    <View style={styles.termsModalSubsection}>
                                        <Text style={styles.termsModalSubtitle}>3. Data Sharing</Text>
                                        <Text style={styles.termsModalBodyText}>
                                            We do not sell your personal data.
                                        </Text>
                                        <Text style={styles.termsModalBodyText}>
                                            We may share limited data with:
                                        </Text>
                                        <Text style={styles.termsModalBodyText}>
                                            • Service providers who help us operate the App (hosting, analytics, payment processing)
                                        </Text>
                                        <Text style={styles.termsModalBodyText}>
                                            • Law enforcement, if required by law or to protect users' safety
                                        </Text>
                                    </View>

                                    <View style={styles.termsModalSubsection}>
                                        <Text style={styles.termsModalSubtitle}>4. Data Storage and Security</Text>
                                        <Text style={styles.termsModalBodyText}>
                                            Your data is stored securely using encrypted systems.
                                        </Text>
                                        <Text style={styles.termsModalBodyText}>
                                            However, no digital platform is 100% secure — use the App responsibly and avoid sharing unnecessary personal details publicly.
                                        </Text>
                                    </View>

                                    <View style={styles.termsModalSubsection}>
                                        <Text style={styles.termsModalSubtitle}>5. Your Rights</Text>
                                        <Text style={styles.termsModalBodyText}>
                                            You can:
                                        </Text>
                                        <Text style={styles.termsModalBodyText}>
                                            • Access or update your account information
                                        </Text>
                                        <Text style={styles.termsModalBodyText}>
                                            • Request deletion of your data
                                        </Text>
                                        <Text style={styles.termsModalBodyText}>
                                            • Withdraw consent to data collection (may affect app functionality)
                                        </Text>
                                        <Text style={styles.termsModalBodyText}>
                                            To exercise these rights, contact us at{' '}
                                            <Text style={styles.termsModalContactText}>rozelramos17@gmail.com</Text>
                                        </Text>
                                    </View>

                                    <View style={styles.termsModalSubsection}>
                                        <Text style={styles.termsModalSubtitle}>6. Cookies and Tracking</Text>
                                        <Text style={styles.termsModalBodyText}>
                                            The App may use cookies or similar technologies to improve user experience, personalize content, and analyze usage.
                                        </Text>
                                    </View>

                                    <View style={styles.termsModalSubsection}>
                                        <Text style={styles.termsModalSubtitle}>7. Children's Privacy</Text>
                                        <Text style={styles.termsModalBodyText}>
                                            HANAPBAHAY is not designed for users under 18 years old. We do not knowingly collect information from minors.
                                        </Text>
                                    </View>

                                    <View style={styles.termsModalSubsection}>
                                        <Text style={styles.termsModalSubtitle}>8. Changes to Privacy Policy</Text>
                                        <Text style={styles.termsModalBodyText}>
                                            We may update this Privacy Policy from time to time. The latest version will always be available in the App.
                                        </Text>
                                    </View>

                                    <View style={styles.termsModalSubsection}>
                                        <Text style={styles.termsModalSubtitle}>9. Contact Us</Text>
                                        <Text style={styles.termsModalBodyText}>
                                            If you have any questions or privacy concerns, contact:
                                        </Text>
                                        <Text style={styles.termsModalContactText}>
                                            rozelramos17@gmail.com
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        </ScrollView>
                        <View style={styles.termsModalFooter}>
                            <Pressable
                                onPress={() => setShowPrivacyModal(false)}
                                style={styles.termsModalButton}
                            >
                                <Text style={styles.termsModalButtonText}>I Understand</Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>
        </Modal>
    );
}

const styles = StyleSheet.create({
    blurContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    keyboardView: {
        flex: 1,
        width: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: '90%',
        maxWidth: 420,
        maxHeight: '95%',
        minHeight: 600,
        backgroundColor: '#FFFFFF',
        borderRadius: 32,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 32 },
        shadowOpacity: 0.15,
        shadowRadius: 48,
        elevation: 30,
        overflow: 'hidden',
        position: 'relative',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.8)',
        zIndex: 10,
    },
    closeButton: {
        position: 'absolute',
        top: 20,
        right: 20,
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#F8F9FA',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
        borderWidth: 1,
        borderColor: '#E9ECEF',
    },
    scrollView: {
        flex: 1,
        width: '100%',
    },
    scrollContent: {
        flexGrow: 1,
        paddingBottom: 20,
    },
    header: {
        paddingTop: 20,
        paddingHorizontal: 0,
        paddingBottom: 28,
        alignItems: 'center',
        width: '100%',
        marginBottom: 8,
    },
    logoContainer: {
        marginBottom: 20,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 8,
    },
    logoImage: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#FFFFFF',
        shadowColor: '#10B981',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 15,
        borderWidth: 2,
        borderColor: '#ECFDF5',
    },
    welcomeText: {
        fontSize: 32,
        fontWeight: '800',
        color: '#0F172A',
        textAlign: 'center',
        marginBottom: 12,
        letterSpacing: -0.8,
        lineHeight: 38,
        flexShrink: 0,
        width: '100%',
    },
    subtitleText: {
        fontSize: 14,
        color: '#64748B',
        textAlign: 'center',
        lineHeight: 20,
        fontWeight: '400',
        paddingHorizontal: 8,
        marginBottom: 8,
        width: '100%',
    },
    taglineText: {
        fontSize: 15,
        color: '#10B981',
        textAlign: 'center',
        fontWeight: '600',
        marginBottom: 0,
        letterSpacing: 0.2,
        marginTop: 0,
    },
    roleContainer: {
        paddingHorizontal: 24,
        marginBottom: 20,
    },
    roleLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#475569',
        marginBottom: 12,
    },
    roleButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    roleButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        backgroundColor: '#F8F9FA',
        borderWidth: 2,
        borderColor: '#E9ECEF',
        gap: 8,
    },
    roleButtonActive: {
        backgroundColor: '#3B82F6',
        borderColor: '#3B82F6',
    },
    roleButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#64748B',
    },
    roleButtonTextActive: {
        color: '#FFFFFF',
    },
    contentContainer: {
        paddingHorizontal: 32,
        paddingTop: 8,
        paddingBottom: 32,
    },
    formSection: {
        width: '100%',
    },
    inputContainer: {
        marginBottom: 18,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FAFBFC',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#E4E7EB',
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    inputError: {
        borderColor: '#F87171',
        backgroundColor: '#FEF2F2',
        borderWidth: 1.5,
    },
    inputIcon: {
        marginRight: 12,
    },
    textInput: {
        flex: 1,
        fontSize: 16,
        color: '#0F172A',
        fontWeight: '400',
        padding: 0,
    },
    eyeButton: {
        padding: 4,
        marginLeft: 8,
    },
    errorText: {
        fontSize: 13,
        color: '#EF4444',
        marginTop: 6,
        marginLeft: 4,
        fontWeight: '500',
    },
    fieldLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 8,
    },
    radioGroup: {
        flexDirection: 'row',
        gap: 12,
    },
    radioOption: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 12,
        paddingHorizontal: 16,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: '#E5E7EB',
        flex: 1,
    },
    radioOptionActive: {
        borderColor: '#3B82F6',
        backgroundColor: '#EFF6FF',
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
    radioCircleActive: {
        borderColor: '#3B82F6',
    },
    radioInner: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#3B82F6',
    },
    radioText: {
        fontSize: 14,
        color: '#374151',
        fontWeight: '500',
    },
    radioTextActive: {
        color: '#3B82F6',
        fontWeight: '600',
    },
    dropdownContainer: {
        position: 'absolute',
        top: '100%',
        left: 0,
        right: 0,
        marginTop: 4,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
        zIndex: 1000,
        maxHeight: 200,
    },
    dropdownOption: {
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    dropdownOptionText: {
        fontSize: 14,
        color: '#374151',
        fontWeight: '500',
    },
    signInContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 24,
        paddingTop: 24,
        borderTopWidth: 1,
        borderTopColor: '#F1F3F5',
    },
    signInText: {
        fontSize: 14,
        color: '#64748B',
        fontWeight: '400',
    },
    signInLink: {
        fontSize: 14,
        color: '#3B82F6',
        fontWeight: '600',
        marginLeft: 4,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1F2937',
        marginBottom: 8,
    },
    verificationSection: {
        marginBottom: 20,
        padding: 16,
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    verificationSubtext: {
        fontSize: 13,
        color: '#6B7280',
        marginBottom: 16,
        lineHeight: 18,
    },
    documentsList: {
        marginBottom: 12,
        gap: 8,
    },
    documentItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#FFFFFF',
        padding: 12,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    documentPreview: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        gap: 12,
    },
    documentThumbnail: {
        width: 50,
        height: 50,
        borderRadius: 8,
        backgroundColor: '#F3F4F6',
    },
    documentInfo: {
        flex: 1,
    },
    documentName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 2,
    },
    documentDate: {
        fontSize: 12,
        color: '#6B7280',
    },
    removeDocumentButton: {
        padding: 4,
    },
    uploadIdButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        padding: 14,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#3B82F6',
        borderStyle: 'dashed',
    },
    uploadIdText: {
        fontSize: 14,
        color: '#3B82F6',
        fontWeight: '600',
    },
    documentsHint: {
        fontSize: 12,
        color: '#6B7280',
        marginTop: 8,
        textAlign: 'center',
        fontStyle: 'italic',
    },
    termsContainer: {
        marginBottom: 20,
        marginTop: 8,
    },
    checkboxContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
    },
    checkbox: {
        width: 20,
        height: 20,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: '#D1D5DB',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFFFFF',
        marginTop: 2,
    },
    checkboxChecked: {
        backgroundColor: '#3B82F6',
        borderColor: '#3B82F6',
    },
    termsText: {
        flex: 1,
        fontSize: 13,
        color: '#64748B',
        lineHeight: 18,
    },
    termsLink: {
        color: '#3B82F6',
        fontWeight: '600',
        textDecorationLine: 'underline',
    },
    termsModalContainer: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    termsModalContent: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '90%',
        flex: 1,
    },
    termsModalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    termsModalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1F2937',
    },
    termsModalCloseButton: {
        padding: 4,
    },
    termsModalScroll: {
        flex: 1,
    },
    termsModalTextContainer: {
        padding: 20,
        gap: 16,
    },
    termsModalDateText: {
        fontSize: 13,
        color: '#6B7280',
        marginBottom: 8,
    },
    termsModalBodyText: {
        fontSize: 15,
        color: '#374151',
        lineHeight: 22,
        marginBottom: 8,
    },
    termsModalSection: {
        gap: 20,
    },
    termsModalSubsection: {
        gap: 8,
    },
    termsModalSubtitle: {
        fontSize: 17,
        fontWeight: '700',
        color: '#1F2937',
        marginBottom: 8,
        marginTop: 4,
    },
    termsModalBoldText: {
        fontWeight: '700',
    },
    termsModalContactText: {
        fontSize: 15,
        color: '#3B82F6',
        fontWeight: '600',
    },
    termsModalFooter: {
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
        backgroundColor: '#FFFFFF',
    },
    termsModalButton: {
        backgroundColor: '#3B82F6',
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: 12,
        alignItems: 'center',
    },
    termsModalButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    documentModalContainer: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    documentModalContent: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '80%',
        paddingBottom: 20,
    },
    documentModalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    documentModalTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1F2937',
    },
    documentModalCloseButton: {
        padding: 4,
    },
    documentModalScroll: {
        paddingHorizontal: 20,
        paddingTop: 12,
    },
    documentTypeOption: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    documentTypeText: {
        fontSize: 16,
        color: '#374151',
        fontWeight: '500',
    },
    uploadedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: 8,
        paddingHorizontal: 8,
        paddingVertical: 4,
        backgroundColor: '#EFF6FF',
        borderRadius: 12,
    },
    uploadedBadgeText: {
        fontSize: 12,
        color: '#3B82F6',
        fontWeight: '600',
    },
});

