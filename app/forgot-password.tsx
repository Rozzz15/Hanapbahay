import { useRouter } from 'expo-router';
import { View, ScrollView, SafeAreaView, Pressable, TextInput, StyleSheet, Dimensions } from 'react-native';
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
import { useToast } from "@/components/ui/toast";
import { notifications, createNotification } from "@/utils";
import { db } from '@/utils/db';
import { DbUserRecord } from '@/types';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

export default function ForgotPasswordScreen() {
    const router = useRouter();
    const toast = useToast();
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [emailSent, setEmailSent] = useState(false);

    // Function to check if email is registered in the app
    const checkEmailExists = async (emailToCheck: string): Promise<boolean> => {
        try {
            const allUsers = await db.list<DbUserRecord>('users');
            const userExists = allUsers.some(user => 
                user.email.toLowerCase() === emailToCheck.toLowerCase()
            );
            return userExists;
        } catch (error) {
            console.error('Error checking email existence:', error);
            return false;
        }
    };

    const handleSendResetEmail = async () => {
        // Validate email input
        if (!email) {
            toast.show(createNotification({
                title: 'Email Required',
                description: 'Please enter your email address to reset your password.',
                type: 'error',
                duration: 4000,
            }));
            return;
        }

        // Basic email format validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            toast.show(createNotification({
                title: 'Invalid Email Format',
                description: 'Please enter a valid email address (e.g., user@example.com).',
                type: 'error',
                duration: 4000,
            }));
            return;
        }

        setIsLoading(true);
        
        try {
            // Check if email is registered in the app
            const emailExists = await checkEmailExists(email);
            
            if (!emailExists) {
                setIsLoading(false);
                toast.show(createNotification({
                    title: 'Email Not Found',
                    description: 'This email address is not registered in our system. Please check your email or create a new account.',
                    type: 'error',
                    duration: 5000,
                }));
                return;
            }

            // Simulate API call for registered email
            setTimeout(() => {
                setIsLoading(false);
                setEmailSent(true);
                
                toast.show(createNotification({
                    title: 'Reset Email Sent!',
                    description: 'Check your email for password reset instructions.',
                    type: 'success',
                    duration: 5000,
                }));
            }, 2000);
            
        } catch (error) {
            setIsLoading(false);
            console.error('Error during password reset process:', error);
            toast.show(createNotification({
                title: 'Reset Failed',
                description: 'Unable to process your request. Please try again later.',
                type: 'error',
                duration: 4000,
            }));
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

                            <View style={styles.buttonContainer}>
                                <InteractiveButton
                                    isLoading={false}
                                    text="Resend Email"
                                    onPress={handleSendResetEmail}
                                    variant="outline"
                                    size="lg"
                                    fullWidth={true}
                                />
                                
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
                            <InteractiveButton
                                isLoading={isLoading}
                                text="Send Reset Email"
                                onPress={handleSendResetEmail}
                                variant="primary"
                                size="lg"
                                fullWidth={true}
                            />
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
});
