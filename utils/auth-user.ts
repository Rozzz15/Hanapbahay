import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

export interface AuthUser {
    id: string;
    roles: string[];
    permissions: string[];
}

const AUTH_USER_KEY = 'auth_user';

// Web-compatible storage functions
const getStorage = () => {
    if (Platform.OS === 'web') {
        return {
            getItem: (key: string) => Promise.resolve(window.localStorage.getItem(key)),
            setItem: (key: string, value: string) => Promise.resolve(window.localStorage.setItem(key, value)),
            removeItem: (key: string) => Promise.resolve(window.localStorage.removeItem(key))
        };
    }
    return AsyncStorage;
};

export async function storeAuthUser(user: AuthUser): Promise<void> {
    try {
        const storage = getStorage();
        await storage.setItem(AUTH_USER_KEY, JSON.stringify(user));
        console.log('✅ Auth user stored successfully');
    } catch (error) {
        console.error('❌ Error storing auth user:', error);
    }
}

export async function getAuthUser(): Promise<AuthUser | null> {
    try {
        const storage = getStorage();
        const jsonValue = await storage.getItem(AUTH_USER_KEY);
        const result = jsonValue != null ? JSON.parse(jsonValue) : null;
        console.log('📖 Retrieved auth user:', result ? 'User found' : 'No user');
        return result;
    } catch (error) {
        console.error('❌ Error getting auth user:', error);
        return null;
    }
}

export async function clearAuthSession(): Promise<void> {
    try {
        const storage = getStorage();
        
        // Only clear the main auth user session
        await storage.removeItem(AUTH_USER_KEY);
        console.log('🗑️ Auth session cleared');
        
        // For web, only clear specific session-related keys, not all user data
        if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
            const sessionKeysToRemove = [
                'auth_user',
                'supabase-auth-token',
                'supabase.auth.token',
                'sb-localhost-auth-token',
                'sb-localhost-auth-token.0',
                'sb-localhost-auth-token.1'
            ];
            
            sessionKeysToRemove.forEach(key => {
                if (window.localStorage.getItem(key)) {
                    window.localStorage.removeItem(key);
                    console.log(`🗑️ Cleared session key: ${key}`);
                }
            });
            
            console.log(`✅ Cleared ${sessionKeysToRemove.length} session keys`);
        }
        
        console.log('✅ Auth session cleared successfully (user data preserved)');
    } catch (error) {
        console.error('❌ Error clearing auth session:', error);
    }
}

export async function clearAuthUser(): Promise<void> {
    const storage = getStorage();
    await storage.removeItem(AUTH_USER_KEY);
} 