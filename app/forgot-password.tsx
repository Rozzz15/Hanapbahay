import { useRouter } from 'expo-router';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import {
    FormControl,
    FormControlError,
    FormControlErrorText,
    FormControlErrorIcon,
    FormControlLabel,
    FormControlLabelText,
} from "@/components/ui/form-control"
import { Input, InputField } from '@/components/ui/input';
import { AlertCircleIcon, Icon, ChevronLeftIcon, MailIcon } from "@/components/ui/icon"
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { InteractiveButton } from '@/components/buttons';
import { LinearGradient } from 'expo-linear-gradient';
import { useToast, Toast, ToastTitle, ToastDescription } from "@/components/ui/toast";

export default function ForgotPasswordScreen() {
    const router = useRouter();
    const toast = useToast();
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [emailSent, setEmailSent] = useState(false);

    const handleSendResetEmail = async () => {
        if (!email) {
            toast.show({
                placement: "top",
                render: ({ id }) => (
                    <Toast nativeID={id} action="error">
                        <ToastTitle>Email Required</ToastTitle>
                        <ToastDescription>Please enter your email address</ToastDescription>
                    </Toast>
                ),
            });
            return;
        }

        setIsLoading(true);
        
        // Simulate API call
        setTimeout(() => {
            setIsLoading(false);
            setEmailSent(true);
            
            toast.show({
                placement: "top",
                render: ({ id }) => (
                    <Toast nativeID={id} action="success">
                        <ToastTitle>Reset Email Sent!</ToastTitle>
                        <ToastDescription>Check your email for password reset instructions</ToastDescription>
                    </Toast>
                ),
            });
        }, 2000);
    };

    if (emailSent) {
        return (
            <VStack className="min-h-screen bg-gray-50">
                {/* Header with Gradient Background */}
                <LinearGradient
                    colors={['#3B82F6', '#1D4ED8']}
                    className="px-6 pt-12 pb-8"
                >
                    <VStack className="items-center">
                        {/* Back Button */}
                        <HStack className="w-full justify-start mb-6">
                            <Button 
                                className='p-2' 
                                variant='link' 
                                size='lg' 
                                onPress={() => router.back()}
                            >
                                <Icon as={ChevronLeftIcon} size='xl' className="text-white" />
                            </Button>
                        </HStack>

                        {/* Success Message */}
                        <VStack className="items-center mb-6">
                            <VStack className="w-20 h-20 bg-white/20 rounded-full items-center justify-center mb-4">
                                <Icon as={MailIcon} size="xl" className="text-white" />
                            </VStack>
                            <Text size="3xl" className="font-bold text-white text-center">
                                Check Your Email
                            </Text>
                            <Text size="lg" className="text-white/90 text-center mt-2">
                                We've sent reset instructions to {email}
                            </Text>
                        </VStack>
                    </VStack>
                </LinearGradient>

                {/* Main Content */}
                <VStack className="flex-1 px-6 py-8 -mt-4 bg-white rounded-t-3xl">
                    <VStack className="space-y-6 items-center">
                        <VStack className="w-16 h-16 bg-green-100 rounded-full items-center justify-center mb-4">
                            <Icon as={MailIcon} size="xl" className="text-green-600" />
                        </VStack>
                        
                        <Text size="xl" className="font-semibold text-gray-800 text-center">
                            Password Reset Email Sent!
                        </Text>
                        
                        <Text size="lg" className="text-gray-600 text-center">
                            We've sent password reset instructions to your email address. 
                            Please check your inbox and follow the link to reset your password.
                        </Text>

                        <VStack className="mt-8 space-y-4 w-full">
                            <InteractiveButton
                                isLoading={false}
                                text="Resend Email"
                                onPress={handleSendResetEmail}
                                variant="outline"
                                size="lg"
                                fullWidth={true}
                            />
                            
                            <Button
                                variant="link"
                                size="lg"
                                onPress={() => router.back()}
                            >
                                <Text size="lg" className="text-blue-600 font-semibold">
                                    Back to Sign In
                                </Text>
                            </Button>
                        </VStack>
                    </VStack>
                </VStack>
            </VStack>
        );
    }

    return (
        <VStack className="min-h-screen bg-gray-50">
            {/* Header with Gradient Background */}
            <LinearGradient
                colors={['#3B82F6', '#1D4ED8']}
                className="px-6 pt-12 pb-8"
            >
                <VStack className="items-center">
                    {/* Back Button */}
                    <HStack className="w-full justify-start mb-6">
                        <Button 
                            className='p-2' 
                            variant='link' 
                            size='lg' 
                            onPress={() => router.back()}
                        >
                            <Icon as={ChevronLeftIcon} size='xl' className="text-white" />
                        </Button>
                    </HStack>

                    {/* Brand Section */}
                    <VStack className="items-center mb-6">
                        <VStack className="w-20 h-20 bg-white/20 rounded-full items-center justify-center mb-4">
                            <Icon as={MailIcon} size="xl" className="text-white" />
                        </VStack>
                        <Text size="3xl" className="font-bold text-white text-center">
                            Forgot Password?
                        </Text>
                        <Text size="lg" className="text-white/90 text-center mt-2">
                            No worries! Enter your email and we'll send you reset instructions.
                        </Text>
                    </VStack>
                </VStack>
            </LinearGradient>

            {/* Main Content */}
            <VStack className="flex-1 px-6 py-8 -mt-4 bg-white rounded-t-3xl">
                <VStack className="space-y-6">
                    {/* Email Field */}
                    <FormControl className='w-full'>
                        <FormControlLabel>
                            <HStack className="items-center space-x-2">
                                <Icon as={MailIcon} size="sm" className="text-gray-600" />
                                <FormControlLabelText size='lg' className="text-gray-700 font-medium">Email Address</FormControlLabelText>
                            </HStack>
                        </FormControlLabel>
                        <Input className="my-2" size="2xl" variant="rounded" style={{ borderWidth: 1, borderColor: '#E5E7EB' }}>
                            <InputField
                                id="email"
                                name="email"
                                type="email"
                                placeholder="Enter your email address"
                                value={email}
                                onChangeText={setEmail}
                                className="text-gray-800"
                            />
                        </Input>
                    </FormControl>

                    {/* Information Text */}
                    <VStack className="bg-blue-50 p-4 rounded-lg">
                        <Text size="sm" className="text-blue-800 text-center">
                            We'll send you a secure link to reset your password. 
                            Make sure to check your spam folder if you don't see the email.
                        </Text>
                    </VStack>

                    {/* Send Reset Email Button */}
                    <VStack className='mt-8 w-full items-center'>
                        <InteractiveButton
                            isLoading={isLoading}
                            text="Send Reset Email"
                            onPress={handleSendResetEmail}
                            variant="primary"
                            size="lg"
                            fullWidth={true}
                        />
                    </VStack>

                    {/* Back to Sign In Link */}
                    <VStack className="mt-6 w-full items-center">
                        <Text size="sm" className="text-gray-600">
                            Remember your password?{' '}
                        </Text>
                        <Button 
                            variant="link" 
                            size="sm"
                            onPress={() => router.back()}
                        >
                            <Text size="sm" className="text-blue-600 font-semibold">
                                Back to Sign In
                            </Text>
                        </Button>
                    </VStack>
                </VStack>
            </VStack>
        </VStack>
    );
}
