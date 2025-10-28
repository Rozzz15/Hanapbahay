import AsyncStorage from '@react-native-async-storage/async-storage';
import { z } from 'zod';

const MOCK_USERS_KEY = 'mock_users_database';

// Schema for password change
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters'),
  confirmPassword: z.string().min(1, 'Please confirm your new password'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'New passwords do not match',
  path: ['confirmPassword'],
});

export type ChangePasswordData = z.infer<typeof changePasswordSchema>;

// Function to change password for logged-in user
export async function changePassword(
  userId: string, 
  data: ChangePasswordData
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('🔐 Starting password change process for user:', userId);
    
    // Validate input
    changePasswordSchema.parse(data);
    console.log('✅ Schema validation passed');
    
    // Load users from storage
    const storedUsers = await AsyncStorage.getItem(MOCK_USERS_KEY);
    if (!storedUsers) {
      return {
        success: false,
        error: 'User not found. Please contact support.'
      };
    }
    
    const usersData = JSON.parse(storedUsers);
    const mockUsers = new Map(Object.entries(usersData));
    
    // Find the user by ID
    let foundUser = null;
    let userEmail = '';
    
    for (const [email, userData] of mockUsers.entries()) {
      if (userData.id === userId) {
        foundUser = userData;
        userEmail = email;
        break;
      }
    }
    
    if (!foundUser) {
      console.log('❌ User not found in database');
      return {
        success: false,
        error: 'User not found. Please contact support.'
      };
    }
    
    // Verify current password
    if (foundUser.password !== data.currentPassword) {
      console.log('❌ Current password is incorrect');
      return {
        success: false,
        error: 'Current password is incorrect.'
      };
    }
    
    // Check if new password is the same as current password
    if (foundUser.password === data.newPassword) {
      return {
        success: false,
        error: 'New password must be different from your current password.'
      };
    }
    
    // Update password
    foundUser.password = data.newPassword;
    mockUsers.set(userEmail, foundUser);
    
    // Save updated users
    const usersObject = Object.fromEntries(mockUsers);
    await AsyncStorage.setItem(MOCK_USERS_KEY, JSON.stringify(usersObject));
    
    console.log('✅ Password changed successfully for user:', userId);
    
    return {
      success: true
    };
    
  } catch (error) {
    console.error('❌ Error changing password:', error);
    
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.errors[0].message
      };
    }
    
    return {
      success: false,
      error: 'Failed to change password. Please try again.'
    };
  }
}
