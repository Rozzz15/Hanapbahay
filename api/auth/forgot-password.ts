import { z } from "zod";
import { mockSignIn } from '../../utils/mock-auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Schema for forgot password request
export const forgotPasswordSchema = z.object({
    email: z.string().email("Invalid email address"),
});

export type ForgotPasswordData = z.infer<typeof forgotPasswordSchema>;

// Mock user database key
const MOCK_USERS_KEY = 'mock_users_database';

// Function to check if email exists in the mock database
const checkEmailExists = async (email: string): Promise<boolean> => {
    try {
        const normalizedEmail = email.trim().toLowerCase();
        const storedUsers = await AsyncStorage.getItem(MOCK_USERS_KEY);
        
        if (!storedUsers) {
            return false;
        }
        
        const usersData = JSON.parse(storedUsers);
        const mockUsers = new Map(Object.entries(usersData));
        
        return mockUsers.has(normalizedEmail);
    } catch (error) {
        console.error('Error checking email existence:', error);
        return false;
    }
};

// Function to generate a password reset token (mock implementation)
const generateResetToken = (): string => {
    return `reset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Function to store reset token with expiration
const storeResetToken = async (email: string, token: string): Promise<void> => {
    try {
        const resetTokensKey = 'password_reset_tokens';
        const existingTokens = await AsyncStorage.getItem(resetTokensKey);
        const tokens = existingTokens ? JSON.parse(existingTokens) : {};
        
        // Store token with 1 hour expiration
        tokens[email.toLowerCase()] = {
            token,
            expiresAt: Date.now() + (60 * 60 * 1000), // 1 hour from now
            createdAt: Date.now()
        };
        
        await AsyncStorage.setItem(resetTokensKey, JSON.stringify(tokens));
        console.log('✅ Password reset token stored for:', email);
    } catch (error) {
        console.error('❌ Error storing reset token:', error);
        throw error;
    }
};

// Function to send password reset email (mock implementation)
const sendPasswordResetEmail = async (email: string, token: string): Promise<boolean> => {
    try {
        // In a real implementation, this would send an actual email
        // For now, we'll simulate the email sending process
        console.log(`📧 [MOCK] Sending password reset email to: ${email}`);
        console.log(`🔗 [MOCK] Reset link: https://hanapbahay.app/reset-password?token=${token}&email=${encodeURIComponent(email)}`);
        
        // Simulate email sending delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        console.log('✅ [MOCK] Password reset email sent successfully');
        return true;
    } catch (error) {
        console.error('❌ Error sending password reset email:', error);
        return false;
    }
};

// Main forgot password function
export async function forgotPassword(data: ForgotPasswordData) {
    try {
        console.log('🔐 Starting forgot password process for:', data.email);
        
        // Validate input
        forgotPasswordSchema.parse(data);
        console.log('✅ Schema validation passed');
        
        // Check if email exists in the system
        const emailExists = await checkEmailExists(data.email);
        
        if (!emailExists) {
            console.log('❌ Email not found in system:', data.email);
            return {
                success: false,
                error: 'This email address is not registered in our system. Please check your email or create a new account.',
                emailExists: false
            };
        }
        
        console.log('✅ Email found in system:', data.email);
        
        // Generate reset token
        const resetToken = generateResetToken();
        console.log('🔑 Generated reset token:', resetToken);
        
        // Store reset token
        await storeResetToken(data.email, resetToken);
        
        // Send password reset email
        const emailSent = await sendPasswordResetEmail(data.email, resetToken);
        
        if (!emailSent) {
            return {
                success: false,
                error: 'Unable to send password reset email. Please try again later.',
                emailExists: true
            };
        }
        
        console.log('✅ Password reset process completed successfully');
        
        return {
            success: true,
            message: 'Password reset instructions have been sent to your email address.',
            emailExists: true,
            resetToken // Include token for testing purposes (remove in production)
        };
        
    } catch (error) {
        console.error('❌ Forgot password error:', error);
        const message = error instanceof Error ? error.message : "An unexpected error occurred";
        
        return {
            success: false,
            error: message,
            emailExists: false
        };
    }
}

// Function to verify reset token
export async function verifyResetToken(email: string, token: string): Promise<boolean> {
    try {
        const resetTokensKey = 'password_reset_tokens';
        const existingTokens = await AsyncStorage.getItem(resetTokensKey);
        
        if (!existingTokens) {
            return false;
        }
        
        const tokens = JSON.parse(existingTokens);
        const userToken = tokens[email.toLowerCase()];
        
        if (!userToken) {
            return false;
        }
        
        // Check if token matches and is not expired
        if (userToken.token === token && userToken.expiresAt > Date.now()) {
            return true;
        }
        
        return false;
    } catch (error) {
        console.error('❌ Error verifying reset token:', error);
        return false;
    }
}

// Function to reset password with token
export async function resetPasswordWithToken(email: string, token: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
    try {
        // Verify token first
        const isValidToken = await verifyResetToken(email, token);
        
        if (!isValidToken) {
            return {
                success: false,
                error: 'Invalid or expired reset token. Please request a new password reset.'
            };
        }
        
        // Update password in mock database
        const storedUsers = await AsyncStorage.getItem(MOCK_USERS_KEY);
        if (!storedUsers) {
            return {
                success: false,
                error: 'User not found. Please create a new account.'
            };
        }
        
        const usersData = JSON.parse(storedUsers);
        const mockUsers = new Map(Object.entries(usersData));
        const normalizedEmail = email.trim().toLowerCase();
        
        const user = mockUsers.get(normalizedEmail);
        if (!user) {
            return {
                success: false,
                error: 'User not found. Please create a new account.'
            };
        }
        
        // Update password
        user.password = newPassword;
        mockUsers.set(normalizedEmail, user);
        
        // Save updated users
        const usersObject = Object.fromEntries(mockUsers);
        await AsyncStorage.setItem(MOCK_USERS_KEY, JSON.stringify(usersObject));
        
        // Remove used reset token
        const resetTokensKey = 'password_reset_tokens';
        const existingTokens = await AsyncStorage.getItem(resetTokensKey);
        if (existingTokens) {
            const tokens = JSON.parse(existingTokens);
            delete tokens[normalizedEmail];
            await AsyncStorage.setItem(resetTokensKey, JSON.stringify(tokens));
        }
        
        console.log('✅ Password reset successfully for:', email);
        
        return {
            success: true
        };
        
    } catch (error) {
        console.error('❌ Error resetting password:', error);
        return {
            success: false,
            error: 'Failed to reset password. Please try again.'
        };
    }
}
