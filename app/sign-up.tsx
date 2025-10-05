import { useRouter } from 'expo-router';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { ScrollView, View, Text as RNText, TouchableOpacity, Image, Alert } from 'react-native';
import {
    FormControl,
    FormControlError,
    FormControlErrorText,
    FormControlErrorIcon,
    FormControlLabel,
    FormControlLabelText,
} from "@/components/ui/form-control";
import { Input, InputField } from '@/components/ui/input';
import { AlertCircleIcon, Icon, ChevronLeftIcon, EyeIcon, EyeOffIcon, MailIcon, LockIcon, UserIcon, CheckIcon, PhoneIcon, MapPinIcon } from "@/components/ui/icon";
import React, { useState } from 'react';
import { useWindowDimensions } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ButtonCarousel, CountSelect } from '@/components/forms';
import { AMENITIES, PAYMENT_METHODS, PROPERTY_TYPES } from '@/types/property';
import { Button } from '@/components/ui/button';
import { signUpUser, signUpSchema } from '@/api/auth/sign-up';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast, Toast, ToastTitle, ToastDescription } from "@/components/ui/toast";
import { useAuth } from '@/context/AuthContext';
import { InteractiveButton } from '@/components/buttons';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable } from 'react-native';

export default function SignUpScreen() {
    const router = useRouter();
    const toast = useToast();
    const { refreshUser } = useAuth();
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [agreeToTerms, setAgreeToTerms] = useState(false);
    const [phoneInput, setPhoneInput] = useState('');
    const [duplicateAccountError, setDuplicateAccountError] = useState(false);
    const [selectedRole, setSelectedRole] = useState<'tenant' | 'owner'>('tenant');
    
    
    const { width } = useWindowDimensions();
    const isSmall = width < 380;
    const isTablet = width >= 768;
    const photoSize = Math.max(64, Math.min(112, Math.floor(width / 4)));

    // Owner-specific state
    const [govIdUri, setGovIdUri] = useState<string | null>(null);
    const [propertyType, setPropertyType] = useState<string>('');
    const [propertyAddress, setPropertyAddress] = useState<string>('');
    const [monthlyRate, setMonthlyRate] = useState<string>('');
    const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
    const [propertyPhotos, setPropertyPhotos] = useState<string[]>([]);
    const [paymentMethods, setPaymentMethods] = useState<string[]>([]);
    const [ownerErrors, setOwnerErrors] = useState<string[]>([]);

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


    const pickPropertyPhotos = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission required', 'Please allow photo library access to upload property photos.');
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsMultipleSelection: true,
            quality: 0.8,
        });
        if (!result.canceled && result.assets?.length) {
            const newUris = result.assets.map(a => a.uri).filter(Boolean) as string[];
            setPropertyPhotos(prev => [...prev, ...newUris]);
        }
    };

    const toggleAmenity = (amenity: string) => {
        setSelectedAmenities(prev => prev.includes(amenity) ? prev.filter(a => a !== amenity) : [...prev, amenity]);
    };

    const togglePaymentMethod = (method: string) => {
        setPaymentMethods(prev => prev.includes(method) ? prev.filter(m => m !== method) : [...prev, method]);
    };

    // React Hook Form with Zod validation
    const {
        register,
        handleSubmit,
        setValue,
        formState: { errors, isSubmitting, isValid },
        getValues,
    } = useForm({
        resolver: zodResolver(signUpSchema),
        defaultValues: {
            name: '',
            email: '', // Explicitly prevent auto-generation
            contactNumber: '',
            address: '',
            password: '',
            confirmPassword: ''
        }
    });


    const onSubmit = async (data: any) => {
        // Clear any previous duplicate account error
        setDuplicateAccountError(false);
        
        // Validate terms agreement first
        if (!agreeToTerms) {
            toast.show({
                placement: "top",
                render: ({ id }) => (
                    <Toast nativeID={id} action="error">
                        <ToastTitle>Terms Required</ToastTitle>
                        <ToastDescription>You must agree to the Terms and Conditions to create an account</ToastDescription>
                    </Toast>
                ),
            });
            return;
        }

        try {
            // Owner flow: Make government ID optional; warn but do not block submission
            if (selectedRole === 'owner') {
                setOwnerErrors([]);
                if (!govIdUri) {
                    toast.show({
                        placement: 'top',
                        render: ({ id }) => (
                            <Toast nativeID={id} action="warning">
                                <ToastTitle>Owner Verification</ToastTitle>
                                <ToastDescription>You can upload your government ID later to verify your account.</ToastDescription>
                            </Toast>
                        ),
                    });
                }

                // Persist owner extras for later flows (only if provided)
                if (govIdUri) {
                    const ownerVerification = { govIdUri };
                    await AsyncStorage.setItem('owner_verification', JSON.stringify(ownerVerification));
                }
                const ownerPayment = { paymentMethods };
                await AsyncStorage.setItem('owner_payment', JSON.stringify(ownerPayment));
                
                // Save owner property preferences for auto-filling listing forms
                const ownerPropertyPreferences = {
                    propertyType,
                    propertyAddress,
                    monthlyRate,
                    selectedAmenities,
                    propertyPhotos
                };
                await AsyncStorage.setItem('owner_property_preferences', JSON.stringify(ownerPropertyPreferences));
            }

            const result = await signUpUser({ ...data, role: selectedRole });
            
            if (result.success) {
                console.log('Account created successfully, storing ID verification...');
                
                
                await refreshUser(); // Refresh user context
                
                console.log('User context refreshed, showing success message...');
                // Show success toast
                toast.show({
                    placement: "top",
                    render: ({ id }) => (
                        <Toast nativeID={id} action="success">
                            <ToastTitle>Account Created!</ToastTitle>
                            <ToastDescription>Welcome to HanapBahay! 🎉</ToastDescription>
                        </Toast>
                    ),
                });

                // Route by role
                if (result.role === 'owner') {
                    router.replace('/(owner)/dashboard');
                } else {
                    router.replace('/(tabs)');
                }
            } else {
                // Handle sign-up failure (e.g., duplicate account)
                console.log('Account creation failed:', result.error);
                
                // Check if it's a duplicate account error
                if (result.error && result.error.includes('already exists')) {
                    setDuplicateAccountError(true);
                }
                
                toast.show({
                    placement: "top",
                    render: ({ id }) => (
                        <Toast nativeID={id} action="error">
                            <ToastTitle>Account Creation Failed</ToastTitle>
                            <ToastDescription>{result.error || "Failed to create account"}</ToastDescription>
                        </Toast>
                    ),
                });
            }
        } catch (error) {
            let errorMessage = "An unexpected error occurred";

            if (error instanceof Error) {
                errorMessage = error.message;
                console.error('Sign-up error details:', error);
            }

            // Show error toast
            toast.show({
                placement: "top",
                render: ({ id }) => (
                    <Toast nativeID={id} action="error">
                        <ToastTitle>Sign-up failed</ToastTitle>
                        <ToastDescription>{errorMessage}</ToastDescription>
                    </Toast>
                ),
            });
        }
    };

    const handleTermsPress = () => {
        // TODO: Navigate to terms and conditions
        alert("Terms and Conditions will be implemented soon!");
    };

    const handlePrivacyPress = () => {
        // TODO: Navigate to privacy policy
        alert("Privacy Policy will be implemented soon!");
    };

    return (
        <VStack className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
            {/* Header with Modern Gradient Background */}
            <LinearGradient
                colors={['#1E40AF', '#3B82F6', '#60A5FA']}
                className="px-6 pt-16 pb-12"
            >
                <VStack className="items-center">
                    {/* Back Button */}
                    <HStack className="w-full justify-start mb-8">
                        <Button 
                            className='p-3 bg-white/20 rounded-full' 
                            variant='link' 
                            size='lg' 
                            onPress={() => router.navigate('/')}
                        >
                            <Icon as={ChevronLeftIcon} size='xl' className="text-white" />
                        </Button>
                    </HStack>

                    {/* Brand Section with House Search Theme */}
                    <VStack className="items-center mb-8">
                        <VStack className="bg-white/20 backdrop-blur-sm rounded-2xl p-6 mb-4">
                            <Text size="4xl" className="font-bold text-white text-center mb-2">
                                HanapBahay
                            </Text>
                        </VStack>
                        <Text size="3xl" className="font-bold text-white text-center mb-2">
                            Find Your Dream Home
                        </Text>
                        <Text size="lg" className="text-white/90 text-center max-w-sm">
                            Create your account and start your journey to find the perfect home
                        </Text>
                    </VStack>
                </VStack>
            </LinearGradient>

            {/* Scrollable Main Content with Modern Card Design */}
            <ScrollView 
                className="flex-1 px-6 -mt-8"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 20 }}
            >
                <VStack className="bg-white rounded-3xl shadow-2xl p-8 space-y-6">
                    {/* Form Header */}
                    <VStack className="items-center mb-8">
                        <Text size="2xl" className="font-bold text-gray-800 text-center mb-2">
                            Create Your Account
                        </Text>
                        <Text size="sm" className="text-gray-600 text-center">
                            Tell us about yourself to get started
                        </Text>
                    </VStack>

                    {/* Role Selection */}
                    <VStack className="space-y-3 mb-2">
                        <Text size="md" className="font-semibold text-gray-800">I am a</Text>
                        <HStack className="space-x-3">
                            <Pressable
                                onPress={() => setSelectedRole('tenant')}
                                className={`flex-1 p-4 rounded-2xl border-2 ${selectedRole === 'tenant' ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-white'}`}
                                accessibilityRole="button"
                                accessibilityLabel="Select Tenant"
                            >
                                <Text size="md" className={`${selectedRole === 'tenant' ? 'text-green-700 font-semibold' : 'text-gray-700'}`}>Tenant</Text>
                                <Text size="xs" className={`mt-1 ${selectedRole === 'tenant' ? 'text-green-600' : 'text-gray-500'}`}>Looking to rent a place</Text>
                            </Pressable>
                            <Pressable
                                onPress={() => setSelectedRole('owner')}
                                className={`flex-1 p-4 rounded-2xl border-2 ${selectedRole === 'owner' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'}`}
                                accessibilityRole="button"
                                accessibilityLabel="Select Property Owner"
                            >
                                <Text size="md" className={`${selectedRole === 'owner' ? 'text-blue-700 font-semibold' : 'text-gray-700'}`}>Property Owner</Text>
                                <Text size="xs" className={`mt-1 ${selectedRole === 'owner' ? 'text-blue-600' : 'text-gray-500'}`}>List and manage rentals</Text>
                            </Pressable>
                        </HStack>
                    </VStack>

                    {/* Personal Information Section */}
                    <VStack className="space-y-6">
                        {selectedRole === 'owner' ? (
                            <>
                                {/* 1. Personal Information (Owner) */}
                                <VStack className="space-y-6">
                                    <FormControl isInvalid={!!errors.name} className='w-full'>
                                        <FormControlLabel>
                                            <HStack className="items-center space-x-2">
                                                <Icon as={UserIcon} size="sm" className="text-blue-600" />
                                                <FormControlLabelText size='lg' className="text-gray-700 font-semibold">Full Name / Business Name</FormControlLabelText>
                                            </HStack>
                                        </FormControlLabel>
                                        <Input className="my-3" size="2xl" variant="rounded" style={{ 
                                            borderWidth: 2, 
                                            borderColor: errors.name ? '#EF4444' : '#E5E7EB',
                                            backgroundColor: '#FAFAFA'
                                        }}>
                                            <InputField
                                                id="name"
                                                type="text"
                                                placeholder="Enter full name or business name"
                                                {...register("name")}
                                                onChangeText={(text) => setValue("name", text)}
                                                className="text-gray-800 text-base"
                                            />
                                        </Input>
                                        {errors.name && (
                                            <FormControlError>
                                                <FormControlErrorIcon as={AlertCircleIcon} />
                                                <FormControlErrorText>{errors.name?.message as string}</FormControlErrorText>
                                            </FormControlError>
                                        )}
                                    </FormControl>

                                    {/* Contact Number */}
                                    <FormControl isInvalid={!!errors.contactNumber} className='w-full'>
                                        <FormControlLabel>
                                            <HStack className="items-center space-x-2">
                                                <Icon as={PhoneIcon} size="sm" className="text-blue-600" />
                                                <FormControlLabelText size='lg' className="text-gray-700 font-semibold">Mobile Number</FormControlLabelText>
                                            </HStack>
                                        </FormControlLabel>
                                        <HStack className="items-center space-x-2">
                                            <Text className="text-gray-600 font-medium text-base px-3 py-3 bg-gray-100 rounded-lg border-2 border-gray-300">
                                                +63
                                            </Text>
                                            <Input className="my-3 flex-1" size="2xl" variant="rounded" style={{ 
                                                borderWidth: 2, 
                                                borderColor: errors.contactNumber ? '#EF4444' : '#E5E7EB',
                                                backgroundColor: '#FAFAFA'
                                            }}>
                                                <InputField
                                                    id="phone"
                                                    type="text"
                                                    placeholder="912 345 6789"
                                                    value={phoneInput}
                                                    onChangeText={(text) => {
                                                        const digitsOnly = text.replace(/\D/g, '');
                                                        if (digitsOnly.length <= 10) {
                                                            setPhoneInput(digitsOnly);
                                                            setValue("contactNumber", `+63${digitsOnly}`);
                                                        }
                                                    }}
                                                    maxLength={10}
                                                    keyboardType="phone-pad"
                                                    className="text-gray-800 text-base"
                                                />
                                            </Input>
                                        </HStack>
                                        {errors.contactNumber && (
                                            <FormControlError>
                                                <FormControlErrorIcon as={AlertCircleIcon} />
                                                <FormControlErrorText>{errors.contactNumber?.message as string}</FormControlErrorText>
                                            </FormControlError>
                                        )}
                                    </FormControl>

                                    {/* Email Address */}
                                    <FormControl isInvalid={!!errors.email || duplicateAccountError} className='w-full'>
                                        <FormControlLabel>
                                            <HStack className="items-center space-x-2">
                                                <Icon as={MailIcon} size="sm" className="text-blue-600" />
                                                <FormControlLabelText size='lg' className="text-gray-700 font-semibold">Email Address</FormControlLabelText>
                                            </HStack>
                                        </FormControlLabel>
                                        <Input className="my-3" size="2xl" variant="rounded" style={{ 
                                            borderWidth: 2, 
                                            borderColor: (errors.email || duplicateAccountError) ? '#EF4444' : '#E5E7EB',
                                            backgroundColor: '#FAFAFA'
                                        }}>
                                            <InputField
                                                id="email"
                                                name="email"
                                                type="text"
                                                placeholder="Enter your email address"
                                                {...register("email")}
                                                onChangeText={(text) => {
                                                    setValue("email", text);
                                                    if (duplicateAccountError) setDuplicateAccountError(false);
                                                }}
                                                className="text-gray-800 text-base"
                                            />
                                        </Input>
                                        {errors.email && (
                                            <FormControlError>
                                                <FormControlErrorIcon as={AlertCircleIcon} />
                                                <FormControlErrorText>{errors.email?.message as string}</FormControlErrorText>
                                            </FormControlError>
                                        )}
                                        {duplicateAccountError && !errors.email && (
                                            <FormControlError>
                                                <FormControlErrorIcon as={AlertCircleIcon} />
                                                <FormControlErrorText>An account with this email already exists. Please use a different email or try signing in instead.</FormControlErrorText>
                                            </FormControlError>
                                        )}
                                    </FormControl>
                                </VStack>

                                {/* 2. Owner Verification */}
                                <VStack className="space-y-3">
                                    <Text size="xl" className="font-bold text-gray-800">Owner Verification</Text>
                                    <Text size="sm" className="text-gray-600">Government ID (Driver’s License, Passport, National ID)</Text>
                                    {govIdUri ? (
                                        <View className="items-start">
                                            <Image source={{ uri: govIdUri }} style={{ width: Math.max(160, Math.min(280, Math.floor(width * 0.6))), height: Math.max(100, Math.min(180, Math.floor(width * 0.35))), borderRadius: 12 }} />
                                            <TouchableOpacity onPress={() => setGovIdUri(null)} className="mt-2 px-3 py-2 bg-red-100 rounded-lg">
                                                <RNText className="text-red-600">Remove ID</RNText>
                                            </TouchableOpacity>
                                        </View>
                                    ) : (
                                        <InteractiveButton
                                            text="Upload Government ID"
                                            onPress={pickGovId}
                                            variant="secondary"
                                            fullWidth={false}
                                        />
                                    )}
                                </VStack>

                                {/* Error summary for owner flow */}
                                {ownerErrors.length > 0 && (
                                    <View className="bg-red-50 border border-red-200 rounded-xl p-3 mt-2">
                                        <RNText className="text-red-700" style={{ fontWeight: '600' }}>Please complete the following:</RNText>
                                        {ownerErrors.map((e, i) => (
                                            <RNText key={i} className="text-red-700">• {e}</RNText>
                                        ))}
                                    </View>
                                )}

                                {/* 3. Property Setup (First Listing Basics) */}
                                <VStack className="space-y-4 mt-6">
                                    <Text size="xl" className="font-bold text-gray-800">Property Setup</Text>
                                    {/* Property Type */}
                                    <VStack>
                                        <Text size="sm" className="text-gray-700 font-semibold mb-2">Property Type</Text>
                                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                                            {PROPERTY_TYPES.map((propertyTypeOption) => (
                                                <TouchableOpacity
                                                    key={propertyTypeOption}
                                                    onPress={() => setPropertyType(propertyTypeOption)}
                                                    style={{
                                                        paddingHorizontal: 16,
                                                        paddingVertical: 12,
                                                        borderRadius: 20,
                                                        backgroundColor: propertyType === propertyTypeOption ? '#059669' : '#F3F4F6',
                                                        borderWidth: propertyType === propertyTypeOption ? 2 : 1,
                                                        borderColor: propertyType === propertyTypeOption ? '#047857' : '#D1D5DB',
                                                        shadowColor: propertyType === propertyTypeOption ? 'rgba(5, 150, 105, 0.4)' : 'transparent',
                                                        shadowOffset: propertyType === propertyTypeOption ? { width: 0, height: 4 } : { width: 0, height: 0 },
                                                        shadowOpacity: propertyType === propertyTypeOption ? 1 : 0,
                                                        shadowRadius: propertyType === propertyTypeOption ? 8 : 0,
                                                        elevation: propertyType === propertyTypeOption ? 6 : 0,
                                                        transform: propertyType === propertyTypeOption ? [{ scale: 1.05 }] : [{ scale: 1 }],
                                                    }}
                                                >
                                                    <Text style={{
                                                        fontSize: 14,
                                                        fontWeight: propertyType === propertyTypeOption ? '700' : '500',
                                                        color: propertyType === propertyTypeOption ? '#FFFFFF' : '#6B7280',
                                                    }}>
                                                        {propertyTypeOption}
                                                    </Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    </VStack>

                                    {/* Address */}
                                    <FormControl className='w-full'>
                                        <FormControlLabel>
                                            <HStack className="items-center space-x-2">
                                                <Icon as={MapPinIcon} size="sm" className="text-blue-600" />
                                                <FormControlLabelText size='lg' className="text-gray-700 font-semibold">Property Address / Location</FormControlLabelText>
                                            </HStack>
                                        </FormControlLabel>
                                        <Input className="my-3" size="2xl" variant="rounded" style={{ borderWidth: 2, borderColor: '#E5E7EB', backgroundColor: '#FAFAFA' }}>
                                            <InputField
                                                id="property-address"
                                                name="property-address"
                                                type="text"
                                                placeholder="Enter property location"
                                                value={propertyAddress}
                                                onChangeText={setPropertyAddress}
                                                className="text-gray-800 text-base"
                                            />
                                        </Input>
                                    </FormControl>

                                    {/* Rates */}
                                    {isSmall ? (
                                        <VStack className="space-y-3">
                                            <Input className="w-full" size="2xl" variant="rounded" style={{ borderWidth: 2, borderColor: '#E5E7EB', backgroundColor: '#FAFAFA' }}>
                                                <InputField
                                                    type="text"
                                                    placeholder="Monthly Rate (₱)"
                                                    value={monthlyRate}
                                                    onChangeText={setMonthlyRate}
                                                    keyboardType="numeric"
                                                    className="text-gray-800 text-base"
                                                />
                                            </Input>
                                        </VStack>
                                    ) : (
                                        <HStack className="space-x-3">
                                            <Input className="flex-1" size="2xl" variant="rounded" style={{ borderWidth: 2, borderColor: '#E5E7EB', backgroundColor: '#FAFAFA' }}>
                                                <InputField
                                                    type="text"
                                                    placeholder="Monthly Rate (₱)"
                                                    value={monthlyRate}
                                                    onChangeText={setMonthlyRate}
                                                    keyboardType="numeric"
                                                    className="text-gray-800 text-base"
                                                />
                                            </Input>
                                        </HStack>
                                    )}


                                    {/* Amenities */}
                                    <VStack>
                                        <Text size="sm" className="text-gray-700 font-semibold mb-2">Amenities</Text>
                                        <HStack className="flex-row flex-wrap">
                                            {AMENITIES.map((a) => (
                                                <TouchableOpacity
                                                    key={a}
                                                    onPress={() => toggleAmenity(a)}
                                                    className={`mr-2 mb-2 px-3 py-2 rounded-full border ${selectedAmenities.includes(a) ? 'bg-green-100 border-green-500' : 'bg-gray-100 border-gray-300'}`}
                                                >
                                                    <RNText className={`${selectedAmenities.includes(a) ? 'text-green-700 font-medium' : 'text-gray-600'} text-sm`}>{a}</RNText>
                                                </TouchableOpacity>
                                            ))}
                                        </HStack>
                                    </VStack>

                                    {/* Photos */}
                                    <VStack>
                                        <Text size="sm" className="text-gray-700 font-semibold mb-2">Upload Photos (at least 1)</Text>
                                        <HStack className="space-x-2 mb-3">
                                            <InteractiveButton text="Choose Photos" onPress={pickPropertyPhotos} variant="secondary" />
                                        </HStack>
                                        {propertyPhotos.length > 0 && (
                                            <HStack className="flex-row flex-wrap">
                                                {propertyPhotos.map((uri, idx) => (
                                                    <Image key={idx} source={{ uri }} style={{ width: photoSize, height: photoSize, marginRight: 8, marginBottom: 8, borderRadius: 8 }} />
                                                ))}
                                            </HStack>
                                        )}
                                    </VStack>
                                </VStack>

                                {/* 4. Payment Setup */}
                                <VStack className="space-y-3 mt-6">
                                    <Text size="xl" className="font-bold text-gray-800">Payment Setup</Text>
                                    {PAYMENT_METHODS.map((method) => (
                                        <TouchableOpacity
                                            key={method}
                                            onPress={() => togglePaymentMethod(method)}
                                            className={`flex-row items-center justify-between p-3 rounded-lg border ${paymentMethods.includes(method) ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}
                                        >
                                            <RNText className={`${paymentMethods.includes(method) ? 'text-green-700 font-medium' : 'text-gray-700'}`}>{method}</RNText>
                                        </TouchableOpacity>
                                    ))}
                                </VStack>
                            </>
                        ) : (
                            <>
                        {/* Name Field */}
                        <FormControl isInvalid={!!errors.name} className='w-full'>
                            <FormControlLabel>
                                <HStack className="items-center space-x-2">
                                    <Icon as={UserIcon} size="sm" className="text-blue-600" />
                                    <FormControlLabelText size='lg' className="text-gray-700 font-semibold">Full Name</FormControlLabelText>
                                </HStack>
                            </FormControlLabel>
                            <Input className="my-3" size="2xl" variant="rounded" style={{ 
                                borderWidth: 2, 
                                borderColor: errors.name ? '#EF4444' : '#E5E7EB',
                                backgroundColor: '#FAFAFA'
                            }}>
                                <InputField
                                    type="text"
                                    placeholder="Enter your full name"
                                    {...register("name")}
                                    onChangeText={(text) => setValue("name", text)}
                                    className="text-gray-800 text-base"
                                />
                            </Input>
                            {errors.name && (
                                <FormControlError>
                                    <FormControlErrorIcon as={AlertCircleIcon} />
                                    <FormControlErrorText>{errors.name?.message as string}</FormControlErrorText>
                                </FormControlError>
                            )}
                        </FormControl>

                        {/* Email Field */}
                        <FormControl isInvalid={!!errors.email || duplicateAccountError} className='w-full'>
                            <FormControlLabel>
                                <HStack className="items-center space-x-2">
                                    <Icon as={MailIcon} size="sm" className="text-blue-600" />
                                    <FormControlLabelText size='lg' className="text-gray-700 font-semibold">Email Address</FormControlLabelText>
                                </HStack>
                            </FormControlLabel>
                            <Input className="my-3" size="2xl" variant="rounded" style={{ 
                                borderWidth: 2, 
                                borderColor: (errors.email || duplicateAccountError) ? '#EF4444' : '#E5E7EB',
                                backgroundColor: '#FAFAFA'
                            }}>
                                <InputField
                                    type="text"
                                    placeholder="Enter your email address"
                                    {...register("email")}
                                    onChangeText={(text) => {
                                        setValue("email", text);
                                        // Clear duplicate account error when user types
                                        if (duplicateAccountError) {
                                            setDuplicateAccountError(false);
                                        }
                                    }}
                                    className="text-gray-800 text-base"
                                />
                            </Input>
                            {errors.email && (
                                <FormControlError>
                                    <FormControlErrorIcon as={AlertCircleIcon} />
                                    <FormControlErrorText>{errors.email?.message as string}</FormControlErrorText>
                                </FormControlError>
                            )}
                            {duplicateAccountError && !errors.email && (
                                <FormControlError>
                                    <FormControlErrorIcon as={AlertCircleIcon} />
                                    <FormControlErrorText>An account with this email already exists. Please use a different email or try signing in instead.</FormControlErrorText>
                                </FormControlError>
                            )}
                        </FormControl>

                        {/* Contact Number Field */}
                        <FormControl isInvalid={!!errors.contactNumber} className='w-full'>
                            <FormControlLabel>
                                <HStack className="items-center space-x-2">
                                    <Icon as={PhoneIcon} size="sm" className="text-blue-600" />
                                    <FormControlLabelText size='lg' className="text-gray-700 font-semibold">Contact Number</FormControlLabelText>
                                </HStack>
                            </FormControlLabel>
                            <HStack className="items-center space-x-2">
                                <Text className="text-gray-600 font-medium text-base px-3 py-3 bg-gray-100 rounded-lg border-2 border-gray-300">
                                    +63
                                </Text>
                                <Input className="my-3 flex-1" size="2xl" variant="rounded" style={{ 
                                    borderWidth: 2, 
                                    borderColor: errors.contactNumber ? '#EF4444' : '#E5E7EB',
                                    backgroundColor: '#FAFAFA'
                                }}>
                                    <InputField
                                        type="text"
                                        placeholder="912 345 6789"
                                        value={phoneInput}
                                        onChangeText={(text) => {
                                            // Only allow digits and limit to 10
                                            const digitsOnly = text.replace(/\D/g, '');
                                            if (digitsOnly.length <= 10) {
                                                setPhoneInput(digitsOnly);
                                                setValue("contactNumber", `+63${digitsOnly}`);
                                            }
                                        }}
                                        maxLength={10}
                                        keyboardType="phone-pad"
                                        className="text-gray-800 text-base"
                                    />
                                </Input>
                            </HStack>
                            {errors.contactNumber && (
                                <FormControlError>
                                    <FormControlErrorIcon as={AlertCircleIcon} />
                                    <FormControlErrorText>{errors.contactNumber?.message as string}</FormControlErrorText>
                                </FormControlError>
                            )}
                        </FormControl>

                        {/* Address Field */}
                        <FormControl isInvalid={!!errors.address} className='w-full'>
                            <FormControlLabel>
                                <HStack className="items-center space-x-2">
                                    <Icon as={MailIcon} size="sm" className="text-blue-600" />
                                    <FormControlLabelText size='lg' className="text-gray-700 font-semibold">Current Address</FormControlLabelText>
                                </HStack>
                            </FormControlLabel>
                            <Input className="my-3" size="2xl" variant="rounded" style={{ 
                                borderWidth: 2, 
                                borderColor: errors.address ? '#EF4444' : '#E5E7EB',
                                backgroundColor: '#FAFAFA'
                            }}>
                                <InputField
                                    type="text"
                                    placeholder="Address (optional)"
                                    {...register('address')}
                                    onChangeText={(text) => setValue('address', text)}
                                    className="text-gray-800 text-base"
                                />
                            </Input>
                            <Text className="text-xs text-gray-500 mt-1">
                                💡 Optional: Enter your city, province, or any location you prefer
                            </Text>
                            {errors.address && (
                                <FormControlError>
                                    <FormControlErrorIcon as={AlertCircleIcon} />
                                    <FormControlErrorText>{errors.address?.message as string}</FormControlErrorText>
                                </FormControlError>
                            )}
                        </FormControl>

                            </>
                        )}

                        {/* Security Section Header */}
                        <VStack className="mt-8 mb-4">
                            <Text size="xl" className="font-bold text-gray-800 text-center">
                                Security Settings
                            </Text>
                            <Text size="sm" className="text-gray-600 text-center">
                                Create a secure password for your account
                            </Text>
                        </VStack>

                        {/* Password Field */}
                        <FormControl isInvalid={!!errors.password} className='w-full'>
                            <FormControlLabel>
                                <HStack className="items-center space-x-2">
                                    <Icon as={LockIcon} size="sm" className="text-blue-600" />
                                    <FormControlLabelText size='lg' className="text-gray-700 font-semibold">Password</FormControlLabelText>
                                </HStack>
                            </FormControlLabel>
                            <Input className="my-3" size="2xl" variant="rounded" style={{ 
                                borderWidth: 2, 
                                borderColor: errors.password ? '#EF4444' : '#E5E7EB',
                                backgroundColor: '#FAFAFA'
                            }}>
                                <InputField
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Create a strong password"
                                    {...register("password")}
                                    onChangeText={(text) => setValue("password", text)}
                                    className="text-gray-800 text-base"
                                />
                                <Button
                                    variant="link"
                                    size="sm"
                                    onPress={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2"
                                >
                                    <Icon 
                                        as={showPassword ? EyeOffIcon : EyeIcon} 
                                        size="md" 
                                        className="text-gray-500"
                                    />
                                </Button>
                            </Input>
                            {errors.password && (
                                <FormControlError>
                                    <FormControlErrorIcon as={AlertCircleIcon} />
                                    <FormControlErrorText>{errors.password?.message as string}</FormControlErrorText>
                                </FormControlError>
                            )}
                        </FormControl>

                        {/* Confirm Password Field */}
                        <FormControl isInvalid={!!errors.confirmPassword} className='w-full'>
                            <FormControlLabel>
                                <HStack className="items-center space-x-2">
                                    <Icon as={LockIcon} size="sm" className="text-blue-600" />
                                    <FormControlLabelText size='lg' className="text-gray-700 font-semibold">Confirm Password</FormControlLabelText>
                                </HStack>
                            </FormControlLabel>
                            <Input className="my-3" size="2xl" variant="rounded" style={{ 
                                borderWidth: 2, 
                                borderColor: errors.confirmPassword ? '#EF4444' : '#E5E7EB',
                                backgroundColor: '#FAFAFA'
                            }}>
                                <InputField
                                    type={showConfirmPassword ? "text" : "password"}
                                    placeholder="Confirm your password"
                                    {...register("confirmPassword")}
                                    onChangeText={(text) => setValue("confirmPassword", text)}
                                    className="text-gray-800 text-base"
                                />
                                <Button
                                    variant="link"
                                    size="sm"
                                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2"
                                >
                                    <Icon 
                                        as={showConfirmPassword ? EyeOffIcon : EyeIcon} 
                                        size="md" 
                                        className="text-gray-500"
                                    />
                                </Button>
                            </Input>
                            {errors.confirmPassword && (
                                <FormControlError>
                                    <FormControlErrorIcon as={AlertCircleIcon} />
                                    <FormControlErrorText>{errors.confirmPassword?.message as string}</FormControlErrorText>
                                </FormControlError>
                            )}
                        </FormControl>

                        {/* Password Requirements */}
                        <VStack className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-200">
                            <Text size="sm" className="text-blue-800 font-semibold mb-2">
                                Password Requirements:
                            </Text>
                            <VStack className="space-y-1">
                                <Text size="xs" className="text-blue-700">
                                    • At least 6 characters long
                                </Text>
                                <Text size="xs" className="text-blue-700">
                                    • Use a combination of letters and numbers
                                </Text>
                                <Text size="xs" className="text-blue-700">
                                    • Avoid common passwords for better security
                                </Text>
                            </VStack>
                        </VStack>

                        {/* Terms and Conditions - Simple Section */}
                        <HStack className="w-full items-center space-x-3 mt-6">
                            <Pressable
                                onPress={() => setAgreeToTerms(!agreeToTerms)}
                                className={`w-5 h-5 border-2 rounded items-center justify-center ${
                                    agreeToTerms ? 'border-blue-500 bg-blue-500' : 'border-red-300 bg-transparent'
                                }`}
                            >
                                {agreeToTerms && (
                                    <Icon as={CheckIcon} size="xs" className="text-white" />
                                )}
                            </Pressable>
                            <Text size="sm" className="text-gray-600 flex-1">
                                I agree to the{' '}
                                <Button
                                    variant="link"
                                    size="sm"
                                    onPress={handleTermsPress}
                                    className="p-0"
                                >
                                    <Text size="sm" className="text-blue-600 font-semibold">
                                        Terms and Conditions
                                    </Text>
                                </Button>
                                {' '}and{' '}
                                <Button
                                    variant="link"
                                    size="sm"
                                    onPress={handlePrivacyPress}
                                    className="p-0"
                                >
                                    <Text size="sm" className="text-blue-600 font-semibold">
                                        Privacy Policy
                                    </Text>
                                </Button>
                            </Text>
                        </HStack>

                        {/* Create Account Button */}
                        <VStack className='mt-8 w-full items-center'>
                            <TouchableOpacity
                                onPress={async () => {
                                    console.log('🔥 Create Account button pressed!');
                                    console.log('🔥 agreeToTerms:', agreeToTerms);
                                    console.log('🔥 isSubmitting:', isSubmitting);
                                    
                                    if (!agreeToTerms) {
                                        toast.show({
                                            id: 'terms-required',
                                            placement: "top",
                                            render: ({ id }) => (
                                                <Toast nativeID={id} action="error">
                                                    <ToastTitle>Terms Required</ToastTitle>
                                                    <ToastDescription>You must agree to the Terms and Conditions to create an account</ToastDescription>
                                                </Toast>
                                            ),
                                        });
                                        return;
                                    }
                                    
                                    if (isSubmitting) {
                                        console.log('🔥 Already submitting, ignoring click');
                                        return;
                                    }
                                    
                                    console.log('🔥 Getting form values...');
                                    const formData = getValues();
                                    console.log('🔥 Form data:', formData);
                                    
                                    // Manual validation
                                    if (!formData.name || formData.name.length < 2) {
                                        toast.show({
                                            id: 'name-error',
                                            placement: "top",
                                            render: ({ id }) => (
                                                <Toast nativeID={id} action="error">
                                                    <ToastTitle>Name Required</ToastTitle>
                                                    <ToastDescription>Name must be at least 2 characters</ToastDescription>
                                                </Toast>
                                            ),
                                        });
                                        return;
                                    }
                                    
                                    if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
                                        toast.show({
                                            id: 'email-error',
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
                                    
                                    if (!formData.contactNumber || !/^\+63[0-9]{10}$/.test(formData.contactNumber)) {
                                        toast.show({
                                            id: 'phone-error',
                                            placement: "top",
                                            render: ({ id }) => (
                                                <Toast nativeID={id} action="error">
                                                    <ToastTitle>Invalid Phone</ToastTitle>
                                                    <ToastDescription>Phone number must be +63 followed by 10 digits</ToastDescription>
                                                </Toast>
                                            ),
                                        });
                                        return;
                                    }
                                    
                                    // Address validation completely removed - optional field
                                    // Users can enter anything they want or leave it empty
                                    
                                    
                                    if (!formData.password || formData.password.length < 6) {
                                        toast.show({
                                            id: 'password-error',
                                            placement: "top",
                                            render: ({ id }) => (
                                                <Toast nativeID={id} action="error">
                                                    <ToastTitle>Password Required</ToastTitle>
                                                    <ToastDescription>Password must be at least 6 characters</ToastDescription>
                                                </Toast>
                                            ),
                                        });
                                        return;
                                    }
                                    
                                    if (formData.password !== formData.confirmPassword) {
                                        toast.show({
                                            id: 'password-match-error',
                                            placement: "top",
                                            render: ({ id }) => (
                                                <Toast nativeID={id} action="error">
                                                    <ToastTitle>Passwords Don't Match</ToastTitle>
                                                    <ToastDescription>Password and confirm password must match</ToastDescription>
                                                </Toast>
                                            ),
                                        });
                                        return;
                                    }
                                    
                                    console.log('🔥 All validations passed, calling onSubmit...');
                                    // Submit form data
                                    await onSubmit(formData);
                                }}
                                disabled={isSubmitting}
                                className={`w-80 max-w-sm mx-auto py-5 px-16 rounded-2xl shadow-lg border-2 ${
                                    agreeToTerms && !isSubmitting 
                                        ? 'bg-green-600 border-green-600 active:opacity-90' 
                                        : 'bg-gray-400 border-gray-400 opacity-60'
                                }`}
                                style={{
                                    opacity: agreeToTerms && !isSubmitting ? 1 : 0.6
                                }}
                            >
                                <View className="flex-row items-center justify-center">
                                    {isSubmitting && (
                                        <View className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                                    )}
                                    <Text className="font-semibold text-center tracking-wide text-lg text-white">
                                        {isSubmitting ? 'Creating Account...' : 'Create My Account'}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                            
                            {!agreeToTerms && (
                                <Text className="text-red-500 mt-2 text-center text-sm">
                                    You must agree to the Terms and Conditions to create an account
                                </Text>
                            )}
                        </VStack>

                        {/* Sign In Link */}
                        <VStack className="mt-6 w-full items-center">
                            <Text size="sm" className="text-gray-600">
                                Already have an account?{' '}
                            </Text>
                            <Button 
                                variant="link" 
                                size="sm"
                                onPress={() => router.push('/login')}
                            >
                                <Text size="sm" className="text-blue-600 font-semibold">
                                    Sign In Here
                                </Text>
                            </Button>
                        </VStack>
                    </VStack>
                </VStack>
            </ScrollView>
        </VStack>
    );
}