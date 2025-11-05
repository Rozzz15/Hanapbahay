
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Platform } from 'react-native'
import 'react-native-url-polyfill/auto'

// Create a safe mock client that won't crash
const createMockClient = () => ({
  auth: {
    signIn: () => Promise.resolve({ data: null, error: null }),
    signUp: () => Promise.resolve({ data: null, error: null }),
    signOut: () => Promise.resolve({ error: null }),
    getSession: () => Promise.resolve({ data: { session: null }, error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
  },
  from: () => ({
    select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }),
    insert: () => Promise.resolve({ data: null, error: null }),
    update: () => Promise.resolve({ data: null, error: null }),
    delete: () => Promise.resolve({ data: null, error: null }),
  }),
});

// Conditional import for Supabase to avoid web build issues
let createClient: any = createMockClient;

if (Platform.OS !== 'web') {
  // For mobile, try to use the real Supabase client
  try {
    const supabaseModule = require('@supabase/supabase-js');
    if (supabaseModule && supabaseModule.createClient) {
      createClient = supabaseModule.createClient;
    }
  } catch (error) {
    console.warn('⚠️ Supabase module not available, using mock client. Error:', error);
    // Keep using mock client
  }
}

// Platform-specific storage
const getStorage = () => {
  if (Platform.OS === 'web') {
    // Use localStorage for web
    return {
      getItem: (key: string) => {
        if (typeof window !== 'undefined') {
          return Promise.resolve(window.localStorage.getItem(key))
        }
        return Promise.resolve(null)
      },
      setItem: (key: string, value: string) => {
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(key, value)
        }
        return Promise.resolve()
      },
      removeItem: (key: string) => {
        if (typeof window !== 'undefined') {
          window.localStorage.removeItem(key)
        }
        return Promise.resolve()
      },
    }
  }
  return AsyncStorage
}

// Get environment variables with safe fallbacks
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || "https://your-project.supabase.co";
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "your-anon-key";

// Check if we have valid Supabase credentials
const hasValidSupabaseConfig = SUPABASE_URL && 
  SUPABASE_URL !== "https://your-project.supabase.co" &&
  SUPABASE_ANON_KEY && 
  SUPABASE_ANON_KEY !== "your-anon-key";

let supabaseInstance: any;

try {
  if (hasValidSupabaseConfig && Platform.OS !== 'web') {
    // Only create real client if we have valid config and not on web
    supabaseInstance = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        storage: getStorage(),
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
      global: {
        headers: {
          'X-Client-Info': 'supabase-js-react-native',
        },
      },
    });
    console.log('✅ Supabase client initialized successfully');
  } else {
    // Use mock client if config is missing or on web
    supabaseInstance = createMockClient();
    if (!hasValidSupabaseConfig) {
      console.warn('⚠️ Supabase credentials not configured, using mock client');
    }
  }
} catch (error) {
  console.error('❌ Error initializing Supabase client, using mock:', error);
  supabaseInstance = createMockClient();
}

export const supabase = supabaseInstance;
        