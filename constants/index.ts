// Re-export all constants
export * from './Colors';

// App Constants
export const APP_NAME = 'HanapBahay';
export const APP_VERSION = '1.0.0';

// API Constants
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

// Storage Keys
export const STORAGE_KEYS = {
  USER_TOKEN: 'user_token',
  USER_DATA: 'user_data',
  PERMISSIONS: 'permissions',
} as const;

// Routes
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  SIGNUP: '/sign-up',
  FORGOT_PASSWORD: '/forgot-password',
  DASHBOARD: '/(tabs)',
  CHAT: '/(tabs)/chat',
  PROFILE: '/(tabs)/profile',
  FILTER: '/filter',
  CHAT_ROOM: '/chat-room',
} as const;
