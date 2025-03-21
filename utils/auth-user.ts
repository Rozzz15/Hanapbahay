import AsyncStorage from '@react-native-async-storage/async-storage';

export interface AuthUser {
    id: string;
    roles: string[];
    permissions: string[];
}

const AUTH_USER_KEY = 'auth_user';

export async function storeAuthUser(user: AuthUser): Promise<void> {
    try {
        await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
    } catch (error) {
        console.error('Error storing auth user:', error);
    }
}

export async function getAuthUser(): Promise<AuthUser | null> {
    try {
        const jsonValue = await AsyncStorage.getItem(AUTH_USER_KEY);
        return jsonValue != null ? JSON.parse(jsonValue) : null;
    } catch (error) {
        console.error('Error getting auth user:', error);
        return null;
    }
}

export async function clearAuthUser(): Promise<void> {
    try {
        await AsyncStorage.removeItem(AUTH_USER_KEY);
    } catch (error) {
        console.error('Error clearing auth user:', error);
    }
} 