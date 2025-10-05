import { useRouter } from 'expo-router';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { ScrollView } from 'react-native';
import {
    FormControl,
    FormControlError,
    FormControlErrorText,
    FormControlErrorIcon,
    FormControlLabel,
    FormControlLabelText,
} from "@/components/ui/form-control"
import { Input, InputField } from '@/components/ui/input';
import { AlertCircleIcon, Icon, ChevronLeftIcon, EyeIcon, EyeOffIcon, MailIcon, LockIcon, CheckIcon } from "@/components/ui/icon"
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { loginUser, loginSchema } from '@/api/auth/login';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from '@/context/AuthContext';
import { InteractiveButton } from '@/components/buttons';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useToast, Toast, ToastTitle, ToastDescription } from "@/components/ui/toast";

export default function LoginScreen() {
    const router = useRouter();
    const { refreshUser } = useAuth();
    const toast = useToast();
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [savedEmail, setSavedEmail] = useState('');

    // Use React Hook Form with Zod validation
    const {
        register,
        handleSubmit,
        setValue,
        formState: { errors, isSubmitting },
    } = useForm({
        resolver: zodResolver(loginSchema),
    });

    // Load saved email and remember me preference
    useEffect(() => {
        const loadSavedData = async () => {
            try {
                const savedEmail = await AsyncStorage.getItem('remembered_email');
                const rememberMePref = await AsyncStorage.getItem('remember_me');
                
                if (savedEmail) {
                    setSavedEmail(savedEmail);
                    setValue("email", savedEmail);
                }
                
                if (rememberMePref === 'true') {
                    setRememberMe(true);
                }
            } catch (error) {
                console.error('Error loading saved data:', error);
            }
        };
        
        loadSavedData();
    }, [setValue]);

    const onSubmit = async (data: any) => {
        try {
            console.log('Starting sign-in process...');
            const result = await loginUser(data);
            
            if (result.success) {
                console.log('Sign-in successful, refreshing user context...');
                
                // Handle remember me functionality
                if (rememberMe) {
                    await AsyncStorage.setItem('remembered_email', data.email);
                    await AsyncStorage.setItem('remember_me', 'true');
                } else {
                    await AsyncStorage.removeItem('remembered_email');
                    await AsyncStorage.removeItem('remember_me');
                }
                
                await refreshUser(); // Refresh user context
                
                console.log('User context refreshed, showing welcome message...');
                // Show welcome back toast
                toast.show({
                    placement: "top",
                    render: ({ id }) => (
                        <Toast nativeID={id} action="success">
                            <ToastTitle>Welcome Back!</ToastTitle>
                            <ToastDescription>Great to see you again! 🎉</ToastDescription>
                        </Toast>
                    ),
                });

                console.log('Redirecting based on role...');
                const roles = result.roles || result.user?.roles || [];
                if (Array.isArray(roles) && roles.includes('owner')) {
                    router.replace('/(owner)/dashboard');
                } else {
                    router.replace('/(tabs)');
                }
            } else {
                console.log('Sign-in failed:', result.error);
                alert(result.error || "Invalid email or password");
            }
        } catch (error) {
            console.error('Login error:', error);
            alert("Invalid email or password");
        }
    };


    const handleForgotPassword = () => {
        router.push('/forgot-password');
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
                            Welcome Back!
                        </Text>
                        <Text size="lg" className="text-white/90 text-center max-w-sm">
                            Sign in to continue your journey to find the perfect home
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
                            Sign In to Your Account
                        </Text>
                        <Text size="sm" className="text-gray-600 text-center">
                            Tenants and Property Owners can sign in here
                        </Text>
                    </VStack>
                    {/* Email Field */}
                    <FormControl isInvalid={!!errors.email} className='w-full'>
                        <FormControlLabel>
                            <HStack className="items-center space-x-2">
                                <Icon as={MailIcon} size="sm" className="text-blue-600" />
                                <FormControlLabelText size='lg' className="text-gray-700 font-semibold">Email Address</FormControlLabelText>
                            </HStack>
                        </FormControlLabel>
                        <Input className="my-3" size="2xl" variant="rounded" style={{ 
                            borderWidth: 2, 
                            borderColor: errors.email ? '#EF4444' : '#E5E7EB',
                            backgroundColor: '#FAFAFA'
                        }}>
                            <InputField
                                id="email"
                                name="email"
                                type="text"
                                placeholder="Enter your email address"
                                {...register("email")}
                                onChangeText={(text) => setValue("email", text)}
                                className="text-gray-800 text-base"
                            />
                        </Input>
                        {errors.email && (
                            <FormControlError>
                                <FormControlErrorIcon as={AlertCircleIcon} />
                                <FormControlErrorText>{errors.email.message}</FormControlErrorText>
                            </FormControlError>
                        )}
                    </FormControl>

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
                                id="password"
                                name="password"
                                type={showPassword ? "text" : "password"}
                                placeholder="Enter your password"
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
                                <FormControlErrorText>{errors.password.message}</FormControlErrorText>
                            </FormControlError>
                        )}
                    </FormControl>

                    {/* Remember Me & Forgot Password */}
                    <HStack className="w-full justify-between items-center mt-6">
                        <HStack className="items-center space-x-3">
                            <Pressable
                                onPress={() => setRememberMe(!rememberMe)}
                                className={`w-6 h-6 border-2 rounded-lg items-center justify-center ${
                                    rememberMe ? 'border-blue-500 bg-blue-500' : 'border-gray-300 bg-transparent'
                                }`}
                            >
                                {rememberMe && (
                                    <Icon as={CheckIcon} size="xs" className="text-white" />
                                )}
                            </Pressable>
                            <Text size="sm" className="text-gray-600">
                                Remember me
                            </Text>
                        </HStack>
                        <Button
                            variant="link"
                            size="sm"
                            onPress={handleForgotPassword}
                            className="p-0"
                        >
                            <Text size="sm" className="text-blue-600 font-semibold">
                                Forgot Password?
                            </Text>
                        </Button>
                    </HStack>

                    {/* Sign In Button */}
                    <VStack className='mt-8 w-full items-center'>
                        <InteractiveButton
                            isLoading={isSubmitting}
                            text="Sign In"
                            onPress={handleSubmit(onSubmit)}
                            variant="primary"
                            size="lg"
                            fullWidth={true}
                        />
                    </VStack>


                    {/* Sign Up Link */}
                    <VStack className="mt-6 w-full items-center">
                        <Text size="sm" className="text-gray-600">
                            Don't have an account?{' '}
                        </Text>
                        <Button 
                            variant="link" 
                            size="sm"
                            onPress={() => router.push('/sign-up')}
                        >
                            <Text size="sm" className="text-blue-600 font-semibold">
                                Create Account
                            </Text>
                        </Button>
                    </VStack>
                </VStack>
            </ScrollView>
        </VStack>
    );
}