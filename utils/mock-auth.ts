import { storeAuthUser, clearAuthUser } from './auth-user';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock user database for development - using persistent storage
const MOCK_USERS_KEY = 'mock_users_database';
let mockUsers = new Map<string, { email: string; password: string; id: string; roles: string[]; createdAt: string }>();

// No default users - users must create their own accounts

const isBrowser = typeof window !== 'undefined';

// Load users from persistent storage on-demand (guarded for web SSR)
const loadUsersFromStorage = async () => {
  try {
    if (!isBrowser) {
      // Avoid accessing storage during SSR / prerender
      return;
    }
    const storedUsers = await AsyncStorage.getItem(MOCK_USERS_KEY);
    if (storedUsers) {
      const usersData = JSON.parse(storedUsers);
      mockUsers = new Map(Object.entries(usersData));
      console.log(`📊 Loaded ${mockUsers.size} users from persistent storage`);
    } else {
      console.log('📊 No existing users found in storage');
    }
  } catch (error) {
    console.error('❌ Error loading users from storage:', error);
  }
};

// Save users to persistent storage (guarded for web SSR)
const saveUsersToStorage = async () => {
  try {
    if (!isBrowser) {
      return;
    }
    const usersObject = Object.fromEntries(mockUsers);
    await AsyncStorage.setItem(MOCK_USERS_KEY, JSON.stringify(usersObject));
    console.log(`💾 Saved ${mockUsers.size} users to persistent storage`);
  } catch (error) {
    console.error('❌ Error saving users to storage:', error);
  }
};

// Do not auto-load on import to prevent SSR issues; callers will load as needed

export interface MockAuthResponse {
  success: boolean;
  user?: {
    id: string;
    email: string;
    roles: string[];
  };
  error?: string;
}

export async function mockSignUp(email: string, password: string, role: 'tenant' | 'owner' = 'tenant'): Promise<MockAuthResponse> {
  try {
    const normalizedEmail = email.trim().toLowerCase();
    console.log(`🔐 Creating account for: ${normalizedEmail}`);
    
    // Ensure users are loaded from storage
    await loadUsersFromStorage();
    console.log(`📊 Current database size: ${mockUsers.size} users`);
    
    // Check if user already exists
    if (mockUsers.has(normalizedEmail)) {
      console.log('❌ User already exists:', normalizedEmail);
      console.log('🔍 Available users:', Array.from(mockUsers.keys()));
      return {
        success: false,
        error: 'An account with this email already exists. Please use a different email or try signing in instead.'
      };
    }

    // Create new user with unique ID
    const userId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const userData = {
      email: normalizedEmail,
      password,
      id: userId,
      roles: [role],
      createdAt: new Date().toISOString()
    };
    
    // Store user in database
    mockUsers.set(normalizedEmail, userData);
    console.log('✅ User stored in database:', userData);
    console.log(`📊 Database size after storage: ${mockUsers.size} users`);

    // Save users to persistent storage
    await saveUsersToStorage();
    console.log('💾 Users saved to persistent storage');

    // Store auth user data for immediate login
    const authUser = {
      id: userId,
      roles: [role],
      permissions: []
    };
    
    await storeAuthUser(authUser);
    console.log('✅ Auth user stored in AsyncStorage:', authUser);

    // Verify the user was stored correctly
    const storedUser = mockUsers.get(normalizedEmail);
    if (!storedUser) {
      console.error('❌ Failed to verify user storage');
      throw new Error('Failed to store user in database');
    }
    
    console.log('✅ User verification successful:', storedUser.id);

    return {
      success: true,
      user: {
        id: userId,
        email: normalizedEmail,
        roles: [role]
      }
    };
  } catch (error) {
    console.error('❌ Error creating account:', error);
    return {
      success: false,
      error: 'Failed to create account'
    };
  }
}

export async function mockSignIn(email: string, password: string): Promise<MockAuthResponse> {
  try {
    const normalizedEmail = email.trim().toLowerCase();
    console.log(`🔑 Attempting sign-in for: ${normalizedEmail}`);
    
    // Ensure users are loaded from storage
    await loadUsersFromStorage();
    console.log(`📊 Current database size: ${mockUsers.size} users`);
    
    // List all users in database for debugging
    console.log('📋 All users in database:');
    for (const [userEmail, userData] of mockUsers.entries()) {
      console.log(`   - ${userEmail}: ${userData.id}`);
    }
    
    const user = mockUsers.get(normalizedEmail);
    
    if (!user) {
      console.log('❌ User not found in database:', normalizedEmail);
      console.log('🔍 Available users:', Array.from(mockUsers.keys()));
      return {
        success: false,
        error: 'Invalid email or password'
      };
    }

    console.log('✅ User found in database:', user.id);

    if (user.password !== password) {
      console.log('❌ Password mismatch for user:', normalizedEmail);
      return {
        success: false,
        error: 'Invalid email or password'
      };
    }

    console.log('✅ Password verified for user:', user.id);

    // Store auth user data for session
    const authUser = {
      id: user.id,
      roles: user.roles,
      permissions: []
    };
    
    await storeAuthUser(authUser);
    console.log('✅ Auth user stored for session:', authUser);

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        roles: user.roles
      }
    };
  } catch (error) {
    console.error('❌ Mock sign in error:', error);
    return {
      success: false,
      error: 'Failed to sign in'
    };
  }
}

export async function mockSignOut(): Promise<void> {
  await clearAuthUser();
}

// Debug function to check database state
export async function getDatabaseState() {
  await loadUsersFromStorage();
  console.log('📊 Database State:');
  console.log(`   Total users: ${mockUsers.size}`);
  console.log('   Users:');
  for (const [email, userData] of mockUsers.entries()) {
    console.log(`     - ${email}: ${userData.id} (${userData.roles.join(', ')}) - Created: ${userData.createdAt}`);
  }
  return {
    totalUsers: mockUsers.size,
    users: Array.from(mockUsers.entries()).map(([email, userData]) => ({
      email,
      id: userData.id,
      roles: userData.roles,
      createdAt: userData.createdAt
    }))
  };
}

// Function to clear all users (for testing purposes only)
export async function clearAllUsers() {
  try {
    const isDev = process.env.NODE_ENV !== 'production' && process.env.EXPO_PUBLIC_ALLOW_DATA_CLEAR === 'true';
    if (!isDev) {
      console.warn('[clearAllUsers] Blocked in this environment');
      return;
    }
    mockUsers.clear();
    await AsyncStorage.removeItem(MOCK_USERS_KEY);
    console.log('🗑️ All users cleared from database');
  } catch (error) {
    console.error('❌ Error clearing users:', error);
  }
}

// No test credentials - users must create their own accounts

