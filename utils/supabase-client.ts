
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'
import { Platform } from 'react-native'
import 'react-native-url-polyfill/auto'

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

export const supabase = createClient(
    process.env.EXPO_PUBLIC_SUPABASE_URL || "https://your-project.supabase.co",
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "your-anon-key",
    {
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
    })
        