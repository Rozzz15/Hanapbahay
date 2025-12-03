import { useRouter } from 'expo-router';
import { ScrollView, Pressable, View, Text, StyleSheet, KeyboardAvoidingView, Platform, Modal, TextInput, Image, Linking, Alert } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import React, { useState, useEffect } from 'react';
import { loginUser } from '@/api/auth/login';
import { useAuth } from '@/context/AuthContext';
import { SignInButton } from '@/components/buttons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useToast } from "@/components/ui/toast";
import { notifications } from "@/utils";
import { showSimpleAlert, showAlert } from "@/utils/alert";
import { Ionicons } from '@expo/vector-icons';
import { isOwnerApproved, hasPendingOwnerApplication, getOwnerApplication, getBarangayOfficialContact } from '@/utils/owner-approval';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

interface LoginModalProps {
    visible: boolean;
    onClose: () => void;
    onLoginSuccess?: () => void;
    onSwitchToSignUp?: () => void;
}

export default function LoginModal({ visible, onClose, onLoginSuccess, onSwitchToSignUp }: LoginModalProps) {
    const router = useRouter();
    const { refreshUser, redirectOwnerBasedOnListings, redirectTenantToTabs, redirectBrgyOfficial } = useAuth();
    const toast = useToast();
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [savedEmail, setSavedEmail] = useState('');

    // Use React state for form management
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [errors, setErrors] = useState({ email: '', password: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Countdown and failed attempts tracking
    const [failedAttempts, setFailedAttempts] = useState(0);
    const [countdown, setCountdown] = useState(0);
    const [isLocked, setIsLocked] = useState(false);

    // Load saved email and remember me preference - only on mount or when modal first opens
    const [hasLoadedInitialData, setHasLoadedInitialData] = useState(false);
    
    useEffect(() => {
        if (!visible || hasLoadedInitialData) return;
        
        const loadSavedData = async () => {
            try {
                const savedEmail = await AsyncStorage.getItem('remembered_email');
                const rememberMePref = await AsyncStorage.getItem('remember_me');
                
                // Only set email if it's not already set (preserve user input)
                if (savedEmail && !email) {
                    setSavedEmail(savedEmail);
                    setEmail(savedEmail);
                }
                
                if (rememberMePref === 'true') {
                    setRememberMe(true);
                }
                
                // Load failed attempts and countdown
                const savedFailedAttempts = await AsyncStorage.getItem('login_failed_attempts');
                const savedCountdownEnd = await AsyncStorage.getItem('login_countdown_end');
                
                if (savedFailedAttempts) {
                    const attempts = parseInt(savedFailedAttempts, 10);
                    setFailedAttempts(attempts);
                }
                
                if (savedCountdownEnd) {
                    const countdownEnd = parseInt(savedCountdownEnd, 10);
                    const now = Date.now();
                    const remaining = Math.max(0, Math.ceil((countdownEnd - now) / 1000));
                    
                    if (remaining > 0) {
                        setCountdown(remaining);
                        setIsLocked(true);
                    } else {
                        await AsyncStorage.removeItem('login_countdown_end');
                        await AsyncStorage.removeItem('login_failed_attempts');
                        setFailedAttempts(0);
                        setCountdown(0);
                        setIsLocked(false);
                    }
                }
                
                setHasLoadedInitialData(true);
            } catch (error) {
                console.error('Error loading saved data:', error);
                setHasLoadedInitialData(true);
            }
        };
        
        loadSavedData();
    }, [visible, hasLoadedInitialData, email]);

    // Countdown timer effect
    useEffect(() => {
        if (countdown > 0) {
            const timer = setInterval(() => {
                setCountdown((prev) => {
                    if (prev <= 1) {
                        setIsLocked(false);
                        AsyncStorage.removeItem('login_countdown_end').catch(console.error);
                        AsyncStorage.removeItem('login_failed_attempts').catch(console.error);
                        setFailedAttempts(0);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);

            return () => clearInterval(timer);
        }
    }, [countdown]);

    // Reset form when modal closes (only if not submitting)
    useEffect(() => {
        if (!visible && !isSubmitting) {
            // Reset form state when modal closes (but preserve email if remember me is checked)
            if (!rememberMe) {
                setEmail('');
            }
            setPassword('');
            setErrors({ email: '', password: '' });
            setShowPassword(false);
            setHasLoadedInitialData(false); // Allow reloading saved data next time
        }
    }, [visible, isSubmitting, rememberMe]);

    const onSubmit = async () => {
        try {
            if (isLocked && countdown > 0) {
                const additionalTime = 30;
                const newCountdown = countdown + additionalTime;
                const countdownEnd = Date.now() + (newCountdown * 1000);
                
                setCountdown(newCountdown);
                await AsyncStorage.setItem('login_countdown_end', countdownEnd.toString());
                
                showSimpleAlert(
                    'Account Temporarily Locked 🔒',
                    `Too many failed login attempts. Please wait ${newCountdown} seconds before trying again.`
                );
                return;
            }
            
            setErrors({ email: '', password: '' });
            
            if (!email.trim()) {
                setErrors(prev => ({ ...prev, email: 'Email is required' }));
                return;
            }
            if (!password.trim()) {
                setErrors(prev => ({ ...prev, password: 'Password is required' }));
                return;
            }
            
            setIsSubmitting(true);
            const result = await loginUser({ email, password });
            
            if (result.success) {
                // Clear failed attempts on successful login
                setFailedAttempts(0);
                setIsLocked(false);
                setCountdown(0);
                await AsyncStorage.removeItem('login_failed_attempts');
                await AsyncStorage.removeItem('login_countdown_end');
                
                // Save remember me preference
                if (rememberMe) {
                    await AsyncStorage.setItem('remembered_email', email);
                    await AsyncStorage.setItem('remember_me', 'true');
                } else {
                    await AsyncStorage.removeItem('remembered_email');
                    await AsyncStorage.removeItem('remember_me');
                }
                
                // Clear password field for security (but keep email if remember me is checked)
                setPassword('');
                setErrors({ email: '', password: '' });
                
                // Refresh user state (non-blocking for UI responsiveness)
                refreshUser().catch(err => console.warn('Background user refresh:', err));
                
                // Get roles and userId immediately from login result
                // Don't wait for refreshUser to complete - it can happen in background
                let roles: string[] = (result as any).roles || (result as any).user?.roles || [];
                let userId: string | undefined = (result as any).user?.id || (result as any).id;
                
                // Quick fallback check if not in result (single attempt, no retry loop)
                if (!roles || roles.length === 0 || !userId) {
                    try {
                        const { getAuthUser } = await import('@/utils/auth-user');
                        const authUser = await getAuthUser();
                        if (authUser) {
                            roles = authUser.roles || roles || [];
                            userId = authUser.id || userId;
                        }
                    } catch (authError) {
                        console.warn('⚠️ Could not get user from auth storage:', authError);
                    }
                }
                
                // Final fallback to login result
                if (!roles || roles.length === 0) {
                    roles = (result as any).roles || (result as any).user?.roles || [];
                }
                if (!userId) {
                    userId = (result as any).user?.id || (result as any).id;
                }
                
                toast.show(notifications.loginSuccess());
                
                console.log('🔍 Login redirect - roles:', roles, 'userId:', userId);
                
                if (!roles || roles.length === 0) {
                    console.error('❌ No roles found after login, defaulting to tenant');
                    showSimpleAlert('Warning', 'Unable to determine your account type. Redirecting to default dashboard.');
                    redirectTenantToTabs(userId);
                    onClose();
                    if (onLoginSuccess) {
                        onLoginSuccess();
                    }
                    return;
                }
                
                // Redirect immediately - approval checks happen in layout/dashboard
                // This allows UI to show faster while checks happen in background
                try {
                    if (Array.isArray(roles) && roles.includes('owner')) {
                        // Redirect immediately, approval check happens in owner layout
                        console.log('🏠 Redirecting owner to dashboard...');
                        if (userId) {
                            redirectOwnerBasedOnListings(userId);
                        } else {
                            console.error('❌ No userId available for owner redirect');
                            showSimpleAlert('Error', 'Unable to determine user ID. Please try logging in again.');
                            return;
                        }
                    } else if (Array.isArray(roles) && roles.includes('brgy_official')) {
                        console.log('🏛️ Redirecting barangay official to dashboard');
                        redirectBrgyOfficial();
                    } else {
                        console.log('🏠 Redirecting tenant to tabs');
                        redirectTenantToTabs(userId);
                    }
                    
                    // Close modal and call success callback
                    onClose();
                    if (onLoginSuccess) {
                        onLoginSuccess();
                    }
                } catch (redirectError) {
                    console.error('❌ Error during redirect:', redirectError);
                    // Fallback to tenant tabs if redirect fails
                    redirectTenantToTabs(userId);
                    onClose();
                    if (onLoginSuccess) {
                        onLoginSuccess();
                    }
                }
            } else {
                // Login failed - handle different error types
                const errorType = (result as any).error || 'UNKNOWN_ERROR';
                const errorMessage = (result as any).errorMessage || 'An unexpected error occurred';
                
                // Clear password field for security, but keep email
                setPassword('');
                
                // Only track attempts for invalid password (account exists but wrong password)
                if (errorType === 'INVALID_PASSWORD') {
                    const newFailedAttempts = failedAttempts + 1;
                    setFailedAttempts(newFailedAttempts);
                    await AsyncStorage.setItem('login_failed_attempts', newFailedAttempts.toString());
                    
                    if (newFailedAttempts >= 5) {
                        const initialCountdown = 60;
                        const countdownEnd = Date.now() + (initialCountdown * 1000);
                        
                        setCountdown(initialCountdown);
                        setIsLocked(true);
                        await AsyncStorage.setItem('login_countdown_end', countdownEnd.toString());
                        
                        showSimpleAlert(
                            'Account Temporarily Locked 🔒',
                            `Too many failed login attempts. Please wait ${initialCountdown} seconds before trying again.`
                        );
                    } else {
                        const remainingAttempts = 5 - newFailedAttempts;
                        showSimpleAlert(
                            'Login Failed ❌',
                            `${errorMessage} ${remainingAttempts > 0 ? `${remainingAttempts} attempt${remainingAttempts > 1 ? 's' : ''} remaining before account lock.` : ''}`
                        );
                    }
                } else {
                    // Account not found or other errors - don't track attempts
                    showSimpleAlert(
                        'Login Failed ❌',
                        errorMessage
                    );
                }
            }
        } catch (error) {
            console.error('Login error:', error);
            
            // Login error - check if it's a structured error with error type
            const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
            
            // Try to parse error message to see if it contains error type
            // If the error was thrown from loginUser, it might not have the structure
            // In this case, we'll treat it as an unknown error (don't track attempts)
            
            // Clear password field for security, but keep email
            setPassword('');
            
            // For catch block errors, we don't track attempts (these are usually system errors)
            showSimpleAlert(
                'Login Failed ❌',
                errorMessage
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleForgotPassword = () => {
        onClose();
        router.push('/forgot-password');
    };

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
                                <Text style={styles.welcomeText} numberOfLines={1}>Welcome Back!</Text>
                                <Text style={styles.subtitleText} numberOfLines={1}>
                                    Find your next home in Lopez, Quezon
                                </Text>
                                <Text style={styles.subtitleText2}>
                                    mabilis, abot-kaya, at legit!
                                </Text>
                                <Text style={styles.taglineText}>
                                    Hanapbahay — hanap mo, nandito na!
                                </Text>
                            </View>

                            {/* Form Fields */}
                            <View style={styles.formSection}>
                                {/* Email Field */}
                                <View style={styles.inputContainer}>
                                    <View style={[styles.inputWrapper, errors.email && styles.inputError]}>
                                        <Ionicons name="mail-outline" size={20} color={errors.email ? "#EF4444" : "#64748B"} style={styles.inputIcon} />
                                        <TextInput
                                            style={styles.textInput}
                                            placeholder="Email address"
                                            placeholderTextColor="#94A3B8"
                                            value={email}
                                            onChangeText={setEmail}
                                            keyboardType="email-address"
                                            autoCapitalize="none"
                                            autoCorrect={false}
                                            editable={!isLocked || countdown === 0}
                                        />
                                    </View>
                                    {errors.email && (
                                        <Text style={styles.errorText}>{errors.email}</Text>
                                    )}
                                </View>

                                {/* Password Field */}
                                <View style={styles.inputContainer}>
                                    <View style={[styles.inputWrapper, errors.password && styles.inputError]}>
                                        <Ionicons name="lock-closed-outline" size={20} color={errors.password ? "#EF4444" : "#64748B"} style={styles.inputIcon} />
                                        <TextInput
                                            style={styles.textInput}
                                            placeholder="Password"
                                            placeholderTextColor="#94A3B8"
                                            secureTextEntry={!showPassword}
                                            value={password}
                                            onChangeText={setPassword}
                                            editable={!isLocked || countdown === 0}
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

                                {/* Remember Me & Forgot Password */}
                                <View style={styles.optionsContainer}>
                                    <Pressable
                                        style={styles.rememberMeContainer}
                                        onPress={() => setRememberMe(!rememberMe)}
                                    >
                                        <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                                            {rememberMe && (
                                                <Ionicons name="checkmark" size={14} color="#fff" />
                                            )}
                                        </View>
                                        <Text style={styles.rememberMeText}>Remember me</Text>
                                    </Pressable>
                                    
                                    <Pressable onPress={handleForgotPassword}>
                                        <Text style={styles.forgotPasswordText}>Forgot password?</Text>
                                    </Pressable>
                                </View>

                                {/* Countdown Warning */}
                                {isLocked && countdown > 0 && (
                                    <View style={styles.countdownContainer}>
                                        <Ionicons name="lock-closed" size={18} color="#EF4444" />
                                        <Text style={styles.countdownText}>
                                            Account locked. Please wait {countdown} second{countdown !== 1 ? 's' : ''} before trying again.
                                        </Text>
                                    </View>
                                )}

                                {/* Sign In Button */}
                                <SignInButton
                                    title={isLocked && countdown > 0 ? `Locked (${countdown}s)` : "Sign In"}
                                    onPress={onSubmit}
                                    isLoading={isSubmitting}
                                    disabled={isSubmitting || (isLocked && countdown > 0)}
                                />

                                {/* Sign Up Link */}
                                <View style={styles.signUpContainer}>
                                    <Text style={styles.signUpText}>Don&apos;t have an account? </Text>
                                    <Pressable onPress={() => {
                                        // Don't call onClose() here - it navigates away before sign-up can load
                                        if (onSwitchToSignUp) {
                                            onSwitchToSignUp();
                                        } else {
                                            router.push('/sign-up');
                                        }
                                    }}>
                                        <Text style={styles.signUpLink}>Sign up</Text>
                                    </Pressable>
                                </View>
                            </View>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </BlurView>
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
    header: {
        paddingTop: 24,
        paddingHorizontal: 24,
        paddingBottom: 16,
        alignItems: 'center',
        width: '100%',
    },
    logoContainer: {
        marginBottom: 12,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 4,
    },
    logoImage: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: '#FFFFFF',
        shadowColor: '#10B981',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
        elevation: 12,
        borderWidth: 2,
        borderColor: '#ECFDF5',
    },
    welcomeText: {
        fontSize: 28,
        fontWeight: '800',
        color: '#0F172A',
        textAlign: 'center',
        marginBottom: 6,
        letterSpacing: -0.5,
        flexShrink: 0,
        width: '100%',
    },
    subtitleText: {
        fontSize: 12,
        color: '#64748B',
        textAlign: 'center',
        lineHeight: 16,
        fontWeight: '400',
        paddingHorizontal: 4,
        marginBottom: 2,
        width: '100%',
    },
    subtitleText2: {
        fontSize: 13,
        color: '#64748B',
        textAlign: 'center',
        lineHeight: 16,
        fontWeight: '400',
        paddingHorizontal: 8,
        marginBottom: 4,
    },
    taglineText: {
        fontSize: 14,
        color: '#10B981',
        textAlign: 'center',
        fontWeight: '600',
        marginBottom: 0,
        letterSpacing: 0.2,
    },
    contentContainer: {
        paddingHorizontal: 28,
        paddingBottom: 24,
    },
    formSection: {
        width: '100%',
    },
    inputContainer: {
        marginBottom: 14,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FAFBFC',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E4E7EB',
        paddingHorizontal: 14,
        paddingVertical: 12,
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
    optionsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 18,
        marginTop: 2,
    },
    rememberMeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
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
    },
    checkboxChecked: {
        backgroundColor: '#10B981',
        borderColor: '#10B981',
    },
    rememberMeText: {
        fontSize: 14,
        color: '#475569',
        fontWeight: '500',
    },
    forgotPasswordText: {
        fontSize: 14,
        color: '#3B82F6',
        fontWeight: '600',
    },
    signUpContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 18,
        paddingTop: 18,
        borderTopWidth: 1,
        borderTopColor: '#F1F3F5',
    },
    signUpText: {
        fontSize: 14,
        color: '#64748B',
        fontWeight: '400',
    },
    signUpLink: {
        fontSize: 14,
        color: '#3B82F6',
        fontWeight: '600',
        marginLeft: 4,
    },
    countdownContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FEF2F2',
        borderWidth: 1,
        borderColor: '#FECACA',
        borderRadius: 12,
        padding: 12,
        marginBottom: 16,
        gap: 8,
    },
    countdownText: {
        fontSize: 13,
        color: '#DC2626',
        fontWeight: '600',
        textAlign: 'center',
        flex: 1,
    },
});


