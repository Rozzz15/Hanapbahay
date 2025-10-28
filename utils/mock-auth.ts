import { storeAuthUser, clearAuthUser } from './auth-user';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock user database for development - using persistent storage
const MOCK_USERS_KEY = 'mock_users_database';
let mockUsers = new Map<string, { email: string; password: string; id: string; roles: string[]; role?: string; barangay?: string; createdAt: string; name?: string; phone?: string; address?: string }>();

// Create default users for testing connectivity
const createDefaultUsers = async () => {
  const defaultUsers = [
    // Default Tenant
    {
      id: 'tenant_default_001',
      email: 'tenant@test.com',
      password: 'tenant123',
      name: 'John Tenant',
      phone: '+63 912 345 6789',
      address: '123 Tenant Street, Dumaguete City',
      roles: ['tenant'],
      createdAt: new Date().toISOString()
    },
    // Barangay Officials
    {
      id: 'brgy_rizal_001',
      email: 'brgy.rizal@hanapbahay.com',
      password: 'rizal123',
      name: 'Barangay Rizal Official',
      phone: '+63 910 111 2222',
      address: 'Rizal Street, Dumaguete City',
      role: 'brgy_official',
      barangay: 'RIZAL',
      roles: ['brgy_official'],
      createdAt: new Date().toISOString()
    },
    {
      id: 'brgy_talolong_001',
      email: 'brgy.talolong@hanapbahay.com',
      password: 'talolong123',
      name: 'Barangay Talolong Official',
      phone: '+63 910 333 4444',
      address: 'Talolong Street, Dumaguete City',
      role: 'brgy_official',
      barangay: 'TALOLONG',
      roles: ['brgy_official'],
      createdAt: new Date().toISOString()
    },
    {
      id: 'brgy_gomez_001',
      email: 'brgy.gomez@hanapbahay.com',
      password: 'gomez123',
      name: 'Barangay Gomez Official',
      phone: '+63 910 555 6666',
      address: 'Gomez Street, Dumaguete City',
      role: 'brgy_official',
      barangay: 'GOMEZ',
      roles: ['brgy_official'],
      createdAt: new Date().toISOString()
    },
    {
      id: 'brgy_magsaysay_001',
      email: 'brgy.magsaysay@hanapbahay.com',
      password: 'magsaysay123',
      name: 'Barangay Magsaysay Official',
      phone: '+63 910 777 8888',
      address: 'Magsaysay Street, Dumaguete City',
      role: 'brgy_official',
      barangay: 'MAGSAYSAY',
      roles: ['brgy_official'],
      createdAt: new Date().toISOString()
    }
  ];

  for (const user of defaultUsers) {
    if (!mockUsers.has(user.email)) {
      mockUsers.set(user.email, user);
      console.log(`✅ Created default user: ${user.name} (${user.role})`);
    }
  }
  
  await saveUsersToStorage();
};

// Create default property listings for owners - DISABLED
const createDefaultProperties = async () => {
  console.log('🚫 Default property creation disabled - only real owner listings will be shown');
  // No default properties will be created
  return;
};

// Clear any existing default properties
const clearDefaultProperties = async () => {
  const { db } = await import('./db');
  
  const defaultPropertyIds = ['property_001', 'property_002', 'property_003'];
  
  try {
    // First, get all published listings to see what's there
    const allListings = await db.list('published_listings');
    console.log('📋 Current published listings:', allListings.length);
    
    // Remove specific default properties
    for (const propertyId of defaultPropertyIds) {
      try {
        await db.remove('published_listings', propertyId);
        console.log(`🗑️ Removed default property: ${propertyId}`);
      } catch (error) {
        console.log(`⚠️ Property ${propertyId} may not exist:`, error);
      }
    }
    
    console.log('✅ All default properties cleared');
  } catch (error) {
    console.error('❌ Error clearing default properties:', error);
  }
};

const isBrowser = typeof window !== 'undefined';

// Load users from persistent storage on-demand (guarded for web SSR)
const loadUsersFromStorage = async () => {
  try {
    if (!isBrowser) {
      // Avoid accessing storage during SSR / prerender
      console.log('🌐 Not in browser environment, skipping storage load');
      return;
    }
    console.log('🔍 Attempting to load users from AsyncStorage...');
    const storedUsers = await AsyncStorage.getItem(MOCK_USERS_KEY);
    console.log('📄 Raw users data:', storedUsers ? 'Found data' : 'No data');
    
    if (storedUsers) {
      const usersData = JSON.parse(storedUsers);
      mockUsers = new Map(Object.entries(usersData));
      console.log(`📊 Loaded ${mockUsers.size} users from persistent storage`);
    } else {
      console.log('📊 No existing users found in storage');
    }
    
    // Always create default users if they don't exist
    await createDefaultUsers();
    
    // Disabled default properties creation
    // await createDefaultProperties();
    
    // Clear any existing default properties
    await clearDefaultProperties();
  } catch (error) {
    console.error('❌ Error loading users from storage:', error);
    console.error('❌ Error details:', error);
  }
};

// Save users to persistent storage (guarded for web SSR)
const saveUsersToStorage = async () => {
  try {
    if (!isBrowser) {
      console.log('🌐 Not in browser environment, skipping storage save');
      return;
    }
    console.log('💾 Attempting to save users to AsyncStorage...');
    const usersObject = Object.fromEntries(mockUsers);
    console.log('📄 Users object to save:', usersObject);
    await AsyncStorage.setItem(MOCK_USERS_KEY, JSON.stringify(usersObject));
    console.log(`✅ Saved ${mockUsers.size} users to persistent storage`);
  } catch (error) {
    console.error('❌ Error saving users to storage:', error);
    console.error('❌ Error details:', error);
  }
};

// Do not auto-load on import to prevent SSR issues; callers will load as needed

// Test function to verify AsyncStorage is working
export async function testAsyncStorage(): Promise<boolean> {
  try {
    console.log('🧪 Testing AsyncStorage functionality...');
    const testKey = 'test_key_' + Date.now();
    const testValue = 'test_value_' + Math.random();
    
    await AsyncStorage.setItem(testKey, testValue);
    console.log('✅ AsyncStorage setItem successful');
    
    const retrievedValue = await AsyncStorage.getItem(testKey);
    console.log('📄 Retrieved value:', retrievedValue);
    
    if (retrievedValue === testValue) {
      console.log('✅ AsyncStorage getItem successful');
      await AsyncStorage.removeItem(testKey);
      console.log('✅ AsyncStorage removeItem successful');
      return true;
    } else {
      console.log('❌ Retrieved value does not match stored value');
      return false;
    }
  } catch (error) {
    console.error('❌ AsyncStorage test failed:', error);
    return false;
  }
}

export interface MockAuthResponse {
  success: boolean;
  user?: {
    id: string;
    email: string;
    roles: string[];
    role?: string;
    permissions?: string[];
  };
  error?: string;
}

export async function mockSignUp(email: string, password: string, role: 'tenant' | 'owner' = 'tenant'): Promise<MockAuthResponse> {
  try {
    const normalizedEmail = email.trim().toLowerCase();
    console.log(`🔐 Creating account for: ${normalizedEmail}, role: ${role}`);
    
    // Ensure users are loaded from storage
    console.log('📂 Loading users from storage...');
    try {
      await loadUsersFromStorage();
      console.log(`📊 Current database size: ${mockUsers.size} users`);
    } catch (storageError) {
      console.error('❌ Failed to load users from storage:', storageError);
      console.log('🔄 Continuing with empty user database...');
      mockUsers.clear();
    }
    
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
      role: role,
      roles: [role],
      createdAt: new Date().toISOString()
    };
    
    // Store user in database
    mockUsers.set(normalizedEmail, userData);
    console.log('✅ User stored in database:', userData);
    console.log(`📊 Database size after storage: ${mockUsers.size} users`);

    // Save users to persistent storage
    console.log('💾 Saving users to persistent storage...');
    try {
      await saveUsersToStorage();
      console.log('✅ Users saved to persistent storage');
    } catch (saveError) {
      console.error('❌ Failed to save users to storage:', saveError);
      console.log('🔄 Continuing without persistent storage...');
    }

    // IMPORTANT: Save user data to the database so other parts of the app can access it
    try {
      const { db } = await import('./db');
      await db.upsert('users', userId, {
        id: userId,
        email: normalizedEmail,
        name: normalizedEmail.split('@')[0],
        phone: '', // Default empty
        address: '', // Default empty
        roles: [role],
        role: role,
        createdAt: userData.createdAt,
      });
      console.log('✅ User data saved to database:', userId);
    } catch (dbError) {
      console.error('❌ Failed to save user to database:', dbError);
      // Continue anyway - some app features might not work
    }

    // Store auth user data for immediate login (with both role and roles)
    const authUser = {
      id: userId,
      role: role,
      roles: [role],
      permissions: [],
      name: email.split('@')[0], // Use email prefix as name
      email: normalizedEmail
    };
    
    console.log('🔐 Storing auth user data...');
    try {
      await storeAuthUser(authUser);
      console.log('✅ Auth user stored in AsyncStorage:', authUser);
    } catch (authError) {
      console.error('❌ Failed to store auth user:', authError);
      console.log('🔄 Continuing without auth storage...');
    }

    // Verify the user was stored correctly
    const storedUser = mockUsers.get(normalizedEmail);
    if (!storedUser) {
      console.error('❌ Failed to verify user storage');
      throw new Error('Failed to store user in database');
    }
    
    console.log('✅ User verification successful:', storedUser.id);

    // Return user object (with both role and roles for compatibility)
    return {
      success: true,
      user: {
        id: userId,
        email: normalizedEmail,
        role: role,
        roles: [role],
        permissions: role === 'owner' ? ['create:listing', 'edit:listing', 'delete:listing', 'view:booking'] : ['view:listing', 'create:booking']
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

    // IMPORTANT: Save user data to the database so other parts of the app can access it
    try {
      const { db } = await import('./db');
      await db.upsert('users', user.id, {
        id: user.id,
        email: user.email,
        name: user.name || user.email.split('@')[0],
        roles: user.roles,
        role: (user.role || user.roles[0]) as 'tenant' | 'owner' | 'brgy_official',
        barangay: user.barangay, // Include barangay field for brgy accounts
        phone: user.phone || '',
        address: user.address || '',
        createdAt: user.createdAt,
      });
      console.log('✅ User data saved to database:', user.id);
    } catch (dbError) {
      console.error('❌ Failed to save user to database:', dbError);
      // Continue anyway - some app features might not work
    }

    // Store auth user data for session
    const authUser = {
      id: user.id,
      roles: user.roles,
      permissions: [],
      name: user.name || user.email.split('@')[0],
      email: user.email
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

