import { useRouter } from 'expo-router';
import { ScrollView, Pressable, View, Text, StyleSheet, Dimensions, KeyboardAvoidingView, Platform } from 'react-native';
import React, { useState, useEffect } from 'react';
import { loginUser, loginSchema } from '@/api/auth/login';
// Removed react-hook-form - using React state instead
import { useAuth } from '@/context/AuthContext';
import { SignInButton } from '@/components/buttons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useToast } from "@/components/ui/toast";
import { notifications } from "@/utils";
import { showSimpleAlert } from "@/utils/alert";
import { Ionicons } from '@expo/vector-icons';
import { TextInput } from 'react-native';
import { isOwnerApproved, hasPendingOwnerApplication } from '@/utils/owner-approval';

const { width, height } = Dimensions.get('window');

export default function LoginScreen() {
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

    // Load saved email and remember me preference
    useEffect(() => {
        const loadSavedData = async () => {
            try {
                const savedEmail = await AsyncStorage.getItem('remembered_email');
                const rememberMePref = await AsyncStorage.getItem('remember_me');
                
                if (savedEmail) {
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
                        // Countdown expired, clear it
                        await AsyncStorage.removeItem('login_countdown_end');
                        await AsyncStorage.removeItem('login_failed_attempts');
                        setFailedAttempts(0);
                        setCountdown(0);
                        setIsLocked(false);
                    }
                }
            } catch (error) {
                console.error('Error loading saved data:', error);
            }
        };
        
        loadSavedData();
    }, []);

    // Check if user was redirected here due to logout
    useEffect(() => {
        const checkLogoutRedirect = async () => {
            try {
                // Check if there's a logout flag in storage
                const logoutFlag = await AsyncStorage.getItem('user_logged_out');
                if (logoutFlag === 'true') {
                    // Show logout notification
                    toast.show(notifications.logoutSuccess());
                    
                    // Clear the logout flag
                    await AsyncStorage.removeItem('user_logged_out');
                }
            } catch (error) {
                console.error('Error checking logout redirect:', error);
            }
        };
        
        checkLogoutRedirect();
    }, [toast]);

    // Countdown timer effect
    useEffect(() => {
        if (countdown > 0) {
            const timer = setInterval(() => {
                setCountdown((prev) => {
                    if (prev <= 1) {
                        setIsLocked(false);
                        // Clean up storage asynchronously
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

    const onSubmit = async () => {
        try {
            // Check if form is locked due to countdown
            if (isLocked && countdown > 0) {
                // If user tries to login during countdown, increase the countdown
                const additionalTime = 30; // Add 30 seconds
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
            
            // Clear previous errors
            setErrors({ email: '', password: '' });
            
            // Basic validation
            if (!email.trim()) {
                setErrors(prev => ({ ...prev, email: 'Email is required' }));
                return;
            }
            if (!password.trim()) {
                setErrors(prev => ({ ...prev, password: 'Password is required' }));
                return;
            }
            
            setIsSubmitting(true);
            console.log('Starting sign-in process...');
            const result = await loginUser({ email, password });
            
            if (result.success) {
                console.log('Sign-in successful, refreshing user context...');
                
                // Reset failed attempts on successful login
                setFailedAttempts(0);
                setIsLocked(false);
                setCountdown(0);
                await AsyncStorage.removeItem('login_failed_attempts');
                await AsyncStorage.removeItem('login_countdown_end');
                
                // Handle remember me functionality
                if (rememberMe) {
                    await AsyncStorage.setItem('remembered_email', email);
                    await AsyncStorage.setItem('remember_me', 'true');
                } else {
                    await AsyncStorage.removeItem('remembered_email');
                    await AsyncStorage.removeItem('remember_me');
                }
                
                // Refresh user context - this is critical
                await refreshUser();
                
                // Give auth state a moment to settle
                await new Promise(resolve => setTimeout(resolve, 200));
                
                console.log('User context refreshed, showing welcome message...');
                // Show welcome back toast
                toast.show(notifications.loginSuccess());

                console.log('Redirecting based on role...');
                const roles = (result as any).roles || (result as any).user?.roles || [];
                
                // Small delay before redirect to ensure state is settled
                setTimeout(async () => {
                    if (Array.isArray(roles) && roles.includes('owner')) {
                        // Get userId from multiple sources to be safe
                        // First try from auth context (most reliable)
                        let ownerId = (result as any).user?.id || (result as any).id;
                        
                        // Also try to get it from the auth context after refresh
                        try {
                            const { getAuthUser } = await import('@/utils/auth-user');
                            const authUser = await getAuthUser();
                            if (authUser?.id) {
                                ownerId = authUser.id;
                                console.log('✅ Got userId from auth context:', ownerId);
                            }
                        } catch (authError) {
                            console.warn('⚠️ Could not get userId from auth context:', authError);
                        }
                        
                        if (!ownerId) {
                            console.error('❌ No userId found for owner login check');
                            showSimpleAlert(
                                'Error',
                                'Unable to verify your owner status. Please try again.'
                            );
                            return;
                        }
                        
                        console.log('🔍 Checking owner approval for userId:', ownerId);
                        console.log('📝 UserId type:', typeof ownerId, 'Value:', JSON.stringify(ownerId));
                        
                        try {
                            const isApproved = await isOwnerApproved(ownerId);
                            const hasPending = await hasPendingOwnerApplication(ownerId);
                            
                            if (!isApproved) {
                                if (hasPending) {
                                    showSimpleAlert(
                                        'Application Pending',
                                        'Your owner application is still under review by your Barangay official. You will be notified once it is approved.'
                                    );
                                } else {
                                    showSimpleAlert(
                                        'Access Denied',
                                        'Your owner application has not been approved yet. Please contact your Barangay official for assistance.'
                                    );
                                }
                                return;
                            }
                            
                            // If approved, redirect to owner dashboard
                            redirectOwnerBasedOnListings(ownerId);
                        } catch (error) {
                            console.error('❌ Error checking owner approval during login:', error);
                            showSimpleAlert(
                                'Error',
                                'Unable to verify your owner status. Please try again.'
                            );
                        }
                    } else if (Array.isArray(roles) && roles.includes('brgy_official')) {
                        // Redirect barangay official to barangay dashboard
                        redirectBrgyOfficial();
                    } else {
                        // Redirect tenant to tenant dashboard
                        redirectTenantToTabs();
                    }
                }, 100);
            } else {
                console.log('Sign-in failed:', result.error);
                
                // Increment failed attempts
                const newFailedAttempts = failedAttempts + 1;
                setFailedAttempts(newFailedAttempts);
                await AsyncStorage.setItem('login_failed_attempts', newFailedAttempts.toString());
                
                // If 5 or more failed attempts, start countdown
                if (newFailedAttempts >= 5) {
                    const initialCountdown = 60; // Start with 60 seconds
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
                        `Invalid email or password. ${remainingAttempts > 0 ? `${remainingAttempts} attempt${remainingAttempts > 1 ? 's' : ''} remaining before account lock.` : ''}`
                    );
                }
            }
        } catch (error) {
            console.error('Login error:', error);
            
            // Increment failed attempts on error too
            const newFailedAttempts = failedAttempts + 1;
            setFailedAttempts(newFailedAttempts);
            await AsyncStorage.setItem('login_failed_attempts', newFailedAttempts.toString());
            
            // If 5 or more failed attempts, start countdown
            if (newFailedAttempts >= 5) {
                const initialCountdown = 60; // Start with 60 seconds
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
                    `Invalid email or password. ${remainingAttempts > 0 ? `${remainingAttempts} attempt${remainingAttempts > 1 ? 's' : ''} remaining before account lock.` : ''}`
                );
            }
        } finally {
            setIsSubmitting(false);
        }
    };


    const handleForgotPassword = () => {
        router.push('/forgot-password');
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Pressable 
                    style={styles.backButton}
                    onPress={() => router.navigate('/')}
                >
                    <Ionicons name="arrow-back" size={24} color="#374151" />
                </Pressable>
                
                <View style={styles.logoContainer}>
                    <Ionicons name="home" size={32} color="#10B981" />
                    <Text style={styles.logoText}>HanapBahay</Text>
                </View>
                
                <Text style={styles.welcomeText}>Welcome Back!</Text>
                <Text style={styles.subtitleText}>
                    Sign in to continue your journey to find the perfect home
                </Text>
            </View>

            {/* Form Card */}
            <KeyboardAvoidingView 
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
            >
                <ScrollView 
                    style={styles.scrollView}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                >
                <View style={styles.formCard}>
                    <Text style={styles.formTitle}>Sign In to Your Account</Text>
                    <Text style={styles.formSubtitle}>
                        Tenants and Property Owners can sign in here
                    </Text>

                    {/* Email Field */}
                    <View style={styles.inputContainer}>
                        <Text style={styles.inputLabel}>Email Address</Text>
                        <View style={[styles.inputWrapper, errors.email && styles.inputError]}>
                            <Ionicons name="mail" size={20} color="#10B981" style={styles.inputIcon} />
                            <TextInput
                                style={styles.textInput}
                                placeholder="Enter your email address"
                                placeholderTextColor="#9CA3AF"
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
                        <Text style={styles.inputLabel}>Password</Text>
                        <View style={[styles.inputWrapper, errors.password && styles.inputError]}>
                            <Ionicons name="lock-closed" size={20} color="#10B981" style={styles.inputIcon} />
                            <TextInput
                                style={styles.textInput}
                                placeholder="Enter your password"
                                placeholderTextColor="#9CA3AF"
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
                                    name={showPassword ? "eye-off" : "eye"} 
                                    size={20} 
                                    color="#9CA3AF" 
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
                                    <Ionicons name="checkmark" size={16} color="#fff" />
                                )}
                            </View>
                            <Text style={styles.rememberMeText}>Remember me</Text>
                        </Pressable>
                        
                        <Pressable onPress={handleForgotPassword}>
                            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                        </Pressable>
                    </View>

                    {/* Countdown Warning */}
                    {isLocked && countdown > 0 && (
                        <View style={styles.countdownContainer}>
                            <Ionicons name="lock-closed" size={20} color="#EF4444" />
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
                        <Text style={styles.signUpText}>Don't have an account? </Text>
                        <Pressable onPress={() => router.push('/sign-up')}>
                            <Text style={styles.signUpLink}>Create Account</Text>
                        </Pressable>
                    </View>
                </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
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
    formTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1F2937',
        textAlign: 'center',
        marginBottom: 8,
    },
    formSubtitle: {
        fontSize: 14,
        color: '#6B7280',
        textAlign: 'center',
        marginBottom: 32,
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
    eyeButton: {
        padding: 4,
    },
    errorText: {
        fontSize: 14,
        color: '#EF4444',
        marginTop: 4,
    },
    optionsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 32,
    },
    rememberMeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    checkbox: {
        width: 20,
        height: 20,
        borderRadius: 4,
        borderWidth: 2,
        borderColor: '#D1D5DB',
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkboxChecked: {
        backgroundColor: '#10B981',
        borderColor: '#10B981',
    },
    rememberMeText: {
        fontSize: 14,
        color: '#6B7280',
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
        marginTop: 24,
    },
    signUpText: {
        fontSize: 14,
        color: '#6B7280',
    },
    signUpLink: {
        fontSize: 14,
        color: '#3B82F6',
        fontWeight: '600',
    },
    countdownContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FEF2F2',
        borderWidth: 1,
        borderColor: '#FECACA',
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
        gap: 8,
    },
    countdownText: {
        fontSize: 14,
        color: '#DC2626',
        fontWeight: '600',
        textAlign: 'center',
        flex: 1,
    },
});