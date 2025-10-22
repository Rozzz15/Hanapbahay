import { useRouter, useLocalSearchParams } from 'expo-router';
import { View, ScrollView, SafeAreaView, Pressable, TextInput, StyleSheet, Dimensions, Text, Alert } from 'react-native';
import React, { useState, useEffect } from 'react';
import { InteractiveButton } from '@/components/buttons';
import { useToast } from "@/components/ui/toast";
import { notifications, createNotification } from "@/utils";
import { verifyResetToken, resetPasswordWithToken } from '@/api/auth/forgot-password';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

export default function ResetPasswordScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const toast = useToast();
    
    const [email, setEmail] = useState('');
    const [token, setToken] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isValidToken, setIsValidToken] = useState(false);
    const [tokenVerified, setTokenVerified] = useState(false);

    useEffect(() => {
        // Extract email and token from URL parameters
        if (params.email && params.token) {
            setEmail(params.email as string);
            setToken(params.token as string);
            verifyToken(params.email as string, params.token as string);
        }
    }, [params]);

    const verifyToken = async (emailToVerify: string, tokenToVerify: string) => {
        try {
            const isValid = await verifyResetToken(emailToVerify, tokenToVerify);
            setIsValidToken(isValid);
            setTokenVerified(true);
            
            if (!isValid) {
                Alert.alert(
                    'Invalid Reset Link',
                    'This password reset link is invalid or has expired. Please request a new password reset.',
                    [{ text: 'OK' }]
                );
            }
        } catch (error) {
            console.error('Error verifying token:', error);
            setIsValidToken(false);
            setTokenVerified(true);
            Alert.alert(
                'Invalid Reset Link',
                'This password reset link is invalid or has expired. Please request a new password reset.',
                [{ text: 'OK' }]
            );
        }
    };

    const handlePasswordReset = async () => {
        // Validate inputs
        if (!newPassword || !confirmPassword) {
            Alert.alert(
                'Password Required',
                'Please enter and confirm your new password.',
                [{ text: 'OK' }]
            );
            return;
        }

        if (newPassword.length < 6) {
            Alert.alert(
                'Password Too Short',
                'Password must be at least 6 characters long.',
                [{ text: 'OK' }]
            );
            return;
        }

        if (newPassword !== confirmPassword) {
            Alert.alert(
                'Passwords Do Not Match',
                'Please make sure both password fields match.',
                [{ text: 'OK' }]
            );
            return;
        }

        setIsLoading(true);

        try {
            const result = await resetPasswordWithToken(email, token, newPassword);
            
            if (result.success) {
                Alert.alert(
                    'Password Reset Success! 🔐',
                    'Your password has been updated successfully. You can now sign in with your new password.',
                    [{ text: 'OK' }]
                );
                // Navigate to login screen after successful reset
                setTimeout(() => {
                    router.replace('/login');
                }, 2000);
            } else {
                Alert.alert(
                    'Reset Failed',
                    result.error || 'Unable to reset password. Please try again.',
                    [{ text: 'OK' }]
                );
            }
        } catch (error) {
            console.error('Error resetting password:', error);
            Alert.alert(
                'Reset Failed',
                'Unable to reset password. Please try again.',
                [{ text: 'OK' }]
            );
        } finally {
            setIsLoading(false);
        }
    };

    if (!tokenVerified) {
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
                            <Text style={styles.headerTitle}>Verifying Reset Link</Text>
                            <Text style={styles.headerSubtitle}>
                                Please wait while we verify your password reset link...
                            </Text>
                        </View>
                    </View>
                </LinearGradient>

                <View style={styles.loadingContainer}>
                    <Ionicons name="hourglass" size={48} color="#6B7280" />
                    <Text style={styles.loadingText}>Verifying your reset link...</Text>
                </View>
            </SafeAreaView>
        );
    }

    if (!isValidToken) {
        return (
            <SafeAreaView style={styles.container}>
                <LinearGradient
                    colors={['#EF4444', '#DC2626']}
                    style={styles.headerGradient}
                >
                    <View style={styles.header}>
                        <Pressable 
                            style={styles.backButton}
                            onPress={() => router.replace('/forgot-password')}
                        >
                            <Ionicons name="arrow-back" size={24} color="white" />
                        </Pressable>
                        
                        <View style={styles.headerContent}>
                            <View style={styles.iconContainer}>
                                <Ionicons name="alert-circle" size={32} color="white" />
                            </View>
                            <Text style={styles.headerTitle}>Invalid Reset Link</Text>
                            <Text style={styles.headerSubtitle}>
                                This password reset link is invalid or has expired.
                            </Text>
                        </View>
                    </View>
                </LinearGradient>

                <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                    <View style={styles.card}>
                        <View style={styles.errorContent}>
                            <View style={styles.errorIcon}>
                                <Ionicons name="close-circle" size={48} color="#EF4444" />
                            </View>
                            
                            <Text style={styles.errorTitle}>
                                Reset Link Expired
                            </Text>
                            
                            <Text style={styles.errorDescription}>
                                This password reset link is no longer valid. Reset links expire after 1 hour for security reasons.
                            </Text>

                            <View style={styles.buttonContainer}>
                                <InteractiveButton
                                    isLoading={false}
                                    text="Request New Reset Link"
                                    onPress={() => router.replace('/forgot-password')}
                                    variant="primary"
                                    size="lg"
                                    fullWidth={true}
                                />
                                
                                <Pressable
                                    style={styles.backToSignInButton}
                                    onPress={() => router.replace('/login')}
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
                colors={['#10B981', '#059669']}
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
                            <Ionicons name="key" size={32} color="white" />
                        </View>
                        <Text style={styles.headerTitle}>Reset Password</Text>
                        <Text style={styles.headerSubtitle}>
                            Enter your new password below.
                        </Text>
                    </View>
                </View>
            </LinearGradient>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                <View style={styles.card}>
                    <View style={styles.formContainer}>
                        {/* Email Display */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Email Address</Text>
                            <View style={styles.inputContainer}>
                                <Ionicons name="mail" size={20} color="#6B7280" style={styles.inputIcon} />
                                <TextInput
                                    style={[styles.textInput, styles.disabledInput]}
                                    value={email}
                                    editable={false}
                                    placeholderTextColor="#9CA3AF"
                                />
                            </View>
                        </View>

                        {/* New Password Field */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>New Password</Text>
                            <View style={styles.inputContainer}>
                                <Ionicons name="lock-closed" size={20} color="#6B7280" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.textInput}
                                    placeholder="Enter your new password"
                                    placeholderTextColor="#9CA3AF"
                                    value={newPassword}
                                    onChangeText={setNewPassword}
                                    secureTextEntry
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                />
                            </View>
                        </View>

                        {/* Confirm Password Field */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Confirm New Password</Text>
                            <View style={styles.inputContainer}>
                                <Ionicons name="lock-closed" size={20} color="#6B7280" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.textInput}
                                    placeholder="Confirm your new password"
                                    placeholderTextColor="#9CA3AF"
                                    value={confirmPassword}
                                    onChangeText={setConfirmPassword}
                                    secureTextEntry
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                />
                            </View>
                        </View>

                        {/* Reset Password Button */}
                        <View style={styles.buttonContainer}>
                            <InteractiveButton
                                isLoading={isLoading}
                                text="Reset Password"
                                onPress={handlePasswordReset}
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
                            <Pressable onPress={() => router.replace('/login')}>
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
    errorContent: {
        alignItems: 'center',
        paddingVertical: 20,
    },
    errorIcon: {
        marginBottom: 24,
    },
    errorTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1F2937',
        textAlign: 'center',
        marginBottom: 16,
    },
    errorDescription: {
        fontSize: 16,
        color: '#6B7280',
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 32,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 24,
    },
    loadingText: {
        fontSize: 16,
        color: '#6B7280',
        marginTop: 16,
        textAlign: 'center',
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
    disabledInput: {
        backgroundColor: '#F3F4F6',
        color: '#6B7280',
    },
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
