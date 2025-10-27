import { useRouter } from 'expo-router';
import { ScrollView, Pressable, View, Text, StyleSheet, Dimensions } from 'react-native';
import React, { useState, useEffect } from 'react';
import { loginUser, loginSchema } from '@/api/auth/login';
// Removed react-hook-form - using React state instead
import { useAuth } from '@/context/AuthContext';
import { SignInButton } from '@/components/buttons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useToast } from "@/components/ui/toast";
import { notifications } from "@/utils";
import { Ionicons } from '@expo/vector-icons';
import { TextInput } from 'react-native';

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

    const onSubmit = async () => {
        try {
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
                
                // Handle remember me functionality
                if (rememberMe) {
                    await AsyncStorage.setItem('remembered_email', email);
                    await AsyncStorage.setItem('remember_me', 'true');
                } else {
                    await AsyncStorage.removeItem('remembered_email');
                    await AsyncStorage.removeItem('remember_me');
                }
                
                await refreshUser(); // Refresh user context
                
                console.log('User context refreshed, showing welcome message...');
                // Show welcome back toast
                toast.show(notifications.loginSuccess());

                console.log('Redirecting based on role...');
                const roles = (result as any).roles || (result as any).user?.roles || [];
                
                if (Array.isArray(roles) && roles.includes('owner')) {
                    // Use the AuthContext function to handle owner redirect
                    const ownerId = (result as any).user?.id || (result as any).id;
                    await redirectOwnerBasedOnListings(ownerId);
                } else if (Array.isArray(roles) && roles.includes('brgy_official')) {
                    // Redirect barangay official to barangay dashboard
                    await redirectBrgyOfficial();
                } else {
                    // Redirect tenant to tenant dashboard
                    await redirectTenantToTabs();
                }
            } else {
                console.log('Sign-in failed:', result.error);
                alert(result.error || "Invalid email or password");
            }
        } catch (error) {
            console.error('Login error:', error);
            alert("Invalid email or password");
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
            <ScrollView 
                style={styles.scrollView}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
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
                                onChangeText={(text) => {
                                    setEmail(text);
                                    setSavedEmail(text);
                                }}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                autoCorrect={false}
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

                    {/* Sign In Button */}
                    <SignInButton
                        title="Sign In"
                        onPress={onSubmit}
                        isLoading={isSubmitting}
                        disabled={isSubmitting}
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
});