import { useRouter } from 'expo-router';
import { ScrollView, View, Text, TouchableOpacity, Image, Alert, useWindowDimensions, Pressable, Modal, StyleSheet, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { signUpUser, signUpSchema } from '@/api/auth/sign-up';
// Removed react-hook-form - using React state instead
import { useToast } from "@/components/ui/toast";
import { notifications, createNotification } from "@/utils";
import { useAuth } from '@/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';

export default function SignUpScreen() {
    const router = useRouter();
    const toast = useToast();
    const { refreshUser, redirectOwnerBasedOnListings } = useAuth();
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [agreeToTerms, setAgreeToTerms] = useState(false);
    const [phoneInput, setPhoneInput] = useState('');
    const [duplicateAccountError, setDuplicateAccountError] = useState(false);
    const [selectedRole, setSelectedRole] = useState<'tenant' | 'owner'>('tenant');
    const [showTermsModal, setShowTermsModal] = useState(false);
    const [showPrivacyModal, setShowPrivacyModal] = useState(false);
    
    const { width } = useWindowDimensions();

    // Owner-specific state
    const [govIdUri, setGovIdUri] = useState<string | null>(null);

    // Form state management with React useState
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        contactNumber: '',
        address: '',
        password: '',
        confirmPassword: '',
        gender: '' as 'male' | 'female' | '',
        familyType: '' as 'individual' | 'family' | ''
    });
    const [errors, setErrors] = useState({
        name: '',
        email: '',
        contactNumber: '',
        address: '',
        password: '',
        confirmPassword: '',
        gender: '',
        familyType: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const pickGovId = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission required', 'Please allow photo library access to upload your ID.');
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.8,
        });
        if (!result.canceled && result.assets?.length) {
            setGovIdUri(result.assets[0].uri);
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
            familyType: ''
        };
        let isValid = true;

        if (!formData.name.trim()) {
            newErrors.name = 'Name is required';
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

        if (formData.password !== formData.confirmPassword) {
            newErrors.confirmPassword = 'Passwords do not match';
            isValid = false;
        }

        setErrors(newErrors);
        return isValid;
    };

    const onSubmit = async () => {
        // Clear any previous duplicate account error
        setDuplicateAccountError(false);
        
        // Validate terms agreement first
        if (!agreeToTerms) {
            Alert.alert('Terms Required', 'You must agree to the Terms and Conditions to create an account.');
            return;
        }

        // Validate form
        if (!validateForm()) {
            Alert.alert('Validation Error', 'Please fill in all required fields correctly.');
            return;
        }

        setIsSubmitting(true);

        try {
            // Owner flow: Make government ID optional; warn but do not block submission
            if (selectedRole === 'owner') {
                if (!govIdUri) {
                    Alert.alert('Owner Verification', 'You can upload your government ID later to verify your account.');
                }

                // Persist owner extras for later flows (only if provided)
                if (govIdUri) {
                console.log('💾 Saving owner verification data:', govIdUri);
                    const ownerVerification = { govIdUri };
                    await AsyncStorage.setItem('owner_verification', JSON.stringify(ownerVerification));
                console.log('✅ Owner verification data saved');
            } else {
                console.log('ℹ️ No government ID provided, skipping verification storage');
            }
            }

            // Prepare data for submission - convert empty strings to undefined for optional fields
            const submissionData = {
                ...formData,
                role: selectedRole,
                // Convert empty strings to undefined for optional enum fields
                gender: formData.gender === '' ? undefined : formData.gender,
                familyType: formData.familyType === '' ? undefined : formData.familyType,
                // Ensure address is handled properly
                address: formData.address === '' ? undefined : formData.address,
            };
            
            console.log('🚀 Calling signUpUser with data:', submissionData);
            const result = await signUpUser(submissionData);
            console.log('📊 Sign-up result:', result);
            
            if (result.success) {
                console.log('Account created successfully, storing ID verification...');
                
                
                await refreshUser(); // Refresh user context
                
                console.log('User context refreshed, showing success message...');
                // Show success toast
                Alert.alert('Account Created!', 'Welcome to HanapBahay! Your account has been created successfully.');

                // Route by role - owners always go to dashboard
                if (result.role === 'owner') {
                    console.log('🏠 Owner account created - redirecting to dashboard');
                    router.replace('/(owner)/dashboard');
                } else {
                    router.replace('/(tabs)');
                }
            } else {
                // Handle sign-up failure (e.g., duplicate account)
                console.log('Account creation failed');
                
                // Check if it's a duplicate account error
                const errorMessage = (result as any).error || 'Account creation failed';
                if (errorMessage.includes('already exists')) {
                    setDuplicateAccountError(true);
                }
                
                Alert.alert('Sign Up Failed', 'Unable to create your account. Please check your information and try again.');
            }
        } catch (error) {
            let errorMessage = "An unexpected error occurred";

            if (error instanceof Error) {
                errorMessage = error.message;
                console.error('Sign-up error details:', error);
            }

            // Show error toast
            Alert.alert('Sign Up Failed', 'Unable to create your account. Please check your information and try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleTermsPress = () => {
        setShowTermsModal(true);
    };

    const handlePrivacyPress = () => {
        setShowPrivacyModal(true);
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity 
                    style={styles.backButton}
                            onPress={() => router.navigate('/')}
                        >
                    <Ionicons name="arrow-back" size={24} color="#374151" />
                </TouchableOpacity>
                
                <View style={styles.logoContainer}>
                    <Ionicons name="home" size={32} color="#10B981" />
                    <Text style={styles.logoText}>HanapBahay</Text>
                </View>
                
                <Text style={styles.welcomeText}>Create Your Account</Text>
                <Text style={styles.subtitleText}>
                    Join thousands of users finding their perfect home
                            </Text>
            </View>

            {/* Form Card */}
            <ScrollView 
                style={styles.scrollView}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                <View style={styles.formCard}>
                    {/* Role Selection */}
                    <View style={styles.roleSection}>
                        <Text style={styles.sectionTitle}>I am a</Text>
                        <View style={styles.roleContainer}>
                            <Pressable
                                style={[
                                    styles.roleButton,
                                    selectedRole === 'tenant' && styles.roleButtonSelected
                                ]}
                                onPress={() => setSelectedRole('tenant')}
                            >
                                <Text style={[
                                    styles.roleButtonText,
                                    selectedRole === 'tenant' && styles.roleButtonTextSelected
                                ]}>
                                    Tenant
                                </Text>
                                <Text style={[
                                    styles.roleButtonSubtext,
                                    selectedRole === 'tenant' && styles.roleButtonSubtextSelected
                                ]}>
                                    Looking to rent a place
                                </Text>
                            </Pressable>
                            <Pressable
                                style={[
                                    styles.roleButton,
                                    selectedRole === 'owner' && styles.roleButtonSelected
                                ]}
                                onPress={() => {
                                    setSelectedRole('owner');
                                    // Address is not required for owners, set to empty if not provided
                                    if (!formData.address.trim()) {
                                        setFormData(prev => ({ ...prev, address: '' }));
                                    }
                                }}
                            >
                                <Text style={[
                                    styles.roleButtonText,
                                    selectedRole === 'owner' && styles.roleButtonTextSelected
                                ]}>
                                    Property Owner
                                </Text>
                                <Text style={[
                                    styles.roleButtonSubtext,
                                    selectedRole === 'owner' && styles.roleButtonSubtextSelected
                                ]}>
                                    List and manage rentals
                                </Text>
                            </Pressable>
                        </View>
                    </View>

                    {/* Personal Information Section */}
                    <View style={styles.formSection}>
                        {/* Name Field */}
                        <View style={styles.inputContainer}>
                            <Text style={styles.inputLabel}>
                                {selectedRole === 'owner' ? 'Full Name / Business Name' : 'Full Name'}
                            </Text>
                            <View style={[styles.inputWrapper, errors.name && styles.inputError]}>
                                <Ionicons name="person" size={20} color="#10B981" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.textInput}
                                    placeholder={selectedRole === 'owner' ? "Enter full name or business name" : "Enter your full name"}
                                    placeholderTextColor="#9CA3AF"
                                    value={formData.name}
                                    onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
                                />
                            </View>
                                        {errors.name && (
                                <Text style={styles.errorText}>{errors.name}</Text>
                                        )}
                        </View>

                                    {/* Contact Number */}
                        <View style={styles.inputContainer}>
                            <Text style={styles.inputLabel}>Mobile Number</Text>
                            <View style={styles.phoneContainer}>
                                <View style={styles.countryCode}>
                                    <Text style={styles.countryCodeText}>+63</Text>
                                </View>
                                <View style={[styles.inputWrapper, styles.phoneInput, errors.contactNumber && styles.inputError]}>
                                    <TextInput
                                        style={styles.textInput}
                                                    placeholder="912 345 6789"
                                        placeholderTextColor="#9CA3AF"
                                                    value={phoneInput}
                                                    onChangeText={(text) => {
                                                        const digitsOnly = text.replace(/\D/g, '');
                                                        if (digitsOnly.length <= 10) {
                                                            setPhoneInput(digitsOnly);
                                                            // Only set contactNumber if there are digits
                                                            setFormData(prev => ({ ...prev, contactNumber: digitsOnly.length > 0 ? `+63${digitsOnly}` : '' }));
                                                        }
                                                    }}
                                                    maxLength={10}
                                                    keyboardType="phone-pad"
                                                />
                                </View>
                            </View>
                                        {errors.contactNumber && (
                                <Text style={styles.errorText}>{errors.contactNumber}</Text>
                                        )}
                        </View>

                                    {/* Email Address */}
                        <View style={styles.inputContainer}>
                            <Text style={styles.inputLabel}>Email Address</Text>
                            <View style={[styles.inputWrapper, (errors.email || duplicateAccountError) && styles.inputError]}>
                                <Ionicons name="mail" size={20} color="#10B981" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.textInput}
                                                placeholder="Enter your email address"
                                    placeholderTextColor="#9CA3AF"
                                    value={formData.email}
                                                onChangeText={(text) => {
                                                    setFormData(prev => ({ ...prev, email: text }));
                                                    if (duplicateAccountError) setDuplicateAccountError(false);
                                                }}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                            />
                            </View>
                                        {errors.email && (
                                <Text style={styles.errorText}>{errors.email}</Text>
                                        )}
                                        {duplicateAccountError && !errors.email && (
                                <Text style={styles.errorText}>
                                    An account with this email already exists. Please use a different email or try signing in instead.
                                </Text>
                            )}
                                        </View>
                        
                        {/* Address Field (for tenants only) */}
                        {selectedRole === 'tenant' && (
                            <View style={styles.inputContainer}>
                                <Text style={styles.inputLabel}>Current Address (Optional)</Text>
                                <View style={[styles.inputWrapper, errors.address && styles.inputError]}>
                                    <Ionicons name="location" size={20} color="#10B981" style={styles.inputIcon} />
                                    <TextInput
                                        style={styles.textInput}
                                        placeholder="Enter your current address"
                                        placeholderTextColor="#9CA3AF"
                                        value={formData.address}
                                        onChangeText={(text) => setFormData(prev => ({ ...prev, address: text }))}
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
                                <Text style={styles.inputLabel}>Gender</Text>
                                <View style={styles.radioGroup}>
                                    <TouchableOpacity
                                        style={[
                                            styles.radioOption,
                                            formData.gender === 'male' && styles.radioOptionSelected
                                        ]}
                                        onPress={() => setFormData(prev => ({ ...prev, gender: 'male' }))}
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
                                        onPress={() => setFormData(prev => ({ ...prev, gender: 'female' }))}
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
                                {errors.gender && (
                                    <Text style={styles.errorText}>{errors.gender}</Text>
                                )}
                            </View>
                        )}

                        {/* Family Type Selection (for tenants only) */}
                        {selectedRole === 'tenant' && (
                            <View style={styles.inputContainer}>
                                <Text style={styles.inputLabel}>Family Type</Text>
                                <View style={styles.radioGroup}>
                                    <TouchableOpacity
                                        style={[
                                            styles.radioOption,
                                            formData.familyType === 'individual' && styles.radioOptionSelected
                                        ]}
                                        onPress={() => setFormData(prev => ({ ...prev, familyType: 'individual' }))}
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
                                        onPress={() => setFormData(prev => ({ ...prev, familyType: 'family' }))}
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
                                {errors.familyType && (
                                    <Text style={styles.errorText}>{errors.familyType}</Text>
                                )}
                            </View>
                        )}

                        {/* Owner Verification Section */}
                        {selectedRole === 'owner' && (
                            <View style={styles.verificationSection}>
                                <Text style={styles.sectionTitle}>Owner Verification</Text>
                                <Text style={styles.verificationSubtext}>
                                    Government ID (Driver's License, Passport, National ID)
                                </Text>
                                {govIdUri ? (
                                    <View style={styles.idPreviewContainer}>
                                        <Image 
                                            source={{ uri: govIdUri }} 
                                            style={styles.idPreview} 
                                        />
                                        <TouchableOpacity 
                                            style={styles.removeIdButton}
                                            onPress={() => setGovIdUri(null)}
                                        >
                                            <Text style={styles.removeIdText}>Remove ID</Text>
                                        </TouchableOpacity>
                                    </View>
                                ) : (
                                    <TouchableOpacity 
                                        style={styles.uploadIdButton}
                                        onPress={pickGovId}
                                    >
                                        <Ionicons name="cloud-upload" size={24} color="#10B981" />
                                        <Text style={styles.uploadIdText}>Upload Government ID</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        )}

                    {/* Security Section */}
                    <View style={styles.securitySection}>
                        <Text style={styles.sectionTitle}>Security Settings</Text>
                        <Text style={styles.sectionSubtext}>
                                Create a secure password for your account
                            </Text>

                        {/* Password Field */}
                        <View style={styles.inputContainer}>
                            <Text style={styles.inputLabel}>Password</Text>
                            <View style={[styles.inputWrapper, errors.password && styles.inputError]}>
                                <Ionicons name="lock-closed" size={20} color="#10B981" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.textInput}
                                    placeholder="Create a strong password"
                                    placeholderTextColor="#9CA3AF"
                                    secureTextEntry={!showPassword}
                                    value={formData.password}
                                    onChangeText={(text) => setFormData(prev => ({ ...prev, password: text }))}
                                />
                                <TouchableOpacity
                                    style={styles.eyeButton}
                                    onPress={() => setShowPassword(!showPassword)}
                                >
                                    <Ionicons 
                                        name={showPassword ? "eye-off" : "eye"} 
                                        size={20} 
                                        color="#9CA3AF" 
                                    />
                                </TouchableOpacity>
                            </View>
                            {errors.password && (
                                <Text style={styles.errorText}>{errors.password}</Text>
                            )}
                        </View>

                        {/* Confirm Password Field */}
                        <View style={styles.inputContainer}>
                            <Text style={styles.inputLabel}>Confirm Password</Text>
                            <View style={[styles.inputWrapper, errors.confirmPassword && styles.inputError]}>
                                <Ionicons name="lock-closed" size={20} color="#10B981" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.textInput}
                                    placeholder="Confirm your password"
                                    placeholderTextColor="#9CA3AF"
                                    secureTextEntry={!showConfirmPassword}
                                    value={formData.confirmPassword}
                                    onChangeText={(text) => setFormData(prev => ({ ...prev, confirmPassword: text }))}
                                />
                                <TouchableOpacity
                                    style={styles.eyeButton}
                                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                                >
                                    <Ionicons 
                                        name={showConfirmPassword ? "eye-off" : "eye"} 
                                        size={20} 
                                        color="#9CA3AF" 
                                    />
                                </TouchableOpacity>
                            </View>
                            {errors.confirmPassword && (
                                <Text style={styles.errorText}>{errors.confirmPassword}</Text>
                            )}
                        </View>

                        {/* Password Requirements */}
                        <View style={styles.passwordRequirements}>
                            <Text style={styles.requirementsTitle}>Password Requirements:</Text>
                            <Text style={styles.requirementText}>• At least 6 characters long</Text>
                            <Text style={styles.requirementText}>• Use a combination of letters and numbers</Text>
                            <Text style={styles.requirementText}>• Avoid common passwords for better security</Text>
                        </View>
                    </View>

                    {/* Terms and Conditions */}
                    <View style={styles.termsContainer}>
                            <Pressable
                            style={styles.checkboxContainer}
                                onPress={() => setAgreeToTerms(!agreeToTerms)}
                            >
                            <View style={[styles.checkbox, agreeToTerms && styles.checkboxChecked]}>
                                {agreeToTerms && (
                                    <Ionicons name="checkmark" size={16} color="#fff" />
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

                        {/* Create Account Button */}
                            <TouchableOpacity
                        style={[
                            styles.createAccountButton,
                            (!agreeToTerms || isSubmitting) && styles.createAccountButtonDisabled
                        ]}
                                onPress={onSubmit}
                        disabled={!agreeToTerms || isSubmitting}
                    >
                        <View style={styles.buttonContent}>
                                    {isSubmitting && (
                                <View style={styles.loadingSpinner} />
                                    )}
                            <Text style={styles.createAccountButtonText}>
                                        {isSubmitting ? 'Creating Account...' : 'Create My Account'}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                            
                            {!agreeToTerms && (
                        <Text style={styles.termsErrorText}>
                                    You must agree to the Terms and Conditions to create an account
                                </Text>
                            )}

                        {/* Sign In Link */}
                    <View style={styles.signInContainer}>
                        <Text style={styles.signInText}>Already have an account? </Text>
                        <TouchableOpacity onPress={() => router.push('/login')}>
                            <Text style={styles.signInLink}>Sign In Here</Text>
                        </TouchableOpacity>
                    </View>
                </View>
                </View>
            </ScrollView>

            {/* Terms and Conditions Modal */}
            <Modal
                visible={showTermsModal}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setShowTermsModal(false)}
            >
                <View style={styles.modalContainer}>
                    {/* Header */}
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Terms and Conditions</Text>
                        <TouchableOpacity
                            onPress={() => setShowTermsModal(false)}
                            style={styles.modalCloseButton}
                        >
                            <Text style={styles.modalCloseText}>Close</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Content */}
                    <ScrollView style={styles.modalContent}>
                        <View style={styles.modalTextContainer}>
                            <Text style={styles.modalDateText}>
                                Last updated: October 8, 2025
                            </Text>

                            <Text style={styles.modalBodyText}>
                                Welcome to HANAPBAHAY, a mobile and web application designed to help users find available houses, apartments, and rooms for rent. By accessing or using the HANAPBAHAY App ("the App"), you agree to be bound by these Terms and Conditions. Please read them carefully before using our services.
                            </Text>

                            <View style={styles.modalSection}>
                                <View style={styles.modalSubsection}>
                                    <Text style={styles.modalSubtitle}>1. Acceptance of Terms</Text>
                                    <Text style={styles.modalBodyText}>
                                        By creating an account or using the App, you agree to comply with and be legally bound by these Terms. If you do not agree, please do not use the App.
                                    </Text>
                                </View>

                                <View style={styles.modalSubsection}>
                                    <Text style={styles.modalSubtitle}>2. Description of Service</Text>
                                    <Text style={styles.modalBodyText}>
                                        HANAPBAHAY provides a digital platform that connects property owners who have rental listings and tenants looking for rental properties.
                                    </Text>
                                    <Text style={styles.modalBodyText}>
                                        We do not own, manage, or control any property listed in the App. All transactions or rental agreements are made directly between the property owner and tenant.
                                    </Text>
                                </View>

                                <View style={styles.modalSubsection}>
                                    <Text style={styles.modalSubtitle}>3. User Accounts</Text>
                                    <Text style={styles.modalBodyText}>
                                        • You must be at least 18 years old to create an account.
                                    </Text>
                                    <Text style={styles.modalBodyText}>
                                        • You agree to provide accurate and updated information when creating your account.
                                    </Text>
                                    <Text style={styles.modalBodyText}>
                                        • You are responsible for maintaining the confidentiality of your password and for all activities under your account.
                                    </Text>
                                    <Text style={styles.modalBodyText}>
                                        • If you suspect any unauthorized access, you must notify us immediately.
                                    </Text>
                                </View>

                                <View style={styles.modalSubsection}>
                                    <Text style={styles.modalSubtitle}>4. Owner Listings</Text>
                                    <Text style={styles.modalBodyText}>
                                        • Property owners are responsible for ensuring that all listing details (price, location, photos, descriptions) are accurate and not misleading.
                                    </Text>
                                    <Text style={styles.modalBodyText}>
                                        • HANAPBAHAY reserves the right to edit, hide, or remove listings that violate our policies or contain false, offensive, or illegal content.
                                    </Text>
                                    <Text style={styles.modalBodyText}>
                                        • Owners must comply with local housing, safety, and rental laws.
                                    </Text>
                                </View>

                                <View style={styles.modalSubsection}>
                                    <Text style={styles.modalSubtitle}>5. Tenant Responsibilities</Text>
                                    <Text style={styles.modalBodyText}>
                                        • Tenants must use the App honestly and respectfully when contacting or booking properties.
                                    </Text>
                                    <Text style={styles.modalBodyText}>
                                        • HANAPBAHAY is not responsible for disputes between tenants and property owners.
                                    </Text>
                                </View>

                                <View style={styles.modalSubsection}>
                                    <Text style={styles.modalSubtitle}>6. Payments (if applicable)</Text>
                                    <Text style={styles.modalBodyText}>
                                        • If payments are made through HANAPBAHAY, they are processed by a third-party payment provider.
                                    </Text>
                                    <Text style={styles.modalBodyText}>
                                        • HANAPBAHAY does not store or have access to your payment card details.
                                    </Text>
                                    <Text style={styles.modalBodyText}>
                                        • Refunds or cancellations depend on the property owner's policies.
                                    </Text>
                                </View>

                                <View style={styles.modalSubsection}>
                                    <Text style={styles.modalSubtitle}>7. Prohibited Activities</Text>
                                    <Text style={styles.modalBodyText}>
                                        Users must not:
                                    </Text>
                                    <Text style={styles.modalBodyText}>
                                        • Post false or misleading property information
                                    </Text>
                                    <Text style={styles.modalBodyText}>
                                        • Use the App for scams or fraudulent purposes
                                    </Text>
                                    <Text style={styles.modalBodyText}>
                                        • Upload harmful software, viruses, or spam
                                    </Text>
                                    <Text style={styles.modalBodyText}>
                                        • Harass or abuse other users
                                    </Text>
                                    <Text style={styles.modalBodyText}>
                                        Violation of these rules may result in suspension or termination of your account.
                                    </Text>
                                </View>

                                <View style={styles.modalSubsection}>
                                    <Text style={styles.modalSubtitle}>8. Limitation of Liability</Text>
                                    <Text style={styles.modalBodyText}>
                                        HANAPBAHAY provides the platform "as is" without warranties of any kind.
                                    </Text>
                                    <Text style={styles.modalBodyText}>
                                        We are not responsible for:
                                    </Text>
                                    <Text style={styles.modalBodyText}>
                                        • Property condition, safety, or accuracy of listings
                                    </Text>
                                    <Text style={styles.modalBodyText}>
                                        • Financial or rental disputes between users
                                    </Text>
                                    <Text style={styles.modalBodyText}>
                                        • Damages or losses resulting from use of the App
                                    </Text>
                                </View>

                                <View style={styles.modalSubsection}>
                                    <Text style={styles.modalSubtitle}>9. Termination</Text>
                                    <Text style={styles.modalBodyText}>
                                        HANAPBAHAY may suspend or terminate your access if you violate these Terms or misuse the platform.
                                    </Text>
                                </View>

                                <View style={styles.modalSubsection}>
                                    <Text style={styles.modalSubtitle}>10. Changes to Terms</Text>
                                    <Text style={styles.modalBodyText}>
                                        We may update these Terms from time to time. Continued use of the App means you accept the updated version.
                                    </Text>
                                </View>

                                <View style={styles.modalSubsection}>
                                    <Text style={styles.modalSubtitle}>11. Contact Us</Text>
                                    <Text style={styles.modalBodyText}>
                                        For questions or concerns about these Terms, you can reach us at:
                                    </Text>
                                    <Text style={styles.modalContactText}>
                                        rozelramos17@gmail.com
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </ScrollView>

                    {/* Footer */}
                    <View style={styles.modalFooter}>
                        <TouchableOpacity
                            onPress={() => setShowTermsModal(false)}
                            style={styles.modalButton}
                        >
                            <Text style={styles.modalButtonText}>I Understand</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Privacy Policy Modal */}
            <Modal
                visible={showPrivacyModal}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setShowPrivacyModal(false)}
            >
                <View style={styles.modalContainer}>
                    {/* Header */}
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Privacy Policy</Text>
                        <TouchableOpacity
                            onPress={() => setShowPrivacyModal(false)}
                            style={styles.modalCloseButton}
                        >
                            <Text style={styles.modalCloseText}>Close</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Content */}
                    <ScrollView style={styles.modalContent}>
                        <View style={styles.modalTextContainer}>
                            <Text style={styles.modalDateText}>
                                Last updated: October 8, 2025
                            </Text>

                            <Text style={styles.modalBodyText}>
                                Your privacy is important to us. This Privacy Policy explains how HANAPBAHAY collects, uses, and protects your personal information when you use our App.
                            </Text>

                            <View style={styles.modalSection}>
                                <View style={styles.modalSubsection}>
                                    <Text style={styles.modalSubtitle}>1. Information We Collect</Text>
                                    <Text style={styles.modalBodyText}>
                                        We collect the following types of data:
                                    </Text>
                                    <Text style={styles.modalBodyText}>
                                        • <Text style={styles.modalBoldText}>Personal Information:</Text> Name, email, phone number, account details
                                    </Text>
                                    <Text style={styles.modalBodyText}>
                                        • <Text style={styles.modalBoldText}>Property Information:</Text> Details of listings posted by owners
                                    </Text>
                                    <Text style={styles.modalBodyText}>
                                        • <Text style={styles.modalBoldText}>Usage Data:</Text> Device type, IP address, and app usage statistics
                                    </Text>
                                    <Text style={styles.modalBodyText}>
                                        • <Text style={styles.modalBoldText}>Optional Media:</Text> Photos or videos you upload for listings
                                    </Text>
                                    <Text style={styles.modalBodyText}>
                                        We do not collect or store sensitive financial information unless required for payments through a secure provider.
                                    </Text>
                                </View>

                                <View style={styles.modalSubsection}>
                                    <Text style={styles.modalSubtitle}>2. How We Use Your Information</Text>
                                    <Text style={styles.modalBodyText}>
                                        We use your information to:
                                    </Text>
                                    <Text style={styles.modalBodyText}>
                                        • Create and manage your account
                                    </Text>
                                    <Text style={styles.modalBodyText}>
                                        • Display rental listings and search results
                                    </Text>
                                    <Text style={styles.modalBodyText}>
                                        • Communicate with you (e.g., inquiries, updates, alerts)
                                    </Text>
                                    <Text style={styles.modalBodyText}>
                                        • Improve app performance and user experience
                                    </Text>
                                    <Text style={styles.modalBodyText}>
                                        • Prevent fraud and maintain safety
                                    </Text>
                                </View>

                                <View style={styles.modalSubsection}>
                                    <Text style={styles.modalSubtitle}>3. Data Sharing</Text>
                                    <Text style={styles.modalBodyText}>
                                        We do not sell your personal data.
                                    </Text>
                                    <Text style={styles.modalBodyText}>
                                        We may share limited data with:
                                    </Text>
                                    <Text style={styles.modalBodyText}>
                                        • Service providers who help us operate the App (hosting, analytics, payment processing)
                                    </Text>
                                    <Text style={styles.modalBodyText}>
                                        • Law enforcement, if required by law or to protect users' safety
                                    </Text>
                                </View>

                                <View style={styles.modalSubsection}>
                                    <Text style={styles.modalSubtitle}>4. Data Storage and Security</Text>
                                    <Text style={styles.modalBodyText}>
                                        Your data is stored securely using encrypted systems.
                                    </Text>
                                    <Text style={styles.modalBodyText}>
                                        However, no digital platform is 100% secure — use the App responsibly and avoid sharing unnecessary personal details publicly.
                                    </Text>
                                </View>

                                <View style={styles.modalSubsection}>
                                    <Text style={styles.modalSubtitle}>5. Your Rights</Text>
                                    <Text style={styles.modalBodyText}>
                                        You can:
                                    </Text>
                                    <Text style={styles.modalBodyText}>
                                        • Access or update your account information
                                    </Text>
                                    <Text style={styles.modalBodyText}>
                                        • Request deletion of your data
                                    </Text>
                                    <Text style={styles.modalBodyText}>
                                        • Withdraw consent to data collection (may affect app functionality)
                                    </Text>
                                    <Text style={styles.modalBodyText}>
                                        To exercise these rights, contact us at{' '}
                                        <Text style={styles.modalContactText}>rozelramos17@gmail.com</Text>
                                    </Text>
                                </View>

                                <View style={styles.modalSubsection}>
                                    <Text style={styles.modalSubtitle}>6. Cookies and Tracking</Text>
                                    <Text style={styles.modalBodyText}>
                                        The App may use cookies or similar technologies to improve user experience, personalize content, and analyze usage.
                                    </Text>
                                </View>

                                <View style={styles.modalSubsection}>
                                    <Text style={styles.modalSubtitle}>7. Children's Privacy</Text>
                                    <Text style={styles.modalBodyText}>
                                        HANAPBAHAY is not designed for users under 18 years old. We do not knowingly collect information from minors.
                                    </Text>
                                </View>

                                <View style={styles.modalSubsection}>
                                    <Text style={styles.modalSubtitle}>8. Changes to Privacy Policy</Text>
                                    <Text style={styles.modalBodyText}>
                                        We may update this Privacy Policy from time to time. The latest version will always be available in the App.
                                    </Text>
                                </View>

                                <View style={styles.modalSubsection}>
                                    <Text style={styles.modalSubtitle}>9. Contact Us</Text>
                                    <Text style={styles.modalBodyText}>
                                        If you have any questions or privacy concerns, contact:
                                    </Text>
                                    <Text style={styles.modalContactText}>
                                        rozelramos17@gmail.com
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </ScrollView>

                    {/* Footer */}
                    <View style={styles.modalFooter}>
                        <TouchableOpacity
                            onPress={() => setShowPrivacyModal(false)}
                            style={styles.modalButton}
                        >
                            <Text style={styles.modalButtonText}>I Understand</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    header: {
        paddingTop: 60,
        paddingHorizontal: 24,
        paddingBottom: 30,
        backgroundColor: '#FFFFFF',
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    logoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        marginBottom: 20,
    },
    logoText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#111827',
        letterSpacing: 1,
    },
    welcomeText: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#111827',
        textAlign: 'center',
        marginBottom: 8,
    },
    subtitleText: {
        fontSize: 16,
        color: '#6B7280',
        textAlign: 'center',
        lineHeight: 22,
    },
    scrollView: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    scrollContent: {
        paddingHorizontal: 24,
        paddingBottom: 40,
    },
    formCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 24,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    roleSection: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 12,
    },
    sectionSubtext: {
        fontSize: 14,
        color: '#6B7280',
        marginBottom: 16,
    },
    roleContainer: {
        flexDirection: 'row',
        gap: 12,
    },
    roleButton: {
        flex: 1,
        padding: 16,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#E5E7EB',
        backgroundColor: '#FFFFFF',
    },
    roleButtonSelected: {
        borderColor: '#10B981',
        backgroundColor: '#F0FDF4',
    },
    roleButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 4,
    },
    roleButtonTextSelected: {
        color: '#059669',
    },
    roleButtonSubtext: {
        fontSize: 12,
        color: '#6B7280',
    },
    roleButtonSubtextSelected: {
        color: '#10B981',
    },
    formSection: {
        marginBottom: 24,
    },
    inputContainer: {
        marginBottom: 20,
    },
    inputLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 8,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#E5E7EB',
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    inputError: {
        borderColor: '#EF4444',
    },
    inputIcon: {
        marginRight: 12,
    },
    textInput: {
        flex: 1,
        fontSize: 16,
        color: '#1F2937',
    },
    phoneContainer: {
        flexDirection: 'row',
        gap: 8,
    },
    countryCode: {
        backgroundColor: '#F3F4F6',
        borderRadius: 8,
        borderWidth: 2,
        borderColor: '#D1D5DB',
        paddingHorizontal: 12,
        paddingVertical: 14,
        justifyContent: 'center',
    },
    countryCodeText: {
        fontSize: 16,
        fontWeight: '500',
        color: '#6B7280',
    },
    phoneInput: {
        flex: 1,
    },
    eyeButton: {
        padding: 4,
    },
    errorText: {
        fontSize: 14,
        color: '#EF4444',
        marginTop: 4,
    },
    verificationSection: {
        marginBottom: 24,
        padding: 16,
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    verificationSubtext: {
        fontSize: 14,
        color: '#6B7280',
        marginBottom: 16,
    },
    idPreviewContainer: {
        alignItems: 'flex-start',
    },
    idPreview: {
        width: Math.max(160, Math.min(280, Math.floor(300 * 0.6))),
        height: Math.max(100, Math.min(180, Math.floor(300 * 0.35))),
        borderRadius: 12,
        marginBottom: 8,
    },
    removeIdButton: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: '#FEF2F2',
        borderRadius: 8,
    },
    removeIdText: {
        fontSize: 14,
        color: '#DC2626',
        fontWeight: '500',
    },
    uploadIdButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        padding: 16,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#10B981',
        borderStyle: 'dashed',
    },
    uploadIdText: {
        fontSize: 16,
        color: '#10B981',
        fontWeight: '500',
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
    securitySection: {
        marginBottom: 24,
    },
    passwordRequirements: {
        backgroundColor: '#F0FDF4',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#BBF7D0',
    },
    requirementsTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#065F46',
        marginBottom: 8,
    },
    requirementText: {
        fontSize: 12,
        color: '#047857',
        marginBottom: 2,
    },
    termsContainer: {
        marginBottom: 24,
    },
    checkboxContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
    },
    checkbox: {
        width: 20,
        height: 20,
        borderRadius: 4,
        borderWidth: 2,
        borderColor: '#D1D5DB',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 2,
    },
    checkboxChecked: {
        backgroundColor: '#10B981',
        borderColor: '#10B981',
    },
    termsText: {
        flex: 1,
        fontSize: 14,
        color: '#6B7280',
        lineHeight: 20,
    },
    termsLink: {
        color: '#10B981',
        fontWeight: '600',
        textDecorationLine: 'underline',
    },
    createAccountButton: {
        backgroundColor: '#10B981',
        borderRadius: 12,
        paddingVertical: 16,
        paddingHorizontal: 24,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        marginBottom: 12,
    },
    createAccountButtonDisabled: {
        backgroundColor: '#9CA3AF',
        shadowOpacity: 0,
        elevation: 0,
    },
    buttonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingSpinner: {
        width: 20,
        height: 20,
        borderWidth: 2,
        borderColor: '#FFFFFF',
        borderTopColor: 'transparent',
        borderRadius: 10,
        marginRight: 8,
    },
    createAccountButtonText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    termsErrorText: {
        fontSize: 14,
        color: '#EF4444',
        textAlign: 'center',
        marginBottom: 16,
    },
    signInContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    signInText: {
        fontSize: 14,
        color: '#6B7280',
    },
    signInLink: {
        fontSize: 14,
        color: '#10B981',
        fontWeight: '600',
    },
    // Modal styles
    modalContainer: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#111827',
    },
    modalCloseButton: {
        padding: 8,
    },
    modalCloseText: {
        fontSize: 18,
        color: '#10B981',
        fontWeight: '600',
    },
    modalContent: {
        flex: 1,
        padding: 16,
    },
    modalTextContainer: {
        gap: 16,
    },
    modalDateText: {
        fontSize: 14,
        color: '#6B7280',
        marginBottom: 16,
    },
    modalBodyText: {
        fontSize: 16,
        color: '#374151',
        lineHeight: 24,
        marginBottom: 8,
    },
    modalSection: {
        gap: 16,
    },
    modalSubsection: {
        gap: 8,
    },
    modalSubtitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#111827',
        marginBottom: 8,
    },
    modalBoldText: {
        fontWeight: '600',
    },
    modalContactText: {
        fontSize: 16,
        color: '#10B981',
        lineHeight: 24,
    },
    modalFooter: {
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
    },
    modalButton: {
        backgroundColor: '#10B981',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
    },
    modalButtonText: {
        color: '#FFFFFF',
        textAlign: 'center',
        fontWeight: '600',
    },
});