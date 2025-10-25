import { useRouter } from 'expo-router';
import { View, ScrollView, Pressable, TextInput, StyleSheet, Dimensions, Text, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
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
import { useToast } from "@/components/ui/toast";
import { notifications, createNotification } from "@/utils";
import { forgotPassword } from '@/api/auth/forgot-password';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

export default function ForgotPasswordScreen() {
    const router = useRouter();
    const toast = useToast();
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [emailSent, setEmailSent] = useState(false);

    // Function to handle password reset request
    const handlePasswordReset = async (emailToReset: string) => {
        try {
            const result = await forgotPassword({ email: emailToReset });
            return result;
        } catch (error) {
            console.error('Error during password reset process:', error);
            return {
                success: false,
                error: 'Unable to process your request. Please try again later.',
                emailExists: false
            };
        }
    };

    const handleSendResetEmail = async () => {
        // Validate email input
        if (!email) {
            Alert.alert(
                'Email Required',
                'Please enter your email address to reset your password.',
                [{ text: 'OK' }]
            );
            return;
        }

        // Basic email format validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            Alert.alert(
                'Invalid Email Format',
                'Please enter a valid email address (e.g., user@example.com).',
                [{ text: 'OK' }]
            );
            return;
        }

        setIsLoading(true);
        
        try {
            // Call the forgot password API
            const result = await handlePasswordReset(email);
            
            setIsLoading(false);
            
            if (result.success) {
                setEmailSent(true);
                Alert.alert(
                    'Reset Email Sent! 📧',
                    'Check your email for password reset instructions. The link will expire in 1 hour.',
                    [{ text: 'OK' }]
                );
            } else {
                // Show appropriate error message based on whether email exists
                if (!result.emailExists) {
                    Alert.alert(
                        'Email Not Found',
                        'This email address is not registered in our system. Please check your email or create a new account.',
                        [{ text: 'OK' }]
                    );
                } else {
                    Alert.alert(
                        'Reset Failed',
                        result.error || 'Unable to send reset email. Please try again later.',
                        [{ text: 'OK' }]
                    );
                }
            }
            
        } catch (error) {
            setIsLoading(false);
            console.error('Error during password reset process:', error);
            Alert.alert(
                'Reset Failed',
                'Unable to process your request. Please try again later.',
                [{ text: 'OK' }]
            );
        }
    };

    if (emailSent) {
        return (
            <SafeAreaView style={styles.container}>
                <LinearGradient
                    colors={['#3B82F6', '#1E40AF']}
                    style={styles.headerGradient}
                >
                    <View style={styles.header}>
                        <Pressable 
                            style={styles.backButton}
                            onPress={() => router.back()}
                        >
                            <Ionicons name="arrow-back" size={24} color="white" />
                        </Pressable>
                        
                        <View style={styles.headerContent}>
                            <View style={styles.successIconContainer}>
                                <Ionicons name="mail" size={32} color="#10B981" />
                            </View>
                            <Text style={styles.headerTitle}>Check Your Email</Text>
                            <Text style={styles.headerSubtitle}>
                                We've sent reset instructions to {email}
                            </Text>
                        </View>
                    </View>
                </LinearGradient>

                <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                    <View style={styles.card}>
                        <View style={styles.successContent}>
                            <View style={styles.successIcon}>
                                <Ionicons name="checkmark-circle" size={48} color="#10B981" />
                            </View>
                            
                            <Text style={styles.successTitle}>
                                Password Reset Email Sent!
                            </Text>
                            
                            <Text style={styles.successDescription}>
                                We've sent password reset instructions to your email address. 
                                Please check your inbox and follow the link to reset your password.
                            </Text>

                            {/* Development Testing Link */}
                            {__DEV__ && (
                                <View style={styles.devTestingContainer}>
                                    <Text style={styles.devTestingTitle}>Development Testing:</Text>
                                    <Pressable
                                        style={styles.devTestingButton}
                                        onPress={() => {
                                            // Navigate to reset password screen with test data
                                            const testEmail = email || 'test@example.com';
                                            const testToken = 'test_token_' + Date.now();
                                            console.log('🔗 Navigating to reset-password with:', { email: testEmail, token: testToken });
                                            router.push(`/reset-password?email=${encodeURIComponent(testEmail)}&token=${testToken}`);
                                        }}
                                    >
                                        <Text style={styles.devTestingButtonText}>
                                            Test Reset Password Screen
                                        </Text>
                                    </Pressable>
                                </View>
                            )}

                            <View style={styles.buttonContainer}>
                                <Pressable
                                    style={styles.resendButton}
                                    onPress={handleSendResetEmail}
                                >
                                    <LinearGradient
                                        colors={['#10B981', '#059669']}
                                        style={styles.resendButtonGradient}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                    >
                                        <Text style={styles.resendButtonText}>Resend Email</Text>
                                    </LinearGradient>
                                </Pressable>
                                
                                <Pressable
                                    style={styles.backToSignInButton}
                                    onPress={() => router.back()}
                                >
                                    <Text style={styles.backToSignInText}>
                                        Back to Sign In
                                    </Text>
                                </Pressable>
                            </View>
                        </View>
                    </View>
                </ScrollView>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <LinearGradient
                colors={['#3B82F6', '#1E40AF']}
                style={styles.headerGradient}
            >
                <View style={styles.header}>
                    <Pressable 
                        style={styles.backButton}
                        onPress={() => router.back()}
                    >
                        <Ionicons name="arrow-back" size={24} color="white" />
                    </Pressable>
                    
                    <View style={styles.headerContent}>
                        <View style={styles.iconContainer}>
                            <Ionicons name="lock-closed" size={32} color="white" />
                        </View>
                        <Text style={styles.headerTitle}>Forgot Password?</Text>
                        <Text style={styles.headerSubtitle}>
                            No worries! Enter your email and we'll send you reset instructions.
                        </Text>
                    </View>
                </View>
            </LinearGradient>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                <View style={styles.card}>
                    <View style={styles.formContainer}>
                        {/* Email Field */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Email Address</Text>
                            <View style={styles.inputContainer}>
                                <Ionicons name="mail" size={20} color="#6B7280" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.textInput}
                                    placeholder="Enter your email address"
                                    placeholderTextColor="#9CA3AF"
                                    value={email}
                                    onChangeText={setEmail}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                />
                            </View>
                        </View>

                        {/* Removed information card */}

                        {/* Send Reset Email Button */}
                        <View style={styles.buttonContainer}>
                            <Pressable
                                style={[styles.sendButton, isLoading && styles.sendButtonDisabled]}
                                onPress={handleSendResetEmail}
                                disabled={isLoading}
                            >
                                <LinearGradient
                                    colors={isLoading ? ['#9CA3AF', '#6B7280'] : ['#3B82F6', '#1E40AF']}
                                    style={styles.sendButtonGradient}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                >
                                    {isLoading ? (
                                        <View style={styles.loadingContainer}>
                                            <Text style={styles.loadingText}>Sending...</Text>
                                        </View>
                                    ) : (
                                        <Text style={styles.sendButtonText}>Send Reset Email</Text>
                                    )}
                                </LinearGradient>
                            </Pressable>
                        </View>

                        {/* Back to Sign In Link */}
                        <View style={styles.backToSignInContainer}>
                            <Text style={styles.backToSignInText}>
                                Remember your password?{' '}
                            </Text>
                            <Pressable onPress={() => router.back()}>
                                <Text style={styles.backToSignInLink}>
                                    Back to Sign In
                                </Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    headerGradient: {
        paddingTop: 20,
        paddingBottom: 30,
    },
    header: {
        paddingHorizontal: 24,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    headerContent: {
        alignItems: 'center',
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    successIconContainer: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: 'white',
        textAlign: 'center',
        marginBottom: 8,
    },
    headerSubtitle: {
        fontSize: 16,
        color: 'rgba(255, 255, 255, 0.9)',
        textAlign: 'center',
        lineHeight: 22,
    },
    content: {
        flex: 1,
        marginTop: -20,
    },
    card: {
        backgroundColor: 'white',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 24,
        paddingTop: 32,
        paddingBottom: 40,
        minHeight: height * 0.6,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: -2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 8,
    },
    formContainer: {
        flex: 1,
    },
    successContent: {
        alignItems: 'center',
        paddingVertical: 20,
    },
    successIcon: {
        marginBottom: 24,
    },
    successTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1F2937',
        textAlign: 'center',
        marginBottom: 16,
    },
    successDescription: {
        fontSize: 16,
        color: '#6B7280',
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 32,
    },
    inputGroup: {
        marginBottom: 24,
    },
    inputLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 8,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 4,
    },
    inputIcon: {
        marginRight: 12,
    },
    textInput: {
        flex: 1,
        fontSize: 16,
        color: '#1F2937',
        paddingVertical: 12,
    },
    // Removed info card styles
    buttonContainer: {
        marginBottom: 24,
    },
    sendButton: {
        borderRadius: 12,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    sendButtonDisabled: {
        opacity: 0.7,
    },
    sendButtonGradient: {
        paddingVertical: 16,
        paddingHorizontal: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sendButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: 'white',
        textAlign: 'center',
    },
    loadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingText: {
        fontSize: 16,
        fontWeight: '600',
        color: 'white',
        marginLeft: 8,
    },
    resendButton: {
        borderRadius: 12,
        overflow: 'hidden',
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    resendButtonGradient: {
        paddingVertical: 16,
        paddingHorizontal: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    resendButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: 'white',
        textAlign: 'center',
    },
    backToSignInContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        flexWrap: 'wrap',
    },
    backToSignInText: {
        fontSize: 14,
        color: '#6B7280',
    },
    backToSignInButton: {
        paddingVertical: 8,
        paddingHorizontal: 4,
    },
    backToSignInLink: {
        fontSize: 14,
        color: '#3B82F6',
        fontWeight: '600',
    },
    devTestingContainer: {
        backgroundColor: '#F3F4F6',
        borderRadius: 12,
        padding: 16,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    devTestingTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 8,
    },
    devTestingButton: {
        backgroundColor: '#3B82F6',
        borderRadius: 8,
        paddingVertical: 8,
        paddingHorizontal: 12,
        alignSelf: 'flex-start',
    },
    devTestingButtonText: {
        fontSize: 12,
        color: 'white',
        fontWeight: '500',
    },
});
